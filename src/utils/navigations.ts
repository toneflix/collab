import { RouteLocationRaw } from 'vue-router';
import { Categories, GenericData, NavigationLink, PriviPerm, Project } from './models';

export const mainNavigationLinks: NavigationLink[] = [
  {
    to: '/home',
    icon: 'lucide-house',
    title: 'Home',
  },
  {
    to: { name: 'genres' },
    icon: 'lucide-layout-grid',
    title: 'Genres',
  },
  {
    to: { name: 'artists' },
    icon: 'lucide-user',
    title: 'Artists',
  },
  {
    to: { name: 'creators' },
    icon: 'lucide-droplet',
    title: 'Creators',
  },
  {
    to: { name: 'songs' },
    icon: 'lucide-music',
    title: 'Songs',
  },
  {
    to: { name: 'albums' },
    icon: 'lucide-layers',
    title: 'Albums',
  },
  {
    to: { name: 'projects' },
    icon: 'lucide-speaker',
    title: 'Projects',
  },
  {
    to: { name: 'compositions' },
    icon: 'lucide-quote',
    title: 'Compositions',
  },
  {
    to: { name: 'studio.composer' },
    icon: 'lucide-pen-tool',
    title: 'Composer',
    requiresAuth: true,
    creatorOnly: true,
  },
  {
    to: '',
    icon: '',
    title: 's1',
    separator: true,
  },
  {
    to: { name: 'studio.home' },
    icon: 'lucide-mic',
    title: 'Studio',
    requiresAuth: true,
    creatorOnly: true,
  },
  {
    to: { name: 'library.page', params: { type: 'liked' } },
    icon: 'lucide-heart',
    title: 'Liked',
  },
  {
    to: { name: 'library.page', params: { type: 'saved' } },
    icon: 'lucide-bookmark',
    title: 'Saved',
  },
  {
    to: { name: 'library.playlists' },
    icon: 'lucide-list-music',
    title: 'Playlists',
  },
  {
    to: { name: 'library.page', params: { type: 'collabs' } },
    icon: 'lucide-users',
    title: 'Collabs',
  },
  {
    to: { name: 'library.page', params: { type: 'recent' } },
    icon: 'lucide-music',
    title: 'Recent',
  },
  {
    to: '',
    icon: '',
    title: 's1',
    separator: true,
  },
  {
    to: { name: 'studio.projects' },
    icon: '',
    title: 'My Projects',
    group: 'creator/projects',
    params: { filters: 'latest', limit: 3 },
    button: {
      icon: 'lucide-plus',
      action: {
        name: 'studio.projects.create',
      },
    },
    requiresAuth: true,
    creatorOnly: true,
  },
]

/** The main menu links someone may see, by whether they are signed in and a listener. */
export const visibleNavigationLinks = (signedIn: boolean, isListener: boolean) =>
  mainNavigationLinks.filter(
    (link) =>
      (!link.requiresAuth || signedIn) &&
      (!link.creatorOnly || !isListener),
  );

export type AdminLink = {
  to: RouteLocationRaw;
  icon: string;
  title: string;
  caption: string;
  /** The permission the page needs, or a list of which any one will do */
  permission: PriviPerm | PriviPerm[];
};

/** Every admin page, with the permission it needs. */
export const adminNavigationLinks: AdminLink[] = [
  {
    to: { name: 'admin.users' },
    icon: 'lucide-users',
    title: 'Users',
    caption: 'Accounts, their plans, balances and AI credits',
    permission: 'manage-users',
  },
  {
    to: { name: 'admin.configuration' },
    icon: 'lucide-sliders-horizontal',
    title: 'Configuration',
    caption: 'Currency, creator share and withdrawal limits',
    permission: 'manage-configuration',
  },
  {
    to: { name: 'admin.auth-pages' },
    icon: 'lucide-panels-top-left',
    title: 'Auth pages',
    caption: 'Sign-in and sign-up layout, banner and text',
    permission: 'manage-configuration',
  },
  {
    to: { name: 'admin.plans' },
    icon: 'lucide-layers',
    title: 'Plans',
    caption: 'Prices, features and billing options',
    permission: 'manage-plans',
  },
  {
    to: { name: 'admin.payouts' },
    icon: 'lucide-banknote',
    title: 'Payouts',
    caption: 'Withdrawal requests and payout providers',
    permission: 'manage-payouts',
  },
  {
    to: { name: 'admin.moderation' },
    icon: 'lucide-shield-half',
    title: 'Moderation',
    caption: 'Reports, copied audio, takedowns and appeals',
    permission: 'manage-content',
  },
  {
    to: { name: 'admin.content' },
    icon: 'lucide-library',
    title: 'Content',
    caption: 'Tracks, albums, compositions, projects and artists',
    permission: 'manage-content',
  },
  {
    to: { name: 'admin.genres' },
    icon: 'lucide-tags',
    title: 'Genres',
    caption: 'Genre names and cover photos',
    permission: 'manage-content',
  },
  {
    to: { name: 'admin.assistant' },
    icon: 'lucide-sparkles',
    title: 'Assistant',
    caption: 'Ask for moderation work in plain words',
    permission: ['manage-users', 'manage-content'],
  },
  {
    to: { name: 'admin.agent' },
    icon: 'lucide-bot',
    title: 'Content agent',
    caption: 'Queued prompts that build artists, albums and songs',
    permission: 'manage-content',
  },
  {
    to: { name: 'admin.realtime' },
    icon: 'lucide-radio-tower',
    title: 'Realtime',
    caption: 'Live updates driver and its keys',
    permission: 'manage-configuration',
  },
  {
    to: { name: 'admin.ai' },
    icon: 'lucide-wand-sparkles',
    title: 'AI tools',
    caption: 'Music generation, stem splitting and credit prices',
    permission: 'manage-configuration',
  },
  {
    to: { name: 'admin.sounds' },
    icon: 'lucide-music',
    title: 'Sounds',
    caption: 'Shared sound library and Freesound',
    permission: 'manage-configuration',
  },
];

