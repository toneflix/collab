import { RouteLocationRaw } from 'vue-router';
import { Categories, GenericData, NavigationLink, PriviPerm, Project } from './models';

export const mainNavigationLinks: NavigationLink[] = [
  {
    to: '/home',
    icon: 'eva-home',
    title: 'Home',
  },
  {
    to: { name: 'genres' },
    icon: 'eva-grid',
    title: 'Genres',
  },
  {
    to: { name: 'artists' },
    icon: 'eva-person',
    title: 'Artists',
  },
  {
    to: { name: 'creators' },
    icon: 'eva-droplet',
    title: 'Creators',
  },
  {
    to: { name: 'albums' },
    icon: 'eva-layers',
    title: 'Albums',
  },
  {
    to: { name: 'projects' },
    icon: 'eva-speaker',
    title: 'Projects',
  },
  {
    to: { name: 'studio.composer' },
    icon: 'eva-edit-2',
    title: 'Composer',
    requiresAuth: true,
  },
  {
    to: '',
    icon: '',
    title: 's1',
    separator: true,
  },
  {
    to: { name: 'messages' },
    icon: 'eva-message-circle',
    title: 'Messages',
    badge: 'messages',
    requiresAuth: true,
  },
  {
    to: { name: 'library.page', params: { type: 'liked' } },
    icon: 'eva-heart',
    title: 'liked',
  },
  {
    to: { name: 'library.page', params: { type: 'collabs' } },
    icon: 'eva-people',
    title: 'Collabs',
  },
  {
    to: { name: 'library.page', params: { type: 'recent' } },
    icon: 'eva-music',
    title: 'Recent',
  },
  {
    to: '',
    icon: '',
    title: 's1',
    separator: true,
  },
  {
    icon: '',
    title: 'My Projects',
    group: 'creator/projects',
    params: { filters: 'latest', limit: 3 },
    button: {
      icon: 'eva-plus',
      action: {
        name: 'studio.projects.create',
      },
    },
    requiresAuth: true
  },
]

export type AdminLink = {
  to: RouteLocationRaw;
  icon: string;
  title: string;
  caption: string;
  permission: PriviPerm;
};

/** Every admin page, with the permission it needs. */
export const adminNavigationLinks: AdminLink[] = [
  {
    to: { name: 'admin.users' },
    icon: 'fas fa-users',
    title: 'Users',
    caption: 'Accounts, their plans, balances and AI credits',
    permission: 'manage-users',
  },
  {
    to: { name: 'admin.configuration' },
    icon: 'fas fa-sliders',
    title: 'Configuration',
    caption: 'Currency, creator share and withdrawal limits',
    permission: 'manage-configuration',
  },
  {
    to: { name: 'admin.plans' },
    icon: 'fas fa-layer-group',
    title: 'Plans',
    caption: 'Prices, features and billing options',
    permission: 'manage-plans',
  },
  {
    to: { name: 'admin.payouts' },
    icon: 'fas fa-money-bill-transfer',
    title: 'Payouts',
    caption: 'Withdrawal requests and payout providers',
    permission: 'manage-payouts',
  },
  {
    to: { name: 'admin.moderation' },
    icon: 'fas fa-shield-halved',
    title: 'Moderation',
    caption: 'Reports, copied audio, takedowns and appeals',
    permission: 'manage-content',
  },
  {
    to: { name: 'admin.realtime' },
    icon: 'fas fa-tower-broadcast',
    title: 'Realtime',
    caption: 'Live updates driver and its keys',
    permission: 'manage-configuration',
  },
  {
    to: { name: 'admin.ai' },
    icon: 'fas fa-wand-magic-sparkles',
    title: 'AI tools',
    caption: 'Music generation, stem splitting and credit prices',
    permission: 'manage-configuration',
  },
  {
    to: { name: 'admin.sounds' },
    icon: 'fas fa-music',
    title: 'Sounds',
    caption: 'Shared sound library and Freesound',
    permission: 'manage-configuration',
  },
];

/** The admin pages someone with these permissions can open. */
export const allowedAdminLinks = (permissions: PriviPerm[] = []) =>
  adminNavigationLinks.filter((link) => permissions.includes(link.permission));

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
