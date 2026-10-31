import { newEntityMeta } from '@/store/entityHelpers';
import { selectUserByCustomerId, selectUsersByRole, useAuthStore } from '@/store/authStore';
import { selectAlertEnabled, useBusinessStore } from '@/store/businessStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { ID, Notification, NotificationLink, NotificationType } from '@/types';

/**
 * Internal helpers used by services to emulate server-side notifications.
 * Not exported from the services barrel: screens never create notifications directly.
 */

interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  link?: NotificationLink | null;
}

const buildNotification = (userId: ID, payload: NotificationPayload): Notification => ({
  ...newEntityMeta('ntf'),
  userId,
  type: payload.type,
  title: payload.title,
  message: payload.message,
  isRead: false,
  link: payload.link ?? null,
});

export const notifyUser = (userId: ID, payload: NotificationPayload): void => {
  useNotificationStore.getState().addNotification(buildNotification(userId, payload));
};

/** Notifies the app account linked to a customer, if that customer has one. */
export const notifyCustomer = (customerId: ID, payload: NotificationPayload): void => {
  const user = selectUserByCustomerId(useAuthStore.getState().users, customerId);
  if (user) notifyUser(user.id, payload);
};

/** Skipped when the parlour has switched off alerts of this type in Settings. */
export const notifyAdmins = (payload: NotificationPayload, exceptUserId?: ID): void => {
  if (!selectAlertEnabled(useBusinessStore.getState().alerts, payload.type)) return;
  selectUsersByRole(useAuthStore.getState().users, 'admin')
    .filter((admin) => admin.id !== exceptUserId)
    .forEach((admin) => notifyUser(admin.id, payload));
};
