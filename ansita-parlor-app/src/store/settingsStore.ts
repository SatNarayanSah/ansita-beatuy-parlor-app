import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ThemeMode } from '@/theme/theme';

import { persistStorage, resetOnVersionMismatch, STORE_VERSION } from './storage';

interface SettingsData {
  themeMode: ThemeMode;
  /** Onboarding slides are shown once per install. */
  hasSeenOnboarding: boolean;
}

interface SettingsActions {
  setThemeMode: (mode: ThemeMode) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
}

export type SettingsState = SettingsData & SettingsActions;

const createInitialData = (): SettingsData => ({ themeMode: 'system', hasSeenOnboarding: false });

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
    }),
    {
      name: 'ansita/settings',
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ themeMode, hasSeenOnboarding }): SettingsData => ({ themeMode, hasSeenOnboarding }),
    },
  ),
);
