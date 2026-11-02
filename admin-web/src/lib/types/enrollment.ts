import type { BaseEntity, ID, ISODate, PaymentMethod } from './common';

export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'dropped';

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  date: ISODate;
  status: AttendanceStatus;
}

export interface FeePayment {
  id: ID;
  amount: number;
  paidOn: ISODate;
  method: PaymentMethod;
  /** Transaction ID, when it came from a customer's approved "I've paid" request. */
  reference?: string;
  requestId?: ID;
}

export interface Enrollment extends BaseEntity {
  /** Customer id of the student. */
  studentId: ID;
  courseId: ID;
  batchId: ID;
  status: EnrollmentStatus;
  feePaid: number;
  feeTotal: number;
  payments: FeePayment[];
  attendance: AttendanceRecord[];
  certificateIssued: boolean;
}
