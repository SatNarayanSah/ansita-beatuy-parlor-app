import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COURSE_TYPE_META } from '@/components/customer/CourseCards';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  QueryState,
  RatingStars,
  Screen,
  SectionHeader,
  Skeleton,
  SkeletonText,
  Text,
} from '@/components/ui';
import { useStaffMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { courseService, enrollmentService } from '@/services';
import { useCourseStore } from '@/store';
import { useTheme } from '@/theme';
import type { SyllabusModule } from '@/types';
import { formatShortDate, formatTimeRange } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';

type Props = RootStackScreenProps<'CourseDetail'>;

const ModuleRow = ({ module, index }: { module: SyllabusModule; index: number }) => {
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(index === 0);
  return (
    <View>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[styles.moduleHead, { paddingVertical: spacing.md }]}
      >
        <View style={[styles.moduleNumber, { backgroundColor: colors.primarySoft }]}>
          <Text variant="label" tone="primary">
            {index + 1}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{module.title}</Text>
          <Text variant="caption" tone="muted">
            {module.hours} hours · {module.topics.length} topics
          </Text>
        </View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn} style={{ paddingLeft: 44, paddingBottom: spacing.md, gap: 4 }}>
          {module.topics.map((topic) => (
            <View key={topic} style={styles.topic}>
              <Icon name="ellipse" size={6} color={colors.primary} />
              <Text variant="bodySmall" tone="secondary">
                {topic}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
};

export const CourseDetailScreen = ({ navigation, route }: Props) => {
  const { colors, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const staff = useStaffMap();
  const { courseId } = route.params;

  const query = useServiceQuery(
    async () => {
      const [course, availability, mine] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.getBatchAvailability(courseId),
        enrollmentService.listEnrollments({ courseId }),
      ]);
      return { course, availability, enrollment: mine.find((e) => e.status === 'active' || e.status === 'pending') };
    },
    [courseId],
    { refetchOn: [useCourseStore] },
  );

  const openBatches = query.data?.availability.filter((item) => item.isOpen) ?? [];
  const cta = query.data ? (
    <View style={[styles.sticky, shadows.lg, { backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.flex}>
        <Text variant="caption" tone="muted">
          Course fee
        </Text>
        <Text variant="h3" tone="primary">
          {formatCurrency(query.data.course.fee)}
        </Text>
      </View>
      {query.data.enrollment ? (
        <Button title="My enrollment" variant="secondary" rightIcon="arrow-forward" onPress={() => navigation.navigate('CustomerTabs', { screen: 'Courses', params: { view: 'mine' } })} />
      ) : (
        <Button
          title={openBatches.length ? t('courses.enroll') : 'No open batch'}
          size="lg"
          disabled={openBatches.length === 0}
          onPress={() => navigation.navigate('Enroll', { courseId })}
        />
      )}
    </View>
  ) : null;

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()} overlay={cta}>
      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.lg }}>
            <Skeleton height={150} radius={radius.xl} />
            <SkeletonText lines={5} />
          </View>
        }
      >
        {({ course, availability, enrollment }) => {
          const instructor = staff.get(course.instructor);
          const meta = COURSE_TYPE_META[course.type];
          const totalHours = course.syllabus.reduce((sum, module) => sum + module.hours, 0);
          return (
            <View style={{ gap: spacing.xl }}>
              <View style={[styles.hero, { backgroundColor: colors.accentSoft, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm }]}>
                <View style={styles.badges}>
                  <Badge label={formatEnumLabel(course.type)} tone={meta.tone} icon={meta.icon} size="sm" />
                  <Badge label={formatEnumLabel(course.level)} tone="neutral" size="sm" />
                  {course.certificate ? <Badge label="Certificate" tone="success" icon="ribbon-outline" size="sm" /> : null}
                </View>
                <Text variant="h1">{course.title}</Text>
                <Text variant="bodySmall" tone="secondary">
                  {course.duration} · {totalHours} hours of training
                </Text>
                {enrollment ? <Badge label={enrollment.status === 'pending' ? 'Seat reserved' : 'You are enrolled'} tone="primary" icon="checkmark-circle" /> : null}
              </View>

              <Text variant="body" tone="secondary">
                {course.description}
              </Text>

              {instructor ? (
                <View style={{ gap: spacing.md }}>
                  <SectionHeader title={t('courses.instructor')} compact />
                  <Card padding="md" style={styles.instructor}>
                    <Avatar name={instructor.name} uri={instructor.avatar} size="lg" ring />
                    <View style={styles.flex}>
                      <Text variant="h4">{instructor.name}</Text>
                      <Text variant="caption" tone="secondary">
                        {formatEnumLabel(instructor.role)}
                      </Text>
                      <RatingStars value={instructor.rating} showValue size={13} />
                    </View>
                  </Card>
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                <SectionHeader title={t('courses.syllabus')} subtitle={`${course.syllabus.length} modules`} compact />
                <Card padding="md">
                  {course.syllabus.map((module, index) => (
                    <View key={module.id}>
                      {index > 0 ? <Divider /> : null}
                      <ModuleRow module={module} index={index} />
                    </View>
                  ))}
                </Card>
              </View>

              <View style={{ gap: spacing.md }}>
                <SectionHeader title={t('courses.batches')} compact />
                {availability.map(({ batch, seatsLeft, isOpen, isFull }) => (
                  <Card key={batch.id} variant={isOpen ? 'elevated' : 'filled'} style={{ gap: spacing.xs, opacity: isOpen ? 1 : 0.7 }}>
                    <View style={styles.batchHead}>
                      <Text variant="h4" style={styles.flex}>
                        {batch.name}
                      </Text>
                      <Badge
                        label={batch.status === 'completed' ? 'Finished' : isFull ? 'Full' : `${seatsLeft} ${t('courses.seatsLeft')}`}
                        tone={batch.status === 'completed' ? 'neutral' : isFull ? 'danger' : seatsLeft <= 3 ? 'warning' : 'success'}
                        size="sm"
                      />
                    </View>
                    <Text variant="bodySmall" tone="secondary">
                      {formatShortDate(batch.startDate)} - {formatShortDate(batch.endDate)} · {formatEnumLabel(batch.status)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {batch.days.map(formatEnumLabel).join(', ')} · {formatTimeRange(batch.startTime, batch.endTime)}
                    </Text>
                  </Card>
                ))}
              </View>
              <View style={{ height: 80 }} />
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  hero: {},
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  instructor: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  moduleHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moduleNumber: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  batchHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16 },
});
