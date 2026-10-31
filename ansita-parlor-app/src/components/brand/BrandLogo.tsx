import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';

// Light, squared copy of the client's assets/logo.png (the original is ~1.4 MB).
const LOGO = require('../../../assets/logo-app.png');

interface BrandLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** The parlour's badge logo (अंशिता ब्युटी पार्लर तथा प्रशिक्षण केन्द्र, जनकपुर-८). */
export const BrandLogo = ({ size = 88, style }: BrandLogoProps) => (
  <View style={[{ width: size, height: size }, style]} accessibilityRole="image" accessibilityLabel="Ansita Beauty Parlour logo">
    <Image source={LOGO} style={{ width: size, height: size }} contentFit="contain" cachePolicy="memory" />
  </View>
);

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
        Beauty Parlour & Training Centre · Janakpur
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wordmark: { letterSpacing: 1 },
});
