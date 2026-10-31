import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { CountBadge } from './Badge';
import { Icon, type IconName } from './Icon';

export type IconButtonVariant = 'ghost' | 'soft' | 'filled' | 'outline';

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  /** Required: icon-only buttons need a spoken label. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: number;
  color?: string;
  disabled?: boolean;
  /** Shows a count bubble (e.g. unread notifications). */
  badgeCount?: number;
  style?: StyleProp<ViewStyle>;
}

export const IconButton = ({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'ghost',
  size = 40,
  color,
  disabled = false,
  badgeCount,
  style,
}: IconButtonProps) => {
  const { colors } = useTheme();

  const background = variant === 'soft' ? colors.primarySoft : variant === 'filled' ? colors.primary : 'transparent';
  const iconColor = color ?? (variant === 'filled' ? colors.onPrimary : variant === 'soft' ? colors.primaryDark : colors.text);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pressed && variant === 'ghost' ? colors.primarySoft : background,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
        },
        pressed && variant !== 'ghost' && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} color={iconColor} />
      {badgeCount !== undefined && badgeCount > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <CountBadge count={badgeCount} />
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  badge: { position: 'absolute', top: -2, right: -2 },
});
