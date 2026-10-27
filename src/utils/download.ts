/**
 * Saves a file from a link the API handed out. The browser downloads it on
 * the web; the installed app hands it to the phone, because its WebView
 * can't save files. On both, the server should send
 * `Content-Disposition: attachment` so the file is saved rather than played.
 */
export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  if (import.meta.env.QUASAR_CAPACITOR_MODE) {
    const { nativeDownload } = await import('src/utils/native-download');

    return nativeDownload(url);
  }

  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  // A new tab keeps the player going if the server sends the file inline
  link.target = '_blank';
  // Browsers only use this name for links on the same origin
  if (filename) link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();
};
