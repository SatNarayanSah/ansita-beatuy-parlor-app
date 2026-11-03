import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import type { z } from 'zod';

import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { PaymentRequestStatus } from '@/components/customer/PaymentRequestStatus';
import { FormInput } from '@/components/form/FormFields';
import { ImagePickerField } from '@/components/form/ImagePickerField';
import {
  Button,
  Card,
  DatePickerField,
  Divider,
  EmptyState,
  Icon,
  ImageViewer,
  QueryState,
  Screen,
  SectionHeader,
  SkeletonCard,
  Text,
  useToast,
} from '@/components/ui';
import { serviceNames, useCourseMap, useServiceMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, enrollmentService, getErrorMessage, paymentRequestService } from '@/services';
import {
  selectAmountDue,
  selectFeeDue,
  selectOnlineMethods,
  selectPendingTotal,
  useAppointmentStore,
  useBusinessStore,
  useCourseStore,
  usePaymentRequestStore,
} from '@/store';
import { useTheme } from '@/theme';
import type { ID, OnlinePaymentMethod, PaymentAccount, PaymentRequestTarget } from '@/types';
import { addDaysISO, formatRelativeDay, formatTime12, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { paymentRequestSchema } from '@/utils/formSchemas';

type Props = RootStackScreenProps<'SendPayment'>;

/** The server refuses payment dates further back than this. */
const MAX_DAYS_BACK = 60;
/** QR codes need a light background to scan, in dark mode too. */
const QR_BACKGROUND = '#FFFFFF';

/** "I've paid": the customer paid the parlour's account outside the app and asks the parlour to confirm it. */
export const SendPaymentScreen = ({ route }: Props) => {
  const { spacing } = useTheme();
  const { targetType, targetId } = route.params;
  const services = useServiceMap();
  const courses = useCourseMap();
  const payments = useBusinessStore((state) => state.payments);
  const methods = useMemo(() => selectOnlineMethods(payments), [payments]);

  const query = useServiceQuery(
    async () => {
      const [bill, requests] = await Promise.all([
        targetType === 'appointment'
          ? appointmentService.getAppointment(targetId).then((appointment) => ({ kind: 'appointment' as const, appointment }))
          : enrollmentService.getEnrollment(targetId).then((enrollment) => ({ kind: 'enrollment' as const, enrollment })),
        paymentRequestService.listRequests({ targetType, targetId }),
      ]);
      return { bill, requests };
    },
    [targetType, targetId],
    { refetchOn: [usePaymentRequestStore, useAppointmentStore, useCourseStore] },
  );

  return (
    <Screen gap="lg" refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ bill, requests }) => {
          const label =
            bill.kind === 'appointment'
              ? `${serviceNames(bill.appointment.serviceIds, services)} · ${formatRelativeDay(bill.appointment.date)} at ${formatTime12(bill.appointment.startTime)}`
              : `${courses.get(bill.enrollment.courseId)?.title ?? 'Course'} fee`;
          const due = bill.kind === 'appointment' ? selectAmountDue(bill.appointment) : selectFeeDue(bill.enrollment);
          const payable =
            bill.kind === 'appointment'
              ? bill.appointment.status !== 'cancelled' && bill.appointment.status !== 'no_show'
              : bill.enrollment.status !== 'dropped';
          const pending = selectPendingTotal(requests, targetId);
          const room = Math.max(0, due - pending);

          return (
            <>
              <Card style={{ gap: spacing.xs }}>
                <Text variant="overline" tone="muted">
                  Paying for
                </Text>
                <Text variant="h4">{label}</Text>
                <View style={styles.line}>
                  <Text variant="bodySmall" tone="secondary" style={styles.flex}>
                    Balance due
                  </Text>
                  <Text variant="label" tone={due > 0 ? 'warning' : 'success'}>
                    {due > 0 ? formatCurrency(due) : 'Paid'}
                  </Text>
                </View>
                {pending > 0 ? (
                  <View style={styles.line}>
                    <Text variant="bodySmall" tone="secondary" style={styles.flex}>
                      Waiting for confirmation
                    </Text>
                    <Text variant="label">{formatCurrency(pending)}</Text>
                  </View>
                ) : null}
              </Card>

              <PaymentRequestStatus requests={requests} />

              {!payable ? (
                <EmptyState
                  compact
                  icon="close-circle-outline"
                  title="Can’t take payments"
                  message={targetType === 'appointment' ? 'This booking was cancelled.' : 'This enrollment was dropped.'}
                />
              ) : room <= 0 ? (
                <EmptyState
                  compact
                  icon="checkmark-done-outline"
                  tone="success"
                  title={due > 0 ? 'Nothing more to send' : 'All paid'}
                  message={due > 0 ? 'Nothing is left to pay once your pending payments are confirmed.' : 'This bill is fully paid. Thank you!'}
                />
              ) : methods.length === 0 ? (
                <EmptyState
                  compact
                  icon="storefront-outline"
                  title="Online payments are off"
                  message="The parlour isn’t taking online payments right now. Please pay at the front desk."
                />
              ) : (
                <SendPaymentForm
                  key={`${room}-${methods.join(',')}`}
                  targetType={targetType}
                  targetId={targetId}
                  room={room}
                  methods={methods}
                  accounts={payments}
                />
              )}
            </>
          );
        }}
      </QueryState>
    </Screen>
  );
};

