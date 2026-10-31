import { startOfMonth } from 'date-fns';
import { useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RankedBars, RevenueTrendChart } from '@/components/admin/Charts';
import { Button, Card, DatePickerField, FilterChips, QueryState, Screen, SectionHeader, Skeleton, StatCard, Text, useToast, type FilterOption } from '@/components/ui';
import { useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, enrollmentService } from '@/services';
import { useAppointmentStore, useCourseStore } from '@/store';
import { useTheme } from '@/theme';
import type { ISODate } from '@/types';
import { feesCollected, inRange, retention, revenueByDay, revenueByService, revenueByStaff, sumCollected } from '@/utils/analytics';
import { addDaysISO, formatShortDate, todayISO, toISODate } from '@/utils/date';
import { formatCurrency, toPercent } from '@/utils/format';

type Props = RootStackScreenProps<'Reports'>;
type Preset = '7d' | '30d' | '90d' | 'month' | 'custom';

const PRESETS: readonly FilterOption<Preset>[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

const rangeFor = (preset: Preset, today: ISODate): { from: ISODate; to: ISODate } => {
  switch (preset) {
    case '7d':
      return { from: addDaysISO(today, -6), to: today };
    case '90d':
      return { from: addDaysISO(today, -89), to: today };
    case 'month':
      return { from: toISODate(startOfMonth(new Date())), to: today };
    default:
      return { from: addDaysISO(today, -29), to: today };
  }
};

export const ReportsScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const services = useServiceMap();
  const staff = useStaffMap();
  const today = todayISO();
  const [preset, setPreset] = useState<Preset | null>('30d');
  const [custom, setCustom] = useState<{ from: ISODate | null; to: ISODate | null }>({ from: addDaysISO(today, -13), to: today });

  const range = preset === 'custom' || preset === null ? { from: custom.from ?? today, to: custom.to ?? today } : rangeFor(preset, today);
  const fileName = `ansita-report_${range.from}_${range.to}.csv`;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <Button title="Export" size="sm" variant="ghost" leftIcon="download-outline" onPress={() => toast.success(`Exported ${fileName} (demo)`)} />,
    });
  }, [navigation, toast, fileName]);

  const query = useServiceQuery(
    async () => {
      const [appointments, enrollments] = await Promise.all([appointmentService.listAppointments(), enrollmentService.listEnrollments()]);
      return { appointments, enrollments };
    },
    [],
    { refetchOn: [useAppointmentStore, useCourseStore] },
  );

  const report = useMemo(() => {
    if (!query.data) return null;
    const { appointments, enrollments } = query.data;
    const inPeriod = appointments.filter((a) => inRange(a.date, range.from, range.to));
    const completed = inPeriod.filter((a) => a.status === 'completed');
    const booked = inPeriod.filter((a) => a.status !== 'cancelled');
    const revenue = sumCollected(inPeriod);
    return {
      revenue,
      fees: feesCollected(enrollments, range.from, range.to),
      booked: booked.length,
      completed: completed.length,
      avgTicket: completed.length ? Math.round(sumCollected(completed) / completed.length) : 0,
      cancelRate: toPercent(inPeriod.filter((a) => a.status === 'cancelled').length, inPeriod.length),
      noShowRate: toPercent(inPeriod.filter((a) => a.status === 'no_show').length, booked.length),
      trend: revenueByDay(appointments, range.from, range.to),
      byService: revenueByService(inPeriod, services),
      byStaff: revenueByStaff(inPeriod, staff),
      retention: retention(appointments, range.from, range.to),
    };
  }, [query.data, range.from, range.to, services, staff]);

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <FilterChips options={PRESETS} value={preset} onChange={(value) => setPreset(value ?? '30d')} />
      {preset === 'custom' ? (
        <View style={styles.row}>
          <DatePickerField label="From" value={custom.from} onChange={(from) => setCustom((c) => ({ ...c, from }))} maxDate={custom.to ?? today} style={styles.flex} />
          <DatePickerField label="To" value={custom.to} onChange={(to) => setCustom((c) => ({ ...c, to }))} minDate={custom.from ?? undefined} style={styles.flex} />
        </View>
      ) : null}
      <Text variant="caption" tone="muted">
        {formatShortDate(range.from)} – {formatShortDate(range.to)} · revenue = money collected on bookings in this period
      </Text>

      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.md }}>
            <Skeleton height={104} radius={16} />
            <Skeleton height={200} radius={16} />
            <Skeleton height={240} radius={16} />
          </View>
        }
      >
        {() =>
          report ? (
            <View style={{ gap: spacing.xl }}>
              <View style={[styles.grid, { gap: spacing.md }]}>
                <StatCard label="Service revenue" value={formatCurrency(report.revenue)} icon="cash-outline" tone="success" caption={`Avg ticket ${formatCurrency(report.avgTicket)}`} style={styles.cell} />
                <StatCard label="Course fees" value={formatCurrency(report.fees)} icon="school-outline" tone="accent" caption="Received in period" style={styles.cell} />
                <StatCard label="Bookings" value={report.booked} icon="calendar-outline" caption={`${report.completed} completed`} style={styles.cell} />
                <StatCard
                  label="Cancelled"
                  value={`${report.cancelRate}%`}
                  icon="close-circle-outline"
                  tone={report.cancelRate > 15 ? 'danger' : 'neutral'}
                  caption={`No-shows ${report.noShowRate}%`}
                  style={styles.cell}
                />
              </View>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Revenue trend" subtitle="Collected per day" compact />
                <RevenueTrendChart days={report.trend} />
              </Card>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Revenue by service" subtitle="Split by list price on multi-service bookings" compact />
                <RankedBars items={report.byService} detail={(item) => `${item.count} paid booking${item.count === 1 ? '' : 's'}`} />
              </Card>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Revenue by staff" compact />
                <RankedBars items={report.byStaff} detail={(item) => `${item.count} completed`} />
              </Card>

              <Card style={{ gap: spacing.md }}>
                <SectionHeader title="Customer retention" subtitle="Based on completed visits" compact />
                <View style={[styles.grid, { gap: spacing.md }]}>
                  <View style={styles.cell}>
                    <Text variant="h2">{report.retention.active}</Text>
                    <Text variant="caption" tone="muted">
                      customers visited
                    </Text>
                  </View>
                  <View style={styles.cell}>
                    <Text variant="h2">{Math.round(report.retention.repeatRate * 100)}%</Text>
                    <Text variant="caption" tone="muted">
                      came back 2+ times
                    </Text>
                  </View>
                  <View style={styles.cell}>
                    <Text variant="h2">{report.retention.returning}</Text>
                    <Text variant="caption" tone="muted">
                      returning · {report.retention.newCustomers} new
                    </Text>
                  </View>
                  <View style={styles.cell}>
                    <Text variant="h2" tone={report.retention.lapsed > 0 ? 'warning' : 'default'}>
                      {report.retention.lapsed}
                    </Text>
                    <Text variant="caption" tone="muted">
                      lapsed since previous period
                    </Text>
                  </View>
                </View>
                <RankedBars
                  items={[
                    { id: 'returning', label: 'Returning customers', value: report.retention.returning, count: 0 },
                    { id: 'new', label: 'New customers', value: report.retention.newCustomers, count: 0 },
                  ]}
                  format={(value) => String(value)}
                />
              </Card>

              <Button title="Export report (CSV)" leftIcon="download-outline" variant="outline" onPress={() => toast.success(`Exported ${fileName} (demo)`)} fullWidth />
            </View>
          ) : null
        }
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
