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
  paymentMethod: PaymentMethod | null;
  cancellationReason: string | null;
}
