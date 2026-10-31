import type { ServiceCategory } from '@/types';

import { seedBase } from './helpers';

export const CATEGORY_IDS = {
  hair: 'cat_hair',
  skin: 'cat_skin',
  makeup: 'cat_makeup',
  bridal: 'cat_bridal',
  nails: 'cat_nails',
  spa: 'cat_spa',
} as const;

export const buildCategories = (): ServiceCategory[] => [
  { ...seedBase(CATEGORY_IDS.hair, 400), name: 'Hair', icon: 'cut-outline', color: '#D65A87', sortOrder: 1 },
  { ...seedBase(CATEGORY_IDS.skin, 400), name: 'Skin', icon: 'water-outline', color: '#2E9E6A', sortOrder: 2 },
  { ...seedBase(CATEGORY_IDS.makeup, 400), name: 'Makeup', icon: 'color-palette-outline', color: '#8E4FC2', sortOrder: 3 },
  { ...seedBase(CATEGORY_IDS.bridal, 400), name: 'Bridal', icon: 'diamond-outline', color: '#C99A3E', sortOrder: 4 },
  { ...seedBase(CATEGORY_IDS.nails, 400), name: 'Nails', icon: 'hand-left-outline', color: '#E06C4F', sortOrder: 5 },
  { ...seedBase(CATEGORY_IDS.spa, 400), name: 'Spa', icon: 'leaf-outline', color: '#3973D6', sortOrder: 6 },
];
