import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import type { z } from 'zod';

import { FormInput } from '@/components/form/FormFields';
import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { BottomSheet, Button, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { PaymentMethod } from '@/types';
import { formatCurrency } from '@/utils/format';
import { paymentSchema } from '@/utils/formSchemas';

import { ChipSelect } from './Pickers';

const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_META[value].label,
}));

interface PaymentSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Balance due; the amount is prefilled with it and cannot exceed it. */
  due: number;
  defaultMethod?: PaymentMethod | null;
  /** Allow closing without a payment, e.g. "Complete without payment". */
  skipLabel?: string;
  onSkip?: () => void;
  submitLabel?: string;
  loading?: boolean;
  /** Server error from the last submit. */
  error?: string | null;
  onSubmit: (amount: number, method: PaymentMethod) => void;
  onClose: () => void;
}

/** Amount + method for appointment payments and course fees. */
export const PaymentSheet = ({
  visible,
  title,
  subtitle,
  due,
  defaultMethod,
  skipLabel,
  onSkip,
  submitLabel = 'Record payment',
  loading = false,
  error,
  onSubmit,
  onClose,
}: PaymentSheetProps) => {
  const { spacing } = useTheme();
  const schema = useMemo(() => paymentSchema(due), [due]);
  const { control, handleSubmit, reset } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: String(due), method: defaultMethod ?? 'cash' },
    mode: 'onChange',
  });
  const amountText = useWatch({ control, name: 'amount' });

  useEffect(() => {
    if (visible) reset({ amount: String(due), method: defaultMethod ?? 'cash' });
  }, [visible, due, defaultMethod, reset]);

  const submit = handleSubmit(({ amount, method }) => onSubmit(amount, method));
  const amount = Number(amountText);
  const remaining = Number.isFinite(amount) && amount > 0 && amount < due ? due - amount : 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          {onSkip ? <Button title={skipLabel ?? 'Skip'} variant="outline" onPress={onSkip} disabled={loading} style={{ flex: 1 }} fullWidth /> : null}
          <Button title={submitLabel} loading={loading} onPress={() => void submit()} style={{ flex: 1 }} fullWidth />
        </>
      }
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="bodySmall" tone="secondary">
          Balance due: <Text variant="label">{formatCurrency(due)}</Text>
        </Text>
        <FormInput
          control={control}
          name="amount"
          label="Amount received (Rs.)"
          keyboardType="number-pad"
          leftIcon="cash-outline"
          helperText={remaining > 0 ? `${formatCurrency(remaining)} will remain due` : undefined}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <Controller
          control={control}
          name="method"
          render={({ field }) => (
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Method
              </Text>
              <ChipSelect options={METHOD_OPTIONS} value={field.value} onChange={field.onChange} />
            </View>
          )}
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
