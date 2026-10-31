import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GreetingHeader } from '@/components/layout/GreetingHeader';
import { Button, Card, EmptyState, Icon, ListItem, Screen, SectionHeader, StatusPill, Text } from '@/components/ui';
import type { CustomerTabScreenProps } from '@/navigation/types';
import {
  selectAppointmentsByCustomer,
  selectCurrentUser,
  selectLiveOffers,
  selectServicesByIds,
  selectUpcomingAppointments,
  useAppointmentStore,
  useAuthStore,
  useCustomerStore,
  useOfferStore,
  useServiceStore,
  useStaffStore,
} from '@/store';
import { useTheme } from '@/theme';
import { formatRelativeDay, formatTimeRange, todayISO } from '@/utils/date';
import { formatNumber } from '@/utils/format';

type Props = CustomerTabScreenProps<'Home'>;

/** Customer home: next visit, loyalty points and live offers. Fuller content arrives in Phase 8. */
export const HomeScreen = ({ navigation }: Props) => {
  const { colors, spacing, radius } = useTheme();
  const user = useAuthStore(selectCurrentUser);
  const customerId = user?.customerId ?? '';
  const customer = useCustomerStore((state) => state.customers.find((item) => item.id === customerId));
  const appointments = useAppointmentStore((state) => state.appointments);
  const services = useServiceStore((state) => state.services);
  const staff = useStaffStore((state) => state.staff);
  const offers = useOfferStore((state) => state.offers);
  const today = todayISO();

  const next = useMemo(
    () => selectUpcomingAppointments(selectAppointmentsByCustomer(appointments, customerId), today)[0],
    [appointments, customerId, today],
  );
  const liveOffers = useMemo(() => selectLiveOffers(offers, today), [offers, today]);

  if (!user) return null;

  const nextServices = next ? selectServicesByIds(services, next.serviceIds).map((service) => service.name).join(' + ') : '';
  const nextStaff = next ? staff.find((member) => member.id === next.staffId)?.name.split(' ')[0] : undefined;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <GreetingHeader user={user} subtitle="Ready for a little pampering?" />

      <View style={[styles.loyalty, { backgroundColor: colors.accent, borderRadius: radius.xl, padding: spacing.xl }]}>
        <View style={styles.flex}>
          <Text variant="overline" color={colors.onAccent} style={styles.dim}>
            Loyalty points
          </Text>
          <Text variant="display" color={colors.onAccent}>
            {formatNumber(customer?.loyaltyPoints ?? 0)}
          </Text>
          <Text variant="caption" color={colors.onAccent} style={styles.dim}>
            Earn 1 point for every Rs. 100 spent
          </Text>
        </View>
        <Icon name="diamond" size={44} color={colors.highlight} />
      </View>

      <SectionHeader
        title="Your next visit"
        actionLabel="All bookings"
        onAction={() => navigation.navigate('MyAppointments')}
      />
      {next ? (
        <Card padding="sm">
          <ListItem
            title={nextServices}
            subtitle={`${formatRelativeDay(next.date)} · ${formatTimeRange(next.startTime, next.endTime)}`}
            description={nextStaff ? `with ${nextStaff}` : undefined}
            leftIcon="calendar"
            right={<StatusPill kind="appointment" status={next.status} size="sm" />}
            onPress={() => navigation.navigate('MyAppointments')}
          />
        </Card>
      ) : (
        <Card variant="outlined" padding="none">
          <EmptyState
            compact
            icon="calendar-clear-outline"
            title="No upcoming visits"
            message="Treat yourself. Your next booking will show here."
            actionLabel="Book now"
            onAction={() => navigation.navigate('Book')}
          />
        </Card>
      )}

      <Button title="Book an appointment" leftIcon="add-circle-outline" size="lg" onPress={() => navigation.navigate('Book')} fullWidth />

      {liveOffers.length > 0 ? (
        <>
          <SectionHeader title="Offers for you" subtitle={`${liveOffers.length} running now`} />
          {liveOffers.slice(0, 2).map((offer) => (
            <Card key={offer.id} variant="filled" style={{ gap: spacing.xs }}>
              <Text variant="h4">{offer.title}</Text>
              <Text variant="bodySmall" tone="secondary">
                {offer.description}
              </Text>
              {offer.code ? (
                <Text variant="label" tone="primary">
                  Code: {offer.code}
                </Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  loyalty: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  dim: { opacity: 0.85 },
});
