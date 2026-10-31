import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Small number after the label, e.g. result count. */
  count?: number;
  /** Shows an "x" that calls this, for removable tags. */
  onRemove?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Chip = ({ label, selected = false, onPress, icon, count, onRemove, disabled = false, style }: ChipProps) => {
  const { colors, radius } = useTheme();
  const fg = selected ? colors.onPrimary : colors.text;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      onPress={
        onPress
          ? () => {
              haptics.selection();
              onPress();
            }
          : undefined
      }
      disabled={disabled || !onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : pressed ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={15} color={selected ? colors.onPrimary : colors.primary} /> : null}
      <Text variant="label" color={fg}>
        {label}
      </Text>
      {count !== undefined ? (
        <View style={[styles.count, { backgroundColor: selected ? colors.primaryDark : colors.surfaceAlt }]}>
          <Text variant="caption" color={selected ? colors.onPrimary : colors.textSecondary}>
            {count}
          </Text>
        </View>
      ) : null}
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label}`} onPress={onRemove} hitSlop={8}>
          <Icon name="close" size={15} color={fg} />
        </Pressable>
      ) : null}
    </Pressable>
  );
};

// ---------- FilterChips ----------

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  count?: number;
}

// `NoInfer` makes T come from `options` alone; inferring it through the union props widens it to string.
interface FilterChipsBaseProps<T extends string> {
  options: readonly FilterOption<T>[];
  style?: StyleProp<ViewStyle>;
  /** Horizontal scroll (default) or wrapping rows. */
  layout?: 'scroll' | 'wrap';
}

interface SingleFilterChipsProps<T extends string> extends FilterChipsBaseProps<T> {
  multiple?: false;
  value: NoInfer<T> | null;
  onChange: (value: NoInfer<T> | null) => void;
  /** Adds a leading "All" chip that clears the selection. */
  allLabel?: string;
}

interface MultiFilterChipsProps<T extends string> extends FilterChipsBaseProps<T> {
  multiple: true;
  value: readonly NoInfer<T>[];
  onChange: (value: NoInfer<T>[]) => void;
}

export type FilterChipsProps<T extends string> = SingleFilterChipsProps<T> | MultiFilterChipsProps<T>;

/** A row of selectable chips for single- or multi-select filters. */
export const FilterChips = <T extends string>(props: FilterChipsProps<T>) => {
  const { spacing } = useTheme();
  const { options, style, layout = 'scroll' } = props;

  const isSelected = (option: T): boolean =>
    props.multiple ? props.value.includes(option) : props.value === option;

  const toggle = (option: T): void => {
    if (props.multiple) {
      props.onChange(
        props.value.includes(option) ? props.value.filter((item) => item !== option) : [...props.value, option],
      );
    } else {
      props.onChange(props.value === option ? null : option);
    }
  };

  const chips = (
    <>
      {!props.multiple && props.allLabel ? (
        <Chip label={props.allLabel} selected={props.value === null} onPress={() => props.onChange(null)} />
      ) : null}
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          icon={option.icon}
          count={option.count}
          selected={isSelected(option.value)}
          onPress={() => toggle(option.value)}
        />
      ))}
    </>
  );

  if (layout === 'wrap') {
    return <View style={[styles.wrap, { gap: spacing.sm }, style]}>{chips}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { gap: spacing.sm }]}
      style={style}
    >
      {chips}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderWidth: 1,
  },
  count: { minWidth: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  row: { alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
