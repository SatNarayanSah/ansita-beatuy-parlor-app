import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { getToneColors, useTheme, type Tone } from '@/theme';

export interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  tone?: Tone;
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Thin rounded bar that animates to its value (fee paid, attendance, booking steps). */
export const ProgressBar = ({ value, tone = 'primary', height = 8, accessibilityLabel, style }: ProgressBarProps) => {
  const { colors } = useTheme();
  const { fg, bg } = getToneColors(colors, tone);
  const clamped = Math.min(1, Math.max(0, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(clamped, { duration: 450 }));
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: bg, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: fg }, fillStyle]} />
    </View>
  );
};
