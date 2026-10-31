import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildCourses } from '@/data/courses';
import { buildEnrollments } from '@/data/enrollments';
import type { Batch, Course, Enrollment, EnrollmentStatus, ID, UpdateInput } from '@/types';
import { nowISO } from '@/utils/date';

import { findEntity, insertEntity, matchesQuery, removeEntity, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface CourseData {
  courses: Course[];
  enrollments: Enrollment[];
}

interface CourseActions {
  addCourse: (course: Course) => void;
  updateCourse: (id: ID, patch: UpdateInput<Course>) => void;
  deleteCourse: (id: ID) => void;
  getCourseById: (id: ID) => Course | undefined;

  addBatch: (courseId: ID, batch: Batch) => void;
  updateBatch: (courseId: ID, batchId: ID, patch: Partial<Omit<Batch, 'id'>>) => void;
  deleteBatch: (courseId: ID, batchId: ID) => void;

  addEnrollment: (enrollment: Enrollment) => void;
  updateEnrollment: (id: ID, patch: UpdateInput<Enrollment>) => void;
  deleteEnrollment: (id: ID) => void;
  getEnrollmentById: (id: ID) => Enrollment | undefined;

  reset: () => void;
}

export type CourseState = CourseData & CourseActions;

const createInitialData = (): CourseData => ({
  courses: buildCourses(),
  enrollments: buildEnrollments(),
});

const mapBatches = (courses: readonly Course[], courseId: ID, mapper: (batches: Batch[]) => Batch[]): Course[] =>
  courses.map((course) =>
    course.id === courseId ? { ...course, batches: mapper(course.batches), updatedAt: nowISO() } : course,
  );

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addCourse: (course) => set((state) => ({ courses: insertEntity(state.courses, course) })),
      updateCourse: (id, patch) => set((state) => ({ courses: updateEntity(state.courses, id, patch) })),
      deleteCourse: (id) => set((state) => ({ courses: removeEntity(state.courses, id) })),
      getCourseById: (id) => findEntity(get().courses, id),

      addBatch: (courseId, batch) =>
        set((state) => ({ courses: mapBatches(state.courses, courseId, (batches) => [...batches, batch]) })),
      updateBatch: (courseId, batchId, patch) =>
        set((state) => ({
          courses: mapBatches(state.courses, courseId, (batches) =>
            batches.map((batch) => (batch.id === batchId ? { ...batch, ...patch } : batch)),
          ),
        })),
      deleteBatch: (courseId, batchId) =>
        set((state) => ({
          courses: mapBatches(state.courses, courseId, (batches) =>
            batches.filter((batch) => batch.id !== batchId),
          ),
        })),

      addEnrollment: (enrollment) =>
        set((state) => ({ enrollments: insertEntity(state.enrollments, enrollment) })),
      updateEnrollment: (id, patch) =>
        set((state) => ({ enrollments: updateEntity(state.enrollments, id, patch) })),
      deleteEnrollment: (id) => set((state) => ({ enrollments: removeEntity(state.enrollments, id) })),
      getEnrollmentById: (id) => findEntity(get().enrollments, id),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.courses,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ courses, enrollments }): CourseData => ({ courses, enrollments }),
    },
  ),
);

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

export const selectEnrollmentsByCourse = (enrollments: readonly Enrollment[], courseId: ID): Enrollment[] =>
  enrollments.filter((enrollment) => enrollment.courseId === courseId);

export const selectEnrollmentsByBatch = (enrollments: readonly Enrollment[], batchId: ID): Enrollment[] =>
  enrollments.filter((enrollment) => enrollment.batchId === batchId);

export const selectEnrollmentsByStudent = (enrollments: readonly Enrollment[], studentId: ID): Enrollment[] =>
  enrollments
    .filter((enrollment) => enrollment.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const selectSeatsTaken = (enrollments: readonly Enrollment[], batchId: ID): number =>
  enrollments.filter(
    (enrollment) => enrollment.batchId === batchId && SEAT_HOLDING_STATUSES.includes(enrollment.status),
  ).length;

export const selectSeatsLeft = (enrollments: readonly Enrollment[], batch: Batch): number =>
  Math.max(0, batch.seats - selectSeatsTaken(enrollments, batch.id));

export const selectFeeDue = (enrollment: Enrollment): number =>
  Math.max(0, enrollment.feeTotal - enrollment.feePaid);

export const selectTotalFeesDue = (enrollments: readonly Enrollment[]): number =>
  enrollments
    .filter((enrollment) => enrollment.status !== 'dropped')
    .reduce((sum, enrollment) => sum + selectFeeDue(enrollment), 0);

/** Present + late count as attended. Returns 0-100. */
export const selectAttendancePercent = (enrollment: Enrollment): number => {
  const total = enrollment.attendance.length;
  if (total === 0) return 0;
  const attended = enrollment.attendance.filter((record) => record.status !== 'absent').length;
  return Math.round((attended / total) * 100);
};
