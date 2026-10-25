/**
 * A small FLAC encoder for 16-bit audio: fixed predictors, left/side stereo
 * when it's smaller, and Rice-coded residuals. About half the size of WAV
 * and decoded bit for bit by FFmpeg.
 */

const BLOCK = 4096;

class BitWriter {
  bytes = new Uint8Array(1 << 20);
  pos = 0;
  private cur = 0;
  private free = 8;

  private grow() {
    const next = new Uint8Array(this.bytes.length * 2);
    next.set(this.bytes);
    this.bytes = next;
  }

  /** Write the low `n` bits of `value` (n ≤ 32). */
  write(value: number, n: number) {
    while (n > 0) {
      const take = Math.min(this.free, n);
      const shift = n - take;
      const bits = (value >>> shift) & ((1 << take) - 1);
      this.cur |= bits << (this.free - take);
      this.free -= take;
      n -= take;
      if (this.free === 0) {
        if (this.pos >= this.bytes.length) this.grow();
        this.bytes[this.pos++] = this.cur;
        this.cur = 0;
        this.free = 8;
      }
    }
  }

  zeros(n: number) {
    while (n > 0) {
      const take = Math.min(n, 24);
      this.write(0, take);
      n -= take;
    }
  }

  /** Pad with zeros to the next byte. */
  align() {
    if (this.free !== 8) this.write(0, this.free);
  }

  result() {
    return this.bytes.slice(0, this.pos);
  }
}

const CRC8 = new Uint8Array(256);
const CRC16 = new Uint16Array(256);
for (let i = 0; i < 256; i++) {
  let c8 = i;
  let c16 = i << 8;
  for (let b = 0; b < 8; b++) {
    c8 = c8 & 0x80 ? ((c8 << 1) ^ 0x07) & 0xff : (c8 << 1) & 0xff;
    c16 = c16 & 0x8000 ? ((c16 << 1) ^ 0x8005) & 0xffff : (c16 << 1) & 0xffff;
  }
  CRC8[i] = c8;
  CRC16[i] = c16;
}

const crc8 = (bytes: Uint8Array, from: number, to: number) => {
  let crc = 0;
  for (let i = from; i < to; i++) crc = CRC8[crc ^ bytes[i]!]!;
  return crc;
};

const crc16 = (bytes: Uint8Array, from: number, to: number) => {
  let crc = 0;
  for (let i = from; i < to; i++) crc = ((crc << 8) & 0xffff) ^ CRC16[(crc >> 8) ^ bytes[i]!]!;
  return crc;
};

/** Residuals of the fixed predictor of `order` (0 to 4). */
const residuals = (x: Int32Array, order: number) => {
  const out = new Int32Array(x.length - order);
  for (let i = order; i < x.length; i++) {
    const a = x[i]!;
    const b = x[i - 1] ?? 0;
    const c = x[i - 2] ?? 0;
    const d = x[i - 3] ?? 0;
    const e = x[i - 4] ?? 0;
    out[i - order] =
      order === 0
        ? a
        : order === 1
          ? a - b
          : order === 2
            ? a - 2 * b + c
            : order === 3
              ? a - 3 * b + 3 * c - d
              : a - 4 * b + 6 * c - 4 * d + e;
  }
  return out;
};

const zigzag = (r: number) => (r >= 0 ? r * 2 : -r * 2 - 1);

/** The best Rice parameter for values summing to `sum`, and the bits it takes (estimated). */
const bestRice = (sum: number, count: number) => {
  let best = { k: 0, bits: Infinity };
  for (let k = 0; k <= 14; k++) {
    const bits = count * (k + 1) + Math.floor(sum / 2 ** k);
    if (bits < best.bits) best = { k, bits };
  }
  return best;
};

/** The cheapest partition order for a residual, with its Rice parameters. */
const planResidual = (res: Int32Array, blockSize: number, order: number) => {
  // Sums of the coded values in 16 equal parts; coarser partitions add them up.
  const fine = 16;
  const sums = new Float64Array(fine);
  if (blockSize % fine === 0) {
    const part = blockSize / fine;
    for (let i = 0; i < res.length; i++) sums[Math.floor((i + order) / part)]! += zigzag(res[i]!);
  } else {
    for (let i = 0; i < res.length; i++) sums[0]! += zigzag(res[i]!);
  }

  let best = { bits: Infinity, partitionOrder: 0, params: [] as number[] };
  for (let p = 0; p <= 4; p++) {
    if (blockSize % (1 << p) || blockSize >> p <= order || (p > 0 && blockSize % fine)) break;
    const count = 1 << p;
    const span = fine / count;
    const params: number[] = [];
    let bits = 0;
    for (let i = 0; i < count; i++) {
      let sum = 0;
      for (let j = i * span; j < (i + 1) * span; j++) sum += sums[j]!;
      const rice = bestRice(sum, (blockSize >> p) - (i === 0 ? order : 0));
      params.push(rice.k);
      bits += rice.bits + 4;
    }
    if (bits < best.bits) best = { bits, partitionOrder: p, params };
  }
  return best;
};

