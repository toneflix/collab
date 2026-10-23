/**
 * Placeholders for images that fail to load (deleted files, dead links, offline CDNs).
 * They are inline so the fallback itself can never fail to load.
 */
const svg = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

export const avatarFallback = svg(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#3a3f4b"/><circle cx="200" cy="160" r="72" fill="#8a909e"/><path d="M64 360c12-78 70-122 136-122s124 44 136 122" fill="#8a909e"/></svg>',
);

export const imageFallback = svg(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 520"><rect width="520" height="520" fill="#2b2f38"/><circle cx="260" cy="260" r="150" fill="#3a3f4b"/><circle cx="260" cy="260" r="40" fill="#2b2f38"/><circle cx="260" cy="260" r="12" fill="#8a909e"/><path d="M300 150v150a36 36 0 1 1-20-32V180l70-18v24z" fill="#8a909e" opacity=".9"/></svg>',
);

const isAvatar = (img: HTMLImageElement) =>
  !!img.closest('.q-avatar, .header-avatar, [data-fallback="avatar"]') ||
  /avatar/i.test(img.src);

const swap = (img: HTMLImageElement) => {
  // Only once per element, so a broken fallback can't loop.
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = '1';
  img.removeAttribute('srcset');
  img.src = isAvatar(img) ? avatarFallback : imageFallback;
};

/**
 * Replace any <img> that fails to load with a placeholder.
 * q-img elements are handled by their error-src instead.
 */
export const installImageFallback = () => {
  const handle = (target: EventTarget | null) => {
    if (target instanceof HTMLImageElement && !target.closest('.q-img')) {
      swap(target);
    }
  };

  // Error events don't bubble, so listen in the capture phase.
  document.addEventListener('error', (e) => handle(e.target), true);

  // Images that already failed before this ran (e.g. server-rendered ones).
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) handle(img);
  });
};
