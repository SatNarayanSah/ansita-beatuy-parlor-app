import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface RatingStarsProps {
  value: number;
  max?: number;
  size?: number;
  /** Makes the stars tappable. Display-only when omitted. */
  onChange?: (value: number) => void;
  /** Shows "4.7" after the stars. */
  showValue?: boolean;
  /** Shows "(23)" review count after the value. */
  count?: number;
  style?: StyleProp<ViewStyle>;
}

const starIcon = (position: number, value: number): IconName => {
  if (value >= position) return 'star';
  if (value >= position - 0.5) return 'star-half';
  return 'star-outline';
};

export const RatingStars = ({ value, max = 5, size = 18, onChange, showValue = false, count, style }: RatingStarsProps) => {
  const { colors } = useTheme();
  const interactive = onChange !== undefined;
  // Display ratings round to the nearest half star.
  const shown = interactive ? value : Math.round(value * 2) / 2;

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole={interactive ? 'adjustable' : 'text'}
      accessibilityLabel={`Rating ${value} out of ${max}`}
      accessibilityValue={interactive ? { min: 0, max, now: value } : undefined}
      accessibilityActions={interactive ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={(event) => {
        if (!onChange) return;
        if (event.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + 1));
        if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(1, value - 1));
      }}
    >
      {Array.from({ length: max }, (_, index) => {
        const position = index + 1;
        const icon = <Icon name={starIcon(position, shown)} size={size} color={colors.highlight} />;
        return interactive ? (
          <Pressable
            key={position}
            onPress={() => onChange(position)}
            hitSlop={6}
            importantForAccessibility="no"
            style={({ pressed }) => pressed && styles.pressed}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={position}>{icon}</View>
        );
      })}
      {showValue ? (
        <Text variant="label" style={styles.value}>
          {value.toFixed(1)}
        </Text>
      ) : null}
      {count !== undefined ? (
        <Text variant="caption" tone="muted">
          ({count})
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pressed: { transform: [{ scale: 0.88 }] },
  value: { marginLeft: 4 },
});
