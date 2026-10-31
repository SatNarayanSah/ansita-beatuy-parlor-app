import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, Text, type IconName } from '@/components/ui';
import type { BatchAvailability } from '@/services';
import { useTheme, type Tone } from '@/theme';
import type { Course, CourseType } from '@/types';
import { formatShortDate } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';

export const COURSE_TYPE_META: Record<CourseType, { icon: IconName; tone: Tone }> = {
  certification: { icon: 'ribbon-outline', tone: 'primary' },
  diploma: { icon: 'school-outline', tone: 'accent' },
  workshop: { icon: 'color-wand-outline', tone: 'highlight' },
};

/** The next batch customers can still join. */
export const nextOpenBatch = (availability: readonly BatchAvailability[] | undefined): BatchAvailability | undefined =>
  availability?.filter((item) => item.isOpen).sort((a, b) => a.batch.startDate.localeCompare(b.batch.startDate))[0];

interface CourseCardProps {
  course: Course;
  instructorName?: string;
  availability?: readonly BatchAvailability[];
  onPress: () => void;
  /** Narrow fixed-width card for horizontal rails. */
  compact?: boolean;
}

export const CourseCard = ({ course, instructorName, availability, onPress, compact = false }: CourseCardProps) => {
  const { colors, spacing } = useTheme();
  const meta = COURSE_TYPE_META[course.type];
  const next = nextOpenBatch(availability);

  return (
    <Card onPress={onPress} accessibilityLabel={course.title} style={compact ? styles.compact : undefined}>
      <View style={{ gap: spacing.sm }}>
        <View style={styles.badges}>
          <Badge label={formatEnumLabel(course.type)} tone={meta.tone} icon={meta.icon} size="sm" />
          <Badge label={formatEnumLabel(course.level)} tone="neutral" size="sm" />
        </View>
        <Text variant="h3" numberOfLines={compact ? 2 : undefined} style={compact ? styles.compactTitle : undefined}>
          {course.title}
        </Text>
        {!compact ? (
          <Text variant="bodySmall" tone="secondary" numberOfLines={2}>
            {course.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Icon name="hourglass-outline" size={14} color={colors.textMuted} />
          <Text variant="caption" tone="secondary">
            {course.duration}
          </Text>
          {instructorName && !compact ? (
            <>
              <Icon name="person-outline" size={14} color={colors.textMuted} />
              <Text variant="caption" tone="secondary">
                {instructorName}
              </Text>
            </>
          ) : null}
        </View>
        <View style={[styles.footer, { borderTopColor: colors.border, paddingTop: spacing.sm }]}>
          <Text variant="h4" tone="primary">
            {formatCurrency(course.fee)}
          </Text>
          {availability === undefined ? null : next ? (
            <Text variant="caption" tone={next.seatsLeft <= 3 ? 'warning' : 'success'}>
              {formatShortDate(next.batch.startDate)} · {next.seatsLeft} seats left
            </Text>
          ) : (
            <Text variant="caption" tone="muted">
              No open batch
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  compact: { width: 240 },
  compactTitle: { minHeight: 48 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
});
