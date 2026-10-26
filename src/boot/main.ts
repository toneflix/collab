import { CollabEvents } from 'src/utils/models';
import { EventBus } from 'quasar';
import { authValidator, refreshUser } from 'src/utils/proccessor';
import { AuthSession } from 'src/utils/auth-session';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { defineBoot } from '#q-app';
import { requestContext } from 'src/utils/request-context';

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default defineBoot(({ app, router, store }) => {
  const bus = new EventBus<CollabEvents>();

  app.provide('bus', bus)

  // On the server, code outside components finds this render's store through the request
  const context = requestContext();

  if (context) {
    context.pinia = store;
  }

  router.beforeEach((to, from) => authValidator(to, from))

  if (!import.meta.env.SSR) {
    const session = AuthSession.current();
    const boot = useBootstrapStore(store);

    session.refresh();

    // The server may have rendered with an older cookie copy, so load the account it missed
    if (session.token && !boot.user.id) {
      void router.isReady().then(() => refreshUser());
    }
  }
})
