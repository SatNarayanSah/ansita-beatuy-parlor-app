import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { OfferCarousel, OfferDetailSheet } from '@/components/customer/OfferCarousel';
import { ratingsByService, ServiceTile } from '@/components/customer/ServiceCards';
import { GreetingHeader } from '@/components/layout/GreetingHeader';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  IconButton,
  ListItem,
  ProgressBar,
  QueryState,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonCard,
  StatCard,
  StatusPill,
  Text,
} from '@/components/ui';
import { firstName, serviceNames, useCategoryMap, useCourseMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT, type Translate } from '@/i18n';
import type { AppointmentsTab, CustomerTabScreenProps } from '@/navigation/types';
import {
  appointmentService,
  catalogService,
  customerService,
  enrollmentService,
  notificationService,
  offerService,
  paymentRequestService,
  reviewService,
} from '@/services';
import {
  selectAmountDue,
  selectAttendancePercent,
  selectCurrentUser,
  selectFeeDue,
  selectLiveOffers,
  selectOnlineMethods,
  selectPendingTotal,
  selectPointsWorth,
  selectUpcomingAppointments,
  useAppointmentStore,
  useAuthStore,
  useBusinessStore,
  useCourseStore,
  useCustomerStore,
  useNotificationStore,
  useOfferStore,
  usePaymentRequestStore,
  useReviewStore,
} from '@/store';
import { useTheme } from '@/theme';
import type { Appointment, AppointmentStatus, Enrollment, ID, Offer, PaymentRequest, PaymentRequestTarget } from '@/types';
import { combineDateTime, formatRelativeDay, formatTimeRange, todayISO } from '@/utils/date';
import { formatCurrency, formatNumber } from '@/utils/format';

type Props = CustomerTabScreenProps<'Home'>;

/** Bills that still count towards what the customer owes (cancelled and no-show ones don't). */
const OWING_STATUSES: readonly AppointmentStatus[] = ['pending', 'confirmed', 'completed'];

const MINUTE_MS = 60_000;

/** The current time, refreshed every minute (for the countdown). */
const useNow = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
};

/** "in 2 days 3 h", "in 1 h 20 min", "in 45 min", "Happening now"; null once it's over. */
const countdownLabel = (t: Translate, appointment: Appointment, now: number): string | null => {
  const start = combineDateTime(appointment.date, appointment.startTime).getTime();
  const end = combineDateTime(appointment.date, appointment.endTime).getTime();
  const minutes = Math.ceil((start - now) / MINUTE_MS);
  if (minutes <= 0) return now < end ? t('home.countdown.now') : null;
  if (minutes < 60) return t('home.countdown.minutes', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('home.countdown.hours', { hours, minutes: minutes % 60 });
  const days = Math.floor(hours / 24);
  return days === 1 ? t('home.countdown.day', { hours: hours % 24 }) : t('home.countdown.days', { days, hours: hours % 24 });
};

interface Bill {
  targetType: PaymentRequestTarget;
  targetId: ID;
  due: number;
  /** Claimed in "I've paid" requests the parlour hasn't checked yet (never more than `due`). */
  pending: number;
  upcoming: boolean;
}

/** What the customer still owes, and how much of that is already waiting for confirmation. */
const summariseDues = (appointments: readonly Appointment[], enrollments: readonly Enrollment[], requests: readonly PaymentRequest[], today: string) => {
  const bills: Bill[] = [];
  for (const appointment of appointments) {
    const due = selectAmountDue(appointment);
    if (!OWING_STATUSES.includes(appointment.status) || due <= 0) continue;
    bills.push({
      targetType: 'appointment',
      targetId: appointment.id,
      due,
      pending: Math.min(due, selectPendingTotal(requests, appointment.id)),
      upcoming: appointment.status !== 'completed' && appointment.date >= today,
    });
  }
  for (const enrollment of enrollments) {
    const due = selectFeeDue(enrollment);
    if (enrollment.status === 'dropped' || due <= 0) continue;
    bills.push({ targetType: 'enrollment', targetId: enrollment.id, due, pending: Math.min(due, selectPendingTotal(requests, enrollment.id)), upcoming: false });
  }
  const sum = (list: readonly Bill[], key: 'due' | 'pending') => list.reduce((total, bill) => total + bill[key], 0);
  const appointmentBills = bills.filter((bill) => bill.targetType === 'appointment');
  const courseBills = bills.filter((bill) => bill.targetType === 'enrollment');
  return {
    total: sum(bills, 'due'),
    pending: sum(bills, 'pending'),
    appointments: sum(appointmentBills, 'due'),
    courses: sum(courseBills, 'due'),
    /** Open the Upcoming tab when an upcoming booking is owed, otherwise Past (completed visits). */
    appointmentsTab: (appointmentBills.some((bill) => bill.upcoming) ? 'upcoming' : 'past') as AppointmentsTab,
    /** Bills that can still take an "I've paid" (not fully covered by pending requests). */
    claimable: bills.filter((bill) => bill.due - bill.pending > 0),
  };
};

const HomeSkeleton = () => {
  const { spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.lg }}>
      <SkeletonCard />
      <View style={styles.row}>
        <Skeleton height={112} radius={radius.lg} style={styles.flex} />
        <Skeleton height={112} radius={radius.lg} style={styles.flex} />
      </View>
      <Skeleton height={168} radius={radius.xl} />
      <View style={styles.rail}>
        <Skeleton height={150} width={156} radius={radius.lg} />
        <Skeleton height={150} width={156} radius={radius.lg} />
      </View>
    </View>
  );
};

