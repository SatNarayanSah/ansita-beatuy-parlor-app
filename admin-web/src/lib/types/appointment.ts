import type { BaseEntity, ID, ISODate, PaymentMethod, TimeString } from './common';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

/** One payment taken at the desk. Revenue is counted on `paidOn`, not the booking date. */
export interface AppointmentPayment {
  id: ID;
  amount: number;
  paidOn: ISODate;
  method: PaymentMethod;
  /** Transaction ID, when it came from a customer's approved "I've paid" request. */
  reference?: string;
  requestId?: ID;
}

/** A bookable start time and whether it is free. */
export interface TimeSlot {
  time: TimeString;
  available: boolean;
}

export interface Appointment extends BaseEntity {
  customerId: ID;
  serviceIds: ID[];
  staffId: ID;
  date: ISODate;
  startTime: TimeString;
  endTime: TimeString;
  status: AppointmentStatus;
  notes: string;
  /** Total in NPR, captured at booking time so later price changes keep history intact. */
  totalPrice: number;
  amountPaid: number;
  /** Loyalty points used on this bill, and the NPR they took off it (0 when none). */
  pointsRedeemed: number;
  pointsDiscount: number;
  /** Offer on this bill (promo code or automatic) and the NPR it takes off (0 when none). */
  offerId: ID | null;
  offerCode: string | null;
  offerTitle: string | null;
  offerDiscount: number;
  /** Every payment with the day it was received; adds up to `amountPaid`. */
  payments: AppointmentPayment[];
  paymentStatus: PaymentStatus;
  /** How the last payment was made; null while unpaid. */
  paymentMethod: PaymentMethod | null;
  /** How the customer plans to pay, chosen when booking (informational). */
  preferredPaymentMethod: PaymentMethod | null;
  cancellationReason: string | null;
}
