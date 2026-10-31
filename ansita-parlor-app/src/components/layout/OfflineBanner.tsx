import { Pressable, StyleSheet } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components/ui';
import { useApiConfig } from '@/hooks/useApiConfig';
import { configureApi } from '@/services';
import { useTheme } from '@/theme';

/**
 * Shown while the demo "offline" switch is on (Settings → Demo). Every request
 * then fails, so each screen's error state can be shown. Tap to go back online.
 */
export const OfflineBanner = () => {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { offline } = useApiConfig();

  if (!offline) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(250)}
      exiting={SlideOutUp.duration(200)}
      style={[styles.banner, { backgroundColor: colors.text, paddingTop: insets.top + spacing.xs }]}
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={() => configureApi({ offline: false })}
        accessibilityRole="button"
        accessibilityLabel="You are offline. Tap to reconnect."
        style={[styles.content, { paddingBottom: spacing.sm, paddingHorizontal: spacing.lg }]}
      >
        <Icon name="cloud-offline-outline" size={16} color={colors.textInverse} />
        <Text variant="label" color={colors.textInverse} style={styles.flex}>
          You’re offline (demo)
        </Text>
        <Text variant="caption" color={colors.textInverse}>
          Tap to reconnect
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
