import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CourseCard, nextOpenBatch } from '@/components/customer/CourseCards';
import { OfferCarousel } from '@/components/customer/OfferCarousel';
import { ratingsByService, ServiceTile } from '@/components/customer/ServiceCards';
import { GreetingHeader } from '@/components/layout/GreetingHeader';
import {
  Button,
  Card,
  EmptyState,
  Icon,
  IconButton,
  ListItem,
  QueryState,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  StatusPill,
  Text,
} from '@/components/ui';
import { firstName, serviceNames, useCategoryMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { CustomerTabScreenProps } from '@/navigation/types';
import {
  appointmentService,
  catalogService,
  courseService,
  customerService,
  notificationService,
  offerService,
  reviewService,
} from '@/services';
import {
  selectCurrentUser,
  selectUpcomingAppointments,
  useAppointmentStore,
  useAuthStore,
  useCustomerStore,
  useNotificationStore,
  useOfferStore,
  useReviewStore,
} from '@/store';
import { useTheme } from '@/theme';
import { formatRelativeDay, formatTimeRange, todayISO } from '@/utils/date';
import { formatNumber } from '@/utils/format';

type Props = CustomerTabScreenProps<'Home'>;

const HomeSkeleton = () => {
  const { spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.lg }}>
      <Skeleton height={112} radius={radius.xl} />
      <SkeletonCard />
      <Skeleton height={140} radius={radius.xl} />
      <View style={styles.rail}>
        <Skeleton height={150} width={156} radius={radius.lg} />
        <Skeleton height={150} width={156} radius={radius.lg} />
      </View>
    </View>
  );
};

export const HomeScreen = ({ navigation }: Props) => {
  const { colors, spacing, radius } = useTheme();
  const t = useT();
  const user = useAuthStore(selectCurrentUser);
  const services = useServiceMap();
  const categories = useCategoryMap();
  const staff = useStaffMap();
  const customerId = user?.customerId ?? '';

  // One parallel fetch so the whole screen has a single loading state.
  const query = useServiceQuery(
    async () => {
      const [customer, appointments, offers, catalog, courses, reviews, unread] = await Promise.all([
        customerService.getCustomer(customerId),
        appointmentService.listAppointments(),
        offerService.listOffers(),
        catalogService.listServices({ activeOnly: true }),
        courseService.listCourses({ activeOnly: true }),
        reviewService.listReviews(),
        notificationService.getUnreadCount(),
      ]);
      const availability = await Promise.all(courses.map((course) => courseService.getBatchAvailability(course.id)));
      return { customer, appointments, offers, catalog, courses, reviews, unread, availability };
    },
    [customerId],
    { refetchOn: [useAppointmentStore, useOfferStore, useNotificationStore, useCustomerStore, useReviewStore] },
  );

  const derived = useMemo(() => {
    if (!query.data) return null;
    const { appointments, catalog, reviews, courses, availability } = query.data;
    const ratings = ratingsByService(reviews);
    const popular = [...catalog].sort((a, b) => (ratings.get(b.id)?.count ?? 0) - (ratings.get(a.id)?.count ?? 0)).slice(0, 8);
    const featured = courses
      .map((course, index) => ({ course, availability: availability[index] ?? [] }))
      .filter((item) => nextOpenBatch(item.availability) !== undefined)
      .slice(0, 4);
    return { next: selectUpcomingAppointments(appointments, todayISO())[0], ratings, popular, featured };
  }, [query.data]);

  if (!user) return null;

  const bell = (
    <IconButton
      icon="notifications-outline"
      accessibilityLabel="Notifications"
      variant="soft"
      badgeCount={query.data?.unread}
      onPress={() => navigation.navigate('Notifications')}
    />
  );

  return (
    <Screen edges={['top', 'left', 'right']} refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <GreetingHeader user={user} subtitle="Ready for a little pampering?" action={bell} />

      <QueryState query={query} skeleton={<HomeSkeleton />}>
        {(data) => (
          <View style={{ gap: spacing.xl }}>
            <Pressable
              onPress={() => navigation.navigate('LoyaltyHistory')}
              accessibilityRole="button"
              accessibilityLabel={`${data.customer.loyaltyPoints} loyalty points. View history`}
              style={[styles.loyalty, { backgroundColor: colors.accent, borderRadius: radius.xl, padding: spacing.xl }]}
            >
              <View style={styles.flex}>
                <Text variant="overline" color={colors.onAccent} style={styles.dim}>
                  {t('home.loyaltyPoints')}
                </Text>
                <Text variant="display" color={colors.onAccent}>
                  {formatNumber(data.customer.loyaltyPoints)}
                </Text>
                <Text variant="caption" color={colors.onAccent} style={styles.dim}>
                  1 point for every Rs. 100 · Tap for history
                </Text>
              </View>
              <Icon name="diamond" size={44} color={colors.highlight} />
            </Pressable>

            <View style={{ gap: spacing.md }}>
              <SectionHeader
                title={t('home.nextVisit')}
                actionLabel={t('common.seeAll')}
                onAction={() => navigation.navigate('MyAppointments', { tab: 'upcoming' })}
              />
              {derived?.next ? (
                <Card padding="sm" onPress={() => navigation.navigate('MyAppointments', { tab: 'upcoming' })}>
                  <ListItem
                    title={serviceNames(derived.next.serviceIds, services)}
                    subtitle={`${formatRelativeDay(derived.next.date)} · ${formatTimeRange(derived.next.startTime, derived.next.endTime)}`}
                    description={`with ${firstName(staff.get(derived.next.staffId)?.name)}`}
                    leftIcon="calendar"
                    right={<StatusPill kind="appointment" status={derived.next.status} size="sm" />}
                  />
                </Card>
              ) : (
                <Card variant="outlined" padding="none">
                  <EmptyState
                    compact
                    icon="calendar-clear-outline"
                    title="No upcoming visits"
                    message="Treat yourself. Your next booking will show here."
                  />
                </Card>
              )}
            </View>

            <OfferCarousel offers={data.offers} onPressOffer={() => navigation.navigate('Book')} />

            <Button title={t('home.bookNow')} leftIcon="add-circle-outline" size="lg" onPress={() => navigation.navigate('Booking')} fullWidth />

            <View style={{ gap: spacing.md }}>
              <SectionHeader title={t('home.popular')} actionLabel={t('common.seeAll')} onAction={() => navigation.navigate('Book')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, styles.railPad]}>
                {derived?.popular.map((service) => (
                  <ServiceTile
                    key={service.id}
                    service={service}
                    category={categories.get(service.categoryId)}
                    rating={derived.ratings.get(service.id)}
                    onPress={() => navigation.navigate('ServiceDetail', { serviceId: service.id })}
                  />
                ))}
              </ScrollView>
            </View>

            {derived && derived.featured.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <SectionHeader title={t('home.featuredCourses')} actionLabel={t('common.seeAll')} onAction={() => navigation.navigate('Courses')} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, styles.railPad]}>
                  {derived.featured.map(({ course, availability }) => (
                    <CourseCard
                      key={course.id}
                      compact
                      course={course}
                      availability={availability}
                      onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        )}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loyalty: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  dim: { opacity: 0.85 },
  rail: { flexDirection: 'row', gap: 12 },
  // Room for card shadows inside the horizontal scroller.
  railPad: { paddingVertical: 6, paddingRight: 4 },
});
