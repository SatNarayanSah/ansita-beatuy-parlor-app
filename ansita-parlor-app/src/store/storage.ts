import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** AsyncStorage adapter for device preferences. */
export const persistStorage = createJSONStorage(() => AsyncStorage);

/**
 * Keychain / Keystore adapter for the session (user + access token).
 * SecureStore isn't available on web, which falls back to AsyncStorage.
 */
const secureStateStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

export const securePersistStorage = createJSONStorage(() =>
  Platform.OS === 'web' ? AsyncStorage : secureStateStorage,
);

/** Bump when a persisted shape changes incompatibly; older data is then discarded. */
export const STORE_VERSION = 6;

/** SecureStore keys may only contain letters, digits, ".", "-" and "_". */
export const STORAGE_KEYS = {
  auth: 'ansita.auth',
  settings: 'ansita/settings',
} as const;

/** Persist `migrate` handler: any version mismatch resets to the current initial state. */
export const resetOnVersionMismatch = <S>(initialState: S) => (): S => initialState;
