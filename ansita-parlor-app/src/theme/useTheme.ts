import { useContext, useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

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

// React Native 0.80+ no longer exports `StyleSheet.NamedStyles`.
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Creates a hook returning theme-aware styles, rebuilt only when the scheme changes.
 *
 * const useStyles = makeStyles((t) => ({ box: { backgroundColor: t.colors.surface } }));
 */
export const makeStyles =
  <T extends NamedStyles<T>>(factory: (theme: Theme) => T) =>
  (): T => {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
