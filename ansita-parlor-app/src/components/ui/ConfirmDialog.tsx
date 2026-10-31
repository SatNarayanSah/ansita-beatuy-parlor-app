import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { getToneColors, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" shows a red icon and confirm button for destructive actions. */
  tone?: 'default' | 'danger';
  icon?: IconName;
  /** Keeps the dialog open with a spinner while an async confirm runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Centered modal asking the user to confirm an action. */
export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { colors, radius, spacing, shadows } = useTheme();
  const tones = getToneColors(colors, tone === 'danger' ? 'danger' : 'primary');
  const glyph: IconName = icon ?? (tone === 'danger' ? 'trash-outline' : 'help-circle-outline');

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={loading ? undefined : onCancel}>
      <Animated.View entering={FadeIn.duration(160)} style={[styles.backdrop, { backgroundColor: colors.overlay, padding: spacing.xxl }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={loading ? undefined : onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dialog"
        />
        <Animated.View
          entering={ZoomIn.duration(180)}
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            shadows.lg,
            { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xxl, gap: spacing.md },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: tones.bg }]}>
            <Icon name={glyph} size={26} color={tones.fg} />
          </View>
          <Text variant="h2" align="center">
            {title}
          </Text>
          {message ? (
            <Text variant="body" tone="secondary" align="center">
              {message}
            </Text>
          ) : null}
          <View style={[styles.actions, { marginTop: spacing.sm, gap: spacing.sm }]}>
            <Button title={cancelLabel} variant="outline" onPress={onCancel} disabled={loading} style={styles.action} fullWidth />
            <Button
              title={confirmLabel}
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={styles.action}
              fullWidth
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 380, alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignSelf: 'stretch' },
  action: { flex: 1 },
});
