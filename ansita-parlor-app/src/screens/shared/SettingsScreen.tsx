import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { SignOutItem } from '@/components/layout/SignOutItem';
import {
  Badge,
  Card,
  ConfirmDialog,
  Divider,
  ListItem,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
  useToast,
  type SegmentOption,
} from '@/components/ui';
import { useApiConfig } from '@/hooks/useApiConfig';
import type { RootStackScreenProps } from '@/navigation/types';
import { authService, configureApi, demoService, getErrorMessage } from '@/services';
import { selectCurrentUser, useAuthStore, useSettingsStore } from '@/store';
import { useTheme } from '@/theme';
import type { UserRole } from '@/types';

const ROLE_OPTIONS: readonly SegmentOption<UserRole>[] = [
  { value: 'admin', label: 'Admin', icon: 'briefcase-outline' },
  { value: 'customer', label: 'Customer', icon: 'person-outline' },
];

type Props = RootStackScreenProps<'Settings'>;

/** Appearance, demo tools (role switcher, data reset) and account. Shared by both roles. */
export const SettingsScreen = ({ navigation }: Props) => {
  const { colors, spacing } = useTheme();
  const { offline } = useApiConfig();
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const setHasSeenOnboarding = useSettingsStore((state) => state.setHasSeenOnboarding);
  const [switching, setSwitching] = useState<UserRole | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Switching changes the session user; the navigator then resets to that role's tabs.
  const switchRole = async (role: UserRole): Promise<void> => {
    if (role === user?.role || switching) return;
    setSwitching(role);
    try {
      const next = await authService.switchDemoRole(role);
      toast.success(`Now viewing as ${next.name} (${role})`);
    } catch (error) {
      setSwitching(null);
      toast.error(getErrorMessage(error));
    }
  };

  const resetData = async (): Promise<void> => {
    setResetting(true);
    await demoService.resetDemoData();
    setResetting(false);
    setResetOpen(false);
    toast.success('Demo data restored');
  };

  return (
    <Screen gap="xl">
      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Preferences" compact />
        <Card style={{ gap: spacing.md }}>
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

      <View style={{ gap: spacing.md }}>
        <View style={styles.headerRow}>
          <SectionHeader title="Demo" compact style={styles.flex} />
          <Badge label="Demo only" tone="highlight" size="sm" />
        </View>
        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="h4">View the app as</Text>
            <Text variant="bodySmall" tone="secondary">
              Jump between the admin and customer apps without signing out.
            </Text>
          </View>
          <SegmentedControl
            options={ROLE_OPTIONS}
            value={switching ?? user?.role ?? 'customer'}
            onChange={(role) => void switchRole(role)}
          />
        </Card>
        <Card padding="sm">
          <ListItem
            title="Simulate offline"
            subtitle="Every request fails, to show error states"
            leftIcon="cloud-offline-outline"
            leftIconTone="danger"
            right={
              <Switch
                value={offline}
                onValueChange={(value) => {
                  configureApi({ offline: value });
                }}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel="Simulate offline"
              />
            }
          />
          <Divider inset={56} />
          <ListItem
            title="Reset demo data"
            subtitle="Restore fresh sample bookings, customers and courses"
            leftIcon="refresh"
            leftIconTone="warning"
            onPress={() => setResetOpen(true)}
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
          <Divider inset={56} />
          <ListItem
            title="Demo data tools"
            subtitle="Record counts, fake API settings, smoke test"
            leftIcon="flask-outline"
            leftIconTone="info"
            showChevron
            onPress={() => navigation.navigate('DemoData')}
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

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Account" compact />
        <Card padding="sm">
          {user ? <ListItem title={user.name} subtitle={user.email} leftIcon="person-circle-outline" leftIconTone="neutral" /> : null}
          <Divider inset={56} />
          <SignOutItem />
        </Card>
      </View>

      <Text variant="caption" tone="muted" align="center">
        Ansita Beauty Parlour · v1.0.0
      </Text>

      <ConfirmDialog
        visible={resetOpen}
        tone="danger"
        icon="refresh"
        title="Reset demo data?"
        message="All changes are discarded and fresh sample data is generated around today's date. Your theme and sign-in are kept."
        confirmLabel="Reset"
        loading={resetting}
        onConfirm={() => void resetData()}
        onCancel={() => setResetOpen(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
