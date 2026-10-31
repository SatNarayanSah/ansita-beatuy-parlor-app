import { useNavigation } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';

import { Avatar, IconButton, Text } from '@/components/ui';
import type { User } from '@/types';

const greetingFor = (hour: number): string => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

interface GreetingHeaderProps {
  user: User;
  subtitle: string;
}

/** "Good morning, Ansita" header for the Dashboard and Home tabs, with a shortcut to Settings. */
export const GreetingHeader = ({ user, subtitle }: GreetingHeaderProps) => {
  const navigation = useNavigation();
  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <View style={styles.row}>
      <Avatar name={user.name} uri={user.avatar} size="md" ring />
      <View style={styles.text}>
        <Text variant="bodySmall" tone="secondary">
          {greetingFor(new Date().getHours())},
        </Text>
        <Text variant="h2" numberOfLines={1}>
          {firstName}
        </Text>
      </View>
      <IconButton icon="settings-outline" accessibilityLabel="Settings" variant="soft" onPress={() => navigation.navigate('Settings')} />
      <Text variant="caption" tone="muted" style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  text: { flex: 1 },
  subtitle: { width: '100%' },
});
