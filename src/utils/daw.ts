import type { ClipConfig, TrackConfig } from '@dawcore/components';
import type { ClipTrack, FadeType } from '@waveform-playlist/core';

export type { FadeType };

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

const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';

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
 * Turn a stem into the config `<daw-editor>.addTrack()` takes. `audioUrl`
 * points the clips at audio already on this device instead of the network.
 */
export const stemToTrack = (stem: Stem, audioUrl?: string): TrackConfig => {
  const meta = stem.meta || ({} as StemMeta);
  const src = audioUrl || meta.src || stem.src;

  return {
    name: stemTitle(stem),
    volume: meta.gain !== undefined ? Math.min(1, Math.max(0, num(meta.gain, 1))) : 1,
    pan: Math.min(1, Math.max(-1, num(meta.stereoPan))),
    muted: bool(meta.muted),
    soloed: bool(meta.soloed),
    clips: stemClips(meta).map(
      (c): ClipConfig => ({
        src,
        name: stemTitle(stem),
        start: c.start,
        offset: c.offset,
        ...(c.duration ? { duration: c.duration } : {}),
        gain: c.gain ?? 1,
        fadeIn: c.fadeIn ?? 0,
        fadeOut: c.fadeOut ?? 0,
        fadeType: c.fadeType ?? 'linear',
      }),
    ),
  };
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Read a track's state from the editor's engine and turn it into the stem
 * `meta` the API keeps. The flat fields mirror the first clip, so older
 * clients can still read it.
 */
export const trackToMeta = (stem: Stem, track: ClipTrack): StemMeta => {
  const clips: StemClip[] = [...track.clips]
    .sort((a, b) => a.startSample - b.startSample)
    .map((c) => ({
      start: round(c.startSample / c.sampleRate),
      offset: round(c.offsetSamples / c.sampleRate),
      duration: round(c.durationSamples / c.sampleRate),
      gain: round(c.gain ?? 1),
      fadeIn: round(c.fadeIn?.duration ?? 0),
      fadeOut: round(c.fadeOut?.duration ?? 0),
      fadeType: 'linear' as FadeType,
    }));

  const first = clips[0];

  return {
    name: stem.meta?.name ?? stem.id,
    title: stemTitle(stem),
    type: 'stem',
    gain: round(track.volume),
    stereoPan: round(track.pan),
    muted: track.muted,
    soloed: track.soloed,
    start: first?.start ?? 0,
    cuein: first?.offset ?? 0,
    cueout: first ? round(first.offset + (first.duration ?? 0)) : 0,
    duration: first?.duration ?? 0,
    fadeIn: { shape: 'linear', duration: first?.fadeIn ?? 0 },
    fadeOut: { shape: 'linear', duration: first?.fadeOut ?? 0 },
    clips,
  };
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
