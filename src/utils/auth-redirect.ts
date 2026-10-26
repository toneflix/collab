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
 * The page a user lands on by default: the studio for creators, the home page for listeners.
 */
export const homeFor = (user: Partial<User>): RouteLocationRaw =>
  user.accountType === 'listener' ? { name: 'index' } : { name: 'studio.home' };

/**
 * Where to go once someone signs in or signs up: a pending verification first,
 * then picking interests if they never have, then the page that asked for a
 * sign-in, then their default page.
 */
export const afterSignIn = (user: User, redirect?: unknown): RouteLocationRaw => {
  const boot = useBootstrapStore(requestPinia());
  const target = safeRedirect(redirect);
  const query = target ? { redirect: target } : {};
  const pending = pendingVerification(user, boot.configuration);

  if (pending) {
    return { name: 'auth.verify', params: { type: pending }, query };
  }

  if (!user.interestsAt) {
    return { name: 'auth.interests', query };
  }

  return target ?? homeFor(user);
};
