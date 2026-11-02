import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

/** Over the dark backdrop the controls stay white in light and dark mode. */
const ON_BACKDROP = '#FFFFFF';
const BACKDROP = 'rgba(0, 0, 0, 0.92)';

export interface ImageViewerProps {
  /** The image to show full screen; null hides the viewer. */
  uri: string | null;
  onClose: () => void;
  /** Shown under the image, e.g. "Payment screenshot". */
  caption?: string;
}

/** A photo shown as large as the screen allows, e.g. a payment screenshot or a QR code. Tap anywhere to close. */
export const ImageViewer = ({ uri, onClose, caption }: ImageViewerProps) => {
  const { spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={uri !== null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={[styles.root, { backgroundColor: BACKDROP, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close image"
      >
        <View style={[styles.close, { top: insets.top + spacing.sm, right: spacing.lg, borderRadius: radius.pill }]}>
          <Icon name="close" size={26} color={ON_BACKDROP} />
        </View>
        {uri ? <Image source={{ uri }} style={styles.image} contentFit="contain" transition={150} accessibilityLabel={caption} /> : null}
        {caption ? (
          <Text variant="bodySmall" color={ON_BACKDROP} align="center" style={{ paddingHorizontal: spacing.xl }}>
            {caption}
          </Text>
        ) : null}
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', gap: 12 },
  close: { position: 'absolute', zIndex: 1, padding: 8 },
  image: { flex: 1, width: '100%' },
});
