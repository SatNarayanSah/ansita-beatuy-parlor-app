import { useEffect } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface FABProps {
  onPress: () => void;
  icon?: IconName;
  /** Extended FAB with a text label. */
  label?: string;
  accessibilityLabel?: string;
  /** Animate out (e.g. while scrolling down). */
  visible?: boolean;
  tone?: 'primary' | 'accent';
  /** Extra distance from the bottom, e.g. to clear a tab bar. */
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
}

/** Floating action button anchored bottom-right, above the safe area. */
export const FAB = ({
  onPress,
  icon = 'add',
  label,
  accessibilityLabel,
  visible = true,
  tone = 'primary',
  bottomOffset = 0,
  style,
}: FABProps) => {
  const { colors, radius, shadows, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const shown = useSharedValue(visible ? 1 : 0);
  const pressed = useSharedValue(1);

  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, shown]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 80 }, { scale: pressed.value }],
  }));

  const background = tone === 'accent' ? colors.accent : colors.primary;
  const foreground = tone === 'accent' ? colors.onAccent : colors.onPrimary;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.container, { right: spacing.xl, bottom: insets.bottom + spacing.xl + bottomOffset }, animatedStyle, style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? 'Add'}
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        onPressIn={() => {
          pressed.value = withTiming(0.94, { duration: 90 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(1);
        }}
        style={[
          styles.button,
          shadows.lg,
          {
            backgroundColor: background,
            borderRadius: label ? radius.xl : 30,
            paddingHorizontal: label ? spacing.xl : 0,
            width: label ? undefined : 58,
          },
        ]}
      >
        <Icon name={icon} size={26} color={foreground} />
        {label ? (
          <Text variant="button" color={foreground}>
            {label}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute' },
  button: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
