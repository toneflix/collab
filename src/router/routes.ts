import { RouteRecordRaw } from 'vue-router';
import artist from './artist';
import projects from './projects';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '/',
        name: 'index',
        component: () => import('pages/IndexPage.vue')
      },
      {
        path: '/home',
        name: 'home',
        component: () => import('pages/HomePage.vue')
      },
      {
        path: 'genres',
        name: 'genres',
        component: () => import('pages/GenrePage.vue')
      },
    ],
  },
  ...projects,
  ...artist,

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
