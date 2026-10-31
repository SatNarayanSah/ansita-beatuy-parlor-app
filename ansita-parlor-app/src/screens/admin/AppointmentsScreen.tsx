import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminAppointmentRow } from '@/components/admin/AdminAppointmentRow';
import { Timeline, type TimelineColumn } from '@/components/admin/Timeline';
import { WeekStrip } from '@/components/admin/WeekStrip';
import {
  Card,
  EmptyState,
  FAB,
  FilterChips,
  IconButton,
  ListScreen,
  QueryState,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  SkeletonListItem,
  Text,
  useToast,
  type FilterOption,
  type SegmentOption,
} from '@/components/ui';
import { useAdoptParam } from '@/hooks/useAdoptParam';
import { useCustomerMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { AdminTabScreenProps, AppointmentsView } from '@/navigation/types';
import { appointmentService, getErrorMessage } from '@/services';
import { selectActiveStaff, selectHolidayOn, selectIsStaffWorkingOn, useAppointmentStore, useBusinessStore, useStaffStore } from '@/store';
import { useTheme } from '@/theme';
import type { Appointment, AppointmentStatus, ID, ISODate, TimeString } from '@/types';
import { formatDisplayDate, formatRelativeDay, todayISO } from '@/utils/date';

type Props = AdminTabScreenProps<'Appointments'>;

type HistoryStatus = Extract<AppointmentStatus, 'completed' | 'cancelled' | 'no_show'>;

type ListRow = { kind: 'header'; key: string; title: string } | { kind: 'item'; key: string; appointment: Appointment };

const HISTORY_OPTIONS: readonly FilterOption<HistoryStatus>[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

const byTime = (a: Appointment, b: Appointment): number => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);

/** Date headings interleaved with bookings, for the virtualised lists. */
const groupByDay = (items: readonly Appointment[]): ListRow[] => {
  const groups = new Map<ISODate, Appointment[]>();
  items.forEach((a) => groups.set(a.date, [...(groups.get(a.date) ?? []), a]));
  return [...groups].flatMap(([day, list]) => [
    { kind: 'header' as const, key: `h-${day}`, title: `${formatRelativeDay(day)} · ${list.length}` },
    ...list.map((appointment) => ({ kind: 'item' as const, key: appointment.id, appointment })),
  ]);
};

/**
 * Admin bookings, in three plain tabs: the day's schedule, requests waiting for
 * approval, and past bookings.
 */
export const AppointmentsScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const services = useServiceMap();
  const staffMap = useStaffMap();
  const customers = useCustomerMap();
  const allStaff = useStaffStore((state) => state.staff);
  const activeStaff = useMemo(() => selectActiveStaff(allStaff), [allStaff]);
  const { holidays, profile } = useBusinessStore();
  const today = todayISO();

  const [view, setView] = useState<AppointmentsView>(route.params?.view ?? 'schedule');
  const [date, setDate] = useState<ISODate>(route.params?.date ?? today);
  const [staffId, setStaffId] = useState<ID | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus | null>(null);
  const [confirmingId, setConfirmingId] = useState<ID | null>(null);

  // Deep links from the Dashboard (e.g. "Pending approval") switch the tab.
  // Keyed on the params object, so repeating the same link re-applies it.
  useAdoptParam(route.params, (params) => {
    if (params.view) setView(params.view);
    if (params.date) setDate(params.date);
  });

  const query = useServiceQuery(() => appointmentService.listAppointments(), [], { refetchOn: [useAppointmentStore] });
  const all = query.data;

  const requests = useMemo(() => (all ?? []).filter((a) => a.status === 'pending').sort(byTime), [all]);

  // Active bookings per day, for the dots on the week strip.
  const counts = useMemo(() => {
    const map = new Map<ISODate, number>();
    (all ?? []).forEach((a) => {
      if ((a.status === 'pending' || a.status === 'confirmed' || a.status === 'completed') && (!staffId || a.staffId === staffId)) {
        map.set(a.date, (map.get(a.date) ?? 0) + 1);
      }
    });
    return map;
  }, [all, staffId]);

  const day = useMemo(() => {
    const list = (all ?? []).filter((a) => a.date === date && (!staffId || a.staffId === staffId)).sort(byTime);
    return {
      all: list,
      toDo: list.filter((a) => a.status === 'pending' || a.status === 'confirmed'),
      done: list.filter((a) => a.status === 'completed'),
      dropped: list.filter((a) => a.status === 'cancelled' || a.status === 'no_show'),
    };
  }, [all, date, staffId]);

  const history = useMemo(
    () =>
      (all ?? [])
        .filter((a) => a.date < today && a.status !== 'pending' && a.status !== 'confirmed' && (!historyStatus || a.status === historyStatus))
        .sort((a, b) => byTime(b, a)),
    [all, today, historyStatus],
  );

  const holiday = selectHolidayOn(holidays, date);
  const shownStaff = staffId ? activeStaff.filter((m) => m.id === staffId) : activeStaff;
  const dayColumns = useMemo<TimelineColumn[]>(
    () =>
      shownStaff.map((member) => ({
        key: member.id,
        title: member.name.split(' ')[0] ?? member.name,
        closed: holiday ? holiday.name : selectIsStaffWorkingOn(member, date) ? undefined : 'Day off',
        appointments: day.all.filter((a) => a.staffId === member.id),
      })),
    [shownStaff, day.all, date, holiday],
  );

  const staffOptions = useMemo<FilterOption<ID>[]>(() => activeStaff.map((m) => ({ value: m.id, label: m.name.split(' ')[0] ?? m.name })), [activeStaff]);

  const tabs: readonly SegmentOption<AppointmentsView>[] = [
    { value: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
    { value: 'requests', label: requests.length > 0 ? `Requests (${requests.length})` : 'Requests', icon: 'hourglass-outline' },
    { value: 'history', label: 'History', icon: 'time-outline' },
  ];

  const openDetail = (appointment: Appointment): void => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id });
  const newBooking = (prefill?: { date?: ISODate; staffId?: ID; time?: TimeString }): void => navigation.navigate('AppointmentForm', prefill);

  const confirm = async (id: ID): Promise<void> => {
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

  const row = (appointment: Appointment) => (
    <AdminAppointmentRow
      key={appointment.id}
      appointment={appointment}
      customer={customers.get(appointment.customerId)}
      services={services}
      staff={staffMap}
      onPress={() => openDetail(appointment)}
      onConfirm={appointment.status === 'pending' ? () => void confirm(appointment.id) : undefined}
      confirming={confirmingId === appointment.id}
    />
  );

  const listSkeleton = (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
  const tabBar = <SegmentedControl options={tabs} value={view} onChange={setView} />;
  const fab = <FAB label="New booking" icon="add" accessibilityLabel="New booking" onPress={() => newBooking(view === 'schedule' ? { date } : undefined)} />;
  const renderListRow = (item: ListRow) =>
    item.kind === 'header' ? <SectionHeader title={item.title} compact style={{ marginTop: spacing.sm }} /> : row(item.appointment);

  if (view === 'requests') {
    return (
      <ListScreen
        query={query}
        items={groupByDay(requests)}
        keyExtractor={(item) => item.key}
        renderItem={renderListRow}
        header={
          <>
            {tabBar}
            {requests.length > 0 ? (
              <Text variant="bodySmall" tone="secondary">
                Customers booked these online. Confirm to let them know, or open one to decline or change it.
              </Text>
            ) : null}
          </>
        }
        skeleton={listSkeleton}
        empty={{ icon: 'checkmark-done-outline', title: 'All caught up', message: 'New online bookings that need your OK will show up here.' }}
        overlay={fab}
      />
    );
  }

  if (view === 'history') {
    return (
      <ListScreen
        query={query}
        items={groupByDay(history)}
        keyExtractor={(item) => item.key}
        renderItem={renderListRow}
        header={
          <>
            {tabBar}
            <FilterChips options={HISTORY_OPTIONS} value={historyStatus} onChange={setHistoryStatus} allLabel="All" />
          </>
        }
        skeleton={listSkeleton}
        empty={{ icon: 'time-outline', title: 'No past bookings', message: historyStatus ? 'Nothing with this status yet.' : 'Finished bookings will be listed here.' }}
        overlay={fab}
      />
    );
  }

  const summary = [
    `${day.toDo.length + day.done.length} booking${day.toDo.length + day.done.length === 1 ? '' : 's'}`,
    ...(day.toDo.some((a) => a.status === 'pending') ? [`${day.toDo.filter((a) => a.status === 'pending').length} to confirm`] : []),
  ].join(' · ');

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()} overlay={fab}>
      {tabBar}
      <WeekStrip date={date} today={today} onChange={setDate} counts={counts} isClosed={(d) => Boolean(selectHolidayOn(holidays, d))} />
      {activeStaff.length > 1 ? <FilterChips options={staffOptions} value={staffId} onChange={setStaffId} allLabel="Everyone" /> : null}

      <View style={styles.dayHeader}>
        <View style={styles.flex}>
          <Text variant="h3">{formatRelativeDay(date)}</Text>
          <Text variant="caption" tone="muted">
            {holiday ? `Closed · ${holiday.name}` : `${formatDisplayDate(date)} · ${summary}`}
          </Text>
        </View>
        <IconButton
          icon={showTimeline ? 'list-outline' : 'grid-outline'}
          accessibilityLabel={showTimeline ? 'Show as list' : 'Show staff timeline'}
          variant="soft"
          onPress={() => setShowTimeline((current) => !current)}
        />
      </View>

      <QueryState query={query} skeleton={showTimeline ? <Skeleton height={420} radius={12} /> : listSkeleton}>
        {() =>
          showTimeline ? (
            <Card padding="sm">
              <Timeline
                columns={dayColumns}
                start={profile.openTime}
                end={profile.closeTime}
                customers={customers}
                onPressAppointment={openDetail}
                onPressSlot={(key, time) => newBooking({ date, staffId: key, time })}
                nowColumnKeys={date === today ? dayColumns.map((column) => column.key) : []}
              />
              <Text variant="caption" tone="muted" style={{ padding: spacing.sm }}>
                Tap an empty slot to book that stylist at that time.
              </Text>
            </Card>
          ) : day.all.length === 0 ? (
            <EmptyState
              compact
              icon="calendar-clear-outline"
              title={holiday ? 'Parlour closed' : 'No bookings'}
              message={holiday ? holiday.name : 'This day is free.'}
              actionLabel={holiday ? undefined : 'Add a booking'}
              onAction={holiday ? undefined : () => newBooking({ date })}
            />
          ) : (
            <View style={{ gap: spacing.lg }}>
              {day.toDo.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={`To do · ${day.toDo.length}`} compact />
                  {day.toDo.map(row)}
                </View>
              ) : null}
              {day.done.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={`Done · ${day.done.length}`} compact />
                  {day.done.map(row)}
                </View>
              ) : null}
              {day.dropped.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title={`Cancelled & no-show · ${day.dropped.length}`} compact />
                  {day.dropped.map(row)}
                </View>
              ) : null}
            </View>
          )
        }
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
