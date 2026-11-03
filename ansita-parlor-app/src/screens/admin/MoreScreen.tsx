import type { ReactNode } from 'react';
import { View } from 'react-native';

import { SignOutItem } from '@/components/layout/SignOutItem';
import { Card, CountBadge, Divider, ListItem, Screen, SectionHeader, type IconName } from '@/components/ui';
import type { AdminTabScreenProps, RootStackParamList } from '@/navigation/types';
import { selectCurrentUser, selectUnreadCount, useAuthStore, useNotificationStore, usePaymentRequestStore } from '@/store';
import { useTheme, type Tone } from '@/theme';

type Props = AdminTabScreenProps<'More'>;

type MoreRoute = 'ManageServices' | 'StaffList' | 'Reports' | 'PaymentRequests' | 'BusinessSettings' | 'Notifications' | 'Settings';

interface MenuItem {
  title: string;
  subtitle: string;
  icon: IconName;
  tone: Tone;
  route: MoreRoute & keyof RootStackParamList;
}

const MANAGE: readonly MenuItem[] = [
  { title: 'Services & prices', subtitle: 'Categories, durations, prices, availability', icon: 'pricetags-outline', tone: 'primary', route: 'ManageServices' },
  { title: 'Staff', subtitle: 'Team, schedules, days off, performance', icon: 'people-circle-outline', tone: 'accent', route: 'StaffList' },
  { title: 'Reports', subtitle: 'Revenue, services, staff, retention', icon: 'bar-chart-outline', tone: 'success', route: 'Reports' },
  { title: 'Online payments', subtitle: '“I’ve paid” requests to verify, and history', icon: 'wallet-outline', tone: 'warning', route: 'PaymentRequests' },
];

const APP: readonly MenuItem[] = [
  { title: 'Business settings', subtitle: 'Profile, hours, holidays, loyalty, online payments, alerts', icon: 'storefront-outline', tone: 'highlight', route: 'BusinessSettings' },
  { title: 'Notifications', subtitle: 'Booking requests, payments, reviews', icon: 'notifications-outline', tone: 'info', route: 'Notifications' },
  { title: 'App settings', subtitle: 'Preferences, server status', icon: 'settings-outline', tone: 'neutral', route: 'Settings' },
];

export const MoreScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const user = useAuthStore(selectCurrentUser);
  const unread = useNotificationStore((state) => (user ? selectUnreadCount(state.notifications, user.id) : 0));
  const paymentsToVerify = usePaymentRequestStore((state) => state.pendingCount);
  const counts: Partial<Record<MoreRoute, number>> = { Notifications: unread, PaymentRequests: paymentsToVerify };

  const section = (title: string, items: readonly MenuItem[], footer?: ReactNode) => (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title={title} compact />
      <Card padding="sm">
        {items.map((item, index) => (
          <View key={item.route}>
            {index > 0 ? <Divider inset={56} /> : null}
            <ListItem
              title={item.title}
              subtitle={item.subtitle}
              leftIcon={item.icon}
              leftIconTone={item.tone}
              right={(counts[item.route] ?? 0) > 0 ? <CountBadge count={counts[item.route] ?? 0} /> : undefined}
              showChevron
              onPress={() => navigation.navigate(item.route)}
            />
          </View>
        ))}
        {footer}
      </Card>
    </View>
  );

  return (
    <Screen gap="lg">
      {section('Manage', MANAGE)}
      {section(
        'App',
        APP,
        <>
          <Divider inset={56} />
          <SignOutItem />
        </>,
      )}
    </Screen>
  );
};
