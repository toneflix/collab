import { RouteLocationRaw } from 'vue-router';
import { WavePlaylistTrack } from './playlist';

export type FileType = 'zip' | 'audio' | 'image' | 'pdf' | 'txt' | 'lrc'
export type PriviPerm = 'manage-users' | 'manage-admins' | 'manage-configuration'
export type PriviRole = 'super-admin' | 'admin' | 'manager' | 'support' | 'user'
export type PlaylistState = 'select' | 'cursor' | 'shift' | 'fadein' | 'fadeout'
export type ResponseStatus = 'success' | 'error' | 'danger' | 'warning' | 'info' | 'notice' | 'alert'

export type BaseOption = {
  value: string;
  label: string;
}
export type GenericData = Record<string, string | number | boolean | Record<string, string>>

export type GenericResponse<X> = {
  data: ResponseBody<X>,
  status: number,
  statusText: string,
}

export type ResponseBody<X = undefined> = {
  data: X,
  token?: string,
  status: ResponseStatus,
  try_at?: string,
  errors?: Record<string, string>,
  message: string,
  time_left?: string,
  status_code: number,
}

export type PageData = {
  cache?: GenericData;
  current?: GenericData | GenericData[];
  player_track?: Track;
};

export type UploadData = {
  id?: string | number,
  src?: File,
  size?: number;
  meta?: GenericData,
  name?: string,
  file?: File,
  image?: File,
  audio?: File,
  title?: string,
  artwork?: File,
  publish?: boolean | 0 | 1,
  stem_id?: string | number,
  release_id?: string | number,
  description?: string,
};

export type Initialize = {
  configuration: Configuration;
};

export type Configuration = {
  app_name: string,
  app_email: string,
  app_currency: string,
  allow_default_images: boolean,
  prefered_sms_channel: string,
  prefered_notification_channels: 'mail' | 'sms'[],
  verify_email: boolean,
  verify_phone: boolean,
  token_lifespan: number,
  paystack_public_key: string,
  payment_verify_url: string,
  reference_prefix: string,
  previews_on_save: boolean,
}

export interface ContentMeta {
  title: string;
  imageUrl: string;
  username?: string;
};

export interface Category {
  id: string | number,
  slug: string;
  title: string;
};

export type CollabEvents = {
  togglePlay: (state: boolean, track: Track, album?: Album, origin?: string | 'player') => void;
  seeking: (position: number, track?: Track, file_url?: string) => void;
}

export interface SeekingData {
  position: number,
  track?: Track;
  url?: string;
};

export interface Genre {
  id: string | number,
  slug: string;
  title: string;
  imageUrl: string;
};

export interface Artist {
  id: string | number,
  name: string;
  about: string;
  verified: boolean;
  username: string,
  imageUrl: string;
  followers: number,
  following: number,
  youFollow: boolean;
  followsYou: boolean;
  reputation: number,
  projects_count: number,
};

export interface User extends Artist {
  id: string | number;
  email: string,
  phone: string,
  roles?: PriviRole[];
  fullname: string;
  verifying: string;
  permissions?: PriviPerm[];
  userData: {
    settings: {
      notifications: {
        email: boolean
      }
    }
  },
  emailVerifiedAt: string;
  phoneVerifiedAt: string;
  updatedAt: string;
  createdAt: string;
}

export interface Collaber extends User {
  meta: GenericData;
  role: string;
  custom: string;
  user_id: string | number;
  accepted: boolean;
  project_id: string | number;
}

export interface Track {
  id: string | number;
  slug: string;
  title: string;
  loved: boolean;
  loves: number;
  genre?: Genre;
  privacy: 'public' | 'private',
  artist?: Artist;
  release?: Release;
  streams: number;
  explicit?: boolean | 0 | 1,
  genre_id?: string | number;
  imageUrl: string;
  duration: number;
  hasError?: boolean,
  artist_id?: string | number;
  streamUrl: string;
  description: string;
  contains_music?: boolean | 0 | 1,
  updatedAt: string;
  createdAt: string;
};

export interface Release extends Album {
  isrc: string;
  iswc: string;
  pline: string;
  draft?: boolean | 0 | 1,
  explicit?: boolean | 0 | 1,
  composer: string;
  publisher: string;
  artist_id?: string | number;
  record_label: string;
  releaseDate: string;
  contains_music?: boolean | 0 | 1,
}

export type Album = {
  id: string | number,
  slug: string,
  title: string;
  loved: boolean;
  loves: number;
  genre?: Genre;
  tracks?: Track[];
  privacy: 'public' | 'private',
  artist?: Artist;
  streams: number;
  imageUrl: string;
  genre_id?: string | number;
  duration: number;
  description: string;
  tracks_count: number;
  updatedAt: string;
  createdAt: string;
};

export type Project = {
  id: string | number,
  slug: string,
  title: string,
  props: number,
  group: 'open-projects' | 'recent-projects' | 'top-projects' | 'trending-projects',
  ready?: boolean;
  proped: boolean;
  privacy: 'private' | 'public' | 'public_preview',
  imageUrl: string,
  createdAt: string,
  updatedAt: string,
  description: string,
  tracksCount: number,
  collaboratorsCount: number,
};

export interface ProjectTrack {
  id: string | number;
  src: string | File;
  slug: string;
  meta: GenericData;
  title: string;
  genre?: Genre;
  stems?: WavePlaylistTrack[];
  preview?: string | File,
  privacy: 'public' | 'private',
  artist?: Artist;
  genre_id?: string | number;
  imageUrl: string;
  duration: number;
  artist_id?: string | number;
  project_id?: string | number;
  description: string;
  updatedAt: string;
  createdAt: string;
};

export type FileAsset = {
  id: string | number;
  url: string;
  src: string;
  ext: string;
  size: number;
  meta: GenericData;
  name: string;
  model: string;
  type: FileType;
  _type: string;
  _type_id: string | number;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type NavigationLink = {
  to?: RouteLocationRaw,
  icon: string,
  title: string,
  group?: string,
  separator?: boolean,
  button?: {
    icon: string,
    action: RouteLocationRaw | ((param: string | number | Record<string, string>) => void)
  }
};

export type Link = {
  disabled?: boolean;
  disable?: boolean;
  loading?: boolean;
  tooltip?: string;
  action?: 'delete';
  active?: boolean;
  target?: string;
  color?: string;
  class?: string;
  click?: (param?: Link | string | string[] | number | (() => void)) => void;
  callback?: (param?: Link | string | string[] | number | (() => void)) => void;
  label: string;
  icon?: string;
  show?: boolean;
  to?: RouteLocationRaw;
};

export type UserComment = {
  id: string | number,
  text: string,
  user: Artist,
  replies: {
    id: string | number,
    text: string,
    user: Artist,
    createdAt: Date | string,
  }[],
  expanded: boolean,
  createdAt: Date | string,
  replies_count: number,
}
