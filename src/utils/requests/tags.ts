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
