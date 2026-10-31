import {
  addDays,
  differenceInYears,
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isValid,
  isYesterday,
  parse,
  parseISO,
} from 'date-fns';

import type { ISODate, ISODateTime, TimeString, Weekday } from '@/types';

const ISO_DATE_FORMAT = 'yyyy-MM-dd';
const TIME_FORMAT = 'HH:mm';
const WEEKDAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// ---------- Creation / conversion ----------

export const nowISO = (): ISODateTime => new Date().toISOString();

export const toISODate = (date: Date): ISODate => format(date, ISO_DATE_FORMAT);

export const todayISO = (): ISODate => toISODate(new Date());

/** Parses `yyyy-MM-dd` as a local date (not UTC midnight). */
export const parseISODate = (value: ISODate): Date => parse(value, ISO_DATE_FORMAT, new Date());

export const addDaysISO = (value: ISODate, days: number): ISODate =>
  toISODate(addDays(parseISODate(value), days));

/** ISO date `days` away from today (negative for the past). */
export const daysFromToday = (days: number): ISODate => toISODate(addDays(new Date(), days));

export const isValidISODate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISODate(value));

export const weekdayOf = (value: ISODate): Weekday => {
  const day = WEEKDAYS[parseISODate(value).getDay()];
  if (!day) {
    throw new Error(`Invalid date: ${value}`);
  }
  return day;
};

// ---------- Time-of-day helpers (HH:mm) ----------

export const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export const timeToMinutes = (value: TimeString): number => {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const minutesToTime = (totalMinutes: number): TimeString => {
  const clamped = Math.max(0, Math.min(totalMinutes, 24 * 60 - 1));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const addMinutesToTime = (value: TimeString, minutes: number): TimeString =>
  minutesToTime(timeToMinutes(value) + minutes);

/** True when [aStart, aEnd) and [bStart, bEnd) overlap. */
export const timeRangesOverlap = (
  aStart: TimeString,
  aEnd: TimeString,
  bStart: TimeString,
  bEnd: TimeString,
): boolean =>
  timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);

/** Slots from `start` (inclusive) while a slot of `duration` still fits before `end`. */
export const generateTimeSlots = (
  start: TimeString,
  end: TimeString,
  stepMinutes: number,
  durationMinutes = stepMinutes,
): TimeString[] => {
  const slots: TimeString[] = [];
  const endMinutes = timeToMinutes(end);
  for (let t = timeToMinutes(start); t + durationMinutes <= endMinutes; t += stepMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
};

export const combineDateTime = (date: ISODate, time: TimeString): Date =>
  parse(`${date} ${time}`, `${ISO_DATE_FORMAT} ${TIME_FORMAT}`, new Date());

export const isPastDateTime = (date: ISODate, time: TimeString): boolean =>
  combineDateTime(date, time).getTime() < Date.now();

// ---------- Display formatting ----------

/** "Mon, 3 Nov 2026" */
export const formatDisplayDate = (value: ISODate): string =>
  format(parseISODate(value), 'EEE, d MMM yyyy');

/** "3 Nov" */
export const formatShortDate = (value: ISODate): string => format(parseISODate(value), 'd MMM');

/** "Today", "Tomorrow", "Yesterday" or "Mon, 3 Nov". */
export const formatRelativeDay = (value: ISODate): string => {
  const date = parseISODate(value);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
};

/** "14:30" -> "2:30 PM" */
export const formatTime12 = (value: TimeString): string =>
  format(parse(value, TIME_FORMAT, new Date()), 'h:mm a');

export const formatTimeRange = (start: TimeString, end: TimeString): string =>
  `${formatTime12(start)} - ${formatTime12(end)}`;

/** "5 minutes ago" */
export const formatTimeAgo = (value: ISODateTime): string =>
  formatDistanceToNow(parseISO(value), { addSuffix: true });

/** "3 Nov 2026" from a full timestamp. */
export const formatDateTimeShort = (value: ISODateTime): string =>
  format(parseISO(value), 'd MMM yyyy, h:mm a');

export const getAge = (dob: ISODate): number => differenceInYears(new Date(), parseISODate(dob));
