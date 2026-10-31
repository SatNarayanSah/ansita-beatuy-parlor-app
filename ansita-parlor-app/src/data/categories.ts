import type { ServiceCategory } from '@/types';

import { seedBase } from './helpers';

export const CATEGORY_IDS = {
  hair: 'cat_hair',
  skin: 'cat_skin',
  makeup: 'cat_makeup',
  nails: 'cat_nails',
  waxing: 'cat_waxing',
  spa: 'cat_spa',
} as const;

export const buildCategories = (): ServiceCategory[] => [
  { ...seedBase(CATEGORY_IDS.hair, 700), name: 'Hair', icon: 'cut-outline', color: '#C2577A', sortOrder: 1 },
  { ...seedBase(CATEGORY_IDS.skin, 700), name: 'Skin', icon: 'water-outline', color: '#2F8F63', sortOrder: 2 },
  { ...seedBase(CATEGORY_IDS.makeup, 700), name: 'Makeup', icon: 'color-palette-outline', color: '#5A2D52', sortOrder: 3 },
  { ...seedBase(CATEGORY_IDS.nails, 700), name: 'Nails', icon: 'hand-left-outline', color: '#D0704F', sortOrder: 4 },
  { ...seedBase(CATEGORY_IDS.waxing, 700), name: 'Threading & Waxing', icon: 'sparkles-outline', color: '#C49A45', sortOrder: 5 },
  { ...seedBase(CATEGORY_IDS.spa, 700), name: 'Spa & Massage', icon: 'leaf-outline', color: '#3768B5', sortOrder: 6 },
];
