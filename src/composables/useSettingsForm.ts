import { ref } from 'vue';
import { notify } from 'src/utils/helpers';

type ErrorBody = {
  message?: string;
  errors?: Record<string, string | string[]>;
};

/**
 * Shared state for the account settings forms: which form is saving and the
 * field errors from the last failed request.
 */
export function useSettingsForm() {
  const errors = ref<Record<string, string>>({});
  const saving = ref<string | null>(null);

  const fail = (error: unknown, fallback: string) => {
    const body = error as ErrorBody;

    errors.value = Object.fromEntries(
      Object.entries(body.errors || {}).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    ) as Record<string, string>;
    notify(body.message || fallback, 'error');
  };

  /** Run one form's request under its key, showing the API's errors if it fails. */
  const run = async (key: string, fallback: string, task: () => Promise<void>) => {
    saving.value = key;
    errors.value = {};

    try {
      await task();
    } catch (error) {
      fail(error, fallback);
    } finally {
      saving.value = null;
    }
  };

  return { errors, saving, fail, run };
}
