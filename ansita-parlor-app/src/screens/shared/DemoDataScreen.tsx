import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
  ThemeModeSelector,
  useToast,
} from '@/components/ui';

import { useApiConfig } from '@/hooks/useApiConfig';
import {
  appointmentService,
  authService,
  catalogService,
  configureApi,
  courseService,
  getErrorMessage,
  notificationService,
} from '@/services';
import {
  resetAllStores,
  selectCurrentUser,
  selectStatusCounts,
  useAppointmentStore,
  useAuthStore,
  useCourseStore,
  useCustomerStore,
  useNotificationStore,
  useReviewStore,
  useServiceStore,
  useStaffStore,
} from '@/store';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useTheme } from '@/theme';
import { todayISO } from '@/utils/date';
import { formatEnumLabel } from '@/utils/format';

interface SmokeStep {
  label: string;
  ok: boolean;
  detail: string;
  ms: number;
}

/**
 * Demo controls: record counts, fake-API settings, a service smoke test and a
 * data reset. Shown at launch in Phase 1; later reachable from admin settings.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'DemoData'>;

export const DemoDataScreen = ({ navigation }: Props) => {
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

  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<SmokeStep[]>([]);
  const [resetOpen, setResetOpen] = useState(false);

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
        await authService.login({ email: 'admin@ansita.in', password: 'wrong' });
        throw new Error('Expected an UNAUTHORIZED error');
      } catch (error) {
        return `Rejected as expected: ${getErrorMessage(error)}`;
      }
    });
    await step('Login as admin', async () => {
      const user = await authService.login({ email: 'admin@ansita.in', password: 'admin123' });
      return `${user.name} (${user.role})`;
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
    await step('Logout', async () => {
      await authService.logout();
      return 'Session cleared';
    });

    setRunning(false);
  };


  const resetData = (): void => {
    resetAllStores({ keepSession: true });
    setSteps([]);
    setResetOpen(false);
    toast.success('Demo data restored');
  };

  return (
    <Screen>
      <Text variant="bodySmall" tone="secondary">
        Signed in as: {currentUser ? `${currentUser.name} (${currentUser.role})` : 'nobody'}
      </Text>

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
        <SectionHeader title="Appearance" compact />
        <ThemeModeSelector />
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

      {__DEV__ ? (
        <Card padding="sm">
          <ListItem
            title="UI Kit showcase"
            subtitle="Every component, for visual checks (dev only)"
            leftIcon="color-palette-outline"
            leftIconTone="accent"
            showChevron
            onPress={() => navigation.navigate('UIKitShowcase')}
          />
        </Card>
      ) : null}

      <Button title="Reset demo data" variant="outline" leftIcon="refresh" onPress={() => setResetOpen(true)} fullWidth />

      <ConfirmDialog
        visible={resetOpen}
        tone="danger"
        icon="refresh"
        title="Reset demo data?"
        message="All changes are discarded and the original sample data is restored."
        confirmLabel="Reset"
        onConfirm={resetData}
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
