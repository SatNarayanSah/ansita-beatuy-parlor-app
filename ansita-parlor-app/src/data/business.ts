import type { BusinessSettings } from '@/types';
import { daysFromToday, weekdayOf } from '@/utils/date';

import { PARLOR_HOURS, STAFF_PROFILES } from './team';

/**
 * Holidays sit beyond the 30-day seeded booking window, so no seeded booking
 * falls on one. Shifted forward if needed so the day is a normal working day.
 */
const holidayOffset = (preferred: number): number => {
  for (let offset = preferred; offset < preferred + 7; offset += 1) {
    const day = weekdayOf(daysFromToday(offset));
    if (STAFF_PROFILES.some((member) => member.workingHours.some((hours) => hours.day === day && !hours.isOff))) return offset;
  }
  return preferred;
};

export const buildBusinessSettings = (): BusinessSettings => ({
  profile: {
    name: 'Ansita Beauty Parlour',
    tagline: 'Beauty Parlour & Training Centre',
    phone: '+97714781234',
    whatsapp: '+9779841500100',
    email: 'hello@ansita.com',
    address: 'Baneshwor Chowk, Kathmandu 44600',
    openTime: PARLOR_HOURS.open,
    closeTime: PARLOR_HOURS.close,
  },
  holidays: [
    { date: daysFromToday(holidayOffset(45)), name: 'Staff training day' },
    { date: daysFromToday(holidayOffset(75)), name: 'Annual deep cleaning' },
  ],
  loyalty: { enabled: true, rupeesPerPoint: 100, pointValue: 1 },
  alerts: { newBookings: true, cancellations: true, payments: true, enrollments: true },
});
