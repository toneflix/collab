/**
 * Simple instruments for the studio: a drum machine and a few synths. Both
 * are synthesized with Web Audio, so there are no samples to download, and
 * the result is rendered to audio and saved as an ordinary stem. The pattern
 * is saved with the stem so it can be opened and changed later.
 */

export type DrumVoice = 'kick' | 'snare' | 'clap' | 'hat' | 'openhat' | 'tom' | 'rim' | 'shaker';

export const DRUM_VOICES: { key: DrumVoice; label: string }[] = [
  { key: 'kick', label: 'Kick' },
  { key: 'snare', label: 'Snare' },
  { key: 'clap', label: 'Clap' },
  { key: 'hat', label: 'Closed hat' },
  { key: 'openhat', label: 'Open hat' },
  { key: 'tom', label: 'Tom' },
  { key: 'rim', label: 'Rim' },
  { key: 'shaker', label: 'Shaker' },
];

export type SynthPreset = 'piano' | 'pluck' | 'pad' | 'bass' | 'lead';

export const SYNTH_PRESETS: { key: SynthPreset; label: string }[] = [
  { key: 'piano', label: 'Keys' },
  { key: 'pluck', label: 'Pluck' },
  { key: 'pad', label: 'Pad' },
  { key: 'bass', label: 'Bass' },
  { key: 'lead', label: 'Lead' },
];

export interface DrumPattern {
  kind: 'drums';
  bpm: number;
  /** Beats per bar and the beat's note value, like [4, 4] */
  meter: [number, number];
  bars: number;
  /** Active steps (sixteenth notes from the start) for each voice */
  rows: Partial<Record<DrumVoice, number[]>>;
  volume?: number;
}

export interface KeyNote {
  /** MIDI note number, 60 is middle C */
  pitch: number;
  /** Start, in sixteenth notes */
  step: number;
  /** Length, in sixteenth notes */
  length: number;
}

export interface KeysPattern {
  kind: 'keys';
  bpm: number;
  meter: [number, number];
  bars: number;
  preset: SynthPreset;
  notes: KeyNote[];
  volume?: number;
}

export type InstrumentPattern = DrumPattern | KeysPattern;

/** Sixteenth notes in one bar of a meter: 16 in 4/4, 12 in 6/8. */
export const stepsPerBar = ([beats, unit]: [number, number]) => Math.max(1, Math.round(beats * (16 / unit)));

/** How long one sixteenth note lasts, in seconds. A beat is a quarter note. */
export const stepSeconds = (bpm: number) => 60 / Math.max(20, bpm) / 4;

export const patternSeconds = (p: InstrumentPattern) => p.bars * stepsPerBar(p.meter) * stepSeconds(p.bpm);

const noiseBuffer = (ctx: BaseAudioContext, seconds = 1) => {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

/** Play one drum hit at `time`. */
const hit = (ctx: BaseAudioContext, out: AudioNode, voice: DrumVoice, time: number, noise: AudioBuffer) => {
  const env = (node: AudioNode, peak: number, decay: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    node.connect(g).connect(out);
    return g;
  };
  const noiseSource = (filterType: BiquadFilterType, frequency: number, q = 1) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    src.connect(filter);
    return { src, filter };
  };

  switch (voice) {
    case 'kick': {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
      env(osc, 1, 0.45);
      osc.start(time);
      osc.stop(time + 0.5);
      break;
    }
    case 'snare': {
      const { src, filter } = noiseSource('highpass', 1500);
      env(filter, 0.6, 0.2);
      src.start(time);
      src.stop(time + 0.25);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(140, time + 0.08);
      env(osc, 0.45, 0.12);
      osc.start(time);
      osc.stop(time + 0.15);
      break;
    }
    case 'clap': {
      // A few quick bursts close together, like hands that don't quite line up.
      [0, 0.012, 0.024].forEach((offset, i) => {
        const { src, filter } = noiseSource('bandpass', 1200, 0.8);
        const g = ctx.createGain();
        const at = time + offset;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(i === 2 ? 0.8 : 0.5, at + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, at + (i === 2 ? 0.18 : 0.03));
        filter.connect(g).connect(out);
        src.start(at);
        src.stop(at + 0.2);
      });
      break;
    }
    case 'hat':
    case 'openhat': {
      const { src, filter } = noiseSource('highpass', 7000);
      env(filter, voice === 'hat' ? 0.35 : 0.3, voice === 'hat' ? 0.05 : 0.35);
      src.start(time);
      src.stop(time + 0.4);
      break;
    }
    case 'tom': {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(200, time);
      osc.frequency.exponentialRampToValueAtTime(90, time + 0.25);
      env(osc, 0.7, 0.35);
      osc.start(time);
      osc.stop(time + 0.4);
      break;
    }
    case 'rim': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1700;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1700;
      osc.connect(filter);
      env(filter, 0.35, 0.03);
      osc.start(time);
      osc.stop(time + 0.05);
      break;
    }
    case 'shaker': {
      const { src, filter } = noiseSource('bandpass', 6000, 2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.25, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
      filter.connect(g).connect(out);
      src.start(time);
      src.stop(time + 0.1);
      break;
    }
  }
};

