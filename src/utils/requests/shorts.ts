import { alova } from 'src/boot/alova';
import type { PageMeta, ResponseBody } from '../models';

export type ShortStatus = 'cutting' | 'ready' | 'failed';

/** A vertical clip cut from a finished music video */
export type MusicVideoShort = {
  id: number;
  videoId: number;
  status: ShortStatus;
  start: number;
  end: number;
  length: number;
  /** Where the frame sits across the video, 0 (left) to 1 (right) */
  focus: number;
  fileUrl: string | null;
  downloadUrl: string | null;
  error: string | null;
  createdAt: string;
};

export const SHORT_MIN_SECONDS = 5;
export const SHORT_MAX_SECONDS = 60;

export const loadShortsRequest = (video: number) =>
  alova.Get<ResponseBody<MusicVideoShort[]> & { meta: PageMeta }>(
    `creator/videos/${video}/shorts`,
    { params: { limit: 20 }, cacheFor: 0 },
  );

export const createShortRequest = (
  video: number,
  form: { start: number; end: number; focus: number },
) =>
  alova.Post<ResponseBody<MusicVideoShort>>(
    `creator/videos/${video}/shorts`,
    form,
  );

export const deleteShortRequest = (video: number, short: number) =>
  alova.Delete<ResponseBody<MusicVideoShort>>(
    `creator/videos/${video}/shorts/${short}`,
  );
