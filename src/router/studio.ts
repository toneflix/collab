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
        component: () => import('pages/Studio/StudioHomePage.vue'),
      },
      {
        path: 'releases',
        name: 'studio.releases',
        component: () => import('pages/Studio/ReleasesPage.vue'),
      },
      {
        path: 'earnings',
        name: 'studio.earnings',
        component: () => import('pages/Studio/EarningsPage.vue'),
      },
      {
        path: 'agent',
        name: 'studio.agent',
        component: () => import('pages/Studio/AgentPage.vue'),
      },
      {
        path: 'credits',
        name: 'studio.credits',
        component: () => import('pages/Studio/CreditsPage.vue'),
      },
      {
        path: 'takedowns',
        name: 'studio.takedowns',
        component: () => import('pages/Studio/TakedownsPage.vue'),
      },
      {
        path: 'collabers',
        name: 'studio.collabers',
        component: () => import('pages/Studio/CollabersPage.vue'),
      },
      {
        path: 'release/create/:release_id?',
        name: 'studio.release.create',
        component: () => import('pages/Studio/CreateReleasePage.vue'),
      },
      {
        path: 'projects',
        name: 'studio.projects',
        component: () => import('pages/Studio/ProjectListPage.vue'),
      },
      {
        path: 'composer',
        name: 'studio.composer',
        component: () => import('pages/Studio/ComposerPage.vue'),
      },
      {
        path: 'composer/:song_id',
        name: 'studio.composer.song',
        // The editor takes the screen: no player bar, and no tabs on phones
        meta: { hidePlayer: true, hideTabs: true },
        component: () => import('pages/Studio/SongEditorPage.vue'),
      },
      {
        path: 'projects/create/:project_id?',
        name: 'studio.projects.create',
        component: () => import('pages/Studio/CreateProjectPage.vue'),
      },
      {
        path: 'projects/:project_id',
        name: 'studio.project',
        component: () => import('pages/Studio/ProjectPage.vue'),
      },
      {
        path: 'projects/:project_id/track/:track_id',
        name: 'studio.project.track',
        // The DAW takes the screen: no player bar, and no tabs on phones
        meta: { hidePlayer: true, collapseSidebar: true, hideTabs: true },
        component: () => import('pages/Studio/ProjectTrackPage.vue'),
      },
    ],
  },
];
