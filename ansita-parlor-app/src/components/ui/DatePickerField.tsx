import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { useTheme, type Theme } from '@/theme';
import type { ISODate } from '@/types';
import { addDaysISO, formatDisplayDate, parseISODate, todayISO, toISODate } from '@/utils/date';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { FieldWrapper } from './FieldWrapper';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface DatePickerFieldProps {
  value: ISODate | null;
  onChange: (date: ISODate | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  minDate?: ISODate;
  maxDate?: ISODate;
  /** Return true to block a specific date (e.g. staff day off). */
  isDateDisabled?: (date: ISODate) => boolean;
  /** Dates to mark with a dot (e.g. days with bookings). */
  markedDates?: readonly ISODate[];
  /** Shows a "Clear" button in the sheet. */
  clearable?: boolean;
  /** Adds year jump buttons, useful for dates of birth. */
  showYearControls?: boolean;
  disabled?: boolean;
  sheetTitle?: string;
  style?: StyleProp<ViewStyle>;
}

interface MarkingProps {
  selected?: boolean;
  marked?: boolean;
  disabled?: boolean;
  disableTouchEvent?: boolean;
  selectedColor?: string;
  dotColor?: string;
}

export const calendarTheme = ({ colors, fontFamily }: Theme) => ({
  calendarBackground: colors.surface,
  backgroundColor: colors.surface,
  textSectionTitleColor: colors.textMuted,
  dayTextColor: colors.text,
  todayTextColor: colors.primary,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors.onPrimary,
  textDisabledColor: colors.border,
  monthTextColor: colors.text,
  arrowColor: colors.primary,
  dotColor: colors.highlight,
  selectedDotColor: colors.onPrimary,
  textDayFontFamily: fontFamily.medium,
  textMonthFontFamily: fontFamily.semibold,
  textDayHeaderFontFamily: fontFamily.semibold,
  textDayFontSize: 15,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 12,
});

/** Read-only field that opens a calendar in a bottom sheet. */
export const DatePickerField = ({
  value,
  onChange,
  label,
  placeholder = 'Select a date',
  required,
  error,
  helperText,
  minDate,
  maxDate,
  isDateDisabled,
  markedDates = [],
  clearable = false,
  showYearControls = false,
  disabled = false,
  sheetTitle,
  style,
}: DatePickerFieldProps) => {
  const theme = useTheme();
  const { colors, radius, spacing } = theme;
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<ISODate>(value ?? todayISO());

  const openSheet = (): void => {
    setVisibleMonth(value ?? (maxDate && maxDate < todayISO() ? maxDate : todayISO()));
    setOpen(true);
  };

  const jumpYears = (years: number): void => {
    const date = parseISODate(visibleMonth);
    date.setFullYear(date.getFullYear() + years);
    let next = toISODate(date);
    if (minDate && next < minDate) next = minDate;
    if (maxDate && next > maxDate) next = maxDate;
    setVisibleMonth(next);
  };

  // Mark a window of days around the visible month so disabled days render correctly.
  const marked = useMemo(() => {
    const result: Record<string, MarkingProps> = {};
    markedDates.forEach((date) => {
      result[date] = { marked: true, dotColor: colors.highlight };
    });
    if (isDateDisabled) {
      const start = addDaysISO(visibleMonth.slice(0, 8) + '01', -7);
      for (let offset = 0; offset < 50; offset += 1) {
        const day = addDaysISO(start, offset);
        if (isDateDisabled(day)) result[day] = { ...result[day], disabled: true, disableTouchEvent: true };
      }
    }
    if (value) result[value] = { ...result[value], selected: true, selectedColor: colors.primary };
    return result;
  }, [markedDates, isDateDisabled, visibleMonth, value, colors]);

  const select = (day: DateData): void => {
    onChange(day.dateString);
    setOpen(false);
  };

  const year = parseISODate(visibleMonth).getFullYear();

  return (
    <FieldWrapper label={label} required={required} error={error} helperText={helperText} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Date'}: ${value ? formatDisplayDate(value) : 'not set'}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={openSheet}
        style={[
          styles.field,
          {
            borderRadius: radius.md,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: disabled ? colors.surfaceAlt : colors.surface,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Icon name="calendar-outline" size={18} color={colors.primary} />
        <Text variant="body" tone={value ? 'default' : 'muted'} style={styles.value}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label ?? 'Select date'}
        footer={
          clearable && value ? (
            <Button
              title="Clear date"
              variant="ghost"
              leftIcon="close-circle-outline"
              onPress={() => {
                onChange(null);
                setOpen(false);
              }}
            />
          ) : undefined
        }
      >
        {showYearControls ? (
          <View style={[styles.yearRow, { marginBottom: spacing.sm }]}>
            <IconButton icon="play-back" accessibilityLabel="Previous year" variant="soft" size={34} onPress={() => jumpYears(-1)} />
            <Text variant="h3">{year}</Text>
            <IconButton icon="play-forward" accessibilityLabel="Next year" variant="soft" size={34} onPress={() => jumpYears(1)} />
          </View>
        ) : null}
        <Calendar
          // Remount when the theme or the jumped-to month changes; the calendar caches both.
          key={`${theme.scheme}-${visibleMonth.slice(0, 7)}`}
          current={visibleMonth}
          minDate={minDate}
          maxDate={maxDate}
          onDayPress={select}
          onMonthChange={(month: DateData) => setVisibleMonth(month.dateString)}
          markedDates={marked}
          firstDay={0}
          enableSwipeMonths
          theme={calendarTheme(theme)}
        />
      </BottomSheet>
    </FieldWrapper>
  );
};

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderWidth: 1 },
  value: { flex: 1 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
});
