import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { PaymentSheet } from '@/components/admin/PaymentSheet';
import { maxRedeemablePoints, RedeemPointsSheet } from '@/components/admin/RedeemPointsSheet';
import { ADMIN_CANCEL_REASONS, CancelAppointmentSheet } from '@/components/customer/AppointmentSheets';
import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  Icon,
  IconButton,
  ListItem,
  QueryState,
  RatingStars,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatusPill,
  Text,
  useToast,
} from '@/components/ui';
import { serviceNames, useCustomerMap, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, getErrorMessage } from '@/services';
import {
  selectAmountDue,
  selectPointsFor,
  selectReviewForAppointment,
  useAppointmentStore,
  useBusinessStore,
  useReviewStore,
} from '@/store';
import { useTheme } from '@/theme';
import type { AppointmentStatus, PaymentMethod } from '@/types';
import { formatDisplayDate, formatRelativeDay, formatTime12, formatTimeAgo, formatTimeRange, isPastDateTime } from '@/utils/date';
import { formatCurrency, formatDuration, formatNumber } from '@/utils/format';
import { formatPhone } from '@/utils/phone';

type Props = RootStackScreenProps<'AppointmentDetail'>;

export const AppointmentDetailScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const { appointmentId } = route.params;
  const services = useServiceMap();
  const staff = useStaffMap();
  const customers = useCustomerMap();
  const loyalty = useBusinessStore((state) => state.loyalty);
  const review = useReviewStore((state) => selectReviewForAppointment(state.reviews, appointmentId));
  const query = useServiceQuery(() => appointmentService.getAppointment(appointmentId), [appointmentId], { refetchOn: [useAppointmentStore] });

  const [busy, setBusy] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'complete' | 'payment' | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [earlyOpen, setEarlyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [removePointsOpen, setRemovePointsOpen] = useState(false);

  const run = async (key: string, action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (status: AppointmentStatus, success: string) => run(status, () => appointmentService.updateStatus(appointmentId, status), success);

  /** "Complete" = mark completed, then record the payment taken at the desk. */
  const submitPayment = async (amount: number, method: PaymentMethod): Promise<void> => {
    setPaymentError(null);
    setBusy('payment');
    try {
      if (paymentMode === 'complete') await appointmentService.updateStatus(appointmentId, 'completed');
      await appointmentService.recordPayment(appointmentId, { amount, method });
      toast.success(paymentMode === 'complete' ? 'Completed and payment recorded' : 'Payment recorded');
      setPaymentMode(null);
    } catch (error) {
      setPaymentError(getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const redeem = async (points: number): Promise<void> => {
    setRedeemError(null);
    setBusy('redeem');
    try {
      const updated = await appointmentService.redeemPoints(appointmentId, points);
      toast.success(`${formatNumber(points)} points used: ${formatCurrency(updated.pointsDiscount)} off`);
      setRedeemOpen(false);
    } catch (error) {
      setRedeemError(getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  /** With a balance due, completing goes through the payment sheet. */
  const complete = (due: number): void => {
    if (due > 0) setPaymentMode('complete');
    else void setStatus('completed', 'Marked as completed');
  };

  const completeWithoutPayment = async (): Promise<void> => {
    if (await setStatus('completed', 'Marked as completed')) setPaymentMode(null);
  };

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {(appointment) => {
          const customer = customers.get(appointment.customerId);
          const member = staff.get(appointment.staffId);
          const due = selectAmountDue(appointment);
          const points = customer?.loyaltyPoints ?? 0;
          // Points can go on a bill with money still due, once the customer has the minimum.
          const billOpen = appointment.status === 'confirmed' || appointment.status === 'completed';
          const canOfferPoints = loyalty.enabled && billOpen && appointment.pointsRedeemed === 0 && due > 0;
          const canRedeem = canOfferPoints && points >= loyalty.minRedeemPoints && maxRedeemablePoints(points, due, loyalty) > 0;
          const started = isPastDateTime(appointment.date, appointment.startTime);
          const active = appointment.status === 'pending' || appointment.status === 'confirmed';
          const summary = `${serviceNames(appointment.serviceIds, services)} · ${formatRelativeDay(appointment.date)} at ${formatTime12(appointment.startTime)}`;
          const duration = appointment.serviceIds.reduce((sum, id) => sum + (services.get(id)?.duration ?? 0), 0);

          return (
            <View style={{ gap: spacing.lg }}>
              <Card style={{ gap: spacing.sm }}>
                <View style={styles.row}>
                  <StatusPill kind="appointment" status={appointment.status} />
                  <StatusPill kind="payment" status={appointment.paymentStatus} size="sm" />
                </View>
                <Text variant="h2">{serviceNames(appointment.serviceIds, services)}</Text>
                {[
                  { icon: 'calendar-outline' as const, text: formatDisplayDate(appointment.date) },
                  { icon: 'time-outline' as const, text: `${formatTimeRange(appointment.startTime, appointment.endTime)} · ${formatDuration(duration)}` },
                  { icon: 'person-outline' as const, text: member?.name ?? 'Staff' },
                ].map((item) => (
                  <View key={item.icon} style={styles.row}>
                    <Icon name={item.icon} size={18} color={colors.primary} />
                    <Text variant="bodyMedium">{item.text}</Text>
                  </View>
                ))}
                <Text variant="caption" tone="muted">
                  Booked {formatTimeAgo(appointment.createdAt)}
                </Text>
              </Card>

              {customer ? (
                <Card padding="sm">
                  <ListItem
                    title={customer.name}
                    subtitle={formatPhone(customer.phone)}
                    description={customer.notes || undefined}
                    left={<Avatar name={customer.name} uri={customer.avatar} size="md" />}
                    right={
                      <IconButton
                        icon="call-outline"
                        variant="soft"
                        accessibilityLabel={`Call ${customer.name}`}
                        onPress={() => Linking.openURL(`tel:${customer.phone}`).catch(() => toast.error('Calling is not available on this device.'))}
                      />
                    }
                    onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
                  />
                </Card>
              ) : null}

              <Card style={{ gap: spacing.sm }}>
                <SectionHeader title="Bill" compact />
                {appointment.serviceIds.map((id) => (
                  <View key={id} style={styles.line}>
                    <Text variant="bodySmall" style={styles.flex}>
                      {services.get(id)?.name ?? 'Service'}
                    </Text>
                    <Text variant="bodySmall">{formatCurrency(services.get(id)?.price ?? 0)}</Text>
                  </View>
                ))}
                <Divider />
                <View style={styles.line}>
                  <Text variant="h4" style={styles.flex}>
                    Total
                  </Text>
                  <Text variant="h4">{formatCurrency(appointment.totalPrice)}</Text>
                </View>
                <View style={styles.line}>
                  <Text variant="bodySmall" tone="secondary" style={styles.flex}>
                    Paid{appointment.paymentMethod ? ` (${PAYMENT_METHOD_META[appointment.paymentMethod].label})` : ''}
                  </Text>
                  <Text variant="bodySmall" tone="success">
                    {formatCurrency(appointment.amountPaid)}
                  </Text>
                </View>
                {appointment.pointsDiscount > 0 ? (
                  <View style={styles.line}>
                    <Text variant="bodySmall" tone="secondary" style={styles.flex}>
                      Loyalty points ({formatNumber(appointment.pointsRedeemed)} pts)
                    </Text>
                    <Text variant="bodySmall" tone="success">
                      − {formatCurrency(appointment.pointsDiscount)}
                    </Text>
                  </View>
                ) : null}
                {due > 0 && appointment.status !== 'cancelled' ? (
                  <View style={styles.line}>
                    <Text variant="label" tone="warning" style={styles.flex}>
                      Balance due
                    </Text>
                    <Text variant="label" tone="warning">
                      {formatCurrency(due)}
                    </Text>
                  </View>
                ) : null}
                {appointment.preferredPaymentMethod && appointment.paymentStatus !== 'paid' ? (
                  <Text variant="caption" tone="muted">
                    Customer plans to pay by {PAYMENT_METHOD_META[appointment.preferredPaymentMethod].label}
                  </Text>
                ) : null}
                {appointment.status === 'confirmed' && loyalty.enabled ? (
                  <Text variant="caption" tone="muted">
                    Earns {selectPointsFor(loyalty, appointment.totalPrice - appointment.pointsDiscount)} loyalty points on completion
                  </Text>
                ) : null}
                {canRedeem ? (
                  <Card variant="filled" padding="sm" style={{ gap: spacing.sm }}>
                    <View style={styles.row}>
                      <Icon name="diamond-outline" size={18} color={colors.accent} />
                      <Text variant="bodySmall" style={styles.flex}>
                        {customer?.name.split(' ')[0]} has <Text variant="label">{formatNumber(points)} points</Text>, worth up to{' '}
                        {formatCurrency(Math.min(due, Math.floor(points * loyalty.pointValue)))} off.
                      </Text>
                    </View>
                    <Button
                      title="Use points"
                      variant="secondary"
                      size="sm"
                      leftIcon="diamond-outline"
                      onPress={() => {
                        setRedeemError(null);
                        setRedeemOpen(true);
                      }}
                      fullWidth
                    />
                  </Card>
                ) : canOfferPoints && points > 0 && points < loyalty.minRedeemPoints ? (
                  <Text variant="caption" tone="muted">
                    {formatNumber(points)} points · they can be used from {formatNumber(loyalty.minRedeemPoints)} points
                  </Text>
                ) : null}
                {appointment.pointsRedeemed > 0 && appointment.status !== 'cancelled' && appointment.status !== 'no_show' ? (
                  <Button
                    title="Remove points discount"
                    variant="ghost"
                    size="sm"
                    loading={busy === 'removePoints'}
                    onPress={() => setRemovePointsOpen(true)}
                    style={styles.center}
                  />
                ) : null}
              </Card>

              {appointment.notes || appointment.cancellationReason ? (
                <Card variant="filled" style={{ gap: spacing.xs }}>
                  {appointment.notes ? (
                    <Text variant="bodySmall">
                      <Text variant="label">Notes: </Text>
                      {appointment.notes}
                    </Text>
                  ) : null}
                  {appointment.cancellationReason ? (
                    <Text variant="bodySmall" tone="danger">
                      <Text variant="label" tone="danger">
                        Cancelled:{' '}
                      </Text>
                      {appointment.cancellationReason}
                    </Text>
                  ) : null}
                </Card>
              ) : null}

              {review ? (
                <Card style={{ gap: spacing.xs }}>
                  <SectionHeader title="Customer review" compact />
                  <RatingStars value={review.rating} size={16} />
                  {review.comment ? (
                    <Text variant="bodySmall" tone="secondary">
                      “{review.comment}”
                    </Text>
                  ) : null}
                </Card>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                {appointment.status === 'pending' ? (
                  <Button
                    title="Confirm booking"
                    leftIcon="checkmark-circle-outline"
                    size="lg"
                    loading={busy === 'confirmed'}
                    onPress={() => void setStatus('confirmed', 'Confirmed. The customer has been notified.')}
                    fullWidth
                  />
                ) : null}
                {appointment.status === 'confirmed' ? (
                  <Button
                    title={due > 0 ? 'Complete & take payment' : 'Mark completed'}
                    leftIcon="checkmark-done-outline"
                    size="lg"
                    loading={busy === 'completed'}
                    onPress={() => (started ? complete(due) : setEarlyOpen(true))}
                    fullWidth
                  />
                ) : null}
                {due > 0 && (appointment.status === 'confirmed' || appointment.status === 'completed') ? (
                  <Button
                    title={appointment.status === 'completed' ? 'Record balance payment' : 'Record advance'}
                    variant="secondary"
                    leftIcon="cash-outline"
                    onPress={() => setPaymentMode('payment')}
                    fullWidth
                  />
                ) : null}
                {active ? (
                  <View style={styles.row}>
                    <Button
                      title="Reschedule"
                      variant="outline"
                      leftIcon="time-outline"
                      onPress={() => navigation.navigate('AppointmentForm', { appointmentId })}
                      style={styles.flex}
                      fullWidth
                    />
                    <Button title="Cancel" variant="outline" leftIcon="close-circle-outline" onPress={() => setCancelOpen(true)} style={styles.flex} fullWidth />
                  </View>
                ) : null}
                {appointment.status === 'confirmed' && started ? (
                  <Button title="Mark no-show" variant="ghost" leftIcon="person-remove-outline" onPress={() => setNoShowOpen(true)} fullWidth />
                ) : null}
                {!active ? (
                  <Button
                    title="Rebook"
                    variant="outline"
                    leftIcon="repeat"
                    onPress={() => navigation.navigate('AppointmentForm', { customerId: appointment.customerId, staffId: appointment.staffId })}
                    fullWidth
                  />
                ) : null}
                <Button title="Delete booking" variant="ghost" size="sm" onPress={() => setDeleteOpen(true)} style={styles.center} />
              </View>

              <PaymentSheet
                visible={paymentMode !== null}
                title={paymentMode === 'complete' ? 'Complete appointment' : 'Record payment'}
                subtitle={summary}
                due={due}
                defaultMethod={appointment.preferredPaymentMethod}
                submitLabel={paymentMode === 'complete' ? 'Complete & record' : 'Record payment'}
                skipLabel="Complete, unpaid"
                onSkip={paymentMode === 'complete' ? () => void completeWithoutPayment() : undefined}
                loading={busy === 'payment' || busy === 'completed'}
                error={paymentError}
                onSubmit={(amount, method) => void submitPayment(amount, method)}
                onClose={() => {
                  setPaymentMode(null);
                  setPaymentError(null);
                }}
              />
              <RedeemPointsSheet
                visible={redeemOpen}
                customerName={customer?.name.split(' ')[0] ?? 'The customer'}
                balance={points}
                due={due}
                loyalty={loyalty}
                loading={busy === 'redeem'}
                error={redeemError}
                onSubmit={(value) => void redeem(value)}
                onClose={() => setRedeemOpen(false)}
              />
              <ConfirmDialog
                visible={removePointsOpen}
                icon="diamond-outline"
                title="Remove the points discount?"
                message={`${formatNumber(appointment.pointsRedeemed)} points go back to the customer and ${formatCurrency(appointment.pointsDiscount)} is added back to the bill.`}
                confirmLabel="Remove discount"
                onConfirm={() => {
                  setRemovePointsOpen(false);
                  void run('removePoints', () => appointmentService.removePointsDiscount(appointmentId), 'Points returned to the customer');
                }}
                onCancel={() => setRemovePointsOpen(false)}
              />
              <CancelAppointmentSheet
                appointment={cancelOpen ? appointment : null}
                summary={summary}
                reasons={ADMIN_CANCEL_REASONS}
                onClose={() => setCancelOpen(false)}
              />
              <ConfirmDialog
                visible={earlyOpen}
                icon="checkmark-done-outline"
                title="Complete before the booked time?"
                message={`This booking is for ${formatRelativeDay(appointment.date)} at ${formatTime12(appointment.startTime)}. Completing it now moves the visit to today, ending now.`}
                confirmLabel="Complete now"
                onConfirm={() => {
                  setEarlyOpen(false);
                  complete(due);
                }}
                onCancel={() => setEarlyOpen(false)}
              />
              <ConfirmDialog
                visible={noShowOpen}
                tone="danger"
                icon="person-remove-outline"
                title="Mark as no-show?"
                message={`${customer?.name ?? 'The customer'} did not turn up. This frees the slot and is kept on their record.`}
                confirmLabel="Mark no-show"
                loading={busy === 'no_show'}
                onConfirm={() => void setStatus('no_show', 'Marked as no-show').then(() => setNoShowOpen(false))}
                onCancel={() => setNoShowOpen(false)}
              />
              <ConfirmDialog
                visible={deleteOpen}
                tone="danger"
                title="Delete this booking?"
                message="Use this only for bookings entered by mistake. It is removed from all records. To keep history, cancel instead."
                confirmLabel="Delete"
                loading={busy === 'delete'}
                onConfirm={() =>
                  void run('delete', () => appointmentService.deleteAppointment(appointmentId), 'Booking deleted').then((ok) => {
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
});
