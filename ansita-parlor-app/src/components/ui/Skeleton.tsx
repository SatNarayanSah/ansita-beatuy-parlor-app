import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block shown while data loads. */
export const Skeleton = ({ width = '100%', height = 14, radius, circle = false, style }: SkeletonProps) => {
  const { colors, radius: radii } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(progress);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.55 + progress.value * 0.45 }));
  const size = circle && typeof height === 'number' ? height : undefined;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size ?? width,
          height,
          borderRadius: circle && size ? size / 2 : (radius ?? radii.sm),
          backgroundColor: colors.skeletonHighlight,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

/** Several text-like lines; the last one is shorter. */
export const SkeletonText = ({ lines = 3, style }: { lines?: number; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.text, style]}>
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton key={index} height={12} width={index === lines - 1 && lines > 1 ? '60%' : '100%'} />
    ))}
  </View>
);

/** Placeholder matching ListItem with an avatar. */
export const SkeletonListItem = ({ style }: { style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.listItem, style]}>
    <Skeleton circle height={44} />
    <View style={styles.listBody}>
      <Skeleton height={14} width="55%" />
      <Skeleton height={11} width="35%" />
    </View>
    <Skeleton height={22} width={64} radius={11} />
  </View>
);

/** Placeholder matching a content Card. */
export const SkeletonCard = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderColor: colors.border, borderWidth: 1 },
        style,
      ]}
    >
      <View style={styles.listItem}>
        <Skeleton circle height={40} />
        <View style={styles.listBody}>
          <Skeleton height={14} width="50%" />
          <Skeleton height={11} width="30%" />
        </View>
      </View>
      <SkeletonText lines={2} />
    </View>
  );
};

const styles = StyleSheet.create({
  text: { gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  listBody: { flex: 1, gap: 8 },
});
