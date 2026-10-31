import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { BottomSheet, Button, Input, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { PaymentMethod } from '@/types';
import { formatCurrency } from '@/utils/format';

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
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod ?? 'cash');

  useEffect(() => {
    if (visible) {
      setAmount(String(due));
      setMethod(defaultMethod ?? 'cash');
    }
  }, [visible, due, defaultMethod]);

  const value = Number(amount);
  const invalid = !/^\d+$/.test(amount) || value <= 0 || value > due;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          {onSkip ? <Button title={skipLabel ?? 'Skip'} variant="outline" onPress={onSkip} disabled={loading} style={{ flex: 1 }} fullWidth /> : null}
          <Button title={submitLabel} loading={loading} disabled={invalid} onPress={() => onSubmit(value, method)} style={{ flex: 1 }} fullWidth />
        </>
      }
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="bodySmall" tone="secondary">
          Balance due: <Text variant="label">{formatCurrency(due)}</Text>
        </Text>
        <Input
          label="Amount received (Rs.)"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/\D/g, ''))}
          keyboardType="number-pad"
          leftIcon="cash-outline"
          error={amount !== '' && value > due ? `Cannot exceed ${formatCurrency(due)}` : null}
          helperText={value > 0 && value < due ? `${formatCurrency(due - value)} will remain due` : undefined}
        />
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="secondary">
            Method
          </Text>
          <ChipSelect options={METHOD_OPTIONS} value={method} onChange={setMethod} />
        </View>
        {error ? (
          <Text variant="bodySmall" tone="danger">
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};
