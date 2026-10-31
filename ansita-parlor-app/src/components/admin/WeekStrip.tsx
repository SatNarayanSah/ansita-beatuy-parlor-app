import { addDays, format, startOfWeek } from 'date-fns';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { ISODate } from '@/types';
import { addDaysISO, parseISODate, toISODate } from '@/utils/date';

interface WeekStripProps {
  date: ISODate;
  today: ISODate;
  onChange: (date: ISODate) => void;
  /** Bookings per day; days with any get a dot. */
  counts: ReadonlyMap<ISODate, number>;
  /** Days the parlour is closed (holidays); shown struck through. */
  isClosed?: (date: ISODate) => boolean;
}

/** One week of tappable days, like a phone calendar. Arrows move a week at a time. */
export const WeekStrip = ({ date, today, onChange, counts, isClosed }: WeekStripProps) => {
  const { colors, radius, spacing } = useTheme();
  const weekStart = startOfWeek(parseISODate(date), { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.header}>
        <Text variant="h4" style={styles.flex}>
          {format(parseISODate(date), 'MMMM yyyy')}
        </Text>
        {date !== today ? <Button title="Today" size="sm" variant="ghost" leftIcon="today-outline" onPress={() => onChange(today)} /> : null}
        <IconButton icon="chevron-back" accessibilityLabel="Previous week" variant="soft" size={36} onPress={() => onChange(addDaysISO(date, -7))} />
        <IconButton icon="chevron-forward" accessibilityLabel="Next week" variant="soft" size={36} onPress={() => onChange(addDaysISO(date, 7))} />
      </View>
      <View style={[styles.days, { gap: spacing.xs }]}>
        {days.map((day) => {
          const selected = day === date;
          const closed = isClosed?.(day) ?? false;
          const count = counts.get(day) ?? 0;
          const fg = selected ? colors.onPrimary : closed ? colors.textMuted : colors.text;
          return (
            <Pressable
              key={day}
              onPress={() => onChange(day)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${format(parseISODate(day), 'EEEE d MMMM')}${closed ? ', closed' : ''}, ${count} booking${count === 1 ? '' : 's'}`}
              style={[
                styles.day,
                {
                  borderRadius: radius.md,
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderColor: day === today && !selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text variant="caption" color={fg}>
                {format(parseISODate(day), 'EEE')}
              </Text>
              <Text variant="h4" color={fg} style={closed ? styles.closed : undefined}>
                {format(parseISODate(day), 'd')}
              </Text>
              <View style={[styles.dot, { backgroundColor: count > 0 ? (selected ? colors.onPrimary : colors.primary) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  days: { flexDirection: 'row' },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1, gap: 2 },
  closed: { textDecorationLine: 'line-through' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
