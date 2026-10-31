import type { Offer } from '@/types';
import { daysFromToday } from '@/utils/date';

import { CATEGORY_IDS as C } from './categories';
import { seedBase } from './helpers';

export const OFFER_IDS = {
  festive: 'ofr_festive',
  bridal: 'ofr_bridal',
  welcome: 'ofr_welcome',
  hairSpa: 'ofr_hair_spa',
  nails: 'ofr_nails',
  teej: 'ofr_teej',
  winterSpa: 'ofr_winter_spa',
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
    title: 'Tihar Glow Festival',
    description: 'Get festival-ready with 20% off every facial and clean-up. Shine bright this Tihar!',
    code: 'TIHAR20',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 1000,
    minSpend: 0,
    categoryIds: [C.skin],
    fromOffset: -10,
    toOffset: 10,
    terms: ['Valid on facials and clean-ups only.', 'Maximum discount Rs. 1,000 per visit.', 'Cannot be combined with other offers.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.bridal,
    title: 'Bridal Season Special',
    description: 'Book your bridal makeup with any pre-bridal facial and save Rs. 5,000. Free trial look included.',
    code: null,
    discountType: 'flat',
    discountValue: 5000,
    maxDiscount: null,
    minSpend: 25000,
    categoryIds: [C.makeup, C.skin],
    fromOffset: -20,
    toOffset: 60,
    terms: ['Minimum bill Rs. 25,000.', 'Applied automatically at billing.', '50% advance required to confirm the date.'],
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
    id: OFFER_IDS.hairSpa,
    title: 'Weekday Hair Spa',
    description: 'Rs. 300 off hair spa and blow-dry, Sunday to Thursday. Beat the weekend rush!',
    code: null,
    discountType: 'flat',
    discountValue: 300,
    maxDiscount: null,
    minSpend: 1000,
    categoryIds: [C.hair],
    fromOffset: -30,
    toOffset: 30,
    terms: ['Valid Sunday to Thursday.', 'Not valid on public holidays.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.nails,
    title: 'Nail Art Combo',
    description: 'Gel extensions with a spa pedicure? Take Rs. 500 off the combo.',
    code: 'NAILS500',
    discountType: 'flat',
    discountValue: 500,
    maxDiscount: null,
    minSpend: 3500,
    categoryIds: [C.nails],
    fromOffset: -5,
    toOffset: 25,
    terms: ['Minimum bill Rs. 3,500 on nail services.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.teej,
    title: 'Teej Special',
    description: '25% off party makeup and sari draping for Teej celebrations.',
    code: 'TEEJ25',
    discountType: 'percent',
    discountValue: 25,
    maxDiscount: 1500,
    minSpend: 0,
    categoryIds: [C.makeup],
    fromOffset: -70,
    toOffset: -50,
    terms: ['Valid during the Teej week only.'],
    isActive: true,
  },
  {
    id: OFFER_IDS.winterSpa,
    title: 'Winter Spa Days',
    description: 'Warm up with 15% off hot stone therapy and full body massage.',
    code: null,
    discountType: 'percent',
    discountValue: 15,
    maxDiscount: null,
    minSpend: 0,
    categoryIds: [C.spa],
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
