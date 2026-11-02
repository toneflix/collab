/** A running effect: where sound goes in and comes out, and how its settings change. */
export interface EffectInstance {
  input: AudioNode;
  output: AudioNode;
  applyParams: (params: Record<string, number>) => void;
  dispose?: () => void;
}

/**
 * Web Audio graphs for the studio's own effects. Each has an FFmpeg twin in
 * the API (App\Services\Studio\Mix\Effects) built from the same settings.
 */
type Create = (ctx: BaseAudioContext) => EffectInstance;

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Number(value);

  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

const disconnect = (...nodes: AudioNode[]) => nodes.forEach((n) => n.disconnect());

/** A dry path and a wet path, mixed by `mix` (0 dry only, 1 wet only). */
const dryWet = (ctx: BaseAudioContext) => {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  input.connect(dry).connect(output);
  wet.connect(output);

  return {
    input,
    output,
    wet,
    mix: (value: number) => {
      wet.gain.value = value;
      dry.gain.value = 1 - value;
    },
    dispose: () => disconnect(input, output, dry, wet),
  };
};

/** A WaveShaper curve of `fn` over -1 to 1. */
const curve = (fn: (x: number) => number, points = 8192) => {
  const out = new Float32Array(points);
  for (let i = 0; i < points; i++) out[i] = fn((i / (points - 1)) * 2 - 1);

  return out;
};

/** A sine LFO feeding `targets`, scaled by a gain. */
const lfo = (ctx: BaseAudioContext, ...targets: AudioParam[]) => {
  const osc = ctx.createOscillator();
  const depth = ctx.createGain();
  osc.connect(depth);
  targets.forEach((t) => depth.connect(t));
  osc.start();

  return { osc, depth, dispose: () => (osc.stop(), disconnect(osc, depth)) };
};

const highpass: Create = (ctx) => {
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';

  return {
    input: filter,
    output: filter,
    applyParams: (p) => {
      if (p.frequency !== undefined) filter.frequency.value = clamp(p.frequency, 20, 20000, 120);
      if (p.q !== undefined) filter.Q.value = clamp(p.q, -20, 20, 0);
    },
    dispose: () => filter.disconnect(),
  };
};

/** Mid/side width: 0 is mono, 1 unchanged, 2 twice as wide. */
const width: Create = (ctx) => {
  const input = ctx.createGain();
  input.channelCount = 2;
  input.channelCountMode = 'explicit';
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  const ll = ctx.createGain();
  const lr = ctx.createGain();
  const rl = ctx.createGain();
  const rr = ctx.createGain();
  input.connect(split);
  split.connect(ll, 0).connect(merge, 0, 0);
  split.connect(rl, 1).connect(merge, 0, 0);
  split.connect(rr, 1).connect(merge, 0, 1);
  split.connect(lr, 0).connect(merge, 0, 1);

  return {
    input,
    output: merge,
    applyParams: (p) => {
      if (p.width === undefined) return;
      const w = clamp(p.width, 0, 2, 1);
      ll.gain.value = rr.gain.value = (1 + w) / 2;
      lr.gain.value = rl.gain.value = (1 - w) / 2;
    },
    dispose: () => disconnect(input, split, merge, ll, lr, rl, rr),
  };
};

/** Soft clipping: tanh(drive · x), blended with the dry sound. */
const saturation: Create = (ctx) => {
  const path = dryWet(ctx);
  const shaper = ctx.createWaveShaper();
  path.input.connect(shaper).connect(path.wet);
  let drive = NaN;

  return {
    input: path.input,
    output: path.output,
    applyParams: (p) => {
      const next = clamp(p.drive, 0, 30, drive);
      if (next !== drive) {
        drive = next;
        const g = 10 ** (drive / 20);
        shaper.curve = curve((x) => Math.tanh(g * x));
      }
      if (p.mix !== undefined) path.mix(clamp(p.mix, 0, 1, 1));
    },
    dispose: () => (path.dispose(), shaper.disconnect()),
  };
};

/** Fewer bits per sample: each sample rounded to 2^(bits-1) steps. */
const crusher: Create = (ctx) => {
  const path = dryWet(ctx);
  const shaper = ctx.createWaveShaper();
  path.input.connect(shaper).connect(path.wet);
  let bits = NaN;

  return {
    input: path.input,
    output: path.output,
    applyParams: (p) => {
      const next = Math.round(clamp(p.bits, 1, 16, bits));
      if (next !== bits) {
        bits = next;
        const steps = 2 ** (bits - 1);
        shaper.curve = curve((x) => Math.round(x * steps) / steps, 65536);
      }
      if (p.mix !== undefined) path.mix(clamp(p.mix, 0, 1, 1));
    },
    dispose: () => (path.dispose(), shaper.disconnect()),
  };
};

