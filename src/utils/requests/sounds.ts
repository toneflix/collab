import { alova, axios } from 'src/boot/alova'
import type { EnvKey, PageMeta, ResponseBody, SettingField } from '../models'
import type { Stem } from '../daw'

export type Sound = {
  id: number;
  name: string;
  category?: string | null;
  tags: string[];
  bpm?: number | null;
  key?: string | null;
  /** Seconds */
  duration: number;
  author?: string | null;
  license?: string | null;
  source: 'upload' | 'freesound';
  sourceUrl?: string | null;
  /** For Freesound sounds: the original file, or the MP3 preview */
  quality?: 'original' | 'preview' | null;
  /** Bytes */
  size: number;
  waveform: number[];
  url: string;
  isActive: boolean;
  /** One of the signed-in person's own sounds */
  mine: boolean;
  createdAt?: string;
}

/** A sound found on Freesound. Only CC0 sounds are ever returned. */
export type FreesoundResult = {
  id: string;
  name: string;
  tags: string[];
  author?: string | null;
  license?: string | null;
  cc0: boolean;
  duration: number;
  type?: string | null;
  size: number;
  bpm?: number | null;
  previewUrl?: string | null;
  sourceUrl?: string | null;
  /** Already in My sounds */
  imported?: boolean;
}

/** Bytes used and allowed. A limit of 0 means no limit. */
export type SoundStorage = { used: number; limit: number }

export type SoundsStatus = {
  library: boolean;
  freesound: boolean;
  freesoundConnected: boolean;
  freesoundUsername?: string | null;
  storage: SoundStorage;
  categories: string[];
}

export type SoundList = ResponseBody<Sound[]> & { meta: PageMeta }

type ListParams = { search?: string; category?: string; page?: number; limit?: number }

export const loadSoundsStatusRequest = () =>
  alova.Get('sounds/status', { transform: (e: ResponseBody<SoundsStatus>) => e.data, cacheFor: 0 })

export const loadLibrarySoundsRequest = (params: ListParams = {}) =>
  alova.Get<SoundList>('sounds/library', { params: clean(params), cacheFor: 0 })

export const loadMySoundsRequest = (params: ListParams = {}) =>
  alova.Get<SoundList>('sounds/mine', { params: clean(params), cacheFor: 0 })

/**
 * Upload an audio file to My sounds. Its length and loudness bars are worked
 * out in the browser and sent along.
 */
export const uploadSoundRequest = (file: File, info: { name?: string; duration?: number; waveform?: number[] } = {}, admin?: { category?: string }) => {
  const form = new FormData()
  form.append('file', file)
  if (info.name) form.append('name', info.name)
  if (info.duration) form.append('duration', String(Math.round(info.duration * 1000) / 1000))
  if (info.waveform?.length) form.append('waveform', JSON.stringify(info.waveform))
  if (admin?.category) form.append('category', admin.category)
  const request = axios.Post<ResponseBody<Sound> & { storage?: SoundStorage }>(admin ? 'admin/sounds/library' : 'sounds/mine', form)
  request.config.headers['Content-Type'] = 'multipart/form-data'
  return request
}

export const deleteSoundRequest = (id: number) =>
  alova.Delete<ResponseBody<{ id: number }> & { storage: SoundStorage }>(`sounds/mine/${id}`)

/** Add a sound to a project track as a new stem that starts at `start` seconds. */
export const addSoundToTrackRequest = (projectId: string | number, trackId: string | number, soundId: number, start: number) =>
  alova.Post<{ data: Stem; message: string }>(`creator/projects/${projectId}/tracks/${trackId}/sounds`, {
    sound_id: soundId,
    start: Math.max(0, Math.round(start * 1000) / 1000),
  })

export const searchFreesoundRequest = (query: string, page = 1) =>
  alova.Get<{ data: FreesoundResult[]; meta: { total: number; page: number } }>('sounds/freesound/search', {
    params: { query, page, limit: 20 },
    cacheFor: 0,
  })

export const importFreesoundRequest = (id: string) =>
  alova.Post<ResponseBody<Sound> & { storage: SoundStorage }>('sounds/freesound/import', { id })

/** Where to send someone to connect Freesound; `back` is the page to return to. */
export const connectFreesoundRequest = (back?: string) =>
  alova.Get('sounds/freesound/connect', {
    params: back ? { return: back } : {},
    transform: (e: ResponseBody<{ url: string }>) => e.data.url,
    cacheFor: 0,
  })

export const finishFreesoundRequest = (code: string, state: string) =>
  alova.Post<ResponseBody<{ connected: boolean; username?: string | null }> & { return?: string | null }>('sounds/freesound/callback', { code, state })

export const disconnectFreesoundRequest = () => alova.Delete<ResponseBody<{ connected: boolean }>>('sounds/freesound/connect')

// Admin

export type SyncResult = { added: number; skipped: number; failed: number; paused?: boolean; at: string; errors: string[] }

export type SoundAdminSettings = {
  fields: Record<string, SettingField>;
  /** Both Freesound keys are set in .env */
  configured: boolean;
  keys: { freesound: EnvKey[] };
  client: { library: boolean; freesound: boolean };
  librarySize: number;
  activeSize: number;
  syncing: boolean;
  lastSync: SyncResult | null;
  downloads: { quality: 'original' | 'preview'; username?: string | null; isMe: boolean };
  me: { connected: boolean; username?: string | null };
}

export const loadSoundSettingsRequest = () =>
  alova.Get('admin/sounds', { transform: (e: ResponseBody<SoundAdminSettings>) => e.data, cacheFor: 0 })

export const saveSoundSettingsRequest = (form: Record<string, string | number | boolean | null>) =>
  alova.Put<ResponseBody<SoundAdminSettings>>('admin/sounds', form)

export const syncSoundLibraryRequest = () => alova.Post<ResponseBody<SoundAdminSettings>>('admin/sounds/sync')

export const useMyFreesoundForLibraryRequest = () => alova.Post<ResponseBody<SoundAdminSettings>>('admin/sounds/account')

export const loadAdminLibraryRequest = (params: ListParams = {}) =>
  alova.Get<SoundList>('admin/sounds/library', { params: clean(params), cacheFor: 0 })

export const updateLibrarySoundRequest = (id: number, form: { name?: string; category?: string | null; is_active?: boolean }) =>
  alova.Put<ResponseBody<Sound>>(`admin/sounds/library/${id}`, form)

export const deleteLibrarySoundRequest = (id: number) => alova.Delete<ResponseBody<{ id: number }>>(`admin/sounds/library/${id}`)

function clean(params: ListParams) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
}

/** "1.2 MB" */
export const readableSize = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** "0:04" */
export const soundLength = (seconds: number) => {
  const s = Math.max(0, seconds || 0)
  if (s < 10) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
}

/**
 * Read an audio file's length and loudness bars in the browser, for showing
 * it before it's uploaded and for the list afterwards.
 */
export const analyseAudio = async (file: Blob, bars = 60): Promise<{ duration: number; waveform: number[] }> => {
  const Ctx = window.OfflineAudioContext
  const ctx = new Ctx(1, 1, 44100)
  const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
  const data = buffer.getChannelData(0)
  const size = Math.max(1, Math.floor(data.length / bars))
  const peaks = Array.from({ length: bars }, (_, i) => {
    let max = 0
    for (let j = i * size; j < Math.min(data.length, (i + 1) * size); j += 16) max = Math.max(max, Math.abs(data[j]!))
    return max
  })
  const top = Math.max(...peaks, 0.01)
  return { duration: buffer.duration, waveform: peaks.map((p) => Math.round((p / top) * 100) / 100) }
}
