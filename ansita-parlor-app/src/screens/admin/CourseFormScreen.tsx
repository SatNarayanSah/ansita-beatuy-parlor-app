import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ChipSelect } from '@/components/admin/Pickers';
import { Button, Card, IconButton, Input, ListItem, QueryState, Screen, SectionHeader, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, getErrorMessage, staffService, type SyllabusModuleInput } from '@/services';
import { useTheme } from '@/theme';
import type { CourseLevel, CourseType } from '@/types';

type Props = RootStackScreenProps<'CourseForm'>;

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

interface ModuleDraft {
  id?: string;
  title: string;
  hours: string;
  topics: string;
}

/** Create or edit a course, including its syllabus modules. Batches are managed on the course screen. */
export const CourseFormScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const courseId = route.params?.courseId;

  const query = useServiceQuery(async () => {
    const [staff, course] = await Promise.all([staffService.listStaff({ activeOnly: true }), courseId ? courseService.getCourse(courseId) : null]);
    return { staff, course };
  }, [courseId]);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<CourseType>('certification');
  const [level, setLevel] = useState<CourseLevel>('beginner');
  const [duration, setDuration] = useState('');
  const [fee, setFee] = useState('');
  const [seats, setSeats] = useState('10');
  const [instructor, setInstructor] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [certificate, setCertificate] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [modules, setModules] = useState<ModuleDraft[]>([{ title: '', hours: '', topics: '' }]);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = query.data?.course;
    if (!c) return;
    setTitle(c.title);
    setType(c.type);
    setLevel(c.level);
    setDuration(c.duration);
    setFee(String(c.fee));
    setSeats(String(c.seats));
    setInstructor(c.instructor);
    setDescription(c.description);
    setCertificate(c.certificate);
    setIsActive(c.isActive);
    setModules(c.syllabus.map((m) => ({ id: m.id, title: m.title, hours: String(m.hours), topics: m.topics.join(', ') })));
  }, [query.data]);

  const errors = {
    title: title.trim().length < 3 ? 'Enter a course title' : null,
    duration: duration.trim() ? null : 'e.g. "6 weeks"',
    fee: /^\d+$/.test(fee) && Number(fee) > 0 ? null : 'Enter the fee in rupees',
    seats: /^\d+$/.test(seats) && Number(seats) > 0 ? null : 'At least 1 seat',
    instructor: instructor ? null : 'Choose an instructor',
    modules: modules.every((m) => m.title.trim() && /^\d+$/.test(m.hours) && Number(m.hours) > 0) ? null : 'Every module needs a title and hours',
  };
  const valid = Object.values(errors).every((e) => e === null);
  const show = (error: string | null) => (touched ? error : null);

  const updateModule = (index: number, patch: Partial<ModuleDraft>): void =>
    setModules((current) => current.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const save = async (): Promise<void> => {
    setTouched(true);
    if (!valid || !instructor) return;
    setSaving(true);
    const syllabus: SyllabusModuleInput[] = modules.map((m) => ({
      ...(m.id ? { id: m.id } : {}),
      title: m.title.trim(),
      hours: Number(m.hours),
      topics: m.topics.split(',').map((t) => t.trim()).filter(Boolean),
    }));
    const input = {
      title: title.trim(),
      type,
      level,
      duration: duration.trim(),
      fee: Number(fee),
      seats: Number(seats),
      instructor,
      description: description.trim(),
      certificate,
      isActive,
      image: query.data?.course?.image ?? null,
      syllabus,
    };
    try {
      if (courseId) {
        await courseService.updateCourse(courseId, input);
        toast.success('Course updated');
        navigation.goBack();
      } else {
        const created = await courseService.createCourse(input);
        toast.success('Course created. Add a batch next.');
        navigation.replace('CourseManage', { courseId: created.id });
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ staff }) => (
          <View style={{ gap: spacing.lg }}>
            <Input label="Course title" required value={title} onChangeText={setTitle} error={show(errors.title)} />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Type
              </Text>
              <ChipSelect options={TYPES} value={type} onChange={setType} />
              <Text variant="label" tone="secondary">
                Level
              </Text>
              <ChipSelect options={LEVELS} value={level} onChange={setLevel} />
            </View>
            <View style={styles.row}>
              <Input label="Duration" required value={duration} onChangeText={setDuration} placeholder="6 weeks" error={show(errors.duration)} containerStyle={styles.flex} />
              <Input label="Fee (Rs.)" required value={fee} onChangeText={(t) => setFee(t.replace(/\D/g, ''))} keyboardType="number-pad" error={show(errors.fee)} containerStyle={styles.flex} />
            </View>
            <Input label="Default seats per batch" value={seats} onChangeText={(t) => setSeats(t.replace(/\D/g, ''))} keyboardType="number-pad" error={show(errors.seats)} />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Instructor
              </Text>
              <ChipSelect options={staff.map((m) => ({ value: m.id, label: m.name }))} value={instructor} onChange={setInstructor} />
              {show(errors.instructor) ? (
                <Text variant="caption" tone="danger">
                  {errors.instructor}
                </Text>
              ) : null}
            </View>
            <Input label="Description" value={description} onChangeText={setDescription} multiline maxLength={400} showCount />

            <Card padding="sm">
              <ListItem
                title="Certificate on completion"
                leftIcon="ribbon-outline"
                right={<Switch value={certificate} onValueChange={setCertificate} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.surface} />}
              />
              <ListItem
                title="Visible to customers"
                leftIcon="eye-outline"
                right={<Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.surface} />}
              />
            </Card>

            <View style={{ gap: spacing.md }}>
              <SectionHeader
                title="Syllabus"
                subtitle={`${modules.length} modules · ${modules.reduce((sum, m) => sum + (Number(m.hours) || 0), 0)} hours`}
                actionLabel="Add module"
                onAction={() => setModules((current) => [...current, { title: '', hours: '', topics: '' }])}
                compact
              />
              {modules.map((module, index) => (
                <Card key={module.id ?? `new-${index}`} variant="outlined" style={{ gap: spacing.sm }}>
                  <View style={styles.row}>
                    <Text variant="label" style={styles.flex}>
                      Module {index + 1}
                    </Text>
                    {modules.length > 1 ? (
                      <IconButton icon="trash-outline" accessibilityLabel={`Remove module ${index + 1}`} size={32} onPress={() => setModules((current) => current.filter((_, i) => i !== index))} />
                    ) : null}
                  </View>
                  <View style={styles.row}>
                    <Input label="Title" value={module.title} onChangeText={(t) => updateModule(index, { title: t })} containerStyle={{ flex: 2 }} />
                    <Input label="Hours" value={module.hours} onChangeText={(t) => updateModule(index, { hours: t.replace(/\D/g, '') })} keyboardType="number-pad" containerStyle={styles.flex} />
                  </View>
                  <Input label="Topics (comma separated)" value={module.topics} onChangeText={(t) => updateModule(index, { topics: t })} placeholder="Colour theory, Day makeup, Eye makeup" />
                </Card>
              ))}
              {show(errors.modules) ? (
                <Text variant="caption" tone="danger">
                  {errors.modules}
                </Text>
              ) : null}
            </View>

            <Button title={courseId ? 'Save changes' : 'Create course'} size="lg" loading={saving} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
