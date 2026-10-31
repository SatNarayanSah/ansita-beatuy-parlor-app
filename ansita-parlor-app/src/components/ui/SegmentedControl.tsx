import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** Pill-shaped tab switcher, e.g. Upcoming / Past or Light / Dark / System. */
export const SegmentedControl = <T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) => {
  const { colors, radius, shadows } = useTheme();

  return (
    <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (!selected) haptics.selection();
              onChange(option.value);
            }}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[
              styles.segment,
              { borderRadius: radius.pill },
              selected && [{ backgroundColor: colors.surface }, shadows.sm],
            ]}
          >
            {option.icon ? <Icon name={option.icon} size={15} color={selected ? colors.primary : colors.textSecondary} /> : null}
            <Text variant="label" color={selected ? colors.text : colors.textSecondary}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4 },
  segment: { flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
