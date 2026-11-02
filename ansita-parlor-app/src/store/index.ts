import { useAppointmentStore } from './appointmentStore';
import { useAuthStore } from './authStore';
import { useBusinessStore } from './businessStore';
import { useCourseStore } from './courseStore';
import { useCustomerStore } from './customerStore';
import { useNotificationStore } from './notificationStore';
import { useOfferStore } from './offerStore';
import { usePaymentRequestStore } from './paymentRequestStore';
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
export * from './paymentRequestStore';
export * from './reviewStore';
export * from './serviceStore';
export * from './settingsStore';
export * from './staffStore';

/** In-memory caches of server data. Cleared on sign-out so the next account starts clean. */
export const cacheStores = [
  useCustomerStore,
  useServiceStore,
  useStaffStore,
  useAppointmentStore,
  useCourseStore,
  useNotificationStore,
  useReviewStore,
  useOfferStore,
  useBusinessStore,
  usePaymentRequestStore,
] as const;

export const resetCacheStores = (): void => {
  cacheStores.forEach((store) => store.getState().reset());
};

/** Stores saved on the device (session and preferences): these must load before first render. */
export const hydratableStores = [useAuthStore, useSettingsStore] as const;

export const areStoresHydrated = (): boolean =>
  hydratableStores.every((store) => store.persist.hasHydrated());
