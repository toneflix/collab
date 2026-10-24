import { RouteLocationRaw } from 'vue-router';
import { Categories, GenericData, NavigationLink, PriviPerm } from './models';

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

export const categoryChecker = (categories: Categories) => {
  return Object.entries(categories)
    .flatMap((e) => e[1])
    .every((e) => {
      return !e.data || !e.data.list || e.data.list.length < 1;
    })
}
