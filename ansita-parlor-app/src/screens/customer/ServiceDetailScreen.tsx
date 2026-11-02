import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfferCard, OfferDetailSheet, offersForCategory } from '@/components/customer/OfferCarousel';
import { isWebImage } from '@/components/customer/ServiceCards';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  isIconName,
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
import { catalogService, offerService, reviewService } from '@/services';
import { useCustomerStore, useOfferStore, useReviewStore, useServiceStore } from '@/store';
import { useTheme } from '@/theme';
import type { Offer, ServiceCategory } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { formatCurrency, formatDuration, roundRating } from '@/utils/format';

type Props = RootStackScreenProps<'ServiceDetail'>;

const HERO_HEIGHT = 260;

/** Reviewer shown as "Sabina S." for privacy. */
const shortName = (name: string | undefined, fallback: string): string => {
  if (!name) return fallback;
  const [first = '', last = ''] = name.split(' ');
  return last ? `${first} ${last.charAt(0)}.` : first;
};

/** Edge-to-edge photo, or a gradient in the category colour with its icon when there's no photo. */
const ServiceHero = ({ image, category }: { image: string | null; category: ServiceCategory | undefined }) => {
  const { colors, spacing } = useTheme();
  const tint = category?.color ?? colors.primary;
  const icon = category && isIconName(category.icon) ? category.icon : 'sparkles-outline';
  const bleed = { marginHorizontal: -spacing.lg, marginTop: -spacing.lg, height: HERO_HEIGHT };

  if (isWebImage(image)) {
    return (
      <View style={[styles.hero, bleed, { backgroundColor: colors.surfaceAlt }]}>
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="disk" accessibilityIgnoresInvertColors />
        {/* Blends the photo into the page below it. */}
        <LinearGradient colors={[`${colors.background}00`, `${colors.background}00`, colors.background]} locations={[0, 0.7, 1]} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  return (
    <View style={[styles.hero, styles.center, bleed, { backgroundColor: colors.surfaceAlt }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[`${tint}66`, `${tint}1F`, colors.background]} locations={[0, 0.65, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.ring, styles.ringLarge, { borderColor: `${tint}1F` }]} />
      <View style={[styles.ring, styles.ringSmall, { borderColor: `${tint}26` }]} />
      <View style={[styles.heroIcon, { backgroundColor: colors.surface, borderColor: `${tint}55` }]}>
        <Icon name={icon} size={52} color={tint} />
      </View>
    </View>
  );
};

export const ServiceDetailScreen = ({ navigation, route }: Props) => {
  const { colors, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { serviceId } = route.params;
  const categories = useCategoryMap();
  const customers = useCustomerStore((state) => state.customers);
  const qualified = useQualifiedStaff([serviceId]);
  const [openOffer, setOpenOffer] = useState<Offer | null>(null);

  const query = useServiceQuery(
    async () => {
      const [service, reviews, offers] = await Promise.all([
        catalogService.getService(serviceId),
        reviewService.listReviews(),
        // Optional extra: the page still shows without offers; fall back to what's cached.
        offerService.listOffers().catch(() => useOfferStore.getState().offers),
      ]);
      return {
        service,
        reviews: reviews.filter((review) => review.serviceIds.includes(serviceId)),
        offers: offersForCategory(offers, service.categoryId),
      };
    },
    [serviceId],
    { refetchOn: [useReviewStore, useServiceStore, useOfferStore] },
  );

  const average = useMemo(() => {
    const reviews = query.data?.reviews ?? [];
    return reviews.length ? roundRating(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) : 0;
  }, [query.data]);

  const book = (): void => navigation.navigate('Booking', { serviceIds: [serviceId] });

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
      <Button title={t('services.bookThisService')} rightIcon="arrow-forward" size="lg" onPress={book} />
    </View>
  ) : null;

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()} overlay={bookButton}>
      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.lg }}>
            <Skeleton height={HERO_HEIGHT - spacing.lg} radius={radius.xl} />
            <SkeletonText lines={4} />
          </View>
        }
      >
        {({ service, reviews, offers }) => {
          const category = categories.get(service.categoryId);
          const categoryIcon = category && isIconName(category.icon) ? category.icon : undefined;
          // Older servers don't send benefits.
          const benefits = service.benefits ?? [];
          return (
            <View style={{ gap: spacing.xl }}>
              <ServiceHero image={service.image} category={category} />

              <View style={{ gap: spacing.sm }}>
                {category ? (
                  <Pressable
                    onPress={() => navigation.navigate('CustomerTabs', { screen: 'Book', params: { categoryId: category.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={category.name}
                    hitSlop={6}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  >
                    <Badge label={category.name} icon={categoryIcon} tone="primary" />
                  </Pressable>
                ) : null}
                <Text variant="h1">{service.name}</Text>
                {reviews.length > 0 ? <RatingStars value={average} showValue count={reviews.length} size={16} /> : null}
                {!service.isActive ? <Badge label={t('services.unavailable')} tone="danger" /> : null}
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

              {service.description ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('services.about')} compact />
                  <Text variant="body" tone="secondary">
                    {service.description}
                  </Text>
                </View>
              ) : null}

              {benefits.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('services.benefits')} compact />
                  <Card padding="lg" style={{ gap: spacing.md }}>
                    {benefits.map((benefit) => (
                      <View key={benefit} style={styles.benefit}>
                        <View style={[styles.check, { backgroundColor: colors.successSoft }]}>
                          <Icon name="checkmark" size={14} color={colors.success} />
                        </View>
                        <Text variant="body" style={styles.flex}>
                          {benefit}
                        </Text>
                      </View>
                    ))}
                  </Card>
                </View>
              ) : null}

              {offers.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('services.offers')} compact />
                  {offers.map((offer, index) => (
                    <OfferCard key={offer.id} offer={offer} index={index} height={176} onPress={() => setOpenOffer(offer)} />
                  ))}
                </View>
              ) : null}

              {qualified.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('services.whoCanDo')} compact />
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
                <SectionHeader
                  title={t('services.reviews')}
                  subtitle={reviews.length ? t('services.reviewCount', { count: reviews.length }) : undefined}
                  compact
                />
                {reviews.length === 0 ? (
                  <Card variant="outlined" padding="none">
                    <EmptyState compact icon="chatbubble-ellipses-outline" title={t('services.noReviews')} message={t('services.noReviewsHint')} />
                  </Card>
                ) : (
                  <Card padding="lg" style={{ gap: spacing.md }}>
                    {reviews.slice(0, 6).map((review, index) => (
                      <View key={review.id} style={{ gap: spacing.xs }}>
                        {index > 0 ? <Divider spacing="sm" /> : null}
                        <View style={styles.reviewHead}>
                          <Text variant="label">
                            {shortName(review.customerName ?? customers.find((c) => c.id === review.customerId)?.name, t('services.verifiedCustomer'))}
                          </Text>
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
                              {t('services.ownerReplied')}
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
      <OfferDetailSheet
        offer={openOffer}
        onClose={() => setOpenOffer(null)}
        onBook={
          query.data?.service.isActive
            ? () => {
                setOpenOffer(null);
                book();
              }
            : undefined
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: 112, height: 112, borderRadius: 56, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 22 },
  ringLarge: { width: 300, height: 300, top: -120, right: -90 },
  ringSmall: { width: 170, height: 170, bottom: -40, left: -60 },
  chip: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
  facts: { flexDirection: 'row', gap: 12 },
  fact: { flex: 1, gap: 2 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  staffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  staff: { alignItems: 'center', gap: 4, width: 72 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between' },
  reply: { padding: 10, gap: 2, marginTop: 4 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1 },
});
