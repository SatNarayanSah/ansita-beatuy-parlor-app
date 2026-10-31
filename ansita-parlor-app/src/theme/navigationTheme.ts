import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';

import type { Theme } from './theme';

/** Maps our tokens onto React Navigation's theme (headers, tab bars, backgrounds). */
export const toNavigationTheme = (theme: Theme): NavigationTheme => {
  const base = theme.isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: theme.isDark,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
    fonts: {
      regular: { fontFamily: theme.fontFamily.regular, fontWeight: '400' },
      medium: { fontFamily: theme.fontFamily.medium, fontWeight: '500' },
      bold: { fontFamily: theme.fontFamily.semibold, fontWeight: '600' },
      heavy: { fontFamily: theme.fontFamily.bold, fontWeight: '700' },
    },
  };
};
