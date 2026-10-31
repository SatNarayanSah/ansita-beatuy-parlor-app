import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getToneColors, useTheme, type Tone } from '@/theme';
import type { AppointmentStatus, EnrollmentStatus, PaymentStatus } from '@/types';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeVariant = 'soft' | 'solid' | 'outline';

export interface BadgeProps {
  label: string;
  tone?: Tone;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: IconName;
  /** Small coloured dot before the label. */
  dot?: boolean;
  /** Explicit colours (used by StatusPill for theme status tokens). */
  colors?: { fg: string; bg: string };
  style?: StyleProp<ViewStyle>;
}

/** Compact label for statuses, tags and categories. */
export const Badge = ({ label, tone = 'neutral', variant = 'soft', size = 'md', icon, dot = false, colors: override, style }: BadgeProps) => {
  const { colors, radius } = useTheme();
  const tones = getToneColors(colors, tone);
  const fg = override?.fg ?? tones.fg;
  const bg = override?.bg ?? tones.bg;

  const background = variant === 'solid' ? fg : variant === 'soft' ? bg : 'transparent';
  const textColor = variant === 'solid' ? tones.on : fg;

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.base,
        size === 'sm' ? styles.small : styles.medium,
        { backgroundColor: background, borderColor: variant === 'outline' ? fg : 'transparent', borderRadius: radius.pill },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: textColor }]} /> : null}
      {icon ? <Icon name={icon} size={size === 'sm' ? 11 : 13} color={textColor} /> : null}
      <Text variant={size === 'sm' ? 'caption' : 'label'} color={textColor} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

// ---------- StatusPill ----------

type StatusPillProps =
  | { kind: 'appointment'; status: AppointmentStatus; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> }
  | { kind: 'payment'; status: PaymentStatus; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> }
  | { kind: 'enrollment'; status: EnrollmentStatus; size?: 'sm' | 'md'; style?: StyleProp<ViewStyle> };

const APPOINTMENT_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const PAYMENT_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: 'Unpaid', tone: 'danger' },
  partial: { label: 'Partly paid', tone: 'warning' },
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

const ENROLLMENT_META: Record<EnrollmentStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Fee pending', tone: 'warning' },
  active: { label: 'Active', tone: 'primary' },
  completed: { label: 'Completed', tone: 'success' },
  dropped: { label: 'Dropped', tone: 'neutral' },
};

/** Status badge with consistent labels and colours across the app. */
export const StatusPill = (props: StatusPillProps) => {
  const { colors } = useTheme();
  const { size = 'md', style } = props;

  switch (props.kind) {
    case 'appointment':
      return (
        <Badge label={APPOINTMENT_LABELS[props.status]} colors={colors.status[props.status]} size={size} dot style={style} />
      );
    case 'payment': {
      const meta = PAYMENT_META[props.status];
      return <Badge label={meta.label} tone={meta.tone} size={size} dot style={style} />;
    }
    case 'enrollment': {
      const meta = ENROLLMENT_META[props.status];
      return <Badge label={meta.label} tone={meta.tone} size={size} dot style={style} />;
    }
  }
};

// ---------- CountBadge ----------

interface CountBadgeProps {
  count: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
}

/** Red count bubble for tab icons and icon buttons. */
export const CountBadge = ({ count, max = 99, style }: CountBadgeProps) => {
  const { colors } = useTheme();
  if (count <= 0) return null;
  return (
    <View
      accessibilityLabel={`${count} unread`}
      style={[styles.count, { backgroundColor: colors.danger, borderColor: colors.surface }, style]}
    >
      <Text variant="caption" color={colors.textInverse} style={styles.countText}>
        {count > max ? `${max}+` : String(count)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, borderWidth: 1 },
  small: { paddingHorizontal: 8, paddingVertical: 2 },
  medium: { paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  count: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 10, lineHeight: 13 },
});
