import { View } from 'react-native';

import { EnrollmentCard } from '@/components/customer/EnrollmentCard';
import { ListScreen, SkeletonCard } from '@/components/ui';
import { useCourseMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { enrollmentService, paymentRequestService } from '@/services';
import {
  selectFeeDue,
  selectPaymentRequestMethods,
  selectPendingTotal,
  useBusinessStore,
  useCourseStore,
  useNotificationStore,
  usePaymentRequestStore,
} from '@/store';
import { useTheme } from '@/theme';
import type { ID, PaymentRequest } from '@/types';

type Props = RootStackScreenProps<'MyCourses'>;

/** The customer's course enrollments: fee and attendance progress, and "I've paid" for fee balances. */
export const MyCoursesScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const courses = useCourseMap();
  // Cash is always offered while requests are on, so this only needs the master switch.
  const canSendPayment = useBusinessStore((state) => selectPaymentRequestMethods(state.payments).length > 0);

  const query = useServiceQuery(
    async () => {
      const [enrollments, requests] = await Promise.all([
        enrollmentService.listEnrollments(),
        // Optional extra: the enrollments still show if this fails.
        paymentRequestService.listRequests({ targetType: 'enrollment' }).catch((): PaymentRequest[] => []),
      ]);
      const byEnrollment = new Map<ID, PaymentRequest[]>();
      for (const request of requests) byEnrollment.set(request.targetId, [...(byEnrollment.get(request.targetId) ?? []), request]);
      // Current courses first, dropped ones last.
      const ordered = [...enrollments].sort((a, b) => Number(a.status === 'dropped') - Number(b.status === 'dropped') || b.createdAt.localeCompare(a.createdAt));
      return { enrollments: ordered, requests: byEnrollment };
    },
    [],
    // New notifications include a fee payment being confirmed or not.
    { refetchOn: [useCourseStore, usePaymentRequestStore, useNotificationStore] },
  );

  return (
    <ListScreen
      query={query}
      items={query.data?.enrollments ?? []}
      keyExtractor={(enrollment) => enrollment.id}
      renderItem={(enrollment) => {
        const requests = query.data?.requests.get(enrollment.id);
        const room = selectFeeDue(enrollment) - selectPendingTotal(requests ?? [], enrollment.id);
        return (
          <EnrollmentCard
            enrollment={enrollment}
            course={courses.get(enrollment.courseId)}
            paymentRequests={requests}
            onPaid={
              canSendPayment && enrollment.status !== 'dropped' && room > 0
                ? () => navigation.navigate('SendPayment', { targetType: 'enrollment', targetId: enrollment.id })
                : undefined
            }
          />
        );
      }}
      skeleton={
        <View style={{ gap: spacing.md }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      }
      empty={{ icon: 'school-outline', title: 'No courses yet', message: 'Courses you join at the parlour show here with fees and attendance.' }}
    />
  );
};
