import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import {
  Button,
  Card,
  ConfirmDialog,
  Icon,
  ListItem,
  Screen,
  SectionHeader,
  Text,
  useToast,
} from '@/components/ui';
import { DEMO_ACCOUNTS } from '@/data/users';
import { useApiConfig } from '@/hooks/useApiConfig';
import {
  appointmentService,
  authService,
  catalogService,
  configureApi,
  courseService,
  demoService,
  getErrorMessage,
  notificationService,
  offerService,
} from '@/services';
import {
  selectCurrentUser,
  selectStatusCounts,
  useAppointmentStore,
  useAuthStore,
  useCourseStore,
  useCustomerStore,
  useNotificationStore,
  useOfferStore,
  useReviewStore,
  useServiceStore,
  useStaffStore,
} from '@/store';
import type { RootStackScreenProps } from '@/navigation/types';
import { useTheme } from '@/theme';
import { todayISO } from '@/utils/date';
import { formatEnumLabel } from '@/utils/format';

interface SmokeStep {
  label: string;
  ok: boolean;
  detail: string;
  ms: number;
}

type Props = RootStackScreenProps<'DemoData'>;

/**
 * Demo tools, reached from Settings: record counts, fake-API settings, a
 * read-only service smoke test and a data reset.
 */
export const DemoDataScreen = (_props: Props) => {
  const { colors } = useTheme();
  const toast = useToast();
  const apiConfig = useApiConfig();
  const currentUser = useAuthStore(selectCurrentUser);
  const usersCount = useAuthStore((state) => state.users.length);
  const customersCount = useCustomerStore((state) => state.customers.length);
  const servicesCount = useServiceStore((state) => state.services.length);
  const categoriesCount = useServiceStore((state) => state.categories.length);
  const staffCount = useStaffStore((state) => state.staff.length);
  const appointments = useAppointmentStore((state) => state.appointments);
  const coursesCount = useCourseStore((state) => state.courses.length);
  const enrollmentsCount = useCourseStore((state) => state.enrollments.length);
  const notificationsCount = useNotificationStore((state) => state.notifications.length);
  const reviewsCount = useReviewStore((state) => state.reviews.length);
  const offersCount = useOfferStore((state) => state.offers.length);

  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<SmokeStep[]>([]);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const statusCounts = selectStatusCounts(appointments);
  const counts: [string, number][] = [
    ['Users', usersCount],
    ['Customers', customersCount],
    ['Categories', categoriesCount],
    ['Services', servicesCount],
    ['Staff', staffCount],
    ['Appointments', appointments.length],
    ['Courses', coursesCount],
    ['Enrollments', enrollmentsCount],
    ['Notifications', notificationsCount],
    ['Reviews', reviewsCount],
    ['Offers', offersCount],
  ];

  const runSmokeTest = async (): Promise<void> => {
    setRunning(true);
    setSteps([]);
    const results: SmokeStep[] = [];
    const step = async (label: string, call: () => Promise<string>): Promise<void> => {
      const started = Date.now();
      try {
        const detail = await call();
        results.push({ label, ok: true, detail, ms: Date.now() - started });
      } catch (error) {
        results.push({ label, ok: false, detail: getErrorMessage(error), ms: Date.now() - started });
      }
      setSteps([...results]);
    };

    await step('Login with wrong password', async () => {
      try {
        await authService.login({ email: DEMO_ACCOUNTS.admin.email, password: 'wrong' });
        throw new Error('Expected an UNAUTHORIZED error');
      } catch (error) {
        return `Rejected as expected: ${getErrorMessage(error)}`;
      }
    });
    await step('Current session', async () => {
      const user = await authService.getCurrentUser();
      return user ? `${user.name} (${user.role})` : 'Not signed in';
    });
    await step("Today's appointments", async () => {
      const list = await appointmentService.listAppointments({ date: todayISO() });
      return `${list.length} booked today`;
    });
    await step('Active services', async () => {
      const list = await catalogService.listServices({ activeOnly: true });
      return `${list.length} active`;
    });
    await step('Batch seats', async () => {
      const courses = await courseService.listCourses();
      const first = courses[0];
      if (!first) return 'No courses';
      const batches = await courseService.getBatchAvailability(first.id);
      return `${first.title}: ${batches.map((b) => `${b.batch.name} ${b.seatsLeft} left`).join(', ')}`;
    });
    await step('Unread notifications', async () => `${await notificationService.getUnreadCount()} unread`);
    await step('Offers visible to you', async () => `${(await offerService.listOffers()).length} offers`);

    setRunning(false);
  };


  const resetData = async (): Promise<void> => {
    setResetting(true);
    await demoService.resetDemoData();
    setResetting(false);
    setResetOpen(false);
    setSteps([]);
    toast.success('Demo data restored');
  };

  return (
    <Screen>

      <Card>
        <SectionHeader title="Records in local storage" compact />
        <View style={styles.grid}>
          {counts.map(([label, value]) => (
            <View key={label} style={styles.stat}>
              <Text variant="h2" tone="primary">
                {value}
              </Text>
              <Text variant="caption" tone="secondary">
                {label}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="caption" tone="secondary">
          {Object.entries(statusCounts)
            .map(([status, count]) => `${formatEnumLabel(status)}: ${count}`)
            .join('  ·  ')}
        </Text>
      </Card>

      <Card style={styles.cardGap}>
        <SectionHeader
          title="Fake API"
          subtitle={`Latency ${apiConfig.minLatencyMs}-${apiConfig.maxLatencyMs} ms per request`}
          compact
        />
        <ListItem
          title="Simulate network errors"
          subtitle={`${Math.round(apiConfig.errorRate * 100)}% of requests fail when on`}
          compact
          right={
            <Switch
              value={apiConfig.simulateErrors}
              onValueChange={(simulateErrors) => {
                configureApi({ simulateErrors });
              }}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
            />
          }
        />
      </Card>

      <Card style={styles.cardGap}>
        <SectionHeader title="Service smoke test" compact />
        <Button title="Run test" leftIcon="play" loading={running} onPress={() => void runSmokeTest()} fullWidth />
        {steps.map((item) => (
          <View key={item.label} style={styles.step}>
            <Icon
              name={item.ok ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={item.ok ? colors.success : colors.danger}
            />
            <View style={styles.stepText}>
              <Text variant="bodyMedium">
                {item.label}{' '}
                <Text variant="caption" tone="muted">
                  ({item.ms} ms)
                </Text>
              </Text>
              <Text variant="caption" tone="secondary">
                {item.detail}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Button title="Reset demo data" variant="outline" leftIcon="refresh" onPress={() => setResetOpen(true)} fullWidth />

      <ConfirmDialog
        visible={resetOpen}
        tone="danger"
        icon="refresh"
        title="Reset demo data?"
        message="All changes are discarded and fresh sample data is generated around today's date. Your theme setting is kept."
        confirmLabel="Reset"
        loading={resetting}
        onConfirm={() => void resetData()}
        onCancel={() => setResetOpen(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, marginVertical: 12 },
  stat: { width: '33.33%' },
  cardGap: { gap: 12 },
  step: { flexDirection: 'row', gap: 8 },
  stepText: { flex: 1 },
});
