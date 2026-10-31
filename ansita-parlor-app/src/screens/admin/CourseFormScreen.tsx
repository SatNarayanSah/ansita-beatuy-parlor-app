import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';
import type { z } from 'zod';

import { ChipSelect } from '@/components/admin/Pickers';
import { FormInput } from '@/components/form/FormFields';
import { Button, Card, IconButton, ListItem, QueryState, Screen, SectionHeader, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, getErrorMessage, staffService } from '@/services';
import { useTheme } from '@/theme';
import type { CourseLevel, CourseType } from '@/types';
import { courseSchema } from '@/utils/formSchemas';

type Props = RootStackScreenProps<'CourseForm'>;
type Values = z.input<typeof courseSchema>;

const TYPES: readonly { value: CourseType; label: string }[] = [
  { value: 'certification', label: 'Certification' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'workshop', label: 'Workshop' },
];
const LEVELS: readonly { value: CourseLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const EMPTY_MODULE = { title: '', hours: '', topics: '' };

/** Create or edit a course, including its syllabus modules. Batches are managed on the course screen. */
export const CourseFormScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const courseId = route.params?.courseId;

  const query = useServiceQuery(async () => {
    const [staff, course] = await Promise.all([staffService.listStaff({ activeOnly: true }), courseId ? courseService.getCourse(courseId) : null]);
    return { staff, course };
  }, [courseId]);

  const { control, handleSubmit, reset, formState } = useForm<Values, unknown, z.output<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      type: 'certification',
      level: 'beginner',
      duration: '',
      fee: '',
      seats: '10',
      instructor: '',
      description: '',
      certificate: true,
      isActive: true,
      syllabus: [EMPTY_MODULE],
    },
    mode: 'onTouched',
  });
  const modules = useFieldArray({ control, name: 'syllabus' });
  const syllabus = useWatch({ control, name: 'syllabus' });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  useEffect(() => {
    const c = query.data?.course;
    if (!c) return;
    reset({
      title: c.title,
      type: c.type,
      level: c.level,
      duration: c.duration,
      fee: String(c.fee),
      seats: String(c.seats),
      instructor: c.instructor,
      description: c.description,
      certificate: c.certificate,
      isActive: c.isActive,
      syllabus: c.syllabus.map((m) => ({ id: m.id, title: m.title, hours: String(m.hours), topics: m.topics.join(', ') })),
    });
  }, [query.data, reset]);

  const save = handleSubmit(async (values) => {
    const input = {
      ...values,
      image: query.data?.course?.image ?? null,
      syllabus: values.syllabus.map((m) => ({
        ...(m.id ? { id: m.id } : {}),
        title: m.title,
        hours: m.hours,
        topics: m.topics.split(',').map((t) => t.trim()).filter(Boolean),
      })),
    };
    try {
      if (courseId) {
        await courseService.updateCourse(courseId, input);
        toast.success('Course updated');
        allowLeave();
        navigation.goBack();
      } else {
        const created = await courseService.createCourse(input);
        toast.success('Course created. Add a batch next.');
        allowLeave();
        navigation.replace('CourseManage', { courseId: created.id });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  const totalHours = syllabus.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ staff }) => (
          <View style={{ gap: spacing.lg }}>
            <FormInput control={control} name="title" label="Course title" required />
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="secondary">
                    Type
                  </Text>
                  <ChipSelect options={TYPES} value={field.value} onChange={field.onChange} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="level"
              render={({ field }) => (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="secondary">
                    Level
                  </Text>
                  <ChipSelect options={LEVELS} value={field.value} onChange={field.onChange} />
                </View>
              )}
            />
            <View style={styles.row}>
              <FormInput control={control} name="duration" label="Duration" required placeholder="6 weeks" containerStyle={styles.flex} />
              <FormInput control={control} name="fee" label="Fee (Rs.)" required keyboardType="number-pad" containerStyle={styles.flex} />
            </View>
            <FormInput control={control} name="seats" label="Default seats per batch" required keyboardType="number-pad" />
            <Controller
              control={control}
              name="instructor"
              render={({ field, fieldState }) => (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="label" tone="secondary">
                    Instructor <Text variant="label" tone="danger">*</Text>
                  </Text>
                  <ChipSelect options={staff.map((m) => ({ value: m.id, label: m.name }))} value={field.value || null} onChange={field.onChange} />
                  {fieldState.error ? (
                    <Text variant="caption" tone="danger">
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />
            <FormInput control={control} name="description" label="Description" multiline maxLength={400} showCount />

            <Card padding="sm">
              <Controller
                control={control}
                name="certificate"
                render={({ field }) => (
                  <ListItem
                    title="Certificate on completion"
                    leftIcon="ribbon-outline"
                    right={<Switch value={field.value} onValueChange={field.onChange} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.surface} />}
                  />
                )}
              />
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <ListItem
                    title="Visible to customers"
                    leftIcon="eye-outline"
                    right={<Switch value={field.value} onValueChange={field.onChange} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.surface} />}
                  />
                )}
              />
            </Card>

            <View style={{ gap: spacing.md }}>
              <SectionHeader
                title="Syllabus"
                subtitle={`${modules.fields.length} modules · ${totalHours} hours`}
                actionLabel="Add module"
                onAction={() => modules.append(EMPTY_MODULE)}
                compact
              />
              {modules.fields.map((module, index) => (
                <Card key={module.id} variant="outlined" style={{ gap: spacing.sm }}>
                  <View style={styles.row}>
                    <Text variant="label" style={styles.flex}>
                      Module {index + 1}
                    </Text>
                    {modules.fields.length > 1 ? (
                      <IconButton icon="trash-outline" accessibilityLabel={`Remove module ${index + 1}`} size={36} onPress={() => modules.remove(index)} />
                    ) : null}
                  </View>
                  <View style={styles.row}>
                    <FormInput control={control} name={`syllabus.${index}.title`} label="Title" containerStyle={{ flex: 2 }} />
                    <FormInput control={control} name={`syllabus.${index}.hours`} label="Hours" keyboardType="number-pad" containerStyle={styles.flex} />
                  </View>
                  <FormInput control={control} name={`syllabus.${index}.topics`} label="Topics (comma separated)" placeholder="Colour theory, Day makeup, Eye makeup" />
                </Card>
              ))}
              {formState.errors.syllabus?.root?.message ? (
                <Text variant="caption" tone="danger">
                  {formState.errors.syllabus.root.message}
                </Text>
              ) : null}
            </View>

            <Button title={courseId ? 'Save changes' : 'Create course'} size="lg" loading={formState.isSubmitting} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>
      {dialog}
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
