import type { ViewStyle } from 'react-native';

type Shadow = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export type ShadowKey = 'none' | 'sm' | 'md' | 'lg';
export type Shadows = Record<ShadowKey, Shadow>;

/** Soft, low-contrast shadows. Dark mode relies more on surface colour than shadow. */
export const createShadows = (shadowColor: string, isDark: boolean): Shadows => {
  const strength = isDark ? 2.2 : 1;
  return {
    none: { shadowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    sm: { shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05 * strength, shadowRadius: 4, elevation: 1 },
    md: { shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08 * strength, shadowRadius: 12, elevation: 3 },
    lg: { shadowColor, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12 * strength, shadowRadius: 24, elevation: 8 },
  };
};
