import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, DatePickerField, EmptyState, QueryState, Screen, SegmentedControl, SkeletonListItem, Text, useToast, type SegmentOption } from '@/components/ui';
import { useCustomerMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, enrollmentService, getErrorMessage } from '@/services';
import { selectAttendancePercent } from '@/store';
import { useTheme } from '@/theme';
import type { AttendanceStatus, Batch, ID, ISODate } from '@/types';
import { addDaysISO, formatDisplayDate, todayISO, weekdayOf } from '@/utils/date';

type Props = RootStackScreenProps<'BatchAttendance'>;

const OPTIONS: readonly SegmentOption<AttendanceStatus>[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
];

const isClassDay = (batch: Batch, date: ISODate): boolean =>
  date >= batch.startDate && date <= batch.endDate && date <= todayISO() && batch.days.includes(weekdayOf(date));

/** Most recent class day up to today. */
const latestClassDay = (batch: Batch): ISODate | null => {
  for (let date = todayISO() < batch.endDate ? todayISO() : batch.endDate; date >= batch.startDate; date = addDaysISO(date, -1)) {
    if (isClassDay(batch, date)) return date;
  }
  return null;
};

/** Mark one class for the whole batch at once. Re-saving a day overwrites it. */
export const BatchAttendanceScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const customers = useCustomerMap();
  const { courseId, batchId } = route.params;
  const [date, setDate] = useState<ISODate | null>(null);
  const [marks, setMarks] = useState<Record<ID, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const query = useServiceQuery(async () => {
    const [course, enrollments] = await Promise.all([courseService.getCourse(courseId), enrollmentService.listEnrollments({ batchId, status: 'active' })]);
    return { course, batch: course.batches.find((b) => b.id === batchId), enrollments };
  }, [courseId, batchId]);

  const batch = query.data?.batch;
  useEffect(() => {
    if (batch && date === null) setDate(latestClassDay(batch));
  }, [batch, date]);

  // Prefill from anything already recorded for the chosen day; default present.
  useEffect(() => {
    if (!date || !query.data) return;
    setMarks(Object.fromEntries(query.data.enrollments.map((e) => [e.id, e.attendance.find((r) => r.date === date)?.status ?? 'present'])));
  }, [date, query.data]);

  const counts = useMemo(
    () => Object.values(marks).reduce((totals, status) => ({ ...totals, [status]: totals[status] + 1 }), { present: 0, late: 0, absent: 0 }),
    [marks],
  );
  const alreadyMarked = date ? query.data?.enrollments.some((e) => e.attendance.some((r) => r.date === date)) : false;

  const save = async (): Promise<void> => {
    if (!date) return;
    setSaving(true);
    try {
      const saved = await enrollmentService.markBatchAttendance(
        date,
        Object.entries(marks).map(([enrollmentId, status]) => ({ enrollmentId, status })),
      );
      toast.success(`Attendance saved for ${saved.length} students`);
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.sm }}>
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </View>
        }
        isEmpty={(data) => data.enrollments.length === 0 || !data.batch}
        empty={{ icon: 'people-outline', title: 'No active students', message: 'Only active students (fee paid or part-paid) can be marked.' }}
      >
        {({ course, enrollments }) =>
          !batch ? null : (
            <View style={{ gap: spacing.lg }}>
              <View>
                <Text variant="h3">{course.title}</Text>
                <Text variant="bodySmall" tone="secondary">
                  {batch.name}
                </Text>
              </View>
              <DatePickerField
                label="Class date"
                value={date}
                onChange={(value) => setDate(value)}
                minDate={batch.startDate}
                maxDate={todayISO() < batch.endDate ? todayISO() : batch.endDate}
                isDateDisabled={(day) => !isClassDay(batch, day)}
                helperText={alreadyMarked ? 'Already marked: saving will update it.' : 'Only class days can be picked.'}
              />
              {date === null ? (
                <EmptyState compact icon="calendar-outline" title="No class yet" message="This batch hasn't had a class day up to today." />
              ) : (
                <>
                  <View style={styles.summary}>
                    <Text variant="label" tone="success">
                      {counts.present} present
                    </Text>
                    <Text variant="label" tone="warning">
                      {counts.late} late
                    </Text>
                    <Text variant="label" tone="danger">
                      {counts.absent} absent
                    </Text>
                    <Button
                      title="All present"
                      size="sm"
                      variant="ghost"
                      onPress={() => setMarks(Object.fromEntries(enrollments.map((e) => [e.id, 'present' as const])))}
                    />
                  </View>
                  {enrollments.map((enrollment) => {
                    const student = customers.get(enrollment.studentId);
                    return (
                      <Card key={enrollment.id} padding="md" style={{ gap: spacing.sm }}>
                        <View style={styles.student}>
                          <Avatar name={student?.name ?? '?'} uri={student?.avatar} size="sm" />
                          <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
                            {student?.name ?? 'Student'}
                          </Text>
                          <Text variant="caption" tone="muted">
                            {selectAttendancePercent(enrollment)}% overall
                          </Text>
                        </View>
                        <SegmentedControl
                          options={OPTIONS}
                          value={marks[enrollment.id] ?? 'present'}
                          onChange={(status) => setMarks((current) => ({ ...current, [enrollment.id]: status }))}
                        />
                      </Card>
                    );
                  })}
                  <Button title={`Save attendance · ${formatDisplayDate(date)}`} size="lg" loading={saving} onPress={() => void save()} fullWidth />
                </>
              )}
            </View>
          )
        }
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  student: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
});
