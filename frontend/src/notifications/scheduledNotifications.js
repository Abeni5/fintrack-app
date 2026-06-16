// ─────────────────────────────────────────────────────────────────────────────
// scheduledNotifications.js
// Place at: src/notifications/scheduledNotifications.js
//
// No expo-background-fetch needed — uses only expo-notifications triggers
// and expo-task-manager for advisor checks when app opens.
// ─────────────────────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../api/client';

// ── Internal send helper ─────────────────────────────────────────────────────
async function send(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      ...(Platform.OS === 'android' && { channelId: 'fintrack' }),
    },
    trigger: null,
  });
}

// ── Schedule daily 8PM summary notification ──────────────────────────────────
async function scheduleDailySummary() {
  // Cancel existing daily summary before rescheduling
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'daily_summary') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌅 Daily Summary',
      body: 'Tap to review your spending for today.',
      data: { screen: 'Reports', type: 'daily_summary' },
      ...(Platform.OS === 'android' && { channelId: 'fintrack' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,   // 8:00 PM
      minute: 0,
    },
  });
}

// ── Schedule weekly Monday 9AM report notification ───────────────────────────
async function scheduleWeeklyReport() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'weekly_report') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Weekly Report Ready',
      body: 'Your weekly financial summary is ready. Tap to review.',
      data: { screen: 'Reports', type: 'weekly_report' },
      ...(Platform.OS === 'android' && { channelId: 'fintrack' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,  // Monday (1=Sun, 2=Mon ... 7=Sat)
      hour: 9,
      minute: 0,
    },
  });
}

// ── Check advisor warnings when app opens (no background fetch needed) ───────
// Call this from DashboardScreen on load — it silently checks and notifies
const _advisorChecked = { done: false }; // only once per app session

export async function checkAdvisorNotifications() {
  if (_advisorChecked.done) return;
  _advisorChecked.done = true;

  try {
    const [warnRes, suggestRes] = await Promise.all([
      api.get('/advisor/warnings'),
      api.get('/advisor/suggestions'),
    ]);

    // Top spending warning
    const warnings = warnRes.data?.warnings || [];
    if (warnings.length > 0) {
      const top = warnings[0];
      await send(
        `⚠️ Spending Warning — ${top.category}`,
        `You are ${top.percent_over}% over your usual ${top.category} spending.`,
        { screen: 'Advisor' }
      );
    }

    // One AI suggestion tip
    const suggestion = suggestRes.data?.ai_advice;
    if (suggestion) {
      const trimmed = suggestion.length > 100
        ? suggestion.slice(0, 97) + '...'
        : suggestion;
      await send(
        '💡 AI Advisor Tip',
        trimmed,
        { screen: 'Advisor' }
      );
    }
  } catch (e) {
    // Silent fail — don't interrupt app flow
    console.log('Advisor notification check failed:', e?.message);
  }
}

// ── Main entry — call once after login ───────────────────────────────────────
export async function registerScheduledNotifications() {
  try {
    await scheduleDailySummary();
    await scheduleWeeklyReport();
    console.log('Scheduled notifications registered ✓');
  } catch (e) {
    console.log('Error registering scheduled notifications:', e);
  }
}

// ── Call on logout to clean up ────────────────────────────────────────────────
export async function unregisterScheduledNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const type = n.content.data?.type;
      if (type === 'daily_summary' || type === 'weekly_report') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    // Reset advisor check so it runs again on next login
    _advisorChecked.done = false;
    console.log('Scheduled notifications cleared ✓');
  } catch (e) {
    console.log('Error clearing scheduled notifications:', e);
  }
}