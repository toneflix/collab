import type { Pinia } from 'pinia';
import type { QSsrContext } from '@quasar/app-vite';

/**
 * What one server render knows about its own request. The SSR render middleware
 * opens it with AsyncLocalStorage, so code that runs for a render (boot files,
 * guards, API calls) reaches its own request even while other renders run beside it.
 */
export interface RequestContext {
  req: QSsrContext['req'];
  res: QSsrContext['res'];
  pinia?: Pinia;
}

interface RequestContextStorage {
  getStore(): RequestContext | undefined;
}

const key = '__collabRequestContext';

/**
 * The current render's request, or undefined in the browser.
 */
export const requestContext = (): RequestContext | undefined => {
  if (!import.meta.env.SSR) {
    return undefined;
  }

  const storage = (globalThis as Record<string, unknown>)[key] as RequestContextStorage | undefined;

  return storage?.getStore();
};

/**
 * The Pinia instance of the current render, so stores used outside components
 * don't pick up another request's state.
 */
export const requestPinia = (): Pinia | undefined => requestContext()?.pinia;

export const requestContextKey = key;
