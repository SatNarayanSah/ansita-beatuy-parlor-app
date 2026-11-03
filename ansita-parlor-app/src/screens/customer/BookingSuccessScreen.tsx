import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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

import { appointmentOfferLabel } from '@/components/customer/OfferCarousel';
import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { Button, Card, Icon, QueryState, Skeleton, StatusPill, Text, useToast } from '@/components/ui';
import { serviceNames, useServiceMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService } from '@/services';
import { selectDiscountTotal } from '@/store';
import { useTheme } from '@/theme';
import { formatDisplayDate, formatTimeRange } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { haptics } from '@/utils/haptics';

type Props = RootStackScreenProps<'BookingSuccess'>;

const SPARKLES = [0, 60, 120, 180, 240, 300];

const Sparkle = ({ angle, burst }: { angle: number; burst: SharedValue<number> }) => {
  const { colors } = useTheme();
  const rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => ({
    opacity: burst.value < 0.85 ? burst.value : (1 - burst.value) * 6,
    transform: [{ translateX: Math.cos(rad) * 66 * burst.value }, { translateY: Math.sin(rad) * 66 * burst.value }, { scale: burst.value }],
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
  const t = useT();
  const services = useServiceMap();
  const staff = useStaffMap();
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const query = useServiceQuery(() => appointmentService.getAppointment(route.params.appointmentId), [route.params.appointmentId]);

  const check = useSharedValue(0);
  const ring = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    haptics.success();
    check.set(withSpring(1, { damping: 9, stiffness: 140 }));
    ring.set(withDelay(120, withTiming(1, { duration: 700 })));
    burst.set(withDelay(200, withTiming(1, { duration: 900 })));
  }, [check, ring, burst]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: check.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 1 + ring.value * 0.8 }] }));

  const addToCalendar = (): void => {
    setAddedToCalendar(true);
    toast.success(t('success.calendarToast'));
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Scrolls on short screens / large text instead of clipping the buttons. */}
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.xl }]} bounces={false}>
        <View style={styles.hero}>
          <Animated.View style={[styles.ring, { borderColor: colors.success }, ringStyle]} />
          {SPARKLES.map((angle) => (
            <Sparkle key={angle} angle={angle} burst={burst} />
          ))}
          <Animated.View style={[styles.check, { backgroundColor: colors.success }, checkStyle]}>
            <Icon name="checkmark" size={48} color={colors.textInverse} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={{ gap: spacing.sm }}>
          <Text variant="h1" align="center">
            {t('success.title')}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            {t('success.message')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <QueryState query={query} skeleton={<Skeleton height={140} radius={16} />}>
            {(appointment) => (
              <Card style={{ gap: spacing.sm }}>
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
                  ...(appointment.offerDiscount > 0
                    ? [{ icon: 'pricetag-outline' as const, text: `${appointmentOfferLabel(t, appointment)} −${formatCurrency(appointment.offerDiscount)}` }]
                    : []),
                  {
                    icon: 'wallet-outline' as const,
                    text: `${formatCurrency(Math.max(0, appointment.totalPrice - selectDiscountTotal(appointment)))}${appointment.preferredPaymentMethod ? ` · ${t('success.payBy', { method: PAYMENT_METHOD_META[appointment.preferredPaymentMethod].label })}` : ''}`,
                  },
                ].map((item) => (
                  <View key={item.icon} style={styles.row}>
                    <Icon name={item.icon} size={18} color={colors.primary} />
                    <Text variant="bodyMedium" style={styles.flex}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </Card>
            )}
          </QueryState>
        </Animated.View>

        <View style={[styles.actions, { gap: spacing.sm }]}>
          <Button
            title={addedToCalendar ? t('success.addedToCalendar') : t('success.addToCalendar')}
            leftIcon={addedToCalendar ? 'checkmark-circle' : 'calendar-number-outline'}
            variant="secondary"
            disabled={addedToCalendar}
            onPress={addToCalendar}
            fullWidth
          />
          <Button
            title={t('success.viewBookings')}
            onPress={() => navigation.popTo('CustomerTabs', { screen: 'MyAppointments', params: { tab: 'upcoming' } })}
            fullWidth
          />
          <Button title={t('success.backHome')} variant="ghost" onPress={() => navigation.popTo('CustomerTabs', { screen: 'Home' })} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
  hero: { alignSelf: 'center', width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 3 },
  check: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  actions: {},
});
