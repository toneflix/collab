/**
 * The app's settings from .env. Only variables that start with VITE_ reach the app.
 * Each one is read as import.meta.env.KEY so the SSR webserver build can inline it too.
 *
 * The API's address comes from VITE_API_ENVIRONMENT:
 *   development -> VITE_DEV_API_BASE_URL
 *   staging     -> VITE_STAGING_API_BASE_URL
 *   production  -> VITE_PROD_API_BASE_URL
 * and falls back to VITE_API_BASE_URL when that one is empty.
 * Base URLs are the API's root (e.g. https://api.example.com); the app adds /api/ itself.
 */
export type AppEnvironment = 'development' | 'staging' | 'production';

const trimSlash = (url?: string) => (url || '').trim().replace(/\/+$/, '');

const pick = (value: string | undefined, fallback: AppEnvironment): AppEnvironment =>
  value === 'development' || value === 'staging' || value === 'production' ? value : fallback;

/**
 * Where the app runs. Defaults to production in a production build.
 */
export const appEnvironment = pick(import.meta.env.VITE_APP_ENVIRONMENT, import.meta.env.PROD ? 'production' : 'development');

/**
 * Which API the app talks to. Defaults to the app's own environment.
 */
export const apiEnvironment = pick(import.meta.env.VITE_API_ENVIRONMENT, appEnvironment);

const baseUrls: Record<AppEnvironment, string | undefined> = {
  development: import.meta.env.VITE_DEV_API_BASE_URL,
  staging: import.meta.env.VITE_STAGING_API_BASE_URL,
  production: import.meta.env.VITE_PROD_API_BASE_URL,
};

/**
 * The API's root URL, without a trailing slash or /api.
 */
export const baseUrl = trimSlash(baseUrls[apiEnvironment] || import.meta.env.VITE_API_BASE_URL);

/**
 * Where API requests go.
 */
export const apiUrl = `${baseUrl}/api/`;

/**
 * The public address of this app, without a trailing slash.
 */
export const frontUrl = trimSlash(import.meta.env.VITE_FRONT_URL) || (typeof window !== 'undefined' ? window.location.origin : '');

export const debug = ['true', '1', 'yes'].includes(String(import.meta.env.VITE_DEBUG || '').toLowerCase());

export const logLevel = import.meta.env.VITE_LOG_LEVEL || 'error';