interface Plan {
  constant: boolean;
  order: number;
  res: Int32Array;
  residual: ReturnType<typeof planResidual>;
  bits: number;
}

const planSubframe = (x: Int32Array, bps: number): Plan => {
  if (x.every((v) => v === x[0])) {
    return { constant: true, order: 0, res: new Int32Array(0), residual: planResidual(new Int32Array(0), 0, 0), bits: bps };
  }
  let best: Plan | null = null;
  for (let order = 0; order <= Math.min(4, x.length - 1); order++) {
    const res = residuals(x, order);
    const residual = planResidual(res, x.length, order);
    const bits = order * bps + 6 + residual.bits;
    if (!best || bits < best.bits) best = { constant: false, order, res, residual, bits };
  }
  return best!;
};

const writeSubframe = (w: BitWriter, x: Int32Array, bps: number, plan: Plan) => {
  const mask = (v: number) => v & ((1 << bps) - 1);
  if (plan.constant) {
    w.write(0, 8);
    w.write(mask(x[0]!), bps);
    return;
  }
  w.write((0x08 | plan.order) << 1, 8);
  for (let i = 0; i < plan.order; i++) w.write(mask(x[i]!), bps);
  w.write(0, 2);
  w.write(plan.residual.partitionOrder, 4);
  const part = x.length >> plan.residual.partitionOrder;
  let at = 0;
  plan.residual.params.forEach((k, i) => {
    w.write(k, 4);
    const count = part - (i === 0 ? plan.order : 0);
    for (let j = 0; j < count; j++) {
      const u = zigzag(plan.res[at++]!);
      w.zeros(u >>> k);
      w.write(1, 1);
      if (k) w.write(u, k);
    }
  });
};

/** Frame numbers use UTF-8's variable length coding. */
const writeUtf8 = (w: BitWriter, n: number) => {
  if (n < 0x80) return w.write(n, 8);
  const bytes: number[] = [];
  let lead = 0x80;
  let room = 0x3f;
  while (n > room || bytes.length === 0) {
    bytes.unshift(0x80 | (n & 0x3f));
    n >>>= 6;
    lead = (lead >> 1) | 0x80;
    room >>= 1;
  }
  w.write((lead & 0xff) | n, 8);
  bytes.forEach((b) => w.write(b, 8));
};

/** Float samples as 16-bit integers. */
const toInt16 = (data: Float32Array) => {
  const out = new Int32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]!));
    out[i] = Math.round(s < 0 ? s * 0x8000 : s * 0x7fff);
  }
  return out;
};

/** Encode one or two channels of float audio as a 16-bit FLAC file. */
export const encodeFlac = (channels: Float32Array[], sampleRate: number) => {
  const pcm = channels.slice(0, 2).map(toInt16);
  const total = pcm[0]?.length ?? 0;
  const w = new BitWriter();

  w.write(0x664c6143, 32); // "fLaC"
  w.write(0x80, 8); // last metadata block, STREAMINFO
  w.write(34, 24);
  w.write(BLOCK, 16);
  w.write(BLOCK, 16);
  w.write(0, 24);
  w.write(0, 24);
  w.write(sampleRate, 20);
  w.write(pcm.length - 1, 3);
  w.write(15, 5);
  w.write(Math.floor(total / 2 ** 32), 4);
  w.write(total >>> 0, 32);
  for (let i = 0; i < 4; i++) w.write(0, 32);

  for (let start = 0, frame = 0; start < total; start += BLOCK, frame++) {
    const size = Math.min(BLOCK, total - start);
    const blocks = pcm.map((c) => c.subarray(start, start + size));

    // Left/side stereo when the side channel is cheaper than the right one.
    let assignment = pcm.length - 1;
    let subframes: { x: Int32Array; bps: number; plan: Plan }[] = blocks.map((x) => ({ x, bps: 16, plan: planSubframe(x, 16) }));
    if (blocks.length === 2) {
      const side = new Int32Array(size);
      for (let i = 0; i < size; i++) side[i] = blocks[0]![i]! - blocks[1]![i]!;
      const plan = planSubframe(side, 17);
      if (plan.bits < subframes[1]!.plan.bits) {
        assignment = 8;
        subframes = [subframes[0]!, { x: side, bps: 17, plan }];
      }
    }

    const from = w.pos;
    w.write(0x3ffe, 14);
    w.write(0, 2);
    w.write(size === BLOCK ? 12 : 7, 4);
    w.write(0, 4);
    w.write(assignment, 4);
    w.write(0, 4);
    writeUtf8(w, frame);
    if (size !== BLOCK) w.write(size - 1, 16);
    w.write(crc8(w.bytes, from, w.pos), 8);

    subframes.forEach((s) => writeSubframe(w, s.x, s.bps, s.plan));
    w.align();
    w.write(crc16(w.bytes, from, w.pos), 16);
  }

  return new Blob([w.result()], { type: 'audio/flac' });
};
