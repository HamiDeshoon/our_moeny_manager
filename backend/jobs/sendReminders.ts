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
  const publicKey = process.env.VAPID_PUBLIC_KEY || 'BPqjQc9W7qdGKdua-TW_ZHq9PVgGEh7EDv9c36ox2vl6XwTopfmL_bv-dZ67l3Bue9lvg_Sg8bItzrqsFoUDuxQ';
  const privateKey = process.env.VAPID_PRIVATE_KEY || 'P_UWWr8bSuD0Hj7sJBp9Xb-gdtQhgvtVMLcN0P-h5vc';
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@duospend.local';
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const subscriptions = await db.getPushSubscriptions();
  const cycleSettings = await db.getCycleSettings();
  const groceryItems = await db.getGroceryItems();
  const importantDates = await db.getImportantDates();
  let sent = 0; let skipped = 0;

  for (const subscription of subscriptions) {
    const preferences = await db.getNotificationPreferences(subscription.userName);
    let local: { date: string; time: string };
    try { local = localParts(preferences.timezone || 'Asia/Tehran'); } catch { skipped++; continue; }

    const alertsToSend: Array<{ title: string; body: string; tag: string; url: string }> = [];

    // 1. Nightly 9 PM Expense Reminder
    const nightlyTime = preferences.nightlyExpenseTime || '21:00';
    if (preferences.nightlyExpenseEnabled !== false && local.time === nightlyTime) {
      alertsToSend.push({
        title: 'ثبت مخارج امروز 💳',
        body: 'ساعت ۹ شب شد! یادت نره هزینه‌ها و خریدهای امروز رو وارد کنی.',
        tag: `nightly-expense-${local.date}`,
        url: '/',
      });
    }

    // 2. Occasions & Important Dates Reminder (Morning / 09:00 check or matched date)
    if (preferences.occasionAlertsEnabled !== false) {
      const todayOccasions = importantDates.filter(d => d.date === local.date);
      for (const occ of todayOccasions) {
        alertsToSend.push({
          title: `یادآور مناسبت امروز 🎉`,
          body: `امروز مناسبت «${occ.title}» است! فراموش نکنید.`,
          tag: `occasion-${occ.id}-${local.date}`,
          url: '/couple',
        });
      }
    }

    // 3. Grocery List Reminder (if there are unchecked items and around 18:00 or 20:00)
    const uncheckedGroceries = groceryItems.filter(i => !i.isChecked);
    if (preferences.groceryAlertsEnabled !== false && uncheckedGroceries.length > 0 && local.time === '19:00') {
      alertsToSend.push({
        title: `لیست خرید خانه 🛒 (${uncheckedGroceries.length} مورد)`,
        body: `اقلام باقی‌مانده: ${uncheckedGroceries.slice(0, 3).map(g => g.title).join('، ')}${uncheckedGroceries.length > 3 ? ' و ...' : ''}`,
        tag: `grocery-alert-${local.date}`,
        url: '/couple',
      });
    }

    // 4. Cycle & Health Check-in
    const wantsDaily = preferences.dailyLogEnabled && preferences.dailyLogTime === local.time;
    const wantsOvulation = preferences.ovulationEnabled && isOvulationDay(local.date, cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.lutealLength);
    if (wantsDaily) {
      alertsToSend.push({
        title: 'چرخه و سلامت 🌸',
        body: 'زمان ثبت وضعیت و علائم سلامت امروز شماست.',
        tag: `cycle-log-${local.date}`,
        url: '/cycle',
      });
    }
    if (wantsOvulation) {
      alertsToSend.push({
        title: 'یادآور چرخه 💖',
        body: 'روزهای تخمک‌گذاری و پنجره باروری نزدیک است.',
        tag: `ovulation-${local.date}`,
        url: '/cycle',
      });
    }

    if (alertsToSend.length === 0) { skipped++; continue; }

    for (const alert of alertsToSend) {
      const deliveryKey = `${subscription.userName}:${subscription.endpoint}:${alert.tag}`;
      if (!(await db.claimNotificationDelivery(deliveryKey))) { skipped++; continue; }
      const payload = JSON.stringify(alert);
      try {
        await webpush.sendNotification(subscription as PushSubscriptionInput, payload);
        sent++;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await db.removePushSubscriptionByEndpoint(subscription.endpoint);
        } else {
          skipped++;
        }
      }
    }
  }
  return { sent, skipped, disabled: false };
}
