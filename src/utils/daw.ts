export type FadeType = 'linear' | 'logarithmic' | 'exponential' | 'sCurve';

/** One region of a stem on the timeline, in seconds. */
export interface StemClip {
  /** Where the clip starts on the timeline */
  start: number;
  /** How far into the stem's audio the clip starts (trimmed from the front) */
  offset: number;
  /** How long the clip plays; empty means to the end of the audio */
  duration?: number;
  gain?: number;
  fadeIn?: number;
  fadeOut?: number;
  fadeType?: FadeType;
  /** The stem whose audio the clip plays, when it was moved off that stem */
  source?: string | number;
}

type LegacyFade = { shape?: FadeType; duration?: number | string };

/**
 * What the API keeps for a stem in `meta`. The flat fields (`start`, `cuein`,
 * `cueout`, `fadeIn`…) are what the old editor saved and describe the first
 * clip; `clips` holds every clip once a stem has been split.
 */
export interface StemMeta {
  name: string | number;
  title?: string;
  type?: 'stem' | 'asset';
  src?: string;
  /** Track volume, 0 to 1 */
  gain?: number;
  /** -1 (left) to 1 (right) */
  stereoPan?: number;
  muted?: boolean;
  soloed?: boolean;
  start?: number;
  cuein?: number;
  cueout?: number;
  duration?: number;
  fadeIn?: LegacyFade;
  fadeOut?: LegacyFade;
  clips?: StemClip[];
  /** The stem's effect chain, as JSON text (see utils/studio/effects) */
  effects?: string;
  /** The pattern an instrument stem was rendered from, as JSON text */
  instrument?: string;
  /** The stem's place from the top of the editor */
  order?: number;
  /** The stem's colour in the editor */
  color?: string;
  /** The stem as heard through its plugins, saved by the server for its mix */
  print?: { file: string; start: number; key: string };
  /** Where a stem added from the sound library came from */
  sound?: { id?: number; source?: string; author?: string; license?: string; url?: string };
}

/** A stem as the API returns it. */
export interface Stem {
  id: string | number;
  src: string;
  size: number;
  name: string;
  title?: string;
  stemId?: string | number | null;
  trackId?: string | number;
  meta: StemMeta;
  createdAt?: string;
}

/** A selected part of a stem: seconds into its audio file, and where it sits on the timeline */
export interface SectionSelection {
  stem: Stem;
  start: number;
  end: number;
  at: number;
  until: number;
}

const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Display name for a stem. */
export const stemTitle = (stem: Stem) => stem.title || stem.meta?.title || `Stem ${stem.id}`;

/**
 * The clips of a stem. Stems saved by the old editor have no `clips`, so their
 * single clip is rebuilt from `start`, `cuein`, `cueout` and the fades.
 */
export const stemClips = (meta: StemMeta): StemClip[] => {
  if (Array.isArray(meta.clips) && meta.clips.length) {
    return meta.clips.map((c) => ({
      start: Math.max(0, num(c.start)),
      offset: Math.max(0, num(c.offset)),
      duration: c.duration !== undefined && num(c.duration) > 0 ? num(c.duration) : undefined,
      gain: c.gain !== undefined ? num(c.gain, 1) : 1,
      fadeIn: Math.max(0, num(c.fadeIn)),
      fadeOut: Math.max(0, num(c.fadeOut)),
      fadeType: 'linear',
      ...(typeof c.source === 'string' || typeof c.source === 'number' ? { source: c.source } : {}),
    }));
  }

  const offset = Math.max(0, num(meta.cuein));
  const cueout = num(meta.cueout);

  return [
    {
      start: Math.max(0, num(meta.start)),
      offset,
      duration: cueout > offset ? cueout - offset : undefined,
      gain: 1,
      fadeIn: Math.max(0, num(meta.fadeIn?.duration)),
      fadeOut: Math.max(0, num(meta.fadeOut?.duration)),
      fadeType: 'linear',
    },
  ];
};

/**
 * Encode an AudioBuffer as a 16-bit PCM WAV file.
 */
export const encodeWav = (buffer: AudioBuffer): Blob => {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const bytes = frames * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));

  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + bytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes, true);

  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, data[c]![i]!));
      view.setInt16(at, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      at += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
};

/** Format seconds as m:ss.t for the editor clock. */
export const formatClock = (seconds: number) => {
  const s = Math.max(0, seconds || 0);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, '0')}`;
};
