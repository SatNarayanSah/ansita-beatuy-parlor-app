import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Switch, View } from 'react-native';

import { SignOutItem } from '@/components/layout/SignOutItem';
import { Card, Divider, ListItem, Screen, SectionHeader, Text, useToast } from '@/components/ui';
import { useApiConfig } from '@/hooks/useApiConfig';
import type { RootStackScreenProps } from '@/navigation/types';
import { API_URL } from '@/services';
import {
  getNotificationPermission,
  registerForPhoneNotifications,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/services/phoneNotifications';
import { selectCurrentUser, useAuthStore, useSettingsStore } from '@/store';
import { useTheme } from '@/theme';

type Props = RootStackScreenProps<'Settings'>;

/** Preferences, server status and account. Shared by both roles. */
export const SettingsScreen = ({ navigation }: Props) => {
  const { colors, spacing } = useTheme();
  const { offline } = useApiConfig();
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const setHasSeenOnboarding = useSettingsStore((state) => state.setHasSeenOnboarding);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  // Re-checked on return from the phone's settings, where the user may have changed it.
  useEffect(() => {
    const check = (): void => {
      getNotificationPermission().then(setPermission).catch(() => undefined);
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  const turnOnNotifications = async (): Promise<void> => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      registerForPhoneNotifications().catch(() => undefined);
      toast.success('Notifications are on');
    }
  };

  return (
    <Screen gap="lg">
      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Preferences" compact />
        <Card style={{ gap: spacing.md }}>
          <ListItem
            title="Phone notifications"
            subtitle={
              permission === 'granted'
                ? 'On · bookings, payments and reminders in your notification bar'
                : 'Off · tap to get booking updates on this phone'
            }
            leftIcon={permission === 'granted' ? 'notifications-outline' : 'notifications-off-outline'}
            leftIconTone={permission === 'granted' ? 'success' : 'warning'}
            rightText={permission === 'granted' ? 'Manage' : 'Turn on'}
            compact
            // Once on, sounds and categories are managed in the phone's own settings.
            onPress={() => (permission === 'granted' ? void Linking.openSettings() : void turnOnNotifications())}
          />
          <ListItem
            title="Haptic feedback"
            subtitle="Gentle vibrations on taps and confirmations"
            leftIcon="phone-portrait-outline"
            leftIconTone="neutral"
            compact
            right={
              <Switch
                value={hapticsEnabled}
                onValueChange={setHapticsEnabled}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel="Haptic feedback"
              />
            }
          />
        </Card>
      </View>

      {user?.role === 'admin' ? (
        <Card padding="sm">
          <ListItem
            title="Business settings"
            subtitle="Profile, opening hours, holidays, loyalty rules, admin alerts"
            leftIcon="storefront-outline"
            leftIconTone="highlight"
            showChevron
            onPress={() => navigation.navigate('BusinessSettings')}
          />
        </Card>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="App" compact />
        <Card padding="sm">
          <ListItem
            title="Server"
            subtitle={offline ? `Can’t reach ${API_URL}` : API_URL}
            leftIcon={offline ? 'cloud-offline-outline' : 'cloud-done-outline'}
            leftIconTone={offline ? 'danger' : 'success'}
            compact
          />
          <Divider inset={56} />
          <ListItem
            title="Replay onboarding"
            subtitle="Shown again the next time you sign out"
            leftIcon="albums-outline"
            leftIconTone="accent"
            onPress={() => {
              setHasSeenOnboarding(false);
              toast.info('Onboarding will show after you sign out');
            }}
          />
          {__DEV__ ? (
            <>
              <Divider inset={56} />
              <ListItem
                title="UI Kit showcase"
                subtitle="Every component (dev builds only)"
                leftIcon="color-palette-outline"
                leftIconTone="primary"
                showChevron
                onPress={() => navigation.navigate('UIKitShowcase')}
              />
            </>
          ) : null}
        </Card>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Account" compact />
        <Card padding="sm">
          {user ? <ListItem title={user.name} subtitle={user.email} leftIcon="person-circle-outline" leftIconTone="neutral" /> : null}
          <Divider inset={56} />
          <SignOutItem />
        </Card>
      </View>

      <Text variant="caption" tone="muted" align="center" style={styles.footer}>
        Ansita Beauty Parlour · v1.0.0
      </Text>

    </Screen>
  );
};

const styles = StyleSheet.create({
  footer: { marginTop: 4 },
});
