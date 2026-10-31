import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, IconButton, Text } from '@/components/ui';
import { useT, type TranslationKey } from '@/i18n';
import type { User } from '@/types';

const greetingKey = (hour: number): TranslationKey => {
  if (hour < 12) return 'greeting.morning';
  if (hour < 17) return 'greeting.afternoon';
  return 'greeting.evening';
};

interface GreetingHeaderProps {
  user: User;
  subtitle: string;
  /** Right-hand action; defaults to a Settings shortcut. */
  action?: ReactNode;
}

/** "Good morning, Priya" header for the Dashboard and Home tabs. */
export const GreetingHeader = ({ user, subtitle, action }: GreetingHeaderProps) => {
  const navigation = useNavigation();
  const t = useT();
  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <View style={styles.row}>
      <Avatar name={user.name} uri={user.avatar} size="md" ring />
      <View style={styles.text}>
        <Text variant="bodySmall" tone="secondary">
          {t(greetingKey(new Date().getHours()))},
        </Text>
        <Text variant="h2" numberOfLines={1}>
          {firstName}
        </Text>
      </View>
      {action ?? (
        <IconButton icon="settings-outline" accessibilityLabel="Settings" variant="soft" onPress={() => navigation.navigate('Settings')} />
      )}
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