export const HomeScreen = ({ navigation }: Props) => {
  const { colors, spacing, radius, screenPadding } = useTheme();
  const t = useT();
  const now = useNow();
  const user = useAuthStore(selectCurrentUser);
  const services = useServiceMap();
  const categories = useCategoryMap();
  const staff = useStaffMap();
  const courses = useCourseMap();
  const customerId = user?.customerId ?? '';
  const loyalty = useBusinessStore((state) => state.loyalty);
  const canPayOnline = useBusinessStore((state) => selectOnlineMethods(state.payments).length > 0);
  const [openOffer, setOpenOffer] = useState<Offer | null>(null);

  // One parallel fetch so the whole screen has a single loading state. Extras that
  // aren't essential fall back to empty so a hiccup there doesn't blank the dashboard.
  const query = useServiceQuery(
    async () => {
      const [customer, appointments, offers, catalog, reviews, unread, enrollments, requests] = await Promise.all([
        customerService.getCustomer(customerId),
        appointmentService.listAppointments(),
        offerService.listOffers().catch((): Offer[] => []),
        catalogService.listServices({ activeOnly: true }),
        reviewService.listReviews().catch(() => []),
        notificationService.getUnreadCount().catch(() => 0),
        enrollmentService.listEnrollments().catch((): Enrollment[] => []),
        paymentRequestService.listRequests({ status: 'pending' }).catch((): PaymentRequest[] => []),
      ]);
      return { customer, appointments, offers, catalog, reviews, unread, enrollments, requests };
    },
    [customerId],
    {
      refetchOn: [useAppointmentStore, useOfferStore, useNotificationStore, useCustomerStore, useReviewStore, useCourseStore, usePaymentRequestStore],
    },
  );

  const derived = useMemo(() => {
    if (!query.data) return null;
    const { appointments, catalog, reviews, enrollments, requests, offers } = query.data;
    const today = todayISO();
    const ratings = ratingsByService(reviews);
    const popular = [...catalog].sort((a, b) => (ratings.get(b.id)?.count ?? 0) - (ratings.get(a.id)?.count ?? 0)).slice(0, 8);
    const upcoming = selectUpcomingAppointments(appointments, today);
    const pendingRequests = requests.filter((request) => request.status === 'pending');
    return {
      upcoming,
      ratings,
      popular,
      offers: selectLiveOffers(offers, today),
      dues: summariseDues(appointments, enrollments, pendingRequests, today),
      activeEnrollments: enrollments.filter((enrollment) => enrollment.status === 'active' || enrollment.status === 'pending'),
      isNewCustomer: appointments.length === 0 && enrollments.length === 0,
    };
  }, [query.data]);

  // Skip today's visits that are already over (they stay "confirmed" until the desk closes them).
  const next = useMemo(
    () => derived?.upcoming.find((appointment) => combineDateTime(appointment.date, appointment.endTime).getTime() > now) ?? derived?.upcoming[0],
    [derived, now],
  );

  if (!user) return null;

  const bell = (
    <IconButton
      icon="notifications-outline"
      accessibilityLabel={t('notifications.title')}
      variant="soft"
      badgeCount={query.data?.unread}
      onPress={() => navigation.navigate('Notifications')}
    />
  );

  const goToAppointments = (tab: AppointmentsTab = 'upcoming') => navigation.navigate('MyAppointments', { tab });

  const sendPayment = (): void => {
    const dues = derived?.dues;
    if (!dues) return;
    const [only] = dues.claimable;
    if (dues.claimable.length === 1 && only) navigation.navigate('SendPayment', { targetType: only.targetType, targetId: only.targetId });
    else if (dues.claimable.some((bill) => bill.targetType === 'appointment')) goToAppointments(dues.appointmentsTab);
    else navigation.navigate('MyCourses');
  };

  const bookFromOffer = (offer: Offer): void => {
    setOpenOffer(null);
    const [categoryId] = offer.categoryIds;
    const category = offer.categoryIds.length === 1 && categoryId ? { categoryId } : {};
    // Code offers go straight to booking with the code filled in; automatic ones apply by themselves.
    if (offer.code) navigation.navigate('Booking', { offerCode: offer.code, ...category });
    else navigation.navigate('Book', offer.categoryIds.length === 1 ? category : undefined);
  };

  return (
    <Screen edges={['top', 'left', 'right']} refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <GreetingHeader user={user} subtitle={t('home.subtitle')} action={bell} />

      <QueryState query={query} skeleton={<HomeSkeleton />}>
        {(data) => {
          if (!derived) return null;
          const { dues } = derived;
          const countdown = next ? countdownLabel(t, next, now) : null;
          const nextStaff = next ? staff.get(next.staffId) : undefined;
          const points = data.customer.loyaltyPoints;

          return (
            <View style={{ gap: spacing.lg }}>
              {/* ---------- Next visit / first visit ---------- */}
              {next ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('home.nextVisit')} actionLabel={t('common.seeAll')} onAction={() => goToAppointments()} />
                  <Card onPress={() => goToAppointments()} accessibilityLabel={`${t('home.nextVisit')}: ${serviceNames(next.serviceIds, services)}. ${countdown ?? ''}`}>
                    <View style={{ gap: spacing.sm }}>
                      <View style={styles.between}>
                        {countdown ? <Badge label={countdown} icon="hourglass-outline" tone="primary" variant="solid" /> : <View />}
                        <StatusPill kind="appointment" status={next.status} size="sm" />
                      </View>
                      <Text variant="h3" numberOfLines={2}>
                        {serviceNames(next.serviceIds, services)}
                      </Text>
                      <View style={styles.inline}>
                        <Icon name="calendar-outline" size={16} color={colors.primary} />
                        <Text variant="bodySmall" tone="secondary">
                          {formatRelativeDay(next.date)} · {formatTimeRange(next.startTime, next.endTime)}
                        </Text>
                      </View>
                      <Divider spacing="none" />
                      <View style={styles.between}>
                        <View style={[styles.inline, styles.flex]}>
                          <Avatar name={nextStaff?.name ?? '?'} uri={nextStaff?.avatar} size="sm" />
                          <Text variant="label" numberOfLines={1} style={styles.flex}>
                            {t('home.withStaff', { name: firstName(nextStaff?.name) })}
                          </Text>
                        </View>
                        <View style={styles.inline}>
                          <Text variant="label" tone="primary">
                            {t('home.viewAppointment')}
                          </Text>
                          <Icon name="chevron-forward" size={16} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </Card>
                </View>
              ) : derived.isNewCustomer ? (
                <Card variant="outlined" padding="none">
                  <EmptyState
                    icon="sparkles-outline"
                    tone="primary"
                    title={t('home.firstVisit')}
                    message={t('home.firstVisitHint')}
                    actionLabel={t('home.bookNow')}
                    onAction={() => navigation.navigate('Booking')}
                    secondaryActionLabel={t('home.exploreServices')}
                    onSecondaryAction={() => navigation.navigate('Book')}
                  />
                </Card>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('home.nextVisit')} actionLabel={t('common.seeAll')} onAction={() => goToAppointments('past')} />
                  <Card variant="outlined" padding="none">
                    <EmptyState
                      compact
                      icon="calendar-clear-outline"
                      title={t('home.noUpcoming')}
                      message={t('home.noUpcomingHint')}
                      actionLabel={t('home.bookNow')}
                      onAction={() => navigation.navigate('Booking')}
                    />
                  </Card>
                </View>
              )}

              {/* ---------- At a glance ---------- */}
              {!derived.isNewCustomer || loyalty.enabled ? (
                <View style={styles.row}>
                  {!derived.isNewCustomer ? (
                    <StatCard
                      label={t('home.upcomingVisits')}
                      value={derived.upcoming.length}
                      icon="calendar"
                      tone="info"
                      caption={t('home.tapToManage')}
                      onPress={() => goToAppointments()}
                      style={styles.flex}
                    />
                  ) : null}
                  {loyalty.enabled ? (
                    <StatCard
                      label={t('home.loyaltyPoints')}
                      value={formatNumber(points)}
                      icon="diamond"
                      tone="highlight"
                      caption={t('home.pointsWorth', { amount: formatCurrency(selectPointsWorth(loyalty, points)) })}
                      onPress={() => navigation.navigate('LoyaltyHistory')}
                      style={styles.flex}
                    />
                  ) : null}
                </View>
              ) : null}

              {/* ---------- Amount due ---------- */}
              {dues.total > 0 ? (
                <Card padding="md" style={{ gap: spacing.sm }}>
                  <View style={styles.between}>
                    <View style={styles.flex}>
                      <Text variant="label" tone="secondary">
                        {t('home.amountDue')}
                      </Text>
                      <Text variant="h1">{formatCurrency(dues.total)}</Text>
                    </View>
                    <View style={[styles.iconTile, { backgroundColor: colors.warningSoft, borderRadius: radius.md }]}>
                      <Icon name="wallet-outline" size={22} color={colors.warning} />
                    </View>
                  </View>
                  {dues.pending > 0 ? (
                    <Badge label={t('home.awaitingConfirmation', { amount: formatCurrency(dues.pending) })} icon="hourglass-outline" tone="warning" />
                  ) : null}
                  <View>
                    {dues.appointments > 0 ? (
                      <ListItem
                        title={t('home.dueAppointments')}
                        leftIcon="calendar-outline"
                        rightText={formatCurrency(dues.appointments)}
                        showChevron
                        compact
                        onPress={() => goToAppointments(dues.appointmentsTab)}
                      />
                    ) : null}
                    {dues.courses > 0 ? (
                      <ListItem
                        title={t('home.dueCourses')}
                        leftIcon="school-outline"
                        rightText={formatCurrency(dues.courses)}
                        showChevron
                        compact
                        onPress={() => navigation.navigate('MyCourses')}
                      />
                    ) : null}
                  </View>
                  {canPayOnline && dues.claimable.length > 0 ? (
                    <Button title={t('appointments.paid')} leftIcon="checkmark-done-outline" variant="outline" onPress={sendPayment} fullWidth />
                  ) : null}
                </Card>
              ) : null}

              {/* ---------- Course progress ---------- */}
              {derived.activeEnrollments.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('home.courses')} actionLabel={t('common.seeAll')} onAction={() => navigation.navigate('MyCourses')} />
                  {derived.activeEnrollments.map((enrollment) => {
                    const attendance = selectAttendancePercent(enrollment);
                    const feeShare = enrollment.feeTotal > 0 ? enrollment.feePaid / enrollment.feeTotal : 1;
                    const title = courses.get(enrollment.courseId)?.title ?? t('home.course');
                    return (
                      <Card key={enrollment.id} onPress={() => navigation.navigate('MyCourses')} accessibilityLabel={title}>
                        <View style={{ gap: spacing.sm }}>
                          <View style={styles.between}>
                            <Text variant="h4" numberOfLines={1} style={styles.flex}>
                              {title}
                            </Text>
                            <StatusPill kind="enrollment" status={enrollment.status} size="sm" />
                          </View>
                          <View style={{ gap: spacing.xs }}>
                            <View style={styles.between}>
                              <Text variant="caption" tone="muted">
                                {t('home.attendance')}
                              </Text>
                              <Text variant="caption" tone={enrollment.attendance.length === 0 ? 'muted' : attendance >= 80 ? 'success' : 'warning'}>
                                {enrollment.attendance.length === 0 ? t('home.noClassesYet') : `${attendance}%`}
                              </Text>
                            </View>
                            <ProgressBar value={attendance / 100} tone={attendance >= 80 ? 'success' : 'warning'} accessibilityLabel={t('home.attendance')} />
                          </View>
                          <View style={{ gap: spacing.xs }}>
                            <View style={styles.between}>
                              <Text variant="caption" tone="muted">
                                {t('home.feesPaid')}
                              </Text>
                              <Text variant="caption" tone="secondary">
                                {t('home.feeProgress', { paid: formatCurrency(enrollment.feePaid), total: formatCurrency(enrollment.feeTotal) })}
                              </Text>
                            </View>
                            <ProgressBar value={feeShare} tone="primary" accessibilityLabel={t('home.feesPaid')} />
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              ) : null}

              {/* ---------- Offers ---------- */}
              {derived.offers.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('offers.title')} />
                  <OfferCarousel offers={derived.offers} onPressOffer={setOpenOffer} />
                </View>
              ) : null}

              {!derived.isNewCustomer ? (
                <Button title={t('home.bookNow')} leftIcon="add-circle-outline" size="lg" onPress={() => navigation.navigate('Booking')} fullWidth />
              ) : null}

              {/* ---------- Popular services ---------- */}
              {derived.popular.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={t('home.popular')} actionLabel={t('common.seeAll')} onAction={() => navigation.navigate('Book')} />
                  {/* Bleeds to the screen edges like the offer carousel, so tiles aren't clipped by the page padding. */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -screenPadding }}
                    contentContainerStyle={[styles.rail, styles.railPad, { paddingHorizontal: screenPadding }]}
                  >
                    {derived.popular.map((service) => (
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
              ) : null}
            </View>
          );
        }}
      </QueryState>

      <OfferDetailSheet offer={openOffer} onClose={() => setOpenOffer(null)} onBook={bookFromOffer} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconTile: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rail: { flexDirection: 'row', gap: 12 },
  // Room for card shadows inside the horizontal scroller.
  railPad: { paddingVertical: 6 },
});
