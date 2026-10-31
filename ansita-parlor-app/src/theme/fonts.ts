// Per-weight imports: the package index would bundle all 18 Poppins files.
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';

/**
 * Font family names. Poppins throughout: friendly, modern, and it ships
 * Devanagari glyphs, so Nepali text matches the English UI.
 * Custom fonts on Android ignore `fontWeight`, so every weight is its own
 * family and text styles pick the family, not a weight.
 */
export const fontFamily = {
  headingSemibold: 'Poppins_600SemiBold',
  headingBold: 'Poppins_700Bold',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/** Passed to `useFonts` at startup. Keys must match `fontFamily` values. */
export const fontAssets = {
  [fontFamily.regular]: Poppins_400Regular,
  [fontFamily.medium]: Poppins_500Medium,
  [fontFamily.semibold]: Poppins_600SemiBold,
  [fontFamily.bold]: Poppins_700Bold,
};
