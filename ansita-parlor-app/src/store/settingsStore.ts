import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ThemeMode } from '@/theme/theme';

import { persistStorage, resetOnVersionMismatch, STORE_VERSION } from './storage';

interface SettingsData {
  themeMode: ThemeMode;
}

interface SettingsActions {
  setThemeMode: (mode: ThemeMode) => void;
}

export type SettingsState = SettingsData & SettingsActions;

const createInitialData = (): SettingsData => ({ themeMode: 'system' });

/**
 * Device-level preferences. Not part of the demo data, so "Reset demo data"
 * leaves them untouched.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...createInitialData(),
      setThemeMode: (themeMode) => set({ themeMode }),
    }),
    {
      name: 'ansita/settings',
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ themeMode }): SettingsData => ({ themeMode }),
    },
  ),
);
