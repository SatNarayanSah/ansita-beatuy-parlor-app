import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { FormInput } from '@/components/form/FormFields';
import { Button, Icon, Text, useToast } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { RootStackScreenProps } from '@/navigation/types';
import { authService, type PasswordResetRequest, type ResetPasswordInput } from '@/services';
import { useTheme } from '@/theme';
import { emailSchema, passwordSchema } from '@/utils/validators';

import { AuthLayout, FormErrorBanner } from './AuthLayout';

const emailStepSchema = z.object({ email: emailSchema });

const resetStepSchema = z
  .object({
    code: z.string().trim().regex(/^\d{6}$/, { error: 'Enter the 6-digit code' }),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { error: 'Confirm your new password' }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Props = RootStackScreenProps<'ForgotPassword'>;

/**
 * Two steps: request a code by email, then enter it with a new password.
 * Until the server sends email/SMS, it returns the code and it is shown on screen.
 */
export const ForgotPasswordScreen = ({ navigation, route }: Props) => {
  const { colors, radius, spacing } = useTheme();
  const toast = useToast();
  const [sent, setSent] = useState<(PasswordResetRequest & { email: string }) | null>(null);
  const request = useAsyncAction(authService.requestPasswordReset);
  // Resolves true on success; useAsyncAction resolves undefined on failure.
  const reset = useAsyncAction(async (input: ResetPasswordInput) => {
    await authService.resetPassword(input);
    return true as const;
  });

  const emailForm = useForm<z.input<typeof emailStepSchema>, unknown, z.output<typeof emailStepSchema>>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: route.params?.email ?? '' },
    mode: 'onTouched',
  });
  const resetForm = useForm<z.input<typeof resetStepSchema>, unknown, z.output<typeof resetStepSchema>>({
    resolver: zodResolver(resetStepSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const sendCode = emailForm.handleSubmit(async ({ email }) => {
    const result = await request.run(email);
    if (result) {
      setSent({ ...result, email });
      resetForm.reset();
    }
  });

  const resetPassword = resetForm.handleSubmit(async ({ code, newPassword }) => {
    if (!sent) return;
    const done = await reset.run({ email: sent.email, code, newPassword });
    if (done) {
      toast.success('Password updated. Sign in with your new password.');
      navigation.popTo('Login', { email: sent.email });
    }
  });

  if (!sent) {
    return (
      <AuthLayout
        title="Forgot password?"
        subtitle="Enter the email you signed up with and we'll send you a 6-digit code."
        onBack={() => navigation.goBack()}
      >
        <FormErrorBanner message={request.error} />
        <FormInput
          control={emailForm.control}
          name="email"
          label="Email"
          leftIcon="mail-outline"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => void sendCode()}
        />
        <Button title="Send code" size="lg" loading={request.loading} onPress={() => void sendCode()} fullWidth />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={`We sent a 6-digit code to ${sent.sentTo}. It expires in 10 minutes.`}
      onBack={() => {
        setSent(null);
        reset.reset();
      }}
    >
      {sent.demoCode ? (
        // Only while the server has no email/SMS sending set up (EXPOSE_RESET_CODE).
        <View style={[styles.demoCode, { backgroundColor: colors.highlightSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }]}>
          <Icon name="information-circle" size={18} color={colors.highlight} />
          <Text variant="bodySmall" style={styles.flex}>
            Your code is <Text variant="label">{sent.demoCode}</Text>
          </Text>
        </View>
      ) : null}
      <FormErrorBanner message={reset.error} />
      <FormInput
        control={resetForm.control}
        name="code"
        label="Verification code"
        leftIcon="keypad-outline"
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      <FormInput
        control={resetForm.control}
        name="newPassword"
        label="New password"
        leftIcon="lock-closed-outline"
        placeholder="At least 6 characters"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormInput
        control={resetForm.control}
        name="confirmPassword"
        label="Confirm new password"
        leftIcon="lock-closed-outline"
        placeholder="Type it again"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void resetPassword()}
      />
      <Button title="Reset password" size="lg" loading={reset.loading} onPress={() => void resetPassword()} fullWidth />
      <Button title="Resend code" variant="ghost" loading={request.loading} onPress={() => void sendCode()} />
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  demoCode: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
