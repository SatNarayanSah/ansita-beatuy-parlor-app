import { format } from 'date-fns';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, RatingStars, StatusPill, Text } from '@/components/ui';
import { firstName, serviceNames } from '@/hooks/useCatalog';
import { useT } from '@/i18n';
import { selectAmountDue, selectDiscountTotal } from '@/store';
import { useTheme } from '@/theme';
import type { Appointment, ID, PaymentRequest, Review, Service, Staff } from '@/types';
import { formatTimeRange, parseISODate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { sameDataProps } from '@/utils/memo';

import { appointmentOfferLabel } from './OfferCarousel';
import { PaymentRequestStatus } from './PaymentRequestStatus';

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
  /** The customer's "I've paid" requests for this booking (pending / recently rejected are shown). */
  paymentRequests?: readonly PaymentRequest[];
  /** "I've paid": shown when there's a balance the customer can pay online. */
  onPaid?: () => void;
}

/** Booking summary with a date block, status and the actions that apply to its state. */
const AppointmentCardBase = ({
  appointment,
  services,
  staff,
  review,
  onReschedule,
  onCancel,
  onRebook,
  onReview,
  paymentRequests,
  onPaid,
}: AppointmentCardProps) => {
  const { colors, radius, spacing } = useTheme();
  const t = useT();
  const date = parseISODate(appointment.date);
  const stylist = firstName(staff.get(appointment.staffId)?.name);
  const due = selectAmountDue(appointment);
  const discounted = selectDiscountTotal(appointment) > 0;

  const actions = [
    onPaid ? <Button key="p" title={t('appointments.paid')} size="sm" variant="secondary" leftIcon="checkmark-circle-outline" onPress={onPaid} /> : null,
    onReschedule ? <Button key="r" title={t('appointments.reschedule')} size="sm" variant="secondary" leftIcon="time-outline" onPress={onReschedule} /> : null,
    onCancel ? <Button key="c" title={t('appointments.cancel')} size="sm" variant="ghost" onPress={onCancel} /> : null,
    onReview ? <Button key="v" title={t('appointments.review')} size="sm" variant="secondary" leftIcon="star-outline" onPress={onReview} /> : null,
    onRebook ? <Button key="b" title={t('appointments.rebook')} size="sm" variant="outline" leftIcon="repeat" onPress={onRebook} /> : null,
  ].filter(Boolean);

  return (
    <Card style={{ gap: spacing.sm }}>
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

      <View style={[styles.footer, { borderTopColor: colors.border, paddingTop: spacing.sm }]}>
        <View style={styles.flex}>
          <Text variant="label">{formatCurrency(appointment.totalPrice)}</Text>
          {appointment.offerDiscount > 0 && appointment.status !== 'cancelled' ? (
            <Text variant="caption" tone="success" numberOfLines={1}>
              {appointmentOfferLabel(t, appointment)} −{formatCurrency(appointment.offerDiscount)}
            </Text>
          ) : null}
          {appointment.pointsDiscount > 0 && appointment.status !== 'cancelled' ? (
            <Text variant="caption" tone="accent">
              {t('bill.pointsOff', { amount: formatCurrency(appointment.pointsDiscount) })}
            </Text>
          ) : null}
          {appointment.status !== 'cancelled' && (appointment.amountPaid > 0 || discounted) && due > 0 ? (
            <Text variant="caption" tone={appointment.amountPaid > 0 ? 'warning' : 'secondary'}>
              {appointment.amountPaid > 0
                ? t('bill.paidDue', { paid: formatCurrency(appointment.amountPaid), due: formatCurrency(due) })
                : `${t('bill.toPay')}: ${formatCurrency(due)}`}
            </Text>
          ) : appointment.paymentStatus === 'paid' ? (
            <Text variant="caption" tone="success">
              {t('bill.paid')}
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

      {paymentRequests && paymentRequests.length > 0 ? <PaymentRequestStatus requests={paymentRequests} /> : null}

      {actions.length > 0 ? <View style={[styles.actions, { gap: spacing.sm }]}>{actions}</View> : null}
    </Card>
  );
};

export const AppointmentCard = memo(AppointmentCardBase, sameDataProps);

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dateBlock: { width: 56, paddingVertical: 6, alignItems: 'center' },
  day: { lineHeight: 26 },
  body: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' },
});
