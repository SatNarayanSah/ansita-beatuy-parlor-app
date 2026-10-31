import type { BaseEntity, ID, ImageUri } from './common';

export interface ServiceCategory extends BaseEntity {
  name: string;
  /** Ionicons glyph name from @expo/vector-icons. */
  icon: string;
  color: string;
  sortOrder: number;
}

export interface Service extends BaseEntity {
  name: string;
  categoryId: ID;
  /** Duration in minutes. */
  duration: number;
  /** Price in NPR (whole rupees). */
  price: number;
  description: string;
  image: ImageUri | null;
  isActive: boolean;
}
