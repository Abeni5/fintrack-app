import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── How notifications appear when the app is open (SDK 54 compatible) ────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,  // replaces deprecated shouldShowAlert
    shouldShowList: true,    // replaces deprecated shouldShowAlert
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ── Request permission ───────────────────────────────────────────────────────
export async function registerForNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fintrack', {
      name: 'FinTrack',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

// ── Internal helper ──────────────────────────────────────────────────────────
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

// ── Dedup guard — prevents same notification firing twice in a session ────────
// Key = "type:identifier", cleared when app restarts (in-memory only)
const _sent = new Set();

function alreadySent(key) {
  if (_sent.has(key)) return true;
  _sent.add(key);
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTANT NOTIFICATION TRIGGERS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Transaction added — call from AddTransactionScreen after successful save
export async function notifyTransactionAdded({ amount, currency, type, category }) {
  const emoji = type === 'income' ? '💰' : '💸';
  const arrow = type === 'income' ? '↑' : '↓';
  const formatted = Number(amount).toLocaleString();
  await send(
    `${emoji} ${type === 'income' ? 'Income' : 'Expense'} recorded`,
    `${arrow} ${formatted} ${currency} — ${category}`,
    { screen: 'Transactions' }
  );
}

// 2. Budget warning — fires at 80% once, and at 100% once, per category per session
export async function notifyBudgetWarning({ category, percentUsed, spent, limit, currency }) {
  if (percentUsed >= 100) {
    const key = `budget-over:${category}`;
    if (alreadySent(key)) return;
    await send(
      `🚨 Budget exceeded — ${category}`,
      `You spent ${Number(spent).toLocaleString()} ${currency} — over your ${Number(limit).toLocaleString()} limit`,
      { screen: 'Budget' }
    );
  } else if (percentUsed >= 80) {
    const key = `budget-warn:${category}`;
    if (alreadySent(key)) return;
    await send(
      `⚠️ Budget warning — ${category}`,
      `You have used ${Math.round(percentUsed)}% of your ${category} budget this month`,
      { screen: 'Budget' }
    );
  }
}

// 3. Goal milestone — fires once per milestone per goal title per session
export async function notifyGoalMilestone({ title, percentComplete, targetAmount }) {
  const milestones = [25, 50, 75, 100];
  const hit = milestones.find(m => percentComplete >= m && percentComplete < m + 5);
  if (!hit) return;

  const key = `goal-${hit}:${title}`;
  if (alreadySent(key)) return;

  if (hit === 100) {
    await send(
      `🎉 Goal completed!`,
      `You reached your "${title}" goal of ${Number(targetAmount).toLocaleString()}!`,
      { screen: 'Budget' }
    );
  } else {
    await send(
      `🎯 ${hit}% of "${title}"`,
      `You are ${hit}% of the way to your goal. Keep it up!`,
      { screen: 'Budget' }
    );
  }
}