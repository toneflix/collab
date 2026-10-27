import { Browser } from '@capacitor/browser';

/**
 * Opens the file in the in-app browser sheet, which saves it with the phone's
 * own downloader (the Downloads folder and notification on Android).
 * Loaded only in the installed app.
 */
export const nativeDownload = async (url: string): Promise<void> => {
  await Browser.open({ url, presentationStyle: 'popover' });
};
