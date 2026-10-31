import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { Icon, IconButton, Text } from '@/components/ui';
import { useTheme } from '@/theme';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  /** Shows a back button (Register, Forgot password). */
  onBack?: () => void;
  /** Large centred logo above the title (Login). */
  showLogo?: boolean;
  children: ReactNode;
  /** Bottom area, e.g. "New here? Create an account". */
  footer?: ReactNode;
}

/** Scaffold shared by the auth screens: safe area, keyboard handling, header and entrance animation. */
export const AuthLayout = ({ title, subtitle, onBack, showLogo = false, children, footer }: AuthLayoutProps) => {
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* iOS keyboard handled by automaticallyAdjustKeyboardInsets; Android resizes the window. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={[styles.content, { padding: spacing.xxl, gap: spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {onBack ? (
          <IconButton icon="arrow-back" accessibilityLabel="Go back" variant="soft" onPress={onBack} style={styles.back} />
        ) : null}

        <Animated.View entering={FadeInDown.duration(400)} style={[showLogo && styles.centered, { gap: spacing.sm }]}>
          {showLogo ? <BrandLogo size={76} style={{ marginBottom: spacing.md }} /> : null}
          <Text variant="h1" align={showLogo ? 'center' : 'left'} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="secondary" align={showLogo ? 'center' : 'left'}>
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ gap: spacing.lg }}>
          {children}
        </Animated.View>

        {footer ? <View style={[styles.footer, { paddingTop: spacing.md }]}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

/** Inline error banner for a failed submit (wrong password, expired code…). */
export const FormErrorBanner = ({ message }: { message: string | null }) => {
  const { colors, radius, spacing } = useTheme();
  if (!message) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }]}
    >
      <Icon name="alert-circle" size={18} color={colors.danger} />
      <Text variant="bodySmall" tone="danger" style={styles.bannerText}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Forms read best at phone width; on tablets they are centred.
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  back: { alignSelf: 'flex-start' },
  centered: { alignItems: 'center', marginTop: 24 },
  footer: { marginTop: 'auto', alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'flex-start' },
  bannerText: { flex: 1 },
});
