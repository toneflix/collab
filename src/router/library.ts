import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/library',
    meta: { requireAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'purchases',
        name: 'library.purchases',
        component: () => import('pages/Account/PurchasesPage.vue')
      },
      {
        path: ':type',
        name: 'library.page',
        component: () => import('pages/LibraryPage.vue')
      },
    ],
  },
];
