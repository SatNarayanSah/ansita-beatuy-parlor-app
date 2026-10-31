import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Chip, EmptyState, IconButton, SearchBar, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { TimeString, Weekday } from '@/types';
import { addMinutesToTime, formatTime12, timeToMinutes } from '@/utils/date';

// ---------- ChipSelect: required single choice ----------

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipSelectProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export const ChipSelect = <T extends string>({ options, value, onChange }: ChipSelectProps<T>) => (
  <View style={styles.wrap}>
    {options.map((option) => (
      <Chip key={option.value} label={option.label} selected={option.value === value} onPress={() => onChange(option.value)} />
    ))}
  </View>
);

// ---------- MultiChipSelect ----------

interface MultiChipSelectProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
}

export const MultiChipSelect = <T extends string>({ options, value, onChange }: MultiChipSelectProps<T>) => (
  <View style={styles.wrap}>
    {options.map((option) => {
      const selected = value.includes(option.value);
      return (
        <Chip
          key={option.value}
          label={option.label}
          selected={selected}
          icon={selected ? 'checkmark' : undefined}
          onPress={() => onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value])}
        />
      );
    })}
  </View>
);

export const WEEKDAY_OPTIONS: readonly ChipOption<Weekday>[] = [
  { value: 'sun', label: 'Sun' },
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
];

// ---------- TimeStepper ----------

interface TimeStepperProps {
  value: TimeString;
  onChange: (time: TimeString) => void;
  min?: TimeString;
  max?: TimeString;
  step?: number;
  label?: string;
  disabled?: boolean;
}

/** "- 10:00 AM +" in 30-minute steps; simpler and more reliable than a wheel on both platforms. */
export const TimeStepper = ({ value, onChange, min = '06:00', max = '22:00', step = 30, label, disabled = false }: TimeStepperProps) => {
  const { colors, radius } = useTheme();
  const minutes = timeToMinutes(value);
  return (
    <View style={styles.stepperWrap}>
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      <View style={[styles.stepper, { borderColor: colors.border, borderRadius: radius.md, opacity: disabled ? 0.45 : 1 }]}>
        <IconButton
          icon="remove"
          size={32}
          accessibilityLabel={`Earlier than ${formatTime12(value)}`}
          disabled={disabled || minutes - step < timeToMinutes(min)}
          onPress={() => onChange(addMinutesToTime(value, -step))}
        />
        <Text variant="label" style={styles.stepperValue}>
          {formatTime12(value)}
        </Text>
        <IconButton
          icon="add"
          size={32}
          accessibilityLabel={`Later than ${formatTime12(value)}`}
          disabled={disabled || minutes + step > timeToMinutes(max)}
          onPress={() => onChange(addMinutesToTime(value, step))}
        />
      </View>
    </View>
  );
};

// ---------- SelectSheet: searchable list ----------

interface SelectSheetProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: readonly T[];
  keyOf: (item: T) => string;
  /** Text searched against. */
  searchText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  /** Extra content above the list, e.g. "Add new customer". */
  header?: ReactNode;
  placeholder?: string;
}

export const SelectSheet = <T,>({ visible, onClose, title, items, keyOf, searchText, renderItem, onSelect, header, placeholder }: SelectSheetProps<T>) => {
  const { spacing } = useTheme();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? items.filter((item) => searchText(item).toLowerCase().includes(needle)) : items;
  }, [items, query, searchText]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.92}>
      <View style={{ gap: spacing.md }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder={placeholder ?? 'Search'} />
        {header}
        {filtered.length === 0 ? (
          <EmptyState compact icon="search-outline" title="No matches" message="Try a different name or number." />
        ) : (
          filtered.slice(0, 60).map((item) => (
            <Pressable
              key={keyOf(item)}
              onPress={() => {
                onSelect(item);
                setQuery('');
              }}
              accessibilityRole="button"
            >
              {renderItem(item)}
            </Pressable>
          ))
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepperWrap: { gap: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 4, height: 46 },
  stepperValue: { flex: 1, textAlign: 'center' },
});
