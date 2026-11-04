import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { PhotoSheet } from '@/components/customer/PhotoSheet';
import { EmailVerification, isEmailVerified, normalizeEmail, type VerifiedEmail } from '@/components/form/EmailVerification';
import { FormInput, FormPhoneInput } from '@/components/form/FormFields';
import { Avatar, Button, DatePickerField, QueryState, Screen, SegmentedControl, SkeletonCard, Text, useToast, type SegmentOption } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { authService, customerService, getErrorMessage } from '@/services';
import { selectCurrentUser, useAuthStore } from '@/store';
import { useTheme } from '@/theme';
import type { Gender } from '@/types';
import { daysFromToday } from '@/utils/date';
import { emailSchema, nameSchema, phoneSchema } from '@/utils/validators';

type Props = RootStackScreenProps<'EditProfile'>;

const GENDER_OPTIONS: readonly SegmentOption<Gender>[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  gender: z.enum(['female', 'male', 'other']),
  dob: z.string().nullable(),
  addressLine: z.string().trim().max(80, { error: 'Address is too long' }),
  city: z.string().trim().max(40, { error: 'City name is too long' }),
});

type ProfileValues = z.input<typeof profileSchema>;

export const EditProfileScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const t = useT();
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const customerId = user?.customerId ?? '';
  const [photoOpen, setPhotoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState<VerifiedEmail | null>(null);
  const query = useServiceQuery(() => customerService.getCustomer(customerId), [customerId]);

  const { control, handleSubmit, reset, formState, setError } = useForm<ProfileValues, unknown, z.output<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '', gender: 'female', dob: null, addressLine: '', city: '' },
    mode: 'onTouched',
  });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  // Fill the form once the profile has loaded.
  useEffect(() => {
    const customer = query.data;
    if (customer) {
      reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        gender: customer.gender,
        dob: customer.dob,
        addressLine: customer.address.line1,
        city: customer.address.city,
      });
    }
  }, [query.data, reset]);

  const email = useWatch({ control, name: 'email' });
  // A new sign-in email has to be confirmed with an emailed code; the current one doesn't.
  const emailChanged = Boolean(user) && normalizeEmail(email) !== normalizeEmail(user?.email ?? '');

  const save = handleSubmit(async (values) => {
    const customer = query.data;
    if (!customer) return;
    if (emailChanged && !isEmailVerified(values.email, verified)) {
      setError('email', { message: 'Verify your new email with the code we send you' }, { shouldFocus: true });
      return;
    }
    setSaving(true);
    try {
      // Account fields (also mirrored to the customer record), then profile-only fields.
      await authService.updateProfile({
        name: values.name,
        email: values.email,
        phone: values.phone,
        emailVerificationToken: emailChanged ? verified?.token : undefined,
      });
      await customerService.updateCustomer(customer.id, {
        gender: values.gender,
        dob: values.dob,
        address: { ...customer.address, line1: values.addressLine, city: values.city },
      });
      toast.success('Profile saved');
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  if (!user) return null;

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {() => (
          <View style={{ gap: spacing.lg }}>
            <View style={styles.photo}>
              <Avatar name={user.name} uri={user.avatar} size="xl" ring editable onPress={() => setPhotoOpen(true)} />
              <Button title="Change photo" variant="ghost" size="sm" onPress={() => setPhotoOpen(true)} />
            </View>
            <FormInput control={control} name="name" label="Full name" required leftIcon="person-outline" autoComplete="name" />
            <FormInput control={control} name="email" label="Email" required leftIcon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
            {emailChanged ? (
              <EmailVerification email={email} emailValid={emailSchema.safeParse(email).success} verified={verified} onVerified={setVerified} />
            ) : null}
            <FormPhoneInput control={control} name="phone" required helperText="NTC or Ncell mobile number." />
            <View style={{ gap: spacing.xs + 2 }}>
              <Text variant="label" tone="secondary">
                Gender
              </Text>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => <SegmentedControl options={GENDER_OPTIONS} value={field.value} onChange={field.onChange} />}
              />
            </View>
            <Controller
              control={control}
              name="dob"
              render={({ field }) => (
                <DatePickerField
                  label="Date of birth"
                  helperText="We send a birthday treat every year."
                  value={field.value}
                  onChange={field.onChange}
                  maxDate={daysFromToday(-365 * 12)}
                  showYearControls
                  clearable
                />
              )}
            />
            <FormInput control={control} name="addressLine" label="Address" leftIcon="home-outline" placeholder="e.g. Ramanand Chowk, Janakpur-8" />
            <FormInput control={control} name="city" label="City" leftIcon="business-outline" placeholder="Janakpur" />
            <Button title={t('common.save')} size="lg" loading={saving} disabled={!formState.isDirty} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>
      <PhotoSheet visible={photoOpen} hasPhoto={Boolean(user.avatar)} onClose={() => setPhotoOpen(false)} />
      {dialog}
    </Screen>
  );
};

const styles = StyleSheet.create({
  photo: { alignItems: 'center', gap: 4 },
});
