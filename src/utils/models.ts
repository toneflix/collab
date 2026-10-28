import type { AuthPagesConfig } from './auth-pages';
import type { ArtistClaim } from './requests/artists';
import { RouteLocationRaw } from 'vue-router';
import type { StemMeta } from './daw';
import type { AudioTags } from './requests/tags';
import type { PublicSong } from './requests/composer';

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

export type PageMeta = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
};

export type ResponseBody<X = undefined, Y = Record<string, string>> = {
  data: X;
  meta?: PageMeta;
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
  /** Fields the release and track forms send, in the API's request names */
  genre_id?: string | number;
  artist_id?: string | number;
  project_id?: string | number;
  record_label?: string;
  contains_music?: boolean | 0 | 1;
  project_track_id?: string | number;
  /** Topic ids the release form sends */
  topic_ids?: number[];
};

export type Initialize = {
  configuration: Configuration;
  realtime?: RealtimeSettings;
  auth?: AuthPagesConfig;
  accountTypes?: AccountTypeOption[];
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
  /** Community Discord invite; empty hides it */
  discord_url?: string;
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
  account_deletion_days?: number;
  free_max_projects: number;
  premium_max_projects: number;
  free_max_collaborators: number;
  premium_max_collaborators: number;
  free_max_stem_size: number;
  premium_max_stem_size: number;
  min_payout_amount: number;
  payout_hold_days: number;
  payout_auto_approve: boolean;
  /** Hold published releases until an admin approves them */
  review_releases: boolean;
  /** Let people add Web Audio Module plugins to stems */
  studio_plugins?: boolean;
  /** Let plans with downloads save tracks whose creator allowed it */
  track_downloads?: boolean;
};

export type PaymentPurpose =
  'premium' | 'release' | 'stems' | 'tip' | 'credits' | 'adjustment';

export type PaymentSession = {
  reference: string;
  amount: number;
  accessCode?: string;
  authorizationUrl?: string;
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
  topAlbums: ExploreItem<Release>;
  topCreators: ExploreItem<User>;
  newCreators: ExploreItem<User>;
  topProjects: ExploreItem<Project>;
  newProjects: ExploreItem<Project>;
  likedTracks: ExploreItem<Track>;
  likedAlbums: ExploreItem<Release>;
  latestTracks: ExploreItem<Track>;
  randomAlbums: ExploreItem<Release>;
  latestAlbums: ExploreItem<Release>;
  latestArtists: ExploreItem<Artist>;
  randomArtists: ExploreItem<Artist>;
  recentlyPlayed: ExploreItem<Track>;
  /** Tracks in the viewer's interest genres */
  forYou: ExploreItem<Track>;
  randomCreators: ExploreItem<User>;
  randomProjects: ExploreItem<Project>;
  activeProjects: ExploreItem<Project>;
  trendingArtists: ExploreItem<Artist>;
  ownCollabAlbums: ExploreItem<Release>;
  ownCollabTracks: ExploreItem<Track>;
  recommendedArtists: ExploreItem<Artist>;
  recentlyPlayedAlbums: ExploreItem<Release>;
  recentlyPlayedArtists: ExploreItem<Artist>;
  newSongs: ExploreItem<PublicSong>;
  topSongs: ExploreItem<PublicSong>;
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
  /** The content agent builds for this account, and its users can run it */
  contentAgent?: boolean;
  /** The user can run the content agent: an agent account, or a plan with it */
  agentAccess?: boolean;
  badge?: boolean;
  acceptsTips?: boolean;
  coverUrl?: string | null;
  /** The viewer manages the artist or is an admin */
  canEdit?: boolean;
  /** The viewer can mark the artist verified */
  canVerify?: boolean;
  /** No account manages the artist yet */
  claimable?: boolean;
  /** The viewer's latest claim on the artist, on the artist page */
  yourClaim?: ArtistClaim | null;
}

export interface User extends Artist {
  id: string | number;
  type?: 'artist' | 'user';
  email: string;
  phone: string;
  roles?: PriviRole[];
  fullname: string;
  firstname?: string;
  lastname?: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
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
  /** How the account uses Toneflix Music, picked at sign-up */
  accountType?: AccountTypeValue | null;
  /** Roles that fit the account type, like artist or producer */
  identities?: string[];
  /** When the user last saved their interest genres */
  interestsAt?: string | null;
  updatedAt: string;
  createdAt: string;
}

