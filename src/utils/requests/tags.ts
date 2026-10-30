import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

/** A track's tempo and key, detected from its audio or set by its creator */
export type AudioTags = {
  bpm: number | null;
  /** Full key name, like "A minor" */
  key: string | null;
  /** Short key name, like "Am" */
  keyShort: string | null;
  /** Camelot wheel code DJs mix by, like "8A" */
  camelot: string | null;
  source: 'detected' | 'manual' | null;
};

const TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** Camelot number of a key: a fifth (7 semitones) moves one step on the wheel */
const camelot = (pitch: number, minor: boolean) =>
  ((((pitch - (minor ? 8 : 11) + 12) * 7) % 12) + 1) + (minor ? 'A' : 'B');

/** The 24 keys, ordered around the Camelot wheel */
export const MUSICAL_KEYS = [false, true]
  .flatMap((minor) =>
    (minor ? MINOR_TONICS : TONICS).map((tonic, pitch) => ({
      value: `${tonic} ${minor ? 'minor' : 'major'}`,
      short: tonic + (minor ? 'm' : ''),
      camelot: camelot(pitch, minor),
    })),
  )
  .sort(
    (a, b) =>
      parseInt(a.camelot) - parseInt(b.camelot) ||
      a.camelot.localeCompare(b.camelot),
  )
  .map((key) => ({ ...key, label: `${key.value} (${key.camelot})` }));

export type TagTarget =
  | { projectId: string | number; trackId: string | number }
  | { trackId: string | number };

/** Save a creator's tempo and key. Sending neither detects them again. */
export const saveTagsRequest = (
  target: TagTarget,
  tags: { bpm: number | null; key: string | null },
) =>
  alova.Put<ResponseBody<AudioTags>>(
    'projectId' in target
      ? `creator/projects/${target.projectId}/tracks/${target.trackId}/tags`
      : `creator/tracks/${target.trackId}/tags`,
    tags,
  );

/** A track's moods, detected from its audio and lyrics or set by its creator */
export type StyleTags = {
  moods: string[];
  source: 'detected' | 'manual' | null;
  /** The genre the audio sounds like, when the detector was sure enough */
  suggestedGenreId: number | null;
};

/** Every mood a track can carry, in the order pickers show them */
export const MOODS = [
  'happy',
  'sad',
  'energetic',
  'calm',
  'romantic',
  'dark',
  'uplifting',
  'aggressive',
  'dreamy',
  'melancholic',
  'playful',
  'epic',
  'tense',
  'nostalgic',
  'groovy',
  'sensual',
].map((value) => ({ value, label: value[0]!.toUpperCase() + value.slice(1) }));

export const MAX_MOODS = 3;

export const moodLabel = (mood: string) => MOODS.find((m) => m.value === mood)?.label ?? mood;

/** Save a creator's moods. Sending none goes back to the detected ones. */
export const saveMoodsRequest = (target: TagTarget, moods: string[]) =>
  alova.Put<ResponseBody<StyleTags>>(
    'projectId' in target
      ? `creator/projects/${target.projectId}/tracks/${target.trackId}/moods`
      : `creator/tracks/${target.trackId}/moods`,
    { moods },
  );
