import type { Staff, Weekday, WorkingHours } from '@/types';

import { CATEGORY_IDS } from './categories';
import { seedBase } from './helpers';

export const STAFF_IDS = {
  anita: 'stf_anita',
  meera: 'stf_meera',
  rohit: 'stf_rohit',
  sabina: 'stf_sabina',
  pooja: 'stf_pooja',
  kabita: 'stf_kabita',
} as const;

export const PARLOR_HOURS = { open: '10:00', close: '20:00' } as const;

const ALL_DAYS: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const buildHours = (offDays: readonly Weekday[] = []): WorkingHours[] =>
  ALL_DAYS.map((day) => ({
    day,
    isOff: offDays.includes(day),
    start: PARLOR_HOURS.open,
    end: PARLOR_HOURS.close,
  }));

export const buildStaff = (): Staff[] => [
  {
    ...seedBase(STAFF_IDS.anita, 900),
    name: 'Anita Verma',
    role: 'owner',
    phone: '+9779841011001',
    email: 'anita@ansita.com.np',
    specialties: [CATEGORY_IDS.bridal, CATEGORY_IDS.makeup, CATEGORY_IDS.skin],
    workingHours: buildHours(),
    avatar: null,
    rating: 4.9,
    isActive: true,
  },
  {
    ...seedBase(STAFF_IDS.meera, 700),
    name: 'Meera Joshi',
    role: 'senior_stylist',
    phone: '+9779841011002',
    email: 'meera@ansita.com.np',
    specialties: [CATEGORY_IDS.hair, CATEGORY_IDS.bridal],
    workingHours: buildHours(),
    avatar: null,
    rating: 4.8,
    isActive: true,
  },
  {
    ...seedBase(STAFF_IDS.rohit, 500),
    name: 'Rohit Magar',
    role: 'stylist',
    phone: '+9779841011003',
    email: 'rohit@ansita.com.np',
    specialties: [CATEGORY_IDS.hair],
    workingHours: buildHours(),
    avatar: null,
    rating: 4.6,
    isActive: true,
  },
  {
    ...seedBase(STAFF_IDS.sabina, 420),
    name: 'Sabina Khadka',
    role: 'beautician',
    phone: '+9779841011004',
    email: 'sabina@ansita.com.np',
    specialties: [CATEGORY_IDS.skin, CATEGORY_IDS.spa, CATEGORY_IDS.nails],
    workingHours: buildHours(),
    avatar: null,
    rating: 4.7,
    isActive: true,
  },
  {
    ...seedBase(STAFF_IDS.pooja, 300),
    name: 'Pooja Basnet',
    role: 'beautician',
    phone: '+9779841011005',
    email: 'pooja@ansita.com.np',
    specialties: [CATEGORY_IDS.nails, CATEGORY_IDS.makeup, CATEGORY_IDS.skin],
    workingHours: buildHours(),
    avatar: null,
    rating: 4.5,
    isActive: true,
  },
  {
    ...seedBase(STAFF_IDS.kabita, 600),
    name: 'Kabita Adhikari',
    role: 'trainer',
    phone: '+9779841011006',
    email: 'kabita@ansita.com.np',
    specialties: [CATEGORY_IDS.makeup, CATEGORY_IDS.hair, CATEGORY_IDS.nails],
    workingHours: buildHours(['mon']),
    avatar: null,
    rating: 4.8,
    isActive: true,
  },
];
