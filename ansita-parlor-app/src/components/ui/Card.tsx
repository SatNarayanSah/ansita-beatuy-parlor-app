import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme, type SpacingKey } from '@/theme';

import { usePressScale } from './usePressScale';

export type CardVariant = 'elevated' | 'outlined' | 'filled';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: SpacingKey;
  /** Makes the whole card tappable with a subtle scale effect. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const Card = ({ children, variant = 'elevated', padding = 'lg', onPress, accessibilityLabel, style }: CardProps) => {
  const { colors, radius, shadows, spacing } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.98);

  const surfaceStyle: ViewStyle = {
    borderRadius: radius.lg,
    padding: spacing[padding],
    backgroundColor: variant === 'filled' ? colors.surfaceAlt : colors.surface,
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor: colors.border,
    ...(variant === 'elevated' ? shadows.md : shadows.none),
  };

  if (!onPress) {
    return <View style={[surfaceStyle, style]}>{children}</View>;
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={surfaceStyle}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
