import { Notify } from 'quasar';

/** A file name that is safe on every phone and computer, keeping the link's extension. */
export const downloadName = (url: string, filename?: string): string => {
  const fromUrl = decodeURIComponent(new URL(url, 'https://x').pathname.split('/').pop() || '');
  let name = (filename || fromUrl || 'download').replace(/[\\/:*?"<>|]+/g, '-').trim();
  const extension = fromUrl.match(/\.[a-z0-9]{2,5}$/i)?.[0];

  if (extension && !name.toLowerCase().endsWith(extension.toLowerCase())) {
    name += extension;
  }

  return name;
};

/**
 * Saves a file from a link the API handed out, the same way everywhere:
 * the browser downloads it on the web, and the installed app saves it to
 * Documents/Toneflix Music (its WebView can't save files) with progress
 * shown while it downloads.
 */
export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  const name = downloadName(url, filename);

  if (import.meta.env.QUASAR_CAPACITOR_MODE) {
    const { nativeDownload } = await import('src/utils/native-download');
    const notice = Notify.create({
      group: false,
      timeout: 0,
      spinner: true,
      color: 'grey-10',
      textColor: 'white',
      message: `Downloading ${name}`,
    });

    try {
      const folder = await nativeDownload(url, name, (fraction) =>
        notice({ caption: `${Math.round(fraction * 100)}%` }),
      );

      notice({ spinner: false, icon: 'lucide-check', timeout: 4000, message: `Saved ${name}`, caption: `In ${folder}` });
    } catch (error) {
      notice({
        spinner: false,
        icon: 'lucide-circle-x',
        timeout: 5000,
        message: `Couldn't download ${name}`,
        caption: error instanceof Error ? error.message : undefined,
      });
    }

    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  // A new tab keeps the player going if the file is sent inline
  link.target = '_blank';
  // Browsers only use this name for same-origin links; others use the server's header
  link.download = name;

  document.body.appendChild(link);
  link.click();
  link.remove();
};
