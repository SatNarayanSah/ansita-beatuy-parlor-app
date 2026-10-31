import { z } from 'zod';

import { isValidISODate, isValidTime } from './date';
import { isValidPhone as isValidE164Phone, normalizePhone } from './phone';

/** Reusable zod field schemas shared by every form. */

export const nameSchema = z
  .string()
  .trim()
  .min(2, { error: 'Name must be at least 2 characters' })
  .max(60, { error: 'Name must be at most 60 characters' });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address' }));

/** Optional email: empty string allowed. */
export const optionalEmailSchema = z.union([z.literal(''), emailSchema]);

/** Mobile number in any supported country (Nepal by default); output is E.164. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, { error: 'Enter a mobile number' })
  .transform((value) => normalizePhone(value))
  .refine(isValidE164Phone, { error: 'Enter a valid mobile number' });

export const passwordSchema = z
  .string()
  .min(6, { error: 'Password must be at least 6 characters' })
  .max(64, { error: 'Password must be at most 64 characters' });

/** Nepal postal codes are 5 digits. Optional: empty string allowed. */
export const postalCodeSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{5}$/.test(value), {
    error: 'Postal code must be 5 digits',
  });

export const isoDateSchema = z
  .string()
  .refine(isValidISODate, { error: 'Enter a valid date (YYYY-MM-DD)' });

export const timeSchema = z.string().refine(isValidTime, { error: 'Enter a valid time (HH:mm)' });

export const priceSchema = z
  .number({ error: 'Enter an amount' })
  .int({ error: 'Amount must be a whole number' })
  .min(0, { error: 'Amount cannot be negative' })
  .max(1_000_000, { error: 'Amount is too large' });

export const durationSchema = z
  .number({ error: 'Enter a duration' })
  .int({ error: 'Duration must be whole minutes' })
  .min(5, { error: 'Duration must be at least 5 minutes' })
  .max(600, { error: 'Duration must be at most 10 hours' });

// Plain predicates for non-form checks.
export const isValidEmail = (value: string): boolean => emailSchema.safeParse(value).success;
export const isValidPhoneInput = (value: string): boolean => phoneSchema.safeParse(value).success;
