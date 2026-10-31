import type { BaseEntity, Gender, ISODate, ISODateTime, ImageUri } from './common';

export type CustomerTag = 'vip' | 'regular' | 'new' | 'bridal' | 'student' | 'inactive';

export interface Address {
  line1: string;
  line2: string;
  city: string;
  /** Nepal province, e.g. "Bagmati". */
  province: string;
  postalCode: string;
}

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  dob: ISODate | null;
  address: Address;
  notes: string;
  loyaltyPoints: number;
  joinedAt: ISODateTime;
  avatar: ImageUri | null;
  tags: CustomerTag[];
}
