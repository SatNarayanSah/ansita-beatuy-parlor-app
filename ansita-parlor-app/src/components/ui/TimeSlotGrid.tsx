import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { TimeSlot, TimeString } from '@/types';
import { formatTime12, timeToMinutes } from '@/utils/date';

import { Icon, type IconName } from './Icon';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export interface TimeSlotGridProps {
  slots: readonly TimeSlot[];
  value: TimeString | null;
  onChange: (time: TimeString) => void;
  loading?: boolean;
  columns?: number;
  /** Groups slots under Morning / Afternoon / Evening headings. */
  groupByPeriod?: boolean;
  emptyMessage?: string;
  style?: StyleProp<ViewStyle>;
}

interface Period {
  key: string;
  label: string;
  icon: IconName;
  slots: TimeSlot[];
}

const groupSlots = (slots: readonly TimeSlot[]): Period[] => {
  const periods: Period[] = [
    { key: 'morning', label: 'Morning', icon: 'partly-sunny-outline', slots: [] },
    { key: 'afternoon', label: 'Afternoon', icon: 'sunny-outline', slots: [] },
    { key: 'evening', label: 'Evening', icon: 'moon-outline', slots: [] },
  ];
  slots.forEach((slot) => {
    const minutes = timeToMinutes(slot.time);
    const index = minutes < 12 * 60 ? 0 : minutes < 17 * 60 ? 1 : 2;
    periods[index]?.slots.push(slot);
  });
  return periods.filter((period) => period.slots.length > 0);
};

/** Selectable grid of appointment start times; unavailable slots are struck through. */
export const TimeSlotGrid = ({
  slots,
  value,
  onChange,
  loading = false,
  columns = 4,
  groupByPeriod = true,
  emptyMessage = 'No slots available on this day.',
  style,
}: TimeSlotGridProps) => {
  const { colors, radius, spacing } = useTheme();
  const itemWidth = `${100 / columns}%` as const;

  if (loading) {
    return (
      <View style={[styles.grid, style]}>
        {Array.from({ length: columns * 3 }, (_, index) => (
          <View key={index} style={[styles.cell, { width: itemWidth }]}>
            <Skeleton height={42} radius={radius.md} />
          </View>
        ))}
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg }, style]}>
        <Icon name="time-outline" size={18} color={colors.textMuted} />
        <Text variant="bodySmall" tone="secondary">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const renderSlot = (slot: TimeSlot) => {
    const selected = slot.time === value;
    const label = formatTime12(slot.time);
    return (
      <View key={slot.time} style={[styles.cell, { width: itemWidth }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={slot.available ? label : `${label}, unavailable`}
          accessibilityState={{ selected, disabled: !slot.available }}
          disabled={!slot.available}
          onPress={() => onChange(slot.time)}
          style={({ pressed }) => [
            styles.slot,
            {
              borderRadius: radius.md,
              backgroundColor: selected ? colors.primary : slot.available ? (pressed ? colors.primarySoft : colors.surface) : colors.surfaceAlt,
              borderColor: selected ? colors.primary : slot.available ? colors.border : colors.surfaceAlt,
            },
          ]}
        >
          <Text
            variant="label"
            color={selected ? colors.onPrimary : slot.available ? colors.text : colors.textMuted}
            style={!slot.available && styles.unavailable}
          >
            {label}
          </Text>
        </Pressable>
      </View>
    );
  };

  if (!groupByPeriod) {
    return <View style={[styles.grid, style]}>{slots.map(renderSlot)}</View>;
  }

  return (
    <View style={[{ gap: spacing.lg }, style]}>
      {groupSlots(slots).map((period) => {
        const free = period.slots.filter((slot) => slot.available).length;
        return (
          <View key={period.key} style={{ gap: spacing.sm }}>
            <View style={styles.periodHeader}>
              <Icon name={period.icon} size={16} color={colors.highlight} />
              <Text variant="label">{period.label}</Text>
              <Text variant="caption" tone="muted">
                {free} available
              </Text>
            </View>
            <View style={styles.grid}>{period.slots.map(renderSlot)}</View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { padding: 4 },
  slot: { height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  unavailable: { textDecorationLine: 'line-through' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  periodHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
