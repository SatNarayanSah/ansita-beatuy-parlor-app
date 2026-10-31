import type { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { CountBadge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { MAX_FONT_SCALE } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

/** `tabBarIcon` helper: outline glyph when idle, filled when active. */
export const tabIcon = (outline: IconName, filled: IconName): NonNullable<BottomTabNavigationOptions['tabBarIcon']> => {
  const TabIcon = ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Icon name={focused ? filled : outline} size={size} color={color} />
  );
  return TabIcon;
};

const ICON_SIZE = 22;
const SPRING = { damping: 16, stiffness: 220 };

interface TabItemProps {
  label: string;
  focused: boolean;
  options: BottomTabNavigationOptions;
  onPress: () => void;
  onLongPress: () => void;
}

const TabItem = ({ label, focused, options, onPress, onLongPress }: TabItemProps) => {
  const { colors, typography, radius } = useTheme();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.set(withSpring(focused ? 1 : 0, SPRING));
  }, [focused, progress]);

  // Soft pill grows in behind the active icon, which lifts slightly.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: 0.5 + progress.value * 0.5 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -progress.value * 1.5 }, { scale: 1 + progress.value * 0.06 }] }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textMuted, colors.primaryDark]),
  }));

  const color = focused ? colors.primaryDark : colors.textMuted;
  const badge = options.tabBarBadge;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, { backgroundColor: colors.primarySoft, borderRadius: radius.pill }, pillStyle]} />
        <Animated.View style={iconStyle}>{options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}</Animated.View>
        {badge !== undefined && badge !== null && badge !== 0 ? (
          <View style={styles.badge} pointerEvents="none">
            <CountBadge count={typeof badge === 'number' ? badge : Number(badge) || 1} />
          </View>
        ) : null}
      </View>
      <Animated.Text numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[typography.caption, styles.label, focused && { fontFamily: typography.label.fontFamily }, labelStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
};

/** Themed bottom tab bar with an animated active pill. */
export const TabBar = ({ state, descriptors, navigation, insets }: BottomTabBarProps) => {
  const { colors, shadows, spacing } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        shadows.lg,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingTop: spacing.sm,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;
        const { options } = descriptor;
        const focused = state.index === index;
        const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);

        const onPress = (): void => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptics.selection();
            navigation.navigate(route.name, route.params);
          }
        };
        const onLongPress = (): void => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return <TabItem key={route.key} label={label} focused={focused} options={options} onPress={onPress} onLongPress={onLongPress} />;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48 },
  iconWrap: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  badge: { position: 'absolute', top: -2, right: 8 },
  label: { fontSize: 11, lineHeight: 14 },
});
