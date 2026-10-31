import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Input, type InputProps } from '@/components/ui/Input';
import { PhoneInput, type PhoneInputProps } from '@/components/ui/PhoneInput';

/** react-hook-form bindings for the UI kit fields: value, change, blur and error wiring. */

/** `TOut` is the schema's output type, which differs when fields are transformed (e.g. "45" -> 45). */
type FormInputProps<T extends FieldValues, TOut extends FieldValues = T> = Omit<InputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  control: Control<T, unknown, TOut>;
  name: FieldPath<T>;
};

export const FormInput = <T extends FieldValues, TOut extends FieldValues = T>({ control, name, ...inputProps }: FormInputProps<T, TOut>) => (
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

type FormPhoneInputProps<T extends FieldValues, TOut extends FieldValues = T> = Omit<PhoneInputProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> & {
  control: Control<T, unknown, TOut>;
  name: FieldPath<T>;
};

export const FormPhoneInput = <T extends FieldValues, TOut extends FieldValues = T>({ control, name, ...inputProps }: FormPhoneInputProps<T, TOut>) => (
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
