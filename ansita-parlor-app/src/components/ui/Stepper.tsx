import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export interface StepperProps {
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
  style?: StyleProp<ViewStyle>;
}

/** Numbered step indicator with an animated progress line, e.g. for the booking flow. */
export const Stepper = ({ steps, current, style }: StepperProps) => {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const fraction = steps.length > 1 ? current / (steps.length - 1) : 0;

  useEffect(() => {
    progress.value = withTiming(fraction, { duration: 350 });
  }, [fraction, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={style} accessibilityRole="progressbar" accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current] ?? ''}`}>
      <View style={styles.track}>
        {/* The line runs between the first and last dot centres. */}
        <View style={[styles.line, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.lineFill, { backgroundColor: colors.primary }, fillStyle]} />
        </View>
        {steps.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done || active ? colors.primary : colors.surface,
                    borderColor: done || active ? colors.primary : colors.borderStrong,
                  },
                  active && { transform: [{ scale: 1.15 }] },
                ]}
              >
                {done ? (
                  <Icon name="checkmark" size={14} color={colors.onPrimary} />
                ) : (
                  <Text variant="caption" color={active ? colors.onPrimary : colors.textMuted} style={styles.number}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text variant={active ? 'label' : 'caption'} tone={active ? 'primary' : done ? 'secondary' : 'muted'} numberOfLines={1} style={styles.label}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const DOT = 26;

const styles = StyleSheet.create({
  track: { flexDirection: 'row', justifyContent: 'space-between' },
  line: { position: 'absolute', top: DOT / 2 - 1, left: '10%', right: '10%', height: 2, borderRadius: 1 },
  lineFill: { height: 2, borderRadius: 1 },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 12, lineHeight: 14 },
  label: { fontSize: 11, lineHeight: 14 },
});
