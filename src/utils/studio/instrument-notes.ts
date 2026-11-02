import type { Clip, InstrumentChoice, Note, TimelineState, Track } from '@toneflix/studio';
import { stemClips, stemTitle, type Stem } from '../daw';
import { stemColor, stemTrackId } from './stem-timeline';

/**
 * An instrument stem, saved in its `meta.instrument` as JSON text: the
 * instrument and its settings, the patterns its note clips play, where each
 * clip sits, and links to the audio of any samples it plays. Instrument stems
 * have no audio file; the studio plays and mixes the notes.
 */
export interface InstrumentSave {
  version: 2;
  instrument: InstrumentChoice;
  /** Notes by pattern key; clips that share a key play the same pattern */
  patterns: Record<string, { name: string; notes: Note[] }>;
  clips: { pattern: string; start: number; offset: number; duration: number; gain: number }[];
  /** Links to the audio of the samples the instrument plays, by source id */
  samples?: Record<string, string>;
}

/** The built-in instruments a stem can be made with. */
export type InstrumentKind = 'synth' | 'drums' | 'sampler';

const round = (n: number) => Math.round(n * 1000) / 1000;
const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const cleanNotes = (list: unknown): Note[] =>
  (Array.isArray(list) ? list : [])
    .map((n: Partial<Note>) => ({
      pitch: Math.round(clamp(num(n.pitch, 60), 0, 127)),
      start: Math.max(0, num(n.start)),
      duration: Math.max(0.01, num(n.duration, 0.25)),
      velocity: clamp(num(n.velocity, 0.8), 0.01, 1),
    }))
    .slice(0, 4096);

// Patterns saved by the old instrument editor, kept so those stems open as notes.
type OldDrumVoice = 'kick' | 'snare' | 'clap' | 'hat' | 'openhat' | 'tom' | 'rim' | 'shaker';

/** The old drum voices on the kit's General MIDI notes. */
const OLD_DRUMS: Record<OldDrumVoice, number> = { kick: 36, snare: 38, clap: 39, hat: 42, openhat: 46, tom: 47, rim: 37, shaker: 44 };

/** The old keys presets as settings of the built-in synth. */
const OLD_PRESETS: Record<string, Record<string, number | string>> = {
  piano: { wave: 'triangle', detune: 0, attack: 0.005, decay: 0.6, sustain: 0.25, release: 0.3, cutoff: 5000, resonance: 1, envelope: 0, volume: 0.5 },
  pluck: { wave: 'sawtooth', detune: 0, attack: 0.002, decay: 0.18, sustain: 0.05, release: 0.12, cutoff: 3200, resonance: 1, envelope: 1, volume: 0.45 },
  pad: { wave: 'sawtooth', detune: 9, attack: 0.35, decay: 0.4, sustain: 0.7, release: 0.8, cutoff: 1800, resonance: 1, envelope: 0, volume: 0.35 },
  bass: { wave: 'square', detune: 0, attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.08, cutoff: 900, resonance: 2, envelope: 1, volume: 0.5 },
  lead: { wave: 'sawtooth', detune: 6, attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.15, cutoff: 4200, resonance: 2, envelope: 1, volume: 0.4 },
};

/** An old drums or keys pattern as notes, with the stem's clips around it. */
const fromOldPattern = (raw: Record<string, unknown>, stem: Stem): InstrumentSave | null => {
  const bpm = clamp(num(raw.bpm, 120), 20, 300);
  const meter = Array.isArray(raw.meter) ? raw.meter : [4, 4];
  const stepsPerBar = Math.max(1, Math.round(num(meter[0], 4) * (16 / num(meter[1], 4))));
  const bars = clamp(Math.round(num(raw.bars, 1)), 1, 8);
  const step = 60 / bpm / 4;
  const total = bars * stepsPerBar;
  const length = total * step;
  const volume = raw.volume !== undefined ? clamp(num(raw.volume, 0.9), 0, 1) : undefined;
  let instrument: InstrumentChoice;
  let notes: Note[] = [];

  if (raw.kind === 'drums') {
    const rows = (raw.rows ?? {}) as Partial<Record<OldDrumVoice, unknown>>;
    for (const [voice, pitch] of Object.entries(OLD_DRUMS)) {
      const steps = rows[voice as OldDrumVoice];
      for (const s of Array.isArray(steps) ? steps : []) {
        const at = Math.round(num(s, -1));
        if (at >= 0 && at < total) notes.push({ pitch, start: round(at * step), duration: round(step), velocity: 0.8 });
      }
    }
    instrument = { id: 'drums', state: volume !== undefined ? { volume } : {} };
  } else if (raw.kind === 'keys') {
    const list = Array.isArray(raw.notes) ? (raw.notes as Record<string, unknown>[]) : [];
    notes = list
      .map((n) => ({ pitch: Math.round(num(n.pitch, 60)), step: Math.round(num(n.step, -1)), length: Math.max(1, Math.round(num(n.length, 1))) }))
      .filter((n) => n.pitch >= 21 && n.pitch <= 108 && n.step >= 0 && n.step < total)
      .map((n) => ({ pitch: n.pitch, start: round(n.step * step), duration: round(Math.min(n.length, total - n.step) * step * 0.95), velocity: 0.8 }));
    const preset = OLD_PRESETS[String(raw.preset)] ?? OLD_PRESETS.piano!;
    instrument = { id: 'synth', state: { ...preset, ...(volume !== undefined ? { volume: preset.volume as number * volume } : {}) } };
  } else {
    return null;
  }

  // Each clip played part of the rendered pattern, which was silent past its end.
  const clips = stemClips(stem.meta).map((c) => ({
    pattern: 'p1',
    start: round(c.start),
    offset: round(Math.min(c.offset, length)),
    duration: round(Math.max(0.05, c.duration ?? length - c.offset)),
    gain: c.gain ?? 1,
  }));

  return { version: 2, instrument, patterns: { p1: { name: stemTitle(stem), notes } }, clips };
};

