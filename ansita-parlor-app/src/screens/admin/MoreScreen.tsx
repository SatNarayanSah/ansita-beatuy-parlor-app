import { View } from 'react-native';

import { SignOutItem } from '@/components/layout/SignOutItem';
import { Card, Divider, ListItem, Screen, SectionHeader, useToast, type IconName } from '@/components/ui';
import type { AdminTabScreenProps } from '@/navigation/types';
import type { Tone } from '@/theme';
import { useTheme } from '@/theme';

type Props = AdminTabScreenProps<'More'>;

interface ManageItem {
  title: string;
  subtitle: string;
  icon: IconName;
  tone: Tone;
}

/** Management areas that don't get their own tab. Screens arrive in later phases. */
const MANAGE_ITEMS: readonly ManageItem[] = [
  { title: 'Services & prices', subtitle: 'Categories, durations and prices', icon: 'pricetags-outline', tone: 'primary' },
  { title: 'Staff', subtitle: 'Team, specialties and working hours', icon: 'people-circle-outline', tone: 'accent' },
  { title: 'Offers', subtitle: 'Promotions and promo codes', icon: 'gift-outline', tone: 'highlight' },
  { title: 'Reviews', subtitle: 'Customer feedback and replies', icon: 'star-outline', tone: 'warning' },
  { title: 'Reports', subtitle: 'Revenue, services and staff performance', icon: 'bar-chart-outline', tone: 'success' },
  { title: 'Notifications', subtitle: 'Booking requests and payments', icon: 'notifications-outline', tone: 'info' },
];

export const MoreScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();

  return (
    <Screen gap="xl">
      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Manage" compact />
        <Card padding="sm">
          {MANAGE_ITEMS.map((item, index) => (
            <View key={item.title}>
              {index > 0 ? <Divider inset={56} /> : null}
              <ListItem
                title={item.title}
                subtitle={item.subtitle}
                leftIcon={item.icon}
                leftIconTone={item.tone}
                showChevron
                onPress={() => toast.info(`${item.title} arrives in a later phase`)}
              />
            </View>
          ))}
        </Card>
      </View>
      <View style={{ gap: spacing.md }}>
        <SectionHeader title="App" compact />
        <Card padding="sm">
          <ListItem
            title="Settings"
            subtitle="Theme, demo role switcher, reset data"
            leftIcon="settings-outline"
            leftIconTone="neutral"
            showChevron
            onPress={() => navigation.navigate('Settings')}
          />
          <Divider inset={56} />
          <SignOutItem />
        </Card>
      </View>
    </Screen>
  );
};
