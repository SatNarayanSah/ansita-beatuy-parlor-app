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

// ---------- Service benefits ----------

/** Same limits as the server (`_clean_benefits` in backend/app/schemas.py). */
export const MAX_BENEFITS = 8;
export const MAX_BENEFIT_LENGTH = 120;

/** Collapses runs of whitespace, as the server does. */
const cleanBenefit = (text: string): string => text.split(/\s+/).filter(Boolean).join(' ');

/**
 * Benefit rows as `{ text }` objects (react-hook-form field arrays need objects).
 * Blank rows are dropped; the output is the cleaned `string[]` the API takes.
 */
export const benefitsSchema = (messages: { tooLong: string; tooMany: string; duplicate: string }) =>
  z
    .array(z.object({ text: z.string() }))
    .superRefine((rows, ctx) => {
      const seen = new Set<string>();
      let filled = 0;
      rows.forEach((row, index) => {
        const text = cleanBenefit(row.text);
        if (!text) return;
        filled += 1;
        if (text.length > MAX_BENEFIT_LENGTH) ctx.addIssue({ code: 'custom', message: messages.tooLong, path: [index, 'text'] });
        const key = text.toLowerCase();
        if (seen.has(key)) ctx.addIssue({ code: 'custom', message: messages.duplicate, path: [index, 'text'] });
        seen.add(key);
      });
      if (filled > MAX_BENEFITS) ctx.addIssue({ code: 'custom', message: messages.tooMany });
    })
    .transform((rows) => rows.map((row) => cleanBenefit(row.text)).filter(Boolean));

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
  /** Saved URL, a photo just picked on the phone, or none. */
  avatar: z.string().nullable(),
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
  image: z.string().nullable(),
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
  minRedeemPoints: wholeNumberText(z.number().min(0, { error: 'Zero or more' }).max(100000, { error: 'At most 100,000' }), 'the points needed'),
});

// ---------- Payments & points ----------

/** Amount bounded by the balance due; built per sheet because `due` varies. */
export const paymentSchema = (due: number) =>
  z.object({
    amount: wholeNumberText(
      z.number().min(1, { error: 'Enter an amount above zero' }).max(due, { error: `Cannot exceed the balance due (Rs. ${due.toLocaleString('en-IN')})` }),
      'the amount',
    ),
    method: z.enum(['cash', 'esewa', 'khalti', 'fonepay', 'card', 'bank']),
  });

/** Customer's "I've paid": `max` is what's due less their pending requests on that bill. */
export const paymentRequestSchema = (max: number, earliest: string, latest: string) =>
  z.object({
    method: z.enum(['esewa', 'khalti', 'fonepay', 'bank']),
    amount: wholeNumberText(
      z.number().min(1, { error: 'Enter the amount you paid' }).max(max, { error: `That’s more than the Rs. ${max.toLocaleString('en-IN')} left to pay` }),
      'the amount you paid',
    ),
    reference: z
      .string()
      .trim()
      .min(4, { error: 'Enter the transaction ID from your payment app or bank (at least 4 characters)' })
      .max(64, { error: 'Keep it under 64 characters' }),
    paidOn: z
      .string()
      .min(1, { error: 'Choose the date you paid' })
      .refine((value) => value <= latest, { error: 'The payment date can’t be in the future' })
      .refine((value) => value >= earliest, { error: 'Payments older than 60 days have to be sorted out at the parlour' }),
    /** A screenshot picked on this phone (uploaded when sending), or none. */
    proof: z.string().nullable(),
    note: z.string().trim().max(300, { error: 'Keep it under 300 characters' }),
  });

/** Admin approving a request: what actually arrived, at most the balance due now. */
export const approvePaymentSchema = (due: number) =>
  z.object({
    amount: wholeNumberText(
      z.number().min(1, { error: 'Enter an amount above zero' }).max(due, { error: `Only Rs. ${due.toLocaleString('en-IN')} is due now` }),
      'the amount received',
    ),
    note: z.string().trim().max(300, { error: 'Keep it under 300 characters' }),
  });

/** The parlour's account for one online method. Turning it on needs a number/ID or a QR code (checked on save). */
export const paymentAccountSchema = z.object({
  accountName: z.string().trim().max(120, { error: 'Keep it under 120 characters' }),
  accountNumber: z.string().trim().max(64, { error: 'Keep it under 64 characters' }),
  bankName: z.string().trim().max(120, { error: 'Keep it under 120 characters' }),
  instructions: z.string().trim().max(300, { error: 'Keep it under 300 characters' }),
  /** Saved URL, a QR image just picked on the phone, or none. */
  qr: z.string().nullable(),
});

/** Points to use on a bill: at least 1, at most `max` (what the customer has, capped at the balance due). */
export const redeemPointsSchema = (max: number) =>
  z.object({
    points: wholeNumberText(
      z.number().min(1, { error: 'Enter at least 1 point' }).max(max, { error: `At most ${max.toLocaleString('en-IN')} points here` }),
      'the points',
    ),
  });

export const quickCustomerSchema = z.object({ name: nameSchema, phone: phoneSchema });

