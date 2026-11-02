import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { useAuthStore } from '@/store/authStore';
import { useServiceStore } from '@/store/serviceStore';
import { useSettingsStore, type ReminderTiming } from '@/store/settingsStore';
import { useStaffStore } from '@/store/staffStore';
import type { Appointment, ID, Notification, NotificationLink } from '@/types';
import { formatTime12, parseISODate } from '@/utils/date';

import { api } from './client';

/**
 * Notifications in the phone's notification bar.
 *
 * - Push: the server sends every notification through Expo to the phones the user
 *   is signed in on, even when the app is closed. Needs an installed build (Expo Go
 *   on Android cannot receive push) and an EAS project id.
 * - Fallback: where push isn't available, new notifications found by the live sync
 *   while the app is open are shown in the bar from here.
 * - Reminders: a customer's upcoming bookings are scheduled on the phone itself
 *   (Preferences → Appointment reminders), so they arrive even offline.
 */

/** Payload attached to every notification the app shows or receives. */
export interface PhoneNotificationData {
  notificationId?: ID;
  link?: NotificationLink | null;
}

const CHANNEL_UPDATES = 'default';
const CHANNEL_REMINDERS = 'reminders';
const REMINDER_PREFIX = 'reminder-';
const BRAND_COLOR = '#A44A67';

let pushToken: string | null = null;
/** Notification ids already seen this session; null until the first list arrives. */
let seen: Set<ID> | null = null;

// Show notifications as banners while the app is open, too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

const projectId = (): string | undefined =>
  (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;

/** Remote push works on a real phone in an installed build with an EAS project id. */
const canUseRemotePush = (): boolean =>
  Device.isDevice && !(Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) && Boolean(projectId());

/** Android needs channels before anything shows; they also appear in the phone's app settings. */
export const setupNotificationChannels = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_UPDATES, {
    name: 'Bookings & updates',
    description: 'Confirmations, changes, payments and messages from the parlour',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: BRAND_COLOR,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, {
    name: 'Appointment reminders',
    description: 'Before each upcoming appointment',
    importance: AndroidImportance.HIGH,
    lightColor: BRAND_COLOR,
  });
};

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export const getNotificationPermission = async (): Promise<NotificationPermission> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
};

/**
 * Asks the system for permission. Once the user has said no, the system won't ask
 * again, so this opens the app's settings page instead.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (!current.canAskAgain) {
    await Linking.openSettings();
    return 'denied';
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
};

/** After sign-in: ask once, then register this phone for push with the server. */
export const registerForPhoneNotifications = async (): Promise<void> => {
  await setupNotificationChannels();
  if ((await requestNotificationPermission()) !== 'granted' || !canUseRemotePush()) return;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  pushToken = data;
  await api<null>('POST', '/notifications/devices', {
    body: { token: data, platform: Platform.OS === 'ios' ? 'ios' : 'android', offerAlerts: useSettingsStore.getState().preferences.offerAlerts },
  });
};

/** Before sign-out: stop pushes to this phone, and clear what the old account left behind. */
export const unregisterPhoneNotifications = async (): Promise<void> => {
  const token = pushToken;
  pushToken = null;
  seen = null;
  if (token) await api<null>('POST', '/notifications/devices/remove', { body: { token } }).catch(() => undefined);
  await Promise.all([
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.dismissAllNotificationsAsync(),
    Notifications.setBadgeCountAsync(0),
  ]).catch(() => undefined);
};

/**
 * Called with every fresh notification list. Without push, shows the ones that are
 * new since the last list; the first list of a session only primes the "seen" set.
 */
export const showNewInNotificationBar = (list: readonly Notification[]): void => {
  const fresh = seen ? list.filter((n) => !n.isRead && !seen?.has(n.id)) : [];
  seen = new Set(list.map((n) => n.id));
  if (pushToken || fresh.length === 0) return;
  const { preferences } = useSettingsStore.getState();
  fresh
    .filter((n) => n.type !== 'promotion' || preferences.offerAlerts)
    .forEach((n) => {
      const data: PhoneNotificationData = { notificationId: n.id, link: n.link };
      Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.message, data: { ...data }, sound: 'default', color: BRAND_COLOR },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL_UPDATES } : null,
      }).catch(() => undefined);
    });
};

/** Keeps the number on the app icon in step with unread notifications. */
export const setAppBadge = (unread: number): void => {
  Notifications.setBadgeCountAsync(unread).catch(() => undefined);
};

const REMINDER_OFFSETS: Record<ReminderTiming, readonly { key: string; minutes: number }[]> = {
  '1h': [{ key: '1h', minutes: 60 }],
  '1d': [{ key: '1d', minutes: 24 * 60 }],
  both: [
    { key: '1d', minutes: 24 * 60 },
    { key: '1h', minutes: 60 },
  ],
};

const startOf = (a: Appointment): Date => {
  const [hours = 0, minutes = 0] = a.startTime.split(':').map(Number);
  const date = parseISODate(a.date);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Replaces the scheduled reminders with one per upcoming booking and offset.
 * Only for customers; the parlour's own bookings would flood an admin's phone.
 */
export const scheduleAppointmentReminders = async (appointments: readonly Appointment[], timing: ReminderTiming): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(REMINDER_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  if (useAuthStore.getState().user?.role !== 'customer' || (await getNotificationPermission()) !== 'granted') return;

  const services = new Map(useServiceStore.getState().services.map((s) => [s.id, s.name]));
  const staff = new Map(useStaffStore.getState().staff.map((s) => [s.id, s.name.split(' ')[0] ?? s.name]));
  const now = Date.now();

  const jobs = appointments
    .filter((a) => a.status === 'confirmed' || a.status === 'pending')
    .flatMap((a) =>
      REMINDER_OFFSETS[timing].map(({ key, minutes }) => ({ a, key, at: new Date(startOf(a).getTime() - minutes * 60_000) })),
    )
    .filter(({ at }) => at.getTime() > now);

  await Promise.all(
    jobs.map(({ a, key, at }) => {
      const names = a.serviceIds.map((id) => services.get(id) ?? 'Your appointment').join(', ');
      const who = staff.get(a.staffId);
      const data: PhoneNotificationData = { link: { kind: 'appointment', id: a.id } };
      return Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${a.id}-${key}`,
        content: {
          title: key === '1h' ? 'See you in an hour ✨' : 'Appointment tomorrow ✨',
          // Worded for when it fires: a day before is "tomorrow", an hour before is "today".
          body: `${names} ${key === '1h' ? 'today' : 'tomorrow'} at ${formatTime12(a.startTime)}${who ? ` with ${who}` : ''}.`,
          data: { ...data },
          sound: 'default',
          color: BRAND_COLOR,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_REMINDERS },
      });
    }),
  ).catch(() => undefined);
};
