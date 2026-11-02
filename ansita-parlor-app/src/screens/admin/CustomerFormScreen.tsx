import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { MultiChipSelect } from '@/components/admin/Pickers';
import { FormInput, FormPhoneInput } from '@/components/form/FormFields';
import { ImagePickerField } from '@/components/form/ImagePickerField';
import { Button, DatePickerField, QueryState, Screen, SegmentedControl, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { customerService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import type { CustomerTag } from '@/types';
import { daysFromToday } from '@/utils/date';
import { formatEnumLabel } from '@/utils/format';
import { nameSchema, optionalEmailSchema, phoneSchema, postalCodeSchema } from '@/utils/validators';

import { TAG_TONES } from './CustomersScreen';

type Props = RootStackScreenProps<'CustomerForm'>;

const TAGS = (Object.keys(TAG_TONES) as CustomerTag[]).map((tag) => ({ value: tag, label: tag === 'vip' ? 'VIP' : formatEnumLabel(tag) }));

const schema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  gender: z.enum(['female', 'male', 'other']),
  dob: z.string().nullable(),
  line1: z.string().trim().max(80),
  city: z.string().trim().max(40),
  postalCode: postalCodeSchema,
  notes: z.string().trim().max(300, { error: 'Keep notes under 300 characters' }),
  tags: z.array(z.enum(['vip', 'regular', 'new', 'bridal', 'student', 'inactive'])),
  avatar: z.string().nullable(),
});

type Values = z.input<typeof schema>;

/** Add or edit a customer (admin). */
export const CustomerFormScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const customerId = route.params?.customerId;
  const query = useServiceQuery(async () => (customerId ? customerService.getCustomer(customerId) : null), [customerId]);

  const { control, handleSubmit, reset, formState } = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', gender: 'female', dob: null, line1: '', city: 'Janakpur', postalCode: '', notes: '', tags: ['new'], avatar: null },
    mode: 'onTouched',
  });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  useEffect(() => {
    const c = query.data;
    if (c) {
      reset({
        name: c.name,
        phone: c.phone,
        email: c.email,
        gender: c.gender,
        dob: c.dob,
        line1: c.address.line1,
        city: c.address.city,
        postalCode: c.address.postalCode,
        notes: c.notes,
        tags: c.tags,
        avatar: c.avatar,
      });
    }
  }, [query.data, reset]);

  const save = handleSubmit(async (values) => {
    const existing = query.data;
    const input = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      gender: values.gender,
      dob: values.dob,
      notes: values.notes,
      tags: values.tags,
      avatar: values.avatar,
      address: { line1: values.line1, line2: existing?.address.line2 ?? '', city: values.city, province: existing?.address.province || 'Madhesh', postalCode: values.postalCode },
    };
    try {
      if (customerId) {
        await customerService.updateCustomer(customerId, input);
        toast.success('Customer updated');
        allowLeave();
        navigation.goBack();
      } else {
        const created = await customerService.createCustomer(input);
        toast.success(`${created.name} added`);
        allowLeave();
        navigation.replace('CustomerDetail', { customerId: created.id });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {() => (
          <View style={{ gap: spacing.lg }}>
            <Controller
              control={control}
              name="avatar"
              render={({ field }) => <ImagePickerField label="Photo" variant="avatar" name={query.data?.name ?? ''} value={field.value} onChange={field.onChange} />}
            />
            <FormInput control={control} name="name" label="Full name" required leftIcon="person-outline" />
            <FormPhoneInput control={control} name="phone" required />
            <FormInput control={control} name="email" label="Email" leftIcon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
            <View style={{ gap: spacing.xs + 2 }}>
              <Text variant="label" tone="secondary">
                Gender
              </Text>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <SegmentedControl
                    options={[
                      { value: 'female', label: 'Female' },
                      { value: 'male', label: 'Male' },
                      { value: 'other', label: 'Other' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
            <Controller
              control={control}
              name="dob"
              render={({ field }) => (
                <DatePickerField label="Date of birth" value={field.value} onChange={field.onChange} maxDate={daysFromToday(-365 * 5)} showYearControls clearable />
              )}
            />
            <FormInput control={control} name="line1" label="Address" leftIcon="home-outline" placeholder="e.g. Ramanand Chowk, Janakpur-8" />
            <FormInput control={control} name="city" label="City" leftIcon="business-outline" />
            <FormInput control={control} name="postalCode" label="Postal code" keyboardType="number-pad" maxLength={5} />
            <FormInput control={control} name="notes" label="Notes & preferences" placeholder="Allergies, favourite shades, preferred stylist…" multiline maxLength={300} showCount />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Tags
              </Text>
              <Controller control={control} name="tags" render={({ field }) => <MultiChipSelect options={TAGS} value={field.value} onChange={field.onChange} />} />
            </View>
            <Button
              title={customerId ? 'Save changes' : 'Add customer'}
              size="lg"
              loading={formState.isSubmitting}
              disabled={Boolean(customerId) && !formState.isDirty}
              onPress={() => void save()}
              fullWidth
            />
          </View>
        )}
      </QueryState>
      {dialog}
    </Screen>
  );
};

