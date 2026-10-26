import { Configuration, Initialize, PriviPerm, ResponseBody, User } from './models';
import { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router';
import { alova, invalidateCache } from 'src/boot/alova';

import { AuthSession } from 'src/utils/auth-session';
import { pendingVerification } from 'src/utils/auth-pages';
import { homeFor } from 'src/utils/auth-redirect';
import { requestPinia } from 'src/utils/request-context';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

export const refreshUser = (router?: Router) => {
  return new Promise<User>((resolve) => {
    const boot = useBootstrapStore(requestPinia());
    if (!boot.token) {
      return resolve({} as User);
    }

    alova
      .Get<ResponseBody<User>>('account', {
        params: { with: 'permissions,earnings' },
      })
      .send()
      .then(({ data }) => {
        if (data) {
          boot.setUser(data);
          resolve(data);
        } else {
          resolve(boot.user);
        }
      })
      .catch(({ error }: { error: ResponseBody<string[]> }) => {
        if (error?.status_code === 401 && error?.status === 'error') {
          boot.saveAuthUser({} as User, null);
          if (router && router.replace) {
            return router.replace({ name: 'auth.login' });
          }
        }
        resolve({} as User);
      });
  });
};

export const reboot = (done?: () => void, router?: Router, reloadUser: boolean | number = false) => {
  void invalidateCache();

  return new Promise<{
    init: { configuration: Configuration },
    user: User,
    error?: Record<string, string>
  }>((resolve) => {
    const boot = useBootstrapStore(requestPinia());
    const alova_ = alova.Get<ResponseBody<Initialize>>('initialize');
    alova_.meta = { noContentType: true };

    alova_
      .send()
      .then(async ({ data }) => {
        typeof done === 'function' && done();
        boot.setReady();
        if (data) {
          boot.setConfig(data);

          let user = boot.user;

          if (reloadUser || (!boot.user.id && reloadUser !== 0)) {
            user = await refreshUser(router);
          }

          resolve({ init: data, user });
        } else {
          resolve({ init: { configuration: boot.configuration }, user: boot.user });
        }
      })
      .catch((error) => {
        resolve({ init: { configuration: boot.configuration }, user: boot.user, error });
      });
  });
};

/**
 * Where a navigation should go instead, or true to let it through.
 */
export const authValidator = (
  to: RouteLocationNormalized,
  from?: RouteLocationNormalized,
): RouteLocationRaw | true => {
  const boot = useBootstrapStore(requestPinia());
  const token = AuthSession.current().token;
  const user = boot.user;

  boot.token = token;

  if (!token) {
    if (to.name === 'auth.logout') {
      return { name: 'auth.login' };
    }

    if (to.meta.requireAuth || to.meta.requireAdmin) {
      return { name: 'auth.login', query: { redirect: to.fullPath } };
    }

    return true;
  }

  if (to.meta.requireGuest) {
    if (to.name == 'auth.register' && from?.query.reference) {
      return true;
    }

    if (user.roles?.length || user.permissions?.length) {
      return { name: 'admin.dashboard' };
    }

    return homeFor(user);
  }

  const pending = pendingVerification(user, boot.configuration);

  if (pending && to.meta.requireAuth && !to.meta.allowUnverified) {
    return { name: 'auth.verify', params: { type: pending }, query: { redirect: to.fullPath } };
  }

  return true;
};

/**
 * Signs out here and on the API.
 */
export const signOut = async () => {
  const boot = useBootstrapStore(requestPinia());

  if (AuthSession.current().token) {
    if (import.meta.env.QUASAR_CAPACITOR_MODE) {
      const { NativePush } = await import('src/utils/native-push');

      await NativePush.forget();
    }

    const request = alova.Post('account/logout');

    request.meta = { ignoreUnauthorized: true };

    await request
      .send()
      .catch(() => undefined);
  }

  AuthSession.current().clear();
  await boot.clearAuth();
};

/**
 * Check if a user can do something in an organization
 */
export const iCan = (ability: PriviPerm) => {
  const user = useBootstrapStore(requestPinia()).user

  if (!user.permissions || user.permissions.length < 1) {
    return false;
  }

  if (!ability) {
    return true;
  }

  return user.permissions.includes(ability) ?? false;
};
