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

export type Partial<X> = {
  [K in keyof X]?: X[K]
}

export type GenericData = Record<string, string | number | boolean | Record<string, string>>

export type GenericResponse<X> = {
  data: ResponseBody<X>,
  status: number,
  statusText: string,
}

export interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget
}

type PageLinks = {
  first: string,
  last: string,
  next: string,
  prev: string,
}

export type PageMeta = {
  current_page: number,
  last_page: number,
  per_page: number,
  total: number,
  links: {
    active: boolean,
    label: string,
    url: string,
  }[],
  from: number,
  path: string,
  to: number,
}

export type ResponseBody<X = undefined, Y = Record<string, string>> = {
  data: X,
  meta?: PageMeta,
  links?: PageLinks,
  token?: string,
  status: ResponseStatus,
  try_at?: string,
  errors?: Y,
  message: string,
  time_left?: string,
  status_code: number,
}

export type PageData = {
  meta: GenericData | GenericData[];
  cache?: GenericData | GenericData[];
  current: GenericData | GenericData[];
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

export interface Category<X = Track | Release | User | Project | Artist | Genre> {
  id: string | number,
  data?: ExploreItem<X>
  slug: string;
  title: string;
  params?: GenericData,
};

export type Categories = Record<string, Category[]>

export type StopEventKeywords = 'stop' | 'pause' | 'end'
export type CollabEvents = {
  justTogglePlay: (state: boolean, origin?: string) => void;
  togglePlay: (state: boolean, track: Track, album?: Album, origin?: string | 'player') => void;
  seeking: (position: number, track?: Track, file_url?: string) => void;
  pause: (position: number, track: Track, file_url?: string) => void;
  stop: (position: number, track: Track, file_url?: string) => void;
  end: (position: number, track: Track, file_url?: string) => void;
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

export type ExploreItem<X> = {
  list: X[],
  meta: Partial<PageMeta>,
}

export interface ExploreData {
  trending: ExploreItem<Track>;
  top_albums: ExploreItem<Release>;
  top_creators: ExploreItem<User>;
  new_creators: ExploreItem<User>;
  top_projects: ExploreItem<Project>;
  new_projects: ExploreItem<Project>;
  liked_tracks: ExploreItem<Track>;
  liked_albums: ExploreItem<Release>;
  latest_tracks: ExploreItem<Track>;
  random_albums: ExploreItem<Release>;
  latest_albums: ExploreItem<Release>;
  latest_artists: ExploreItem<Artist>;
  random_artists: ExploreItem<Artist>;
  recently_played: ExploreItem<Track>;
  random_creators: ExploreItem<User>;
  random_projects: ExploreItem<Project>;
  active_projects: ExploreItem<Project>;
  trending_artists: ExploreItem<Artist>;
  own_collab_albums: ExploreItem<Release>;
  own_collab_tracks: ExploreItem<Track>;
  recommended_artists: ExploreItem<Artist>;
  recently_played_albums: ExploreItem<Artist>;
  recently_played_artists: ExploreItem<Artist>;
}

export interface Interaction {
  list: string | 'default';
  props: number;
  likes: number;
  saved: boolean;
  liked: boolean;
  proped: boolean;
  reacted: boolean;
  ownprops: number;
  disliked: boolean;
  reaction: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'
  dislikes: number;
  reactions: number;
  reaction_color: 'blue' | 'red' | 'yellow' | 'orange'
  state_icons: {
    saved: string;
    proped: string;
    disliked: string;
    reaction: string;
  },
}

export interface Artist {
  id: string | number,
  name: string;
  type?: 'artist' | 'user';
  about: string;
  verified: boolean;
  username: string,
  imageUrl: string;
  followers: number,
  following: number,
  youFollow: boolean;
  followsYou: boolean;
  reputation: number,
  projectsCount: number,
};

export interface User extends Artist {
  id: string | number;
  type?: 'artist' | 'user';
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
  liked: boolean;
  likes: number;
  genre?: Genre;
  format?: 'wav' | 'flac' | 'aiff' | 'alac' | 'ogg' | 'mp2' | 'mp3' | 'aac' | 'amr' | 'wma',
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
  interaction?: Interaction,
  description: string;
  defaultStream?: boolean;
  contains_music?: boolean | 0 | 1,
  commentsCount?: number; // number of comments
  project_track_id?: string | number;
  updatedAt: string;
  createdAt: string;
};

export interface Release extends Album {
  isrc: string;
  iswc: string;
  pline: string;
  draft?: boolean | 0 | 1,
  project?: Project;
  explicit?: boolean | 0 | 1,
  composer: string;
  publisher: string;
  artist_id?: string | number;
  project_id?: string | number;
  record_label: string;
  releaseDate: string;
  contains_music?: boolean | 0 | 1,
}

export type Album = {
  id: string | number,
  slug: string,
  title: string;
  liked: boolean;
  likes: number;
  genre?: Genre;
  tracks?: Track[];
  privacy: 'public' | 'private',
  artist?: Artist;
  streams: number;
  imageUrl: string;
  genre_id?: string | number;
  duration: number;
  commentsCount?: number; // number of comments
  interaction?: Interaction,
  description: string;
  tracksCount: number;
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
  tracks?: ProjectTrack[];
  proped: boolean;
  isOwner: boolean,
  user_id?: string | number,
  privacy: 'private' | 'public' | 'public_preview',
  released: boolean;
  imageUrl: string,
  createdAt: string,
  updatedAt: string,
  isCollaber: boolean,
  joinPending?: boolean,
  interaction?: Interaction,
  description: string,
  tracksCount: number,
  commentsCount?: number; // number of comments
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
  user_id?: string | number;
  artist_id?: string | number;
  project_id?: string | number;
  stemsCount: number;
  description: string;
  interaction?: Interaction,
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
  params?: GenericData,
  separator?: boolean,
  requiresAuth?: boolean,
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
  user: Artist,
  type: 'comment' | 'reply',
  userId: string | number,
  comment: string,
  replies?: UserComment[],
  expanded?: boolean,
  createdAt: Date | string,
  repliesCount: number,
}
