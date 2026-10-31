import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme, type Theme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { usePressScale } from './usePressScale';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

interface VariantColors {
  background: string;
  pressedBackground: string;
  border: string;
  text: string;
}

const variantColors = ({ colors }: Theme, variant: ButtonVariant): VariantColors => {
  switch (variant) {
    case 'primary':
      return { background: colors.primary, pressedBackground: colors.primaryDark, border: colors.primary, text: colors.onPrimary };
    case 'secondary':
      return { background: colors.primarySoft, pressedBackground: colors.primaryMuted, border: colors.primarySoft, text: colors.primaryDark };
    case 'outline':
      return { background: 'transparent', pressedBackground: colors.primarySoft, border: colors.primary, text: colors.primary };
    case 'ghost':
      return { background: 'transparent', pressedBackground: colors.primarySoft, border: 'transparent', text: colors.primary };
    case 'danger':
      return { background: colors.danger, pressedBackground: colors.danger, border: colors.danger, text: colors.textInverse };
  }
};

const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; iconSize: number }> = {
  sm: { height: 36, paddingHorizontal: 14, iconSize: 16 },
  md: { height: 48, paddingHorizontal: 20, iconSize: 18 },
  lg: { height: 56, paddingHorizontal: 24, iconSize: 20 },
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const palette = variantColors(theme, variant);
  const dimensions = SIZES[size];
  const inactive = disabled || loading;
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View style={[styles.wrapper, fullWidth && styles.fullWidth, disabled && styles.disabled, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: inactive, busy: loading }}
        testID={testID}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inactive}
        // Small buttons are 36pt tall; extend the touch area to the 44pt minimum.
        hitSlop={dimensions.height < 44 ? (44 - dimensions.height) / 2 : undefined}
        style={({ pressed }) => [
          styles.base,
          {
            height: dimensions.height,
            paddingHorizontal: dimensions.paddingHorizontal,
            borderRadius: theme.radius.md,
            backgroundColor: pressed ? palette.pressedBackground : palette.background,
            borderColor: palette.border,
          },
        ]}
      >
        {/* Keep the label in the layout while loading so the button width stays stable. */}
        <View style={[styles.content, loading && styles.hidden]}>
          {leftIcon ? <Icon name={leftIcon} size={dimensions.iconSize} color={palette.text} /> : null}
          <Text variant={size === 'sm' ? 'buttonSmall' : 'button'} color={palette.text} numberOfLines={1}>
            {title}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size={dimensions.iconSize} color={palette.text} /> : null}
        </View>
        {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={palette.text} /> : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'flex-start' },
  base: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hidden: { opacity: 0 },
  disabled: { opacity: 0.45 },
});
