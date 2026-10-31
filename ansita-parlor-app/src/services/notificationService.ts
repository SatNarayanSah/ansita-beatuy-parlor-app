import {
  selectNotificationsForUser,
  selectUnreadCount,
  useNotificationStore,
} from '@/store/notificationStore';
import type { ID, Notification } from '@/types';

import { ApiError, ensureFound, simulateRequest } from './client';
import { requireUser } from './session';

const getOwnNotification = (id: ID, userId: ID): Notification => {
  const notification = ensureFound(useNotificationStore.getState().getNotificationById(id), 'Notification');
  if (notification.userId !== userId) throw new ApiError('FORBIDDEN');
  return notification;
};

/** Notifications for the signed-in user only. */
export const notificationService = {
  listMine: (): Promise<Notification[]> =>
    simulateRequest(() => {
      const user = requireUser();
      return selectNotificationsForUser(useNotificationStore.getState().notifications, user.id);
    }),

  getUnreadCount: (): Promise<number> =>
    simulateRequest(() => {
      const user = requireUser();
      return selectUnreadCount(useNotificationStore.getState().notifications, user.id);
    }),

  markAsRead: (id: ID): Promise<Notification> =>
    simulateRequest(() => {
      const user = requireUser();
      getOwnNotification(id, user.id);
      useNotificationStore.getState().markAsRead(id);
      return getOwnNotification(id, user.id);
    }),

  markAllAsRead: (): Promise<void> =>
    simulateRequest(() => {
      const user = requireUser();
      useNotificationStore.getState().markAllAsRead(user.id);
    }),

  deleteNotification: (id: ID): Promise<void> =>
    simulateRequest(() => {
      const user = requireUser();
      getOwnNotification(id, user.id);
      useNotificationStore.getState().deleteNotification(id);
    }),

  clearAll: (): Promise<void> =>
    simulateRequest(() => {
      const user = requireUser();
      useNotificationStore.getState().clearForUser(user.id);
    }),
};
