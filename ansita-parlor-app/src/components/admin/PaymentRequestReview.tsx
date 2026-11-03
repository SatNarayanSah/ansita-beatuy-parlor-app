import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import type { z } from 'zod';

import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { FormInput } from '@/components/form/FormFields';
import { Badge, BottomSheet, Button, Card, Chip, Icon, ImageViewer, Input, SectionHeader, Text, useToast } from '@/components/ui';
import { useAdoptParam } from '@/hooks/useAdoptParam';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { getErrorMessage, paymentRequestService } from '@/services';
import { useNotificationStore, usePaymentRequestStore } from '@/store';
import { useTheme } from '@/theme';
import type { ID, PaymentRequest, PaymentRequestTarget } from '@/types';
import { formatShortDate, formatTimeAgo } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { approvePaymentSchema } from '@/utils/formSchemas';

const REJECT_REASONS: readonly string[] = [
  'Payment not received',
  'Transaction ID not found',
  'Amount doesn’t match',
  'Paid to the wrong account',
  'Other',
];

interface PendingPaymentRequestsProps {
  targetType: PaymentRequestTarget;
  targetId: ID;
  /** Balance due on the bill now; an approval can't exceed it. */
  due: number;
}

/**
 * Admin, on an appointment or enrollment: the customer's "I've paid" requests waiting for
 * verification, with Approve (records the payment) and Reject (with a reason). Renders nothing
 * when there are none.
 */
export const PendingPaymentRequests = ({ targetType, targetId, due }: PendingPaymentRequestsProps) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const [approving, setApproving] = useState<PaymentRequest | null>(null);
  const [rejecting, setRejecting] = useState<PaymentRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useServiceQuery(
    () => paymentRequestService.listRequests({ targetType, targetId, status: 'pending' }),
    [targetType, targetId],
    // A new request arrives with a notification.
    { refetchOn: [usePaymentRequestStore, useNotificationStore] },
  );
  const pending = (query.data ?? []).filter((request) => request.status === 'pending');

  const act = async (action: () => Promise<unknown>, success: string, close: () => void): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      toast.success(success);
      close();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (pending.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title="Payments to verify" subtitle="Check your eSewa / Khalti / Fonepay / bank app, then approve or reject" compact />
      {pending.map((request) => (
        <PaymentRequestCard
          key={request.id}
          request={request}
          due={due}
          onApprove={() => {
            setError(null);
            setApproving(request);
          }}
          onReject={() => {
            setError(null);
            setRejecting(request);
          }}
        />
      ))}
      <ApprovePaymentSheet
        request={approving}
        due={due}
        loading={busy}
        error={error}
        onSubmit={(amount, note) => {
          if (!approving) return;
          void act(
            () => paymentRequestService.approveRequest(approving.id, { amount, note }),
            `${formatCurrency(amount)} recorded. The customer has been told.`,
            () => setApproving(null),
          );
        }}
        onClose={() => setApproving(null)}
      />
      <RejectPaymentSheet
        request={rejecting}
        loading={busy}
        error={error}
        onSubmit={(reason) => {
          if (!rejecting) return;
          void act(() => paymentRequestService.rejectRequest(rejecting.id, reason), 'Rejected. The customer has been told why.', () => setRejecting(null));
        }}
        onClose={() => setRejecting(null)}
      />
    </View>
  );
};

// ---------- One request ----------

interface PaymentRequestCardProps {
  request: PaymentRequest;
  due: number;
  onApprove: () => void;
  onReject: () => void;
}

