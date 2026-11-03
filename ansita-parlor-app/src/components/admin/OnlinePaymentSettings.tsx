import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';
import type { z } from 'zod';

import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { FormInput } from '@/components/form/FormFields';
import { ImagePickerField } from '@/components/form/ImagePickerField';
import { Button, Card, Divider, ListItem, SectionHeader, Text, useToast } from '@/components/ui';
import { businessService, getErrorMessage } from '@/services';
import { ONLINE_PAYMENT_METHODS } from '@/store';
import { useTheme } from '@/theme';
import type { OnlinePaymentMethod, PaymentAccount, PaymentSettings } from '@/types';
import { paymentAccountSchema } from '@/utils/formSchemas';

type AccountValues = z.input<typeof paymentAccountSchema>;

const accountDefaults = (account: PaymentAccount): AccountValues => ({
  accountName: account.accountName,
  accountNumber: account.accountNumber,
  bankName: account.bankName,
  instructions: account.instructions,
  qr: account.qr,
});

const NUMBER_LABEL: Record<OnlinePaymentMethod, string> = {
  esewa: 'eSewa ID (mobile number)',
  khalti: 'Khalti ID (mobile number)',
  fonepay: 'Fonepay merchant ID / number',
  bank: 'Account number',
};

interface OnlinePaymentSettingsProps {
  payments: PaymentSettings;
  /** True while any account has unsaved edits (for the screen's leave guard). */
  onDirtyChange: (dirty: boolean) => void;
}

/** Admin: whether customers may send "I've paid", and the account shown for each online method. */
export const OnlinePaymentSettings = ({ payments, onDirtyChange }: OnlinePaymentSettingsProps) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const [dirty, setDirty] = useState<Partial<Record<OnlinePaymentMethod, boolean>>>({});
  const anyDirty = Object.values(dirty).some(Boolean);

  useEffect(() => onDirtyChange(anyDirty), [anyDirty, onDirtyChange]);

  const setMethodDirty = useCallback((method: OnlinePaymentMethod, value: boolean) => {
    setDirty((current) => (Boolean(current[method]) === value ? current : { ...current, [method]: value }));
  }, []);

  const toggleRequests = async (requests: boolean): Promise<void> => {
    try {
      await businessService.updatePayments({ requests });
      toast.success(requests ? 'Customers can send “I’ve paid”' : '“I’ve paid” turned off');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title="Online payments" subtitle="Customers pay your account, then tap “I’ve paid” for you to verify" compact />
      <Card padding="sm">
        <ListItem
          title="“I’ve paid” requests"
          subtitle={payments.requests ? 'Customers can tell you about online payments' : 'Off: customers pay at the desk only'}
          leftIcon="wallet-outline"
          leftIconTone="warning"
          right={
            <Switch
              value={payments.requests}
              onValueChange={(value) => void toggleRequests(value)}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              accessibilityLabel="“I’ve paid” requests"
            />
          }
        />
      </Card>
      {payments.requests ? (
        ONLINE_PAYMENT_METHODS.map((method) => (
          <PaymentAccountEditor key={method} method={method} account={payments[method]} onDirtyChange={setMethodDirty} />
        ))
      ) : (
        <Text variant="caption" tone="muted">
          Turn this on to set up eSewa, Khalti, Fonepay and bank accounts for customers.
        </Text>
      )}
    </View>
  );
};

// ---------- One method ----------

interface PaymentAccountEditorProps {
  method: OnlinePaymentMethod;
  account: PaymentAccount;
  onDirtyChange: (method: OnlinePaymentMethod, dirty: boolean) => void;
}

const PaymentAccountEditor = ({ method, account, onDirtyChange }: PaymentAccountEditorProps) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const meta = PAYMENT_METHOD_META[method];
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset, formState } = useForm<AccountValues, unknown, z.output<typeof paymentAccountSchema>>({
    resolver: zodResolver(paymentAccountSchema),
    defaultValues: accountDefaults(account),
    mode: 'onTouched',
  });

  // Pick up changes loaded from the server (or just saved) while the screen is open.
  useEffect(() => reset(accountDefaults(account)), [account, reset]);
  useEffect(() => onDirtyChange(method, formState.isDirty), [method, formState.isDirty, onDirtyChange]);
  // Hidden (requests turned off) means nothing left unsaved here.
  useEffect(() => () => onDirtyChange(method, false), [method, onDirtyChange]);

  const toggle = async (enabled: boolean): Promise<void> => {
    try {
      await businessService.updatePayments({ [method]: { enabled } });
      toast.success(enabled ? `${meta.label} is shown to customers` : `${meta.label} hidden from customers`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Turning on needs an account number or QR code: open the details so they can be added.
      if (enabled) setOpen(true);
    }
  };

  const save = handleSubmit(async (values) => {
    try {
      await businessService.updatePayments({ [method]: values });
      toast.success(`${meta.label} account saved`);
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  const summary = account.enabled
    ? `Shown to customers · ${account.accountNumber || 'QR code'}`
    : account.accountNumber || account.qr
      ? 'Set up, but hidden from customers'
      : 'Not set up';

  return (
    <Card padding="sm" style={{ gap: spacing.xs }}>
      <ListItem
        title={meta.label}
        subtitle={summary}
        leftIcon={meta.icon}
        leftIconTone={account.enabled ? 'success' : 'neutral'}
        right={
          <Switch
            value={account.enabled}
            onValueChange={(value) => void toggle(value)}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            thumbColor={colors.surface}
            accessibilityLabel={`Show ${meta.label} to customers`}
          />
        }
      />
      {open ? (
        <View style={{ gap: spacing.md, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }}>
          <Divider spacing="xs" />
          <FormInput control={control} name="accountName" label={method === 'bank' ? 'Account holder name' : 'Account name'} placeholder="e.g. Ansita Beauty Parlour" />
          {method === 'bank' ? <FormInput control={control} name="bankName" label="Bank and branch" placeholder="e.g. Nabil Bank, Janakpur" /> : null}
          <FormInput
            control={control}
            name="accountNumber"
            label={NUMBER_LABEL[method]}
            keyboardType={method === 'fonepay' ? 'default' : 'number-pad'}
            autoCorrect={false}
          />
          <Controller
            control={control}
            name="qr"
            render={({ field }) => (
              <ImagePickerField
                label="QR code (optional)"
                value={field.value}
                onChange={field.onChange}
                variant="square"
                helperText="Customers can scan it from their phone or a screenshot."
              />
            )}
          />
          <FormInput
            control={control}
            name="instructions"
            label="Instructions (optional)"
            placeholder="e.g. Write your name in the remarks."
            multiline
            maxLength={300}
            showCount
          />
          <View style={[styles.row, { gap: spacing.sm }]}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                reset(accountDefaults(account));
                setOpen(false);
              }}
              style={styles.flex}
              fullWidth
            />
            <Button title="Save" disabled={!formState.isDirty} loading={formState.isSubmitting} onPress={() => void save()} style={styles.flex} fullWidth />
          </View>
        </View>
      ) : (
        <Button title="Edit account details" variant="ghost" size="sm" leftIcon="create-outline" onPress={() => setOpen(true)} style={styles.center} />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
});
