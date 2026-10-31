import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { getInitials } from '@/utils/format';

import { Icon } from './Icon';
import { Text } from './Text';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 44, lg: 60, xl: 88 };

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: AvatarSize | number;
  /** Rose ring, e.g. for the signed-in user or VIP customers. */
  ring?: boolean;
  /** Shows a camera badge, for profile photo editing. */
  editable?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Stable hash so the same name always gets the same background colour. */
const hashName = (name: string): number =>
  Array.from(name).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);

/** Photo avatar that falls back to coloured initials when there is no (or a broken) image. */
export const Avatar = ({ name, uri, size = 'md', ring = false, editable = false, onPress, style }: AvatarProps) => {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const dimension = typeof size === 'number' ? size : SIZES[size];
  const showImage = Boolean(uri) && uri !== failedUri;
  const background = colors.avatar[hashName(name) % colors.avatar.length] ?? colors.primarySoft;
  const fontSize = Math.max(10, Math.round(dimension * 0.38));

  const content = (
    <View
      style={[
        styles.circle,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: background,
          borderWidth: ring ? 2 : 0,
          borderColor: colors.primary,
        },
      ]}
    >
      {showImage && uri ? (
        <Image
          source={{ uri }}
          onError={() => setFailedUri(uri)}
          style={{ width: '100%', height: '100%', borderRadius: dimension / 2 }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text variant="label" color={colors.accent} style={{ fontSize, lineHeight: fontSize * 1.2 }}>
          {getInitials(name) || '?'}
        </Text>
      )}
    </View>
  );

  const badgeSize = Math.max(18, Math.round(dimension * 0.32));
  const editBadge = editable ? (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: colors.primary,
          borderColor: colors.surface,
        },
      ]}
    >
      <Icon name="camera" size={Math.round(badgeSize * 0.55)} color={colors.onPrimary} />
    </View>
  ) : null;

  if (!onPress) {
    return (
      <View style={style} accessibilityRole="image" accessibilityLabel={name}>
        {content}
        {editBadge}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={editable ? `Change photo for ${name}` : name}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {content}
      {editBadge}
    </Pressable>
  );
};

// ---------- AvatarGroup ----------

interface AvatarGroupProps {
  names: readonly string[];
  max?: number;
  size?: AvatarSize;
}

/** Overlapping avatars, e.g. students in a batch. */
export const AvatarGroup = ({ names, max = 4, size = 'sm' }: AvatarGroupProps) => {
  const { colors } = useTheme();
  const dimension = SIZES[size];
  const visible = names.slice(0, max);
  const extra = names.length - visible.length;

  return (
    <View style={styles.group}>
      {visible.map((name, index) => (
        <View
          key={`${name}-${index}`}
          style={[styles.groupItem, { marginLeft: index === 0 ? 0 : -dimension * 0.3, borderColor: colors.surface, borderRadius: dimension }]}
        >
          <Avatar name={name} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={[
            styles.circle,
            styles.groupItem,
            {
              width: dimension + 4,
              height: dimension + 4,
              borderRadius: dimension,
              marginLeft: -dimension * 0.3,
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.surface,
            },
          ]}
        >
          <Text variant="caption" tone="secondary">
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badge: { position: 'absolute', right: -2, bottom: -2, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  pressed: { opacity: 0.8 },
  group: { flexDirection: 'row', alignItems: 'center' },
  groupItem: { borderWidth: 2 },
});
