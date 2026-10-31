import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

/**
 * Fire-and-forget haptics. No-ops on web, when the user switched haptics off,
 * or on devices without a vibration motor.
 */
const enabled = (): boolean => Platform.OS !== 'web' && useSettingsStore.getState().hapticsEnabled;

const safely = (run: () => Promise<void>): void => {
  if (!enabled()) return;
  run().catch(() => undefined);
};

export const haptics = {
  /** Picking a chip, tab, segment or star. */
  selection: (): void => safely(() => Haptics.selectionAsync()),
  /** Pressing a primary action such as a FAB. */
  tap: (): void => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: (): void => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: (): void => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: (): void => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
