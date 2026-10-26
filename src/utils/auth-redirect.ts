import type { RouteLocationRaw } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { pendingVerification } from 'src/utils/auth-pages';
import { requestPinia } from 'src/utils/request-context';
import type { User } from './models';

/**
 * A redirect query value that points inside the app, or undefined.
 */
export const safeRedirect = (redirect: unknown) =>
  typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : undefined;

/**
 * Where to go once someone signs in or signs up: a pending verification first,
 * then the page that asked for a sign-in, then the studio.
 */
export const afterSignIn = (user: User, redirect?: unknown): RouteLocationRaw => {
  const boot = useBootstrapStore(requestPinia());
  const target = safeRedirect(redirect);
  const pending = pendingVerification(user, boot.configuration);

  if (pending) {
    return { name: 'auth.verify', params: { type: pending }, query: target ? { redirect: target } : {} };
  }

  return target ?? { name: 'studio.home' };
};
