import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import type { z } from 'zod';

import { FormInput } from '@/components/form/FormFields';
import { BottomSheet, Button, Text } from '@/components/ui';
import { selectPointsWorth } from '@/store';
import { useTheme } from '@/theme';
import type { LoyaltyRules } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/format';
import { redeemPointsSchema } from '@/utils/formSchemas';

interface RedeemPointsSheetProps {
  visible: boolean;
  customerName: string;
  /** The customer's current balance. */
  balance: number;
  /** Balance due on the bill; the discount can't exceed it. */
  due: number;
  loyalty: LoyaltyRules;
  loading?: boolean;
  error?: string | null;
  onSubmit: (points: number) => void;
  onClose: () => void;
}

/** Most points usable on this bill: what the customer has, but no more than covers the balance due. */
export const maxRedeemablePoints = (balance: number, due: number, loyalty: LoyaltyRules): number =>
  loyalty.pointValue > 0 ? Math.min(balance, Math.floor(due / loyalty.pointValue)) : 0;

/** Uses loyalty points as a discount on a booking's bill. Prefilled with as many as fit. */
export const RedeemPointsSheet = ({ visible, customerName, balance, due, loyalty, loading = false, error, onSubmit, onClose }: RedeemPointsSheetProps) => {
  const { spacing } = useTheme();
  const max = maxRedeemablePoints(balance, due, loyalty);
  const schema = useMemo(() => redeemPointsSchema(max), [max]);
  const { control, handleSubmit, reset } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { points: String(max) },
    mode: 'onChange',
  });
  const pointsText = useWatch({ control, name: 'points' });

  useEffect(() => {
    if (visible) reset({ points: String(max) });
  }, [visible, max, reset]);

  const submit = handleSubmit(({ points }) => onSubmit(points));
  const points = Number(pointsText);
  const valid = Number.isInteger(points) && points > 0 && points <= max;
  const discount = valid ? selectPointsWorth(loyalty, points) : 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Use loyalty points"
      subtitle={`${customerName} has ${formatNumber(balance)} points`}
      footer={
        <Button
          title={discount > 0 ? `Take ${formatCurrency(discount)} off` : 'Use points'}
          leftIcon="diamond-outline"
          loading={loading}
          disabled={!valid}
          onPress={() => void submit()}
          fullWidth
        />
      }
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="bodySmall" tone="secondary">
          Each point is worth {formatCurrency(loyalty.pointValue)}. Balance due: <Text variant="label">{formatCurrency(due)}</Text>
        </Text>
        <FormInput
          control={control}
          name="points"
          label="Points to use"
          keyboardType="number-pad"
          leftIcon="diamond-outline"
          helperText={
            valid
              ? `${formatCurrency(due - discount)} left to pay · ${formatNumber(balance - points)} points left`
              : `Up to ${formatNumber(max)} points on this bill`
          }
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
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
