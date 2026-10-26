import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/',
    meta: { requireAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('pages/NotificationsPage.vue'),
      },
      {
        path: 'account/notifications',
        name: 'account.notifications',
        component: () => import('pages/Account/NotificationSettingsPage.vue'),
      },
      {
        path: 'account/settings',
        name: 'account.settings',
        component: () => import('pages/Account/SettingsPage.vue'),
      },
    ],
  },
];
