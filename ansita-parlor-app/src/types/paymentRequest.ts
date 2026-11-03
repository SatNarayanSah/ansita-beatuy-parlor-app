import type { BaseEntity, ID, ImageUri, ISODate, ISODateTime, PaymentRequestMethod } from './common';

export type PaymentRequestTarget = 'appointment' | 'enrollment';

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * A customer's "I've paid": they paid the parlour's eSewa/Khalti/Fonepay/bank account outside
 * the app (or paid cash at the parlour that isn't on the bill yet) and ask the parlour to verify it. Nothing changes on the bill until an admin approves.
 */
export interface PaymentRequest extends BaseEntity {
  targetType: PaymentRequestTarget;
  targetId: ID;
  customerId: ID;
  /** What the customer says they paid. */
  amount: number;
  method: PaymentRequestMethod;
  /** Transaction ID (online) or receipt no. / who took the money (cash, may be empty); upper-cased by the server. */
  reference: string;
  paidOn: ISODate;
  note: string;
  /** Screenshot of the payment, if sent. */
  proof: ImageUri | null;
  status: PaymentRequestStatus;
  /** What the parlour actually received, once approved. */
  approvedAmount: number | null;
  /** The payment entry recorded on the bill when approved. */
  paymentId: ID | null;
  /** Rejection reason, or the admin's note on approval. */
  reviewNote: string;
  reviewedBy: ID | null;
  reviewedAt: ISODateTime | null;
  // Added by the server for display.
  customerName: string;
  customerPhone: string;
  /** e.g. "Bridal Makeup · Today" or "Makeup Artistry course fee". */
  targetLabel: string;
  /** Balance still due on the bill now. */
  balanceDue: number;
}

export interface PaymentRequestInput {
  targetType: PaymentRequestTarget;
  targetId: ID;
  amount: number;
  method: PaymentRequestMethod;
  /** 4-64 characters for online methods; optional (up to 64) for cash. */
  reference: string;
  paidOn: ISODate;
  note?: string;
  /** Uploaded image URL. */
  proof?: ImageUri | null;
}

export interface PaymentRequestFilter {
  status?: PaymentRequestStatus | null;
  targetType?: PaymentRequestTarget | null;
  targetId?: ID | null;
}
