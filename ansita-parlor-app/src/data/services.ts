import type { Service } from '@/types';

import { CATEGORY_IDS as C } from './categories';
import { seedBase } from './helpers';

type ServiceSeed = Pick<Service, 'id' | 'name' | 'categoryId' | 'duration' | 'price' | 'description'>;

/**
 * The parlour's actual service menu. Prices in NPR are the regular prices
 * (the Dashain flyer prices + 40%). Durations in minutes.
 */
const SERVICE_SEEDS: ServiceSeed[] = [
  // Hair
  { id: 'svc_straightening', name: 'Hair Straightening (Any Length)', categoryId: C.hair, duration: 150, price: 2520, description: 'Sleek, straight hair with a heat-protecting treatment.' },
  { id: 'svc_hair_protein', name: 'Hair Protein (Any Length)', categoryId: C.hair, duration: 90, price: 3500, description: 'Protein treatment that repairs and strengthens damaged hair.' },
  { id: 'svc_hair_botox', name: 'Hair Botox (Any Length)', categoryId: C.hair, duration: 120, price: 3500, description: 'Deep-conditioning repair that restores softness and shine.' },
  { id: 'svc_hair_color', name: 'Hair Color (Any Length - Machine Wash)', categoryId: C.hair, duration: 120, price: 3500, description: 'Full hair colour with professional products, finished with a machine wash.' },
  { id: 'svc_smoothing', name: 'Hair Smoothing (Any Length)', categoryId: C.hair, duration: 150, price: 3220, description: 'Controls frizz and adds shine while keeping natural movement.' },
  { id: 'svc_nanoplastia', name: 'Hair Nanoplastia (Any Length)', categoryId: C.hair, duration: 180, price: 3500, description: 'Formaldehyde-free straightening for smooth, healthy-looking hair.' },
  { id: 'svc_cap_highlights', name: 'Cap Highlights (Any Length)', categoryId: C.hair, duration: 60, price: 700, description: 'Classic cap-method highlights for soft, even streaks.' },
  // Facial & bleaching
  { id: 'svc_ani_facial', name: 'Ani Brand Facial', categoryId: C.skin, duration: 60, price: 1400, description: 'Cleansing, massage and mask with Ani brand facial products.' },
  { id: 'svc_face_bleach', name: 'Face Bleaching', categoryId: C.skin, duration: 20, price: 420, description: 'Lightens facial hair for an even, brighter look.' },
  { id: 'svc_deep_bleach', name: 'Deep Bleaching', categoryId: C.skin, duration: 30, price: 700, description: 'Stronger bleach for face and neck with a soothing finish.' },
  // Waxing
  { id: 'svc_body_wax', name: 'Full Body Waxing', categoryId: C.waxing, duration: 90, price: 2100, description: 'Arms, legs, underarms and back.' },
  { id: 'svc_hand_leg_wax', name: 'Waxing (Hand & Leg)', categoryId: C.waxing, duration: 60, price: 1400, description: 'Full hands and full legs waxing.' },
  // Pedicure
  { id: 'svc_pedicure', name: 'Pedicure', categoryId: C.nails, duration: 50, price: 1680, description: 'Warm soak, scrub, foot massage and polish.' },
];

export const buildServices = (): Service[] =>
  SERVICE_SEEDS.map((seed) => ({
    ...seedBase(seed.id, 600),
    ...seed,
    image: null,
    isActive: true,
  }));
