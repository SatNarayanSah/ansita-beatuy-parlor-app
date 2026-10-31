import { useNotificationStore } from '@/store/notificationStore';
import type { ID, Notification } from '@/types';

import { api } from './client';

/** Notifications for the signed-in user only. */
export const notificationService = {
  listMine: async (): Promise<Notification[]> => {
    const list = await api<Notification[]>('GET', '/notifications');
    useNotificationStore.getState().setNotifications(list);
    return list;
  },

  getUnreadCount: async (): Promise<number> => (await api<{ count: number }>('GET', '/notifications/unread-count')).count,

  markAsRead: async (id: ID): Promise<Notification> => {
    const notification = await api<Notification>('POST', `/notifications/${id}/read`);
    useNotificationStore.getState().mergeNotifications([notification]);
    return notification;
  },

  markAllAsRead: async (): Promise<void> => {
    await api<null>('POST', '/notifications/read-all');
    const { notifications, setNotifications } = useNotificationStore.getState();
    setNotifications(notifications.map((notification) => ({ ...notification, isRead: true })));
  },

  deleteNotification: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/notifications/${id}`);
    useNotificationStore.getState().removeNotification(id);
  },

  clearAll: async (): Promise<void> => {
    await api<null>('DELETE', '/notifications');
    useNotificationStore.getState().setNotifications([]);
  },
};