const frequency = (pitch: number) => 440 * 2 ** ((pitch - 69) / 12);

/** Play one note of a synth preset from `time` for `duration` seconds. */
const note = (ctx: BaseAudioContext, out: AudioNode, preset: SynthPreset, pitch: number, time: number, duration: number) => {
  const f = frequency(pitch);
  const shape: Record<SynthPreset, { waves: OscillatorType[]; attack: number; decay: number; sustain: number; release: number; cutoff: number; detune: number; gain: number }> = {
    piano: { waves: ['triangle', 'sine'], attack: 0.005, decay: 0.6, sustain: 0.25, release: 0.3, cutoff: 5000, detune: 0, gain: 0.35 },
    pluck: { waves: ['sawtooth'], attack: 0.002, decay: 0.18, sustain: 0.05, release: 0.12, cutoff: 3200, detune: 0, gain: 0.28 },
    pad: { waves: ['sawtooth', 'sawtooth'], attack: 0.35, decay: 0.4, sustain: 0.7, release: 0.8, cutoff: 1800, detune: 9, gain: 0.16 },
    bass: { waves: ['square', 'sine'], attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.08, cutoff: 900, detune: 0, gain: 0.32 },
    lead: { waves: ['sawtooth', 'square'], attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.15, cutoff: 4200, detune: 6, gain: 0.18 },
  };
  const s = shape[preset];

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = s.cutoff;
  const amp = ctx.createGain();
  const end = time + Math.max(0.03, duration);
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(s.gain, time + s.attack);
  amp.gain.setTargetAtTime(s.gain * s.sustain, time + s.attack, s.decay / 3);
  amp.gain.setTargetAtTime(0, end, s.release / 3);
  filter.connect(amp).connect(out);

  s.waves.forEach((wave, i) => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = f;
    osc.detune.value = i === 0 ? -s.detune : s.detune;
    osc.connect(filter);
    osc.start(time);
    osc.stop(end + s.release * 2);
  });
};

/**
 * Schedule a pattern into any audio context, starting at `at`. Used both to
 * preview a pattern and to render it.
 */
export const schedule = (ctx: BaseAudioContext, out: AudioNode, pattern: InstrumentPattern, at = 0, only?: number) => {
  const step = stepSeconds(pattern.bpm);
  const total = pattern.bars * stepsPerBar(pattern.meter);

  if (pattern.kind === 'drums') {
    const noise = noiseBuffer(ctx);
    for (const voice of DRUM_VOICES) {
      for (const s of pattern.rows[voice.key] ?? []) {
        if (s >= 0 && s < total && (only === undefined || s === only)) hit(ctx, out, voice.key, at + s * step, noise);
      }
    }
    return;
  }

  for (const n of pattern.notes) {
    if (n.step < 0 || n.step >= total || (only !== undefined && n.step !== only)) continue;
    const length = Math.min(n.length, total - n.step);
    note(ctx, out, pattern.preset, n.pitch, at + n.step * step, length * step * 0.95);
  }
};

