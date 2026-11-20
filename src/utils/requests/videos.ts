import { alova, axios } from 'src/boot/alova';
import type { PageMeta, ResponseBody, Track } from '../models';
import type { StripRow } from '../video-strip';

export type VideoRatio = '16:9' | '9:16' | '1:1';

export const VIDEO_RATIOS: { value: VideoRatio; label: string; icon: string }[] = [
  { value: '16:9', label: 'Wide', icon: 'lucide-rectangle-horizontal' },
  { value: '9:16', label: 'Tall', icon: 'lucide-rectangle-vertical' },
  { value: '1:1', label: 'Square', icon: 'lucide-square' },
];

/** Where a video is: drawing its storyboard, waiting for a render, rendering, done or failed */
export type MusicVideoStatus = 'planning' | 'storyboard' | 'rendering' | 'ready' | 'failed';

/** How a still-only shot moves over its still */
export type ShotMotion = 'zoom_in' | 'zoom_out' | 'pan';

export const SHOT_MOTIONS: { value: ShotMotion; label: string; icon: string }[] = [
  { value: 'zoom_in', label: 'Zoom in', icon: 'lucide-zoom-in' },
  { value: 'zoom_out', label: 'Zoom out', icon: 'lucide-zoom-out' },
  { value: 'pan', label: 'Pan', icon: 'lucide-move-horizontal' },
];

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
  /** Whether its take still fits, so saving doesn't render it again */
  rendered: boolean;
  /** The take it plays */
  takeId: number | null;
  /** The take it plays, while its link lasts */
  clipUrl: string | null;
  /** Seconds into the take it starts */
  offset: number;
  /** Set when it shows its still with this motion instead of a take */
  motion: ShotMotion | null;
  /** Keys of the characters seen in the shot */
  characters: string[];
};

/** A clip made for a shot; any shot of the video can play it */
export type MusicVideoTake = {
  id: number;
  shotId: number | null;
  source: 'ai' | 'upload';
  length: number;
  /** Song seconds a singing take was lip-synced to */
  syncedFrom: number | null;
  syncedTo: number | null;
  prompt: string | null;
  clipUrl: string;
  createdAt: string;
};

/** Someone in the video, with the character sheet their stills are drawn from */
export type MusicVideoCharacter = {
  id: number;
  key: string;
  name: string;
  description: string;
  singer: boolean;
  /** The character sheet, while its link lasts */
  sheetUrl: string | null;
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
  /** Whether the shots changed since the video was last saved */
  edited: boolean;
  characters?: MusicVideoCharacter[];
  shots?: MusicVideoShot[];
  takes?: MusicVideoTake[];
  createdAt: string;
  finishedAt: string | null;
};

export type MusicVideoPage = ResponseBody<MusicVideo[]> & {
  meta: PageMeta;
  /** Plan video minutes left this month */
  minutesLeft: number;
  secondsLeft: number;
  /** Whether the plan lets people upload a photo of themselves */
  ownPhotos: boolean;
};

/** A character sheet the creator uploads, tagged with who it shows */
export type CharacterSheetUpload = {
  name: string;
  description?: string;
  singer: boolean;
  sheet: File;
};

export type NewMusicVideo = {
  ratio: VideoRatio;
  brief?: string;
  photo?: File | null;
  /** The creator's own character sheets; none are drawn when given */
  characters?: CharacterSheetUpload[];
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
  alova.Get<ResponseBody<MusicVideo> & { minutesLeft: number; secondsLeft: number }>('creator/videos/' + id, {
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

  if (!form.photo && !form.characters?.length) {
    return alova.Post<ResponseBody<MusicVideo>>(url, { ratio: form.ratio, brief: form.brief || undefined });
  }

  const data = new FormData();
  data.append('ratio', form.ratio);
  data.append('consent', form.consent ? '1' : '0');
  if (form.brief) data.append('brief', form.brief);
  if (form.characters?.length) {
    form.characters.forEach((character, i) => {
      data.append(`characters[${i}][name]`, character.name);
      data.append(`characters[${i}][singer]`, character.singer ? '1' : '0');
      data.append(`characters[${i}][sheet]`, character.sheet);
      if (character.description) data.append(`characters[${i}][description]`, character.description);
    });
  } else if (form.photo) {
    data.append('photo', form.photo);
  }

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

/** Saves the editor's whole strip of shots */
export const saveMusicVideoShotsRequest = (video: number, shots: StripRow[]) =>
  alova.Put<ResponseBody<MusicVideo>>(`creator/videos/${video}/shots`, { shots });

/** Puts the shots back as the finished video has them */
export const discardMusicVideoEditsRequest = (video: number) =>
  alova.Delete<ResponseBody<MusicVideo>>(`creator/videos/${video}/edit`);
