import webpush from 'web-push';
import { db } from '../db.js';
import type { PushSubscriptionInput } from '../../src/types.js';

interface ReminderRunResult { sent: number; skipped: number; disabled: boolean; }

function localParts(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return { date: `${read('year')}-${read('month')}-${read('day')}`, time: `${read('hour')}:${read('minute')}` };
}

function isOvulationDay(date: string, lastPeriodStart?: string, cycleLength = 28, lutealLength = 14): boolean {
  if (!lastPeriodStart || date < lastPeriodStart) return false;
  const diff = Math.floor((new Date(`${date}T00:00:00`).getTime() - new Date(`${lastPeriodStart}T00:00:00`).getTime()) / 86_400_000);
  return ((diff % cycleLength) + cycleLength) % cycleLength === Math.max(0, cycleLength - lutealLength);
}

export async function sendDueReminders(): Promise<ReminderRunResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return { sent: 0, skipped: 0, disabled: true };
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const subscriptions = await db.getPushSubscriptions();
  const cycleSettings = await db.getCycleSettings();
  let sent = 0; let skipped = 0;
  for (const subscription of subscriptions) {
    const preferences = await db.getNotificationPreferences(subscription.userName);
    let local: { date: string; time: string };
    try { local = localParts(preferences.timezone); } catch { skipped++; continue; }
    const wantsDaily = preferences.dailyLogEnabled && preferences.dailyLogTime === local.time;
    const wantsOvulation = preferences.ovulationEnabled && isOvulationDay(local.date, cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.lutealLength);
    const type = wantsDaily ? 'cycle-log' : wantsOvulation ? 'ovulation' : null;
    if (!type) { skipped++; continue; }
    const deliveryKey = `${subscription.userName}:${subscription.endpoint}:${type}:${local.date}`;
    if (!(await db.claimNotificationDelivery(deliveryKey))) { skipped++; continue; }
    const payload = JSON.stringify({ title: 'DuoSpend', body: 'Your DuoSpend check-in is ready.', tag: type, url: '/cycle' });
    try {
      await webpush.sendNotification(subscription as PushSubscriptionInput, payload);
      sent++;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) await db.removePushSubscriptionByEndpoint(subscription.endpoint);
      else skipped++;
    }
  }
  return { sent, skipped, disabled: false };
}
