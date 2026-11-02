import { reactive } from 'vue';
import type { FaustEffect } from '../requests/effects';

/**
 * Effects a stem can have. They run live in the editor, and the API renders
 * the preview mix with FFmpeg filters matched to these definitions
 * (App\Services\Studio\Mix\Effects), so keep the two in step.
 */
export type EffectType =
  | 'tf-eq'
  | 'tf-reverb'
  | 'native-delay'
  | 'native-compressor'
  | 'native-filter'
  | 'tf-highpass'
  | 'tf-width'
  | 'tf-saturation'
  | 'tf-crusher'
  | 'tf-tremolo'
  | 'tf-autopan'
  | 'tf-limiter'
  | 'tf-chorus'
  | 'tf-flanger'
  | 'tf-phaser'
  | `faust-${string}`
  | 'wam';

/** One effect on a stem, as saved in the stem's `meta.effects`. */
export interface StemEffect {
  type: EffectType;
  params: Record<string, number>;
  bypassed?: boolean;
  /** A plugin's module link, name and saved settings (type `wam`) */
  url?: string;
  name?: string;
  state?: unknown;
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
  /** Where it's listed in the add menu */
  group: 'Tone' | 'Space' | 'Dynamics' | 'Colour' | 'Movement';
  description: string;
  defaults: Record<string, number>;
  params: EffectParam[];
  /** For an effect written in Faust: what the browser compiles, and each setting's plugin parameter */
  faust?: { name: string; source: string; addresses: Record<string, string> };
}

