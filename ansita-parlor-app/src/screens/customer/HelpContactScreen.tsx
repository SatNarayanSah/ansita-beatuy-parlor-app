import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Card, Divider, Icon, Screen, SectionHeader, Text, useToast } from '@/components/ui';
import { PARLOR_HOURS } from '@/data/staff';
import type { RootStackScreenProps } from '@/navigation/types';
import { useTheme } from '@/theme';
import { formatTime12 } from '@/utils/date';

type Props = RootStackScreenProps<'HelpContact'>;

/** Demo contact details for the parlour. */
const PARLOUR = {
  phone: '+97714781234',
  phoneLabel: '01-4781234',
  mobile: '9779841500100',
  email: 'hello@ansita.com',
  address: 'Baneshwor Chowk, Kathmandu 44600',
  latitude: 27.6915,
  longitude: 85.3420,
};

const FAQS = [
  { q: 'How do I cancel or reschedule?', a: 'Open Bookings, choose the appointment and tap Reschedule or Cancel. There is no fee for changes made before your visit.' },
  { q: 'Do I need to pay in advance?', a: 'Not for regular services. Bridal and engagement bookings need a 30-50% advance to hold the date.' },
  { q: 'How do loyalty points work?', a: 'You earn 1 point for every Rs. 100 spent on completed visits. Ask at the front desk to redeem them.' },
  { q: 'Which payment methods do you accept?', a: 'Cash, eSewa, Khalti, Fonepay QR and cards at the parlour.' },
  { q: 'Can I bring my own products?', a: 'Yes. Tell your stylist when you book so they can do a patch test first.' },
];

const mapsUrl = (): string => {
  const { latitude, longitude, address } = PARLOUR;
  const label = encodeURIComponent(`Ansita Beauty Parlour, ${address}`);
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
          <Button title="Call" leftIcon="call-outline" onPress={open(`tel:${PARLOUR.phone}`, 'Calling is not available on this device.')} style={styles.flex} fullWidth />
          <Button
            title="WhatsApp"
            leftIcon="logo-whatsapp"
            variant="secondary"
            onPress={open(`https://wa.me/${PARLOUR.mobile}`, 'Could not open WhatsApp.')}
            style={styles.flex}
            fullWidth
          />
        </View>
        <Button title="Get directions" leftIcon="navigate-outline" variant="outline" onPress={open(mapsUrl(), 'Could not open maps.')} fullWidth />
      </Card>

      <Card padding="md" style={{ gap: spacing.sm }}>
        {[
          { icon: 'location-outline' as const, label: PARLOUR.address },
          { icon: 'call-outline' as const, label: PARLOUR.phoneLabel },
          { icon: 'mail-outline' as const, label: PARLOUR.email },
          { icon: 'time-outline' as const, label: `Open daily ${formatTime12(PARLOR_HOURS.open)} - ${formatTime12(PARLOR_HOURS.close)}` },
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
        Demo contact details. Replace with the parlour's real ones before launch.
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
