/* Shows push notifications from Toneflix Collab and opens the app when one is clicked. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Toneflix Collab', body: event.data ? event.data.text() : '' };
  }

  const { title = 'Toneflix Collab', ...options } = payload;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Open the path on this app's own origin, so links work on any deployment.
  const link = new URL(event.notification.data?.url || '/', self.location.origin);
  const url = new URL(link.pathname + link.search + link.hash, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        return open.focus().then(() => open.navigate(url)).catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
