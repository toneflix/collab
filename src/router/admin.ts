import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/admin',
    meta: { requireAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        meta: { adminMenu: true },
        component: () => import('layouts/AdminLayout.vue'),
        children: [
          {
            path: '',
            name: 'admin',
            component: () => import('pages/Admin/AdminHomePage.vue'),
          },
          {
            path: 'users',
            name: 'admin.users',
            component: () => import('pages/Admin/UsersPage.vue'),
          },
          {
            path: 'users/:id(\\d+)',
            name: 'admin.user',
            component: () => import('pages/Admin/UserPage.vue'),
          },
          {
            path: 'configuration',
            name: 'admin.configuration',
            component: () => import('pages/Admin/ConfigurationPage.vue'),
          },
          {
            path: 'auth-pages',
            name: 'admin.auth-pages',
            component: () => import('pages/Admin/AuthPagesPage.vue'),
          },
          {
            path: 'plans',
            name: 'admin.plans',
            component: () => import('pages/Admin/PlansPage.vue'),
          },
          {
            path: 'realtime',
            name: 'admin.realtime',
            component: () => import('pages/Admin/RealtimePage.vue'),
          },
          {
            path: 'payouts',
            name: 'admin.payouts',
            component: () => import('pages/Admin/PayoutsPage.vue'),
          },
          {
            path: 'moderation',
            name: 'admin.moderation',
            component: () => import('pages/Admin/ModerationPage.vue'),
          },
          {
            path: 'content',
            name: 'admin.content',
            component: () => import('pages/Admin/ContentPage.vue'),
          },
          {
            path: 'genres',
            name: 'admin.genres',
            component: () => import('pages/Admin/GenresPage.vue'),
          },
          {
            path: 'ai',
            name: 'admin.ai',
            component: () => import('pages/Admin/AiPage.vue'),
          },
          {
            path: 'assistant/:chat(\\d+)?',
            name: 'admin.assistant',
            meta: { keepOnParamChange: true },
            component: () => import('pages/Admin/AssistantPage.vue'),
          },
          {
            path: 'agent',
            name: 'admin.agent',
            component: () => import('pages/Admin/AgentPage.vue'),
          },
          {
            path: 'sounds',
            name: 'admin.sounds',
            component: () => import('pages/Admin/SoundsPage.vue'),
          },
        ],
      },
    ],
  },
];
