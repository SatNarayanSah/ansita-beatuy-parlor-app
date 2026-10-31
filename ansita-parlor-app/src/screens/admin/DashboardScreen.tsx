import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdminAppointmentRow } from '@/components/admin/AdminAppointmentRow';
import { RevenueTrendChart, StatusDonutChart, TopServicesChart } from '@/components/admin/Charts';
import { GreetingHeader } from '@/components/layout/GreetingHeader';
import {
  Card,
  EmptyState,
  Icon,
  IconButton,
  QueryState,
  Screen,
  SectionHeader,
  Skeleton,
  StatCard,
  Text,
  useToast,
  type IconName,
} from '@/components/ui';
import { useCustomerMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { AdminTabScreenProps } from '@/navigation/types';
import { appointmentService, customerService, getErrorMessage } from '@/services';
import { selectCurrentUser, selectUnreadCount, useAppointmentStore, useAuthStore, useCustomerStore, useNotificationStore } from '@/store';
import { getToneColors, useTheme, type Tone } from '@/theme';
import { inRange, revenueByDay, statusCounts, sumCollected, topServicesByBookings } from '@/utils/analytics';
import { addDaysISO, formatDisplayDate, formatRelativeDay, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Props = AdminTabScreenProps<'Dashboard'>;

interface QuickAction {
  label: string;
  icon: IconName;
  tone: Tone;
  onPress: () => void;
}

const DashboardSkeleton = () => {
  const { spacing, radius } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <View style={[styles.grid, { gap: spacing.md }]}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={104} radius={radius.lg} style={styles.cell} />
        ))}
      </View>
      <Skeleton height={220} radius={radius.lg} />
      <Skeleton height={200} radius={radius.lg} />
    </View>
  );
};