/** Play a single drum sound or note right away, for feedback while editing. */
export const audition = (ctx: AudioContext, pattern: InstrumentPattern, voice?: DrumVoice, pitch?: number) => {
  const out = ctx.createGain();
  out.gain.value = pattern.volume ?? 0.9;
  out.connect(ctx.destination);
  const at = ctx.currentTime + 0.01;
  if (pattern.kind === 'drums' && voice) hit(ctx, out, voice, at, noiseBuffer(ctx, 0.5));
  if (pattern.kind === 'keys' && pitch !== undefined) note(ctx, out, pattern.preset, pitch, at, stepSeconds(pattern.bpm) * 2);
};

/** Render a pattern to audio, exactly its length so it loops cleanly. */
export const renderPattern = async (pattern: InstrumentPattern, sampleRate = 44100): Promise<AudioBuffer> => {
  const seconds = patternSeconds(pattern);
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(seconds * sampleRate)), sampleRate);
  const out = ctx.createGain();
  out.gain.value = pattern.volume ?? 0.9;
  // A soft limit so busy patterns don't clip.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.ratio.value = 12;
  out.connect(limiter).connect(ctx.destination);
  schedule(ctx, out, pattern);
  const buffer = await ctx.startRendering();

  // A short fade at the very end, so a cut-off note doesn't click.
  const fade = Math.min(buffer.length, Math.floor(sampleRate * 0.004));
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < fade; i++) data[data.length - 1 - i]! *= i / fade;
  }
  return buffer;
};

export const emptyPattern = (kind: 'drums' | 'keys', bpm: number, meter: [number, number]): InstrumentPattern =>
  kind === 'drums'
    ? {
        kind,
        bpm,
        meter,
        bars: 1,
        // A simple beat to start from.
        rows: { kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
      }
    : { kind, bpm, meter, bars: 2, preset: 'piano', notes: [] };

/** Read a pattern saved in a stem's meta (as JSON text), or null. */
export const parsePattern = (value: unknown): InstrumentPattern | null => {
  let p: unknown = value;
  if (typeof value === 'string') {
    try {
      p = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!p || typeof p !== 'object') return null;
  const raw = p as Partial<InstrumentPattern>;
  const bpm = Math.min(300, Math.max(20, Number(raw.bpm) || 120));
  const meter: [number, number] = Array.isArray(raw.meter) && raw.meter.length === 2
    ? [Math.max(1, Number(raw.meter[0]) || 4), Math.max(1, Number(raw.meter[1]) || 4)]
    : [4, 4];
  const bars = Math.min(8, Math.max(1, Math.round(Number(raw.bars) || 1)));
  const volume = raw.volume !== undefined ? Math.min(1.5, Math.max(0, Number(raw.volume) || 0)) : undefined;
  const ints = (list: unknown) => (Array.isArray(list) ? list.map(Number).filter((n) => Number.isInteger(n) && n >= 0) : []);

  if (raw.kind === 'drums') {
    const rows: DrumPattern['rows'] = {};
    for (const v of DRUM_VOICES) rows[v.key] = ints((raw as DrumPattern).rows?.[v.key]);
    return { kind: 'drums', bpm, meter, bars, rows, ...(volume !== undefined ? { volume } : {}) };
  }
  if (raw.kind === 'keys') {
    const k = raw as KeysPattern;
    return {
      kind: 'keys',
      bpm,
      meter,
      bars,
      preset: SYNTH_PRESETS.some((s) => s.key === k.preset) ? k.preset : 'piano',
      notes: (Array.isArray(k.notes) ? k.notes : [])
        .map((n) => ({ pitch: Math.round(Number(n.pitch)), step: Math.round(Number(n.step)), length: Math.max(1, Math.round(Number(n.length) || 1)) }))
        .filter((n) => n.pitch >= 21 && n.pitch <= 108 && n.step >= 0)
        .slice(0, 512),
      ...(volume !== undefined ? { volume } : {}),
    };
  }
  return null;
};

const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const noteName = (pitch: number) => `${NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
export const isBlackKey = (pitch: number) => [1, 3, 6, 8, 10].includes(pitch % 12);
