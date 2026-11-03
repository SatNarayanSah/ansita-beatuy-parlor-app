import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export interface FieldWrapperProps {
  label?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  /** Right-aligned text on the helper row, e.g. "24/200". */
  counter?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Label + control + error/helper row shared by every form field. */
export const FieldWrapper = ({ label, required, error, helperText, counter, children, style }: FieldWrapperProps) => {
  const { colors, spacing } = useTheme();
  const message = error ?? helperText;

  return (
    <View style={[{ gap: spacing.xs }, style]}>
      {label ? (
        <Text variant="label" tone="secondary">
          {label}
          {required ? <Text variant="label" color={colors.danger}> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {message || counter ? (
        <View style={styles.helperRow}>
          <Text
            variant="caption"
            tone={error ? 'danger' : 'muted'}
            style={styles.helper}
            accessibilityLiveRegion={error ? 'polite' : 'none'}
          >
            {message ?? ''}
          </Text>
          {counter ? (
            <Text variant="caption" tone="muted">
              {counter}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  helperRow: { flexDirection: 'row', gap: 8 },
  helper: { flex: 1 },
});
