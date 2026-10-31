import type { Batch, Course } from '@/types';
import { daysFromToday } from '@/utils/date';

import { seedBase } from './helpers';
import { STAFF_IDS } from './staff';

export const COURSE_IDS = {
  beautician: 'crs_beautician',
  bridal: 'crs_bridal',
  hair: 'crs_hair',
  nailArt: 'crs_nail_art',
} as const;

export const BATCH_IDS = {
  beauticianJul: 'bat_beautician_1',
  beauticianNov: 'bat_beautician_2',
  bridalOct: 'bat_bridal_1',
  bridalDec: 'bat_bridal_2',
  hairNov: 'bat_hair_1',
  nailPast: 'bat_nail_1',
  nailNext: 'bat_nail_2',
} as const;

export const buildCourses = (): Course[] => {
  const beauticianBatches: Batch[] = [
    { id: BATCH_IDS.beauticianJul, name: 'Morning Batch', startDate: daysFromToday(-60), endDate: daysFromToday(30), days: ['mon', 'wed', 'fri'], startTime: '10:00', endTime: '13:00', seats: 12, status: 'ongoing' },
    { id: BATCH_IDS.beauticianNov, name: 'Evening Batch', startDate: daysFromToday(10), endDate: daysFromToday(100), days: ['tue', 'thu', 'sat'], startTime: '16:00', endTime: '19:00', seats: 12, status: 'upcoming' },
  ];
  const bridalBatches: Batch[] = [
    { id: BATCH_IDS.bridalOct, name: 'Weekend Batch', startDate: daysFromToday(-14), endDate: daysFromToday(28), days: ['sat', 'sun'], startTime: '11:00', endTime: '16:00', seats: 8, status: 'ongoing' },
    { id: BATCH_IDS.bridalDec, name: 'Weekday Intensive', startDate: daysFromToday(35), endDate: daysFromToday(77), days: ['mon', 'tue', 'wed', 'thu'], startTime: '11:00', endTime: '15:00', seats: 8, status: 'upcoming' },
  ];
  const hairBatches: Batch[] = [
    { id: BATCH_IDS.hairNov, name: 'Afternoon Batch', startDate: daysFromToday(5), endDate: daysFromToday(65), days: ['mon', 'wed', 'fri'], startTime: '14:00', endTime: '17:00', seats: 10, status: 'upcoming' },
  ];
  const nailBatches: Batch[] = [
    { id: BATCH_IDS.nailPast, name: 'Weekend Workshop', startDate: daysFromToday(-20), endDate: daysFromToday(-19), days: ['sat', 'sun'], startTime: '11:00', endTime: '17:00', seats: 15, status: 'completed' },
    { id: BATCH_IDS.nailNext, name: 'Weekend Workshop', startDate: daysFromToday(8), endDate: daysFromToday(9), days: ['sat', 'sun'], startTime: '11:00', endTime: '17:00', seats: 15, status: 'upcoming' },
  ];

  return [
    {
      ...seedBase(COURSE_IDS.beautician, 300),
      title: 'Professional Beautician Certification',
      type: 'certification',
      description:
        'A complete foundation course covering skin care, hair care, makeup and salon hygiene, with hands-on practice on live models.',
      duration: '3 months',
      fee: 25000,
      level: 'beginner',
      instructor: STAFF_IDS.kabita,
      seats: 12,
      image: null,
      certificate: true,
      isActive: true,
      batches: beauticianBatches,
      syllabus: [
        { id: 'mod_b1', title: 'Salon Basics & Hygiene', topics: ['Tools and sterilisation', 'Client consultation', 'Skin & hair types'], hours: 12 },
        { id: 'mod_b2', title: 'Skin Care', topics: ['Clean-ups', 'Facials', 'Threading & waxing', 'Bleach & de-tan'], hours: 36 },
        { id: 'mod_b3', title: 'Hair Care', topics: ['Hair spa', 'Basic cuts', 'Blow-dry & ironing', 'Mehendi & colour basics'], hours: 36 },
        { id: 'mod_b4', title: 'Makeup Fundamentals', topics: ['Colour theory', 'Day & party makeup', 'Eye makeup'], hours: 30 },
        { id: 'mod_b5', title: 'Manicure & Pedicure', topics: ['Classic manicure', 'Spa pedicure', 'Nail care'], hours: 18 },
      ],
    },
    {
      ...seedBase(COURSE_IDS.bridal, 200),
      title: 'Advanced Bridal Makeup Diploma',
      type: 'diploma',
      description:
        'Master HD and airbrush bridal looks for North and South Indian brides, including hairstyling, draping and portfolio building.',
      duration: '6 weeks',
      fee: 35000,
      level: 'advanced',
      instructor: STAFF_IDS.anita,
      seats: 8,
      image: null,
      certificate: true,
      isActive: true,
      batches: bridalBatches,
      syllabus: [
        { id: 'mod_br1', title: 'Skin Prep & Base', topics: ['Skin analysis', 'Colour correction', 'HD vs airbrush base'], hours: 10 },
        { id: 'mod_br2', title: 'Bridal Eye Looks', topics: ['Cut crease', 'Glitter & foil', 'Lashes'], hours: 12 },
        { id: 'mod_br3', title: 'Regional Bridal Looks', topics: ['North Indian bride', 'South Indian bride', 'Muslim bride', 'Reception look'], hours: 16 },
        { id: 'mod_br4', title: 'Bridal Hair & Draping', topics: ['Buns & braids', 'Dupatta setting', 'Saree draping'], hours: 12 },
        { id: 'mod_br5', title: 'Business & Portfolio', topics: ['Photography basics', 'Pricing', 'Social media'], hours: 6 },
      ],
    },
    {
      ...seedBase(COURSE_IDS.hair, 150),
      title: 'Hair Cutting & Styling',
      type: 'certification',
      description:
        'Learn classic and modern cuts, layering, colouring techniques and party hairstyles from our senior stylists.',
      duration: '2 months',
      fee: 18000,
      level: 'intermediate',
      instructor: STAFF_IDS.meera,
      seats: 10,
      image: null,
      certificate: true,
      isActive: true,
      batches: hairBatches,
      syllabus: [
        { id: 'mod_h1', title: 'Cutting Fundamentals', topics: ['Sectioning', 'Blunt & layer cuts', 'Fringes'], hours: 20 },
        { id: 'mod_h2', title: 'Colour Techniques', topics: ['Global colour', 'Highlights', 'Balayage basics'], hours: 16 },
        { id: 'mod_h3', title: 'Styling', topics: ['Curls & waves', 'Updos', 'Party hairstyles'], hours: 16 },
        { id: 'mod_h4', title: 'Treatments', topics: ['Keratin', 'Smoothening', 'Hair spa protocols'], hours: 10 },
      ],
    },
    {
      ...seedBase(COURSE_IDS.nailArt, 120),
      title: 'Nail Art Workshop',
      type: 'workshop',
      description: 'A fun, hands-on two-day workshop covering gel polish, extensions and trending nail art designs.',
      duration: '2 days',
      fee: 3500,
      level: 'beginner',
      instructor: STAFF_IDS.pooja,
      seats: 15,
      image: null,
      certificate: false,
      isActive: true,
      batches: nailBatches,
      syllabus: [
        { id: 'mod_n1', title: 'Gel Polish Basics', topics: ['Prep', 'Application', 'Removal'], hours: 4 },
        { id: 'mod_n2', title: 'Extensions', topics: ['Tips', 'Gel extensions', 'Shaping'], hours: 4 },
        { id: 'mod_n3', title: 'Nail Art Designs', topics: ['Ombre', 'Stamping', 'Chrome & glitter'], hours: 4 },
      ],
    },
  ];
};
