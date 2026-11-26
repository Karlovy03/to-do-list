/* Service worker: push and its actions. No page caching on purpose — data is always fresh.
   No UI text here: title, body and action labels arrive in the payload from the server. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const labels = data.actions || {};
  const actions = labels.snooze ? [{ action: 'open', title: labels.open }, { action: 'snooze', title: labels.snooze }] : [];
  event.waitUntil(
    self.registration.showNotification(data.title || self.registration.scope, {
      body: data.body || '',
      tag: data.tag,
      renotify: true,
      requireInteraction: !!data.urgent,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url || '/', taskId: data.taskId },
      actions,
    }),
  );
});

// The browser replaced the subscription (expired keys etc.): re-subscribe and tell the server.
// On failure the app re-syncs on its next start.
self.addEventListener('pushsubscriptionchange', (event) => {
  const options = event.oldSubscription && event.oldSubscription.options;
  if (!options) return;
  event.waitUntil(
    self.registration.pushManager
      .subscribe(options)
      .then((sub) =>
        fetch('/api/push/subscribe', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        }),
      )
      .catch(() => undefined),
  );
});

self.addEventListener('notificationclick', (event) => {
  const { url, taskId } = event.notification.data || {};
  event.notification.close();
  if (event.action === 'snooze' && taskId) {
    event.waitUntil(
      fetch(`/api/tasks/${taskId}/snooze`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 120 }),
      }).catch(() => undefined),
    );
    return;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url || '/');
          return c.focus();
        }
      }
      return self.clients.openWindow(url || '/');
    }),
  );
});
