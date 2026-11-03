import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ConfirmDialog, Icon, Text, useToast } from '@/components/ui';
import { useT, type Translate } from '@/i18n';
import { getErrorMessage, paymentRequestService } from '@/services';
import { useTheme } from '@/theme';
import type { PaymentRequest, PaymentRequestMethod } from '@/types';
import { formatShortDate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

import { PAYMENT_METHOD_META } from './PaymentMethodPicker';

/** Rejected requests stay visible this long, so the customer sees why and can try again. */
const REJECTED_VISIBLE_DAYS = 30;

/** The requests worth showing on a booking: pending ones, and recently rejected ones (with the reason). */
export const visiblePaymentRequests = (requests: readonly PaymentRequest[]): PaymentRequest[] => {
  const since = new Date(Date.now() - REJECTED_VISIBLE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return requests.filter(
    (request) => request.status === 'pending' || (request.status === 'rejected' && (request.reviewedAt ?? request.updatedAt) >= since),
  );
};

/**
 * "ID 0ABC12" for online payments, "Receipt 123" for cash, or "" when there is none
 * (cash requests may come without a receipt number).
 */
export const paymentReferenceText = (t: Translate, method: PaymentRequestMethod, reference: string): string =>
  reference ? t(method === 'cash' ? 'payment.ref.receipt' : 'payment.ref.id', { ref: reference }) : '';

interface PaymentRequestStatusProps {
  /** The customer's requests for one bill; only pending and recently rejected ones are shown. */
  requests: readonly PaymentRequest[];
}

/** Customer view of their "I've paid" requests on a bill: waiting (with Withdraw) or not confirmed (with the reason). */
export const PaymentRequestStatus = ({ requests }: PaymentRequestStatusProps) => {
  const { colors, spacing } = useTheme();
  const t = useT();
  const toast = useToast();
  const [withdrawing, setWithdrawing] = useState<PaymentRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = visiblePaymentRequests(requests);

  if (shown.length === 0) return null;

  const withdraw = async (): Promise<void> => {
    if (!withdrawing) return;
    setBusy(true);
    try {
      await paymentRequestService.cancelRequest(withdrawing.id);
      toast.info('Payment request withdrawn');
      setWithdrawing(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {shown.map((request) => {
        const pending = request.status === 'pending';
        const reference = paymentReferenceText(t, request.method, request.reference);
        const summary = `${formatCurrency(request.amount)} by ${PAYMENT_METHOD_META[request.method].label}${reference ? ` · ${reference}` : ''} · paid ${formatShortDate(request.paidOn)}`;
        return (
          <Card key={request.id} variant="filled" padding="sm" style={{ gap: spacing.xs }}>
            <View style={styles.row}>
              <Icon name={pending ? 'hourglass-outline' : 'alert-circle-outline'} size={16} color={pending ? colors.warning : colors.danger} />
              <Text variant="label" tone={pending ? 'warning' : 'danger'} style={styles.flex}>
                {pending ? 'Waiting for confirmation' : 'Payment not confirmed'}
              </Text>
              {pending ? <Button title="Withdraw" size="sm" variant="ghost" onPress={() => setWithdrawing(request)} /> : null}
            </View>
            <Text variant="caption" tone="secondary">
              {summary}
            </Text>
            {!pending && request.reviewNote ? (
              <Text variant="caption" tone="danger">
                Reason: {request.reviewNote}
              </Text>
            ) : null}
          </Card>
        );
      })}
      <ConfirmDialog
        visible={withdrawing !== null}
        icon="arrow-undo-outline"
        title="Withdraw this payment?"
        message={
          withdrawing
            ? `The parlour won’t check your ${formatCurrency(withdrawing.amount)} ${PAYMENT_METHOD_META[withdrawing.method].label} payment${withdrawing.reference ? ` (${paymentReferenceText(t, withdrawing.method, withdrawing.reference)})` : ''}. Only do this if you sent it by mistake.`
            : undefined
        }
        confirmLabel="Withdraw"
        cancelLabel="Keep it"
        loading={busy}
        onConfirm={() => void withdraw()}
        onCancel={() => setWithdrawing(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
});
