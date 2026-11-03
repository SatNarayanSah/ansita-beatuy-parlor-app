import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminAppointmentRow } from '@/components/admin/AdminAppointmentRow';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  IconButton,
  QueryState,
  RatingStars,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatCard,
  Text,
  useToast,
} from '@/components/ui';
import { useCategoryMap, useCustomerMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, getErrorMessage, staffService } from '@/services';
import { useAppointmentStore, useReviewStore, useStaffStore } from '@/store';
import { useTheme } from '@/theme';
import type { Weekday } from '@/types';
import { sumCollected } from '@/utils/analytics';
import { addDaysISO, formatRelativeDay, formatTime12, formatTimeAgo, todayISO } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';
import { formatPhone } from '@/utils/phone';

type Props = RootStackScreenProps<'StaffDetail'>;

const DAY_LABELS: Record<Weekday, string> = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

/** Profile, 30-day performance, a day-by-day schedule and weekly hours. */
export const StaffDetailScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const { staffId } = route.params;
  const services = useServiceMap();
  const staffMap = useStaffMap();
  const customers = useCustomerMap();
  const categories = useCategoryMap();
  const [date, setDate] = useState(todayISO());
  const [toggleOpen, setToggleOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = useServiceQuery(
    async () => {
      const today = todayISO();
      const [member, recent, reviews] = await Promise.all([
        staffService.getStaff(staffId),
        appointmentService.listAppointments({ staffId, from: addDaysISO(today, -29), to: today }),
        staffService.getReviews(staffId),
      ]);
      return { member, recent, reviews };
    },
    [staffId],
    { refetchOn: [useStaffStore, useAppointmentStore, useReviewStore] },
  );
  const schedule = useServiceQuery(() => staffService.getSchedule(staffId, date), [staffId, date], { refetchOn: [useAppointmentStore] });

  const toggleActive = async (isActive: boolean): Promise<void> => {
    setBusy(true);
    try {
      await staffService.setStaffActive(staffId, isActive);
      toast.success(isActive ? 'Staff member reactivated' : 'Staff member deactivated');
      setToggleOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setToggleOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ member, recent, reviews }) => {
          const completed = recent.filter((a) => a.status === 'completed');
          const noShows = recent.filter((a) => a.status === 'no_show').length;
          const booked = recent.filter((a) => a.status !== 'cancelled').length;
          return (
            <View style={{ gap: spacing.lg }}>
              <Card style={[styles.center, { gap: spacing.sm }]}>
                <Avatar name={member.name} uri={member.avatar} size="xl" ring />
                <Text variant="h2">{member.name}</Text>
                <Text variant="bodySmall" tone="secondary">
                  {formatEnumLabel(member.role)} · {formatPhone(member.phone)}
                </Text>
                <View style={styles.wrap}>
                  {member.specialties.map((id) => (
                    <Badge key={id} label={categories.get(id)?.name ?? 'Category'} tone="primary" size="sm" />
                  ))}
                  {!member.isActive ? <Badge label="Inactive" tone="neutral" size="sm" /> : null}
                </View>
              </Card>

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Last 30 days" compact />
                <View style={[styles.grid, { gap: spacing.sm }]}>
                  <StatCard label="Appointments" value={booked} icon="calendar-outline" caption={`${completed.length} completed`} style={styles.cell} />
                  <StatCard label="Revenue" value={formatCurrency(sumCollected(recent))} icon="cash-outline" tone="success" style={styles.cell} />
                  <StatCard label="Rating" value={member.rating || '–'} icon="star-outline" tone="highlight" caption={`${reviews.length} reviews`} style={styles.cell} />
                  <StatCard
                    label="No-shows"
                    value={noShows}
                    icon="person-remove-outline"
                    tone={noShows > 2 ? 'danger' : 'neutral'}
                    caption={booked ? `${Math.round((noShows / booked) * 100)}% of bookings` : 'No bookings'}
                    style={styles.cell}
                  />
                </View>
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Schedule" compact />
                <View style={styles.dateBar}>
                  <IconButton icon="chevron-back" accessibilityLabel="Previous day" variant="soft" onPress={() => setDate(addDaysISO(date, -1))} />
                  <Text variant="h4" align="center" style={styles.flex}>
                    {formatRelativeDay(date)}
                  </Text>
                  <IconButton icon="chevron-forward" accessibilityLabel="Next day" variant="soft" onPress={() => setDate(addDaysISO(date, 1))} />
                </View>
                <QueryState
                  query={schedule}
                  skeleton={<SkeletonCard />}
                  isEmpty={(list) => list.length === 0}
                  empty={{
                    icon: 'cafe-outline',
                    title: 'Nothing booked',
                    message: 'No appointments on this day.',
                    actionLabel: 'Book for this day',
                    onAction: () => navigation.navigate('AppointmentForm', { staffId, date }),
                  }}
                >
                  {(list) => (
                    <View style={{ gap: spacing.sm }}>
                      {list.map((appointment) => (
                        <AdminAppointmentRow
                          key={appointment.id}
                          appointment={appointment}
                          customer={customers.get(appointment.customerId)}
                          services={services}
                          staff={staffMap}
                          onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment.id })}
                        />
                      ))}
                    </View>
                  )}
                </QueryState>
              </View>

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Working hours" actionLabel="Edit" onAction={() => navigation.navigate('StaffForm', { staffId })} compact />
                <Card padding="md">
                  {member.workingHours.map((day, index) => (
                    <View key={day.day}>
                      {index > 0 ? <Divider spacing="xs" /> : null}
                      <View style={styles.hoursRow}>
                        <Text variant="bodySmall" style={styles.flex}>
                          {DAY_LABELS[day.day]}
                        </Text>
                        <Text variant="label" tone={day.isOff ? 'muted' : 'default'}>
                          {day.isOff ? 'Day off' : `${formatTime12(day.start)} – ${formatTime12(day.end)}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </Card>
              </View>

              {reviews.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionHeader title="Recent reviews" compact />
                  <Card padding="md" style={{ gap: spacing.sm }}>
                    {reviews.slice(0, 4).map((review, index) => (
                      <View key={review.id} style={{ gap: 2 }}>
                        {index > 0 ? <Divider spacing="xs" /> : null}
                        <View style={styles.hoursRow}>
                          <Text variant="label" style={styles.flex}>
                            {customers.get(review.customerId)?.name ?? 'Customer'}
                          </Text>
                          <RatingStars value={review.rating} size={12} />
                        </View>
                        {review.comment ? (
                          <Text variant="caption" tone="secondary">
                            {review.comment}
                          </Text>
                        ) : null}
                        <Text variant="caption" tone="muted">
                          {formatTimeAgo(review.createdAt)}
                        </Text>
                      </View>
                    ))}
                  </Card>
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                <Button title="Edit profile & hours" leftIcon="create-outline" variant="outline" onPress={() => navigation.navigate('StaffForm', { staffId })} fullWidth />
                <Button
                  title={member.isActive ? 'Deactivate' : 'Reactivate'}
                  variant="ghost"
                  onPress={() => (member.isActive ? setToggleOpen(true) : void toggleActive(true))}
                  style={styles.centerSelf}
                />
              </View>

              <ConfirmDialog
                visible={toggleOpen}
                tone="danger"
                icon="person-remove-outline"
                title={`Deactivate ${member.name}?`}
                message="They will no longer appear for new bookings. Upcoming bookings must be reassigned first. Their history and reviews are kept."
                confirmLabel="Deactivate"
                loading={busy}
                onConfirm={() => void toggleActive(false)}
                onCancel={() => setToggleOpen(false)}
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexBasis: '47%', flexGrow: 1 },
  dateBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
});
