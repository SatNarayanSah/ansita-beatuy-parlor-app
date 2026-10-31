import type { Service } from '@/types';

import { CATEGORY_IDS as C } from './categories';
import { seedBase } from './helpers';

type ServiceSeed = Pick<Service, 'id' | 'name' | 'categoryId' | 'duration' | 'price' | 'description'> & {
  isActive?: boolean;
};

/** Prices in NPR, typical of a mid-range Kathmandu parlour. Durations in minutes. */
const SERVICE_SEEDS: ServiceSeed[] = [
  // Hair
  { id: 'svc_haircut', name: 'Haircut & Blow-dry', categoryId: C.hair, duration: 45, price: 600, description: 'Consultation, wash, precision cut and blow-dry finish.' },
  { id: 'svc_kids_haircut', name: 'Kids Haircut', categoryId: C.hair, duration: 30, price: 350, description: 'Gentle, quick cut for children under 12.' },
  { id: 'svc_blowdry', name: 'Blow-dry & Styling', categoryId: C.hair, duration: 30, price: 500, description: 'Straight, wavy or curled styling for any occasion.' },
  { id: 'svc_root_touchup', name: 'Root Touch-up', categoryId: C.hair, duration: 60, price: 1800, description: 'Covers up to 1 inch of regrowth with ammonia-free colour.' },
  { id: 'svc_global_color', name: 'Global Hair Colour', categoryId: C.hair, duration: 120, price: 4500, description: 'Full-length colour using professional ammonia-free products.' },
  { id: 'svc_highlights', name: 'Highlights / Balayage', categoryId: C.hair, duration: 150, price: 6500, description: 'Hand-painted or foil highlights with toner and gloss.' },
  { id: 'svc_rebonding', name: 'Hair Rebonding', categoryId: C.hair, duration: 240, price: 8500, description: 'Permanent straightening for smooth, manageable hair. Price for shoulder length.' },
  { id: 'svc_keratin', name: 'Keratin Treatment', categoryId: C.hair, duration: 180, price: 7500, description: 'Frizz-control smoothening that lasts up to 4 months.' },
  { id: 'svc_hair_spa', name: 'Hair Spa', categoryId: C.hair, duration: 60, price: 1500, description: 'Deep-conditioning mask, steam and relaxing scalp massage.' },
  // Skin
  { id: 'svc_cleanup', name: 'Basic Clean-up', categoryId: C.skin, duration: 45, price: 900, description: 'Cleansing, scrub, blackhead removal and a soothing pack.' },
  { id: 'svc_fruit_facial', name: 'Fruit Facial', categoryId: C.skin, duration: 60, price: 1500, description: 'Refreshing facial with natural fruit extracts for a healthy glow.' },
  { id: 'svc_gold_facial', name: 'Gold Facial', categoryId: C.skin, duration: 75, price: 2500, description: 'Radiance-boosting facial with gold-infused cream and massage.' },
  { id: 'svc_hydra_facial', name: 'Hydra Facial', categoryId: C.skin, duration: 60, price: 3500, description: 'Machine cleanse, exfoliation and deep hydration in one session.' },
  { id: 'svc_whitening', name: 'Skin Brightening Facial', categoryId: C.skin, duration: 75, price: 3000, description: 'Evens out skin tone and reduces dullness and pigmentation.' },
  { id: 'svc_detan', name: 'De-tan Pack', categoryId: C.skin, duration: 30, price: 800, description: 'Removes sun tan from face and neck. Add-on friendly.' },
  // Makeup
  { id: 'svc_party_makeup', name: 'Party Makeup', categoryId: C.makeup, duration: 60, price: 3000, description: 'Long-lasting makeup with a simple hairstyle for parties and Teej.' },
  { id: 'svc_engagement', name: 'Engagement Makeup', categoryId: C.makeup, duration: 120, price: 8000, description: 'HD makeup, hairstyle and sari draping for your engagement (sagai).' },
  { id: 'svc_bridal', name: 'Bridal Makeup', categoryId: C.makeup, duration: 180, price: 20000, description: 'Complete bridal look: HD makeup, hairdo, sari or lehenga draping and jewellery setting.' },
  { id: 'svc_draping', name: 'Sari Draping', categoryId: C.makeup, duration: 20, price: 500, description: 'Neat sari or gunyu cholo draping in any style.' },
  // Nails
  { id: 'svc_manicure', name: 'Classic Manicure', categoryId: C.nails, duration: 40, price: 800, description: 'Shaping, cuticle care, hand massage and polish.' },
  { id: 'svc_pedicure', name: 'Spa Pedicure', categoryId: C.nails, duration: 50, price: 1200, description: 'Warm soak, scrub, foot massage and polish.' },
  { id: 'svc_gel_polish', name: 'Gel Polish', categoryId: C.nails, duration: 45, price: 1500, description: 'Chip-free gel colour that lasts up to 3 weeks.' },
  { id: 'svc_gel_extensions', name: 'Gel Nail Extensions', categoryId: C.nails, duration: 90, price: 3000, description: 'Full set of gel extensions with basic nail art.' },
  // Threading & waxing
  { id: 'svc_eyebrow', name: 'Eyebrow Threading', categoryId: C.waxing, duration: 15, price: 100, description: 'Clean, precise eyebrow shaping with thread.' },
  { id: 'svc_upper_lip', name: 'Upper Lip Threading', categoryId: C.waxing, duration: 10, price: 50, description: 'Quick upper-lip hair removal.' },
  { id: 'svc_full_face', name: 'Full Face Threading', categoryId: C.waxing, duration: 30, price: 350, description: 'Eyebrows, forehead, upper lip, chin and sides.' },
  { id: 'svc_arms_wax', name: 'Full Arms Waxing', categoryId: C.waxing, duration: 30, price: 600, description: 'Rica wax, gentle on sensitive skin.' },
  { id: 'svc_legs_wax', name: 'Full Legs Waxing', categoryId: C.waxing, duration: 45, price: 900, description: 'Rica wax for smooth legs.' },
  { id: 'svc_body_wax', name: 'Full Body Waxing', categoryId: C.waxing, duration: 90, price: 2800, description: 'Arms, legs, underarms and back with Rica wax.' },
  // Spa & massage
  { id: 'svc_head_massage', name: 'Head & Shoulder Massage', categoryId: C.spa, duration: 30, price: 1000, description: 'Warm-oil massage that eases neck and shoulder tension.' },
  { id: 'svc_body_massage', name: 'Full Body Massage', categoryId: C.spa, duration: 60, price: 3000, description: 'Relaxing aromatherapy massage with essential oils.' },
  { id: 'svc_hot_stone', name: 'Hot Stone Therapy', categoryId: C.spa, duration: 90, price: 4500, description: 'Heated basalt stones and deep massage for muscle relief.' },
  { id: 'svc_body_polish', name: 'Body Polishing', categoryId: C.spa, duration: 75, price: 3800, description: 'Exfoliating scrub and wrap for soft, glowing skin.', isActive: false },
];

export const buildServices = (): Service[] =>
  SERVICE_SEEDS.map(({ isActive = true, ...seed }) => ({
    ...seedBase(seed.id, 600),
    ...seed,
    image: null,
    isActive,
  }));
