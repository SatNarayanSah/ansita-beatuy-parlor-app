import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { Button, Card, Icon, QueryState, Skeleton, StatusPill, Text, useToast } from '@/components/ui';
import { serviceNames, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService } from '@/services';
import { useTheme } from '@/theme';
import { formatDisplayDate, formatTimeRange } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Props = RootStackScreenProps<'BookingSuccess'>;

const SPARKLES = [0, 60, 120, 180, 240, 300];

const Sparkle = ({ angle, burst }: { angle: number; burst: SharedValue<number> }) => {
  const { colors } = useTheme();
  const rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => ({
    opacity: burst.value < 0.85 ? burst.value : (1 - burst.value) * 6,
    transform: [{ translateX: Math.cos(rad) * 78 * burst.value }, { translateY: Math.sin(rad) * 78 * burst.value }, { scale: burst.value }],
  }));
  return (
    <Animated.View style={[styles.sparkle, style]}>
      <Icon name="sparkles" size={18} color={angle % 120 === 0 ? colors.highlight : colors.primary} />
    </Animated.View>
  );
};

export const BookingSuccessScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const services = useServiceMap();
  const staff = useStaffMap();
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const query = useServiceQuery(() => appointmentService.getAppointment(route.params.appointmentId), [route.params.appointmentId]);

  const check = useSharedValue(0);
  const ring = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    check.value = withSpring(1, { damping: 9, stiffness: 140 });
    ring.value = withDelay(120, withTiming(1, { duration: 700 }));
    burst.value = withDelay(200, withTiming(1, { duration: 900 }));
  }, [check, ring, burst]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: check.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 1 + ring.value * 0.8 }] }));

  const addToCalendar = (): void => {
    setAddedToCalendar(true);
    toast.success('Added to your calendar (demo)');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.content, { padding: spacing.xxl, gap: spacing.xxl }]}>
        <View style={styles.hero}>
          <Animated.View style={[styles.ring, { borderColor: colors.success }, ringStyle]} />
          {SPARKLES.map((angle) => (
            <Sparkle key={angle} angle={angle} burst={burst} />
          ))}
          <Animated.View style={[styles.check, { backgroundColor: colors.success }, checkStyle]}>
            <Icon name="checkmark" size={56} color={colors.textInverse} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ gap: spacing.sm }}>
          <Text variant="h1" align="center">
            Booking requested!
          </Text>
          <Text variant="body" tone="secondary" align="center">
            We'll confirm your appointment shortly. You'll get a notification once it's confirmed.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <QueryState query={query} skeleton={<Skeleton height={140} radius={16} />}>
            {(appointment) => (
              <Card style={{ gap: spacing.md }}>
                <View style={styles.row}>
                  <Text variant="h4" style={styles.flex}>
                    {serviceNames(appointment.serviceIds, services)}
                  </Text>
                  <StatusPill kind="appointment" status={appointment.status} size="sm" />
                </View>
                {[
                  { icon: 'calendar-outline' as const, text: formatDisplayDate(appointment.date) },
                  { icon: 'time-outline' as const, text: formatTimeRange(appointment.startTime, appointment.endTime) },
                  { icon: 'person-outline' as const, text: staff.get(appointment.staffId)?.name ?? '' },
                  {
                    icon: 'wallet-outline' as const,
                    text: `${formatCurrency(appointment.totalPrice)}${appointment.preferredPaymentMethod ? ` · pay by ${PAYMENT_METHOD_META[appointment.preferredPaymentMethod].label}` : ''}`,
                  },
                ].map((item) => (
                  <View key={item.icon} style={styles.row}>
                    <Icon name={item.icon} size={18} color={colors.primary} />
                    <Text variant="bodyMedium">{item.text}</Text>
                  </View>
                ))}
              </Card>
            )}
          </QueryState>
        </Animated.View>

        <View style={[styles.actions, { gap: spacing.sm }]}>
          <Button
            title={addedToCalendar ? 'Added to calendar' : 'Add to calendar'}
            leftIcon={addedToCalendar ? 'checkmark-circle' : 'calendar-number-outline'}
            variant="secondary"
            disabled={addedToCalendar}
            onPress={addToCalendar}
            fullWidth
          />
          <Button
            title="View my bookings"
            onPress={() => navigation.popTo('CustomerTabs', { screen: 'MyAppointments', params: { tab: 'upcoming' } })}
            fullWidth
          />
          <Button title="Back to home" variant="ghost" onPress={() => navigation.popTo('CustomerTabs', { screen: 'Home' })} fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, justifyContent: 'center' },
  hero: { alignSelf: 'center', width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 3 },
  check: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  actions: {},
});
