import { CollabEvents } from 'src/utils/models';
import { EventBus } from 'quasar';
import { authValidator } from 'src/utils/proccessor';
import { defineBoot } from '#q-app';

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default defineBoot(async ({ app, router, ssrContext }) => {
  const bus = new EventBus<CollabEvents>();

  app.provide('bus', bus)

  router.beforeResolve((to, from) => {
    authValidator({ to, from }, router, undefined, ssrContext)
  })
})
