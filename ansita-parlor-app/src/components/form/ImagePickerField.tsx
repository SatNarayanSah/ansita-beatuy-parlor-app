import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, BottomSheet, Icon, ListItem, Text } from '@/components/ui';
import { usePhotoPicker } from '@/hooks/usePhotoPicker';
import { useTheme } from '@/theme';

/** iOS cannot present the picker while the sheet's modal is still dismissing. */
const SHEET_EXIT_MS = 350;
/** Text on the dark badge over a photo, the same in light and dark mode. */
const ON_PHOTO = '#FFFFFF';

interface ImagePickerFieldProps {
  label: string;
  /** A saved URL, a photo just picked on this phone (local URI), or null. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** `avatar`: round, square crop (people). `cover`: wide 4:3 picture (services, courses). */
  variant?: 'avatar' | 'cover';
  /** Name for the initials shown while an avatar has no photo. */
  name?: string;
  helperText?: string;
}

/**
 * Photo field for forms. The picked photo stays on the phone until the form is saved;
 * the service then uploads it and stores the link (see `withUploadedImage`).
 */
export const ImagePickerField = ({ label, value, onChange, variant = 'cover', name = '', helperText }: ImagePickerFieldProps) => {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const { pickFromLibrary, takePhoto } = usePhotoPicker({ aspect: variant === 'avatar' ? [1, 1] : [4, 3] });

  const choose = async (getUri: () => Promise<string | null>): Promise<void> => {
    setOpen(false);
    await new Promise((resolve) => setTimeout(resolve, SHEET_EXIT_MS));
    const uri = await getUri();
    if (uri) onChange(uri);
  };

  const action = value ? 'Change photo' : 'Add photo';

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      {variant === 'avatar' ? (
        <View style={[styles.row, { gap: spacing.md }]}>
          <Avatar name={name || '?'} uri={value} size="xl" editable onPress={() => setOpen(true)} />
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8}>
            <Text variant="label" tone="primary">
              {action}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={() => setOpen(true)}
          style={[styles.cover, { borderRadius: radius.lg, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
        >
          {value ? (
            <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <View style={[styles.empty, { gap: spacing.xs }]}>
              <Icon name="image-outline" size={28} color={colors.textMuted} />
              <Text variant="bodySmall" tone="muted">
                Tap to add a photo
              </Text>
            </View>
          )}
          {value ? (
            <View style={[styles.badge, { backgroundColor: colors.overlay, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }]}>
              <Icon name="camera-outline" size={14} color={ON_PHOTO} />
              <Text variant="caption" color={ON_PHOTO}>
                Change
              </Text>
            </View>
          ) : null}
        </Pressable>
      )}
      {helperText ? (
        <Text variant="caption" tone="muted">
          {helperText}
        </Text>
      ) : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View>
          <ListItem title="Choose from gallery" leftIcon="images-outline" onPress={() => void choose(pickFromLibrary)} />
          <ListItem title="Take a photo" leftIcon="camera-outline" onPress={() => void choose(takePhoto)} />
          {value ? (
            <ListItem
              title="Remove photo"
              leftIcon="trash-outline"
              destructive
              onPress={() => {
                setOpen(false);
                onChange(null);
              }}
            />
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cover: { aspectRatio: 4 / 3, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center' },
  badge: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
});
