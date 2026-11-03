import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { paymentReferenceText } from '@/components/customer/PaymentRequestStatus';
import { Badge, Card, Icon, ListScreen, SegmentedControl, SkeletonCard, Text, type SegmentOption } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { paymentRequestService } from '@/services';
import { useNotificationStore, usePaymentRequestStore } from '@/store';
import { useTheme, type Tone } from '@/theme';
import type { PaymentRequest, PaymentRequestStatus } from '@/types';
import { formatShortDate, formatTimeAgo } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Props = RootStackScreenProps<'PaymentRequests'>;

type RequestsView = 'pending' | 'reviewed';

const STATUS_META: Record<PaymentRequestStatus, { label: string; tone: Tone }> = {
  pending: { label: 'To verify', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  cancelled: { label: 'Withdrawn', tone: 'neutral' },
};

/** Customers' "I've paid" requests: the ones waiting for verification, and the history. Each opens its booking or enrollment. */
export const PaymentRequestsScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const [view, setView] = useState<RequestsView>('pending');

  const query = useServiceQuery(
    async () => {
      const list = await paymentRequestService.listRequests();
      usePaymentRequestStore.getState().setPendingCount(list.filter((request) => request.status === 'pending').length);
      return list;
    },
    [],
    // New requests arrive with a notification.
    { refetchOn: [usePaymentRequestStore, useNotificationStore] },
  );

  const lists = useMemo(() => {
    const all = query.data ?? [];
    return { pending: all.filter((r) => r.status === 'pending'), reviewed: all.filter((r) => r.status !== 'pending') };
  }, [query.data]);

  const options: SegmentOption<RequestsView>[] = [
    { value: 'pending', label: `To verify (${lists.pending.length})` },
    { value: 'reviewed', label: 'History' },
  ];

  const open = (request: PaymentRequest): void => {
    if (request.targetType === 'appointment') navigation.navigate('AppointmentDetail', { appointmentId: request.targetId });
    else navigation.navigate('EnrollmentDetail', { enrollmentId: request.targetId });
  };

  return (
    <ListScreen
      query={query}
      items={lists[view]}
      keyExtractor={(request) => request.id}
      renderItem={(request) => <PaymentRequestRow request={request} onPress={() => open(request)} />}
      header={<SegmentedControl options={options} value={view} onChange={setView} />}
      skeleton={
        <View style={{ gap: spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      }
      empty={
        view === 'pending'
          ? { icon: 'checkmark-done-outline', tone: 'success', title: 'All caught up', message: 'No payments waiting to be verified.' }
          : { icon: 'time-outline', title: 'No history yet', message: 'Approved, rejected and withdrawn requests show here.' }
      }
    />
  );
};

const PaymentRequestRow = ({ request, onPress }: { request: PaymentRequest; onPress: () => void }) => {
  const { colors, spacing } = useTheme();
  const t = useT();
  const meta = PAYMENT_METHOD_META[request.method];
  const reference = paymentReferenceText(t, request.method, request.reference);
  const status = STATUS_META[request.status];
  const received = request.status === 'approved' && request.approvedAmount !== null && request.approvedAmount !== request.amount;

  return (
    <Card onPress={onPress} accessibilityLabel={`${request.customerName}, ${formatCurrency(request.amount)} by ${meta.label}`} style={{ gap: spacing.xs }}>
      <View style={styles.row}>
        <Text variant="h4" style={styles.flex} numberOfLines={1}>
          {request.customerName}
        </Text>
        <Text variant="h4">{formatCurrency(request.amount)}</Text>
      </View>
      <View style={styles.row}>
        <Icon name={request.targetType === 'appointment' ? 'calendar-outline' : 'school-outline'} size={14} color={colors.textMuted} />
        <Text variant="bodySmall" tone="secondary" style={styles.flex} numberOfLines={1}>
          {request.targetLabel}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {meta.label}{reference ? ` · ${reference}` : ''} · paid {formatShortDate(request.paidOn)} · sent {formatTimeAgo(request.createdAt)}
      </Text>
      <View style={styles.row}>
        <Badge label={status.label} tone={status.tone} size="sm" />
        {request.proof ? <Badge label="Screenshot" tone="info" icon="image-outline" size="sm" /> : null}
        {received ? (
          <Text variant="caption" tone="warning">
            {formatCurrency(request.approvedAmount ?? 0)} received
          </Text>
        ) : null}
        {request.status === 'pending' && request.balanceDue < request.amount ? (
          <Text variant="caption" tone="warning">
            Only {formatCurrency(request.balanceDue)} due now
          </Text>
        ) : null}
      </View>
      {request.status === 'rejected' && request.reviewNote ? (
        <Text variant="caption" tone="danger">
          {request.reviewNote}
        </Text>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
});
