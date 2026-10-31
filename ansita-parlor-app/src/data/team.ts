import type { Staff, TimeString, Weekday, WorkingHours } from '@/types';

import { CATEGORY_IDS as C } from './categories';

/**
 * Staff profiles without derived fields. Kept apart from `staff.ts` so the
 * appointment generator can use them without an import cycle
 * (staff ratings are derived from reviews, which come from appointments).
 */

export const STAFF_IDS = {
  ansita: 'stf_ansita',
  sarita: 'stf_sarita',
  puja: 'stf_puja',
  rojina: 'stf_rojina',
} as const;

/** Parlour opening hours; individual shifts fall inside these. */
export const PARLOR_HOURS = { open: '10:00', close: '19:00' } as const;

const ALL_DAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const shift = (start: TimeString, end: TimeString, offDays: readonly Weekday[]): WorkingHours[] =>
  ALL_DAYS.map((day) => ({ day, isOff: offDays.includes(day), start, end }));

export type StaffProfile = Omit<Staff, 'createdAt' | 'updatedAt' | 'rating'> & { joinedDaysAgo: number };

export const STAFF_PROFILES: readonly StaffProfile[] = [
  {
    id: STAFF_IDS.ansita,
    name: 'Ansita Shrestha',
    role: 'owner',
    phone: '+9779841500100',
    email: 'admin@ansita.com',
    specialties: [C.makeup, C.skin],
    // The owner keeps a shorter chair schedule to run the business and teach.
    workingHours: shift('11:00', '17:00', ['tue']),
    avatar: null,
    isActive: true,
    joinedDaysAgo: 1100,
  },
  {
    id: STAFF_IDS.sarita,
    name: 'Sarita Maharjan',
    role: 'senior_stylist',
    phone: '+9779851023344',
    email: 'sarita@ansita.com',
    specialties: [C.hair],
    workingHours: shift('10:00', '19:00', ['wed']),
    avatar: null,
    isActive: true,
    joinedDaysAgo: 820,
  },
  {
    id: STAFF_IDS.puja,
    name: 'Puja Tamang',
    role: 'beautician',
    phone: '+9779803344120',
    email: 'puja@ansita.com',
    specialties: [C.skin, C.makeup, C.waxing],
    workingHours: shift('10:00', '18:00', ['mon']),
    avatar: null,
    isActive: true,
    joinedDaysAgo: 540,
  },
  {
    id: STAFF_IDS.rojina,
    name: 'Rojina Gurung',
    role: 'beautician',
    phone: '+9779818876543',
    email: 'rojina@ansita.com',
    specialties: [C.nails, C.spa, C.waxing],
    workingHours: shift('11:00', '19:00', ['thu']),
    avatar: null,
    isActive: true,
    joinedDaysAgo: 300,
  },
];
