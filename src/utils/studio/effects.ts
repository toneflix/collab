import type { EffectDefinition, EffectInstance } from '@dawcore/components';

/**
 * Effects a stem can have. They run live in the editor, and the API renders
 * the preview mix with FFmpeg filters matched to these definitions
 * (App\Services\Studio\Mix\Effects), so keep the two in step.
 */
export type EffectType = 'tf-eq' | 'tf-reverb' | 'native-delay' | 'native-compressor' | 'native-filter';

/** One effect on a stem, as saved in the stem's `meta.effects`. */
export interface StemEffect {
  type: EffectType;
  params: Record<string, number>;
  bypassed?: boolean;
}

export interface EffectParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface EffectInfo {
  type: EffectType;
  label: string;
  description: string;
  defaults: Record<string, number>;
  params: EffectParam[];
}

/** The effects offered in the studio, in menu order. */
export const EFFECTS: EffectInfo[] = [
  {
    type: 'tf-eq',
    label: 'EQ',
    description: 'Boost or cut the lows, mids and highs.',
    defaults: { low: 0, mid: 0, midFrequency: 1000, high: 0 },
    params: [
      { key: 'low', label: 'Low', min: -18, max: 18, step: 0.5, unit: 'dB' },
      { key: 'mid', label: 'Mid', min: -18, max: 18, step: 0.5, unit: 'dB' },
      { key: 'midFrequency', label: 'Mid frequency', min: 200, max: 5000, step: 10, unit: 'Hz' },
      { key: 'high', label: 'High', min: -18, max: 18, step: 0.5, unit: 'dB' },
    ],
  },
  {
    type: 'tf-reverb',
    label: 'Reverb',
    description: 'Put the sound in a room or hall.',
    defaults: { size: 2.5, decay: 3, wet: 0.3 },
    params: [
      { key: 'size', label: 'Length', min: 0.3, max: 8, step: 0.1, unit: 's' },
      { key: 'decay', label: 'Decay', min: 1, max: 8, step: 0.1 },
      { key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'native-delay',
    label: 'Delay',
    description: 'Echoes that repeat and fade.',
    defaults: { delayTime: 0.25, feedback: 0.4, wet: 0.35 },
    params: [
      { key: 'delayTime', label: 'Time', min: 0.01, max: 2, step: 0.01, unit: 's' },
      { key: 'feedback', label: 'Repeats', min: 0, max: 0.95, step: 0.01 },
      { key: 'wet', label: 'Mix', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'native-compressor',
    label: 'Compressor',
    description: 'Even out loud and quiet parts.',
    defaults: { threshold: -24, knee: 30, ratio: 4, attack: 0.003, release: 0.25 },
    params: [
      { key: 'threshold', label: 'Threshold', min: -60, max: 0, step: 1, unit: 'dB' },
      { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5 },
      { key: 'knee', label: 'Knee', min: 0, max: 40, step: 1, unit: 'dB' },
      { key: 'attack', label: 'Attack', min: 0, max: 1, step: 0.001, unit: 's' },
      { key: 'release', label: 'Release', min: 0.01, max: 1, step: 0.01, unit: 's' },
    ],
  },
  {
    type: 'native-filter',
    label: 'Low-pass filter',
    description: 'Roll off the highs for a darker, muffled sound.',
    defaults: { frequency: 8000, q: 1 },
    params: [
      { key: 'frequency', label: 'Cutoff', min: 20, max: 20000, step: 1, unit: 'Hz' },
      { key: 'q', label: 'Resonance', min: 0.1, max: 20, step: 0.1 },
    ],
  },
];

export const effectInfo = (type: string) => EFFECTS.find((e) => e.type === type);

const db = (value: number) => Math.max(-40, Math.min(40, Number(value) || 0));

/**
 * A decaying noise burst, used as the room the reverb plays the sound in.
 */
const impulse = (ctx: BaseAudioContext, seconds: number, decay: number) => {
  const length = Math.max(1, Math.floor(ctx.sampleRate * Math.max(0.1, seconds)));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
  }
  return buffer;
};

const eq: EffectDefinition = {
  label: 'EQ',
  category: 'filter',
  defaults: { low: 0, mid: 0, midFrequency: 1000, high: 0 },
  params: {
    low: { min: -18, max: 18, step: 0.5, unit: 'dB' },
    mid: { min: -18, max: 18, step: 0.5, unit: 'dB' },
    midFrequency: { min: 200, max: 5000, step: 10, unit: 'Hz' },
    high: { min: -18, max: 18, step: 0.5, unit: 'dB' },
  },
  create: (ctx): EffectInstance => {
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 250;
    const mid = ctx.createBiquadFilter();
    mid.type = 'peaking';
    mid.Q.value = 0.9;
    const high = ctx.createBiquadFilter();
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
      dispose: () => {
        low.disconnect();
        mid.disconnect();
        high.disconnect();
      },
    };
  },
};

const reverb: EffectDefinition = {
  label: 'Reverb',
  category: 'reverb',
  defaults: { size: 2.5, decay: 3, wet: 0.3 },
  params: {
    size: { min: 0.3, max: 8, step: 0.1, unit: 's' },
    decay: { min: 1, max: 8, step: 0.1 },
    wet: { min: 0, max: 1, step: 0.01 },
  },
  wetParam: 'wet',
  create: (ctx): EffectInstance => {
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
      dispose: () => {
        input.disconnect();
        convolver.disconnect();
        wet.disconnect();
        dry.disconnect();
      },
    };
  },
};

let registered = false;

/** Add the studio's own effects to the editor's effect registry. */
export const registerStudioEffects = (register: (type: string, definition: EffectDefinition) => void) => {
  if (registered) return;
  registered = true;
  register('tf-eq', eq);
  register('tf-reverb', reverb);
};

/**
 * Read `meta.effects`. It is saved as JSON text, so numbers and on/off
 * values survive the form upload the track is saved with.
 */
export const parseEffects = (value: unknown): StemEffect[] => {
  let list: unknown = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];

  return list
    .filter((e): e is StemEffect => !!e && typeof e === 'object' && !!effectInfo((e as StemEffect).type))
    .slice(0, 8)
    .map((e) => {
      const info = effectInfo(e.type)!;
      const params: Record<string, number> = { ...info.defaults };
      for (const p of info.params) {
        const n = Number(e.params?.[p.key]);
        if (Number.isFinite(n)) params[p.key] = Math.max(p.min, Math.min(p.max, n));
      }
      return { type: e.type, params, bypassed: e.bypassed === true || String(e.bypassed) === 'true' };
    });
};

export const serializeEffects = (effects: StemEffect[]) => (effects.length ? JSON.stringify(effects) : '');
