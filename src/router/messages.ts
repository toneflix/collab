import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/messages',
    meta: { requireAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: ':type?/:id?',
        name: 'messages',
        component: () => import('pages/MessagesPage.vue'),
      },
    ],
  },
];
