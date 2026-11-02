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
  /** Points a customer needs before any can be used as a discount. */
  minRedeemPoints: number;
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
  payments: PaymentSettings;
}

/** One account customers can pay into (eSewa ID, Khalti number, bank account…). */
export interface PaymentAccount {
  enabled: boolean;
  accountName: string;
  accountNumber: string;
  bankName: string;
  /** Uploaded QR code image, or null. */
  qr: string | null;
  instructions: string;
}

export interface PaymentSettings {
  /** Whether customers may send "I've paid" requests at all. */
  requests: boolean;
  esewa: PaymentAccount;
  khalti: PaymentAccount;
  fonepay: PaymentAccount;
  bank: PaymentAccount;
}
