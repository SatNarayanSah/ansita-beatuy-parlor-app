import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ID, PaymentMethod } from '@/types';
import type { ThemeMode } from '@/theme/theme';

import { persistStorage, resetOnVersionMismatch, STORE_VERSION } from './storage';

export type Language = 'en' | 'ne';

export type ReminderTiming = '1h' | '1d' | 'both';

/** Booking preferences saved on this device; the booking flow pre-fills from them. */
export interface CustomerPreferences {
  favoriteStaffId: ID | null;
  paymentMethod: PaymentMethod;
  reminder: ReminderTiming;
  offerAlerts: boolean;
}

interface SettingsData {
  themeMode: ThemeMode;
  /** Onboarding slides are shown once per install. */
  hasSeenOnboarding: boolean;
  language: Language;
  preferences: CustomerPreferences;
  hapticsEnabled: boolean;
}

interface SettingsActions {
  setThemeMode: (mode: ThemeMode) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setLanguage: (language: Language) => void;
  updatePreferences: (patch: Partial<CustomerPreferences>) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

export type SettingsState = SettingsData & SettingsActions;

const createInitialData = (): SettingsData => ({
  themeMode: 'system',
  hasSeenOnboarding: false,
  language: 'en',
  preferences: { favoriteStaffId: null, paymentMethod: 'cash', reminder: '1d', offerAlerts: true },
  hapticsEnabled: true,
});

/**
 * Device-level preferences. Not part of the demo data, so "Reset demo data"
 * leaves them untouched.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...createInitialData(),
      setThemeMode: (themeMode) => set({ themeMode }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setLanguage: (language) => set({ language }),
      updatePreferences: (patch) => set((state) => ({ preferences: { ...state.preferences, ...patch } })),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: 'ansita/settings',
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ themeMode, hasSeenOnboarding, language, preferences, hapticsEnabled }): SettingsData => ({
        themeMode,
        hasSeenOnboarding,
        language,
        preferences,
        hapticsEnabled,
      }),
    },
  ),
);