export type AccountTypeValue = 'creator' | 'listener';

/** An account type and the identities it can pick, from /initialize. */
export type AccountTypeOption = {
  value: AccountTypeValue;
  label: string;
  identities: { value: string; label: string }[];
};

/** A user's account type, identities and interest genres. */
export type Interests = {
  accountType: AccountTypeValue | null;
  identities: string[];
  genres: { id: number; slug: string; title: string }[];
  topics: { id: number; slug: string; title: string }[];
  interestsAt: string | null;
};

/** A music topic people pick as an interest. */
export type Topic = {
  id: number;
  slug: string;
  title: string;
  usersCount?: number;
  /** Added by a user rather than built in */
  custom?: boolean;
};

export interface Collaber extends User {
  meta: GenericData;
  role: string;
  custom: string;
  userId: string | number;
  accepted: boolean;
  projectId: string | number;
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
  genreId?: string | number;
  imageUrl: string;
  duration: number;
  hasError?: boolean;
  artistId?: string | number;
  streamUrl: string;
  interaction?: Interaction;
  description: string;
  audioMissing?: boolean;
  containsMusic?: boolean | 0 | 1;
  commentsCount?: number; // number of comments
  projectTrackId?: string | number;
  price?: number;
  locked?: boolean;
  stemsPrice?: number;
  stemsForSale?: boolean;
  stemsUnlocked?: boolean;
  /** Whether the signed in user could download it: owned, bought, or offered to plans with downloads */
  downloadable?: boolean;
  takenDown?: boolean;
  /** Tempo and key */
  tags?: AudioTags;
  /** Whether the signed in user released this track */
  owned?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface Release extends Album {
  isrc: string;
  iswc: string;
  pline: string;
  draft?: boolean | 0 | 1;
  /** A label for this version of a project's release, like "Radio Edit" */
  version?: string | null;
  retired?: boolean;
  retiredAt?: string | null;
  /** Set when release reviews are on: waiting for an admin, approved, or sent back */
  reviewStatus?: 'pending' | 'approved' | 'rejected' | null;
  /** The admin's note when a release was sent back. Only its owner gets it. */
  reviewNote?: string | null;
  /** Ids of the project's other releases to retire when this one is published */
  retire?: (string | number)[];
  project?: Project;
  explicit?: boolean | 0 | 1;
  composer: string;
  publisher: string;
  artistId?: string | number;
  projectId?: string | number;
  recordLabel: string;
  releaseDate: string;
  containsMusic?: boolean | 0 | 1;
  price?: number;
  /** The creator lets listeners with downloads in their plan save the tracks */
  downloadable?: boolean | 0 | 1;
  /** Moods and subjects the creator tagged the release with */
  topics?: Topic[];
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
  genreId?: string | number;
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
  collaborators?: Collaber[];
  proped: boolean;
  isOwner: boolean;
  userId?: string | number;
  privacy: 'private' | 'public' | 'public_preview';
  released: boolean;
  /** The owner's unpublished release of this project, if one is in progress */
  draftReleaseId?: string | number | null;
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

export type MixState = { status: 'rendering' | 'ready' | 'failed'; error?: string };

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
  genreId?: string | number;
  imageUrl: string;
  duration: number;
  userId?: string | number;
  artistId?: string | number;
  projectId?: string | number;
  stemsCount: number;
  description: string;
  /** The studio's tempo */
  bpm?: number;
  /** The studio's meter, like "4/4" */
  timeSignature?: string;
  /** Tempo and key detected in the preview mix, or set by a collaborator */
  tags?: AudioTags;
  /** The studio's master volume, 0 to 1 */
  mixVolume?: number;
  /** The master bus effect chain, as JSON text */
  masterEffects?: string;
  /** The Composer song the track was made from, for people who can edit it */
  song?: { id: number; title: string; body: string | null; bpm: number | null; key: string | null; mood: string | null };
  /** Where the server is with the newest preview mix */
  mix?: MixState | null;
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
