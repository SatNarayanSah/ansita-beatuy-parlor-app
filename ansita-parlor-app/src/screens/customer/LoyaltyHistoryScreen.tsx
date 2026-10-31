import { StyleSheet, View } from 'react-native';

import { Card, Divider, Icon, ProgressBar, QueryState, Screen, SectionHeader, SkeletonCard, SkeletonListItem, Text } from '@/components/ui';
import { serviceNames, useServiceMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, customerService } from '@/services';
import { selectCurrentUser, selectPointsFor, useAppointmentStore, useAuthStore, useBusinessStore, useCustomerStore } from '@/store';
import { useTheme } from '@/theme';
import { formatShortDate } from '@/utils/date';
import { formatNumber } from '@/utils/format';

type Props = RootStackScreenProps<'LoyaltyHistory'>;

const TIERS = [
  { name: 'Silver', min: 0 },
  { name: 'Gold', min: 500 },
  { name: 'Platinum', min: 1000 },
] as const;

const tierFor = (points: number) => {
  const index = TIERS.findLastIndex((tier) => points >= tier.min);
  return { current: TIERS[index] ?? TIERS[0], next: TIERS[index + 1] };
};

/**
 * Points earned per completed visit. Points from before the app's records
 * (and any bonuses) show as a single "Earlier visits & bonuses" line.
 */
export const LoyaltyHistoryScreen = (_props: Props) => {
  const { colors, spacing, radius } = useTheme();
  const services = useServiceMap();
  const user = useAuthStore(selectCurrentUser);
  const customerId = user?.customerId ?? '';
  // Same rule appointmentService applies when a visit is completed.
  const loyalty = useBusinessStore((state) => state.loyalty);

  const query = useServiceQuery(
    async () => {
      const [customer, appointments] = await Promise.all([
        customerService.getCustomer(customerId),
        appointmentService.listAppointments({ status: 'completed' }),
      ]);
      // Newest first.
      const entries = [...appointments].reverse().map((appointment) => ({
        appointment,
        points: selectPointsFor(loyalty, appointment.totalPrice),
      }));
      const earnedHere = entries.reduce((sum, entry) => sum + entry.points, 0);
      return { customer, entries, earlier: Math.max(0, customer.loyaltyPoints - earnedHere) };
    },
    [customerId, loyalty],
    { refetchOn: [useCustomerStore, useAppointmentStore] },
  );

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.md }}>
            <SkeletonCard />
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        }
      >
        {({ customer, entries, earlier }) => {
          const { current, next } = tierFor(customer.loyaltyPoints);
          return (
            <View style={{ gap: spacing.xl }}>
              <View style={[styles.hero, { backgroundColor: colors.accent, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm }]}>
                <View style={styles.row}>
                  <Icon name="diamond" size={22} color={colors.highlight} />
                  <Text variant="overline" color={colors.onAccent}>
                    {current.name} member
                  </Text>
                </View>
                <Text variant="display" color={colors.onAccent}>
                  {formatNumber(customer.loyaltyPoints)} pts
                </Text>
                {next ? (
                  <>
                    <ProgressBar value={(customer.loyaltyPoints - current.min) / (next.min - current.min)} tone="highlight" />
                    <Text variant="caption" color={colors.onAccent}>
                      {formatNumber(next.min - customer.loyaltyPoints)} points to {next.name}
                    </Text>
                  </>
                ) : (
                  <Text variant="caption" color={colors.onAccent}>
                    You’re at our highest tier. Thank you!
                  </Text>
                )}
              </View>

              <Card variant="filled" style={{ gap: spacing.xs }}>
                <Text variant="label">How it works</Text>
                <Text variant="bodySmall" tone="secondary">
                  {loyalty.enabled
                    ? `Earn 1 point for every Rs. ${loyalty.rupeesPerPoint} spent on completed visits. Each point is worth Rs. ${loyalty.pointValue} at the front desk.`
                    : 'The loyalty programme is paused. Points you have already earned stay on your account.'}
                </Text>
              </Card>

              <View style={{ gap: spacing.md }}>
                <SectionHeader title="Points history" compact />
                <Card padding="md">
                  {entries.map(({ appointment, points }, index) => (
                    <View key={appointment.id}>
                      {index > 0 ? <Divider spacing="sm" /> : null}
                      <View style={styles.entry}>
                        <View style={[styles.dot, { backgroundColor: colors.successSoft }]}>
                          <Icon name="add" size={16} color={colors.success} />
                        </View>
                        <View style={styles.flex}>
                          <Text variant="bodyMedium" numberOfLines={1}>
                            {serviceNames(appointment.serviceIds, services)}
                          </Text>
                          <Text variant="caption" tone="muted">
                            {formatShortDate(appointment.date)}
                          </Text>
                        </View>
                        <Text variant="label" tone="success">
                          +{points}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {earlier > 0 ? (
                    <View>
                      {entries.length > 0 ? <Divider spacing="sm" /> : null}
                      <View style={styles.entry}>
                        <View style={[styles.dot, { backgroundColor: colors.highlightSoft }]}>
                          <Icon name="time-outline" size={16} color={colors.highlight} />
                        </View>
                        <Text variant="bodyMedium" style={styles.flex}>
                          Earlier visits & bonuses
                        </Text>
                        <Text variant="label" tone="success">
                          +{formatNumber(earlier)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {entries.length === 0 && earlier === 0 ? (
                    <Text variant="bodySmall" tone="muted" align="center">
                      Complete your first visit to start earning.
                    </Text>
                  ) : null}
                </Card>
              </View>
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
