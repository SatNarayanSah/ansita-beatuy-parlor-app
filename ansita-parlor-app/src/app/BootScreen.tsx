import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Shown while fonts and persisted stores load. Uses the system font on purpose:
 * the brand fonts may not be ready yet.
 */
export const BootScreen = () => {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
      <Text style={[styles.brand, { color: colors.primaryDark }]}>Ansita</Text>
      <Text style={[styles.tagline, { color: colors.textSecondary, marginTop: spacing.xs }]}>
        Beauty Parlor & Training Center
      </Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: 1 },
  tagline: { fontSize: 12, lineHeight: 16 },
});
