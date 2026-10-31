import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeProvider';
import type { Theme } from './theme';

const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
};

/** The active theme tokens. */
export const useTheme = (): Theme => useThemeContext().theme;

/** Theme mode controls, for the settings toggle. */
export const useThemeMode = (): Omit<ThemeContextValue, 'theme'> => {
  const { mode, setMode, toggle } = useThemeContext();
  return { mode, setMode, toggle };
};