/** What the customer reported: amount, method, transaction ID, date, note and screenshot (tap to enlarge). */
export const PaymentRequestCard = ({ request, due, onApprove, onReject }: PaymentRequestCardProps) => {
  const { colors, radius, spacing } = useTheme();
  const [proofOpen, setProofOpen] = useState(false);
  const meta = PAYMENT_METHOD_META[request.method];

  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        <Badge label="Waiting for you" tone="warning" icon="hourglass-outline" size="sm" />
        <Text variant="caption" tone="muted" style={styles.flex} align="right">
          Sent {formatTimeAgo(request.createdAt)}
        </Text>
      </View>
      <View style={styles.row}>
        <Icon name={meta.icon} size={20} color={colors.primary} />
        <Text variant="h3" style={styles.flex}>
          {formatCurrency(request.amount)}
        </Text>
        <Text variant="label" tone="secondary">
          {meta.label}
        </Text>
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="bodySmall">
          <Text variant="label">Transaction ID: </Text>
          <Text variant="bodySmall" selectable>
            {request.reference}
          </Text>
        </Text>
        <Text variant="bodySmall" tone="secondary">
          Paid on {formatShortDate(request.paidOn)} · by {request.customerName}
        </Text>
        {request.note ? (
          <Text variant="bodySmall" tone="secondary">
            “{request.note}”
          </Text>
        ) : null}
      </View>
      {request.proof ? (
        <>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Payment screenshot. Tap to enlarge"
            onPress={() => setProofOpen(true)}
            style={[styles.proof, { borderRadius: radius.md, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
          >
            <Image source={{ uri: request.proof }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
            <View style={[styles.zoom, { backgroundColor: colors.overlay, borderRadius: radius.pill }]}>
              <Icon name="expand-outline" size={16} color={ON_PHOTO} />
            </View>
          </Pressable>
          <ImageViewer uri={proofOpen ? request.proof : null} onClose={() => setProofOpen(false)} caption={`${meta.label} · ${request.reference}`} />
        </>
      ) : (
        <Text variant="caption" tone="muted">
          No screenshot sent.
        </Text>
      )}
      {due <= 0 ? (
        <Text variant="caption" tone="warning">
          Nothing is due on this bill any more (e.g. paid at the desk meanwhile). Reject this request if it was the same payment.
        </Text>
      ) : null}
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Button title="Reject" variant="outline" leftIcon="close-circle-outline" onPress={onReject} style={styles.flex} fullWidth />
        <Button title="Approve" leftIcon="checkmark-circle-outline" onPress={onApprove} disabled={due <= 0} style={styles.flex} fullWidth />
      </View>
    </Card>
  );
};

/** Icon colour on the dark badge over a photo, the same in light and dark mode. */
const ON_PHOTO = '#FFFFFF';

// ---------- Approve ----------

interface ApprovePaymentSheetProps {
  request: PaymentRequest | null;
  due: number;
  loading: boolean;
  error: string | null;
  onSubmit: (amount: number, note: string) => void;
  onClose: () => void;
}

const ApprovePaymentSheet = ({ request, due, loading, error, onSubmit, onClose }: ApprovePaymentSheetProps) => {
  const { spacing } = useTheme();
  const max = Math.max(1, due);
  const schema = useMemo(() => approvePaymentSchema(max), [max]);
  const initial = String(Math.min(request?.amount ?? 0, max));
  const { control, handleSubmit, reset } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: initial, note: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (request) reset({ amount: initial, note: '' });
  }, [request, initial, reset]);

  const submit = handleSubmit(({ amount, note }) => onSubmit(amount, note));

  return (
    <BottomSheet
      visible={request !== null}
      onClose={onClose}
      title="Approve payment"
      subtitle={request ? `${request.customerName} · ${PAYMENT_METHOD_META[request.method].label} · ID ${request.reference}` : undefined}
      footer={<Button title="Approve & record" leftIcon="checkmark-circle-outline" loading={loading} onPress={() => void submit()} style={styles.flex} fullWidth />}
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="bodySmall" tone="secondary">
          The customer says they paid <Text variant="label">{formatCurrency(request?.amount ?? 0)}</Text> on{' '}
          {request ? formatShortDate(request.paidOn) : ''}. Balance due: <Text variant="label">{formatCurrency(due)}</Text>.
        </Text>
        <FormInput
          control={control}
          name="amount"
          label="Amount received (Rs.)"
          keyboardType="number-pad"
          leftIcon="cash-outline"
          helperText="Change this only if a different amount arrived."
        />
        <FormInput control={control} name="note" label="Note (optional)" multiline maxLength={300} />
        <Text variant="caption" tone="muted">
          The payment is added to the bill, dated the day the customer paid, and they get a notification.
        </Text>
        {error ? (
          <Text variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};

// ---------- Reject ----------

interface RejectPaymentSheetProps {
  request: PaymentRequest | null;
  loading: boolean;
  error: string | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

const RejectPaymentSheet = ({ request, loading, error, onSubmit, onClose }: RejectPaymentSheetProps) => {
  const { spacing } = useTheme();
  const [reason, setReason] = useState<string>(REJECT_REASONS[0] ?? 'Other');
  const [details, setDetails] = useState('');
  const [missing, setMissing] = useState(false);

  // Fresh form each time the sheet opens for a request.
  useAdoptParam(request?.id, () => {
    setReason(REJECT_REASONS[0] ?? 'Other');
    setDetails('');
    setMissing(false);
  });

  const confirm = (): void => {
    const extra = details.trim();
    const text = reason === 'Other' ? extra : extra ? `${reason}: ${extra}` : reason;
    if (text.length < 3) {
      setMissing(true);
      return;
    }
    onSubmit(text.slice(0, 300));
  };

  return (
    <BottomSheet
      visible={request !== null}
      onClose={onClose}
      title="Reject payment?"
      subtitle={request ? `${formatCurrency(request.amount)} · ${PAYMENT_METHOD_META[request.method].label} · ID ${request.reference}` : undefined}
      footer={
        <>
          <Button title="Back" variant="outline" onPress={onClose} style={styles.flex} fullWidth />
          <Button title="Reject" variant="danger" loading={loading} onPress={confirm} style={styles.flex} fullWidth />
        </>
      }
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="label" tone="secondary">
          Reason (the customer sees this)
        </Text>
        <View style={[styles.chips, { gap: spacing.sm }]}>
          {REJECT_REASONS.map((item) => (
            <Chip key={item} label={item} selected={reason === item} onPress={() => setReason(item)} />
          ))}
        </View>
        <Input
          label={reason === 'Other' ? 'Tell the customer why' : 'Anything else? (optional)'}
          value={details}
          onChangeText={(text) => {
            setDetails(text);
            setMissing(false);
          }}
          error={missing ? 'Tell the customer why (at least 3 characters)' : undefined}
          multiline
          maxLength={200}
          showCount
        />
        {error ? (
          <Text variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  proof: { width: '100%', aspectRatio: 4 / 3, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  zoom: { position: 'absolute', right: 10, bottom: 10, padding: 6 },
});
