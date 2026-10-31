import { createContext, useCallback, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

import { themes, type ColorScheme, type Theme, type ThemeMode } from './theme';

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

/** Resolves the active theme from the saved preference and the device scheme. */
export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const deviceScheme = useColorScheme();
  const mode = useSettingsStore((state) => state.themeMode);
  const setMode = useSettingsStore((state) => state.setThemeMode);

  const scheme: ColorScheme = mode === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : mode;
  const theme = themes[scheme];

  const toggle = useCallback(() => setMode(scheme === 'dark' ? 'light' : 'dark'), [scheme, setMode]);

  const value = useMemo<ThemeContextValue>(() => ({ theme, mode, setMode, toggle }), [theme, mode, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
