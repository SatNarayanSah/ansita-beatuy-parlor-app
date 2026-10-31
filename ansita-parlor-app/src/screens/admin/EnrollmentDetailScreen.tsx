import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CertificatePreview } from '@/components/admin/CertificatePreview';
import { PaymentSheet } from '@/components/admin/PaymentSheet';
import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ListItem,
  ProgressBar,
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
import { selectAttendancePercent, selectFeeDue, useBusinessStore, useCourseStore } from '@/store';
import { useTheme } from '@/theme';
import type { EnrollmentStatus, PaymentMethod } from '@/types';
import { formatShortDate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Props = RootStackScreenProps<'EnrollmentDetail'>;

/** One student's enrollment: fees, attendance, status and certificate. */
export const EnrollmentDetailScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const { enrollmentId } = route.params;
  const customers = useCustomerMap();
  const staff = useStaffMap();
  const businessName = useBusinessStore((state) => state.profile.name);
  const [payOpen, setPayOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<EnrollmentStatus | null>(null);
  const [certificateOpen, setCertificateOpen] = useState(false);

  const query = useServiceQuery(
    async () => {
      const enrollment = await enrollmentService.getEnrollment(enrollmentId);
      const course = await courseService.getCourse(enrollment.courseId);
      return { enrollment, course, batch: course.batches.find((b) => b.id === enrollment.batchId) };
    },
    [enrollmentId],
    { refetchOn: [useCourseStore] },
  );

  const run = async (key: string, action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const recordFee = async (amount: number, method: PaymentMethod): Promise<void> => {
    setPayError(null);
    setBusy('pay');
    try {
      await enrollmentService.recordFeePayment(enrollmentId, { amount, method });
      toast.success(`${formatCurrency(amount)} recorded`);
      setPayOpen(false);
    } catch (error) {
      setPayError(getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ enrollment, course, batch }) => {
          const student = customers.get(enrollment.studentId);
          const due = selectFeeDue(enrollment);
          const attendance = selectAttendancePercent(enrollment);
          const open = enrollment.status === 'active' || enrollment.status === 'pending';
          // Why a certificate can't be issued yet, if it can't.
          const certificateBlocker = !course.certificate
            ? 'This course does not award certificates.'
            : enrollment.status !== 'completed'
              ? 'Mark the course as completed first.'
              : due > 0
                ? `Clear the ${formatCurrency(due)} balance first.`
                : null;

          return (
            <View style={{ gap: spacing.xl }}>
              <Card padding="sm">
                <ListItem
                  title={student?.name ?? 'Student'}
                  subtitle={`${course.title} · ${batch?.name ?? ''}`}
                  description={batch ? `${formatShortDate(batch.startDate)} – ${formatShortDate(batch.endDate)}` : undefined}
                  left={<Avatar name={student?.name ?? '?'} uri={student?.avatar} size="md" />}
                  right={<StatusPill kind="enrollment" status={enrollment.status} size="sm" />}
                  onPress={student ? () => navigation.navigate('CustomerDetail', { customerId: student.id }) : undefined}
                />
              </Card>

              <Card style={{ gap: spacing.sm }}>
                <SectionHeader title="Fees" compact />
                <View style={styles.row}>
                  <Text variant="h3" style={styles.flex}>
                    {formatCurrency(enrollment.feePaid)}
                    <Text variant="bodySmall" tone="muted">
                      {' '}
                      / {formatCurrency(enrollment.feeTotal)}
                    </Text>
                  </Text>
                  <Badge label={due > 0 ? `${formatCurrency(due)} due` : 'Paid in full'} tone={due > 0 ? 'warning' : 'success'} />
                </View>
                <ProgressBar value={enrollment.feeTotal ? enrollment.feePaid / enrollment.feeTotal : 0} tone={due > 0 ? 'warning' : 'success'} />
                {enrollment.payments.length > 0 ? (
                  <View style={{ gap: 4, marginTop: spacing.xs }}>
                    {enrollment.payments.map((payment) => (
                      <View key={payment.id} style={styles.row}>
                        <Text variant="caption" tone="secondary" style={styles.flex}>
                          {formatShortDate(payment.paidOn)} · {PAYMENT_METHOD_META[payment.method].label}
                        </Text>
                        <Text variant="caption">{formatCurrency(payment.amount)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text variant="caption" tone="muted">
                    No payments yet.
                  </Text>
                )}
                {due > 0 && enrollment.status !== 'dropped' ? (
                  <Button
                    title="Record payment"
                    leftIcon="cash-outline"
                    variant="secondary"
                    onPress={() => {
                      setPayError(null);
                      setPayOpen(true);
                    }}
                    fullWidth
                  />
                ) : null}
              </Card>

              <Card style={{ gap: spacing.sm }}>
                <SectionHeader title="Attendance" subtitle={`${enrollment.attendance.length} classes recorded`} compact />
                <View style={styles.row}>
                  <Text variant="h3" style={styles.flex}>
                    {attendance}%
                  </Text>
                  <Text variant="caption" tone={attendance >= 80 ? 'success' : 'warning'}>
                    {attendance >= 80 ? 'On track for certificate' : 'Below 80% target'}
                  </Text>
                </View>
                <ProgressBar value={attendance / 100} tone={attendance >= 80 ? 'success' : 'warning'} />
                <View style={styles.dots}>
                  {enrollment.attendance.slice(-24).map((record) => (
                    <Badge
                      key={record.date}
                      label={formatShortDate(record.date)}
                      tone={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'danger'}
                      size="sm"
                    />
                  ))}
                </View>
                {batch && enrollment.status === 'active' ? (
                  <Button
                    title="Take attendance for batch"
                    size="sm"
                    variant="ghost"
                    leftIcon="checkbox-outline"
                    onPress={() => navigation.navigate('BatchAttendance', { courseId: course.id, batchId: batch.id })}
                  />
                ) : null}
              </Card>

              <Card style={{ gap: spacing.sm }}>
                <SectionHeader title="Certificate" compact />
                {enrollment.certificateIssued ? (
                  <>
                    <Badge label="Issued" tone="success" icon="ribbon" />
                    <Button title="View certificate" leftIcon="document-text-outline" variant="secondary" onPress={() => setCertificateOpen(true)} fullWidth />
                  </>
                ) : (
                  <>
                    <Text variant="bodySmall" tone="secondary">
                      {certificateBlocker ?? 'Ready to issue. The student will be notified.'}
                    </Text>
                    <Button
                      title="Issue certificate"
                      leftIcon="ribbon-outline"
                      disabled={certificateBlocker !== null}
                      loading={busy === 'certificate'}
                      onPress={() =>
                        void run('certificate', () => enrollmentService.issueCertificate(enrollmentId), 'Certificate issued').then((ok) => ok && setCertificateOpen(true))
                      }
                      fullWidth
                    />
                  </>
                )}
              </Card>

              {open ? (
                <View style={[styles.row, { gap: spacing.sm }]}>
                  {enrollment.status === 'active' ? (
                    <Button title="Mark completed" leftIcon="checkmark-done-outline" variant="outline" onPress={() => setStatusChange('completed')} style={styles.flex} fullWidth />
                  ) : null}
                  <Button title="Drop student" variant="ghost" onPress={() => setStatusChange('dropped')} style={styles.flex} fullWidth />
                </View>
              ) : null}

              <PaymentSheet
                visible={payOpen}
                title="Record fee payment"
                subtitle={`${student?.name ?? 'Student'} · ${course.title}`}
                due={due}
                loading={busy === 'pay'}
                error={payError}
                onSubmit={(amount, method) => void recordFee(amount, method)}
                onClose={() => setPayOpen(false)}
              />
              <ConfirmDialog
                visible={statusChange !== null}
                tone={statusChange === 'dropped' ? 'danger' : 'default'}
                icon={statusChange === 'dropped' ? 'person-remove-outline' : 'checkmark-done-outline'}
                title={statusChange === 'dropped' ? 'Drop this student?' : 'Mark course completed?'}
                message={
                  statusChange === 'dropped'
                    ? 'Their seat is released. Payments made stay on record.'
                    : `Attendance is ${attendance}%. You can issue the certificate next${due > 0 ? ' once the balance is cleared' : ''}.`
                }
                confirmLabel={statusChange === 'dropped' ? 'Drop' : 'Mark completed'}
                loading={busy === 'status'}
                onConfirm={() => {
                  if (!statusChange) return;
                  void run('status', () => enrollmentService.updateStatus(enrollmentId, statusChange), statusChange === 'dropped' ? 'Student dropped' : 'Marked completed').then(() =>
                    setStatusChange(null),
                  );
                }}
                onCancel={() => setStatusChange(null)}
              />
              {student ? (
                <CertificatePreview
                  visible={certificateOpen}
                  onClose={() => setCertificateOpen(false)}
                  studentName={student.name}
                  course={course}
                  batch={batch}
                  enrollment={enrollment}
                  instructorName={staff.get(course.instructor)?.name}
                  businessName={businessName}
                />
              ) : null}
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
