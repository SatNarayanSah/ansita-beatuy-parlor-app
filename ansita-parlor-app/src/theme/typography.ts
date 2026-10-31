import type { TextStyle } from 'react-native';

import { fontFamily } from './fonts';

type TypeStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'>;

/**
 * Type scale: Playfair Display for display/h1/h2 (editorial, elegant),
 * Inter for everything else (clean, readable at small sizes).
 */
export const typography = {
  display: { fontFamily: fontFamily.headingBold, fontSize: 32, lineHeight: 40 },
  h1: { fontFamily: fontFamily.headingBold, fontSize: 26, lineHeight: 34 },
  h2: { fontFamily: fontFamily.headingSemibold, fontSize: 21, lineHeight: 28 },
  h3: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 24 },
  h4: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 },
  buttonSmall: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;
