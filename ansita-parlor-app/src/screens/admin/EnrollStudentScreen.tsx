import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { ChipSelect, SelectSheet } from '@/components/admin/Pickers';
import { QuickCustomerForm } from '@/components/admin/QuickCustomerForm';
import { PAYMENT_METHOD_META } from '@/components/customer/PaymentMethodPicker';
import { FormInput } from '@/components/form/FormFields';
import { Avatar, Button, Card, ListItem, QueryState, Screen, SectionHeader, SkeletonCard, Text, useToast } from '@/components/ui';
import { useAdoptParam } from '@/hooks/useAdoptParam';
import { useCustomerMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, enrollmentService, getErrorMessage, type BatchAvailability } from '@/services';
import { useCourseStore, useCustomerStore } from '@/store';
import { useTheme } from '@/theme';
import type { Customer, ID, PaymentMethod } from '@/types';
import { formatShortDate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { optionalWholeNumberText } from '@/utils/formSchemas';
import { formatPhone } from '@/utils/phone';

type Props = RootStackScreenProps<'EnrollStudent'>;

const METHODS = (Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((value) => ({ value, label: PAYMENT_METHOD_META[value].label }));

/** Desk enrollment: pick student, course and open batch, optionally collect the first instalment. */
export const EnrollStudentScreen = ({ navigation, route }: Props) => {
  const { colors, radius, spacing } = useTheme();
  const toast = useToast();
  const customers = useCustomerMap();
  const customerList = useCustomerStore((state) => state.customers);
  const [studentId, setStudentId] = useState<ID | null>(route.params?.customerId ?? null);
  const [courseId, setCourseId] = useState<ID | null>(route.params?.courseId ?? null);
  const [chosenBatchId, setBatchId] = useState<ID | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newStudent, setNewStudent] = useState(false);
  const [saving, setSaving] = useState(false);

  const courses = useServiceQuery(() => courseService.listCourses({ activeOnly: true }), [], { refetchOn: [useCourseStore] });
  const availability = useServiceQuery<BatchAvailability[]>(async () => (courseId ? courseService.getBatchAvailability(courseId) : []), [courseId], {
    refetchOn: [useCourseStore],
  });
  const open = useMemo(() => (availability.data ?? []).filter((item) => item.isOpen), [availability.data]);
  const course = courses.data?.find((c) => c.id === courseId);

  // Soonest open batch of the chosen course, until another is picked.
  const batchId = open.some((item) => item.batch.id === chosenBatchId) ? chosenBatchId : (open[0]?.batch.id ?? null);

  // Optional first instalment, capped at the selected course's fee.
  const schema = useMemo(() => z.object({ amount: optionalWholeNumberText('the amount', course?.fee ?? 0) }), [course?.fee]);
  const { control, handleSubmit, reset } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '' },
    mode: 'onChange',
  });
  // Clear the amount when the course (and so the fee) changes.
  useAdoptParam(courseId ?? undefined, () => reset({ amount: '' }));
  const amountText = useWatch({ control, name: 'amount' });
  const paid = /^\d+$/.test(amountText) ? Number(amountText) : 0;
  const student = studentId ? customers.get(studentId) : undefined;
  const valid = Boolean(studentId && courseId && batchId);

  const save = handleSubmit(async ({ amount }) => {
    if (!studentId || !courseId || !batchId) return;
    setSaving(true);
    try {
      const enrollment = await enrollmentService.enroll({
        studentId,
        courseId,
        batchId,
        initialPayment: amount > 0 ? { amount, method } : undefined,
      });
      toast.success(`${student?.name ?? 'Student'} enrolled${amount > 0 ? ` · ${formatCurrency(amount)} received` : ''}`);
      navigation.replace('EnrollmentDetail', { enrollmentId: enrollment.id });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  });

  return (
    <Screen>
      <QueryState query={courses} skeleton={<SkeletonCard />}>
        {(list) => (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Student" compact />
              {student ? (
                <Card padding="sm">
                  <ListItem
                    title={student.name}
                    subtitle={formatPhone(student.phone)}
                    left={<Avatar name={student.name} uri={student.avatar} size="md" />}
                    right={<Button title="Change" size="sm" variant="ghost" onPress={() => setPickerOpen(true)} />}
                  />
                </Card>
              ) : (
                <Button title="Choose student" leftIcon="person-outline" variant="secondary" onPress={() => setPickerOpen(true)} fullWidth />
              )}
              <Text variant="caption" tone="muted">
                New student? Tap Choose student, then New student.
              </Text>
            </View>

            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Course" compact />
              <ChipSelect options={list.map((c) => ({ value: c.id, label: c.title }))} value={courseId} onChange={setCourseId} />
            </View>

            {courseId ? (
              <View style={{ gap: spacing.sm }}>
                <SectionHeader title="Batch" compact />
                {availability.loading ? (
                  <SkeletonCard />
                ) : open.length === 0 ? (
                  <Text variant="bodySmall" tone="warning">
                    No open batch. Add a batch to this course first.
                  </Text>
                ) : (
                  <ChipSelect
                    options={open.map(({ batch, seatsLeft }) => ({ value: batch.id, label: `${batch.name} · ${formatShortDate(batch.startDate)} · ${seatsLeft} left` }))}
                    value={batchId}
                    onChange={setBatchId}
                  />
                )}
              </View>
            ) : null}

            {course ? (
              <Card style={{ gap: spacing.md }}>
                <View style={styles.row}>
                  <Text variant="bodyMedium" style={styles.flex}>
                    Course fee
                  </Text>
                  <Text variant="h3" tone="primary">
                    {formatCurrency(course.fee)}
                  </Text>
                </View>
                <FormInput
                  control={control}
                  name="amount"
                  label="Paid now (optional)"
                  keyboardType="number-pad"
                  leftIcon="cash-outline"
                  helperText={paid > 0 && paid <= course.fee ? `${formatCurrency(course.fee - paid)} will remain due` : 'Without a payment the seat is reserved as "fee pending".'}
                />
                {paid > 0 ? <ChipSelect options={METHODS} value={method} onChange={setMethod} /> : null}
              </Card>
            ) : null}

            <Button title="Enroll student" size="lg" disabled={!valid} loading={saving} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>

      <SelectSheet<Customer>
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Student"
        placeholder="Search name or phone"
        items={customerList}
        keyOf={(c) => c.id}
        searchText={(c) => `${c.name} ${c.phone}`}
        onSelect={(c) => {
          setStudentId(c.id);
          setPickerOpen(false);
        }}
        header={
          newStudent ? (
            <QuickCustomerForm
              title="New student"
              tags={['new', 'student']}
              onCreated={(created) => {
                setStudentId(created.id);
                setNewStudent(false);
                setPickerOpen(false);
              }}
              onCancel={() => setNewStudent(false)}
            />
          ) : (
            <Button title="New student" leftIcon="person-add-outline" variant="outline" onPress={() => setNewStudent(true)} fullWidth />
          )
        }
        renderItem={(c) => (
          <View style={[styles.pick, { borderRadius: radius.md, backgroundColor: c.id === studentId ? colors.primarySoft : 'transparent' }]}>
            <Avatar name={c.name} uri={c.avatar} size="sm" />
            <View style={styles.flex}>
              <Text variant="bodyMedium">{c.name}</Text>
              <Text variant="caption" tone="muted">
                {formatPhone(c.phone)}
              </Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
});
