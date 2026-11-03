import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
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

const SHIMMER_MS = 1200;

/** Placeholder block with a light sweeping across it. Static when the OS asks for reduced motion. */
export const Skeleton = ({ width = '100%', height = 14, radius, circle = false, style }: SkeletonProps) => {
  const { colors, radius: radii, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const [blockWidth, setBlockWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || blockWidth === 0) return undefined;
    progress.set(0);
    progress.set(withRepeat(withTiming(1, { duration: SHIMMER_MS, easing: Easing.inOut(Easing.ease) }), -1, false));
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion, blockWidth]);

  // The highlight band travels from fully left of the block to fully right of it.
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -blockWidth + progress.value * blockWidth * 2 }],
  }));

  const size = circle && typeof height === 'number' ? height : undefined;
  const highlight = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event: LayoutChangeEvent) => setBlockWidth(event.nativeEvent.layout.width)}
      style={[
        {
          width: size ?? width,
          height,
          borderRadius: circle && size ? size / 2 : (radius ?? radii.sm),
          backgroundColor: colors.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {reduceMotion ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', highlight, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
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
        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderColor: colors.border, borderWidth: 1 },
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
