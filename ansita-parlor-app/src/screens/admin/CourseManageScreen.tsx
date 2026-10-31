import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { COURSE_TYPE_META } from '@/components/customer/CourseCards';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Divider,
  EmptyState,
  ListItem,
  QueryState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatusPill,
  Text,
  useToast,
} from '@/components/ui';
import { useCustomerMap, useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, enrollmentService, getErrorMessage } from '@/services';
import { selectFeeDue, useCourseStore } from '@/store';
import { useTheme } from '@/theme';
import { formatShortDate, formatTimeRange, todayISO } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';

type Props = RootStackScreenProps<'CourseManage'>;

/** Admin view of a course: details, batches with seats, attendance and enrolled students. */
export const CourseManageScreen = ({ navigation, route }: Props) => {
  const { colors, radius, spacing } = useTheme();
  const toast = useToast();
  const { courseId } = route.params;
  const staff = useStaffMap();
  const customers = useCustomerMap();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = useServiceQuery(
    async () => {
      const [course, availability, enrollments] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.getBatchAvailability(courseId),
        enrollmentService.listEnrollments({ courseId }),
      ]);
      return { course, availability, enrollments };
    },
    [courseId],
    { refetchOn: [useCourseStore] },
  );

  const act = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const today = todayISO();

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ course, availability, enrollments }) => {
          const meta = COURSE_TYPE_META[course.type];
          const instructor = staff.get(course.instructor);
          const due = enrollments.filter((e) => e.status !== 'dropped').reduce((sum, e) => sum + selectFeeDue(e), 0);
          return (
            <View style={{ gap: spacing.xl }}>
              <Card style={{ gap: spacing.sm }}>
                <View style={styles.row}>
                  <Badge label={formatEnumLabel(course.type)} tone={meta.tone} icon={meta.icon} size="sm" />
                  <Badge label={formatEnumLabel(course.level)} tone="neutral" size="sm" />
                </View>
                <Text variant="h2">{course.title}</Text>
                <Text variant="bodySmall" tone="secondary">
                  {formatCurrency(course.fee)} · {course.duration} · {course.syllabus.length} modules
                </Text>
                {instructor ? (
                  <View style={styles.row}>
                    <Avatar name={instructor.name} size="xs" />
                    <Text variant="caption">{instructor.name}</Text>
                  </View>
                ) : null}
                <Divider spacing="xs" />
                <View style={styles.row}>
                  <Text variant="bodySmall" style={styles.flex}>
                    Visible to customers
                  </Text>
                  <Switch
                    value={course.isActive}
                    onValueChange={(isActive) => void act(() => courseService.setCourseActive(courseId, isActive), isActive ? 'Course published' : 'Course hidden')}
                    trackColor={{ true: colors.primary, false: colors.borderStrong }}
                    thumbColor={colors.surface}
                  />
                </View>
                <View style={styles.row}>
                  <Button title="Edit course" size="sm" variant="secondary" leftIcon="create-outline" onPress={() => navigation.navigate('CourseForm', { courseId })} />
                  <Button title="Enroll student" size="sm" variant="outline" leftIcon="person-add-outline" onPress={() => navigation.navigate('EnrollStudent', { courseId })} />
                </View>
              </Card>

              <View style={{ gap: spacing.md }}>
                <SectionHeader title="Batches" actionLabel="Add batch" onAction={() => navigation.navigate('BatchForm', { courseId })} />
                {availability.length === 0 ? (
                  <Card variant="outlined" padding="none">
                    <EmptyState
                      compact
                      icon="calendar-outline"
                      title="No batches yet"
                      message="Add a batch so students can enroll."
                      actionLabel="Add batch"
                      onAction={() => navigation.navigate('BatchForm', { courseId })}
                    />
                  </Card>
                ) : (
                  availability.map(({ batch, seatsTaken, seatsLeft }) => {
                    const started = batch.startDate <= today;
                    const students = enrollments.filter((e) => e.batchId === batch.id);
                    return (
                      <Card key={batch.id} style={{ gap: spacing.sm }}>
                        <View style={styles.row}>
                          <Text variant="h4" style={styles.flex}>
                            {batch.name}
                          </Text>
                          <Badge
                            label={formatEnumLabel(batch.status)}
                            tone={batch.status === 'ongoing' ? 'success' : batch.status === 'upcoming' ? 'info' : 'neutral'}
                            size="sm"
                          />
                        </View>
                        <Text variant="caption" tone="secondary">
                          {formatShortDate(batch.startDate)} – {formatShortDate(batch.endDate)} · {batch.days.map(formatEnumLabel).join(', ')} ·{' '}
                          {formatTimeRange(batch.startTime, batch.endTime)}
                        </Text>
                        <Text variant="caption" tone={seatsLeft === 0 ? 'danger' : 'muted'}>
                          {seatsTaken}/{batch.seats} seats taken{seatsLeft === 0 ? ' · Full' : ''}
                        </Text>
                        {students.length > 0 ? (
                          <View style={{ gap: 2 }}>
                            {students.map((enrollment) => (
                              <Pressable
                                key={enrollment.id}
                                onPress={() => navigation.navigate('EnrollmentDetail', { enrollmentId: enrollment.id })}
                                accessibilityRole="button"
                                style={({ pressed }) => [styles.student, { borderRadius: radius.sm }, pressed && { backgroundColor: colors.surfaceAlt }]}
                              >
                                <Avatar name={customers.get(enrollment.studentId)?.name ?? '?'} size="xs" />
                                <Text variant="bodySmall" style={styles.flex} numberOfLines={1}>
                                  {customers.get(enrollment.studentId)?.name ?? 'Student'}
                                </Text>
                                {selectFeeDue(enrollment) > 0 && enrollment.status !== 'dropped' ? (
                                  <Text variant="caption" tone="warning">
                                    {formatCurrency(selectFeeDue(enrollment))} due
                                  </Text>
                                ) : null}
                                <StatusPill kind="enrollment" status={enrollment.status} size="sm" />
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                        <View style={styles.row}>
                          <Button title="Edit" size="sm" variant="ghost" leftIcon="create-outline" onPress={() => navigation.navigate('BatchForm', { courseId, batchId: batch.id })} />
                          {started && students.some((e) => e.status === 'active') ? (
                            <Button
                              title="Take attendance"
                              size="sm"
                              variant="secondary"
                              leftIcon="checkbox-outline"
                              onPress={() => navigation.navigate('BatchAttendance', { courseId, batchId: batch.id })}
                            />
                          ) : null}
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>

              <Card variant="filled" padding="sm">
                <ListItem
                  title="Fees outstanding"
                  subtitle={`${enrollments.filter((e) => e.status !== 'dropped').length} students enrolled`}
                  leftIcon="wallet-outline"
                  leftIconTone="warning"
                  rightText={formatCurrency(due)}
                />
              </Card>

              <Button title="Delete course" variant="ghost" onPress={() => setDeleteOpen(true)} style={styles.center} />
              <ConfirmDialog
                visible={deleteOpen}
                tone="danger"
                title="Delete this course?"
                message="Courses with active students can't be deleted. Hide the course instead to stop new enrollments."
                confirmLabel="Delete"
                loading={busy}
                onConfirm={() =>
                  void act(() => courseService.deleteCourse(courseId), 'Course deleted').then((ok) => {
                    setDeleteOpen(false);
                    if (ok) navigation.goBack();
                  })
                }
                onCancel={() => setDeleteOpen(false)}
              />
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1 },
  student: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  center: { alignSelf: 'center' },
});
