import { ComingSoon } from '@/components/layout/ComingSoon';
import { Screen } from '@/components/ui';
import type { CustomerTabScreenProps } from '@/navigation/types';

/** Routed customer tabs whose full screens are built in later phases. */

export const BookScreen = (_props: CustomerTabScreenProps<'Book'>) => (
  <Screen>
    <ComingSoon
      icon="sparkles-outline"
      title="Book a service"
      phase="Phase 8"
      description="Book your next visit in four quick steps."
      features={['Browse services by category', 'Pick your favourite stylist', 'Choose a date and a free time slot', 'Apply an offer code and confirm']}
    />
  </Screen>
);

export const MyAppointmentsScreen = (_props: CustomerTabScreenProps<'MyAppointments'>) => (
  <Screen>
    <ComingSoon
      icon="calendar-outline"
      title="My appointments"
      phase="Phase 8"
      description="All your bookings, past and upcoming."
      features={['Upcoming and past bookings', 'Reschedule or cancel', 'Payment receipts', 'Rate and review your visit']}
    />
  </Screen>
);

export const CoursesScreen = (_props: CustomerTabScreenProps<'Courses'>) => (
  <Screen>
    <ComingSoon
      icon="school-outline"
      title="Beauty courses"
      phase="Phase 9"
      description="Learn from Ansita's expert trainers."
      features={['Course details, syllabus and fees', 'Batch dates and seats left', 'Enroll and pay fees in instalments', 'Track attendance and certificates']}
    />
  </Screen>
);
