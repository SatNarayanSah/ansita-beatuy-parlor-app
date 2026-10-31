import type { BaseEntity, ID, ISODate, PaymentMethod, TimeString } from './common';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

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
  paymentStatus: PaymentStatus;
  /** How the last payment was made; null while unpaid. */
  paymentMethod: PaymentMethod | null;
  /** How the customer plans to pay, chosen when booking (informational). */
  preferredPaymentMethod: PaymentMethod | null;
  cancellationReason: string | null;
}
