import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import {
  DEFAULT_COUNTRY,
  getPhoneCountry,
  nepalOperatorOf,
  parsePhone,
  PHONE_COUNTRIES,
  type CountryCode,
  type PhoneCountry,
} from '@/utils/phone';

import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';
import { Input } from './Input';
import { ListItem } from './ListItem';
import { Text } from './Text';

export interface PhoneInputProps {
  /** E.164 value, e.g. "+9779812345678", or "" when empty. */
  value: string;
  onChangeText: (e164: string) => void;
  onBlur?: () => void;
  label?: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  defaultCountry?: CountryCode;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Country selector (+977 Nepal by default) plus a national-number field. Emits E.164. */
export const PhoneInput = ({
  value,
  onChangeText,
  onBlur,
  label = 'Mobile number',
  required,
  error,
  helperText,
  defaultCountry = DEFAULT_COUNTRY,
  disabled = false,
  containerStyle,
}: PhoneInputProps) => {
  const { colors, spacing } = useTheme();
  const [selected, setSelected] = useState<PhoneCountry>(() => getPhoneCountry(defaultCountry));
  const [pickerOpen, setPickerOpen] = useState(false);

  // The value is the source of truth; the selection only matters while it is empty.
  const parsed = parsePhone(value);
  const country = parsed?.country ?? selected;
  const national = parsed?.national ?? '';
  // Nepal: name the network as soon as the prefix is known (only NTC and Ncell are accepted).
  const operator = country.code === 'NP' && national.length >= 3 ? nepalOperatorOf(national) : null;
  const hint = operator ? [`${operator} number`, helperText].filter(Boolean).join(' · ') : helperText;

  const emit = (nextCountry: PhoneCountry, digits: string): void => {
    onChangeText(digits.length > 0 ? `+${nextCountry.dialCode}${digits}` : '');
  };

  const handleCountry = (next: PhoneCountry): void => {
    setSelected(next);
    setPickerOpen(false);
    emit(next, national);
  };

  return (
    <>
      <Input
        label={label}
        required={required}
        error={error}
        helperText={hint}
        disabled={disabled}
        containerStyle={containerStyle}
        value={national}
        onChangeText={(text) => emit(country, text.replace(/\D/g, '').replace(/^0+/, ''))}
        onBlur={onBlur}
        placeholder={country.example}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={country.code === 'NP' ? 10 : 12}
        accessibilityLabel={`${label}, country code plus ${country.dialCode}`}
        leftAccessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Country: ${country.name}. Change country`}
            disabled={disabled}
            onPress={() => setPickerOpen(true)}
            style={[styles.country, { borderRightColor: colors.border, paddingRight: spacing.sm }]}
          >
            <Text variant="body">{country.flag}</Text>
            <Text variant="bodyMedium">+{country.dialCode}</Text>
            <Icon name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
        }
      />
      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Select country">
        <View>
          {PHONE_COUNTRIES.map((item) => (
            <ListItem
              key={item.code}
              title={item.name}
              left={<Text variant="h3">{item.flag}</Text>}
              rightText={`+${item.dialCode}`}
              right={item.code === country.code ? <Icon name="checkmark" size={20} color={colors.primary} /> : undefined}
              onPress={() => handleCountry(item)}
            />
          ))}
        </View>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRightWidth: 1,
    alignSelf: 'stretch',
  },
});
