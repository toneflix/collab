/**
 * Types for the custom variables in the .env file.
 * Only variables that start with "VITE_" are exposed to the app.
 *
 * https://quasar.dev/quasar-cli-vite/handling-import-meta-env#type-inference
 */
interface ImportMetaEnv {
  readonly VITE_FRONT_URL?: string;
  readonly VITE_DOCS_URL?: string;
  /** SHA-256 fingerprints of the Android signing keys, comma-separated, for App Links */
  readonly VITE_ANDROID_CERT_FINGERPRINTS?: string;
  /** Apple team id, for Universal Links */
  readonly VITE_IOS_TEAM_ID?: string;
  readonly VITE_DEV_API_BASE_URL?: string;
  readonly VITE_PROD_API_BASE_URL?: string;
  readonly VITE_STAGING_API_BASE_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_ENVIRONMENT?: 'development' | 'staging' | 'production';
  readonly VITE_APP_ENVIRONMENT?: 'development' | 'staging' | 'production';
  readonly VITE_DEBUG?: string;
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_PREFER_ASSET?: string;
  readonly VITE_ASSET_URL?: string;
  readonly [key: `VITE_${string}`]: string | undefined;
}