/** Admin home: today at a glance, charts, approvals and shortcuts. Live across roles via store subscriptions. */
export const DashboardScreen = ({ navigation }: Props) => {
  const { colors, spacing, radius } = useTheme();
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const unread = useNotificationStore((state) => (user ? selectUnreadCount(state.notifications, user.id) : 0));
  const services = useServiceMap();
  const staff = useStaffMap();
  const customers = useCustomerMap();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const today = todayISO();

  const query = useServiceQuery(
    async () => {
      const [appointments, customerList] = await Promise.all([appointmentService.listAppointments(), customerService.listCustomers()]);
      return { appointments, customers: customerList };
    },
    [],
    { refetchOn: [useAppointmentStore, useCustomerStore] },
  );

  const view = useMemo(() => {
    if (!query.data) return null;
    const { appointments } = query.data;
    const monthFrom = addDaysISO(today, -29);
    const recent = appointments.filter((a) => inRange(a.date, monthFrom, today));
    const nowTime = format(new Date(), 'HH:mm');
    return {
      todayCount: appointments.filter((a) => a.date === today && a.status !== 'cancelled').length,
      revenueToday: sumCollected(appointments.filter((a) => a.date === today)),
      revenueWeek: sumCollected(appointments.filter((a) => inRange(a.date, addDaysISO(today, -6), today))),
      revenueMonth: sumCollected(recent),
      newCustomers: query.data.customers.filter((c) => c.joinedAt.slice(0, 10) >= monthFrom).length,
      pending: appointments.filter((a) => a.status === 'pending' && a.date >= today),
      upcomingToday: appointments.filter((a) => a.date === today && a.status === 'confirmed' && a.endTime > nowTime),
      trend: revenueByDay(appointments, addDaysISO(today, -13), today),
      top: topServicesByBookings(recent, services, 5),
      statuses: statusCounts(recent),
    };
  }, [query.data, today, services]);

  const confirm = async (id: string): Promise<void> => {
    setConfirmingId(id);
    try {
      await appointmentService.updateStatus(id, 'confirmed');
      toast.success('Confirmed. The customer has been notified.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConfirmingId(null);
    }
  };

  const actions: QuickAction[] = [
    { label: 'New booking', icon: 'add-circle-outline', tone: 'primary', onPress: () => navigation.navigate('AppointmentForm') },
    { label: 'Add customer', icon: 'person-add-outline', tone: 'accent', onPress: () => navigation.navigate('CustomerForm') },
    { label: 'Attendance', icon: 'checkbox-outline', tone: 'success', onPress: () => navigation.navigate('Training', { view: 'courses' }) },
    { label: 'Fee dues', icon: 'wallet-outline', tone: 'warning', onPress: () => navigation.navigate('Training', { view: 'dues' }) },
    { label: 'Reports', icon: 'bar-chart-outline', tone: 'info', onPress: () => navigation.navigate('Reports') },
    { label: 'Services', icon: 'pricetags-outline', tone: 'highlight', onPress: () => navigation.navigate('ManageServices') },
  ];

  if (!user) return null;

  return (
    <Screen edges={['top', 'left', 'right']} refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <GreetingHeader
        user={user}
        subtitle={formatDisplayDate(today)}
        action={
          <IconButton
            icon="notifications-outline"
            accessibilityLabel="Notifications"
            variant="soft"
            badgeCount={unread}
            onPress={() => navigation.navigate('Notifications')}
          />
        }
      />

      <QueryState query={query} skeleton={<DashboardSkeleton />}>
        {() =>
          view ? (
            <View style={{ gap: spacing.xl }}>
              <View style={[styles.grid, { gap: spacing.md }]}>
                <StatCard
                  label="Today's bookings"
                  value={view.todayCount}
                  icon="calendar-outline"
                  caption={`${view.upcomingToday.length} still to come`}
                  onPress={() => navigation.navigate('Appointments', { view: 'day', date: today })}
                  style={styles.cell}
                />
                <StatCard
                  label="Pending approval"
                  value={view.pending.length}
                  icon="hourglass-outline"
                  tone="warning"
                  caption="Tap to review"
                  onPress={() => navigation.navigate('Appointments', { view: 'list', status: 'pending' })}
                  style={styles.cell}
                />
                <StatCard
                  label="Revenue today"
                  value={formatCurrency(view.revenueToday)}
                  icon="cash-outline"
                  tone="success"
                  caption={`This week ${formatCurrency(view.revenueWeek)}`}
                  style={styles.cell}
                />
                <StatCard
                  label="Revenue (30 days)"
                  value={formatCurrency(view.revenueMonth)}
                  icon="trending-up-outline"
                  tone="accent"
                  caption={`${view.newCustomers} new customers`}
                  onPress={() => navigation.navigate('Reports')}
                  style={styles.cell}
                />
              </View>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Revenue, last 14 days" subtitle="Collected per day · touch the chart for values" compact />
                <RevenueTrendChart days={view.trend} />
              </Card>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Top services" subtitle="Bookings, last 30 days · tap a bar" compact />
                <TopServicesChart items={view.top} />
              </Card>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Appointment status" subtitle="Last 30 days" compact />
                <StatusDonutChart counts={view.statuses} />
              </Card>

              <View style={{ gap: spacing.md }}>
                <SectionHeader
                  title="Pending approval"
                  subtitle={view.pending.length ? `${view.pending.length} requests` : undefined}
                  actionLabel={view.pending.length > 3 ? 'See all' : undefined}
                  onAction={() => navigation.navigate('Appointments', { view: 'list', status: 'pending' })}
                />
                {view.pending.length === 0 ? (
                  <Card variant="outlined" padding="none">
                    <EmptyState compact icon="checkmark-done-outline" tone="success" title="All caught up" message="No booking requests waiting." />
                  </Card>
                ) : (
                  view.pending.slice(0, 3).map((appointment) => (
                    <AdminAppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      customer={customers.get(appointment.customerId)}
                      services={services}
                      staff={staff}
                      showDate={formatRelativeDay(appointment.date)}
                      onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id })}
                      onConfirm={() => void confirm(appointment.id)}
                      confirming={confirmingId === appointment.id}
                    />
                  ))
                )}
              </View>

              <View style={{ gap: spacing.md }}>
                <SectionHeader title="Still to come today" actionLabel="Calendar" onAction={() => navigation.navigate('Appointments', { view: 'day', date: today })} />
                {view.upcomingToday.length === 0 ? (
                  <Card variant="outlined" padding="none">
                    <EmptyState
                      compact
                      icon="cafe-outline"
                      title="Nothing else today"
                      message="No more confirmed bookings for today."
                      actionLabel="Book a walk-in"
                      onAction={() => navigation.navigate('AppointmentForm', { date: today })}
                    />
                  </Card>
                ) : (
                  view.upcomingToday.slice(0, 5).map((appointment) => (
                    <AdminAppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      customer={customers.get(appointment.customerId)}
                      services={services}
                      staff={staff}
                      onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id })}
                    />
                  ))
                )}
              </View>

              <View style={{ gap: spacing.md }}>
                <SectionHeader title="Quick actions" />
                <View style={[styles.actions, { gap: spacing.sm }]}>
                  {actions.map((action) => {
                    const tone = getToneColors(colors, action.tone);
                    return (
                      <Pressable
                        key={action.label}
                        onPress={action.onPress}
                        accessibilityRole="button"
                        accessibilityLabel={action.label}
                        style={({ pressed }) => [
                          styles.action,
                          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={[styles.actionIcon, { backgroundColor: tone.bg }]}>
                          <Icon name={action.icon} size={22} color={tone.fg} />
                        </View>
                        <Text variant="label" align="center" numberOfLines={1}>
                          {action.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null
        }
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexBasis: '47%', flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  action: { flexBasis: '31%', flexGrow: 1, alignItems: 'center', gap: 8, borderWidth: 1 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