export type AccountLink = {
  to: { name: string };
  icon: string;
  title: string;
  caption: string;
};

/** The account settings pages, in the order the settings menu lists them. */
export const accountSettingsLinks: AccountLink[] = [
  {
    to: { name: 'account.settings' },
    icon: 'lucide-circle-user',
    title: 'Account',
    caption: 'Your profile, how people reach you and where you are.',
  },
  {
    to: { name: 'account.security' },
    icon: 'lucide-shield',
    title: 'Security',
    caption: 'How you sign in and what keeps your account safe.',
  },
  {
    to: { name: 'account.music' },
    icon: 'lucide-music',
    title: 'Your music',
    caption: 'How you use Toneflix Music and the sounds you like.',
  },
  {
    to: { name: 'account.invites' },
    icon: 'lucide-user-plus',
    title: 'Invites',
    caption: 'Your invite link and the people who joined with it.',
  },
  {
    to: { name: 'account.notifications' },
    icon: 'lucide-bell',
    title: 'Notifications',
    caption: 'What reaches you by email and push. Everything still shows up in your notifications list.',
  },
];

/** Pages outside settings that people look for from there. */
export const accountElsewhereLinks: AccountLink[] = [
  {
    to: { name: 'studio.earnings' },
    icon: 'lucide-circle-dollar-sign',
    title: 'Earnings and payouts',
    caption: 'Your payout account and withdrawals',
  },
  {
    to: { name: 'premium' },
    icon: 'lucide-crown',
    title: 'Premium',
    caption: 'Your plan and what it includes',
  },
  {
    to: { name: 'library.purchases' },
    icon: 'lucide-receipt',
    title: 'Purchases',
    caption: 'Releases, stems and tips you paid for',
  },
];

/** The admin pages someone with these permissions can open. */
export const allowedAdminLinks = (permissions: PriviPerm[] = []) =>
  adminNavigationLinks.filter((link) =>
    (Array.isArray(link.permission) ? link.permission : [link.permission]).some((permission) => permissions.includes(permission)),
  );

export const trackErrorStep = (errors: GenericData): 'basic' | 'meta' | 'tracks' | 'publish' => {
  const map: GenericData & { [string: string]: 'basic' | 'meta' | 'tracks' | 'publish' } = {
    'release.slug': 'basic',
    'release.title': 'basic',
    'release.image': 'basic',
    'release.privacy': 'basic',
    'release.genre_id': 'basic',
    'release.artist_id': 'basic',
    'release.description': 'basic',
    'release.isrc': 'meta',
    'release.iswc': 'meta',
    'release.record_label': 'meta',
    'release.draft': 'meta',
    'release.explicit': 'meta',
    'release.composer': 'meta',
    'release.publisher': 'meta',
    'release.contains_music': 'meta',
    'release.release_date': 'meta',
    'slug': 'tracks'
  }

  const key = Object.keys(errors).find((e) => map[e]) as string;

  return map[key] || 'basic';
}

/**
 * The release form step that holds a field the API rejected.
 */
export const releaseErrorStep = (errors: GenericData): 'basic' | 'meta' | 'tracks' | 'publish' => {
  const meta = ['isrc', 'iswc', 'pline', 'composer', 'publisher', 'record_label', 'release_date', 'contains_music', 'explicit', 'price'];
  const keys = Object.keys(errors);

  if (keys.some((key) => key.startsWith('tracks'))) return 'tracks';
  if (keys.some((key) => meta.includes(key))) return 'meta';
  if (keys.some((key) => key === 'retire' || key.startsWith('retire.'))) return 'publish';

  return 'basic';
};

/**
 * The library's sections, as chips for phones. `active` names the one open.
 */
export const libraryChipLinks = (active?: string) => [
  ...(['liked', 'saved', 'playlists', 'recent', 'collabs'] as const).map((key) => ({
    label: { liked: 'Liked', saved: 'Saved', playlists: 'Playlists', recent: 'Recent', collabs: 'Collabs' }[key],
    icon: {
      liked: 'lucide-heart',
      saved: 'lucide-bookmark',
      playlists: 'lucide-list-music',
      recent: 'lucide-music',
      collabs: 'lucide-users',
    }[key],
    to: key === 'playlists' ? { name: 'library.playlists' } : { name: 'library.page', params: { type: key } },
    active: active === key,
  })),
  { label: 'Purchases', icon: 'lucide-receipt', to: { name: 'library.purchases' } },
];

export const categoryChecker = (categories: Categories) => {
  return Object.entries(categories)
    .flatMap((e) => e[1])
    .every((e) => {
      return !e.data || !e.data.list || e.data.list.length < 1;
    })
}

/**
 * Where the owner releases a project, or continues its unpublished release.
 */
export const projectReleaseLink = (project: Project): RouteLocationRaw => ({
  name: 'studio.release.create',
  params: project.draftReleaseId ? { release_id: project.draftReleaseId } : {},
  query: { project_id: project.id },
});

/**
 * The label for the owner's release action on a project.
 */
export const projectReleaseLabel = (project: Project): string => {
  if (project.draftReleaseId) return 'Continue Release';

  return project.released ? 'Release New Version' : 'Release Project';
};

/**
 * Why a project can't be released yet, or null when it can.
 */
export const projectReleaseBlocker = (project: Project): string | null => {
  if (!project.tracksCount) return 'Add a track to this project before releasing it.';
  if (!project.ready) return 'Add a stem with audio to a track before releasing it.';

  return null;
};
