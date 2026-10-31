import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildNotifications } from '@/data/notifications';
import type { ID, Notification, UpdateInput } from '@/types';
import { nowISO } from '@/utils/date';

import { findEntity, insertEntity, removeEntity, sortByCreatedDesc, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

/** Older notifications beyond this count are dropped to keep storage small. */
const MAX_NOTIFICATIONS = 200;

interface NotificationData {
  notifications: Notification[];
}

interface NotificationActions {
  addNotification: (notification: Notification) => void;
  updateNotification: (id: ID, patch: UpdateInput<Notification>) => void;
  deleteNotification: (id: ID) => void;
  getNotificationById: (id: ID) => Notification | undefined;
  markAsRead: (id: ID) => void;
  markAllAsRead: (userId: ID) => void;
  clearForUser: (userId: ID) => void;
  reset: () => void;
}

export type NotificationState = NotificationData & NotificationActions;

const createInitialData = (): NotificationData => ({ notifications: buildNotifications() });

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addNotification: (notification) =>
        set((state) => ({
          notifications: insertEntity(state.notifications, notification).slice(0, MAX_NOTIFICATIONS),
        })),
      updateNotification: (id, patch) =>
        set((state) => ({ notifications: updateEntity(state.notifications, id, patch) })),
      deleteNotification: (id) =>
        set((state) => ({ notifications: removeEntity(state.notifications, id) })),
      getNotificationById: (id) => findEntity(get().notifications, id),

      markAsRead: (id) =>
        set((state) => ({ notifications: updateEntity(state.notifications, id, { isRead: true }) })),

      markAllAsRead: (userId) => {
        const timestamp = nowISO();
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.userId === userId && !notification.isRead
              ? { ...notification, isRead: true, updatedAt: timestamp }
              : notification,
          ),
        }));
      },

      clearForUser: (userId) =>
        set((state) => ({
          notifications: state.notifications.filter((notification) => notification.userId !== userId),
        })),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.notifications,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ notifications }): NotificationData => ({ notifications }),
    },
  ),
);

// ---------- Selectors ----------

export const selectNotificationsForUser = (notifications: readonly Notification[], userId: ID): Notification[] =>
  sortByCreatedDesc(notifications.filter((notification) => notification.userId === userId));

export const selectUnreadCount = (notifications: readonly Notification[], userId: ID): number =>
  notifications.filter((notification) => notification.userId === userId && !notification.isRead).length;
