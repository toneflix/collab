import { RouteRecordRaw } from 'vue-router';

export default <RouteRecordRaw[]>[
  {
    path: '/studio',
    meta: { requireAuth: true },
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'studio.home',
        component: () => import('pages/Studio/StudioHomePage.vue')
      },
      {
        path: 'releases',
        name: 'studio.releases',
        component: () => import('pages/Studio/ReleasesPage.vue')
      },
      {
        path: 'collabers',
        name: 'studio.collabers',
        component: () => import('pages/Studio/CollabersPage.vue')
      },
      {
        path: 'release/create/:release_id?',
        name: 'studio.release.create',
        component: () => import('pages/Studio/CreateReleasePage.vue')
      },
      {
        path: 'projects',
        name: 'studio.projects',
        component: () => import('pages/Studio/ProjectListPage.vue')
      },
      {
        path: 'projects/create/:project_id?',
        name: 'studio.projects.create',
        component: () => import('pages/Studio/CreateProjectPage.vue')
      },
      {
        path: 'projects/:project_id',
        name: 'studio.project',
        component: () => import('pages/Studio/ProjectPage.vue')
      },
      {
        path: 'projects/:project_id/track/:track_id',
        name: 'studio.project.track',
        meta: { hidePlayer: true },
        component: () => import('pages/Studio/ProjectTrackPage.vue')
      },
    ],
  },
];
