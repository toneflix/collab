import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/admin',
    meta: { requireAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'plans',
        name: 'admin.plans',
        component: () => import('pages/Admin/PlansPage.vue')
      },
      {
        path: 'realtime',
        name: 'admin.realtime',
        component: () => import('pages/Admin/RealtimePage.vue')
      },
    ],
  },
];
