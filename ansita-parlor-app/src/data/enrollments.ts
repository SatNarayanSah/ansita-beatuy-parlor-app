import type { AttendanceRecord, Batch, Enrollment, EnrollmentStatus, PaymentMethod } from '@/types';
import { addDaysISO, daysFromToday, todayISO, weekdayOf } from '@/utils/date';

import { BATCH_IDS as B, buildCourses } from './courses';
import { customerId } from './customers';
import { seedBase } from './helpers';
import { createRandom, type SeededRandom } from './random';

interface EnrollmentSeed {
  /** 1-based customer number, i.e. `cus_004` is 4. */
  student: number;
  batchId: string;
  status: EnrollmentStatus;
  enrolledDaysAgo: number;
  /** [amount, daysAgo, method] */
  payments: [number, number, PaymentMethod][];
  certificateIssued?: boolean;
  /** For dropped students: attendance stops this many days after the batch start. */
  droppedAfterDays?: number;
}

const ENROLLMENT_SEEDS: EnrollmentSeed[] = [
  // Basic Beautician
  { student: 19, batchId: B.beauticianDone, status: 'completed', enrolledDaysAgo: 140, payments: [[20000, 140, 'cash'], [15000, 95, 'esewa']], certificateIssued: true },
  { student: 21, batchId: B.beauticianDone, status: 'completed', enrolledDaysAgo: 135, payments: [[35000, 135, 'fonepay']], certificateIssued: true },
  { student: 24, batchId: B.beauticianDone, status: 'dropped', enrolledDaysAgo: 132, payments: [[10000, 132, 'cash']], droppedAfterDays: 24 },
  { student: 4, batchId: B.beauticianNow, status: 'active', enrolledDaysAgo: 52, payments: [[15000, 52, 'esewa'], [5000, 20, 'cash']] },
  { student: 18, batchId: B.beauticianNext, status: 'active', enrolledDaysAgo: 15, payments: [[10000, 15, 'khalti']] },
  { student: 13, batchId: B.beauticianNext, status: 'pending', enrolledDaysAgo: 4, payments: [] },
  // Advanced Makeup
  { student: 27, batchId: B.makeupNow, status: 'active', enrolledDaysAgo: 24, payments: [[30000, 24, 'fonepay']] },
  { student: 23, batchId: B.makeupNow, status: 'active', enrolledDaysAgo: 26, payments: [[15000, 26, 'esewa']] },
  // Bridal Makeup
  { student: 23, batchId: B.bridalDone, status: 'completed', enrolledDaysAgo: 110, payments: [[25000, 110, 'cash'], [20000, 80, 'cash']], certificateIssued: true },
  { student: 12, batchId: B.bridalNow, status: 'active', enrolledDaysAgo: 18, payments: [[25000, 18, 'khalti']] },
  // Hair Styling
  { student: 20, batchId: B.hairNow, status: 'active', enrolledDaysAgo: 40, payments: [[10000, 40, 'cash'], [5000, 10, 'esewa']] },
  { student: 28, batchId: B.hairNext, status: 'active', enrolledDaysAgo: 9, payments: [[10000, 9, 'card']] },
  // Nail Art
  { student: 10, batchId: B.nailDone, status: 'completed', enrolledDaysAgo: 45, payments: [[12000, 45, 'esewa']], certificateIssued: true },
  // Finished but the certificate is not printed yet: gives the admin something to do.
  { student: 8, batchId: B.nailDone, status: 'completed', enrolledDaysAgo: 42, payments: [[6000, 42, 'cash'], [6000, 28, 'cash']], certificateIssued: false },
  { student: 9, batchId: B.nailNext, status: 'active', enrolledDaysAgo: 22, payments: [[12000, 22, 'fonepay']] },
  { student: 1, batchId: B.nailNext, status: 'active', enrolledDaysAgo: 11, payments: [[6000, 11, 'esewa']] },
  { student: 30, batchId: B.nailNext, status: 'pending', enrolledDaysAgo: 2, payments: [] },
  // Skin Care Specialist
  { student: 15, batchId: B.skinDone, status: 'completed', enrolledDaysAgo: 175, payments: [[28000, 175, 'cash']], certificateIssued: true },
  { student: 5, batchId: B.skinNext, status: 'active', enrolledDaysAgo: 16, payments: [[28000, 16, 'card']] },
  { student: 25, batchId: B.skinNext, status: 'pending', enrolledDaysAgo: 7, payments: [] },
];

const ATTENDANCE_WEIGHTS = { present: 84, late: 9, absent: 7 } as const;

/** One record per scheduled class day from batch start up to yesterday (or the drop date). */
const buildAttendance = (random: SeededRandom, batch: Batch, droppedAfterDays?: number): AttendanceRecord[] => {
  const yesterday = addDaysISO(todayISO(), -1);
  const lastClass = [batch.endDate, yesterday, droppedAfterDays !== undefined ? addDaysISO(batch.startDate, droppedAfterDays) : batch.endDate]
    .sort()[0] ?? yesterday;
  const records: AttendanceRecord[] = [];
  for (let date = batch.startDate; date <= lastClass; date = addDaysISO(date, 1)) {
    if (batch.days.includes(weekdayOf(date))) records.push({ date, status: random.weighted(ATTENDANCE_WEIGHTS) });
  }
  return records;
};

/** 20 enrollments across all six courses, with full, partial and pending fees. */
export const buildEnrollments = (): Enrollment[] => {
  const random = createRandom(5_2024);
  const courses = buildCourses();
  let paymentNumber = 0;

  return ENROLLMENT_SEEDS.flatMap((seed, index): Enrollment[] => {
    const course = courses.find((item) => item.batches.some((b) => b.id === seed.batchId));
    const batch = course?.batches.find((b) => b.id === seed.batchId);
    if (!course || !batch) return [];

    const payments = seed.payments.map(([amount, daysAgo, method]) => {
      paymentNumber += 1;
      return { id: `pay_${String(paymentNumber).padStart(3, '0')}`, amount, paidOn: daysFromToday(-daysAgo), method };
    });

    return [
      {
        ...seedBase(`enr_${String(index + 1).padStart(3, '0')}`, seed.enrolledDaysAgo),
        studentId: customerId(seed.student - 1),
        courseId: course.id,
        batchId: batch.id,
        status: seed.status,
        feeTotal: course.fee,
        feePaid: payments.reduce((sum, payment) => sum + payment.amount, 0),
        payments,
        attendance: seed.status === 'pending' ? [] : buildAttendance(random, batch, seed.droppedAfterDays),
        certificateIssued: seed.certificateIssued ?? false,
      },
    ];
  });
};
