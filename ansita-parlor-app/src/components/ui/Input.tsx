import { useState, type ReactNode, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { FieldWrapper } from './FieldWrapper';
import { Icon, type IconName } from './Icon';

export interface InputProps extends Omit<TextInputProps, 'style' | 'editable'> {
  label?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  rightIconLabel?: string;
  /** Custom node on the left, e.g. the PhoneInput country selector. */
  leftAccessory?: ReactNode;
  disabled?: boolean;
  /** Shows "12/200" when `maxLength` is set. */
  showCount?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInputInstance>;
}

/**
 * Text field with label, icons, error and helper text.
 * `secureTextEntry` automatically adds a show/hide password toggle.
 */
export const Input = ({
  label,
  required,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  rightIconLabel,
  leftAccessory,
  disabled = false,
  showCount = false,
  containerStyle,
  secureTextEntry,
  multiline,
  maxLength,
  value,
  onFocus,
  onBlur,
  ref,
  ...inputProps
}: InputProps) => {
  const { colors, radius, typography, spacing } = useTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isPassword = secureTextEntry === true;
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  const counter = showCount && maxLength ? `${value?.length ?? 0}/${maxLength}` : undefined;

  return (
    <FieldWrapper
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      counter={counter}
      style={containerStyle}
    >
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderRadius: radius.md,
            backgroundColor: disabled ? colors.surfaceAlt : colors.surface,
            minHeight: multiline ? 100 : 50,
            paddingHorizontal: spacing.md,
            borderWidth: focused || error ? 1.5 : 1,
          },
          multiline && styles.multilineField,
        ]}
      >
        {leftAccessory}
        {leftIcon ? <Icon name={leftIcon} size={18} color={focused ? colors.primary : colors.textMuted} /> : null}
        <TextInput
          ref={ref}
          {...inputProps}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          editable={!disabled}
          secureTextEntry={isPassword && !passwordVisible}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            typography.body,
            { color: disabled ? colors.textSecondary : colors.text },
            multiline && { paddingTop: spacing.md },
          ]}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            onPress={() => setPasswordVisible((visible) => !visible)}
            hitSlop={10}
          >
            <Icon name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : rightIcon ? (
          <Pressable
            accessibilityRole={onRightIconPress ? 'button' : undefined}
            accessibilityLabel={rightIconLabel}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={10}
          >
            <Icon name={rightIcon} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </FieldWrapper>
  );
};

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  multilineField: { alignItems: 'flex-start', paddingVertical: 4 },
  input: { flex: 1, paddingVertical: 12, minHeight: 44 },
});
