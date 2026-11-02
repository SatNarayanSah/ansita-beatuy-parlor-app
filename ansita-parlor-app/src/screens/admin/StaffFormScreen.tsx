import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';
import type { z } from 'zod';

import { ChipSelect, MultiChipSelect, TimeStepper } from '@/components/admin/Pickers';
import { FormInput, FormPhoneInput } from '@/components/form/FormFields';
import { ImagePickerField } from '@/components/form/ImagePickerField';
import { Button, Card, Divider, QueryState, Screen, SectionHeader, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, getErrorMessage, staffService } from '@/services';
import { useBusinessStore } from '@/store';
import { useTheme } from '@/theme';
import type { StaffRole, Weekday } from '@/types';
import { formatEnumLabel } from '@/utils/format';
import { staffSchema } from '@/utils/formSchemas';

type Props = RootStackScreenProps<'StaffForm'>;
type Values = z.input<typeof staffSchema>;

const ROLES: readonly StaffRole[] = ['owner', 'senior_stylist', 'stylist', 'beautician', 'trainer', 'receptionist'];
const DAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS: Record<Weekday, string> = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

/** Add or edit a staff member, including the weekly schedule and days off. */
export const StaffFormScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const staffId = route.params?.staffId;
  const business = useBusinessStore((state) => state.profile);

  const query = useServiceQuery(async () => {
    const [categories, member] = await Promise.all([catalogService.listCategories(), staffId ? staffService.getStaff(staffId) : null]);
    return { categories, member };
  }, [staffId]);

  const { control, handleSubmit, reset, getValues, setValue, formState } = useForm<Values, unknown, z.output<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      role: 'beautician',
      phone: '',
      email: '',
      specialties: [],
      workingHours: DAYS.map((day) => ({ day, isOff: false, start: business.openTime, end: business.closeTime })),
      avatar: null,
    },
    mode: 'onTouched',
  });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  useEffect(() => {
    const m = query.data?.member;
    if (!m) return;
    reset({
      name: m.name,
      role: m.role,
      phone: m.phone,
      email: m.email,
      specialties: m.specialties,
      // Editor rows are always Sun..Sat whatever order the record stores.
      workingHours: DAYS.map((day) => m.workingHours.find((h) => h.day === day) ?? { day, isOff: true, start: business.openTime, end: business.closeTime }),
      avatar: m.avatar,
    });
  }, [query.data, reset, business.openTime, business.closeTime]);

  const save = handleSubmit(async (values) => {
    const input = { ...values, email: values.email.toLowerCase() };
    try {
      if (staffId) {
        await staffService.updateStaff(staffId, input);
        toast.success('Staff member updated');
        allowLeave();
        navigation.goBack();
      } else {
        const created = await staffService.createStaff({ ...input, isActive: true });
        toast.success(`${created.name} added`);
        allowLeave();
        navigation.replace('StaffDetail', { staffId: created.id });
      }
    } catch (error) {
      // e.g. new hours would strand upcoming bookings.
      toast.error(getErrorMessage(error));
    }
  });

  const copySunday = (): void => {
    const hours = getValues('workingHours');
    const sunday = hours[0];
    if (!sunday) return;
    setValue(
      'workingHours',
      hours.map((h) => (h.isOff ? h : { ...h, start: sunday.start, end: sunday.end })),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ categories }) => (
          <View style={{ gap: spacing.lg }}>
            <Controller
              control={control}
              name="avatar"
              render={({ field }) => (
                <ImagePickerField label="Photo" variant="avatar" name={getValues('name')} value={field.value} onChange={field.onChange} helperText="Customers see it when choosing a stylist." />
              )}
            />
            <FormInput control={control} name="name" label="Full name" required leftIcon="person-outline" />
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="secondary">
                    Role
                  </Text>
                  <ChipSelect options={ROLES.map((r) => ({ value: r, label: formatEnumLabel(r) }))} value={field.value} onChange={field.onChange} />
                </View>
              )}
            />
            <FormPhoneInput control={control} name="phone" required />
            <FormInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" />
            <Controller
              control={control}
              name="specialties"
              render={({ field, fieldState }) => (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="secondary">
                    Specialties <Text variant="label" tone="danger">*</Text>
                  </Text>
                  <MultiChipSelect options={categories.map((c) => ({ value: c.id, label: c.name }))} value={field.value} onChange={field.onChange} />
                  <Text variant="caption" tone={fieldState.error ? 'danger' : 'muted'}>
                    {fieldState.error?.message ?? 'Only services in these categories can be booked with this person.'}
                  </Text>
                </View>
              )}
            />

            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Weekly schedule" subtitle="Switch a day off to mark the weekly holiday" compact />
              <Card padding="md">
                {DAYS.map((day, index) => (
                  <Controller
                    key={day}
                    control={control}
                    name={`workingHours.${index}`}
                    render={({ field }) => (
                      <View style={{ gap: spacing.sm }}>
                        {index > 0 ? <Divider spacing="sm" /> : null}
                        <View style={styles.dayRow}>
                          <Text variant="bodyMedium" style={styles.flex}>
                            {DAY_LABELS[day]}
                          </Text>
                          <Text variant="caption" tone={field.value.isOff ? 'muted' : 'success'}>
                            {field.value.isOff ? 'Day off' : 'Working'}
                          </Text>
                          <Switch
                            value={!field.value.isOff}
                            onValueChange={(working) => field.onChange({ ...field.value, isOff: !working })}
                            trackColor={{ true: colors.primary, false: colors.borderStrong }}
                            thumbColor={colors.surface}
                            accessibilityLabel={`${DAY_LABELS[day]} working`}
                          />
                        </View>
                        {field.value.isOff ? null : (
                          <View style={styles.times}>
                            <View style={styles.flex}>
                              <TimeStepper label="Starts" value={field.value.start} onChange={(start) => field.onChange({ ...field.value, start })} max={field.value.end} />
                            </View>
                            <View style={styles.flex}>
                              <TimeStepper label="Ends" value={field.value.end} onChange={(end) => field.onChange({ ...field.value, end })} min={field.value.start} />
                            </View>
                          </View>
                        )}
                        {/* The refine reports on `end`; the parent field's own error would miss it. */}
                        {formState.errors.workingHours?.[index]?.end?.message ? (
                          <Text variant="caption" tone="danger">
                            {formState.errors.workingHours[index]?.end?.message}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  />
                ))}
              </Card>
              {formState.errors.workingHours?.root?.message || formState.errors.workingHours?.message ? (
                <Text variant="caption" tone="danger">
                  {formState.errors.workingHours.root?.message ?? formState.errors.workingHours.message}
                </Text>
              ) : null}
              <Button title="Copy Sunday's hours to all working days" variant="ghost" size="sm" onPress={copySunday} />
            </View>

            <Text variant="caption" tone="muted">
              Changing hours is blocked if it would leave upcoming bookings outside the new schedule.
            </Text>
            <Button title={staffId ? 'Save changes' : 'Add staff member'} size="lg" loading={formState.isSubmitting} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>
      {dialog}
    </Screen>
  );
};

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  times: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
