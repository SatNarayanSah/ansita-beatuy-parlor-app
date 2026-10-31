import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Card, Divider, Icon, Screen, SectionHeader, Text, useToast } from '@/components/ui';
import type { RootStackScreenProps } from '@/navigation/types';
import { useBusinessStore } from '@/store';
import { useTheme } from '@/theme';
import { formatShortDate, formatTime12, todayISO } from '@/utils/date';
import { formatPhone } from '@/utils/phone';

type Props = RootStackScreenProps<'HelpContact'>;

/** Map pin for the demo address. Contact details come from the business profile in admin Settings. */
const MAP_PIN = { latitude: 27.6915, longitude: 85.342 };

const FAQS = [
  { q: 'How do I cancel or reschedule?', a: 'Open Bookings, choose the appointment and tap Reschedule or Cancel. There is no fee for changes made before your visit.' },
  { q: 'Do I need to pay in advance?', a: 'Not for regular services. Bridal and engagement bookings need a 30-50% advance to hold the date.' },
  { q: 'How do loyalty points work?', a: 'You earn points on every completed visit; see Profile → Loyalty history for the current rate. Ask at the front desk to redeem them.' },
  { q: 'Which payment methods do you accept?', a: 'Cash, eSewa, Khalti, Fonepay QR and cards at the parlour.' },
  { q: 'Can I bring my own products?', a: 'Yes. Tell your stylist when you book so they can do a patch test first.' },
];

const mapsUrl = (name: string, address: string): string => {
  const { latitude, longitude } = MAP_PIN;
  const label = encodeURIComponent(`${name}, ${address}`);
  if (Platform.OS === 'ios') return `maps:0,0?q=${label}@${latitude},${longitude}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${latitude},${longitude}(${label})`;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
};

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[styles.faqHead, { paddingVertical: spacing.md }]}
      >
        <Text variant="bodyMedium" style={styles.flex}>
          {q}
        </Text>
        <Icon name={open ? 'remove' : 'add'} size={18} color={colors.primary} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn} style={{ paddingBottom: spacing.md }}>
          <Text variant="bodySmall" tone="secondary">
            {a}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

export const HelpContactScreen = (_props: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const profile = useBusinessStore((state) => state.profile);
  const holidays = useBusinessStore((state) => state.holidays);
  const nextHoliday = holidays.find((holiday) => holiday.date >= todayISO());

  const open = (url: string, fallback: string) => () => {
    Linking.openURL(url).catch(() => toast.error(fallback));
  };

  return (
    <Screen gap="xl">
      <Card style={{ gap: spacing.md }}>
        <Text variant="h3">We're here to help</Text>
        <Text variant="bodySmall" tone="secondary">
          Call us, message on WhatsApp or drop by the parlour.
        </Text>
        <View style={styles.actions}>
          <Button title="Call" leftIcon="call-outline" onPress={open(`tel:${profile.phone}`, 'Calling is not available on this device.')} style={styles.flex} fullWidth />
          <Button
            title="WhatsApp"
            leftIcon="logo-whatsapp"
            variant="secondary"
            onPress={open(`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`, 'Could not open WhatsApp.')}
            style={styles.flex}
            fullWidth
          />
        </View>
        <Button title="Get directions" leftIcon="navigate-outline" variant="outline" onPress={open(mapsUrl(profile.name, profile.address), 'Could not open maps.')} fullWidth />
      </Card>

      <Card padding="md" style={{ gap: spacing.sm }}>
        {[
          { icon: 'location-outline' as const, label: profile.address },
          { icon: 'call-outline' as const, label: formatPhone(profile.phone) },
          { icon: 'mail-outline' as const, label: profile.email },
          { icon: 'time-outline' as const, label: `Open daily ${formatTime12(profile.openTime)} - ${formatTime12(profile.closeTime)}` },
          ...(nextHoliday ? [{ icon: 'calendar-outline' as const, label: `Closed ${formatShortDate(nextHoliday.date)} · ${nextHoliday.name}` }] : []),
        ].map((item) => (
          <View key={item.icon} style={styles.info}>
            <Icon name={item.icon} size={18} color={colors.primary} />
            <Text variant="bodySmall" style={styles.flex}>
              {item.label}
            </Text>
          </View>
        ))}
      </Card>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Frequently asked" compact />
        <Card padding="md">
          {FAQS.map((faq, index) => (
            <View key={faq.q}>
              {index > 0 ? <Divider /> : null}
              <FaqItem q={faq.q} a={faq.a} />
            </View>
          ))}
        </Card>
      </View>

      <Text variant="caption" tone="muted" align="center">
        Demo contact details. Admins can change them in Settings → Business profile.
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: 12 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
