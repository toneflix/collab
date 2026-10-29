import { alova, axios } from 'src/boot/alova';
import type { PageMeta, ResponseBody } from '../models';

/** Where the engine is in checking that an uploaded voice is its owner's */
export type VoiceCheck = 'preparing' | 'recording' | 'building' | 'done' | 'failed';

/** An artist's voice for AI music */
export type ArtistVoice = {
  artistId: number;
  artistName?: string | null;
  /** Words music prompts use for the voice */
  description?: string | null;
  status: 'empty' | 'generating' | 'ready' | 'failed';
  /** Who made the sample */
  source?: 'generated' | 'upload' | null;
  seconds?: number | null;
  /** A link that plays the sample for a few hours */
  sampleUrl?: string | null;
  /** Whether the engine built a voice from the sample */
  built: boolean;
  check?: VoiceCheck | null;
  /** The phrase to record, while the check waits for it */
  phrase?: string | null;
  failure?: string | null;
  /** Whether the AI is still working on the sample or the voice */
  busy: boolean;
  /** Whether studio music and Composer songs can sing in it now */
  studio: boolean;
  composer: boolean;
  /** Credits an AI sample uses, or null when the AI can't make one */
  sampleCredits: number | null;
  minSeconds: number;
  maxSeconds: number;
};

const path = (artist: string | number) => `creator/artists/${artist}/voice`;

export const loadArtistVoiceRequest = (artist: string | number) =>
  alova.Get(path(artist), {
    transform: (e: ResponseBody<ArtistVoice>) => e.data,
    cacheFor: 0,
  });

export const describeArtistVoiceRequest = (artist: string | number, description: string) =>
  alova.Put<ResponseBody<ArtistVoice>>(path(artist), { description });

export const uploadVoiceSampleRequest = (artist: string | number, sample: Blob, name = 'voice.webm') => {
  const data = new FormData();
  data.append('sample', sample, name);

  return multipart(axios.Post<ResponseBody<ArtistVoice>>(`${path(artist)}/sample`, data));
};

export const generateVoiceSampleRequest = (artist: string | number) =>
  alova.Post<ResponseBody<ArtistVoice>>(`${path(artist)}/generate`);

/** Send the recording of the phrase that proves the voice is the user's */
export const checkVoiceRequest = (artist: string | number, recording: Blob, name = 'phrase.webm') => {
  const data = new FormData();
  data.append('recording', recording, name);

  return multipart(axios.Post<ResponseBody<ArtistVoice>>(`${path(artist)}/check`, data));
};

export const restartVoiceCheckRequest = (artist: string | number) =>
  alova.Post<ResponseBody<ArtistVoice>>(`${path(artist)}/check/restart`);

export const removeVoiceSampleRequest = (artist: string | number) =>
  alova.Delete<ResponseBody<ArtistVoice>>(path(artist));

/** The user's artists with a voice sample */
export const loadVoicesRequest = () =>
  alova.Get<{ data: ArtistVoice[]; meta: PageMeta }>('creator/voices', {
    params: { limit: 50 },
    cacheFor: 0,
  });

/** A file name for a recording, with the extension its type uses */
export const recordingName = (blob: Blob, base: string) => {
  const type = blob.type.split(';')[0] ?? '';
  const ext = { 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }[type] ?? 'webm';

  return `${base}.${ext}`;
};

function multipart<T extends { config: { headers: Record<string, unknown> } }>(request: T) {
  request.config.headers['Content-Type'] = 'multipart/form-data';

  return request;
}
