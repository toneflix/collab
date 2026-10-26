import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { requestPinia } from 'src/utils/request-context';
import type { Configuration, User } from './models';

export type AuthPageKey = 'banner' | 'login' | 'register' | 'forgot' | 'reset' | 'verify' | 'interests';

/** Layout, banner and text of the auth pages, from the API's /initialize. */
export type AuthPagesConfig = {
  layout: string;
  split: { form: number; banner: number };
  banner: string | null;
  texts: Partial<Record<AuthPageKey, Record<string, string>>>;
};

export type VerificationType = 'email' | 'phone';

/**
 * Reads one text from the admin-editable auth page copy, filling in `:name` values.
 */
export const authText = (
  page: AuthPageKey,
  key: string,
  values: Record<string, string | number> = {},
) => {
  const boot = useBootstrapStore(requestPinia());
  const text = boot.auth.texts?.[page]?.[key] ?? '';

  return Object.entries(values).reduce(
    (out, [name, value]) => out.replaceAll(`:${name}`, String(value)),
    text,
  );
};

/**
 * The first contact detail the app still wants this user to confirm.
 */
export const pendingVerification = (
  user: Partial<User>,
  config: Partial<Configuration>,
): VerificationType | null => {
  if (!user?.id) {
    return null;
  }

  if (config.verify_email && user.email && !user.emailVerifiedAt) {
    return 'email';
  }

  if (config.verify_phone && user.phone && !user.phoneVerifiedAt) {
    return 'phone';
  }

  return null;
};
