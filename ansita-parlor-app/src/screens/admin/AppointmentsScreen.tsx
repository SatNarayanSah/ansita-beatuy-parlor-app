import { addDays, format, startOfWeek } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminAppointmentRow } from '@/components/admin/AdminAppointmentRow';
import { Timeline, type TimelineColumn } from '@/components/admin/Timeline';
import {
  Button,
  Card,
  EmptyState,
  FAB,
  FilterChips,
  IconButton,
  QueryState,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  SkeletonListItem,
  Text,
  type FilterOption,
  type SegmentOption,
} from '@/components/ui';
import { useCustomerMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { AdminTabScreenProps, AppointmentsView } from '@/navigation/types';
import { appointmentService } from '@/services';
import { selectActiveStaff, selectHolidayOn, selectIsStaffWorkingOn, useAppointmentStore, useBusinessStore, useStaffStore } from '@/store';
import { useTheme } from '@/theme';
import type { Appointment, AppointmentStatus, ID, ISODate, TimeString } from '@/types';
import { addDaysISO, formatDisplayDate, formatRelativeDay, parseISODate, todayISO, toISODate } from '@/utils/date';

type Props = AdminTabScreenProps<'Appointments'>;

type ListRange = 'upcoming' | 'today' | 'week' | 'past' | 'all';

const VIEW_OPTIONS: readonly SegmentOption<AppointmentsView>[] = [
  { value: 'day', label: 'Day', icon: 'today-outline' },
  { value: 'week', label: 'Week', icon: 'calendar-outline' },
  { value: 'list', label: 'List', icon: 'list-outline' },
];

const STATUS_OPTIONS: readonly FilterOption<AppointmentStatus>[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

const RANGE_OPTIONS: readonly FilterOption<ListRange>[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'past', label: 'Past' },
];

const matchesRange = (date: ISODate, range: ListRange | null, today: ISODate): boolean => {
  switch (range) {
    case 'upcoming':
      return date >= today;
    case 'today':
      return date === today;
    case 'week':
      return date >= today && date <= addDaysISO(today, 6);
    case 'past':
      return date < today;
    default:
      return true;
  }
};

export const AppointmentsScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const services = useServiceMap();
  const staffMap = useStaffMap();
  const customers = useCustomerMap();
  const activeStaff = useStaffStore((state) => selectActiveStaff(state.staff));
  const { holidays, profile } = useBusinessStore();
  const today = todayISO();

  const [view, setView] = useState<AppointmentsView>(route.params?.view ?? 'day');
  const [date, setDate] = useState<ISODate>(route.params?.date ?? today);
  const [status, setStatus] = useState<AppointmentStatus | null>(route.params?.status ?? null);
  const [staffId, setStaffId] = useState<ID | null>(null);
  const [range, setRange] = useState<ListRange | null>('upcoming');

  // Deep links from the Dashboard (e.g. "Pending approval") update the filters.
  useEffect(() => {
    if (route.params?.view) setView(route.params.view);
    if (route.params?.date) setDate(route.params.date);
    if (route.params?.status !== undefined) setStatus(route.params.status);
  }, [route.params]);

  const query = useServiceQuery(() => appointmentService.listAppointments(), [], { refetchOn: [useAppointmentStore] });

  const staffOptions = useMemo<FilterOption<ID>[]>(() => activeStaff.map((m) => ({ value: m.id, label: m.name.split(' ')[0] ?? m.name })), [activeStaff]);
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((a) => (status ? a.status === status : true) && (staffId ? a.staffId === staffId : true)),
    [query.data, status, staffId],
  );

  const shownStaff = staffId ? activeStaff.filter((m) => m.id === staffId) : activeStaff;
  const holiday = selectHolidayOn(holidays, date);

  const dayColumns = useMemo<TimelineColumn[]>(
    () =>
      shownStaff.map((member) => ({
        key: member.id,
        title: member.name.split(' ')[0] ?? member.name,
        closed: holiday ? holiday.name : selectIsStaffWorkingOn(member, date) ? undefined : 'Day off',
        appointments: filtered.filter((a) => a.date === date && a.staffId === member.id),
      })),
    [shownStaff, filtered, date, holiday],
  );

  const weekStart = toISODate(startOfWeek(parseISODate(date), { weekStartsOn: 0 }));
  const weekColumns = useMemo<TimelineColumn[]>(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDaysISO(weekStart, i);
        const dayHoliday = selectHolidayOn(holidays, day);
        return {
          key: day,
          title: format(addDays(parseISODate(weekStart), i), 'EEE d'),
          closed: dayHoliday?.name,
          appointments: filtered.filter((a) => a.date === day),
        };
      }),
    [weekStart, filtered, holidays],
  );

  const listGroups = useMemo(() => {
    const items = filtered.filter((a) => matchesRange(a.date, range, today));
    const ordered = range === 'past' ? [...items].reverse() : items;
    const groups = new Map<ISODate, Appointment[]>();
    ordered.forEach((a) => groups.set(a.date, [...(groups.get(a.date) ?? []), a]));
    return [...groups];
  }, [filtered, range, today]);

  const shift = (days: number): void => setDate(addDaysISO(date, days));
  const openDetail = (appointment: Appointment): void => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id });
  const newBooking = (prefill?: { date?: ISODate; staffId?: ID; time?: TimeString }): void => navigation.navigate('AppointmentForm', prefill);

  const dateBar = (
    <View style={styles.dateBar}>
      <IconButton icon="chevron-back" accessibilityLabel={view === 'week' ? 'Previous week' : 'Previous day'} variant="soft" onPress={() => shift(view === 'week' ? -7 : -1)} />
      <View style={styles.dateText}>
        <Text variant="h4" align="center">
          {view === 'week' ? `${format(parseISODate(weekStart), 'd MMM')} - ${format(addDays(parseISODate(weekStart), 6), 'd MMM')}` : formatRelativeDay(date)}
        </Text>
        {view === 'day' ? (
          <Text variant="caption" tone="muted" align="center">
            {holiday ? `Closed · ${holiday.name}` : formatDisplayDate(date)}
          </Text>
        ) : null}
      </View>
      <IconButton icon="chevron-forward" accessibilityLabel={view === 'week' ? 'Next week' : 'Next day'} variant="soft" onPress={() => shift(view === 'week' ? 7 : 1)} />
      {date !== today ? <Button title="Today" size="sm" variant="ghost" onPress={() => setDate(today)} /> : null}
    </View>
  );

  return (
    <Screen
      refreshing={query.refreshing}
      onRefresh={() => void query.refetch()}
      overlay={<FAB label="New" icon="add" accessibilityLabel="New appointment" onPress={() => newBooking(view === 'list' ? undefined : { date })} />}
    >
      <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
      {view === 'list' ? (
        <FilterChips options={RANGE_OPTIONS} value={range} onChange={setRange} allLabel="All dates" />
      ) : (
        dateBar
      )}
      <FilterChips options={STATUS_OPTIONS} value={status} onChange={setStatus} allLabel="All statuses" />
      <FilterChips options={staffOptions} value={staffId} onChange={setStaffId} allLabel="All staff" />

      <QueryState
        query={query}
        skeleton={
          view === 'list' ? (
            <View style={{ gap: spacing.sm }}>
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonListItem key={i} />
              ))}
            </View>
          ) : (
            <Skeleton height={420} radius={12} />
          )
        }
      >
        {() =>
          view === 'list' ? (
            listGroups.length === 0 ? (
              <EmptyState icon="calendar-clear-outline" title="No appointments" message="Nothing matches these filters." actionLabel="New appointment" onAction={() => newBooking()} />
            ) : (
              <View style={{ gap: spacing.lg }}>
                {listGroups.map(([day, items]) => (
                  <View key={day} style={{ gap: spacing.sm }}>
                    <SectionHeader title={`${formatRelativeDay(day)} · ${items.length}`} compact />
                    {items.map((appointment) => (
                      <AdminAppointmentRow
                        key={appointment.id}
                        appointment={appointment}
                        customer={customers.get(appointment.customerId)}
                        services={services}
                        staff={staffMap}
                        onPress={() => openDetail(appointment)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            )
          ) : (
            <Card padding="sm">
              <Timeline
                columns={view === 'day' ? dayColumns : weekColumns}
                start={profile.openTime}
                end={profile.closeTime}
                customers={customers}
                onPressAppointment={openDetail}
                onPressSlot={(key, time) => newBooking(view === 'day' ? { date, staffId: key, time } : { date: key, time })}
                nowColumnKeys={view === 'day' ? (date === today ? dayColumns.map((column) => column.key) : []) : [today]}
              />
              <Text variant="caption" tone="muted" style={{ padding: spacing.sm }}>
                Tap an empty slot to book it · colours show status
              </Text>
            </Card>
          )
        }
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dateBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { flex: 1 },
});
