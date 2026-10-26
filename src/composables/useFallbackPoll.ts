import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';

type FallbackPollOptions = {
  /** Whether realtime updates are arriving. */
  live: MaybeRefOrGetter<boolean>;
  /** Whether there is anything to wait for. */
  active: MaybeRefOrGetter<boolean>;
  /** Fetches the latest state. */
  check: () => unknown;
  every?: number;
};

/**
 * Runs `check` every few seconds while something is `active` and realtime
 * isn't `live`. When realtime comes back while active, it checks once for
 * updates missed in between.
 */
export function useFallbackPoll({ live, active, check, every = 5000 }: FallbackPollOptions) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const polling = () => toValue(active) && !toValue(live);

  const stop = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const schedule = () => {
    stop();
    if (typeof window === 'undefined' || !polling()) return;

    timer = setTimeout(async () => {
      timer = undefined;
      if (!polling()) return;

      try {
        await check();
      } finally {
        schedule();
      }
    }, every);
  };

  watch(
    () => [toValue(live), toValue(active)] as const,
    ([isLive, isActive], old) => {
      if (isLive && old && !old[0] && isActive && typeof window !== 'undefined') void check();
      schedule();
    },
    { immediate: true },
  );

  onScopeDispose(stop);

  return { schedule, stop };
}
