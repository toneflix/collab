import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/compositions',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'compositions',
        component: () => import('pages/CompositionsPage.vue'),
      },
      {
        path: ':slug',
        name: 'composition',
        component: () => import('pages/CompositionPage.vue'),
      },
    ],
  },
  {
    path: '/songs/:slug?',
    redirect: (to) => ({
      path: to.params.slug ? `/compositions/${String(to.params.slug)}` : '/compositions',
      query: to.query,
    }),
  },
];
