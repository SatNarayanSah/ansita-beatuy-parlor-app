import { StyleSheet, View } from 'react-native';

import { Badge, Card, ProgressBar, StatusPill, Text } from '@/components/ui';
import { selectAttendancePercent, selectFeeDue } from '@/store/courseStore';
import { useTheme } from '@/theme';
import type { Course, Enrollment } from '@/types';
import { formatShortDate, todayISO } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';

interface EnrollmentCardProps {
  enrollment: Enrollment;
  course: Course | undefined;
  onPress?: () => void;
}

/** A student's enrollment with fee and attendance progress. */
export const EnrollmentCard = ({ enrollment, course, onPress }: EnrollmentCardProps) => {
  const { spacing } = useTheme();
  const batch = course?.batches.find((item) => item.id === enrollment.batchId);
  const due = selectFeeDue(enrollment);
  const attendance = selectAttendancePercent(enrollment);
  const counts = enrollment.attendance.reduce(
    (totals, record) => ({ ...totals, [record.status]: totals[record.status] + 1 }),
    { present: 0, late: 0, absent: 0 },
  );
  const notStarted = batch ? batch.startDate > todayISO() : false;

  return (
    <Card onPress={onPress} accessibilityLabel={course?.title} style={{ gap: spacing.md }}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="h4">{course?.title ?? 'Course'}</Text>
          {batch ? (
            <Text variant="caption" tone="secondary">
              {batch.name} · {formatShortDate(batch.startDate)} - {formatShortDate(batch.endDate)}
            </Text>
          ) : null}
        </View>
        <StatusPill kind="enrollment" status={enrollment.status} size="sm" />
      </View>

      <View style={{ gap: spacing.xs }}>
        <View style={styles.row}>
          <Text variant="label" tone="secondary">
            Fee
          </Text>
          <Text variant="caption" tone={due > 0 ? 'warning' : 'success'}>
            {due > 0 ? `${formatCurrency(due)} due` : 'Fully paid'}
          </Text>
        </View>
        <ProgressBar
          value={enrollment.feeTotal ? enrollment.feePaid / enrollment.feeTotal : 0}
          tone={due > 0 ? 'warning' : 'success'}
          accessibilityLabel="Fee paid"
        />
        <Text variant="caption" tone="muted">
          {formatCurrency(enrollment.feePaid)} of {formatCurrency(enrollment.feeTotal)} paid
          {enrollment.payments.length > 0 ? ` · ${enrollment.payments.length} payment${enrollment.payments.length === 1 ? '' : 's'}` : ''}
        </Text>
      </View>

      {enrollment.status === 'pending' || notStarted ? (
        <Text variant="caption" tone="secondary">
          {enrollment.status === 'pending'
            ? 'Seat reserved. Pay at the front desk to confirm.'
            : `Classes start ${batch ? formatShortDate(batch.startDate) : 'soon'}${batch ? ` · ${batch.days.map(formatEnumLabel).join(', ')}` : ''}`}
        </Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <View style={styles.row}>
            <Text variant="label" tone="secondary">
              Attendance
            </Text>
            <Text variant="caption" tone={attendance >= 80 ? 'success' : 'warning'}>
              {attendance}%
            </Text>
          </View>
          <ProgressBar value={attendance / 100} tone={attendance >= 80 ? 'success' : 'warning'} accessibilityLabel="Attendance" />
          <Text variant="caption" tone="muted">
            {counts.present} present · {counts.late} late · {counts.absent} absent
          </Text>
        </View>
      )}

      {enrollment.certificateIssued ? <Badge label="Certificate issued" tone="success" icon="ribbon" /> : null}
      {enrollment.status === 'completed' && !enrollment.certificateIssued ? (
        <Badge label="Certificate being prepared" tone="info" icon="hourglass-outline" />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
