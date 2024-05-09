import { CollabEvents } from 'src/utils/models';
import { EventBus } from 'quasar';
import { boot } from 'quasar/wrappers'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async ({ app }) => {
  const bus = new EventBus<CollabEvents>();

  app.provide('bus', bus)
})
