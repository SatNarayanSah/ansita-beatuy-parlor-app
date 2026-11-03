import type { BaseEntity, ID, ISODate, ImageUri } from './common';

export type DiscountType = 'percent' | 'flat';

/** A promotion shown to customers, e.g. a festive discount or a promo code. */
export interface Offer extends BaseEntity {
  title: string;
  description: string;
  /** Promo code to quote at booking; null when the offer applies automatically. */
  code: string | null;
  discountType: DiscountType;
  /** Percentage (0-100) or flat amount in NPR, depending on `discountType`. */
  discountValue: number;
  /** Cap on a percentage discount in NPR; null for no cap. */
  maxDiscount: number | null;
  /** Minimum bill in NPR; 0 for none. */
  minSpend: number;
  /** Categories the offer applies to; empty means every service. */
  categoryIds: ID[];
  validFrom: ISODate;
  validTo: ISODate;
  terms: string[];
  image: ImageUri | null;
  isActive: boolean;
}

/** What an offer takes off a booking before it is made (`POST /offers/quote`). */
export interface OfferQuote {
  /** The offer that applies; null when none does. */
  offer: Offer | null;
  /** NPR off the bill. */
  discount: number;
  /** Bill before the discount. */
  total: number;
  /** Bill after the discount. */
  payable: number;
  /** True when no code was needed (an automatic offer). */
  automatic: boolean;
}
