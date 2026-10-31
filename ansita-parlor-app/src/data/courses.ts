import type { Batch, Course } from '@/types';
import { daysFromToday } from '@/utils/date';

import { seedBase } from './helpers';
import { STAFF_IDS } from './team';

export const COURSE_IDS = {
  beautician: 'crs_beautician',
  makeup: 'crs_adv_makeup',
  bridal: 'crs_bridal',
  hair: 'crs_hair',
  nailArt: 'crs_nail_art',
  skin: 'crs_skin',
} as const;

export const BATCH_IDS = {
  beauticianDone: 'bat_beautician_1',
  beauticianNow: 'bat_beautician_2',
  beauticianNext: 'bat_beautician_3',
  makeupNow: 'bat_makeup_1',
  makeupNext: 'bat_makeup_2',
  bridalDone: 'bat_bridal_1',
  bridalNow: 'bat_bridal_2',
  hairNow: 'bat_hair_1',
  hairNext: 'bat_hair_2',
  nailDone: 'bat_nail_1',
  nailNext: 'bat_nail_2',
  skinDone: 'bat_skin_1',
  skinNext: 'bat_skin_2',
} as const;

const batch = (fields: Omit<Batch, 'startDate' | 'endDate'> & { startOffset: number; endOffset: number }): Batch => {
  const { startOffset, endOffset, ...rest } = fields;
  return { ...rest, startDate: daysFromToday(startOffset), endDate: daysFromToday(endOffset) };
};

