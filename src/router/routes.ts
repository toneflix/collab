import { RouteRecordRaw } from 'vue-router';
import admin from './admin';
import artistsCreators from './artists-creators';
import authentication from './authentication';
import library from './library';
import messages from './messages';
import notifications from './notifications';
import projects from './projects';
import studio from './studio';

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
        component: () => import('pages/GenresPage.vue')
      },
      {
        path: '/explore',
        name: 'explore',
        component: () => import('pages/ExplorePage.vue')
      },
      {
        path: '/search',
        name: 'search',
        component: () => import('pages/SearchPage.vue')
      },
      {
        path: '/premium',
        name: 'premium',
        component: () => import('pages/PremiumPage.vue')
      },
      {
        path: '/freesound/callback',
        name: 'freesound.callback',
        meta: { requireAuth: true },
        component: () => import('pages/FreesoundCallbackPage.vue')
      },
    ],
  },
  ...authentication,
  ...projects,
  ...artistsCreators,
  ...library,
  ...messages,
  ...notifications,
  ...studio,
  ...admin,

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
