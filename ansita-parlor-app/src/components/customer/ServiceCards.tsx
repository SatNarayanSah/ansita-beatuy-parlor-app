import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, isIconName, RatingStars, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Review, Service, ServiceCategory } from '@/types';
import { formatCurrency, formatDuration, roundRating } from '@/utils/format';

export interface ServiceRating {
  average: number;
  count: number;
}

/** Average rating per service from reviews that include it. */
export const ratingsByService = (reviews: readonly Review[]): Map<string, ServiceRating> => {
  const totals = new Map<string, { sum: number; count: number }>();
  reviews.forEach((review) =>
    review.serviceIds.forEach((id) => {
      const current = totals.get(id) ?? { sum: 0, count: 0 };
      totals.set(id, { sum: current.sum + review.rating, count: current.count + 1 });
    }),
  );
  return new Map([...totals].map(([id, { sum, count }]) => [id, { average: roundRating(sum / count), count }]));
};

/** Tinted square with the category icon; stands in for service photos. */
export const CategoryIcon = ({ category, size = 48 }: { category: ServiceCategory | undefined; size?: number }) => {
  const { colors, radius } = useTheme();
  const color = category?.color ?? colors.primary;
  const icon = category && isIconName(category.icon) ? category.icon : 'sparkles-outline';
  return (
    <View style={[styles.iconBox, { width: size, height: size, borderRadius: radius.md, backgroundColor: `${color}22` }]}>
      <Icon name={icon} size={Math.round(size * 0.48)} color={color} />
    </View>
  );
};

interface ServiceRowProps {
  service: Service;
  category: ServiceCategory | undefined;
  rating?: ServiceRating;
  onPress: () => void;
  /** Multi-select mode in the booking flow. */
  selected?: boolean;
}

/** Full-width service card for lists. */
export const ServiceRow = ({ service, category, rating, onPress, selected }: ServiceRowProps) => {
  const { colors, spacing, radius } = useTheme();
  const selectable = selected !== undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={selectable ? { checked: selected } : undefined}
      accessibilityLabel={`${service.name}, ${formatDuration(service.duration)}, ${formatCurrency(service.price)}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
        },
        pressed && styles.pressed,
      ]}
    >
      <CategoryIcon category={category} />
      <View style={styles.body}>
        <Text variant="h4" numberOfLines={1}>
          {service.name}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {service.description}
        </Text>
        <View style={styles.meta}>
          <Icon name="time-outline" size={13} color={colors.textMuted} />
          <Text variant="caption" tone="muted">
            {formatDuration(service.duration)}
          </Text>
          {rating ? (
            <>
              <Icon name="star" size={12} color={colors.highlight} />
              <Text variant="caption" tone="muted">
                {rating.average} ({rating.count})
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        <Text variant="label" tone="primary">
          {formatCurrency(service.price)}
        </Text>
        {selectable ? (
          <Icon name={selected ? 'checkmark-circle' : 'add-circle-outline'} size={26} color={selected ? colors.primary : colors.textMuted} />
        ) : (
          <Icon name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );
};

interface ServiceTileProps {
  service: Service;
  category: ServiceCategory | undefined;
  rating?: ServiceRating;
  onPress: () => void;
}

/** Compact card for horizontal rails (Popular services). */
export const ServiceTile = ({ service, category, rating, onPress }: ServiceTileProps) => {
  const { spacing } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={service.name} style={styles.tile} padding="md">
      <View style={{ gap: spacing.sm }}>
        <CategoryIcon category={category} size={40} />
        <Text variant="label" numberOfLines={2} style={styles.tileTitle}>
          {service.name}
        </Text>
        {rating ? <RatingStars value={rating.average} size={11} /> : <View style={styles.starsPlaceholder} />}
        <Text variant="caption" tone="secondary">
          {formatDuration(service.duration)} · <Text variant="caption" tone="primary">{formatCurrency(service.price)}</Text>
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  pressed: { opacity: 0.85 },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  tile: { width: 156 },
  tileTitle: { minHeight: 36 },
  starsPlaceholder: { height: 15 },
});
