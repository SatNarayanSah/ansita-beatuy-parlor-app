import type { Service } from '@/types';

import { CATEGORY_IDS } from './categories';
import { seedBase } from './helpers';

type ServiceSeed = Pick<Service, 'id' | 'name' | 'categoryId' | 'duration' | 'price' | 'description'> & {
  isActive?: boolean;
};

const SERVICE_SEEDS: ServiceSeed[] = [
  // Hair
  { id: 'svc_haircut', name: 'Haircut & Styling', categoryId: CATEGORY_IDS.hair, duration: 45, price: 500, description: 'Consultation, wash, precision cut and blow-dry styling.' },
  { id: 'svc_hair_spa', name: 'Hair Spa', categoryId: CATEGORY_IDS.hair, duration: 60, price: 1200, description: 'Deep-conditioning treatment with scalp massage and steam.' },
  { id: 'svc_global_color', name: 'Global Hair Colour', categoryId: CATEGORY_IDS.hair, duration: 120, price: 3500, description: 'Full-length colour with ammonia-free professional products.' },
  { id: 'svc_keratin', name: 'Keratin Treatment', categoryId: CATEGORY_IDS.hair, duration: 180, price: 6000, description: 'Smoothening treatment that reduces frizz for up to 4 months.' },
  { id: 'svc_blowdry', name: 'Blow-dry & Ironing', categoryId: CATEGORY_IDS.hair, duration: 30, price: 400, description: 'Quick styling with blow-dry, straightening or curls.' },
  // Skin
  { id: 'svc_cleanup', name: 'Classic Clean-up', categoryId: CATEGORY_IDS.skin, duration: 45, price: 700, description: 'Cleansing, exfoliation, extraction and a soothing mask.' },
  { id: 'svc_facial_gold', name: 'Gold Facial', categoryId: CATEGORY_IDS.skin, duration: 75, price: 1800, description: 'Radiance-boosting facial with gold-infused products.' },
  { id: 'svc_hydra_facial', name: 'Hydra Facial', categoryId: CATEGORY_IDS.skin, duration: 60, price: 3000, description: 'Deep hydration and cleansing using hydradermabrasion.' },
  { id: 'svc_threading', name: 'Eyebrow Threading', categoryId: CATEGORY_IDS.skin, duration: 15, price: 60, description: 'Precise eyebrow shaping with thread.' },
  { id: 'svc_waxing_full', name: 'Full Body Waxing', categoryId: CATEGORY_IDS.skin, duration: 90, price: 1500, description: 'Rica waxing for arms, legs and underarms.' },
  // Makeup
  { id: 'svc_party_makeup', name: 'Party Makeup', categoryId: CATEGORY_IDS.makeup, duration: 60, price: 2500, description: 'Long-lasting makeup with hairstyling for parties and events.' },
  { id: 'svc_hd_makeup', name: 'HD Makeup', categoryId: CATEGORY_IDS.makeup, duration: 90, price: 4500, description: 'Camera-ready HD makeup for shoots and functions.' },
  // Bridal
  { id: 'svc_bridal_hd', name: 'Bridal HD Makeup', categoryId: CATEGORY_IDS.bridal, duration: 180, price: 15000, description: 'Complete bridal look: HD makeup, hairdo, draping and accessories setting.' },
  { id: 'svc_bridal_package', name: 'Pre-Bridal Package', categoryId: CATEGORY_IDS.bridal, duration: 240, price: 12000, description: 'Facial, body polishing, waxing, manicure, pedicure and hair spa.' },
  { id: 'svc_engagement', name: 'Engagement Makeup', categoryId: CATEGORY_IDS.bridal, duration: 120, price: 8000, description: 'Elegant engagement look with hairstyle and saree draping.' },
  // Nails
  { id: 'svc_manicure', name: 'Classic Manicure', categoryId: CATEGORY_IDS.nails, duration: 40, price: 600, description: 'Nail shaping, cuticle care, massage and polish.' },
  { id: 'svc_pedicure', name: 'Spa Pedicure', categoryId: CATEGORY_IDS.nails, duration: 50, price: 900, description: 'Foot soak, scrub, massage and polish.' },
  { id: 'svc_gel_nails', name: 'Gel Nail Extensions', categoryId: CATEGORY_IDS.nails, duration: 90, price: 2200, description: 'Gel extensions with a choice of finish and basic art.' },
  // Spa
  { id: 'svc_body_massage', name: 'Relaxing Body Massage', categoryId: CATEGORY_IDS.spa, duration: 60, price: 2000, description: 'Full-body aromatherapy massage to relieve stress.' },
  { id: 'svc_body_polish', name: 'Body Polishing', categoryId: CATEGORY_IDS.spa, duration: 75, price: 2800, description: 'Exfoliating scrub and wrap for glowing skin.', isActive: false },
];

export const buildServices = (): Service[] =>
  SERVICE_SEEDS.map(({ isActive = true, ...seed }) => ({
    ...seedBase(seed.id, 365),
    ...seed,
    image: null,
    isActive,
  }));
