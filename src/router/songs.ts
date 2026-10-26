import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/songs',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'songs',
        component: () => import('pages/SongsPage.vue'),
      },
      {
        path: ':slug',
        name: 'song',
        component: () => import('pages/SongPage.vue'),
      },
    ],
  },
];
