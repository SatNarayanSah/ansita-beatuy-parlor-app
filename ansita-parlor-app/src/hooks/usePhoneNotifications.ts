import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { navigationRef, openNotificationLink } from '@/navigation/navigationRef';
import { notificationService } from '@/services';
import {
  registerForPhoneNotifications,
  scheduleAppointmentReminders,
  setAppBadge,
  showNewInNotificationBar,
  type PhoneNotificationData,
} from '@/services/phoneNotifications';
import { useAppointmentStore, useNotificationStore, useSettingsStore } from '@/store';
import type { User } from '@/types';

/** Opens a tapped notification once the navigator can take it (it may still be mounting on a cold start). */
const openWhenReady = (user: User, data: PhoneNotificationData, attempt = 0): void => {
  if (!navigationRef.isReady()) {
    if (attempt < 20) setTimeout(() => openWhenReady(user, data, attempt + 1), 150);
    return;
  }
  if (data.notificationId) void notificationService.markAsRead(data.notificationId).catch(() => undefined);
  openNotificationLink(user.role, data.link ?? null);
};

/**
 * Phone notifications for the signed-in user: registers this phone for push, keeps
 * appointment reminders and the app-icon badge up to date, and opens the right
 * screen when a notification in the notification bar is tapped.
 */
export const usePhoneNotifications = (user: User | null): void => {
  const offerAlerts = useSettingsStore((state) => state.preferences.offerAlerts);
  const reminder = useSettingsStore((state) => state.preferences.reminder);
  const appointments = useAppointmentStore((state) => state.appointments);
  const notifications = useNotificationStore((state) => state.notifications);
  const userId = user?.id;

  // Ask for permission and register after sign-in; re-register when offer alerts change.
  useEffect(() => {
    if (userId) registerForPhoneNotifications().catch(() => undefined);
  }, [userId, offerAlerts]);

  useEffect(() => {
    if (userId) scheduleAppointmentReminders(appointments, reminder).catch(() => undefined);
  }, [userId, appointments, reminder]);

  // Where push isn't available (e.g. Expo Go), new notifications from the live sync go to the bar.
  useEffect(() => {
    if (userId) showNewInNotificationBar(notifications);
  }, [userId, notifications]);

  const unread = notifications.filter((n) => !n.isRead).length;
  useEffect(() => {
    if (userId) setAppBadge(unread);
  }, [userId, unread]);

  useEffect(() => {
    if (!user) return undefined;
    const open = (response: Notifications.NotificationResponse): void => {
      openWhenReady(user, response.notification.request.content.data as PhoneNotificationData);
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    // A tap that launched the app from closed, then taps while it runs.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) open(response);
      })
      .catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
    // Re-subscribe only when the account changes, not on every user field update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
};