/** A stem's instrument save, from the old pattern format too, or null for an audio stem. */
export const readInstrument = (stem: Stem): InstrumentSave | null => {
  const value = stem.meta?.instrument;
  if (!value) return null;

  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  if (data.version !== 2) return fromOldPattern(data, stem);

  const choice = data.instrument as InstrumentChoice | undefined;
  if (!choice || typeof choice.id !== 'string') return null;

  const patterns: InstrumentSave['patterns'] = {};
  for (const [key, p] of Object.entries((data.patterns ?? {}) as Record<string, { name?: unknown; notes?: unknown }>)) {
    patterns[key] = { name: String(p?.name ?? ''), notes: cleanNotes(p?.notes) };
  }
  const clips = (Array.isArray(data.clips) ? data.clips : [])
    .filter((c: Record<string, unknown>) => typeof c?.pattern === 'string' && patterns[c.pattern as string])
    .map((c: Record<string, unknown>) => ({
      pattern: c.pattern as string,
      start: Math.max(0, num(c.start)),
      offset: Math.max(0, num(c.offset)),
      duration: Math.max(0.05, num(c.duration, 2)),
      gain: clamp(num(c.gain, 1), 0, 4),
    }));
  const samples: Record<string, string> = {};
  for (const [source, url] of Object.entries((data.samples ?? {}) as Record<string, unknown>)) {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) samples[source] = url;
  }

  return { version: 2, instrument: { id: choice.id, ...(choice.state !== undefined ? { state: choice.state } : {}) }, patterns, clips, ...(Object.keys(samples).length ? { samples } : {}) };
};

/** Whether a stem is played from notes rather than audio. */
export const isInstrumentStem = (stem: Stem) => !!readInstrument(stem);

/** The pattern source of a saved pattern on a stem's track, unique to that stem. */
const patternSource = (stemId: string | number, key: string) => `notes:stem-${stemId}:${key}`;

/** An instrument stem's track, playing its instrument. */
export const instrumentTrack = (stem: Stem, save: InstrumentSave, index: number): Track => ({
  id: stemTrackId(stem.id),
  name: stemTitle(stem),
  color: stemColor(stem.meta?.color, index),
  instrument: save.instrument,
});

/** An instrument stem's note clips. `uid` makes clip ids. */
export const instrumentClips = (stem: Stem, save: InstrumentSave, trackId: string, uid: () => string): Clip[] =>
  save.clips.map((c) => ({
    id: uid(),
    track: trackId,
    source: patternSource(stem.id, c.pattern),
    name: save.patterns[c.pattern]?.name || stemTitle(stem),
    start: c.start,
    offset: c.offset,
    duration: c.duration,
    gain: c.gain,
    fadeIn: 0,
    fadeOut: 0,
    notes: save.patterns[c.pattern]?.notes ?? [],
  }));

/**
 * An instrument track as saved: its instrument, its patterns keyed by order
 * of first use, its clips, and links for its samples from `sampleUrl`.
 */
export const saveInstrument = (state: TimelineState, track: Track, sampleUrl: (source: string) => string | undefined): InstrumentSave => {
  const clips = state.clips.filter((c) => c.track === track.id && c.notes).sort((a, b) => a.start - b.start);
  const keys = new Map<string, string>();
  const patterns: InstrumentSave['patterns'] = {};

  for (const clip of clips) {
    if (keys.has(clip.source)) continue;
    const key = `p${keys.size + 1}`;
    keys.set(clip.source, key);
    patterns[key] = {
      name: clip.name ?? '',
      notes: (clip.notes ?? []).map((n) => ({ pitch: n.pitch, start: round(n.start), duration: round(n.duration), velocity: round(n.velocity) })),
    };
  }

  const samples: Record<string, string> = {};
  for (const source of samplesOf(track)) {
    const url = sampleUrl(source);
    if (url) samples[source] = url;
  }

  return {
    version: 2,
    instrument: track.instrument ?? { id: 'synth' },
    patterns,
    clips: clips.map((c) => ({ pattern: keys.get(c.source)!, start: round(c.start), offset: round(c.offset), duration: round(c.duration), gain: round(c.gain) })),
    ...(Object.keys(samples).length ? { samples } : {}),
  };
};

/** The source ids of the samples a track's instrument plays. */
export const samplesOf = (track: Pick<Track, 'instrument'>): string[] => {
  const samples = (track.instrument?.state as { samples?: unknown } | undefined)?.samples;
  const list = Array.isArray(samples) ? samples : samples && typeof samples === 'object' ? Object.values(samples) : [];

  return list.map((s: { source?: unknown }) => s?.source).filter((s): s is string => typeof s === 'string');
};

/** A starting beat for a new drum stem: kick, snare and eighth-note hats over one bar. */
export const starterBeat = (bpm: number): Note[] => {
  const step = 60 / bpm / 4;
  const hit = (pitch: number, s: number): Note => ({ pitch, start: round(s * step), duration: round(step), velocity: 0.8 });

  return [...[0, 8].map((s) => hit(36, s)), ...[4, 12].map((s) => hit(38, s)), ...[0, 2, 4, 6, 8, 10, 12, 14].map((s) => hit(42, s))];
};
