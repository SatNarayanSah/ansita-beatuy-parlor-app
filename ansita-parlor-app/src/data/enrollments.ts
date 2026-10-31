import type { AttendanceRecord, AttendanceStatus, Enrollment } from '@/types';
import { daysFromToday } from '@/utils/date';

import { BATCH_IDS, COURSE_IDS } from './courses';
import { CUSTOMER_IDS } from './customers';
import { seedBase } from './helpers';

/** Builds attendance for classes held `daysAgo` days back, using a fixed status pattern. */
const attendance = (daysAgo: readonly number[], pattern: readonly AttendanceStatus[]): AttendanceRecord[] =>
  daysAgo.map((ago, index) => ({
    date: daysFromToday(-ago),
    status: pattern[index % pattern.length] ?? 'present',
  }));

const BEAUTICIAN_CLASS_DAYS = [58, 56, 54, 51, 49, 47, 44, 42, 40, 37, 35, 33, 30, 28, 26, 23, 21, 19, 16, 14, 12, 9, 7, 5, 2];
const BRIDAL_CLASS_DAYS = [14, 13, 7, 6];

export const buildEnrollments = (): Enrollment[] => [
  {
    ...seedBase('enr_001', 65),
    studentId: CUSTOMER_IDS.kiran,
    courseId: COURSE_IDS.beautician,
    batchId: BATCH_IDS.beauticianJul,
    status: 'active',
    feeTotal: 25000,
    feePaid: 15000,
    payments: [
      { id: 'pay_001', amount: 10000, paidOn: daysFromToday(-65), method: 'upi' },
      { id: 'pay_002', amount: 5000, paidOn: daysFromToday(-30), method: 'cash' },
    ],
    attendance: attendance(BEAUTICIAN_CLASS_DAYS, ['present', 'present', 'present', 'late', 'present', 'absent']),
    certificateIssued: false,
  },
  {
    ...seedBase('enr_002', 62),
    studentId: CUSTOMER_IDS.aasha,
    courseId: COURSE_IDS.beautician,
    batchId: BATCH_IDS.beauticianJul,
    status: 'active',
    feeTotal: 25000,
    feePaid: 25000,
    payments: [{ id: 'pay_003', amount: 25000, paidOn: daysFromToday(-62), method: 'card' }],
    attendance: attendance(BEAUTICIAN_CLASS_DAYS, ['present', 'present', 'present', 'present', 'late']),
    certificateIssued: false,
  },
  {
    ...seedBase('enr_003', 20),
    studentId: CUSTOMER_IDS.neha,
    courseId: COURSE_IDS.bridal,
    batchId: BATCH_IDS.bridalOct,
    status: 'active',
    feeTotal: 35000,
    feePaid: 20000,
    payments: [{ id: 'pay_004', amount: 20000, paidOn: daysFromToday(-20), method: 'upi' }],
    attendance: attendance(BRIDAL_CLASS_DAYS, ['present', 'present', 'absent', 'present']),
    certificateIssued: false,
  },
  {
    ...seedBase('enr_004', 30),
    studentId: CUSTOMER_IDS.sneha,
    courseId: COURSE_IDS.nailArt,
    batchId: BATCH_IDS.nailPast,
    status: 'completed',
    feeTotal: 3500,
    feePaid: 3500,
    payments: [{ id: 'pay_005', amount: 3500, paidOn: daysFromToday(-30), method: 'upi' }],
    attendance: attendance([20, 19], ['present']),
    certificateIssued: true,
  },
  {
    ...seedBase('enr_005', 6),
    studentId: CUSTOMER_IDS.priya,
    courseId: COURSE_IDS.nailArt,
    batchId: BATCH_IDS.nailNext,
    status: 'pending',
    feeTotal: 3500,
    feePaid: 0,
    payments: [],
    attendance: [],
    certificateIssued: false,
  },
  {
    ...seedBase('enr_006', 4),
    studentId: CUSTOMER_IDS.sneha,
    courseId: COURSE_IDS.hair,
    batchId: BATCH_IDS.hairNov,
    status: 'active',
    feeTotal: 18000,
    feePaid: 9000,
    payments: [{ id: 'pay_006', amount: 9000, paidOn: daysFromToday(-4), method: 'upi' }],
    attendance: [],
    certificateIssued: false,
  },
];
