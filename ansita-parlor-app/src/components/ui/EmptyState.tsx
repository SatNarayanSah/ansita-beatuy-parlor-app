import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getToneColors, useTheme, type Tone } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tone?: Tone;
  /** Smaller illustration for use inside cards. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface SparkleProps {
  size: number;
  color: string;
  style: ViewStyle;
}

const Sparkle = ({ size, color, style }: SparkleProps) => (
  <View style={[styles.sparkle, style]} pointerEvents="none">
    <Icon name="sparkles" size={size} color={color} />
  </View>
);

/**
 * Friendly placeholder for empty lists and first-run screens. The illustration
 * is drawn from shapes and icons so it scales and themes without image assets.
 */
export const EmptyState = ({
  icon = 'flower-outline',
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tone = 'primary',
  compact = false,
  style,
}: EmptyStateProps) => {
  const { colors, spacing } = useTheme();
  const tones = getToneColors(colors, tone);
  const outer = compact ? 80 : 112;
  const inner = compact ? 56 : 76;

  return (
    <Animated.View entering={FadeIn.duration(250)} style={[styles.container, { padding: compact ? spacing.md : spacing.xl, gap: spacing.sm }, style]}>
      <View style={[styles.illustration, { width: outer + 16, height: outer + 16 }]}>
        <View style={[styles.circle, { width: outer, height: outer, borderRadius: outer / 2, backgroundColor: tones.bg }]}>
          <View
            style={[
              styles.circle,
              { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.surface, borderColor: tones.bg },
            ]}
          >
            <Icon name={icon} size={compact ? 24 : 34} color={tones.fg} />
          </View>
        </View>
        <Sparkle size={compact ? 14 : 18} color={colors.highlight} style={{ top: 6, right: 10 }} />
        <Sparkle size={compact ? 10 : 12} color={colors.primaryMuted} style={{ bottom: 14, left: 6 }} />
        <View style={[styles.dot, { backgroundColor: colors.highlight, top: compact ? 30 : 40, left: 4 }]} />
        <View style={[styles.dot, { backgroundColor: colors.primaryMuted, bottom: 4, right: compact ? 24 : 36 }]} />
      </View>

      <Text variant={compact ? 'h3' : 'h2'} align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="secondary" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.xs, alignSelf: 'center' }} />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <Button title={secondaryActionLabel} onPress={onSecondaryAction} variant="ghost" size="sm" style={styles.center} />
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  illustration: { alignItems: 'center', justifyContent: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'transparent' },
  sparkle: { position: 'absolute' },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  message: { maxWidth: 300 },
  center: { alignSelf: 'center' },
});
