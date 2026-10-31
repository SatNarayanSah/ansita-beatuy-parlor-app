import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Input, type InputProps } from '@/components/ui/Input';
import { PhoneInput, type PhoneInputProps } from '@/components/ui/PhoneInput';

/** react-hook-form bindings for the UI kit fields: value, change, blur and error wiring. */

type FormInputProps<T extends FieldValues> = Omit<InputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
};

export const FormInput = <T extends FieldValues>({ control, name, ...inputProps }: FormInputProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => (
      <Input
        {...inputProps}
        ref={field.ref}
        value={typeof field.value === 'string' ? field.value : ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        error={fieldState.error?.message}
      />
    )}
  />
);

type FormPhoneInputProps<T extends FieldValues> = Omit<PhoneInputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
};

export const FormPhoneInput = <T extends FieldValues>({ control, name, ...inputProps }: FormPhoneInputProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => (
      <PhoneInput
        {...inputProps}
        value={typeof field.value === 'string' ? field.value : ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        error={fieldState.error?.message}
      />
    )}
  />
);
