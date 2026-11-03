import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Uppercase small "overline" style instead of a heading. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SectionHeader = ({ title, subtitle, actionLabel, onAction, compact = false, style }: SectionHeaderProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.titles}>
        <Text variant={compact ? 'overline' : 'h3'} tone={compact ? 'muted' : 'default'} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={10}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text variant="label" tone="primary">
            {actionLabel}
          </Text>
          <Icon name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  titles: { flex: 1, gap: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  pressed: { opacity: 0.6 },
});
