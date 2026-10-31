import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/ui';
import type { AdminTabScreenProps } from '@/navigation/types';

/** Routed admin tabs whose full screens are built in later phases. */

export const AppointmentsScreen = (_props: AdminTabScreenProps<'Appointments'>) => (
  <Screen>
    <ComingSoon
      icon="calendar-outline"
      title="Appointments"
      phase="a later phase"
      description="Run the day's bookings from one screen."
      features={['Day and week calendar by staff member', 'Confirm, complete, cancel or mark no-show', 'Walk-in booking with conflict checks', 'Take full or partial payments']}
    />
  </Screen>
);

export const CustomersScreen = (_props: AdminTabScreenProps<'Customers'>) => (
  <Screen>
    <ComingSoon
      icon="people-outline"
      title="Customers"
      phase="a later phase"
      description="Everything about your clients in one place."
      features={['Search and filter by VIP, Bridal, Regular, New', 'Visit history, spend and loyalty points', 'Notes, allergies and preferences', 'Call or message in one tap']}
    />
  </Screen>
);

export const TrainingScreen = (_props: AdminTabScreenProps<'Training'>) => (
  <Screen>
    <ComingSoon
      icon="school-outline"
      title="Training centre"
      phase="a later phase"
      description="Manage courses, batches and students."
      features={['Courses, syllabus and batch schedules', 'Seat availability per batch', 'Attendance and fee tracking', 'Issue completion certificates']}
    />
  </Screen>
);
