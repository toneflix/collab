import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/projects',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'projects',
        component: () => import('pages/ProjectsPage.vue')
      },
      {
        path: '/songs',
        name: 'songs',
        component: () => import('pages/SongsPage.vue')
      },
      {
        path: '/tracks',
        redirect: { name: 'songs' }
      },
      {
        path: '/albums',
        name: 'albums',
        component: () => import('pages/AlbumsPage.vue')
      },
      {
        path: ':project_id',
        name: 'project',
        component: () => import('pages/ProjectPage.vue')
      },
    ],
  },
];
