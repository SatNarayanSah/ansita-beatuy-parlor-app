import { useMemo } from 'react';
import { Switch, View } from 'react-native';

import { PaymentMethodPicker } from '@/components/customer/PaymentMethodPicker';
import { Avatar, Card, Divider, Icon, ListItem, Screen, SectionHeader, SegmentedControl, Text, type SegmentOption } from '@/components/ui';
import type { RootStackScreenProps } from '@/navigation/types';
import { selectActiveStaff, useSettingsStore, useStaffStore, type ReminderTiming } from '@/store';
import { useTheme } from '@/theme';
import { formatEnumLabel } from '@/utils/format';

type Props = RootStackScreenProps<'Preferences'>;

const REMINDER_OPTIONS: readonly SegmentOption<ReminderTiming>[] = [
  { value: '1h', label: '1 hour before' },
  { value: '1d', label: '1 day before' },
  { value: 'both', label: 'Both' },
];

/** Saved on this device and used to pre-fill bookings. Changes apply instantly. */
export const PreferencesScreen = (_props: Props) => {
  const { colors, spacing } = useTheme();
  const preferences = useSettingsStore((state) => state.preferences);
  const update = useSettingsStore((state) => state.updatePreferences);
  const allStaff = useStaffStore((state) => state.staff);
  const staff = useMemo(() => selectActiveStaff(allStaff), [allStaff]);

  return (
    <Screen gap="lg">
      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Favourite stylist" subtitle="Pre-selected when you book, if they offer the service." compact />
        <Card padding="sm">
          <ListItem
            title="No preference"
            leftIcon="sparkles-outline"
            leftIconTone="highlight"
            right={preferences.favoriteStaffId === null ? <Icon name="checkmark-circle" size={22} color={colors.primary} /> : undefined}
            onPress={() => update({ favoriteStaffId: null })}
          />
          {staff.map((member) => (
            <View key={member.id}>
              <Divider inset={56} />
              <ListItem
                title={member.name}
                subtitle={`${formatEnumLabel(member.role)} · ★ ${member.rating}`}
                left={<Avatar name={member.name} uri={member.avatar} size="sm" />}
                right={preferences.favoriteStaffId === member.id ? <Icon name="heart" size={22} color={colors.primary} /> : undefined}
                onPress={() => update({ favoriteStaffId: member.id })}
              />
            </View>
          ))}
        </Card>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Preferred payment" compact />
        <PaymentMethodPicker value={preferences.paymentMethod} onChange={(paymentMethod) => update({ paymentMethod })} />
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Appointment reminders" compact />
        <SegmentedControl options={REMINDER_OPTIONS} value={preferences.reminder} onChange={(reminder) => update({ reminder })} />
        <Card padding="sm">
          <ListItem
            title="Offers & festive deals"
            subtitle="Get notified about new promotions"
            leftIcon="gift-outline"
            leftIconTone="accent"
            right={
              <Switch
                value={preferences.offerAlerts}
                onValueChange={(offerAlerts) => update({ offerAlerts })}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
              />
            }
          />
        </Card>
        <Text variant="caption" tone="muted">
          Reminders are not sent yet; this saves your preference for when they are.
        </Text>
      </View>
    </Screen>
  );
};
