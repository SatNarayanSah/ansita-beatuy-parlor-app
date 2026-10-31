import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, type ThemeColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  /** Auto-hide delay in ms (default 3000; 5000 when an action is present). */
  duration?: number;
  action?: { label: string; onPress: () => void };
}

interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'type' | 'duration'>> {
  id: number;
  action?: ToastOptions['action'];
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TYPE_META: Record<ToastType, { icon: IconName; color: (colors: ThemeColors) => string }> = {
  success: { icon: 'checkmark-circle', color: (c) => c.success },
  error: { icon: 'alert-circle', color: (c) => c.danger },
  info: { icon: 'information-circle', color: (c) => c.info },
  warning: { icon: 'warning', color: (c) => c.warning },
};

/** Hosts a single snackbar at the bottom of the screen. Newer toasts replace older ones. */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const nextId = useRef(0);

  const hide = useCallback(() => setToast(null), []);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({
      id: nextId.current,
      message: options.message,
      type: options.type ?? 'info',
      duration: options.duration ?? (options.action ? 5000 : 3000),
      action: options.action,
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      hide,
      success: (message) => show({ message, type: 'success' }),
      error: (message) => show({ message, type: 'error' }),
      info: (message) => show({ message, type: 'info' }),
    }),
    [show, hide],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastHost toast={toast} onHide={hide} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
};

interface ToastHostProps {
  toast: ToastItem | null;
  onHide: () => void;
}

const ToastHost = ({ toast, onHide }: ToastHostProps) => {
  const { colors, radius, spacing, shadows, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onHide, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onHide]);

  if (!toast) return null;
  const meta = TYPE_META[toast.type];
  // Dark snackbar on light theme and vice versa, for contrast against content.
  const background = isDark ? colors.surfaceRaised : colors.text;
  const textColor = isDark ? colors.text : colors.textInverse;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.lg }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[
          styles.toast,
          shadows.lg,
          { backgroundColor: background, borderRadius: radius.md, paddingHorizontal: spacing.lg, gap: spacing.md },
        ]}
      >
        <Icon name={meta.icon} size={20} color={meta.color(colors)} />
        <Text variant="bodySmall" color={textColor} style={styles.message}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              toast.action?.onPress();
              onHide();
            }}
            hitSlop={8}
          >
            <Text variant="label" color={isDark ? colors.primary : colors.primaryMuted}>
              {toast.action.label.toUpperCase()}
            </Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onHide} hitSlop={8}>
            <Icon name="close" size={18} color={textColor} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0 },
  toast: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 12 },
  message: { flex: 1 },
});
