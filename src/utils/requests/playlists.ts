import { alova } from 'src/boot/alova';
import type { Playlist, ResponseBody, Track } from '../models';

export type PlaylistFields = Partial<Pick<Playlist, 'title' | 'description' | 'privacy'>>;

/**
 * The signed in user's playlists. With `track_id` each says whether it holds that track.
 */
export const loadMyPlaylistsRequest = (params: { page?: number; limit?: number; search?: string; track_id?: string | number } = {}) =>
  alova.Get<ResponseBody<Playlist[]>>('playlists', { params, cacheFor: 0 });

export const createPlaylistRequest = (fields: PlaylistFields) =>
  alova.Post<ResponseBody<Playlist>>('playlists', fields);

export const loadPlaylistRequest = (slug: string) =>
  alova.Get<ResponseBody<Playlist>>(`playlists/${slug}`, { cacheFor: 0 });

export const updatePlaylistRequest = (slug: string, fields: PlaylistFields) =>
  alova.Put<ResponseBody<Playlist>>(`playlists/${slug}`, fields);

export const deletePlaylistRequest = (slug: string) =>
  alova.Delete<ResponseBody<{ deleted: boolean }>>(`playlists/${slug}`);

/**
 * A playlist's tracks in its order.
 */
export const loadPlaylistTracksRequest = (slug: string, params: { page?: number; limit?: number } = {}) =>
  alova.Get<ResponseBody<Track[]>>(`playlists/${slug}/tracks`, { params: { with: 'artist', ...params }, cacheFor: 0 });

export const addToPlaylistRequest = (slug: string, trackId: string | number) =>
  alova.Post<ResponseBody<Playlist>>(`playlists/${slug}/tracks`, { track_id: trackId });

export const removeFromPlaylistRequest = (slug: string, trackId: string | number) =>
  alova.Delete<ResponseBody<Playlist>>(`playlists/${slug}/tracks/${trackId}`);
