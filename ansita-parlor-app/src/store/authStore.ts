import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { User } from '@/types';

import { resetOnVersionMismatch, securePersistStorage, STORAGE_KEYS, STORE_VERSION } from './storage';

interface AuthData {
  /** The signed-in account, as last returned by the server. */
  user: User | null;
  /** Bearer token for API requests. */
  token: string | null;
}

interface AuthActions {
  setSession: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearSession: () => void;
}

export type AuthState = AuthData & AuthActions;

const initialData: AuthData = { user: null, token: null };

/** The signed-in session, kept in the device's secure storage so the app stays signed in. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialData,
      setSession: (user, token) => set({ user, token }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearSession: () => set(initialData),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: securePersistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(initialData),
      partialize: ({ user, token }): AuthData => ({ user, token }),
    },
  ),
);

// ---------- Selectors ----------

export const selectCurrentUser = (state: AuthData): User | null => (state.token ? state.user : null);
