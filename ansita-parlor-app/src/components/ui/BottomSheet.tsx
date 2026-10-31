import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky area below the content, e.g. action buttons. */
  footer?: ReactNode;
  /** Wrap content in a ScrollView (default). Disable for content that scrolls itself. */
  scrollable?: boolean;
  /** Maximum height as a fraction of the screen. */
  maxHeightRatio?: number;
  /** When false, backdrop taps and drags do not close the sheet. */
  dismissible?: boolean;
}

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 1.1;

/**
 * Modal sheet that slides up from the bottom. Close by tapping the backdrop,
 * the close button, hardware back, or dragging the handle down.
 */
export const BottomSheet = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scrollable = true,
  maxHeightRatio = 0.88,
  dismissible = true,
}: BottomSheetProps) => {
  const { colors, radius, spacing, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(screenHeight);
  const backdrop = useSharedValue(0);

  // Mount immediately on open; unmount only after the exit animation finishes.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = screenHeight;
      translateY.value = withSpring(0, { damping: 22, stiffness: 220, overshootClamping: true });
      backdrop.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(screenHeight, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => dismissible && gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          translateY.value = Math.max(0, gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
            onClose();
          } else {
            translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
          }
        },
        onPanResponderTerminate: () => {
          translateY.value = withSpring(0, { damping: 20, stiffness: 240 });
        },
      }),
    [dismissible, onClose, translateY],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  const body = scrollable ? (
    <ScrollView
      bounces={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flexShrink, { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg }]}>{children}</View>
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissible ? onClose : undefined}
    >
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissible ? onClose : undefined}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            shadows.lg,
            {
              maxHeight: screenHeight * maxHeightRatio,
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingBottom: insets.bottom,
            },
            sheetStyle,
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            </View>
            {title ? (
              <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingBottom: spacing.md }]}>
                <View style={styles.headerText}>
                  <Text variant="h2" accessibilityRole="header">
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text variant="bodySmall" tone="secondary">
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} variant="soft" size={34} />
              </View>
            ) : null}
          </View>

          {body}

          {footer ? (
            <View
              style={[
                styles.footer,
                { borderTopColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  handle: { width: 40, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  flexShrink: { flexShrink: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
});
