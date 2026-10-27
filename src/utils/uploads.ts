/**
 * Uploads in progress. While any run, the installed app keeps itself alive in
 * the background (an "Uploading" notification), and the web asks before the
 * page is closed or reloaded.
 */

let active = 0;

/** A request carrying files: multipart, FormData or a File or Blob in its body. */
export const isUpload = (data: unknown, contentType?: unknown): boolean => {
  if (String(contentType ?? '').includes('multipart/form-data')) return true;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return true;
  if (typeof Blob !== 'undefined' && data instanceof Blob) return true;
  if (data && typeof data === 'object') {
    return Object.values(data as Record<string, unknown>).some(
      (value) => (typeof Blob !== 'undefined' && value instanceof Blob) || (Array.isArray(value) && value.some((v) => typeof Blob !== 'undefined' && v instanceof Blob)),
    );
  }
  return false;
};

const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  // Older browsers need a return value to show the prompt
  event.returnValue = '';
};

const keepAlive = async (count: number) => {
  if (import.meta.env.QUASAR_CAPACITOR_MODE) {
    const { nativeUploads } = await import('src/utils/native-uploads');
    if (count > 0) await nativeUploads.start({ count }).catch(() => undefined);
    else await nativeUploads.stop().catch(() => undefined);
  } else if (typeof window !== 'undefined') {
    if (count > 0) window.addEventListener('beforeunload', warnBeforeLeaving);
    else window.removeEventListener('beforeunload', warnBeforeLeaving);
  }
};

export const uploadStarted = () => {
  active++;
  void keepAlive(active);
};

export const uploadEnded = () => {
  active = Math.max(0, active - 1);
  void keepAlive(active);
};
