import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/register',
    component: () => import('layouts/PlainLayout.vue'),
    meta: {
      hideHeader: true
    },
    children: [
      {
        path: '',
        name: 'auth.register',
        component: () => import('pages/Auth/RegisterPage.vue')
      },
      {
        path: '/login',
        name: 'auth.login',
        component: () => import('pages/Auth/LoginPage.vue')
      },
      {
        path: '/forgot/password',
        name: 'auth.forgot',
        component: () => import('pages/Auth/ForgotPage.vue')
      },
    ],
  },
];
