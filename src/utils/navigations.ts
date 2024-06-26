import { GenericData, NavigationLink } from './models';

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
    to: '/3',
    icon: 'eva-heart',
    title: 'Loved',
  },
  {
    to: '/4',
    icon: 'eva-people',
    title: 'Collabs',
  },
  {
    to: '/5',
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
    group: 'recent-projects',
    button: {
      icon: 'eva-plus',
      action: '',
    }
  },
]

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
