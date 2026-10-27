import { registerPlugin } from '@capacitor/core';

/**
 * Our own native plugin (UploadsPlugin in the Android project), which keeps
 * the app running in the background while uploads finish. Loaded only in the
 * installed app.
 */
export const nativeUploads = registerPlugin<{
  start (options: { count: number }): Promise<void>;
  stop (): Promise<void>;
}>('Uploads');
