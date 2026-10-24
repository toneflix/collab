import { RouteLocationRaw } from 'vue-router';
import type { StemMeta } from './daw';

export type FileType = 'zip' | 'audio' | 'image' | 'pdf' | 'txt' | 'lrc';
export type PriviPerm =
  | 'manage-users'
  | 'manage-admins'
  | 'manage-configuration'
  | 'manage-plans'
  | 'manage-payouts'
  | 'manage-content';
export type PriviRole =
  'super-admin' | 'admin' | 'manager' | 'support' | 'user';
export type ResponseStatus =
  'success' | 'error' | 'danger' | 'warning' | 'info' | 'notice' | 'alert';

export type BaseOption = {
  value: string;
  label: string;
};

export type Partial<X> = {
  [K in keyof X]?: X[K];
};

export type GenericData = Record<
  string,
  string | number | boolean | Record<string, string>
>;

export type GenericResponse<X> = {
  data: ResponseBody<X>;
  status: number;
  statusText: string;
};

export interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

type PageLinks = {
  first: string;
  last: string;
  next: string;
  prev: string;
};

export type PageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  links: {
    active: boolean;
    label: string;
    url: string;
  }[];
  from: number;
  path: string;
  to: number;
};

export type ResponseBody<X = undefined, Y = Record<string, string>> = {
  data: X;
  meta?: PageMeta;
  links?: PageLinks;
  token?: string;
  status: ResponseStatus;
  try_at?: string;
  errors?: Y;
  message: string;
  time_left?: string;
  status_code: number;
};

export type PageData = {
  meta: GenericData | GenericData[];
  cache?: GenericData | GenericData[];
  current: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  player_track?: Track;
};

export type UploadData = {
  id?: string | number;
  src?: File;
  size?: number;
  meta?: GenericData;
  name?: string;
  file?: File;
  image?: File;
  audio?: File;
  title?: string;
  artwork?: File;
  publish?: boolean | 0 | 1;
  stem_id?: string | number;
  release_id?: string | number;
  description?: string;
  stems_price?: number;
};

export type Initialize = {
  configuration: Configuration;
  realtime?: RealtimeSettings;
};

/**
 * How to connect to realtime, from the API's /initialize. The driver is the
 * service an admin picked; `transport` is the client that talks to it.
 */
/** Which sound sources the studio shows */
export type SoundsConfig = {
  /** The shared library: on, and has sounds */
  library: boolean;
  /** Freesound search and import */
  freesound: boolean;
};

/** An admin-editable setting */
export type SettingField = {
  title: string;
  hint: string;
  value: string | null;
};

/** An API key read from the server's .env. Its value is never sent. */
export type EnvKey = {
  env: string;
  title: string;
  required: boolean;
  isSet: boolean;
};

export type RealtimeSettings = {
  driver: 'none' | 'reverb' | 'pusher' | 'ably' | 'firebase';
  authPath: string;
  originHeader: string;
  transport?: 'pusher' | 'firebase-database';
  pusher?: {
    key: string;
    cluster?: string;
    wsHost?: string;
    wsPort?: number;
    forceTLS?: boolean;
  };
  'firebase-database'?: {
    apiKey: string;
    projectId: string;
    appId?: string;
    databaseURL: string;
    root?: string;
  };
};

export type Configuration = {
  app_name: string;
  app_email: string;
  app_currency: string;
  allow_default_images: boolean;
  prefered_sms_channel: string;
  prefered_notification_channels: 'mail' | 'sms'[];
  verify_email: boolean;
  verify_phone: boolean;
  token_lifespan: number;
  paystack_public_key: string;
  payment_verify_url: string;
  reference_prefix: string;
  previews_on_save: boolean;
  premium_monthly_price: number;
  premium_yearly_price: number;
  min_tip_amount: number;
  creator_share: number;
  free_max_projects: number;
  premium_max_projects: number;
  free_max_collaborators: number;
  premium_max_collaborators: number;
  free_max_stem_size: number;
  premium_max_stem_size: number;
  min_payout_amount: number;
  payout_hold_days: number;
  payout_auto_approve: boolean;
};

export type PaymentPurpose =
  'premium' | 'release' | 'stems' | 'tip' | 'credits' | 'adjustment';

