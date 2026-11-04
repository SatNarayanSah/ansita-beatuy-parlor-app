import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { EmailVerification, isEmailVerified, type VerifiedEmail } from '@/components/form/EmailVerification';
import { FormInput, FormPhoneInput } from '@/components/form/FormFields';
import { Button, Text } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { RootStackScreenProps } from '@/navigation/types';
import { authService } from '@/services';
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from '@/utils/validators';

import { AuthLayout, FormErrorBanner } from './AuthLayout';

const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, { error: 'Confirm your password' }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterValues = z.input<typeof registerSchema>;

type Props = RootStackScreenProps<'Register'>;

/**
 * Creates a customer account and signs in. Walk-in customers already on file
 * (matched by phone) keep their visit history.
 */
export const RegisterScreen = ({ navigation }: Props) => {
  const register = useAsyncAction(authService.register);
  const [verified, setVerified] = useState<VerifiedEmail | null>(null);

  const { control, handleSubmit, setError } = useForm<RegisterValues, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const email = useWatch({ control, name: 'email' });
  const emailValid = emailSchema.safeParse(email).success;

  const submit = handleSubmit(({ name, email: address, phone, password }) => {
    if (!verified || !isEmailVerified(address, verified)) {
      setError('email', { message: 'Verify your email with the code we send you' }, { shouldFocus: true });
      return;
    }
    void register.run({ name, email: address, phone, password, emailVerificationToken: verified.token });
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Book faster, track your visits and earn loyalty points."
      onBack={() => navigation.goBack()}
      footer={
        <View style={styles.row}>
          <Text variant="body" tone="secondary">
            Already have an account?
          </Text>
          <Button title="Sign in" variant="ghost" size="sm" onPress={() => navigation.navigate('Login')} />
        </View>
      }
    >
      <FormErrorBanner message={register.error} />
      <FormInput control={control} name="name" label="Full name" required leftIcon="person-outline" placeholder="e.g. Sita Shrestha" autoComplete="name" textContentType="name" />
      <FormInput
        control={control}
        name="email"
        label="Email"
        required
        leftIcon="mail-outline"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <EmailVerification email={email} emailValid={emailValid} verified={verified} onVerified={setVerified} />
      <FormPhoneInput control={control} name="phone" required helperText="NTC or Ncell. We send booking reminders here." />
      <FormInput
        control={control}
        name="password"
        label="Password"
        required
        leftIcon="lock-closed-outline"
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormInput
        control={control}
        name="confirmPassword"
        label="Confirm password"
        required
        leftIcon="lock-closed-outline"
        placeholder="Type it again"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <Button title="Create account" size="lg" loading={register.loading} onPress={() => void submit()} fullWidth />
      <Text variant="caption" tone="muted" align="center">
        By continuing you agree to our Terms of Service and Privacy Policy.
      </Text>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
});
