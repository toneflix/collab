import { FileTransfer } from '@capacitor/file-transfer';
import { Directory, Filesystem } from '@capacitor/filesystem';

/** Where downloads go, inside the phone's shared Documents folder. */
const FOLDER = 'Toneflix Music';

/**
 * Saves the file to Documents/Toneflix Music, where the phone's Files app
 * can find it. Calls `onProgress` with 0–1 when the size is known, and
 * resolves with the folder path to show people. Loaded only in the installed app.
 */
export const nativeDownload = async (
  url: string,
  filename: string,
  onProgress?: (fraction: number) => void,
): Promise<string> => {
  // Android 10 and older ask for storage access; newer versions don't need it
  if ((await Filesystem.checkPermissions()).publicStorage !== 'granted') {
    const { publicStorage } = await Filesystem.requestPermissions();

    if (publicStorage !== 'granted') {
      throw new Error('Allow storage access for Toneflix Music to save downloads.');
    }
  }

  await Filesystem.mkdir({ directory: Directory.Documents, path: FOLDER, recursive: true }).catch(() => {
    // Already there
  });

  const { uri } = await Filesystem.getUri({ directory: Directory.Documents, path: `${FOLDER}/${filename}` });
  const listener = onProgress
    ? await FileTransfer.addListener('progress', (status) => {
        if (status.url === url && status.lengthComputable && status.contentLength) {
          onProgress(status.bytes / status.contentLength);
        }
      })
    : null;

  try {
    await FileTransfer.downloadFile({ url, path: uri, progress: !!onProgress });
  } finally {
    await listener?.remove();
  }

  return `Documents/${FOLDER}`;
};
