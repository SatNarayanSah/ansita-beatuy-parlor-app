import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text, type IconName } from '@/components/ui';
import { getToneColors, useTheme } from '@/theme';

interface ComingSoonProps {
  icon: IconName;
  title: string;
  description: string;
  /** What the finished screen will offer. */
  features: readonly string[];
  /** e.g. "Phase 6" or "a later phase". */
  phase: string;
}

/** Placeholder card for tabs that are routed but built in a later phase. */
export const ComingSoon = ({ icon, title, description, features, phase }: ComingSoonProps) => {
  const { colors, spacing, radius } = useTheme();
  const tone = getToneColors(colors, 'primary');

  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: tone.bg, borderRadius: radius.lg }]}>
          <Icon name={icon} size={26} color={tone.fg} />
        </View>
        <View style={styles.flex}>
          <Text variant="h3">{title}</Text>
          <Badge label={`Coming in ${phase}`} tone="highlight" size="sm" icon="construct-outline" />
        </View>
      </View>
      <Text variant="body" tone="secondary">
        {description}
      </Text>
      <View style={{ gap: spacing.sm }}>
        {features.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Icon name="checkmark-circle" size={18} color={colors.success} />
            <Text variant="bodySmall" style={styles.flex}>
              {feature}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 4 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});