// ---------- Form ----------

interface SendPaymentFormProps {
  targetType: PaymentRequestTarget;
  targetId: ID;
  /** Most the customer can claim: the balance due less their pending requests. */
  room: number;
  methods: readonly OnlinePaymentMethod[];
  accounts: Record<OnlinePaymentMethod, PaymentAccount>;
}

const SendPaymentForm = ({ targetType, targetId, room, methods, accounts }: SendPaymentFormProps) => {
  const { colors, radius, spacing } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const today = todayISO();
  const earliest = addDaysISO(today, -MAX_DAYS_BACK);
  const schema = useMemo(() => paymentRequestSchema(room, earliest, today), [room, earliest, today]);
  const { control, handleSubmit, formState } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { method: methods[0] ?? 'esewa', amount: String(room), reference: '', paidOn: today, proof: null, note: '' },
    mode: 'onTouched',
  });
  const method = useWatch({ control, name: 'method' });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  const submit = handleSubmit(async (values) => {
    try {
      await paymentRequestService.createRequest({ targetType, targetId, ...values, note: values.note || undefined });
      toast.success('Sent! You’ll get a notification once the parlour confirms it.');
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="1. How did you pay?" compact />
        <Controller
          control={control}
          name="method"
          render={({ field }) => (
            <View style={[styles.methods, { gap: spacing.sm }]}>
              {methods.map((item) => {
                const selected = item === field.value;
                const meta = PAYMENT_METHOD_META[item];
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Paid by ${meta.label}`}
                    onPress={() => field.onChange(item)}
                    style={[
                      styles.method,
                      {
                        borderRadius: radius.md,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primarySoft : colors.surface,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <Icon name={meta.icon} size={22} color={selected ? colors.primaryDark : colors.textSecondary} />
                    <Text variant="label" align="center" color={selected ? colors.primaryDark : colors.text} numberOfLines={1}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="2. Pay to" subtitle="Pay in your wallet or bank app first, then come back here" compact />
        <PaymentAccountDetails method={method} account={accounts[method]} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="3. Tell us about the payment" compact />
        <Card style={{ gap: spacing.md }}>
          <FormInput
            control={control}
            name="amount"
            label="Amount you paid (Rs.)"
            required
            keyboardType="number-pad"
            leftIcon="cash-outline"
            helperText={`Up to ${formatCurrency(room)}`}
          />
          <FormInput
            control={control}
            name="reference"
            label="Transaction ID"
            required
            autoCapitalize="characters"
            autoCorrect={false}
            leftIcon="receipt-outline"
            maxLength={64}
            helperText="Shown on the receipt in your wallet app or on your bank statement"
          />
          <Controller
            control={control}
            name="paidOn"
            render={({ field, fieldState }) => (
              <DatePickerField
                label="Date paid"
                required
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? '')}
                minDate={earliest}
                maxDate={today}
                error={fieldState.error?.message}
                sheetTitle="When did you pay?"
              />
            )}
          />
          <Controller
            control={control}
            name="proof"
            render={({ field }) => (
              <ImagePickerField
                label="Screenshot (optional)"
                value={field.value}
                onChange={field.onChange}
                variant="document"
                helperText="A screenshot of the payment helps the parlour find it faster."
              />
            )}
          />
          <FormInput control={control} name="note" label="Note (optional)" multiline maxLength={300} showCount />
        </Card>
      </View>

      <Button
        title="Send for confirmation"
        leftIcon="paper-plane-outline"
        size="lg"
        loading={formState.isSubmitting}
        onPress={() => void submit()}
        fullWidth
      />
      <Text variant="caption" tone="muted" align="center">
        Your bill is updated once the parlour confirms the money has arrived.
      </Text>
      {dialog}
    </>
  );
};

// ---------- Account details ----------

const PaymentAccountDetails = ({ method, account }: { method: OnlinePaymentMethod; account: PaymentAccount }) => {
  const { colors, radius, spacing } = useTheme();
  const [qrOpen, setQrOpen] = useState(false);
  const label = PAYMENT_METHOD_META[method].label;

  return (
    <Card style={{ gap: spacing.sm }}>
      {!account.qr && !account.accountNumber && !account.instructions ? (
        <Text variant="bodySmall" tone="secondary">
          The parlour hasn’t added its {label} details here yet. If you paid to the number they gave you, send the details below.
        </Text>
      ) : null}
      {account.accountName ? (
        <View>
          <Text variant="caption" tone="muted">
            {method === 'bank' ? 'Account name' : 'Name'}
          </Text>
          <Text variant="bodyMedium" selectable>
            {account.accountName}
          </Text>
        </View>
      ) : null}
      {method === 'bank' && account.bankName ? (
        <View>
          <Text variant="caption" tone="muted">
            Bank
          </Text>
          <Text variant="bodyMedium" selectable>
            {account.bankName}
          </Text>
        </View>
      ) : null}
      {account.accountNumber ? (
        <View>
          <Text variant="caption" tone="muted">
            {method === 'bank' ? 'Account number' : `${label} ID / number`}
          </Text>
          <Text variant="h3" selectable accessibilityHint="Press and hold to copy">
            {account.accountNumber}
          </Text>
          <Text variant="caption" tone="muted">
            Press and hold the number to copy it.
          </Text>
        </View>
      ) : null}
      {account.instructions ? (
        <>
          <Divider spacing="xs" />
          <Text variant="bodySmall" tone="secondary">
            {account.instructions}
          </Text>
        </>
      ) : null}
      {account.qr ? (
        <>
          <Divider spacing="xs" />
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={`${label} QR code. Tap to enlarge`}
            onPress={() => setQrOpen(true)}
            style={[styles.qr, { borderRadius: radius.md, borderColor: colors.border }]}
          >
            <Image source={{ uri: account.qr }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
          </Pressable>
          <Text variant="caption" tone="muted" align="center">
            Scan with your {method === 'bank' ? 'banking' : label} app · tap to enlarge
          </Text>
          <ImageViewer uri={qrOpen ? account.qr : null} onClose={() => setQrOpen(false)} caption={`${label} QR code`} />
        </>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  methods: { flexDirection: 'row', flexWrap: 'wrap' },
  method: { flexBasis: '22%', flexGrow: 1, alignItems: 'center', gap: 6, borderWidth: 1.5 },
  qr: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 1,
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: QR_BACKGROUND,
  },
});