/** Volume that rises and falls: 1 - depth/2 + depth/2 · sin(2π · rate · t). */
const tremolo: Create = (ctx) => {
  const amp = ctx.createGain();
  const mod = lfo(ctx, amp.gain);

  return {
    input: amp,
    output: amp,
    applyParams: (p) => {
      const depth = clamp(p.depth, 0, 1, 0.5);
      if (p.rate !== undefined) mod.osc.frequency.value = clamp(p.rate, 0.1, 20, 5);
      amp.gain.value = 1 - depth / 2;
      mod.depth.gain.value = depth / 2;
    },
    dispose: () => (mod.dispose(), amp.disconnect()),
  };
};

/** The sound swings between left and right. */
const autopan: Create = (ctx) => {
  const panner = ctx.createStereoPanner();
  panner.pan.value = 0;
  const mod = lfo(ctx, panner.pan);

  return {
    input: panner,
    output: panner,
    applyParams: (p) => {
      if (p.rate !== undefined) mod.osc.frequency.value = clamp(p.rate, 0.05, 10, 0.5);
      if (p.depth !== undefined) mod.depth.gain.value = clamp(p.depth, 0, 1, 0.8);
    },
    dispose: () => (mod.dispose(), panner.disconnect()),
  };
};

/** Keeps peaks under the ceiling. */
const limiter: Create = (ctx) => {
  const comp = ctx.createDynamicsCompressor();
  comp.ratio.value = 20;
  comp.knee.value = 0;
  comp.attack.value = 0.001;

  return {
    input: comp,
    output: comp,
    applyParams: (p) => {
      if (p.ceiling !== undefined) comp.threshold.value = clamp(p.ceiling, -24, 0, -1);
      if (p.release !== undefined) comp.release.value = clamp(p.release, 0.01, 1, 0.1);
    },
    dispose: () => comp.disconnect(),
  };
};

/**
 * A copy of the sound on a delay that sweeps with an LFO. Chorus, flanger
 * and their feedback all come from this, with different times.
 */
const sweptDelay =
  (base: number, withFeedback: boolean): Create =>
  (ctx) => {
    const path = dryWet(ctx);
    const delay = ctx.createDelay(0.1);
    const feedback = ctx.createGain();
    const mod = lfo(ctx, delay.delayTime);
    path.input.connect(delay).connect(path.wet);
    if (withFeedback) delay.connect(feedback).connect(delay);

    return {
      input: path.input,
      output: path.output,
      applyParams: (p) => {
        const depth = clamp(p.depth, 0, 1, 0.5);
        delay.delayTime.value = base;
        mod.depth.gain.value = base * 0.9 * depth;
        if (p.rate !== undefined) mod.osc.frequency.value = clamp(p.rate, 0.05, 10, 0.5);
        if (p.feedback !== undefined) feedback.gain.value = withFeedback ? clamp(p.feedback, 0, 0.9, 0.5) : 0;
        if (p.mix !== undefined) path.mix(clamp(p.mix, 0, 1, 0.5));
      },
      dispose: () => (path.dispose(), mod.dispose(), disconnect(delay, feedback)),
    };
  };

/** Four all-pass stages whose frequency sweeps, mixed with the dry sound. */
const phaser: Create = (ctx) => {
  const path = dryWet(ctx);
  const stages = Array.from({ length: 4 }, () => {
    const f = ctx.createBiquadFilter();
    f.type = 'allpass';
    f.Q.value = 0.7;

    return f;
  });
  const feedback = ctx.createGain();
  const mod = lfo(ctx, ...stages.map((s) => s.frequency));
  stages.reduce<AudioNode>((prev, s) => prev.connect(s), path.input);
  stages[3]!.connect(path.wet);
  stages[3]!.connect(feedback).connect(stages[0]!);

  return {
    input: path.input,
    output: path.output,
    applyParams: (p) => {
      const depth = clamp(p.depth, 0, 1, 0.6);
      stages.forEach((s) => (s.frequency.value = 900));
      mod.depth.gain.value = 800 * depth;
      if (p.rate !== undefined) mod.osc.frequency.value = clamp(p.rate, 0.05, 10, 0.5);
      if (p.feedback !== undefined) feedback.gain.value = clamp(p.feedback, 0, 0.9, 0.4);
      if (p.mix !== undefined) path.mix(clamp(p.mix, 0, 1, 0.5));
    },
    dispose: () => (path.dispose(), mod.dispose(), disconnect(feedback, ...stages)),
  };
};

