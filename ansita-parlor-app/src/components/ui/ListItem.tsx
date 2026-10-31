import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getToneColors, useTheme, type Tone } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Third line, e.g. notes or a timestamp. */
  description?: string;
  /** Custom leading node (Avatar, flag, image). Takes precedence over `leftIcon`. */
  left?: ReactNode;
  leftIcon?: IconName;
  leftIconTone?: Tone;
  /** Custom trailing node (Badge, Switch, checkmark). */
  right?: ReactNode;
  /** Short trailing text such as a price or time. */
  rightText?: string;
  showChevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Renders the title in the danger colour, e.g. "Sign out". */
  destructive?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ListItem = ({
  title,
  subtitle,
  description,
  left,
  leftIcon,
  leftIconTone = 'primary',
  right,
  rightText,
  showChevron = false,
  onPress,
  onLongPress,
  disabled = false,
  destructive = false,
  compact = false,
  style,
}: ListItemProps) => {
  const { colors, radius, spacing } = useTheme();
  const tone = getToneColors(colors, destructive ? 'danger' : leftIconTone);

  const leading =
    left ??
    (leftIcon ? (
      <View style={[styles.iconBox, { backgroundColor: tone.bg, borderRadius: radius.md }]}>
        <Icon name={leftIcon} size={20} color={tone.fg} />
      </View>
    ) : null);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || (!onPress && !onLongPress)}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: compact ? spacing.sm : spacing.md, gap: spacing.md },
        pressed && { backgroundColor: colors.surfaceAlt },
        disabled && styles.disabled,
        style,
      ]}
    >
      {leading}
      <View style={styles.body}>
        <Text variant="bodyMedium" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {description ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {rightText ? (
        <Text variant="label" tone="secondary">
          {rightText}
        </Text>
      ) : null}
      {right}
      {showChevron ? <Icon name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 1 },
  disabled: { opacity: 0.45 },
});
