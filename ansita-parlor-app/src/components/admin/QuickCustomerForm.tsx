import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import type { z } from 'zod';

import { FormInput, FormPhoneInput } from '@/components/form/FormFields';
import { Button, Card, Text, useToast } from '@/components/ui';
import { customerService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import type { Customer } from '@/types';
import { quickCustomerSchema } from '@/utils/formSchemas';

interface QuickCustomerFormProps {
  onCreated: (customer: Customer) => void;
  onCancel: () => void;
}

/** Name + phone only, for walk-ins and phone bookings. Full details can be added later. */
export const QuickCustomerForm = ({ onCreated, onCancel }: QuickCustomerFormProps) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const { control, handleSubmit, formState } = useForm<z.input<typeof quickCustomerSchema>, unknown, z.output<typeof quickCustomerSchema>>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: { name: '', phone: '' },
    mode: 'onTouched',
  });

  const create = handleSubmit(async ({ name, phone }) => {
    try {
      const customer = await customerService.createCustomer({
        name,
        phone,
        email: '',
        gender: 'female',
        dob: null,
        address: { line1: '', line2: '', city: 'Kathmandu', province: 'Bagmati', postalCode: '' },
        notes: '',
        avatar: null,
        tags: ['new'],
      });
      toast.success(`${customer.name} added`);
      onCreated(customer);
    } catch (error) {
      // Most often: this phone number already belongs to a customer.
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <Card variant="filled" style={{ gap: spacing.md }}>
      <Text variant="label">New customer</Text>
      <FormInput control={control} name="name" label="Full name" required autoFocus />
      <FormPhoneInput control={control} name="phone" required />
      <View style={styles.row}>
        <Button title="Cancel" variant="ghost" onPress={onCancel} />
        <Button title="Add & select" loading={formState.isSubmitting} onPress={() => void create()} style={styles.flex} fullWidth />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
