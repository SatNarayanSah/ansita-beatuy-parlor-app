import { darkColors, lightColors, type ThemeColors } from './colors';
import { fontFamily } from './fonts';
import { createShadows, type Shadows } from './shadows';
import { minTouchSize, radius, screenPadding, spacing } from './spacing';
import { typography } from './typography';

export type ColorScheme = 'light' | 'dark';

/** User preference; "system" follows the device setting. */
export type ThemeMode = 'system' | ColorScheme;

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: Shadows;
  screenPadding: number;
  minTouchSize: number;
}

const buildTheme = (scheme: ColorScheme): Theme => {
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;
  return {
    scheme,
    isDark,
    colors,
    typography,
    fontFamily,
    spacing,
    radius,
    shadows: createShadows(colors.shadow, isDark),
    screenPadding,
    minTouchSize,
  };
};

/** Built once; theme objects are stable so memoised styles only rebuild on scheme change. */
export const themes: Record<ColorScheme, Theme> = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
};
