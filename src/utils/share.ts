import { copyToClipboard, Platform } from 'quasar';
import { notify } from 'src/utils/helpers';

/**
 * Share a link: the system share sheet on phones, the clipboard elsewhere.
 */
export const shareLink = async (title: string, url: string, copied = 'Link copied.') => {
  if (Platform.is.mobile && navigator.share) {
    await navigator.share({ title, text: title, url }).catch(() => undefined);
    return;
  }

  await copyToClipboard(url);
  notify(copied, 'success');
};