/** The effects offered in the studio, in menu order. */
export const EFFECTS: EffectInfo[] = [
  {
    type: 'tf-eq',
    group: 'Tone',
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
    group: 'Space',
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
    group: 'Space',
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
    group: 'Dynamics',
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
    group: 'Tone',
    label: 'Low-pass filter',
    description: 'Roll off the highs for a darker, muffled sound.',
    defaults: { frequency: 8000, q: 1 },
    params: [
      { key: 'frequency', label: 'Cutoff', min: 20, max: 20000, step: 1, unit: 'Hz' },
      { key: 'q', label: 'Resonance', min: 0.1, max: 20, step: 0.1 },
    ],
  },
  {
    type: 'tf-highpass',
    group: 'Tone',
    label: 'High-pass filter',
    description: 'Clear out rumble and low end.',
    defaults: { frequency: 120, q: 0 },
    params: [
      { key: 'frequency', label: 'Cutoff', min: 20, max: 5000, step: 1, unit: 'Hz' },
      { key: 'q', label: 'Resonance', min: 0, max: 20, step: 0.5, unit: 'dB' },
    ],
  },
  {
    type: 'tf-limiter',
    group: 'Dynamics',
    label: 'Limiter',
    description: 'Keep peaks under a ceiling.',
    defaults: { ceiling: -1, release: 0.1 },
    params: [
      { key: 'ceiling', label: 'Ceiling', min: -24, max: 0, step: 0.5, unit: 'dB' },
      { key: 'release', label: 'Release', min: 0.01, max: 1, step: 0.01, unit: 's' },
    ],
  },
  {
    type: 'tf-saturation',
    group: 'Colour',
    label: 'Saturation',
    description: 'Warm, driven, tape-like grit.',
    defaults: { drive: 12, mix: 1 },
    params: [
      { key: 'drive', label: 'Drive', min: 0, max: 30, step: 0.5, unit: 'dB' },
      { key: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'tf-crusher',
    group: 'Colour',
    label: 'Bitcrusher',
    description: 'Lo-fi, crunchy digital sound.',
    defaults: { bits: 6, mix: 1 },
    params: [
      { key: 'bits', label: 'Bits', min: 1, max: 16, step: 1, unit: 'bits' },
      { key: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'tf-width',
    group: 'Space',
    label: 'Stereo width',
    description: 'Make the sound wider or narrower.',
    defaults: { width: 1.5 },
    params: [{ key: 'width', label: 'Width', min: 0, max: 2, step: 0.01, unit: '%' }],
  },
  {
    type: 'tf-chorus',
    group: 'Movement',
    label: 'Chorus',
    description: 'Thicken the sound with detuned copies.',
    defaults: { rate: 0.8, depth: 0.5, mix: 0.5 },
    params: [
      { key: 'rate', label: 'Rate', min: 0.05, max: 10, step: 0.05, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
      { key: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'tf-flanger',
    group: 'Movement',
    label: 'Flanger',
    description: 'A sweeping, jet-like whoosh.',
    defaults: { rate: 0.25, depth: 0.7, feedback: 0.5, mix: 0.5 },
    params: [
      { key: 'rate', label: 'Rate', min: 0.05, max: 10, step: 0.05, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
      { key: 'feedback', label: 'Feedback', min: 0, max: 0.9, step: 0.01 },
      { key: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'tf-phaser',
    group: 'Movement',
    label: 'Phaser',
    description: 'A swirling, shifting tone.',
    defaults: { rate: 0.5, depth: 0.6, feedback: 0.4, mix: 0.5 },
    params: [
      { key: 'rate', label: 'Rate', min: 0.05, max: 10, step: 0.05, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
      { key: 'feedback', label: 'Feedback', min: 0, max: 0.9, step: 0.01 },
      { key: 'mix', label: 'Mix', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'tf-tremolo',
    group: 'Movement',
    label: 'Tremolo',
    description: 'Volume that pulses up and down.',
    defaults: { rate: 5, depth: 0.5 },
    params: [
      { key: 'rate', label: 'Rate', min: 0.1, max: 20, step: 0.1, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    type: 'tf-autopan',
    group: 'Movement',
    label: 'Auto-pan',
    description: 'Swing the sound between left and right.',
    defaults: { rate: 0.5, depth: 0.8 },
    params: [
      { key: 'rate', label: 'Rate', min: 0.05, max: 10, step: 0.05, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
    ],
  },
];

/** The groups of the add menu, in order. */
export const EFFECT_GROUPS = ['Tone', 'Dynamics', 'Colour', 'Space', 'Movement'] as const;

/** Faust effects from the server, added once they've loaded. */
const faustEffects = reactive<EffectInfo[]>([]);

/** Offer the server's Faust effects in the studio. */
export const addFaustEffects = (list: FaustEffect[]) => {
  faustEffects.splice(
    0,
    faustEffects.length,
    ...list.map((f): EffectInfo => ({
      type: f.type,
      group: (EFFECT_GROUPS as readonly string[]).includes(f.group) ? (f.group as EffectInfo['group']) : 'Colour',
      label: f.label,
      description: f.description,
      defaults: Object.fromEntries(f.params.map((p) => [p.key, p.init])),
      params: f.params.map((p) => ({
        key: p.key,
        label: p.key[0]!.toUpperCase() + p.key.slice(1),
        min: p.min,
        max: p.max,
        step: p.step,
        ...(p.unit ? { unit: p.unit } : {}),
      })),
      faust: {
        name: f.name,
        source: f.source,
        addresses: Object.fromEntries(f.params.map((p) => [p.key, p.address])),
      },
    })),
  );
};

/** Every effect the studio offers: its own, then the Faust ones. */
export const allEffects = () => [...EFFECTS, ...faustEffects];

export const effectInfo = (type: string) => allEffects().find((e) => e.type === type);

export const isFaust = (type: string) => type.startsWith('faust-');

/** A Web Audio Module plugin loaded from a link, which the server can't run. */
export const isPlugin = (effect: StemEffect) => effect.type === 'wam';

/** Whether a chain needs printing to audio for the server's mix. */
export const needsPrint = (list: StemEffect[]) => list.some((e) => isPlugin(e) && !e.bypassed);

/** A plugin's name, or the folder of its link. */
export const pluginName = (effect: StemEffect) => {
  if (effect.name) return effect.name;
  try {
    const parts = new URL(effect.url ?? '').pathname.split('/').filter((p) => p && !/^(index\.js|dist|src|build)$/.test(p));
    return parts[parts.length - 1] ?? 'Plugin';
  } catch {
    return 'Plugin';
  }
};

const pluginUrl = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' || url.hostname === 'localhost' ? url.href : null;
  } catch {
    return null;
  }
};

/** A Faust effect's settings keyed by its plugin's parameter ids. */
export const faustState = (info: EffectInfo, params: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([key]) => info.faust?.addresses[key])
      .map(([key, value]) => [info.faust!.addresses[key]!, value]),
  );

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
    .filter(
      (e): e is StemEffect =>
        !!e &&
        typeof e === 'object' &&
        (!!effectInfo((e as StemEffect).type) ||
          isFaust(String((e as StemEffect).type)) ||
          (isPlugin(e as StemEffect) && !!pluginUrl((e as StemEffect).url))),
    )
    .slice(0, 8)
    .map((e): StemEffect => {
      const info = effectInfo(e.type);
      const bypassed = e.bypassed === true || String(e.bypassed) === 'true';
      if (isPlugin(e)) {
        return {
          type: 'wam',
          url: pluginUrl(e.url)!,
          ...(typeof e.name === 'string' ? { name: e.name.slice(0, 80) } : {}),
          ...(e.state !== undefined ? { state: e.state } : {}),
          params: {},
          bypassed,
        };
      }
      // A Faust effect from before the list loaded keeps its settings as saved.
      if (!info) {
        const kept = Object.entries(e.params ?? {}).filter(([, v]) => Number.isFinite(Number(v)));
        return {
          type: e.type,
          params: Object.fromEntries(kept.map(([k, v]) => [k, Number(v)])),
          bypassed,
        };
      }
      const params: Record<string, number> = { ...info.defaults };
      for (const p of info.params) {
        const n = Number(e.params?.[p.key]);
        if (Number.isFinite(n)) params[p.key] = Math.max(p.min, Math.min(p.max, n));
      }
      return { type: e.type, params, bypassed };
    });
};

export const serializeEffects = (effects: StemEffect[]) => (effects.length ? JSON.stringify(effects) : '');
