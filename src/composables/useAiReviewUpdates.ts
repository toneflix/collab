import { debounce } from 'quasar';
import type { Ref } from 'vue';
import { useFallbackPoll } from 'src/composables/useFallbackPoll';
import { useRealtimeChannel } from 'src/utils/realtime';

/**
 * Reloads a list when the AI moderator queues or finishes a review, so its
 * decision shows up without a refresh. Without realtime, the list is
 * reloaded every few seconds while any of its items waits on the moderator.
 */
export function useAiReviewUpdates<T extends { aiReview?: { status: string } | null }>(
  items: Ref<T[]>,
  reload: () => unknown,
  every = 5000,
) {
  const reloadSoon = debounce(() => void reload(), 500);

  const { live } = useRealtimeChannel('admin.content', { 'ai.review': () => reloadSoon() });

  useFallbackPoll({
    live,
    active: () => items.value.some((item) => item.aiReview?.status === 'queued'),
    check: reload,
    every,
  });
}
