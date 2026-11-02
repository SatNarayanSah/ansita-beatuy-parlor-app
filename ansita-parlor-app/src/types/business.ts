import type { ImageUri, ISODate, OnlinePaymentMethod, TimeString } from './common';

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

/** The parlour's account for one online method, shown to customers who want to pay by it. */
export interface PaymentAccount {
  enabled: boolean;
  accountName: string;
  /** Wallet ID / mobile number, or the bank account number. */
  accountNumber: string;
  /** Bank transfers only. */
  bankName: string;
  /** Full link to the uploaded QR code image. */
  qr: ImageUri | null;
  instructions: string;
}

/** Online accounts customers pay into, and whether they may send "I've paid" requests at all. */
export type PaymentSettings = { requests: boolean } & Record<OnlinePaymentMethod, PaymentAccount>;

/** PATCH /settings/payments: any subset; `qr` must be an uploaded image URL or null. */
export type PaymentSettingsUpdate = { requests?: boolean } & Partial<Record<OnlinePaymentMethod, Partial<PaymentAccount>>>;

export interface BusinessSettings {
  profile: BusinessProfile;
  holidays: Holiday[];
  loyalty: LoyaltyRules;
  alerts: AdminAlerts;
  payments: PaymentSettings;
}
