import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';
import type { AiJob } from './ai';

/** One line of lyrics, with where it's sung in seconds when synced */
export type LyricLine = {
  start: number | null;
  end: number | null;
  text: string;
};

export type Lyrics = {
  lines: LyricLine[];
  /** Whether the lines carry times the player can follow */
  synced: boolean;
  language: string | null;
  source: 'transcribed' | 'written';
  explicit: boolean;
  updatedAt: string;
};

const sheet = (projectId: string | number, trackId: string | number) =>
  `creator/projects/${projectId}/tracks/${trackId}`;

/**
 * The line being sung at a time: the last synced line that started by then
 * and hasn't ended long before.
 */
export const activeLine = (lines: LyricLine[], time: number) => {
  let active = -1;
  lines.forEach((line, i) => {
    if (line.start !== null && line.start <= time) active = i;
  });
  const line = lines[active];
  if (line?.end !== null && line?.end !== undefined && time > line.end + 4)
    return -1;
  return active;
};

/** A track with no lyrics yet comes back as an empty object */
const lyricsOrNull = (e: ResponseBody<Lyrics | Record<string, never>>) => (e.data && 'lines' in e.data ? (e.data as Lyrics) : null);

export const loadTrackLyricsRequest = (trackId: string | number) =>
  alova.Get(`tracks/${trackId}/lyrics`, {
    transform: lyricsOrNull,
    cacheFor: 60 * 1000,
  });

export const loadLyricSheetRequest = (
  projectId: string | number,
  trackId: string | number,
) =>
  alova.Get(`${sheet(projectId, trackId)}/lyrics`, {
    transform: lyricsOrNull,
    cacheFor: 0,
  });

export const saveLyricSheetRequest = (
  projectId: string | number,
  trackId: string | number,
  lines: LyricLine[],
) =>
  alova.Put(`${sheet(projectId, trackId)}/lyrics`, { lines }, {
    transform: (e: ResponseBody<Lyrics>) => ({ ...e, data: lyricsOrNull(e) }),
  });

export const transcribeStemRequest = (
  projectId: string | number,
  trackId: string | number,
  stemId: string | number,
) =>
  alova.Post<ResponseBody<AiJob>>(
    `${sheet(projectId, trackId)}/stems/${stemId}/lyrics`,
  );

export const saveTrackLyricsRequest = (
  trackId: string | number,
  lines: LyricLine[],
) =>
  alova.Put(`creator/tracks/${trackId}/lyrics`, { lines }, {
    transform: (e: ResponseBody<Lyrics>) => ({ ...e, data: lyricsOrNull(e) }),
  });
