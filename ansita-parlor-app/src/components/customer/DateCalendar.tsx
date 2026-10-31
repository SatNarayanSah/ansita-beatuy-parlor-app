import { useMemo } from 'react';
import { Calendar, type DateData } from 'react-native-calendars';

import { calendarTheme } from '@/components/ui/DatePickerField';
import { useTheme } from '@/theme';
import type { ISODate } from '@/types';
import { addDaysISO, todayISO } from '@/utils/date';

interface DateCalendarProps {
  value: ISODate | null;
  onChange: (date: ISODate) => void;
  /** Days that cannot be booked (staff day off). */
  isDisabled: (date: ISODate) => boolean;
  /** How far ahead bookings open. */
  maxDaysAhead?: number;
}

/** Inline booking calendar: today onwards, with days off greyed out. */
export const DateCalendar = ({ value, onChange, isDisabled, maxDaysAhead = 60 }: DateCalendarProps) => {
  const theme = useTheme();
  const today = todayISO();
  const maxDate = addDaysISO(today, maxDaysAhead);

  const marked = useMemo(() => {
    const result: Record<string, { disabled?: boolean; disableTouchEvent?: boolean; selected?: boolean; selectedColor?: string }> = {};
    for (let offset = 0; offset <= maxDaysAhead; offset += 1) {
      const day = addDaysISO(today, offset);
      if (isDisabled(day)) result[day] = { disabled: true, disableTouchEvent: true };
    }
    if (value) result[value] = { ...result[value], selected: true, selectedColor: theme.colors.primary };
    return result;
  }, [isDisabled, maxDaysAhead, today, value, theme.colors.primary]);

  return (
    <Calendar
      key={theme.scheme}
      current={value ?? today}
      minDate={today}
      maxDate={maxDate}
      onDayPress={(day: DateData) => onChange(day.dateString)}
      markedDates={marked}
      enableSwipeMonths
      theme={calendarTheme(theme)}
      style={{ borderRadius: theme.radius.lg }}
    />
  );
};
