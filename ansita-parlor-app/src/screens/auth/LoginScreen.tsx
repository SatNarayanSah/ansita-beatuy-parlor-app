import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { FormInput } from '@/components/form/FormFields';
import { Button, Divider, Text } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import type { RootStackScreenProps } from '@/navigation/types';
import { authService } from '@/services';
import type { UserRole } from '@/types';
import { emailSchema } from '@/utils/validators';

import { AuthLayout, FormErrorBanner } from './AuthLayout';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Enter your password' }),
});

type LoginValues = z.input<typeof loginSchema>;

type Props = RootStackScreenProps<'Login'>;

/** Email + password sign-in, plus one-tap demo logins. Success swaps the navigator to the user's tabs. */
export const LoginScreen = ({ navigation, route }: Props) => {
  const login = useAsyncAction(authService.login);
  const demoLogin = useAsyncAction(authService.loginAsDemo);
  const [demoRole, setDemoRole] = useState<UserRole | null>(null);

  const { control, handleSubmit, getValues, setValue } = useForm<LoginValues, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: route.params?.email ?? '', password: '' },
    mode: 'onTouched',
  });

  // Returning from "Forgot password" prefills the email that was just reset.
  const prefillEmail = route.params?.email;
  useEffect(() => {
    if (prefillEmail) setValue('email', prefillEmail);
  }, [prefillEmail, setValue]);

  const submit = handleSubmit((values) => {
    demoLogin.reset();
    void login.run(values);
  });

  const continueAsDemo = (role: UserRole): void => {
    login.reset();
    setDemoRole(role);
    void demoLogin.run(role).finally(() => setDemoRole(null));
  };

  const busy = login.loading || demoLogin.loading;

  return (
    <AuthLayout
      showLogo
      title="Welcome back"
      subtitle="Sign in to book appointments and manage your courses."
      footer={
        <View style={styles.row}>
          <Text variant="body" tone="secondary">
            New to Ansita?
          </Text>
          <Button title="Create an account" variant="ghost" size="sm" onPress={() => navigation.navigate('Register')} />
        </View>
      }
    >
      <FormErrorBanner message={login.error ?? demoLogin.error} />
      <FormInput
        control={control}
        name="email"
        label="Email"
        leftIcon="mail-outline"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <FormInput
        control={control}
        name="password"
        label="Password"
        leftIcon="lock-closed-outline"
        placeholder="Your password"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <Button
        title="Forgot password?"
        variant="ghost"
        size="sm"
        style={styles.forgot}
        onPress={() => navigation.navigate('ForgotPassword', { email: getValues('email') || undefined })}
      />
      <Button title="Sign in" size="lg" loading={login.loading} disabled={busy} onPress={() => void submit()} fullWidth />

      <Divider label="or explore the demo" spacing="sm" />
      <View style={styles.demoRow}>
        <Button
          title="Demo admin"
          variant="secondary"
          leftIcon="briefcase-outline"
          loading={demoRole === 'admin'}
          disabled={busy}
          onPress={() => continueAsDemo('admin')}
          style={styles.flex}
          fullWidth
        />
        <Button
          title="Demo customer"
          variant="outline"
          leftIcon="person-outline"
          loading={demoRole === 'customer'}
          disabled={busy}
          onPress={() => continueAsDemo('customer')}
          style={styles.flex}
          fullWidth
        />
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  forgot: { alignSelf: 'flex-end', marginTop: -8 },
  demoRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
