import { StyleSheet, View } from 'react-native';

import { SignOutItem } from '@/components/layout/SignOutItem';
import { Avatar, Badge, Card, Divider, ListItem, Screen, Text, useToast } from '@/components/ui';
import type { CustomerTabScreenProps } from '@/navigation/types';
import { selectCurrentUser, useAuthStore, useCustomerStore } from '@/store';
import { useTheme } from '@/theme';
import { formatNumber } from '@/utils/format';
import { formatPhone } from '@/utils/phone';

type Props = CustomerTabScreenProps<'Profile'>;

export const ProfileScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const customer = useCustomerStore((state) => state.customers.find((item) => item.id === user?.customerId));

  if (!user) return null;
  const later = (feature: string) => () => toast.info(`${feature} arrives in a later phase`);

  return (
    <Screen gap="xl">
      <Card style={[styles.profile, { gap: spacing.md }]}>
        <Avatar name={user.name} uri={user.avatar} size="xl" ring />
        <View style={styles.center}>
          <Text variant="h2">{user.name}</Text>
          <Text variant="bodySmall" tone="secondary">
            {formatPhone(user.phone)} · {user.email}
          </Text>
        </View>
        <View style={styles.badges}>
          {customer?.tags.includes('vip') ? <Badge label="VIP" tone="highlight" icon="diamond" /> : null}
          <Badge label={`${formatNumber(customer?.loyaltyPoints ?? 0)} points`} tone="accent" icon="gift-outline" />
        </View>
      </Card>

      <Card padding="sm">
        <ListItem title="Edit profile" leftIcon="create-outline" showChevron onPress={later('Edit profile')} />
        <Divider inset={56} />
        <ListItem title="My reviews" leftIcon="star-outline" leftIconTone="warning" showChevron onPress={later('My reviews')} />
        <Divider inset={56} />
        <ListItem title="Notifications" leftIcon="notifications-outline" leftIconTone="info" showChevron onPress={later('Notifications')} />
        <Divider inset={56} />
        <ListItem title="Change password" leftIcon="key-outline" leftIconTone="neutral" showChevron onPress={later('Change password')} />
      </Card>

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
    </Screen>
  );
};

const styles = StyleSheet.create({
  profile: { alignItems: 'center' },
  center: { alignItems: 'center', gap: 2 },
  badges: { flexDirection: 'row', gap: 8 },
});
