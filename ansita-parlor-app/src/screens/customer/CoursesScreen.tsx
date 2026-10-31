import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CourseCard } from '@/components/customer/CourseCards';
import { EnrollmentCard } from '@/components/customer/EnrollmentCard';
import { Appear, QueryState, Screen, SegmentedControl, SkeletonCard, type SegmentOption } from '@/components/ui';
import { useCourseMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { CoursesView, CustomerTabScreenProps } from '@/navigation/types';
import { courseService, enrollmentService } from '@/services';
import { useCourseStore } from '@/store';
import { useTheme } from '@/theme';

type Props = CustomerTabScreenProps<'Courses'>;

const ListSkeleton = () => {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
};

/** Training courses on offer, and the customer's own enrollments. */
export const CoursesScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const t = useT();
  const staff = useStaffMap();
  const courseMap = useCourseMap();
  const [view, setView] = useState<CoursesView>(route.params?.view ?? 'all');

  useEffect(() => {
    if (route.params?.view) setView(route.params.view);
  }, [route.params?.view]);

  const courses = useServiceQuery(
    async () => {
      const list = await courseService.listCourses({ activeOnly: true });
      const availability = await Promise.all(list.map((course) => courseService.getBatchAvailability(course.id)));
      return list.map((course, index) => ({ course, availability: availability[index] ?? [] }));
    },
    [],
    { refetchOn: [useCourseStore] },
  );
  const enrollments = useServiceQuery(() => enrollmentService.listEnrollments(), [], { refetchOn: [useCourseStore] });

  const options: SegmentOption<CoursesView>[] = [
    { value: 'all', label: t('courses.all'), icon: 'school-outline' },
    { value: 'mine', label: `${t('courses.mine')}${enrollments.data ? ` (${enrollments.data.length})` : ''}`, icon: 'ribbon-outline' },
  ];
  const active = view === 'all' ? courses : enrollments;

  return (
    <Screen refreshing={active.refreshing} onRefresh={() => void active.refetch()}>
      <SegmentedControl options={options} value={view} onChange={setView} />

      {view === 'all' ? (
        <QueryState
          query={courses}
          skeleton={<ListSkeleton />}
          isEmpty={(list) => list.length === 0}
          empty={{ icon: 'school-outline', title: 'No courses right now', message: 'New batches are announced every season.' }}
        >
          {(list) => (
            <View style={{ gap: spacing.md }}>
              {list.map(({ course, availability }, index) => (
                <Appear key={course.id} index={index}>
                  <CourseCard
                    course={course}
                    availability={availability}
                    instructorName={staff.get(course.instructor)?.name}
                    onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
                  />
                </Appear>
              ))}
            </View>
          )}
        </QueryState>
      ) : (
        <QueryState
          query={enrollments}
          skeleton={<ListSkeleton />}
          isEmpty={(list) => list.length === 0}
          empty={{
            icon: 'ribbon-outline',
            title: 'No enrollments yet',
            message: 'Learn a new skill with our certified courses.',
            actionLabel: 'Browse courses',
            onAction: () => setView('all'),
          }}
        >
          {(list) => (
            <View style={{ gap: spacing.md }}>
              {list.map((enrollment, index) => (
                <Appear key={enrollment.id} index={index}>
                  <EnrollmentCard
                    enrollment={enrollment}
                    course={courseMap.get(enrollment.courseId)}
                    onPress={() => navigation.navigate('CourseDetail', { courseId: enrollment.courseId })}
                  />
                </Appear>
              ))}
            </View>
          )}
        </QueryState>
      )}
    </Screen>
  );
};
