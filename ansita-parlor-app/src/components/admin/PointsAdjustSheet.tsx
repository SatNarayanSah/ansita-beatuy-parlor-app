import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import type { z } from 'zod';

import { FormInput } from '@/components/form/FormFields';
import { BottomSheet, Button, Chip, useToast } from '@/components/ui';
import { customerService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import type { Customer } from '@/types';
import { formatNumber } from '@/utils/format';
import { pointsAdjustSchema } from '@/utils/formSchemas';

const PRESETS = [-100, -50, 50, 100, 250] as const;

interface PointsAdjustSheetProps {
  customer: Customer;
  visible: boolean;
  onClose: () => void;
}

/** Add or deduct loyalty points (e.g. a goodwill bonus or a redemption). Balance never goes below zero. */
export const PointsAdjustSheet = ({ customer, visible, onClose }: PointsAdjustSheetProps) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, reset, setValue } = useForm<z.input<typeof pointsAdjustSchema>, unknown, z.output<typeof pointsAdjustSchema>>({
    resolver: zodResolver(pointsAdjustSchema),
    defaultValues: { delta: '' },
    mode: 'onChange',
  });
  const text = useWatch({ control, name: 'delta' });
  const delta = /^-?\d+$/.test(text) ? Number(text) : 0;

  useEffect(() => {
    if (visible) reset({ delta: '' });
  }, [visible, reset]);

  const submit = handleSubmit(async ({ delta: value }) => {
    setSaving(true);
    try {
      await customerService.adjustLoyaltyPoints(customer.id, value);
      toast.success(`${value > 0 ? 'Added' : 'Deducted'} ${Math.abs(value)} points`);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Adjust loyalty points"
      subtitle={`Current balance: ${formatNumber(customer.loyaltyPoints)}`}
      footer={
        <Button
          title={delta ? `${delta > 0 ? 'Add' : 'Deduct'} ${Math.abs(delta)} points` : 'Adjust points'}
          loading={saving}
          onPress={() => void submit()}
          style={styles.flex}
          fullWidth
        />
      }
    >
      <View style={{ gap: spacing.md }}>
        <View style={styles.row}>
          {PRESETS.map((value) => (
            <Chip
              key={value}
              label={value > 0 ? `+${value}` : String(value)}
              selected={delta === value}
              onPress={() => setValue('delta', String(value), { shouldValidate: true })}
            />
          ))}
        </View>
        <FormInput
          control={control}
          name="delta"
          label="Points (use minus to deduct, e.g. -200 for a redemption)"
          keyboardType="numbers-and-punctuation"
          helperText={delta ? `New balance: ${formatNumber(Math.max(0, customer.loyaltyPoints + delta))}` : undefined}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1 },
});
