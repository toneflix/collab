import { NavigationLink } from './models';

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
