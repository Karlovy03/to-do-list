/* Service worker: push-сповіщення і дії з ними. Кешування сторінок навмисно немає —
   дані завжди свіжі з сервера. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Контроль', body: event.data && event.data.text() }; }
  const actions = data.snooze ? [{ action: 'open', title: 'Відкрити' }, { action: 'snooze', title: 'Відкласти на 2 год' }] : [];
  event.waitUntil(
    self.registration.showNotification(data.title || 'Контроль', {
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
