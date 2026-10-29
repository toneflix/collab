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
        path: 'account',
        component: () => import('layouts/AccountLayout.vue'),
        children: [
          {
            path: '',
            redirect: { name: 'account.settings' },
          },
          {
            path: 'settings',
            name: 'account.settings',
            component: () => import('pages/Account/AccountPage.vue'),
          },
          {
            path: 'security',
            name: 'account.security',
            component: () => import('pages/Account/SecurityPage.vue'),
          },
          {
            path: 'music',
            name: 'account.music',
            component: () => import('pages/Account/MusicPage.vue'),
          },
          {
            path: 'notifications',
            name: 'account.notifications',
            component: () => import('pages/Account/NotificationSettingsPage.vue'),
          },
        ],
      },
    ],
  },
];
