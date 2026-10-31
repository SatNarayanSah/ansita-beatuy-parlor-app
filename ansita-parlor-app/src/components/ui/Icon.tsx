import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { useTheme } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  /** Defaults to the theme's primary text colour. */
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Ionicons with a theme-aware default colour. */
export const Icon = ({ name, size = 20, color, style }: IconProps) => {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} style={style} />;
};

/** Narrows a free-form string (e.g. stored category icon) to a valid glyph. */
export const isIconName = (value: string): value is IconName => value in Ionicons.glyphMap;
