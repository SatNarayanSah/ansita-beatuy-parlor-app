import { create } from 'zustand';

import type { Batch, Course, Enrollment, EnrollmentStatus, ID } from '@/types';

import { findEntity, matchesQuery, mergeEntities, replaceEntities, withoutEntity } from './entityHelpers';

interface CourseData {
  courses: Course[];
  enrollments: Enrollment[];
}

interface CourseActions {
  setCourses: (courses: readonly Course[]) => void;
  mergeCourses: (courses: readonly Course[]) => void;
  removeCourse: (id: ID) => void;
  getCourseById: (id: ID) => Course | undefined;

  setEnrollments: (enrollments: readonly Enrollment[]) => void;
  mergeEnrollments: (enrollments: readonly Enrollment[]) => void;
  getEnrollmentById: (id: ID) => Enrollment | undefined;

  reset: () => void;
}

export type CourseState = CourseData & CourseActions;

/** Cache of courses (with their batches) and enrollments loaded from the server. */
export const useCourseStore = create<CourseState>()((set, get) => ({
  courses: [],
  enrollments: [],

  setCourses: (list) => {
    const next = replaceEntities(get().courses, list);
    if (next) set({ courses: next });
  },
  mergeCourses: (list) => {
    const next = mergeEntities(get().courses, list);
    if (next) set({ courses: next });
  },
  /** Removing a course also drops its enrollments, as the server does. */
  removeCourse: (id) => {
    const courses = withoutEntity(get().courses, id);
    if (courses) set({ courses, enrollments: get().enrollments.filter((enrollment) => enrollment.courseId !== id) });
  },
  getCourseById: (id) => findEntity(get().courses, id),

  setEnrollments: (list) => {
    const next = replaceEntities(get().enrollments, list);
    if (next) set({ enrollments: next });
  },
  mergeEnrollments: (list) => {
    const next = mergeEntities(get().enrollments, list);
    if (next) set({ enrollments: next });
  },
  getEnrollmentById: (id) => findEntity(get().enrollments, id),

  reset: () => set({ courses: [], enrollments: [] }),
}));

// ---------- Selectors ----------

/** Enrollments that hold a seat in a batch. */
const SEAT_HOLDING_STATUSES: readonly EnrollmentStatus[] = ['pending', 'active', 'completed'];

export const selectFilteredCourses = (courses: readonly Course[], query: string, activeOnly = false): Course[] =>
  courses
    .filter((course) => (activeOnly ? course.isActive : true))
    .filter((course) => matchesQuery(query, course.title, course.description))
    .sort((a, b) => a.title.localeCompare(b.title));

export const selectBatch = (course: Course, batchId: ID): Batch | undefined =>
  course.batches.find((batch) => batch.id === batchId);
export const selectSeatsTaken = (enrollments: readonly Enrollment[], batchId: ID): number =>
  enrollments.filter(
    (enrollment) => enrollment.batchId === batchId && SEAT_HOLDING_STATUSES.includes(enrollment.status),
  ).length;

export const selectSeatsLeft = (enrollments: readonly Enrollment[], batch: Batch): number =>
  Math.max(0, batch.seats - selectSeatsTaken(enrollments, batch.id));

export const selectFeeDue = (enrollment: Enrollment): number =>
  Math.max(0, enrollment.feeTotal - enrollment.feePaid);
/** Present + late count as attended. Returns 0-100. */
export const selectAttendancePercent = (enrollment: Enrollment): number => {
  const total = enrollment.attendance.length;
  if (total === 0) return 0;
  const attended = enrollment.attendance.filter((record) => record.status !== 'absent').length;
  return Math.round((attended / total) * 100);
};
