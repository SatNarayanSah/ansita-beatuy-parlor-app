import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/customer/ServiceCards';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  QueryState,
  RatingStars,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonText,
  Text,
} from '@/components/ui';
import { useCategoryMap } from '@/hooks/useCatalog';
import { useQualifiedStaff } from '@/hooks/useBookingAvailability';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, reviewService } from '@/services';
import { useCustomerStore, useReviewStore } from '@/store';
import { useTheme } from '@/theme';
import { formatTimeAgo } from '@/utils/date';
import { formatCurrency, formatDuration, roundRating } from '@/utils/format';

type Props = RootStackScreenProps<'ServiceDetail'>;

/** Reviewer shown as "Sabina S." for privacy. */
const shortName = (name: string | undefined): string => {
  if (!name) return 'Verified customer';
  const [first = '', last = ''] = name.split(' ');
  return last ? `${first} ${last.charAt(0)}.` : first;
};

export const ServiceDetailScreen = ({ navigation, route }: Props) => {
  const { colors, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { serviceId } = route.params;
  const categories = useCategoryMap();
  const customers = useCustomerStore((state) => state.customers);
  const qualified = useQualifiedStaff([serviceId]);

  const query = useServiceQuery(
    async () => {
      const [service, reviews] = await Promise.all([catalogService.getService(serviceId), reviewService.listReviews()]);
      return { service, reviews: reviews.filter((review) => review.serviceIds.includes(serviceId)) };
    },
    [serviceId],
    { refetchOn: [useReviewStore] },
  );

  const average = useMemo(() => {
    const reviews = query.data?.reviews ?? [];
    return reviews.length ? roundRating(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) : 0;
  }, [query.data]);

  const bookButton = query.data?.service.isActive ? (
    <View style={[styles.sticky, shadows.lg, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md, padding: spacing.lg }]}>
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          {formatDuration(query.data.service.duration)}
        </Text>
        <Text variant="h3" tone="primary">
          {formatCurrency(query.data.service.price)}
        </Text>
      </View>
      <Button title={t('services.bookThis')} rightIcon="arrow-forward" size="lg" onPress={() => navigation.navigate('Booking', { serviceIds: [serviceId] })} />
    </View>
  ) : null;

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()} overlay={bookButton}>
      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.lg }}>
            <Skeleton height={160} radius={radius.xl} />
            <SkeletonText lines={4} />
          </View>
        }
      >
        {({ service, reviews }) => {
          const category = categories.get(service.categoryId);
          return (
            <View style={{ gap: spacing.xl }}>
              <View style={[styles.hero, { backgroundColor: `${category?.color ?? colors.primary}18`, borderRadius: radius.xl, padding: spacing.xl }]}>
                <CategoryIcon category={category} size={72} />
                <View style={{ gap: spacing.xs }}>
                  {category ? <Badge label={category.name} tone="primary" size="sm" /> : null}
                  <Text variant="h1">{service.name}</Text>
                  {reviews.length > 0 ? <RatingStars value={average} showValue count={reviews.length} size={16} /> : null}
                </View>
              </View>

              <View style={styles.facts}>
                <Card variant="filled" style={styles.fact} padding="md">
                  <Icon name="time-outline" size={20} color={colors.primary} />
                  <Text variant="caption" tone="muted">
                    {t('services.duration')}
                  </Text>
                  <Text variant="h4">{formatDuration(service.duration)}</Text>
                </Card>
                <Card variant="filled" style={styles.fact} padding="md">
                  <Icon name="pricetag-outline" size={20} color={colors.primary} />
                  <Text variant="caption" tone="muted">
                    {t('services.price')}
                  </Text>
                  <Text variant="h4">{formatCurrency(service.price)}</Text>
                </Card>
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="About this service" compact />
                <Text variant="body" tone="secondary">
                  {service.description}
                </Text>
                {!service.isActive ? <Badge label="Currently unavailable" tone="danger" /> : null}
              </View>

              {qualified.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title="Who can do this" compact />
                  <View style={styles.staffRow}>
                    {qualified.map((member) => (
                      <View key={member.id} style={styles.staff}>
                        <Avatar name={member.name} uri={member.avatar} size="lg" />
                        <Text variant="label" numberOfLines={1}>
                          {member.name.split(' ')[0]}
                        </Text>
                        <View style={styles.inline}>
                          <Icon name="star" size={11} color={colors.highlight} />
                          <Text variant="caption" tone="muted">
                            {member.rating}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={{ gap: spacing.md }}>
                <SectionHeader title={t('services.reviews')} subtitle={reviews.length ? `${reviews.length} reviews` : undefined} compact />
                {reviews.length === 0 ? (
                  <Card variant="outlined" padding="none">
                    <EmptyState compact icon="chatbubble-ellipses-outline" title="No reviews yet" message="Be the first to try it and share your experience." />
                  </Card>
                ) : (
                  <Card padding="lg" style={{ gap: spacing.md }}>
                    {reviews.slice(0, 6).map((review, index) => (
                      <View key={review.id} style={{ gap: spacing.xs }}>
                        {index > 0 ? <Divider spacing="sm" /> : null}
                        <View style={styles.reviewHead}>
                          <Text variant="label">{shortName(customers.find((c) => c.id === review.customerId)?.name)}</Text>
                          <Text variant="caption" tone="muted">
                            {formatTimeAgo(review.createdAt)}
                          </Text>
                        </View>
                        <RatingStars value={review.rating} size={13} />
                        {review.comment ? (
                          <Text variant="bodySmall" tone="secondary">
                            {review.comment}
                          </Text>
                        ) : null}
                        {review.reply ? (
                          <View style={[styles.reply, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
                            <Text variant="caption" tone="primary">
                              Ansita replied
                            </Text>
                            <Text variant="caption" tone="secondary">
                              {review.reply}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </Card>
                )}
              </View>
              {/* Clearance for the sticky booking bar. */}
              <View style={{ height: 80 }} />
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { gap: 16 },
  facts: { flexDirection: 'row', gap: 12 },
  fact: { flex: 1, gap: 2 },
  staffRow: { flexDirection: 'row', gap: 20 },
  staff: { alignItems: 'center', gap: 4, width: 72 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between' },
  reply: { padding: 10, gap: 2, marginTop: 4 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1 },
});
