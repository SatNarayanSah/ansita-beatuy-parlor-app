import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';

/**
 * Font family names. Custom fonts on Android ignore `fontWeight`, so every
 * weight is its own family and text styles pick the family, not a weight.
 */
export const fontFamily = {
  headingSemibold: 'PlayfairDisplay_600SemiBold',
  headingBold: 'PlayfairDisplay_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Passed to `useFonts` at startup. Keys must match `fontFamily` values. */
export const fontAssets = {
  [fontFamily.headingSemibold]: PlayfairDisplay_600SemiBold,
  [fontFamily.headingBold]: PlayfairDisplay_700Bold,
  [fontFamily.regular]: Inter_400Regular,
  [fontFamily.medium]: Inter_500Medium,
  [fontFamily.semibold]: Inter_600SemiBold,
  [fontFamily.bold]: Inter_700Bold,
};

export type FontFamily = (typeof fontFamily)[keyof typeof fontFamily];
