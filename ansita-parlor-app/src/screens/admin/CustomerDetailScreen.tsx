import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AdminAppointmentRow } from '@/components/admin/AdminAppointmentRow';
import { MultiChipSelect } from '@/components/admin/Pickers';
import { EnrollmentCard } from '@/components/customer/EnrollmentCard';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ConfirmDialog,
  Input,
  QueryState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatCard,
  Text,
  useToast,
} from '@/components/ui';
import { useCourseMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, customerService, enrollmentService, getErrorMessage } from '@/services';
import { useAppointmentStore, useCourseStore, useCustomerStore } from '@/store';
import { useTheme } from '@/theme';
import type { CustomerTag } from '@/types';
import { formatDisplayDate, formatRelativeDay, getAge } from '@/utils/date';
import { formatCurrency, formatEnumLabel, formatNumber } from '@/utils/format';
import { formatPhone } from '@/utils/phone';

import { TAG_TONES } from './CustomersScreen';

type Props = RootStackScreenProps<'CustomerDetail'>;

const TAGS = (Object.keys(TAG_TONES) as CustomerTag[]).map((tag) => ({ value: tag, label: tag === 'vip' ? 'VIP' : formatEnumLabel(tag) }));

export const CustomerDetailScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const { customerId } = route.params;
  const services = useServiceMap();
  const staff = useStaffMap();
  const courses = useCourseMap();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = useServiceQuery(
    async () => {
      const [customer, stats, appointments, enrollments] = await Promise.all([
        customerService.getCustomer(customerId),
        customerService.getCustomerStats(customerId),
        appointmentService.listAppointments({ customerId }),
        enrollmentService.listEnrollments({ studentId: customerId }),
      ]);
      return { customer, stats, appointments: [...appointments].reverse(), enrollments };
    },
    [customerId],
    { refetchOn: [useCustomerStore, useAppointmentStore, useCourseStore] },
  );

  const act = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const open = (url: string) => () => Linking.openURL(url).catch(() => toast.error('Could not open this on your device.'));

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ customer, stats, appointments, enrollments }) => {
          return (
            <View style={{ gap: spacing.xl }}>
              <Card style={[styles.center, { gap: spacing.sm }]}>
                <Avatar name={customer.name} uri={customer.avatar} size="xl" />
                <Text variant="h2" align="center">
                  {customer.name}
                </Text>
                <Text variant="bodySmall" tone="secondary">
                  {formatPhone(customer.phone)}
                  {customer.email ? ` · ${customer.email}` : ''}
                </Text>
                <Text variant="caption" tone="muted" align="center">
                  {[customer.address.line1, customer.address.city].filter(Boolean).join(', ')}
                  {customer.dob ? ` · ${getAge(customer.dob)} yrs (${formatDisplayDate(customer.dob)})` : ''}
                </Text>
                <View style={[styles.row, { marginTop: spacing.sm }]}>
                  <Button title="Call" leftIcon="call-outline" size="sm" onPress={open(`tel:${customer.phone}`)} />
                  <Button title="WhatsApp" leftIcon="logo-whatsapp" size="sm" variant="secondary" onPress={open(`https://wa.me/${customer.phone.replace(/\D/g, '')}`)} />
                  <Button title="Book" leftIcon="calendar-outline" size="sm" variant="outline" onPress={() => navigation.navigate('AppointmentForm', { customerId })} />
                </View>
              </Card>

              <View style={[styles.grid, { gap: spacing.md }]}>
                <StatCard label="Visits" value={stats.totalVisits} icon="checkmark-done-outline" caption={stats.lastVisit ? `Last ${formatRelativeDay(stats.lastVisit)}` : 'No visits yet'} style={styles.cell} />
                <StatCard label="Total spend" value={formatCurrency(stats.totalSpent)} icon="cash-outline" tone="success" caption={`${stats.cancelledCount} cancelled`} style={styles.cell} />
                <StatCard
                  label="Loyalty points"
                  value={formatNumber(customer.loyaltyPoints)}
                  icon="diamond-outline"
                  tone="accent"
                  caption="Earned on visits"
                  style={styles.cell}
                />
                <StatCard label="Upcoming" value={stats.upcomingCount} icon="calendar-outline" tone="info" caption={`${stats.activeEnrollments} active course`} style={styles.cell} />
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Tags" compact />
                <MultiChipSelect
                  options={TAGS}
                  value={customer.tags}
                  onChange={(tags) => void act(() => customerService.updateCustomer(customerId, { tags }), 'Tags updated')}
                />
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Notes & preferences" subtitle="Allergies, favourite shades, anything staff should know" compact />
                {notesDraft === null ? (
                  <Card variant="filled" onPress={() => setNotesDraft(customer.notes)} accessibilityLabel="Edit notes">
                    <Text variant="bodySmall" tone={customer.notes ? 'default' : 'muted'}>
                      {customer.notes || 'No notes yet. Tap to add.'}
                    </Text>
                  </Card>
                ) : (
                  <View style={{ gap: spacing.sm }}>
                    <Input value={notesDraft} onChangeText={setNotesDraft} multiline maxLength={300} showCount autoFocus />
                    <View style={styles.row}>
                      <Button title="Cancel" variant="ghost" size="sm" onPress={() => setNotesDraft(null)} />
                      <Button
                        title="Save notes"
                        size="sm"
                        loading={busy}
                        onPress={() => void act(() => customerService.updateCustomer(customerId, { notes: notesDraft }), 'Notes saved').then((ok) => ok && setNotesDraft(null))}
                      />
                    </View>
                  </View>
                )}
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Visit history" subtitle={`${appointments.length} bookings`} compact />
                {appointments.length === 0 ? (
                  <Card variant="outlined" padding="none">
                    <EmptyState
                      compact
                      icon="calendar-clear-outline"
                      title="No bookings yet"
                      message="Book this customer's first visit."
                      actionLabel="New booking"
                      onAction={() => navigation.navigate('AppointmentForm', { customerId })}
                    />
                  </Card>
                ) : (
                  appointments.slice(0, 15).map((appointment) => (
                    <AdminAppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      customer={customer}
                      services={services}
                      staff={staff}
                      showDate={formatRelativeDay(appointment.date)}
                      onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id })}
                    />
                  ))
                )}
              </View>

              {enrollments.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title="Courses" compact />
                  {enrollments.map((enrollment) => (
                    <EnrollmentCard
                      key={enrollment.id}
                      enrollment={enrollment}
                      course={courses.get(enrollment.courseId)}
                      onPress={() => navigation.navigate('EnrollmentDetail', { enrollmentId: enrollment.id })}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                <Button title="Edit details" leftIcon="create-outline" variant="outline" onPress={() => navigation.navigate('CustomerForm', { customerId })} fullWidth />
                <Button title="Delete customer" variant="ghost" onPress={() => setDeleteOpen(true)} style={styles.centerSelf} />
              </View>


              <ConfirmDialog
                visible={deleteOpen}
                tone="danger"
                title={`Delete ${customer.name}?`}
                message="Their profile and app login are removed. Customers with upcoming bookings or an ongoing course can't be deleted."
                confirmLabel="Delete"
                loading={busy}
                onConfirm={() =>
                  void act(() => customerService.deleteCustomer(customerId), 'Customer deleted').then((ok) => {
                    setDeleteOpen(false);
                    if (ok) navigation.goBack();
                  })
                }
                onCancel={() => setDeleteOpen(false)}
              />
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  centerSelf: { alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexBasis: '47%', flexGrow: 1 },
  flex: { flex: 1 },
});
