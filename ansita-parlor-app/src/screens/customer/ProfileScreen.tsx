import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PhotoSheet } from '@/components/customer/PhotoSheet';
import { SignOutItem } from '@/components/layout/SignOutItem';
import {
  Avatar,
  Badge,
  Card,
  CountBadge,
  Divider,
  ListItem,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
  type SegmentOption,
} from '@/components/ui';
import { useT } from '@/i18n';
import type { CustomerTabScreenProps } from '@/navigation/types';
import {
  selectCurrentUser,
  selectUnreadCount,
  useAuthStore,
  useCourseStore,
  useCustomerStore,
  useNotificationStore,
  useSettingsStore,
  type Language,
} from '@/store';
import { useTheme } from '@/theme';
import { formatNumber } from '@/utils/format';
import { formatPhone } from '@/utils/phone';

type Props = CustomerTabScreenProps<'Profile'>;

const LANGUAGE_OPTIONS: readonly SegmentOption<Language>[] = [
  { value: 'en', label: 'English' },
  { value: 'ne', label: 'नेपाली' },
];

export const ProfileScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const t = useT();
  const user = useAuthStore(selectCurrentUser);
  const customer = useCustomerStore((state) => state.customers.find((item) => item.id === user?.customerId));
  const unread = useNotificationStore((state) => (user ? selectUnreadCount(state.notifications, user.id) : 0));
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  // Customers only receive their own enrollments; the entry shows once they've joined a course.
  const hasCourses = useCourseStore((state) => state.enrollments.length > 0);
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!user) return null;

  return (
    <Screen gap="lg">
      <Card style={[styles.profile, { gap: spacing.md }]}>
        <Avatar name={user.name} uri={user.avatar} size="xl" ring editable onPress={() => setPhotoOpen(true)} />
        <View style={styles.center}>
          <Text variant="h2">{user.name}</Text>
          <Text variant="bodySmall" tone="secondary">
            {formatPhone(user.phone)}
          </Text>
          <Text variant="caption" tone="muted">
            {user.email}
          </Text>
        </View>
        <View style={styles.badges}>
          {customer?.tags.includes('vip') ? <Badge label="VIP" tone="highlight" icon="diamond" /> : null}
          <Badge label={`${formatNumber(customer?.loyaltyPoints ?? 0)} points`} tone="accent" icon="gift-outline" />
        </View>
      </Card>

      <Card padding="sm">
        <ListItem title={t('profile.edit')} leftIcon="create-outline" showChevron onPress={() => navigation.navigate('EditProfile')} />
        <Divider inset={56} />
        <ListItem title={t('profile.loyalty')} leftIcon="diamond-outline" leftIconTone="accent" showChevron onPress={() => navigation.navigate('LoyaltyHistory')} />
        <Divider inset={56} />
        {hasCourses ? (
          <>
            <ListItem
              title={t('profile.courses')}
              subtitle="Fees, attendance, certificates"
              leftIcon="school-outline"
              leftIconTone="success"
              showChevron
              onPress={() => navigation.navigate('MyCourses')}
            />
            <Divider inset={56} />
          </>
        ) : null}
        <ListItem
          title={t('profile.preferences')}
          subtitle="Favourite stylist, reminders, payment"
          leftIcon="heart-outline"
          leftIconTone="primary"
          showChevron
          onPress={() => navigation.navigate('Preferences')}
        />
        <Divider inset={56} />
        <ListItem
          title={t('profile.notifications')}
          leftIcon="notifications-outline"
          leftIconTone="info"
          right={unread > 0 ? <CountBadge count={unread} /> : undefined}
          showChevron
          onPress={() => navigation.navigate('Notifications')}
        />
      </Card>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title={t('profile.language')} compact />
        <SegmentedControl options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      </View>

      <Card padding="sm">
        <ListItem title={t('profile.help')} leftIcon="help-buoy-outline" leftIconTone="success" showChevron onPress={() => navigation.navigate('HelpContact')} />
        <Divider inset={56} />
        <ListItem
          title="Settings"
          subtitle="Preferences, server status"
          leftIcon="settings-outline"
          leftIconTone="neutral"
          showChevron
          onPress={() => navigation.navigate('Settings')}
        />
        <Divider inset={56} />
        <SignOutItem />
      </Card>

      <PhotoSheet visible={photoOpen} hasPhoto={Boolean(user.avatar)} onClose={() => setPhotoOpen(false)} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  profile: { alignItems: 'center' },
  center: { alignItems: 'center', gap: 2 },
  badges: { flexDirection: 'row', gap: 8 },
});
