import type { Offer } from '@/types';
import { daysFromToday } from '@/utils/date';

import { CATEGORY_IDS as C } from './categories';
import { seedBase } from './helpers';

export const OFFER_IDS = {
  festive: 'ofr_festive',
  facial: 'ofr_facial',
  welcome: 'ofr_welcome',
  hairCare: 'ofr_hair_care',
  nails: 'ofr_pedicure',
  teej: 'ofr_teej',
  winterWax: 'ofr_winter_wax',
} as const;

type OfferSeed = Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'validFrom' | 'validTo' | 'image'> & {
  id: string;
  fromOffset: number;
  toOffset: number;
};

/** Active, upcoming, expired and draft offers so every list state can be demoed. */
const OFFER_SEEDS: OfferSeed[] = [
  {
    id: OFFER_IDS.festive,
    title: 'Dashain Festival Offer',
    description: 'Festival prices on every service until Dashain: hair treatments, facials, waxing and pedicure.',
    code: 'DASHAIN',
    discountType: 'percent',
    discountValue: 28,
    maxDiscount: null,
    minSpend: 0,
    categoryIds: [],
    fromOffset: -10,
    toOffset: 10,
    terms: ['Valid until Dashain.', 'Hair prices are for any length.', 'Cannot be combined with other offers.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.facial,
    title: 'Glow Facial Week',
    description: 'Ani Brand Facial with face or deep bleaching? Save 15% on the combo.',
    code: null,
    discountType: 'percent',
    discountValue: 15,
    maxDiscount: 300,
    minSpend: 1800,
    categoryIds: [C.skin],
    fromOffset: -20,
    toOffset: 40,
    terms: ['Minimum bill Rs. 1,800 on facial and bleach services.', 'Applied automatically at billing.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.welcome,
    title: 'First Visit Offer',
    description: 'New to Ansita? Enjoy 15% off your first booking through the app.',
    code: 'WELCOME15',
    discountType: 'percent',
    discountValue: 15,
    maxDiscount: 500,
    minSpend: 500,
    categoryIds: [],
    fromOffset: -200,
    toOffset: 165,
    terms: ['For first-time customers only.', 'Maximum discount Rs. 500.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.hairCare,
    title: 'Weekday Hair Care',
    description: 'Rs. 300 off protein, botox, smoothing or nanoplastia, Sunday to Thursday.',
    code: null,
    discountType: 'flat',
    discountValue: 300,
    maxDiscount: null,
    minSpend: 3000,
    categoryIds: [C.hair],
    fromOffset: -30,
    toOffset: 30,
    terms: ['Valid Sunday to Thursday.', 'Not valid on public holidays.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.nails,
    title: 'Wax & Pedicure Combo',
    description: 'Book any waxing with a pedicure and take Rs. 300 off.',
    code: 'COMBO300',
    discountType: 'flat',
    discountValue: 300,
    maxDiscount: null,
    minSpend: 3000,
    categoryIds: [C.waxing, C.nails],
    fromOffset: -5,
    toOffset: 25,
    terms: ['Minimum bill Rs. 3,000 on waxing and pedicure.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.teej,
    title: 'Teej Hair Colour Special',
    description: '20% off hair colour and cap highlights for Teej celebrations.',
    code: 'TEEJ20',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 700,
    minSpend: 0,
    categoryIds: [C.hair],
    fromOffset: -70,
    toOffset: -50,
    terms: ['Valid during the Teej week only.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.winterWax,
    title: 'Winter Waxing Days',
    description: '10% off full body waxing and hand and leg waxing.',
    code: null,
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: null,
    minSpend: 0,
    categoryIds: [C.waxing],
    fromOffset: 35,
    toOffset: 75,
    terms: ['Draft: publish when winter starts.'],
    isActive: false,
  },
];

export const buildOffers = (): Offer[] =>
  OFFER_SEEDS.map(({ fromOffset, toOffset, ...seed }) => ({
    ...seedBase(seed.id, Math.max(1, -fromOffset + 3)),
    ...seed,
    validFrom: daysFromToday(fromOffset),
    validTo: daysFromToday(toOffset),
    image: null,
  }));
