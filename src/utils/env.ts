/**
 * The app's settings from .env. Only variables that start with VITE_ reach the app.
 *
 * The API's address comes from VITE_API_ENVIRONMENT:
 *   development -> VITE_DEV_BASE_URL
 *   staging     -> VITE_STAGING_BASE_URL
 *   production  -> VITE_PROD_BASE_URL
 * and falls back to VITE_BASE_URL when that one is empty.
 * Base URLs are the API's root (e.g. https://api.example.com); the app adds /api/ itself.
 */
export type AppEnvironment = 'development' | 'staging' | 'production';

const vars = import.meta.env;

const trimSlash = (url?: string) => (url || '').trim().replace(/\/+$/, '');

const pick = (value: string | undefined, fallback: AppEnvironment): AppEnvironment =>
  value === 'development' || value === 'staging' || value === 'production' ? value : fallback;

/**
 * Where the app runs. Defaults to production in a production build.
 */
export const appEnvironment = pick(vars.VITE_APP_ENVIRONMENT, vars.PROD ? 'production' : 'development');

/**
 * Which API the app talks to. Defaults to the app's own environment.
 */
export const apiEnvironment = pick(vars.VITE_API_ENVIRONMENT, appEnvironment);

const baseUrls: Record<AppEnvironment, string | undefined> = {
  development: vars.VITE_DEV_BASE_URL,
  staging: vars.VITE_STAGING_BASE_URL,
  production: vars.VITE_PROD_BASE_URL,
};

/**
 * The API's root URL, without a trailing slash or /api.
 */
export const baseUrl = trimSlash(baseUrls[apiEnvironment] || vars.VITE_BASE_URL);

/**
 * Where API requests go.
 */
export const apiUrl = `${baseUrl}/api/`;

/**
 * The public address of this app, without a trailing slash.
 */
export const frontUrl = trimSlash(vars.VITE_FRONT_URL) || (typeof window !== 'undefined' ? window.location.origin : '');

export const debug = ['true', '1', 'yes'].includes(String(vars.VITE_DEBUG || '').toLowerCase());

export const logLevel = vars.VITE_LOG_LEVEL || 'error';
