import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipSelect, MultiChipSelect, TimeStepper, WEEKDAY_OPTIONS } from '@/components/admin/Pickers';
import { Button, ConfirmDialog, DatePickerField, Input, QueryState, Screen, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import type { BatchStatus, ISODate, TimeString, Weekday } from '@/types';
import { addDaysISO, todayISO } from '@/utils/date';

type Props = RootStackScreenProps<'BatchForm'>;

const STATUSES: readonly { value: BatchStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

/** Status that matches the dates, as a default suggestion. */
const statusFor = (start: ISODate, end: ISODate): BatchStatus => {
  const today = todayISO();
  if (today < start) return 'upcoming';
  if (today > end) return 'completed';
  return 'ongoing';
};

export const BatchFormScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const toast = useToast();
  const { courseId, batchId } = route.params;
  const query = useServiceQuery(() => courseService.getCourse(courseId), [courseId]);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<ISODate | null>(addDaysISO(todayISO(), 14));
  const [endDate, setEndDate] = useState<ISODate | null>(addDaysISO(todayISO(), 56));
  const [days, setDays] = useState<Weekday[]>(['sun', 'tue', 'thu']);
  const [startTime, setStartTime] = useState<TimeString>('10:00');
  const [endTime, setEndTime] = useState<TimeString>('13:00');
  const [seats, setSeats] = useState('10');
  const [status, setStatus] = useState<BatchStatus>('upcoming');
  const [statusTouched, setStatusTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const course = query.data;
    if (!course) return;
    const batch = batchId ? course.batches.find((b) => b.id === batchId) : undefined;
    if (batch) {
      setName(batch.name);
      setStartDate(batch.startDate);
      setEndDate(batch.endDate);
      setDays(batch.days);
      setStartTime(batch.startTime);
      setEndTime(batch.endTime);
      setSeats(String(batch.seats));
      setStatus(batch.status);
      setStatusTouched(true);
    } else {
      setSeats(String(course.seats));
    }
  }, [query.data, batchId]);

  // Suggest the status from the dates until the admin picks one.
  useEffect(() => {
    if (!statusTouched && startDate && endDate) setStatus(statusFor(startDate, endDate));
  }, [startDate, endDate, statusTouched]);

  const valid = name.trim().length >= 2 && startDate && endDate && endDate >= startDate && days.length > 0 && Number(seats) > 0 && endTime > startTime;

  const save = async (): Promise<void> => {
    if (!valid || !startDate || !endDate) return;
    setSaving(true);
    const input = { name: name.trim(), startDate, endDate, days, startTime, endTime, seats: Number(seats), status };
    try {
      if (batchId) await courseService.updateBatch(courseId, batchId, input);
      else await courseService.addBatch(courseId, input);
      toast.success(batchId ? 'Batch updated' : 'Batch added');
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!batchId) return;
    setSaving(true);
    try {
      await courseService.deleteBatch(courseId, batchId);
      toast.success('Batch deleted');
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleteOpen(false);
    } finally {
      setSaving(false);
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
            <Input label="Batch name" required value={name} onChangeText={setName} placeholder="e.g. Morning Batch" />
            <View style={styles.row}>
              <DatePickerField label="Starts" value={startDate} onChange={setStartDate} style={styles.flex} />
              <DatePickerField label="Ends" value={endDate} onChange={setEndDate} minDate={startDate ?? undefined} style={styles.flex} error={startDate && endDate && endDate < startDate ? 'Before start' : null} />
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Class days
              </Text>
              <MultiChipSelect options={WEEKDAY_OPTIONS} value={days} onChange={setDays} />
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TimeStepper label="Class starts" value={startTime} onChange={setStartTime} max={endTime} />
              </View>
              <View style={styles.flex}>
                <TimeStepper label="Class ends" value={endTime} onChange={setEndTime} min={startTime} />
              </View>
            </View>
            <Input label="Seats" value={seats} onChangeText={(t) => setSeats(t.replace(/\D/g, ''))} keyboardType="number-pad" helperText="Can't be lower than the number of students already enrolled." />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Status
              </Text>
              <ChipSelect
                options={STATUSES}
                value={status}
                onChange={(value) => {
                  setStatusTouched(true);
                  setStatus(value);
                }}
              />
              <Text variant="caption" tone="muted">
                Completed batches stop taking enrollments.
              </Text>
            </View>
            <Button title={batchId ? 'Save batch' : 'Add batch'} size="lg" disabled={!valid} loading={saving} onPress={() => void save()} fullWidth />
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
        loading={saving}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteOpen(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
