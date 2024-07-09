import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/artists',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'artists',
        component: () => import('pages/ArtistsPage.vue')
      },
      {
        path: '/creators',
        name: 'creators',
        component: () => import('pages/CreatorsPage.vue')
      },
    ]
  },
  {
    path: '/artist/:artist_id',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'artist',
        component: () => import('pages/ArtistPage.vue')
      },
      {
        path: '/creator/:creator_id',
        name: 'creator',
        component: () => import('pages/CreatorPage.vue')
      },
      {
        path: ':track_id',
        name: 'artist.track',
        component: () => import('pages/TrackPage.vue')
      },
      {
        path: 'album/:album_id',
        name: 'artist.album',
        component: () => import('pages/AlbumPage.vue')
      },
    ],
  },
];
