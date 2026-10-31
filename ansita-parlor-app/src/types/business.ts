import type { ISODate, TimeString } from './common';

export interface BusinessProfile {
  name: string;
  tagline: string;
  phone: string;
  /** E.164 mobile used for WhatsApp. */
  whatsapp: string;
  email: string;
  address: string;
  /** Public opening hours. Staff shifts are set per staff member. */
  openTime: TimeString;
  closeTime: TimeString;
}

/** A date the parlour is closed; no bookings can be made. */
export interface Holiday {
  date: ISODate;
  name: string;
}

export interface LoyaltyRules {
  enabled: boolean;
  /** Spend in NPR that earns one point on a completed visit. */
  rupeesPerPoint: number;
  /** NPR discount one point is worth when redeemed at the desk. */
  pointValue: number;
}

/** Which events notify admins. */
export interface AdminAlerts {
  newBookings: boolean;
  cancellations: boolean;
  payments: boolean;
  enrollments: boolean;
}

export interface BusinessSettings {
  profile: BusinessProfile;
  holidays: Holiday[];
  loyalty: LoyaltyRules;
  alerts: AdminAlerts;
}
