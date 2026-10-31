import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import type { z } from 'zod';

import { ChipSelect, MultiChipSelect, TimeStepper, WEEKDAY_OPTIONS } from '@/components/admin/Pickers';
import { FormInput } from '@/components/form/FormFields';
import { Button, ConfirmDialog, DatePickerField, QueryState, Screen, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import type { BatchStatus, ISODate } from '@/types';
import { addDaysISO, todayISO } from '@/utils/date';
import { batchSchema } from '@/utils/formSchemas';

type Props = RootStackScreenProps<'BatchForm'>;
type Values = z.input<typeof batchSchema>;

const STATUSES: readonly { value: BatchStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

/** Status that matches the dates, suggested until the admin picks one. */
const statusFor = (start: ISODate, end: ISODate): BatchStatus => {
  const today = todayISO();
  if (today < start) return 'upcoming';
  if (today > end) return 'completed';
  return 'ongoing';
};

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <Text variant="caption" tone="danger">
      {message}
    </Text>
  ) : null;

export const BatchFormScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const { courseId, batchId } = route.params;
  const [statusTouched, setStatusTouched] = useState(Boolean(batchId));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const query = useServiceQuery(() => courseService.getCourse(courseId), [courseId]);

  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<Values, unknown, z.output<typeof batchSchema>>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      name: '',
      startDate: addDaysISO(todayISO(), 14),
      endDate: addDaysISO(todayISO(), 56),
      days: ['sun', 'tue', 'thu'],
      startTime: '10:00',
      endTime: '13:00',
      seats: '10',
      status: 'upcoming',
    },
    mode: 'onTouched',
  });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  useEffect(() => {
    const course = query.data;
    if (!course) return;
    const batch = batchId ? course.batches.find((b) => b.id === batchId) : undefined;
    if (batch) reset({ ...batch, seats: String(batch.seats) });
    else reset({ ...watch(), seats: String(course.seats) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, batchId, reset]);

  const [startDate, endDate, startTime, endTime] = watch(['startDate', 'endDate', 'startTime', 'endTime']);
  useEffect(() => {
    if (!statusTouched && startDate && endDate) setValue('status', statusFor(startDate, endDate));
  }, [startDate, endDate, statusTouched, setValue]);

  const save = handleSubmit(async (values) => {
    try {
      if (batchId) await courseService.updateBatch(courseId, batchId, values);
      else await courseService.addBatch(courseId, values);
      toast.success(batchId ? 'Batch updated' : 'Batch added');
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  const remove = async (): Promise<void> => {
    if (!batchId) return;
    setDeleting(true);
    try {
      await courseService.deleteBatch(courseId, batchId);
      toast.success('Batch deleted');
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {(course) => (
          <View style={{ gap: spacing.lg }}>
            <Text variant="bodySmall" tone="secondary">
              {course.title}
            </Text>
            <FormInput control={control} name="name" label="Batch name" required placeholder="e.g. Morning Batch" />
            <View style={styles.row}>
              <Controller
                control={control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <DatePickerField label="Starts" required value={field.value || null} onChange={(v) => field.onChange(v ?? '')} error={fieldState.error?.message} style={styles.flex} />
                )}
              />
              <Controller
                control={control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <DatePickerField
                    label="Ends"
                    required
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? '')}
                    minDate={startDate || undefined}
                    error={fieldState.error?.message}
                    style={styles.flex}
                  />
                )}
              />
            </View>
            <Controller
              control={control}
              name="days"
              render={({ field, fieldState }) => (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="secondary">
                    Class days
                  </Text>
                  <MultiChipSelect options={WEEKDAY_OPTIONS} value={field.value} onChange={field.onChange} />
                  <FieldError message={fieldState.error?.message} />
                </View>
              )}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Controller
                  control={control}
                  name="startTime"
                  render={({ field }) => <TimeStepper label="Class starts" value={field.value} onChange={field.onChange} max={endTime} />}
                />
              </View>
              <View style={styles.flex}>
                <Controller
                  control={control}
                  name="endTime"
                  render={({ field, fieldState }) => (
                    <>
                      <TimeStepper label="Class ends" value={field.value} onChange={field.onChange} min={startTime} />
                      <FieldError message={fieldState.error?.message} />
                    </>
                  )}
                />
              </View>
            </View>
            <FormInput control={control} name="seats" label="Seats" required keyboardType="number-pad" helperText="Can't be lower than the number of students already enrolled." />
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="secondary">
                    Status
                  </Text>
                  <ChipSelect
                    options={STATUSES}
                    value={field.value}
                    onChange={(value) => {
                      setStatusTouched(true);
                      field.onChange(value);
                    }}
                  />
                  <Text variant="caption" tone="muted">
                    Completed batches stop taking enrollments.
                  </Text>
                </View>
              )}
            />
            <Button title={batchId ? 'Save batch' : 'Add batch'} size="lg" loading={formState.isSubmitting} onPress={() => void save()} fullWidth />
            {batchId ? <Button title="Delete batch" variant="ghost" onPress={() => setDeleteOpen(true)} /> : null}
          </View>
        )}
      </QueryState>
      <ConfirmDialog
        visible={deleteOpen}
        tone="danger"
        title="Delete this batch?"
        message="Batches with enrolled students can't be deleted."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteOpen(false)}
      />
      {dialog}
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