const db = (value: number) => Math.max(-40, Math.min(40, Number(value) || 0));

const eq: Create = (ctx) => {
  const low = ctx.createBiquadFilter();
  const mid = ctx.createBiquadFilter();
  const high = ctx.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 250;
  mid.type = 'peaking';
  mid.Q.value = 0.9;
  high.type = 'highshelf';
  high.frequency.value = 4000;
  low.connect(mid).connect(high);

  return {
    input: low,
    output: high,
    applyParams: (p) => {
      if (p.low !== undefined) low.gain.value = db(p.low);
      if (p.mid !== undefined) mid.gain.value = db(p.mid);
      if (p.midFrequency !== undefined) mid.frequency.value = Math.max(20, p.midFrequency);
      if (p.high !== undefined) high.gain.value = db(p.high);
    },
    dispose: () => disconnect(low, mid, high),
  };
};

/** A decaying noise burst, used as the room the reverb plays the sound in. */
const impulse = (ctx: BaseAudioContext, seconds: number, decay: number) => {
  const length = Math.max(1, Math.floor(ctx.sampleRate * Math.max(0.1, seconds)));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
  }
  return buffer;
};

const reverb: Create = (ctx) => {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const convolver = ctx.createConvolver();
  input.connect(dry).connect(output);
  input.connect(convolver).connect(wet).connect(output);
  let shape = '';

  return {
    input,
    output,
    applyParams: (p) => {
      const size = p.size ?? 2.5;
      const decay = p.decay ?? 3;
      // A new room only when its shape changes, not on every mix change.
      if (`${size}:${decay}` !== shape) {
        shape = `${size}:${decay}`;
        convolver.buffer = impulse(ctx, size, decay);
      }
      if (p.wet !== undefined) {
        const w = Math.max(0, Math.min(1, p.wet));
        wet.gain.value = w;
        dry.gain.value = 1 - w * 0.5;
      }
    },
    dispose: () => disconnect(input, output, convolver, wet, dry),
  };
};

const delay: Create = (ctx) => {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const line = ctx.createDelay(10);
  const feedback = ctx.createGain();
  const wet = ctx.createGain();
  const dry = ctx.createGain();
  input.connect(dry).connect(output);
  input.connect(line);
  line.connect(feedback).connect(line);
  line.connect(wet).connect(output);

  return {
    input,
    output,
    applyParams: (p) => {
      if (p.delayTime !== undefined) line.delayTime.value = clamp(p.delayTime, 0, 10, 0.25);
      if (p.feedback !== undefined) feedback.gain.value = clamp(p.feedback, 0, 0.95, 0.4);
      if (p.wet !== undefined) {
        wet.gain.value = clamp(p.wet, 0, 1, 0.35);
        dry.gain.value = 1 - wet.gain.value;
      }
    },
    dispose: () => disconnect(input, output, line, feedback, wet, dry),
  };
};

const compressor: Create = (ctx) => {
  const node = ctx.createDynamicsCompressor();

  return {
    input: node,
    output: node,
    applyParams: (p) => {
      if (p.threshold !== undefined) node.threshold.value = p.threshold;
      if (p.knee !== undefined) node.knee.value = p.knee;
      if (p.ratio !== undefined) node.ratio.value = p.ratio;
      if (p.attack !== undefined) node.attack.value = p.attack;
      if (p.release !== undefined) node.release.value = p.release;
    },
    dispose: () => node.disconnect(),
  };
};

const lowpass: Create = (ctx) => {
  const node = ctx.createBiquadFilter();
  node.type = 'lowpass';

  return {
    input: node,
    output: node,
    applyParams: (p) => {
      if (p.frequency !== undefined) node.frequency.value = p.frequency;
      if (p.q !== undefined) node.Q.value = p.q;
    },
    dispose: () => node.disconnect(),
  };
};

/** Effect type → its Web Audio graph. */
export const EFFECT_NODES: Record<string, Create> = {
  'tf-eq': eq,
  'tf-reverb': reverb,
  'native-delay': delay,
  'native-compressor': compressor,
  'native-filter': lowpass,
  'tf-highpass': highpass,
  'tf-width': width,
  'tf-saturation': saturation,
  'tf-crusher': crusher,
  'tf-tremolo': tremolo,
  'tf-autopan': autopan,
  'tf-limiter': limiter,
  'tf-chorus': sweptDelay(0.02, false),
  'tf-flanger': sweptDelay(0.004, true),
  'tf-phaser': phaser,
};
