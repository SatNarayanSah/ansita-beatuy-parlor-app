import { createContext, useMemo, type ReactNode } from 'react';

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

/**
 * The app is light-only by design, whatever the phone's setting. The dark
 * tokens stay in `colors.ts` so a dark mode can be switched back on later by
 * resolving `scheme` from the saved preference again.
 */
const SCHEME: ColorScheme = 'light';

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const setMode = useSettingsStore((state) => state.setThemeMode);
  const theme = themes[SCHEME];

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode: SCHEME, setMode, toggle: () => undefined }),
    [theme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
