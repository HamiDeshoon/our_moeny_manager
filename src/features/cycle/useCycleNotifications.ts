import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { NotificationPreferences } from '../../types';

function toUint8Array(value: string): Uint8Array {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

const fallback: NotificationPreferences = { dailyLogEnabled: false, dailyLogTime: '20:00', ovulationEnabled: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };

export function useCycleNotifications(enabled: boolean) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(fallback);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!enabled) return; void api.getNotificationPreferences().then(setPreferences).catch(() => setStatus('یادآورها در این استقرار در دسترس نیستند.')); }, [enabled]);

  const save = useCallback(async (update: Partial<NotificationPreferences>) => {
    setLoading(true); setStatus(null);
    try { const next = await api.updateNotificationPreferences(update); setPreferences(next); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'ذخیره یادآورها ناموفق بود.'); }
    finally { setLoading(false); }
  }, []);

  const enablePush = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !window.isSecureContext) { setStatus('یادآور پس‌زمینه فقط در نصب امن PWA پشتیبانی می‌شود.'); return; }
    setLoading(true); setStatus(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('اجازه اعلان داده نشد؛ ثبت روزانه همچنان در برنامه در دسترس است.'); return; }
      const [{ publicKey }, registration] = await Promise.all([api.getPushPublicKey(), navigator.serviceWorker.ready]);
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('مرورگر اشتراک اعلان معتبر برنگرداند.');
      await api.savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      await save({ timezone: fallback.timezone });
      setStatus('یادآورها با موفقیت فعال شدند.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'فعال‌سازی اعلان ناموفق بود.'); }
    finally { setLoading(false); }
  }, [save]);

  return { preferences, status, loading, save, enablePush };
}
