/** Keys people use to move around the page without a pointer. */
const NAVIGATION_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * Shows focus outlines only to people moving around with a keyboard. Touch
 * and mouse users don't see them when focus moves on its own, like when a
 * dialog closes. Screen readers such as TalkBack draw their own focus box.
 */
export const trackInputModality = () => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  document.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (NAVIGATION_KEYS.has(event.key)) root.classList.add('keyboard-nav');
    },
    true,
  );
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-nav'), true);
};
