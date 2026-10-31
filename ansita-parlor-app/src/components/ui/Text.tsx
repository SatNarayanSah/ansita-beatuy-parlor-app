import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme, type ThemeColors, type TypographyVariant } from '@/theme';

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'primary'
  | 'accent'
  | 'highlight'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'inverse'
  | 'onPrimary';

const toneColor = (colors: ThemeColors, tone: TextTone): string => {
  switch (tone) {
    case 'default':
      return colors.text;
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'primary':
      return colors.primary;
    case 'accent':
      return colors.accent;
    case 'highlight':
      return colors.highlightText;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'info':
      return colors.info;
    case 'inverse':
      return colors.textInverse;
    case 'onPrimary':
      return colors.onPrimary;
  }
};

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** Overrides `tone` with an explicit colour. */
  color?: string;
  align?: TextStyle['textAlign'];
}

/** Themed text. Always use this instead of React Native's Text. */
/** Large accessibility font sizes scale up to this factor; beyond it layouts would break. */
export const MAX_FONT_SCALE = 1.5;

export const Text = ({ variant = 'body', tone = 'default', color, align, style, ...rest }: TextProps) => {
  const { colors, typography } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[typography[variant], { color: color ?? toneColor(colors, tone) }, align ? { textAlign: align } : null, style]}
    />
  );
};
