import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

/**
 * Sizes an element to run from where it starts on the page down to the bottom
 * of the screen, above the player bar, so its content scrolls inside it.
 */
export function useFitToScreen(
  el: Ref<HTMLElement | undefined>,
  minHeight = 320,
) {
  const style = ref<Record<string, string>>({});
  let frame = 0;
  let settle: ReturnType<typeof setTimeout> | undefined;

  const measure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!el.value) return;
      const top = el.value.getBoundingClientRect().top + window.scrollY;
      // Only the part of the player bar that is on screen.
      const bar = document.querySelector('.q-footer')?.getBoundingClientRect();
      const footer = bar ? Math.max(window.innerHeight - bar.top, 0) : 0;
      const height = Math.max(
        window.innerHeight - top - footer - 16,
        minHeight,
      );
      style.value = { height: `${height}px` };
    });
  };

  // The player bar slides in and out, so fit again once it settles.
  const later = () => {
    clearTimeout(settle);
    settle = setTimeout(measure, 350);
  };
  const barWatcher =
    typeof MutationObserver === 'undefined'
      ? undefined
      : new MutationObserver(later);
  // Content above the element can grow, like a wrapping toolbar.
  const resizeWatcher =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(measure);

  onMounted(() => {
    window.addEventListener('resize', measure);
    const bar = document.querySelector('.q-footer');
    if (bar) barWatcher?.observe(bar, { attributes: true });
    if (el.value?.parentElement) resizeWatcher?.observe(el.value.parentElement);
    measure();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', measure);
    barWatcher?.disconnect();
    resizeWatcher?.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(settle);
  });

  return { style, measure };
}