export type PaymentSession = {
  reference: string;
  amount: number;
  access_code?: string;
  authorization_url?: string;
};

export type Transaction = {
  id: string | number;
  reference: string;
  purpose: PaymentPurpose;
  status: 'pending' | 'complete' | 'rejected';
  amount: number;
  earned?: number;
  message?: string | null;
  plan?: string | null;
  planName?: string | null;
  payer?: { id: string | number; fullname: string; username: string } | null;
  item?: {
    type: 'release' | 'track' | 'user';
    id: string | number;
    title: string;
    slug?: string;
    artist?: string;
    username?: string;
    imageUrl?: string;
  } | null;
  paidAt?: string;
  createdAt: string;
};

/**
 * One entry of the feature catalogue: something a plan can grant (toggle)
 * or limit (a number, where 0 means no limit).
 */
export type PlanFeature = {
  key: string;
  title: string;
  description: string;
  /** limit: 0 means no limit. credits: an amount each month, 0 means none */
  type: 'toggle' | 'limit' | 'credits';
  unit?: string | null;
  default: boolean | number;
};

export type PlanInterval = 'day' | 'week' | 'month' | 'year';

export type BillingOption = {
  /** How many periods are paid for at once */
  cycles: number;
  /** Percent off the full price */
  discount: number;
  /** The period this option covers, matching a BillingPeriod key */
  period: string;
  price: number;
  perCycle: number;
  saved: number;
};

export type Plan = {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  interval: PlanInterval;
  intervalCount: number;
  billingOptions: BillingOption[];
  features: Record<string, boolean | number>;
  isDefault: boolean;
  active: boolean;
  sort: number;
  subscribers?: number;
};

export type BillingPeriod = {
  /** e.g. "1-month", "6-month" or "1-year" */
  key: string;
  interval: PlanInterval;
  count: number;
  /** e.g. "Monthly", "6 months" or "Annual" */
  label: string;
};

export type PlansResponse = {
  plans: Plan[];
  periods: BillingPeriod[];
  features: PlanFeature[];
  current: Plan | null;
  currency: string;
};

export type PremiumStatus = {
  premium: boolean;
  endsAt?: string | null;
  current?: {
    id: number;
    plan: string;
    planName?: string;
    amount: number;
    startsAt: string;
    endsAt: string;
  } | null;
  plan: Plan;
  features: Record<string, boolean | number>;
  currency: string;
};

export type Earnings = {
  earned: number;
  currency: string;
  byPurpose: Partial<
    Record<PaymentPurpose, { count: number; gross: number; earned: number }>
  >;
};

export interface ContentMeta {
  title: string;
  imageUrl: string;
  username?: string;
}

export interface Category<
  X = Track | Release | User | Project | Artist | Genre,
> {
  id: string | number;
  data?: ExploreItem<X>;
  slug: string;
  title: string;
  params?: GenericData;
}

export type Categories = Record<string, Category[]>;

/**
 * Events shared over the app's event bus. Playback state lives in the player store instead.
 */
export type CollabEvents = {
  liked: (state: boolean, data: Interaction, signature?: string) => void;
};

export interface Genre {
  id: string | number;
  slug: string;
  title: string;
  imageUrl: string;
}

export type ExploreItem<X> = {
  list: X[];
  meta: Partial<PageMeta>;
};

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
  recently_played_albums: ExploreItem<Release>;
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
  reaction: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
  dislikes: number;
  reactions: number;
  reaction_color: 'blue' | 'red' | 'yellow' | 'orange';
  state_icons: {
    saved: string;
    proped: string;
    disliked: string;
    reaction: string;
  };
}

export interface Artist {
  id: string | number;
  name: string;
  type?: 'artist' | 'user';
  about: string;
  verified: boolean;
  username: string;
  imageUrl: string;
  followers: number;
  following: number;
  youFollow: boolean;
  followsYou: boolean;
  reputation: number;
  projectsCount: number;
  isPremium?: boolean;
  badge?: boolean;
  acceptsTips?: boolean;
}

