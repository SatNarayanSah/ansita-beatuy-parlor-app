import { useAppointmentStore } from './appointmentStore';
import { useAuthStore } from './authStore';
import { useBusinessStore } from './businessStore';
import { useCourseStore } from './courseStore';
import { useCustomerStore } from './customerStore';
import { useNotificationStore } from './notificationStore';
import { useOfferStore } from './offerStore';
import { useReviewStore } from './reviewStore';
import { useServiceStore } from './serviceStore';
import { useSettingsStore } from './settingsStore';
import { useStaffStore } from './staffStore';

export * from './appointmentStore';
export * from './authStore';
export * from './businessStore';
export * from './courseStore';
export * from './customerStore';
export * from './notificationStore';
export * from './offerStore';
export * from './reviewStore';
export * from './serviceStore';
export * from './settingsStore';
export * from './staffStore';

/** Every persisted store, used for hydration tracking and resets. */
export const persistedStores = [
  useAuthStore,
  useCustomerStore,
  useServiceStore,
  useStaffStore,
  useAppointmentStore,
  useCourseStore,
  useNotificationStore,
  useReviewStore,
  useOfferStore,
  useBusinessStore,
] as const;

/**
 * Restores every store to fresh seed data.
 * The current session is kept when `keepSession` is true and the user still exists.
 */
export const resetAllStores = ({ keepSession = false }: { keepSession?: boolean } = {}): void => {
  const { session } = useAuthStore.getState();
  persistedStores.forEach((store) => store.getState().reset());
  if (keepSession && session && useAuthStore.getState().getUserById(session.userId)) {
    useAuthStore.getState().setSession(session);
  }
};

/** Demo-data stores plus device settings: everything that must load before first render. */
export const hydratableStores = [...persistedStores, useSettingsStore] as const;

export const areStoresHydrated = (): boolean =>
  hydratableStores.every((store) => store.persist.hasHydrated());
