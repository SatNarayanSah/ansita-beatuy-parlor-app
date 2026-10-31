import { create } from 'zustand';

import type { ID, Notification } from '@/types';

import { findEntity, mergeEntities, replaceEntities, sortByCreatedDesc, withoutEntity } from './entityHelpers';

interface NotificationData {
  notifications: Notification[];
}

interface NotificationActions {
  setNotifications: (notifications: readonly Notification[]) => void;
  mergeNotifications: (notifications: readonly Notification[]) => void;
  removeNotification: (id: ID) => void;
  getNotificationById: (id: ID) => Notification | undefined;
  reset: () => void;
}

export type NotificationState = NotificationData & NotificationActions;

/** Cache of the signed-in user's notifications. */
export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],

  setNotifications: (list) => {
    const next = replaceEntities(get().notifications, list);
    if (next) set({ notifications: next });
  },
  mergeNotifications: (list) => {
    const next = mergeEntities(get().notifications, list);
    if (next) set({ notifications: next });
  },
  removeNotification: (id) => {
    const next = withoutEntity(get().notifications, id);
    if (next) set({ notifications: next });
  },
  getNotificationById: (id) => findEntity(get().notifications, id),
  reset: () => set({ notifications: [] }),
}));

// ---------- Selectors ----------

export const selectNotificationsForUser = (notifications: readonly Notification[], userId: ID): Notification[] =>
  sortByCreatedDesc(notifications.filter((notification) => notification.userId === userId));

export const selectUnreadCount = (notifications: readonly Notification[], userId: ID): number =>
  notifications.filter((notification) => notification.userId === userId && !notification.isRead).length;
