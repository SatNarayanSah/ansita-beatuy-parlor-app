import type { BaseEntity, ID, ISODate, OnlineMethod } from './common';

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** A customer's "I've paid" message. Nothing changes on the bill until an admin approves it. */
export interface PaymentRequest extends BaseEntity {
  targetType: 'appointment' | 'enrollment';
  targetId: ID;
  customerId: ID;
  amount: number;
  method: OnlineMethod;
  /** Transaction ID from eSewa/Khalti/Fonepay or the bank, upper-cased. */
  reference: string;
  paidOn: ISODate;
  note: string;
  /** Uploaded screenshot, or null. */
  proof: string | null;
  status: PaymentRequestStatus;
  /** What the admin confirmed arrived (may differ from `amount`). */
  approvedAmount: number | null;
  paymentId: string | null;
  /** Reason when rejected, optional note when approved. */
  reviewNote: string;
  reviewedBy: ID | null;
  reviewedAt: string | null;
  // Added by the server for display:
  customerName: string;
  customerPhone: string;
  targetLabel: string;
  balanceDue: number;
}
