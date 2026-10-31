import { format } from 'date-fns';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, RatingStars, StatusPill, Text } from '@/components/ui';
import { firstName, serviceNames } from '@/hooks/useCatalog';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import type { Appointment, ID, Review, Service, Staff } from '@/types';
import { formatTimeRange, parseISODate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

interface AppointmentCardProps {
  appointment: Appointment;
  services: ReadonlyMap<ID, Service>;
  staff: ReadonlyMap<ID, Staff>;
  /** The customer's review of this visit, if any. */
  review?: Review | null;
  onReschedule?: () => void;
  onCancel?: () => void;
  onRebook?: () => void;
  onReview?: () => void;
}

/** Booking summary with a date block, status and the actions that apply to its state. */
export const AppointmentCard = ({ appointment, services, staff, review, onReschedule, onCancel, onRebook, onReview }: AppointmentCardProps) => {
  const { colors, radius, spacing } = useTheme();
  const t = useT();
  const date = parseISODate(appointment.date);
  const stylist = firstName(staff.get(appointment.staffId)?.name);
  const due = appointment.totalPrice - appointment.amountPaid;

  const actions = [
    onReschedule ? <Button key="r" title={t('appointments.reschedule')} size="sm" variant="secondary" leftIcon="time-outline" onPress={onReschedule} /> : null,
    onCancel ? <Button key="c" title={t('appointments.cancel')} size="sm" variant="ghost" onPress={onCancel} /> : null,
    onReview ? <Button key="v" title={t('appointments.review')} size="sm" variant="secondary" leftIcon="star-outline" onPress={onReview} /> : null,
    onRebook ? <Button key="b" title={t('appointments.rebook')} size="sm" variant="outline" leftIcon="repeat" onPress={onRebook} /> : null,
  ].filter(Boolean);

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.top}>
        <View style={[styles.dateBlock, { backgroundColor: colors.primarySoft, borderRadius: radius.md }]}>
          <Text variant="overline" tone="primary">
            {format(date, 'MMM')}
          </Text>
          <Text variant="h2" tone="primary" style={styles.day}>
            {format(date, 'd')}
          </Text>
          <Text variant="caption" tone="secondary">
            {format(date, 'EEE')}
          </Text>
        </View>
        <View style={styles.body}>
          <Text variant="h4" numberOfLines={2}>
            {serviceNames(appointment.serviceIds, services)}
          </Text>
          <View style={styles.meta}>
            <Icon name="time-outline" size={14} color={colors.textMuted} />
            <Text variant="bodySmall" tone="secondary">
              {formatTimeRange(appointment.startTime, appointment.endTime)}
            </Text>
          </View>
          {stylist ? (
            <View style={styles.meta}>
              <Icon name="person-outline" size={14} color={colors.textMuted} />
              <Text variant="bodySmall" tone="secondary">
                with {stylist}
              </Text>
            </View>
          ) : null}
        </View>
        <StatusPill kind="appointment" status={appointment.status} size="sm" />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border, paddingTop: spacing.md }]}>
        <View style={styles.flex}>
          <Text variant="label">{formatCurrency(appointment.totalPrice)}</Text>
          {appointment.status !== 'cancelled' && appointment.amountPaid > 0 && due > 0 ? (
            <Text variant="caption" tone="warning">
              {formatCurrency(appointment.amountPaid)} paid · {formatCurrency(due)} due
            </Text>
          ) : appointment.paymentStatus === 'paid' ? (
            <Text variant="caption" tone="success">
              Paid
            </Text>
          ) : null}
        </View>
        {review ? <RatingStars value={review.rating} size={14} /> : null}
      </View>

      {appointment.status === 'cancelled' && appointment.cancellationReason ? (
        <Text variant="caption" tone="muted">
          Reason: {appointment.cancellationReason}
        </Text>
      ) : null}

      {actions.length > 0 ? <View style={[styles.actions, { gap: spacing.sm }]}>{actions}</View> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dateBlock: { width: 58, paddingVertical: 8, alignItems: 'center' },
  day: { lineHeight: 26 },
  body: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' },
});
