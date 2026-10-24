import { Router } from 'vue-router';
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { defineStore } from '#q-app';

/*
 * When adding new properties to stores, you should also
 * extend the `PiniaCustomProperties` interface.
 * @see https://pinia.vuejs.org/core-concepts/plugins.html#typing-new-store-properties
 */
declare module 'pinia' {
  export interface PiniaCustomProperties {
    readonly router: Router;
  }
}

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Store instance.
 */

export default defineStore((/* { ssrContext } */) => {
  const pinia = createPinia()

  // Persisted state lives in the browser's storage, so the server renders with the defaults
  if (import.meta.env.QUASAR_CLIENT) {
    pinia.use(piniaPluginPersistedstate)
  }

  // You can add Pinia plugins here
  // pinia.use(SomePiniaPlugin)

  return pinia
})
