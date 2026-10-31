import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppointmentCard } from '@/components/customer/AppointmentCard';
import { CancelAppointmentSheet, ReviewSheet } from '@/components/customer/AppointmentSheets';
import { ListScreen, SegmentedControl, SkeletonCard, type SegmentOption } from '@/components/ui';
import { serviceNames, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { AppointmentsTab, CustomerTabScreenProps } from '@/navigation/types';
import { appointmentService, reviewService } from '@/services';
import { selectCurrentUser, selectUpcomingAppointments, useAppointmentStore, useAuthStore, useReviewStore } from '@/store';
import { useTheme } from '@/theme';
import type { Appointment } from '@/types';
import { formatRelativeDay, formatTime12, todayISO } from '@/utils/date';

type Props = CustomerTabScreenProps<'MyAppointments'>;

const EMPTY: Record<AppointmentsTab, { icon: 'calendar-clear-outline' | 'time-outline' | 'close-circle-outline'; title: string; message: string }> = {
  upcoming: { icon: 'calendar-clear-outline', title: 'No upcoming visits', message: 'Book a treatment and it will appear here.' },
  past: { icon: 'time-outline', title: 'No past visits yet', message: 'Completed appointments show here so you can rebook or review them.' },
  cancelled: { icon: 'close-circle-outline', title: 'Nothing cancelled', message: 'Cancelled bookings will show here.' },
};

export const MyAppointmentsScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const t = useT();
  const user = useAuthStore(selectCurrentUser);
  const services = useServiceMap();
  const staff = useStaffMap();
  const [tab, setTab] = useState<AppointmentsTab>(route.params?.tab ?? 'upcoming');
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [reviewing, setReviewing] = useState<Appointment | null>(null);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const query = useServiceQuery(
    async () => {
      const [appointments, reviews] = await Promise.all([
        appointmentService.listAppointments(),
        reviewService.listReviews({ customerId: user?.customerId ?? null }),
      ]);
      return { appointments, reviews: new Map(reviews.map((review) => [review.appointmentId, review])) };
    },
    [user?.customerId],
    { refetchOn: [useAppointmentStore, useReviewStore] },
  );

  const lists = useMemo(() => {
    const all = query.data?.appointments ?? [];
    const upcoming = selectUpcomingAppointments(all, todayISO());
    const upcomingIds = new Set(upcoming.map((a) => a.id));
    // The API returns oldest first; history reads best newest first.
    const newestFirst = [...all].reverse();
    return {
      upcoming,
      past: newestFirst.filter((a) => !upcomingIds.has(a.id) && a.status !== 'cancelled'),
      cancelled: newestFirst.filter((a) => a.status === 'cancelled'),
    };
  }, [query.data]);

  const options: SegmentOption<AppointmentsTab>[] = [
    { value: 'upcoming', label: `${t('appointments.upcoming')} (${lists.upcoming.length})` },
    { value: 'past', label: t('appointments.past') },
    { value: 'cancelled', label: t('appointments.cancelled') },
  ];

  const summary = (appointment: Appointment | null): string =>
    appointment
      ? `${serviceNames(appointment.serviceIds, services)} · ${formatRelativeDay(appointment.date)} at ${formatTime12(appointment.startTime)}`
      : '';

  const rebook = (appointment: Appointment) => () =>
    navigation.navigate('Booking', { serviceIds: appointment.serviceIds, staffId: appointment.staffId });

  return (
    <>
      <ListScreen
        query={query}
        items={lists[tab]}
        keyExtractor={(appointment) => appointment.id}
        renderItem={(appointment) => {
          const isUpcoming = tab === 'upcoming';
          const review = query.data?.reviews.get(appointment.id) ?? null;
          return (
            <AppointmentCard
              appointment={appointment}
              services={services}
              staff={staff}
              review={review}
              onReschedule={isUpcoming ? () => navigation.navigate('Reschedule', { appointmentId: appointment.id }) : undefined}
              onCancel={isUpcoming ? () => setCancelling(appointment) : undefined}
              onReview={appointment.status === 'completed' && !review ? () => setReviewing(appointment) : undefined}
              onRebook={isUpcoming ? undefined : rebook(appointment)}
            />
          );
        }}
        header={<SegmentedControl options={options} value={tab} onChange={setTab} />}
        skeleton={
          <View style={{ gap: spacing.md }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        }
        empty={{
          ...EMPTY[tab],
          actionLabel: tab === 'cancelled' ? undefined : 'Book an appointment',
          onAction: tab === 'cancelled' ? undefined : () => navigation.navigate('Booking'),
        }}
      />
      <CancelAppointmentSheet appointment={cancelling} summary={summary(cancelling)} onClose={() => setCancelling(null)} />
      <ReviewSheet appointment={reviewing} summary={summary(reviewing)} onClose={() => setReviewing(null)} />
    </>
  );
};
