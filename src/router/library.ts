import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/library',
    meta: { requireAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: ':type',
        name: 'library.page',
        component: () => import('pages/LibraryPage.vue')
      },
    ],
  },
];
