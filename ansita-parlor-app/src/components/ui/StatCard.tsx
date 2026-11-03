import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getToneColors, useTheme, type Tone } from '@/theme';

import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: IconName;
  tone?: Tone;
  /** Percentage change vs. previous period; positive is shown as an increase. */
  trend?: number;
  trendLabel?: string;
  caption?: string;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** KPI tile for dashboards. */
export const StatCard = ({
  label,
  value,
  icon,
  tone = 'primary',
  trend,
  trendLabel = 'vs last week',
  caption,
  loading = false,
  onPress,
  style,
}: StatCardProps) => {
  const { colors, radius, spacing } = useTheme();
  const tones = getToneColors(colors, tone);
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <Card onPress={onPress} accessibilityLabel={`${label}: ${value}`} style={style} padding="md">
      <View style={[styles.header, { marginBottom: spacing.sm }]}>
        <Text variant="label" tone="secondary" style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: tones.bg, borderRadius: radius.md }]}>
            <Icon name={icon} size={18} color={tones.fg} />
          </View>
        ) : null}
      </View>

      {loading ? (
        <Skeleton height={28} width="60%" />
      ) : (
        <Text variant="h1" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}

      {trend !== undefined && !loading ? (
        <View style={[styles.trend, { marginTop: spacing.xs }]}>
          <Icon name={trendUp ? 'trending-up' : 'trending-down'} size={14} color={trendUp ? colors.success : colors.danger} />
          <Text variant="caption" tone={trendUp ? 'success' : 'danger'}>
            {trendUp ? '+' : ''}
            {trend}%
          </Text>
          <Text variant="caption" tone="muted">
            {trendLabel}
          </Text>
        </View>
      ) : caption ? (
        <Text variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1 },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