export interface User extends Artist {
  id: string | number;
  type?: 'artist' | 'user';
  email: string;
  phone: string;
  roles?: PriviRole[];
  fullname: string;
  verifying: string;
  permissions?: PriviPerm[];
  userData: {
    settings: {
      notifications: {
        email: boolean;
      };
    };
  };
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
  format?:
    | 'wav'
    | 'flac'
    | 'aiff'
    | 'alac'
    | 'ogg'
    | 'mp2'
    | 'mp3'
    | 'aac'
    | 'amr'
    | 'wma';
  privacy: 'public' | 'private';
  artist?: Artist;
  release?: Release;
  streams: number;
  explicit?: boolean | 0 | 1;
  genre_id?: string | number;
  imageUrl: string;
  duration: number;
  hasError?: boolean;
  artist_id?: string | number;
  streamUrl: string;
  interaction?: Interaction;
  description: string;
  audioMissing?: boolean;
  contains_music?: boolean | 0 | 1;
  commentsCount?: number; // number of comments
  project_track_id?: string | number;
  price?: number;
  locked?: boolean;
  stemsPrice?: number;
  stemsForSale?: boolean;
  stemsUnlocked?: boolean;
  takenDown?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface Release extends Album {
  isrc: string;
  iswc: string;
  pline: string;
  draft?: boolean | 0 | 1;
  project?: Project;
  explicit?: boolean | 0 | 1;
  composer: string;
  publisher: string;
  artist_id?: string | number;
  project_id?: string | number;
  record_label: string;
  releaseDate: string;
  contains_music?: boolean | 0 | 1;
  price?: number;
  locked?: boolean;
  purchased?: boolean;
  takenDown?: boolean;
}

export type Album = {
  id: string | number;
  slug: string;
  title: string;
  liked: boolean;
  likes: number;
  genre?: Genre;
  tracks?: Track[];
  privacy: 'public' | 'private';
  artist?: Artist;
  streams: number;
  imageUrl: string;
  genre_id?: string | number;
  duration: number;
  commentsCount?: number; // number of comments
  interaction?: Interaction;
  description: string;
  tracksCount: number;
  updatedAt: string;
  createdAt: string;
};

export type Project = {
  id: string | number;
  slug: string;
  title: string;
  props: number;
  group:
    'open-projects' | 'recent-projects' | 'top-projects' | 'trending-projects';
  ready?: boolean;
  tracks?: ProjectTrack[];
  proped: boolean;
  isOwner: boolean;
  user_id?: string | number;
  privacy: 'private' | 'public' | 'public_preview';
  released: boolean;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  isCollaber: boolean;
  pendingData?: Collaber;
  interaction?: Interaction;
  description: string;
  tracksCount: number;
  commentsCount?: number; // number of comments
  collaboratorsCount: number;
};

export interface ProjectTrack {
  id: string | number;
  src: string | File;
  slug: string;
  meta: GenericData;
  title: string;
  genre?: Genre;
  stems?: StemMeta[];
  preview?: string | File;
  privacy: 'public' | 'private';
  artist?: Artist;
  genre_id?: string | number;
  imageUrl: string;
  duration: number;
  user_id?: string | number;
  artist_id?: string | number;
  project_id?: string | number;
  stemsCount: number;
  description: string;
  /** The studio's tempo */
  bpm?: number;
  /** The studio's meter, like "4/4" */
  timeSignature?: string;
  interaction?: Interaction;
  updatedAt: string;
  createdAt: string;
}

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
  to?: RouteLocationRaw;
  icon: string;
  title: string;
  group?: string;
  params?: GenericData;
  separator?: boolean;
  requiresAuth?: boolean;
  /** Shows a count next to the link, e.g. unread messages */
  badge?: 'messages';
  button?: {
    icon: string;
    action:
      | RouteLocationRaw
      | ((param: string | number | Record<string, string>) => void);
  };
};

export type Link = {
  actionTitle?: string;
  actionMsg?: string;
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
  id: string | number;
  /** What the comment is on; for a reply, the comment it answers */
  cid?: string | number;
  user: Artist;
  type: 'comment' | 'reply';
  userId: string | number;
  comment: string;
  replies?: UserComment[];
  expanded?: boolean;
  createdAt: Date | string;
  repliesCount: number;
};
