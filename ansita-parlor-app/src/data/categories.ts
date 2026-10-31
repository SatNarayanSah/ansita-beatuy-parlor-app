import type { ServiceCategory } from '@/types';

import { seedBase } from './helpers';

export const CATEGORY_IDS = {
  hair: 'cat_hair',
  skin: 'cat_skin',
  waxing: 'cat_waxing',
  nails: 'cat_nails',
} as const;

export const buildCategories = (): ServiceCategory[] => [
  { ...seedBase(CATEGORY_IDS.hair, 700), name: 'Hair', icon: 'cut-outline', color: '#C2577A', sortOrder: 1 },
  { ...seedBase(CATEGORY_IDS.skin, 700), name: 'Facial & Bleach', icon: 'water-outline', color: '#2F8F63', sortOrder: 2 },
  { ...seedBase(CATEGORY_IDS.waxing, 700), name: 'Waxing', icon: 'sparkles-outline', color: '#C49A45', sortOrder: 3 },
  { ...seedBase(CATEGORY_IDS.nails, 700), name: 'Pedicure', icon: 'footsteps-outline', color: '#D0704F', sortOrder: 4 },
];
