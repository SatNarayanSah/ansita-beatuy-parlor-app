import { selectBatch, selectSeatsLeft, useCourseStore } from '@/store/courseStore';
import { useCustomerStore } from '@/store/customerStore';
import { newEntityMeta } from '@/store/entityHelpers';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Batch,
  Course,
  Enrollment,
  EnrollmentStatus,
  ID,
  ISODate,
  PaymentMethod,
} from '@/types';
import { isValidISODate, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { generateId } from '@/utils/id';

import { ApiError, ensureFound, simulateRequest } from './client';
import { notifyAdmins, notifyCustomer } from './notify';
import { requireAdmin, requireCustomerAccess, requireUser } from './session';

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

const getEnrollmentOrThrow = (id: ID): Enrollment =>
  ensureFound(useCourseStore.getState().getEnrollmentById(id), 'Enrollment');

const getCourseAndBatch = (courseId: ID, batchId: ID): { course: Course; batch: Batch } => {
  const course = ensureFound(useCourseStore.getState().getCourseById(courseId), 'Course');
  const batch = ensureFound(selectBatch(course, batchId), 'Batch');
  return { course, batch };
};

const upsertAttendance = (records: readonly AttendanceRecord[], record: AttendanceRecord): AttendanceRecord[] =>
  [...records.filter((item) => item.date !== record.date), record].sort((a, b) => a.date.localeCompare(b.date));

const studentName = (studentId: ID): string =>
  useCustomerStore.getState().getCustomerById(studentId)?.name ?? 'A student';

export const enrollmentService = {
  /** Customers only ever receive their own enrollments. */
  listEnrollments: ({ courseId = null, batchId = null, studentId = null, status = null }: EnrollmentFilter = {}): Promise<
    Enrollment[]
  > =>
    simulateRequest(() => {
      const user = requireUser();
      const scopedStudent = user.role === 'customer' ? user.customerId : studentId;
      return useCourseStore
        .getState()
        .enrollments.filter((enrollment) => (courseId ? enrollment.courseId === courseId : true))
        .filter((enrollment) => (batchId ? enrollment.batchId === batchId : true))
        .filter((enrollment) => (scopedStudent ? enrollment.studentId === scopedStudent : true))
        .filter((enrollment) => (status ? enrollment.status === status : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),

  getEnrollment: (id: ID): Promise<Enrollment> =>
    simulateRequest(() => {
      const enrollment = getEnrollmentOrThrow(id);
      requireCustomerAccess(enrollment.studentId);
      return enrollment;
    }),

  /**
   * Reserves a seat. Without a payment the enrollment is "pending" until the fee
   * is paid at the desk; any payment makes it "active".
   */
  enroll: ({ studentId, courseId, batchId, initialPayment }: EnrollInput): Promise<Enrollment> =>
    simulateRequest(() => {
      const user = requireCustomerAccess(studentId);
      if (initialPayment && user.role !== 'admin') throw new ApiError('FORBIDDEN');
      ensureFound(useCustomerStore.getState().getCustomerById(studentId), 'Student');

      const { course, batch } = getCourseAndBatch(courseId, batchId);
      if (!course.isActive) throw new ApiError('VALIDATION', 'This course is not accepting enrollments.');
      if (batch.status === 'completed') throw new ApiError('VALIDATION', 'This batch has already finished.');

      const { enrollments } = useCourseStore.getState();
      if (selectSeatsLeft(enrollments, batch) === 0) {
        throw new ApiError('CONFLICT', 'This batch is full. Please choose another batch.');
      }
      const duplicate = enrollments.some(
        (enrollment) =>
          enrollment.studentId === studentId &&
          enrollment.courseId === courseId &&
          (enrollment.status === 'pending' || enrollment.status === 'active'),
      );
      if (duplicate) throw new ApiError('CONFLICT', 'Already enrolled in this course.');

      if (initialPayment && (!Number.isInteger(initialPayment.amount) || initialPayment.amount <= 0)) {
        throw new ApiError('VALIDATION', 'Enter a valid payment amount.');
      }
      const paid = initialPayment ? Math.min(initialPayment.amount, course.fee) : 0;

      const enrollment: Enrollment = {
        ...newEntityMeta('enr'),
        studentId,
        courseId,
        batchId,
        status: paid > 0 ? 'active' : 'pending',
        feeTotal: course.fee,
        feePaid: paid,
        payments: initialPayment
          ? [{ id: generateId('pay'), amount: paid, paidOn: todayISO(), method: initialPayment.method }]
          : [],
        attendance: [],
        certificateIssued: false,
      };
      useCourseStore.getState().addEnrollment(enrollment);

      // Students are tagged so they can be filtered in the customer list.
      const student = useCustomerStore.getState().getCustomerById(studentId);
      if (student && !student.tags.includes('student')) {
        useCustomerStore.getState().updateCustomer(studentId, { tags: [...student.tags, 'student'] });
      }

      const link = { kind: 'enrollment', id: enrollment.id } as const;
      notifyCustomer(studentId, {
        type: 'enrollment',
        title: enrollment.status === 'active' ? 'Enrollment confirmed' : 'Enrollment received',
        message:
          enrollment.status === 'active'
            ? `You are enrolled in ${course.title} (${batch.name}).`
            : `We reserved your seat in ${course.title} (${batch.name}). Pay the fee at the front desk to confirm.`,
        link,
      });
      notifyAdmins(
        {
          type: 'enrollment',
          title: 'New course enrollment',
          message: `${studentName(studentId)} enrolled in ${course.title} (${batch.name}).`,
          link,
        },
        user.role === 'admin' ? user.id : undefined,
      );
      return enrollment;
    }),

  /** Students may drop their own pending/active enrollment; other changes are admin-only. */
  updateStatus: (id: ID, status: EnrollmentStatus): Promise<Enrollment> =>
    simulateRequest(() => {
      const enrollment = getEnrollmentOrThrow(id);
      const user = requireCustomerAccess(enrollment.studentId);
      if (user.role === 'customer' && status !== 'dropped') throw new ApiError('FORBIDDEN');
      if (enrollment.status === status) return enrollment;
      if (enrollment.status === 'completed' || enrollment.status === 'dropped') {
        throw new ApiError('VALIDATION', `This enrollment is already ${enrollment.status}.`);
      }
      useCourseStore.getState().updateEnrollment(id, { status });
      if (user.role === 'customer') {
        notifyAdmins({
          type: 'enrollment',
          title: 'Student dropped a course',
          message: `${studentName(enrollment.studentId)} dropped out of an enrollment.`,
          link: { kind: 'enrollment', id },
        });
      }
      return getEnrollmentOrThrow(id);
    }),

  recordFeePayment: (id: ID, { amount, method }: FeePaymentInput): Promise<Enrollment> =>
    simulateRequest(() => {
      requireAdmin();
      const enrollment = getEnrollmentOrThrow(id);
      if (enrollment.status === 'dropped') throw new ApiError('VALIDATION', 'This enrollment was dropped.');
      const due = enrollment.feeTotal - enrollment.feePaid;
      if (!Number.isInteger(amount) || amount <= 0) throw new ApiError('VALIDATION', 'Enter a valid amount.');
      if (amount > due) {
        throw new ApiError('VALIDATION', `Amount exceeds the balance due (${formatCurrency(due)}).`);
      }
      useCourseStore.getState().updateEnrollment(id, {
        feePaid: enrollment.feePaid + amount,
        payments: [...enrollment.payments, { id: generateId('pay'), amount, paidOn: todayISO(), method }],
        status: enrollment.status === 'pending' ? 'active' : enrollment.status,
      });
      notifyCustomer(enrollment.studentId, {
        type: 'payment',
        title: 'Fee received',
        message: `Thank you! ${formatCurrency(amount)} received towards your course fee.`,
        link: { kind: 'enrollment', id },
      });
      return getEnrollmentOrThrow(id);
    }),

  markAttendance: (id: ID, date: ISODate, status: AttendanceStatus): Promise<Enrollment> =>
    simulateRequest(() => {
      requireAdmin();
      if (!isValidISODate(date)) throw new ApiError('VALIDATION', 'Choose a valid date.');
      if (date > todayISO()) throw new ApiError('VALIDATION', 'Attendance cannot be marked for a future date.');
      const enrollment = getEnrollmentOrThrow(id);
      if (enrollment.status !== 'active') {
        throw new ApiError('VALIDATION', 'Attendance can only be marked for active students.');
      }
      useCourseStore.getState().updateEnrollment(id, {
        attendance: upsertAttendance(enrollment.attendance, { date, status }),
      });
      return getEnrollmentOrThrow(id);
    }),

  /** Marks one class for many students at once; inactive enrollments are skipped. */
  markBatchAttendance: (date: ISODate, entries: BatchAttendanceEntry[]): Promise<Enrollment[]> =>
    simulateRequest(() => {
      requireAdmin();
      if (!isValidISODate(date)) throw new ApiError('VALIDATION', 'Choose a valid date.');
      if (date > todayISO()) throw new ApiError('VALIDATION', 'Attendance cannot be marked for a future date.');
      const store = useCourseStore.getState();
      return entries.flatMap(({ enrollmentId, status }) => {
        const enrollment = store.getEnrollmentById(enrollmentId);
        if (!enrollment || enrollment.status !== 'active') return [];
        store.updateEnrollment(enrollmentId, {
          attendance: upsertAttendance(enrollment.attendance, { date, status }),
        });
        return [getEnrollmentOrThrow(enrollmentId)];
      });
    }),

  issueCertificate: (id: ID): Promise<Enrollment> =>
    simulateRequest(() => {
      requireAdmin();
      const enrollment = getEnrollmentOrThrow(id);
      const course = ensureFound(useCourseStore.getState().getCourseById(enrollment.courseId), 'Course');
      if (!course.certificate) throw new ApiError('VALIDATION', 'This course does not award a certificate.');
      if (enrollment.status !== 'completed') {
        throw new ApiError('VALIDATION', 'Mark the enrollment as completed before issuing a certificate.');
      }
      if (enrollment.feePaid < enrollment.feeTotal) {
        throw new ApiError('VALIDATION', 'Clear the pending fee before issuing a certificate.');
      }
      useCourseStore.getState().updateEnrollment(id, { certificateIssued: true });
      notifyCustomer(enrollment.studentId, {
        type: 'enrollment',
        title: 'Certificate issued 🎓',
        message: `Congratulations! Your ${course.title} certificate is ready to collect.`,
        link: { kind: 'enrollment', id },
      });
      return getEnrollmentOrThrow(id);
    }),
};