/** Fees in NPR. Batch dates are relative to today, so there is always one ongoing and one upcoming. */
export const buildCourses = (): Course[] => [
  {
    ...seedBase(COURSE_IDS.beautician, 700),
    title: 'Basic Beautician Course',
    type: 'certification',
    description:
      'Our most popular course for beginners. Learn skin care, threading, waxing, hair basics and everyday makeup with daily practice on live models. Ideal for starting your own parlour.',
    duration: '3 months',
    fee: 35000,
    level: 'beginner',
    instructor: STAFF_IDS.ansita,
    seats: 12,
    image: null,
    certificate: true,
    isActive: true,
    batches: [
      batch({ id: BATCH_IDS.beauticianDone, name: 'Shrawan Morning Batch', startOffset: -130, endOffset: -40, days: ['sun', 'mon', 'tue', 'wed', 'thu'], startTime: '07:00', endTime: '09:30', seats: 12, status: 'completed' }),
      batch({ id: BATCH_IDS.beauticianNow, name: 'Morning Batch', startOffset: -45, endOffset: 45, days: ['sun', 'mon', 'tue', 'wed', 'thu'], startTime: '07:00', endTime: '09:30', seats: 12, status: 'ongoing' }),
      batch({ id: BATCH_IDS.beauticianNext, name: 'Day Batch', startOffset: 18, endOffset: 108, days: ['sun', 'mon', 'tue', 'wed', 'thu'], startTime: '13:00', endTime: '15:30', seats: 12, status: 'upcoming' }),
    ],
    syllabus: [
      { id: 'mod_bb1', title: 'Salon Basics & Hygiene', topics: ['Tools and sterilisation', 'Client consultation', 'Skin and hair types'], hours: 12 },
      { id: 'mod_bb2', title: 'Threading & Waxing', topics: ['Eyebrow shaping', 'Full face threading', 'Rica and honey wax'], hours: 30 },
      { id: 'mod_bb3', title: 'Skin Care', topics: ['Clean-up', 'Fruit and gold facials', 'Bleach and de-tan'], hours: 36 },
      { id: 'mod_bb4', title: 'Hair Care', topics: ['Hair spa', 'Basic cuts', 'Blow-dry and ironing', 'Mehendi application'], hours: 36 },
      { id: 'mod_bb5', title: 'Makeup Basics', topics: ['Colour theory', 'Day and party makeup', 'Sari draping'], hours: 30 },
      { id: 'mod_bb6', title: 'Manicure & Pedicure', topics: ['Classic manicure', 'Spa pedicure', 'Nail care'], hours: 18 },
      { id: 'mod_bb7', title: 'Running a Parlour', topics: ['Pricing services', 'Customer handling', 'Basic accounts'], hours: 6 },
    ],
  },
  {
    ...seedBase(COURSE_IDS.makeup, 500),
    title: 'Advanced Makeup Course',
    type: 'certification',
    description:
      'Take your makeup skills to a professional level: HD and airbrush bases, cut-crease and glam eyes, contouring for camera, and party looks for every skin tone.',
    duration: '6 weeks',
    fee: 30000,
    level: 'intermediate',
    instructor: STAFF_IDS.puja,
    seats: 10,
    image: null,
    certificate: true,
    isActive: true,
    batches: [
      batch({ id: BATCH_IDS.makeupNow, name: 'Afternoon Batch', startOffset: -20, endOffset: 22, days: ['sun', 'tue', 'thu'], startTime: '14:00', endTime: '17:00', seats: 10, status: 'ongoing' }),
      batch({ id: BATCH_IDS.makeupNext, name: 'Weekend Batch', startOffset: 30, endOffset: 72, days: ['fri', 'sat'], startTime: '10:00', endTime: '15:00', seats: 10, status: 'upcoming' }),
    ],
    syllabus: [
      { id: 'mod_am1', title: 'Skin Prep & Base', topics: ['Skin analysis', 'Colour correction', 'HD vs airbrush'], hours: 12 },
      { id: 'mod_am2', title: 'Eye Artistry', topics: ['Cut crease', 'Smokey eyes', 'Glitter and foil', 'Lash application'], hours: 16 },
      { id: 'mod_am3', title: 'Contour & Highlight', topics: ['Face shapes', 'Cream vs powder', 'Makeup for photography'], hours: 10 },
      { id: 'mod_am4', title: 'Party & Festive Looks', topics: ['Teej and Tihar looks', 'Cocktail glam', 'Reception looks'], hours: 12 },
    ],
  },
  {
    ...seedBase(COURSE_IDS.bridal, 450),
    title: 'Bridal Makeup Course',
    type: 'diploma',
    description:
      'Master the complete Nepali bridal look, from skin prep to jewellery setting. Covers traditional Brahmin-Chhetri, Newari and modern brides, with hairstyling, sari draping and portfolio shoots.',
    duration: '1 month',
    fee: 45000,
    level: 'advanced',
    instructor: STAFF_IDS.ansita,
    seats: 8,
    image: null,
    certificate: true,
    isActive: true,
    batches: [
      batch({ id: BATCH_IDS.bridalDone, name: 'Wedding Season Batch', startOffset: -95, endOffset: -65, days: ['sun', 'mon', 'tue', 'wed', 'thu'], startTime: '10:00', endTime: '13:00', seats: 8, status: 'completed' }),
      batch({ id: BATCH_IDS.bridalNow, name: 'Mangsir Batch', startOffset: -10, endOffset: 20, days: ['sun', 'mon', 'tue', 'wed', 'thu'], startTime: '10:00', endTime: '13:00', seats: 8, status: 'ongoing' }),
    ],
    syllabus: [
      { id: 'mod_bm1', title: 'Bridal Skin & Base', topics: ['Pre-bridal skin care plan', 'Long-wear HD base', 'Sweat-proofing'], hours: 10 },
      { id: 'mod_bm2', title: 'Traditional Nepali Brides', topics: ['Brahmin-Chhetri bride', 'Newari bride and haku patasi', 'Gurung and Tamang bridal looks'], hours: 18 },
      { id: 'mod_bm3', title: 'Modern & Reception Looks', topics: ['Soft glam bride', 'Reception and cocktail looks', 'Engagement makeup'], hours: 12 },
      { id: 'mod_bm4', title: 'Hair, Draping & Jewellery', topics: ['Bridal buns and braids', 'Sari and lehenga draping', 'Tilhari, sirbandi and jewellery setting'], hours: 14 },
      { id: 'mod_bm5', title: 'Business & Portfolio', topics: ['Pricing bridal packages', 'Photography basics', 'Instagram and TikTok marketing'], hours: 6 },
    ],
  },
  {
    ...seedBase(COURSE_IDS.hair, 400),
    title: 'Hair Styling Course',
    type: 'certification',
    description:
      'Learn classic and trending cuts, colouring, rebonding and keratin, plus party and bridal hairstyles from our senior stylist.',
    duration: '2 months',
    fee: 25000,
    level: 'intermediate',
    instructor: STAFF_IDS.sarita,
    seats: 10,
    image: null,
    certificate: true,
    isActive: true,
    batches: [
      batch({ id: BATCH_IDS.hairNow, name: 'Morning Batch', startOffset: -30, endOffset: 30, days: ['sun', 'tue', 'thu'], startTime: '07:30', endTime: '09:30', seats: 10, status: 'ongoing' }),
      batch({ id: BATCH_IDS.hairNext, name: 'Evening Batch', startOffset: 25, endOffset: 85, days: ['mon', 'wed', 'fri'], startTime: '17:00', endTime: '19:00', seats: 10, status: 'upcoming' }),
    ],
    syllabus: [
      { id: 'mod_hs1', title: 'Cutting Fundamentals', topics: ['Sectioning', 'Blunt and layer cuts', 'Fringes and face framing'], hours: 20 },
      { id: 'mod_hs2', title: 'Colour Techniques', topics: ['Global colour', 'Highlights', 'Balayage basics'], hours: 16 },
      { id: 'mod_hs3', title: 'Chemical Treatments', topics: ['Rebonding', 'Keratin', 'Smoothening aftercare'], hours: 14 },
      { id: 'mod_hs4', title: 'Styling', topics: ['Curls and waves', 'Party updos', 'Bridal hairdos'], hours: 16 },
    ],
  },
  {
    ...seedBase(COURSE_IDS.nailArt, 250),
    title: 'Nail Art Course',
    type: 'workshop',
    description: 'A hands-on two-week course on gel polish, extensions and trending nail art. Take-home starter kit included.',
    duration: '2 weeks',
    fee: 12000,
    level: 'beginner',
    instructor: STAFF_IDS.rojina,
    seats: 12,
    image: null,
    certificate: true,
    isActive: true,
    batches: [
      batch({ id: BATCH_IDS.nailDone, name: 'Dashain Batch', startOffset: -35, endOffset: -22, days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri'], startTime: '15:00', endTime: '17:00', seats: 12, status: 'completed' }),
      batch({ id: BATCH_IDS.nailNext, name: 'Winter Batch', startOffset: 8, endOffset: 21, days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri'], startTime: '15:00', endTime: '17:00', seats: 12, status: 'upcoming' }),
    ],
    syllabus: [
      { id: 'mod_na1', title: 'Nail Prep & Gel Polish', topics: ['Nail anatomy and hygiene', 'Gel application', 'Safe removal'], hours: 6 },
      { id: 'mod_na2', title: 'Extensions', topics: ['Tips', 'Gel extensions', 'Shaping and filing'], hours: 8 },
      { id: 'mod_na3', title: 'Nail Art Designs', topics: ['Ombre', 'Stamping', 'Chrome, glitter and stones'], hours: 10 },
    ],
  },
  {
    ...seedBase(COURSE_IDS.skin, 350),
    title: 'Skin Care Specialist Course',
    type: 'diploma',
    description:
      'Go beyond basic facials. Understand skin science, treat acne and pigmentation, and run machine facials safely for every Nepali skin type and season.',
    duration: '6 weeks',
    fee: 28000,
    level: 'intermediate',
    instructor: STAFF_IDS.puja,
    seats: 8,
    image: null,
    certificate: true,
    isActive: true,
    batches: [
      batch({ id: BATCH_IDS.skinDone, name: 'Spring Batch', startOffset: -160, endOffset: -118, days: ['mon', 'wed', 'fri'], startTime: '10:00', endTime: '13:00', seats: 8, status: 'completed' }),
      batch({ id: BATCH_IDS.skinNext, name: 'Winter Batch', startOffset: 14, endOffset: 56, days: ['mon', 'wed', 'fri'], startTime: '10:00', endTime: '13:00', seats: 8, status: 'upcoming' }),
    ],
    syllabus: [
      { id: 'mod_sc1', title: 'Skin Science', topics: ['Skin layers and types', 'Seasonal care in Nepal', 'Product ingredients'], hours: 12 },
      { id: 'mod_sc2', title: 'Treatments', topics: ['Acne and blackheads', 'Pigmentation and tan', 'Anti-ageing basics'], hours: 16 },
      { id: 'mod_sc3', title: 'Machine Facials', topics: ['Hydra facial', 'High frequency', 'Galvanic and ultrasonic'], hours: 14 },
      { id: 'mod_sc4', title: 'Consultation & Safety', topics: ['Patch tests', 'Contraindications', 'Home-care plans'], hours: 8 },
    ],
  },
];
