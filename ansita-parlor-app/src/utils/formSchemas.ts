import { z } from 'zod';

import { isValidTime, timeToMinutes } from './date';
import { contactPhoneSchema, emailSchema, nameSchema, optionalEmailSchema, phoneSchema, priceSchema } from './validators';

/**
 * Zod schemas for the admin and payment forms. Text inputs hold strings, so
 * numeric fields parse from text; `z.input` is the form state, `z.output`
 * what the submit handler receives.
 */

/** "45" -> 45, validated by a numeric schema. Empty or non-digits -> friendly message. */
export const wholeNumberText = (schema: z.ZodNumber, label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `Enter ${label}` })
    .regex(/^\d+$/, { error: `Enter ${label} as a whole number` })
    .transform(Number)
    .pipe(schema);

/** Optional whole number: "" -> 0. */
export const optionalWholeNumberText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, { error: `Enter ${label} as a whole number` })
    .transform((value) => (value === '' ? 0 : Number(value)))
    .pipe(z.number().max(max, { error: `Cannot be more than ${max.toLocaleString('en-IN')}` }));

const time = z.string().refine(isValidTime, { error: 'Choose a valid time' });
const endsAfter = <T extends { start: string; end: string }>(value: T) => timeToMinutes(value.end) > timeToMinutes(value.start);

// ---------- Category ----------

export const categorySchema = z.object({
  name: z.string().trim().min(2, { error: 'Enter at least 2 characters' }).max(30, { error: 'Keep it under 30 characters' }),
  icon: z.string().min(1, { error: 'Choose an icon' }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Choose a colour' }),
});

// ---------- Staff ----------

export const workingDaySchema = z
  .object({ day: z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']), isOff: z.boolean(), start: time, end: time })
  .refine((day) => day.isOff || endsAfter(day), { error: 'Shift must end after it starts', path: ['end'] });

export const staffSchema = z.object({
  name: nameSchema,
  role: z.enum(['owner', 'senior_stylist', 'stylist', 'beautician', 'trainer', 'receptionist']),
  phone: phoneSchema,
  email: optionalEmailSchema,
  specialties: z.array(z.string()).min(1, { error: 'Choose at least one specialty' }),
  workingHours: z.array(workingDaySchema).refine((days) => days.some((day) => !day.isOff), { error: 'Set at least one working day' }),
});

// ---------- Course & batch ----------

export const syllabusModuleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, { error: 'Enter a module title' }),
  hours: wholeNumberText(z.number().min(1, { error: 'At least 1 hour' }).max(500, { error: 'Too many hours' }), 'the hours'),
  topics: z.string().trim(),
});

export const courseSchema = z.object({
  title: z.string().trim().min(3, { error: 'Enter a course title' }).max(80),
  type: z.enum(['certification', 'diploma', 'workshop']),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.string().trim().min(1, { error: 'e.g. "6 weeks"' }).max(30),
  fee: wholeNumberText(priceSchema.min(1, { error: 'Fee must be more than zero' }), 'the fee'),
  seats: wholeNumberText(z.number().min(1, { error: 'At least 1 seat' }).max(100, { error: 'At most 100 seats' }), 'the seats'),
  instructor: z.string().min(1, { error: 'Choose an instructor' }),
  description: z.string().trim().max(400, { error: 'Keep it under 400 characters' }),
  certificate: z.boolean(),
  isActive: z.boolean(),
  syllabus: z.array(syllabusModuleSchema).min(1, { error: 'Add at least one module' }),
});

export const batchSchema = z
  .object({
    name: z.string().trim().min(2, { error: 'Enter a batch name' }).max(40),
    startDate: z.string({ error: 'Choose a start date' }).min(1, { error: 'Choose a start date' }),
    endDate: z.string({ error: 'Choose an end date' }).min(1, { error: 'Choose an end date' }),
    days: z.array(z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])).min(1, { error: 'Pick at least one class day' }),
    startTime: time,
    endTime: time,
    seats: wholeNumberText(z.number().min(1, { error: 'At least 1 seat' }).max(100, { error: 'At most 100 seats' }), 'the seats'),
    status: z.enum(['upcoming', 'ongoing', 'completed']),
  })
  .refine((batch) => batch.endDate >= batch.startDate, { error: 'Ends before it starts', path: ['endDate'] })
  .refine((batch) => endsAfter({ start: batch.startTime, end: batch.endTime }), { error: 'Class must end after it starts', path: ['endTime'] });

// ---------- Business settings ----------

export const businessProfileSchema = z
  .object({
    name: z.string().trim().min(2, { error: 'Enter the business name' }).max(60),
    tagline: z.string().trim().max(60, { error: 'Keep it under 60 characters' }),
    phone: contactPhoneSchema,
    whatsapp: phoneSchema,
    email: emailSchema,
    address: z.string().trim().min(5, { error: 'Enter the full address' }).max(120),
    openTime: time,
    closeTime: time,
  })
  .refine((p) => endsAfter({ start: p.openTime, end: p.closeTime }), { error: 'Closing time must be after opening', path: ['closeTime'] });

export const holidaySchema = z.object({
  date: z.string({ error: 'Pick a date' }).min(1, { error: 'Pick a date' }),
  name: z.string().trim().min(2, { error: 'Give the holiday a name' }).max(40),
});

export const loyaltySchema = z.object({
  rupeesPerPoint: wholeNumberText(z.number().min(1, { error: 'At least Rs. 1' }).max(10000, { error: 'At most Rs. 10,000' }), 'the spend per point'),
  pointValue: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, { error: 'Enter an amount like 1 or 0.50' })
    .transform(Number)
    .pipe(z.number().gt(0, { error: 'Must be more than zero' }).max(100, { error: 'At most Rs. 100' })),
});

// ---------- Payments & points ----------

/** Amount bounded by the balance due; built per sheet because `due` varies. */
export const paymentSchema = (due: number) =>
  z.object({
    amount: wholeNumberText(
      z.number().min(1, { error: 'Enter an amount above zero' }).max(due, { error: `Cannot exceed the balance due (Rs. ${due.toLocaleString('en-IN')})` }),
      'the amount',
    ),
    method: z.enum(['cash', 'esewa', 'khalti', 'fonepay', 'card']),
  });

export const pointsAdjustSchema = z.object({
  delta: z
    .string()
    .trim()
    .regex(/^-?\d+$/, { error: 'Enter whole points, e.g. 100 or -200' })
    .transform(Number)
    .refine((value) => value !== 0, { error: 'Enter a non-zero amount' })
    .refine((value) => Math.abs(value) <= 100000, { error: 'That is too many points' }),
});

export const quickCustomerSchema = z.object({ name: nameSchema, phone: phoneSchema });

