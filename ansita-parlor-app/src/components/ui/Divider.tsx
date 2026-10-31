import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type SpacingKey } from '@/theme';

import { Text } from './Text';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  /** Left inset for list separators (e.g. to align with text after an avatar). */
  inset?: number;
  /** Space above and below (or left and right when vertical). */
  spacing?: SpacingKey;
  /** Centered text such as "or". */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const Divider = ({ orientation = 'horizontal', inset = 0, spacing: gap = 'none', label, style }: DividerProps) => {
  const { colors, spacing } = useTheme();
  const margin = spacing[gap];

  if (orientation === 'vertical') {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: margin }, style]}
      />
    );
  }

  if (label) {
    return (
      <View style={[styles.labelRow, { marginVertical: margin }, style]}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset, marginVertical: margin }, style]}
    />
  );
};

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
