import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PaymentSheet } from '@/components/admin/PaymentSheet';
import { COURSE_TYPE_META } from '@/components/customer/CourseCards';
import {
  Appear,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  FAB,
  FilterChips,
  ProgressBar,
  QueryState,
  Screen,
  SegmentedControl,
  SkeletonCard,
  SkeletonListItem,
  StatusPill,
  Text,
  useToast,
  type FilterOption,
  type SegmentOption,
} from '@/components/ui';
import { useCourseMap, useCustomerMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { AdminTabScreenProps, TrainingView } from '@/navigation/types';
import { courseService, enrollmentService, getErrorMessage } from '@/services';
import { selectFeeDue, useCourseStore } from '@/store';
import { useTheme } from '@/theme';
import type { Enrollment, EnrollmentStatus, PaymentMethod } from '@/types';
import { todayISO } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';

type Props = AdminTabScreenProps<'Training'>;

const VIEWS: readonly SegmentOption<TrainingView>[] = [
  { value: 'courses', label: 'Courses', icon: 'school-outline' },
  { value: 'students', label: 'Students', icon: 'people-outline' },
  { value: 'dues', label: 'Fee dues', icon: 'wallet-outline' },
];

const STATUS_OPTIONS: readonly FilterOption<EnrollmentStatus>[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Fee pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
];

export const TrainingScreen = ({ navigation, route }: Props) => {
  const { colors, radius, spacing } = useTheme();
  const toast = useToast();
  const courseMap = useCourseMap();
  const customers = useCustomerMap();
  const staff = useStaffMap();
  const [view, setView] = useState<TrainingView>(route.params?.view ?? 'courses');
  const [status, setStatus] = useState<EnrollmentStatus | null>(null);
  const [paying, setPaying] = useState<Enrollment | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.view) setView(route.params.view);
  }, [route.params?.view]);

  const query = useServiceQuery(
    async () => {
      const [courses, enrollments] = await Promise.all([courseService.listCourses(), enrollmentService.listEnrollments()]);
      return { courses, enrollments };
    },
    [],
    { refetchOn: [useCourseStore] },
  );

  const dues = useMemo(
    () =>
      (query.data?.enrollments ?? [])
        .filter((e) => e.status !== 'dropped' && selectFeeDue(e) > 0)
        .sort((a, b) => selectFeeDue(b) - selectFeeDue(a)),
    [query.data],
  );
  const totalDue = dues.reduce((sum, e) => sum + selectFeeDue(e), 0);

  const recordFee = async (amount: number, method: PaymentMethod): Promise<void> => {
    if (!paying) return;
    setPayBusy(true);
    setPayError(null);
    try {
      await enrollmentService.recordFeePayment(paying.id, { amount, method });
      toast.success(`${formatCurrency(amount)} recorded`);
      setPaying(null);
    } catch (error) {
      setPayError(getErrorMessage(error));
    } finally {
      setPayBusy(false);
    }
  };

  const enrollmentRow = (enrollment: Enrollment, action?: ReactNode) => {
    const course = courseMap.get(enrollment.courseId);
    const batch = course?.batches.find((b) => b.id === enrollment.batchId);
    const student = customers.get(enrollment.studentId);
    const due = selectFeeDue(enrollment);
    return (
      <Pressable
        key={enrollment.id}
        onPress={() => navigation.navigate('EnrollmentDetail', { enrollmentId: enrollment.id })}
        accessibilityRole="button"
        accessibilityLabel={`${student?.name ?? 'Student'}, ${course?.title ?? ''}`}
        style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }, pressed && styles.pressed]}
      >
        <Avatar name={student?.name ?? '?'} uri={student?.avatar} size="md" />
        <View style={styles.body}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {student?.name ?? 'Student'}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {course?.title ?? 'Course'} · {batch?.name ?? ''}
          </Text>
          <ProgressBar value={enrollment.feeTotal ? enrollment.feePaid / enrollment.feeTotal : 0} tone={due > 0 ? 'warning' : 'success'} height={5} style={{ marginTop: 4 }} />
        </View>
        {action ?? (
          <View style={styles.right}>
            <StatusPill kind="enrollment" status={enrollment.status} size="sm" />
            <Text variant="caption" tone={due > 0 ? 'warning' : 'muted'}>
              {due > 0 ? `${formatCurrency(due)} due` : 'Paid'}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  const fab =
    view === 'courses' ? (
      <FAB icon="add" label="Course" onPress={() => navigation.navigate('CourseForm')} />
    ) : view === 'students' ? (
      <FAB icon="person-add" label="Enroll" onPress={() => navigation.navigate('EnrollStudent')} />
    ) : null;

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()} overlay={fab}>
      <SegmentedControl options={VIEWS} value={view} onChange={setView} />
      {view === 'students' ? <FilterChips options={STATUS_OPTIONS} value={status} onChange={setStatus} allLabel="All" /> : null}

      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.md }}>
            {view === 'courses' ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              Array.from({ length: 6 }, (_, i) => <SkeletonListItem key={i} />)
            )}
          </View>
        }
      >
        {({ courses, enrollments }) => {
          if (view === 'courses') {
            const today = todayISO();
            return courses.length === 0 ? (
              <EmptyState icon="school-outline" title="No courses yet" message="Create your first course, then add batches." actionLabel="New course" onAction={() => navigation.navigate('CourseForm')} />
            ) : (
              <View style={{ gap: spacing.md }}>
                {courses.map((course, index) => {
                  const active = enrollments.filter((e) => e.courseId === course.id && (e.status === 'active' || e.status === 'pending')).length;
                  const ongoing = course.batches.find((b) => b.startDate <= today && b.endDate >= today);
                  const meta = COURSE_TYPE_META[course.type];
                  return (
                    <Appear key={course.id} index={index}>
                      <Card onPress={() => navigation.navigate('CourseManage', { courseId: course.id })} accessibilityLabel={course.title} style={{ gap: spacing.xs }}>
                        <View style={styles.badges}>
                          <Badge label={formatEnumLabel(course.type)} tone={meta.tone} icon={meta.icon} size="sm" />
                          {!course.isActive ? <Badge label="Hidden" tone="neutral" size="sm" /> : null}
                        </View>
                        <Text variant="h4">{course.title}</Text>
                        <Text variant="caption" tone="secondary">
                          {formatCurrency(course.fee)} · {course.duration} · {staff.get(course.instructor)?.name ?? 'No instructor'}
                        </Text>
                        <Text variant="caption" tone={ongoing ? 'success' : 'muted'}>
                          {active} enrolled · {course.batches.length} batches{ongoing ? ` · ${ongoing.name} running` : ''}
                        </Text>
                      </Card>
                    </Appear>
                  );
                })}
              </View>
            );
          }

          if (view === 'students') {
            const list = enrollments.filter((e) => (status ? e.status === status : true));
            return list.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title={status ? 'No students with this status' : 'No students yet'}
                message={status ? 'Try another filter.' : 'Enroll a student to get started.'}
                actionLabel={status ? 'Show all' : 'Enroll student'}
                onAction={status ? () => setStatus(null) : () => navigation.navigate('EnrollStudent')}
              />
            ) : (
              <View style={{ gap: spacing.sm }}>{list.map((e) => enrollmentRow(e))}</View>
            );
          }

          return (
            <View style={{ gap: spacing.md }}>
              <Card variant="filled" style={styles.total}>
                <View style={styles.body}>
                  <Text variant="caption" tone="muted">
                    Total outstanding
                  </Text>
                  <Text variant="h2" tone={totalDue > 0 ? 'warning' : 'success'}>
                    {formatCurrency(totalDue)}
                  </Text>
                </View>
                <Text variant="caption" tone="secondary">
                  {dues.length} students
                </Text>
              </Card>
              {dues.length === 0 ? (
                <EmptyState compact icon="checkmark-done-outline" tone="success" title="All fees are paid" message="No student has a balance due." />
              ) : (
                dues.map((e) =>
                  enrollmentRow(
                    e,
                    <View style={styles.right}>
                      <Text variant="label" tone="warning">
                        {formatCurrency(selectFeeDue(e))}
                      </Text>
                      <Button
                        title="Record"
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          setPayError(null);
                          setPaying(e);
                        }}
                      />
                    </View>,
                  ),
                )
              )}
            </View>
          );
        }}
      </QueryState>

      <PaymentSheet
        visible={paying !== null}
        title="Record fee payment"
        subtitle={paying ? `${customers.get(paying.studentId)?.name ?? 'Student'} · ${courseMap.get(paying.courseId)?.title ?? ''}` : undefined}
        due={paying ? selectFeeDue(paying) : 0}
        loading={payBusy}
        error={payError}
        onSubmit={(amount, method) => void recordFee(amount, method)}
        onClose={() => setPaying(null)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  badges: { flexDirection: 'row', gap: 6 },
  total: { flexDirection: 'row', alignItems: 'center' },
});
