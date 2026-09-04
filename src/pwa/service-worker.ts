/// <reference lib="WebWorker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, type PrecacheEntry } from 'workbox-precaching';
import type { PushPayload } from './pwaTypes';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<string | PrecacheEntry> };

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

function isPushPayload(value: unknown): value is PushPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<PushPayload>;
  return Boolean(
    typeof payload.title === 'string' &&
    typeof payload.body === 'string' &&
    (payload.tag === 'cycle-log' || payload.tag === 'ovulation') &&
    payload.url === '/cycle',
  );
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {
    title: 'DuoSpend',
    body: 'Your DuoSpend check-in is ready.',
    tag: 'cycle-log',
    url: '/cycle',
  };

  try {
    const parsed = event.data?.json();
    if (isPushPayload(parsed)) payload = parsed;
  } catch {
    // Use the neutral payload when a provider sends malformed data.
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: '/icon-192.png',
    badge: '/icon-100.png',
    data: { url: payload.url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url === '/cycle' ? '/cycle' : '/';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clients.find((client) => 'focus' in client);
    if (existing && 'focus' in existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});
