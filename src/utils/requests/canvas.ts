import { alova, axios } from 'src/boot/alova';
import type { ResponseBody } from '../models';

/** Where a canvas is: being made with AI, ready to play, or failed */
export type TrackCanvasStatus = 'drawing' | 'ready' | 'failed';

/** A short, silent, looping tall clip a track shows in the player */
export type TrackCanvas = {
  id: number;
  trackId: number;
  status: TrackCanvasStatus;
  source: 'ai' | 'upload';
  brief: string | null;
  duration: number;
  videoUrl: string | null;
  posterUrl: string | null;
  error: string | null;
  createdAt: string;
};

/** Shortest and longest clip a canvas takes, in seconds */
export const CANVAS_SECONDS = { min: 3, max: 8 };

const canvasOrNull = (e: ResponseBody<TrackCanvas | Record<string, never>>) =>
  e.data && 'id' in e.data ? (e.data as TrackCanvas) : null;

/** The track's ready canvas for the player, or null when it has none */
export const loadTrackCanvasRequest = (track: number | string) =>
  alova.Get(`tracks/${track}/canvas`, {
    // Its links last hours, so a track seen again in the queue doesn't ask twice
    cacheFor: 10 * 60 * 1000,
    transform: (e: ResponseBody<TrackCanvas | Record<string, never>>) => {
      const canvas = canvasOrNull(e);
      return canvas?.videoUrl ? canvas : null;
    },
  });

/** The owner's newest canvas of the track, in whatever state */
export const loadOwnCanvasRequest = (track: number | string) =>
  alova.Get(`creator/tracks/${track}/canvas`, {
    cacheFor: 0,
    transform: canvasOrNull,
  });

/** Starts making a canvas with AI from the track's artwork */
export const makeCanvasRequest = (track: number | string, brief?: string) =>
  alova.Post<ResponseBody<TrackCanvas>>(`creator/tracks/${track}/canvas`, {
    brief: brief || null,
  });

/** Uses the owner's own clip as the canvas */
export const uploadCanvasRequest = (track: number | string, clip: File) => {
  const data = new FormData();
  data.append('clip', clip);

  const request = axios.Post<ResponseBody<TrackCanvas>>(
    `creator/tracks/${track}/canvas/upload`,
    data,
  );
  request.config.headers['Content-Type'] = 'multipart/form-data';

  return request;
};

export const removeCanvasRequest = (track: number | string) =>
  alova.Delete<ResponseBody<unknown>>(`creator/tracks/${track}/canvas`);
