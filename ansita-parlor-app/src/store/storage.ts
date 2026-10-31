import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** AsyncStorage adapter shared by every persisted store. */
export const persistStorage = createJSONStorage(() => AsyncStorage);

/**
 * Bump when a persisted shape changes incompatibly. Older persisted data is
 * then discarded and the store falls back to fresh seed data.
 */
export const STORE_VERSION = 3;

export const STORAGE_KEYS = {
  auth: 'ansita/auth',
  customers: 'ansita/customers',
  services: 'ansita/services',
  staff: 'ansita/staff',
  appointments: 'ansita/appointments',
  courses: 'ansita/courses',
  notifications: 'ansita/notifications',
  reviews: 'ansita/reviews',
  offers: 'ansita/offers',
} as const;

/** Persist `migrate` handler: any version mismatch resets to the current initial state. */
export const resetOnVersionMismatch = <S>(initialState: S) => (): S => initialState;
