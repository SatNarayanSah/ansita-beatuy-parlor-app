import type { TextStyle } from 'react-native';

import { fontFamily } from './fonts';

type TypeStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'>;

/**
 * Type scale in Poppins. Line heights are generous (~1.5x) so Devanagari
 * matras above and below the line are never clipped.
 */
export const typography = {
  display: { fontFamily: fontFamily.headingBold, fontSize: 30, lineHeight: 42, letterSpacing: -0.3 },
  h1: { fontFamily: fontFamily.headingBold, fontSize: 24, lineHeight: 34, letterSpacing: -0.2 },
  h2: { fontFamily: fontFamily.headingSemibold, fontSize: 20, lineHeight: 30 },
  h3: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 26 },
  h4: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 23 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 23 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 20 },
  button: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 22, letterSpacing: 0.2 },
  buttonSmall: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 20, letterSpacing: 0.2 },
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;
