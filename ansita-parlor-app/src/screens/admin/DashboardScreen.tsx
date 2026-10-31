import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/layout/ComingSoon';
import { GreetingHeader } from '@/components/layout/GreetingHeader';
import { Screen, StatCard } from '@/components/ui';
import type { AdminTabScreenProps } from '@/navigation/types';
import {
  selectAppointmentsOnDate,
  selectCurrentUser,
  selectLiveOffers,
  selectRevenue,
  useAppointmentStore,
  useAuthStore,
  useCourseStore,
  useOfferStore,
} from '@/store';
import { useTheme } from '@/theme';
import { addDaysISO, formatDisplayDate, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Props = AdminTabScreenProps<'Dashboard'>;

/** Admin home. Headline numbers are live from the stores; charts and lists arrive in Phase 5. */
export const DashboardScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const user = useAuthStore(selectCurrentUser);
  const appointments = useAppointmentStore((state) => state.appointments);
  const enrollments = useCourseStore((state) => state.enrollments);
  const offers = useOfferStore((state) => state.offers);
  const today = todayISO();

  const stats = useMemo(() => {
    const todays = selectAppointmentsOnDate(appointments, today).filter((a) => a.status !== 'cancelled');
    return {
      today: todays.length,
      pending: appointments.filter((a) => a.status === 'pending' && a.date >= today).length,
      revenue: selectRevenue(appointments, addDaysISO(today, -6), today),
      students: enrollments.filter((e) => e.status === 'active').length,
      offers: selectLiveOffers(offers, today).length,
    };
  }, [appointments, enrollments, offers, today]);

  if (!user) return null;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <GreetingHeader user={user} subtitle={formatDisplayDate(today)} />
      <View style={[styles.grid, { gap: spacing.md }]}>
        <StatCard
          label="Today's bookings"
          value={stats.today}
          icon="calendar-outline"
          caption="Tap to view schedule"
          onPress={() => navigation.navigate('Appointments')}
          style={styles.cell}
        />
        <StatCard
          label="Pending requests"
          value={stats.pending}
          icon="hourglass-outline"
          tone="warning"
          caption="Need confirmation"
          onPress={() => navigation.navigate('Appointments')}
          style={styles.cell}
        />
        <StatCard label="Revenue (7 days)" value={formatCurrency(stats.revenue)} icon="cash-outline" tone="success" style={styles.cell} />
        <StatCard
          label="Active students"
          value={stats.students}
          icon="school-outline"
          tone="accent"
          caption={`${stats.offers} live offers`}
          onPress={() => navigation.navigate('Training')}
          style={styles.cell}
        />
      </View>
      <ComingSoon
        icon="stats-chart-outline"
        title="Business dashboard"
        phase="Phase 5"
        description="A full overview of the parlour at a glance."
        features={['Today’s timeline by staff member', 'Weekly revenue chart', 'Top services and customers', 'Fee dues and certificate reminders']}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
