import { signOut } from 'src/utils/proccessor';
import { stemAudio } from 'src/utils/studio/stem-audio';
import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/',
    component: () => import('layouts/PlainLayout.vue'),
    meta: {
      hideHeader: true,
      requireGuest: true,
    },
    children: [
      {
        path: '/register',
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
      {
        path: '/reset/password',
        name: 'reset.password',
        component: () => import('pages/Auth/PasswordResetPage.vue')
      },
      {
        meta: { requireGuest: false, requireAuth: true, allowUnverified: true },
        path: '/account/verify/:type(email|phone)',
        name: 'auth.verify',
        component: () => import('pages/Auth/VerifyPage.vue')
      },
      {
        meta: { requireGuest: false, requireAuth: true, allowUnverified: true },
        path: '/account/logout',
        component: () => import('src/pages/Auth/LoginPage.vue'),
        name: 'auth.logout',
        beforeEnter: async () => {
          await signOut();
          // Studio audio kept on this device belongs to the account signing out.
          await stemAudio.clear();
          return { name: 'auth.login' };
        },
      },
    ],
  },
];
