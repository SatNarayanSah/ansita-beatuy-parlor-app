import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, Icon, QueryState, Screen, SectionHeader, SkeletonCard, Text, useToast } from '@/components/ui';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, enrollmentService } from '@/services';
import { selectCurrentUser, useAuthStore, useCourseStore } from '@/store';
import { useTheme } from '@/theme';
import type { ID } from '@/types';
import { formatShortDate, formatTimeRange } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';

type Props = RootStackScreenProps<'Enroll'>;

/** Pick a batch and reserve a seat. The fee is paid at the front desk. */
export const EnrollScreen = ({ navigation, route }: Props) => {
  const { colors, spacing, radius } = useTheme();
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const { courseId } = route.params;
  const [batchId, setBatchId] = useState<ID | null>(route.params.batchId ?? null);
  const enroll = useAsyncAction(enrollmentService.enroll);

  const query = useServiceQuery(
    async () => {
      const [course, availability] = await Promise.all([courseService.getCourse(courseId), courseService.getBatchAvailability(courseId)]);
      return { course, open: availability.filter((item) => item.isOpen) };
    },
    [courseId],
    { refetchOn: [useCourseStore] },
  );

  // Preselect the soonest open batch.
  useEffect(() => {
    if (!batchId && query.data?.open[0]) setBatchId(query.data.open[0].batch.id);
  }, [batchId, query.data]);

  const confirm = async (): Promise<void> => {
    if (!user?.customerId || !batchId) return;
    const enrollment = await enroll.run({ studentId: user.customerId, courseId, batchId });
    if (enrollment) {
      toast.success('Seat reserved! See you in class.');
      navigation.popTo('CustomerTabs', { screen: 'Courses', params: { view: 'mine' } });
    }
  };

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState
        query={query}
        skeleton={<SkeletonCard />}
        isEmpty={(data) => data.open.length === 0}
        empty={{ icon: 'calendar-clear-outline', title: 'No open batches', message: 'All batches are full or finished. Check back soon.' }}
      >
        {({ course, open }) => (
          <View style={{ gap: spacing.xl }}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="h2">{course.title}</Text>
              <Text variant="bodySmall" tone="secondary">
                {course.duration} · {formatEnumLabel(course.level)}
              </Text>
            </View>

            <View style={{ gap: spacing.md }}>
              <SectionHeader title="Choose a batch" compact />
              {open.map(({ batch, seatsLeft }) => {
                const selected = batch.id === batchId;
                return (
                  <Pressable
                    key={batch.id}
                    onPress={() => setBatchId(batch.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.batch,
                      {
                        borderRadius: radius.lg,
                        padding: spacing.lg,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primarySoft : colors.surface,
                      },
                    ]}
                  >
                    <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textMuted} />
                    <View style={styles.flex}>
                      <Text variant="h4">{batch.name}</Text>
                      <Text variant="bodySmall" tone="secondary">
                        {formatShortDate(batch.startDate)} - {formatShortDate(batch.endDate)}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {batch.days.map(formatEnumLabel).join(', ')} · {formatTimeRange(batch.startTime, batch.endTime)}
                      </Text>
                    </View>
                    <Badge label={`${seatsLeft} left`} tone={seatsLeft <= 3 ? 'warning' : 'success'} size="sm" />
                  </Pressable>
                );
              })}
            </View>

            <Card style={{ gap: spacing.md }}>
              <View style={styles.line}>
                <Text variant="bodyMedium" style={styles.flex}>
                  Course fee
                </Text>
                <Text variant="h3" tone="primary">
                  {formatCurrency(course.fee)}
                </Text>
              </View>
              <Divider />
              {[
                { icon: 'storefront-outline' as const, text: 'Pay at the front desk in cash, eSewa or Khalti. Instalments are welcome.' },
                { icon: 'time-outline' as const, text: 'Your seat is reserved now. Paying any amount confirms it.' },
                { icon: 'ribbon-outline' as const, text: course.certificate ? 'Certificate on completion with 80% attendance.' : 'Hands-on workshop, no certificate.' },
              ].map((item) => (
                <View key={item.icon} style={styles.line}>
                  <Icon name={item.icon} size={18} color={colors.primary} />
                  <Text variant="bodySmall" tone="secondary" style={styles.flex}>
                    {item.text}
                  </Text>
                </View>
              ))}
            </Card>

            {enroll.error ? (
              <Text variant="bodySmall" tone="danger">
                {enroll.error}
              </Text>
            ) : null}
            <Button title="Reserve my seat" size="lg" leftIcon="checkmark-circle-outline" disabled={!batchId} loading={enroll.loading} onPress={() => void confirm()} fullWidth />
          </View>
        )}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  batch: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
