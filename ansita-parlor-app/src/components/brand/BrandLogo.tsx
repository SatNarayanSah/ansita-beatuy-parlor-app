import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { palette, useTheme } from '@/theme';

interface BrandLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** "A" monogram in a rose disc with a gold ring and sparkle. Drawn in code until a final logo asset exists. */
export const BrandLogo = ({ size = 88, style }: BrandLogoProps) => {
  const { fontFamily, shadows } = useTheme();
  const ring = Math.max(2, Math.round(size * 0.04));
  const sparkle = Math.round(size * 0.26);

  return (
    <View style={[{ width: size, height: size }, style]} accessibilityRole="image" accessibilityLabel="Ansita logo">
      <View
        style={[
          styles.disc,
          shadows.md,
          { borderRadius: size / 2, backgroundColor: palette.rose500, borderColor: palette.gold300, borderWidth: ring },
        ]}
      >
        <Text style={{ fontFamily: fontFamily.headingBold, fontSize: size * 0.5, lineHeight: size * 0.62, color: palette.white }}>
          A
        </Text>
      </View>
      <View style={[styles.sparkle, { top: -sparkle * 0.15, right: -sparkle * 0.15 }]}>
        <Icon name="sparkles" size={sparkle} color={palette.gold300} />
      </View>
    </View>
  );
};

interface BrandWordmarkProps {
  align?: 'center' | 'left';
  tagline?: boolean;
}

export const BrandWordmark = ({ align = 'center', tagline = true }: BrandWordmarkProps) => (
  <View style={{ alignItems: align === 'center' ? 'center' : 'flex-start' }}>
    <Text variant="display" tone="primary" style={styles.wordmark}>
      Ansita
    </Text>
    {tagline ? (
      <Text variant="overline" tone="secondary">
        Beauty Parlour & Training Centre
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  disc: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute' },
  wordmark: { letterSpacing: 1 },
});
