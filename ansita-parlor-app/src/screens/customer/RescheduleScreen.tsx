import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateCalendar } from '@/components/customer/DateCalendar';
import { appointmentOfferLabel } from '@/components/customer/OfferCarousel';
import { Button, Card, EmptyState, Icon, QueryState, Screen, SectionHeader, Skeleton, Text, TimeSlotGrid, useToast } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFreeSlots, useIsDayOff, useQualifiedStaff } from '@/hooks/useBookingAvailability';
import { serviceNames, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService } from '@/services';
import { useTheme } from '@/theme';
import type { ISODate, TimeString } from '@/types';
import { formatDisplayDate, formatRelativeDay, formatTimeRange } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Props = RootStackScreenProps<'Reschedule'>;

/** Move a booking to another date and time with the same stylist. Sends it back for confirmation. */
export const RescheduleScreen = ({ navigation, route }: Props) => {
  const { colors, spacing, radius } = useTheme();
  const toast = useToast();
  const t = useT();
  const services = useServiceMap();
  const staff = useStaffMap();
  const { appointmentId } = route.params;
  const query = useServiceQuery(() => appointmentService.getAppointment(appointmentId), [appointmentId]);
  const appointment = query.data;

  const [date, setDate] = useState<ISODate | null>(null);
  const [time, setTime] = useState<TimeString | null>(null);

  const serviceIds = appointment?.serviceIds ?? [];
  const qualified = useQualifiedStaff(serviceIds);
  const choice = appointment?.staffId ?? null;
  const isDayOff = useIsDayOff(choice, qualified);
  const slots = useFreeSlots({ date, choice, qualified, serviceIds, excludeAppointmentId: appointmentId });
  const update = useAsyncAction(appointmentService.updateAppointment);

  const save = async (): Promise<void> => {
    if (!date || !time) return;
    const before = appointment;
    const updated = await update.run(appointmentId, { date, startTime: time });
    if (updated) {
      // The server re-checks the offer for the new date; say so when the discount changed.
      const offerChanged = before && (updated.offerId !== before.offerId || updated.offerDiscount !== before.offerDiscount);
      const offerNote = !offerChanged
        ? ''
        : updated.offerDiscount > 0
          ? t('reschedule.offerNow', { title: updated.offerTitle ?? '', amount: formatCurrency(updated.offerDiscount) })
          : before.offerTitle
            ? t('reschedule.offerLost', { title: before.offerTitle })
            : '';
      toast.success(`Reschedule requested. We will confirm the new time shortly.${offerNote ? ` ${offerNote}` : ''}`);
      navigation.goBack();
    }
  };

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState query={query} skeleton={<Skeleton height={120} radius={radius.lg} />}>
        {(current) => (
          <View style={{ gap: spacing.lg }}>
            <Card variant="filled" style={{ gap: spacing.xs }}>
              <Text variant="overline" tone="muted">
                Current booking
              </Text>
              <Text variant="h4">{serviceNames(current.serviceIds, services)}</Text>
              <Text variant="bodySmall" tone="secondary">
                {formatRelativeDay(current.date)} · {formatTimeRange(current.startTime, current.endTime)} · {staff.get(current.staffId)?.name}
              </Text>
              {current.offerDiscount > 0 ? (
                <Text variant="caption" tone="success">
                  {appointmentOfferLabel(t, current)} −{formatCurrency(current.offerDiscount)}
                </Text>
              ) : null}
            </Card>

            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="New date" compact />
              <Card padding="sm">
                <DateCalendar
                  value={date}
                  onChange={(next) => {
                    // A new day means the old time may not be free.
                    setDate(next);
                    setTime(null);
                  }}
                  isDisabled={isDayOff}
                />
              </Card>
            </View>

            {date ? (
              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="New time" subtitle={formatDisplayDate(date)} compact />
                {!slots.loading && (slots.data?.length ?? 0) === 0 ? (
                  <Card variant="outlined" padding="none">
                    <EmptyState compact icon="time-outline" title="Fully booked" message="Try another day." />
                  </Card>
                ) : (
                  <TimeSlotGrid slots={slots.data ?? []} value={time} onChange={setTime} loading={slots.loading} />
                )}
              </View>
            ) : null}

            {update.error ? (
              <Text variant="bodySmall" tone="danger">
                {update.error}
              </Text>
            ) : null}
            <View style={styles.note}>
              <Icon name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text variant="caption" tone="muted" style={styles.flex}>
                Your booking goes back to “pending” until the parlour confirms the new time.
              </Text>
            </View>
            <Button title="Request new time" size="lg" disabled={!date || !time} loading={update.loading} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
});
