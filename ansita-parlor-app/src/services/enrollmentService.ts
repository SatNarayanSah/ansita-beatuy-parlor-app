import { useCourseStore } from '@/store/courseStore';
import { useCustomerStore } from '@/store/customerStore';
import type { AttendanceStatus, Customer, Enrollment, EnrollmentStatus, ID, ISODate, PaymentMethod } from '@/types';

import { api } from './client';
import { refreshNotificationsSoon } from './sync';

export interface EnrollmentFilter {
  courseId?: ID | null;
  batchId?: ID | null;
  studentId?: ID | null;
  status?: EnrollmentStatus | null;
}

export interface EnrollInput {
  studentId: ID;
  courseId: ID;
  batchId: ID;
  /** Admin only: fee collected at the desk while enrolling. */
  initialPayment?: { amount: number; method: PaymentMethod };
}

export interface FeePaymentInput {
  amount: number;
  method: PaymentMethod;
}

export interface BatchAttendanceEntry {
  enrollmentId: ID;
  status: AttendanceStatus;
}

const cacheEnrollment = (enrollment: Enrollment): Enrollment => {
  useCourseStore.getState().mergeEnrollments([enrollment]);
  refreshNotificationsSoon();
  return enrollment;
};

export const enrollmentService = {
  /** Customers only ever receive their own enrollments (enforced by the server). */
  listEnrollments: async (filter: EnrollmentFilter = {}): Promise<Enrollment[]> => {
    const list = await api<Enrollment[]>('GET', '/enrollments', { query: { ...filter } });
    const store = useCourseStore.getState();
    if (Object.values(filter).every((value) => !value)) store.setEnrollments(list);
    else store.mergeEnrollments(list);
    return list;
  },

  getEnrollment: async (id: ID): Promise<Enrollment> => {
    const enrollment = await api<Enrollment>('GET', `/enrollments/${id}`);
    useCourseStore.getState().mergeEnrollments([enrollment]);
    return enrollment;
  },

  /**
   * Reserves a seat. Without a payment the enrollment is "pending" until the fee
   * is paid at the desk; any payment makes it "active".
   */
  enroll: async (input: EnrollInput): Promise<Enrollment> => {
    const enrollment = cacheEnrollment(await api<Enrollment>('POST', '/enrollments', { body: input }));
    // The server tags the student; refresh their profile so the CRM shows it.
    const student = await api<Customer>('GET', `/customers/${input.studentId}`).catch(() => null);
    if (student) useCustomerStore.getState().mergeCustomers([student]);
    return enrollment;
  },

  /** Students may drop their own pending/active enrollment; other changes are admin-only. */
  updateStatus: async (id: ID, status: EnrollmentStatus): Promise<Enrollment> =>
    cacheEnrollment(await api<Enrollment>('POST', `/enrollments/${id}/status`, { body: { status } })),

  recordFeePayment: async (id: ID, input: FeePaymentInput): Promise<Enrollment> =>
    cacheEnrollment(await api<Enrollment>('POST', `/enrollments/${id}/payments`, { body: input })),

  markAttendance: async (id: ID, date: ISODate, status: AttendanceStatus): Promise<Enrollment> => {
    const enrollment = await api<Enrollment>('POST', `/enrollments/${id}/attendance`, { body: { date, status } });
    useCourseStore.getState().mergeEnrollments([enrollment]);
    return enrollment;
  },

  /** Marks one class for many students at once; inactive enrollments are skipped. */
  markBatchAttendance: async (date: ISODate, entries: BatchAttendanceEntry[]): Promise<Enrollment[]> => {
    const list = await api<Enrollment[]>('POST', '/enrollments/attendance', { body: { date, entries } });
    useCourseStore.getState().mergeEnrollments(list);
    return list;
  },

  issueCertificate: async (id: ID): Promise<Enrollment> =>
    cacheEnrollment(await api<Enrollment>('POST', `/enrollments/${id}/certificate`)),
};
