import { onBeforeUnmount, watch, type Ref } from 'vue';

/**
 * Reloads a list every few seconds while any of its items waits on the AI
 * moderator, so its decision shows up without a refresh.
 */
export function useAiReviewPolling<T extends { aiReview?: { status: string } | null }>(
  items: Ref<T[]>,
  reload: () => unknown,
  every = 5000,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  watch(
    items,
    (list) => {
      stop();

      if (list.some((item) => item.aiReview?.status === 'queued')) {
        timer = setTimeout(() => reload(), every);
      }
    },
    { deep: false },
  );

  onBeforeUnmount(stop);
}
