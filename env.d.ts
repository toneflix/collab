/**
 * Types for the custom variables in the .env file.
 * Only variables that start with "v_" are exposed to the app.
 *
 * https://quasar.dev/quasar-cli-vite/handling-import-meta-env#type-inference
 */
interface ImportMetaEnv {
  readonly v_ENVIRONMENT?: 'development' | 'production';
  readonly v_baseURL?: string;
  readonly v_rootURL?: string;
  readonly v_frontURL?: string;
  readonly v_DEBUG?: string;
  readonly v_LOG_LEVEL?: string;
  readonly v_PREFER_ASSET?: string;
  readonly v_ASSET_URL?: string;
  readonly [key: `v_${string}`]: string | undefined;
}
