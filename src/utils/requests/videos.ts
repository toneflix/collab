import { alova, axios } from 'src/boot/alova';
import type { PageMeta, ResponseBody, Track } from '../models';

export type VideoRatio = '16:9' | '9:16' | '1:1';

export const VIDEO_RATIOS: { value: VideoRatio; label: string; icon: string }[] = [
  { value: '16:9', label: 'Wide', icon: 'lucide-rectangle-horizontal' },
  { value: '9:16', label: 'Tall', icon: 'lucide-rectangle-vertical' },
  { value: '1:1', label: 'Square', icon: 'lucide-square' },
];

/** Where a video is: drawing its storyboard, waiting for a render, rendering, done or failed */
export type MusicVideoStatus = 'planning' | 'storyboard' | 'rendering' | 'ready' | 'failed';

/** One shot of a storyboard: the singer performing a line, or a scene around the song */
export type MusicVideoShot = {
  id: number;
  position: number;
  start: number;
  end: number;
  kind: 'performance' | 'broll';
  prompt: string;
  /** The still the shot starts from, while its link lasts */
  keyframeUrl: string | null;
  /** Whether a clip is kept for it, so a new render skips it */
  rendered: boolean;
};

export type MusicVideo = {
  id: number;
  trackId: number;
  track?: { id: number; slug: string; title: string };
  status: MusicVideoStatus;
  ratio: VideoRatio;
  brief: string | null;
  hasPortrait: boolean;
  /** The song's length in seconds */
  duration: number | null;
  /** Started minutes of the song, which the render is priced by */
  minutes: number;
  billing: 'credits' | 'minutes' | null;
  /** The finished video, while its link lasts */
  videoUrl: string | null;
  error: string | null;
  shots?: MusicVideoShot[];
  createdAt: string;
  finishedAt: string | null;
};

export type MusicVideoPage = ResponseBody<MusicVideo[]> & {
  meta: PageMeta;
  /** Plan video minutes left this month */
  minutesLeft: number;
  /** Whether the plan lets people upload a photo of themselves */
  ownPhotos: boolean;
};

export type NewMusicVideo = {
  ratio: VideoRatio;
  brief?: string;
  photo?: File | null;
  consent?: boolean;
};

/** Whether the AI is still working on the video */
export const videoBusy = (video: Pick<MusicVideo, 'status'>) =>
  video.status === 'planning' || video.status === 'rendering';

export const loadMusicVideosRequest = (page = 1) =>
  alova.Get<MusicVideoPage>('creator/videos', {
    params: { page, limit: 20 },
    cacheFor: 0,
  });

export const loadMusicVideoRequest = (id: number | string) =>
  alova.Get<ResponseBody<MusicVideo> & { minutesLeft: number }>('creator/videos/' + id, {
    cacheFor: 0,
  });

/** The creator's own tracks, for picking the song a video is made for */
export const loadOwnTracksRequest = (search = '', page = 1) =>
  alova.Get<ResponseBody<Track[]> & { meta: PageMeta }>('creator/tracks', {
    params: { page, limit: 15, search: search || undefined },
    cacheFor: 0,
  });

export const createMusicVideoRequest = (track: string, form: NewMusicVideo) => {
  const url = `creator/tracks/${track}/videos`;

  if (!form.photo) {
    return alova.Post<ResponseBody<MusicVideo>>(url, { ratio: form.ratio, brief: form.brief || undefined });
  }

  const data = new FormData();
  data.append('ratio', form.ratio);
  data.append('photo', form.photo);
  data.append('consent', form.consent ? '1' : '0');
  if (form.brief) data.append('brief', form.brief);

  const request = axios.Post<ResponseBody<MusicVideo>>(url, data);
  request.config.headers['Content-Type'] = 'multipart/form-data';
  return request;
};

export const updateMusicVideoShotRequest = (video: number, shot: number, prompt: string) =>
  alova.Put<ResponseBody<MusicVideoShot>>(`creator/videos/${video}/shots/${shot}`, { prompt });

export const renderMusicVideoRequest = (video: number) =>
  alova.Post<ResponseBody<MusicVideo>>(`creator/videos/${video}/render`);

/** Draws a failed storyboard again, keeping the stills already drawn */
export const retryStoryboardRequest = (video: number) =>
  alova.Post<ResponseBody<MusicVideo>>(`creator/videos/${video}/storyboard`);

export const deleteMusicVideoRequest = (video: number) =>
  alova.Delete<ResponseBody<MusicVideo>>(`creator/videos/${video}`);

/** A track's finished music video, as the player shows it */
export type TrackVideo = {
  id: number;
  trackId: number;
  ratio: VideoRatio;
  duration: number | null;
  videoUrl: string | null;
  posterUrl: string | null;
};

/** The track's music video, or null when it has none */
export const loadTrackVideoRequest = (track: number | string) =>
  alova.Get(`tracks/${track}/video`, {
    // Its links last hours, so a track seen again in the queue doesn't ask twice
    cacheFor: 10 * 60 * 1000,
    transform: (e: ResponseBody<TrackVideo | Record<string, never>>) =>
      e.data && 'videoUrl' in e.data && e.data.videoUrl ? (e.data as TrackVideo) : null,
  });

export const reorderMusicVideoShotsRequest = (video: number, shots: number[]) =>
  alova.Put<ResponseBody<MusicVideo>>(`creator/videos/${video}/shots/order`, { shots });
