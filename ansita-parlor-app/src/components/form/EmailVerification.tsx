import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Input, Text } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { authService, type EmailCodeSent } from '@/services';
import { useTheme } from '@/theme';

export interface VerifiedEmail {
  email: string;
  token: string;
}

interface Props {
  /** The email field's current text. */
  email: string;
  /** Whether that text is a well-formed email (from the form's schema). */
  emailValid: boolean;
  verified: VerifiedEmail | null;
  onVerified: (value: VerifiedEmail | null) => void;
}

const RESEND_SECONDS = 30;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** True when `verified` proves exactly the address typed in the field. */
export const isEmailVerified = (email: string, verified: VerifiedEmail | null): boolean =>
  verified !== null && verified.email === normalizeEmail(email);

/**
 * Sits under an email field: emails a 6-digit code, then checks it. On success the
 * parent gets a short-lived token to send with sign-up or an email change.
 * Editing the email afterwards makes it unverified again.
 */
export const EmailVerification = ({ email, emailValid, verified, onVerified }: Props) => {
  const { colors, radius, spacing } = useTheme();
  const [sent, setSent] = useState<EmailCodeSent | null>(null);
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const send = useAsyncAction(authService.sendEmailCode);
  const verify = useAsyncAction(authService.verifyEmailCode);

  const current = normalizeEmail(email);
  const isVerified = isEmailVerified(email, verified);
  // A code sent to an address the user has since edited no longer applies.
  const pending = sent !== null && sent.email === current ? sent : null;

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const sendCode = async (): Promise<void> => {
    verify.reset();
    const result = await send.run(current);
    if (result) {
      setSent(result);
      setCode('');
      setSecondsLeft(RESEND_SECONDS);
    }
  };

  const checkCode = async (value: string): Promise<void> => {
    if (!/^\d{6}$/.test(value)) return;
    const result = await verify.run(current, value);
    if (result) {
      onVerified({ email: result.email, token: result.verificationToken });
      setSent(null);
      setCode('');
    }
  };

  if (isVerified) {
    return (
      <View style={[styles.row, { gap: spacing.xs }]} accessibilityLiveRegion="polite">
        <Icon name="checkmark-circle" size={18} color={colors.success} />
        <Text variant="bodySmall" tone="success">
          Email verified
        </Text>
      </View>
    );
  }

  if (!pending) {
    return (
      <View style={{ gap: spacing.xs }}>
        <Button
          title="Send verification code"
          variant="outline"
          size="sm"
          leftIcon="mail-unread-outline"
          disabled={!emailValid}
          loading={send.loading}
          onPress={() => void sendCode()}
        />
        <Text variant="caption" tone={send.error ? 'danger' : 'muted'}>
          {send.error ?? 'We’ll email you a 6-digit code to confirm the address is yours.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="bodySmall" tone="secondary">
        Enter the 6-digit code we sent to {pending.sentTo}. It expires in {pending.expiresInMinutes} minutes.
      </Text>
      {pending.demoCode ? (
        // Only while the server has no email provider set up (development).
        <View style={[styles.row, { backgroundColor: colors.highlightSoft, borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm }]}>
          <Icon name="information-circle" size={18} color={colors.highlight} />
          <Text variant="bodySmall" style={styles.flex}>
            Test mode, your code is <Text variant="label">{pending.demoCode}</Text>
          </Text>
        </View>
      ) : null}
      <Input
        label="Verification code"
        leftIcon="keypad-outline"
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        value={code}
        error={verify.error}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '');
          setCode(digits);
          if (digits.length === 6) void checkCode(digits);
        }}
      />
      <View style={[styles.row, { gap: spacing.sm }]}>
        <Button title="Verify" size="sm" loading={verify.loading} disabled={code.length !== 6} onPress={() => void checkCode(code)} />
        <Button
          title={secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
          variant="ghost"
          size="sm"
          disabled={secondsLeft > 0}
          loading={send.loading}
          onPress={() => void sendCode()}
        />
      </View>
      {send.error ? (
        <Text variant="caption" tone="danger">
          {send.error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  flex: { flex: 1 },
});
