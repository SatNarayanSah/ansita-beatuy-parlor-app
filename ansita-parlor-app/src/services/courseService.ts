import {
  selectBatch,
  selectFilteredCourses,
  selectSeatsLeft,
  selectSeatsTaken,
  useCourseStore,
} from '@/store/courseStore';
import { newEntityMeta } from '@/store/entityHelpers';
import { useStaffStore } from '@/store/staffStore';
import type { Batch, Course, ID, SyllabusModule } from '@/types';
import { generateId } from '@/utils/id';

import { ApiError, ensureFound, simulateRequest } from './client';
import { requireAdmin, requireUser } from './session';

/** Syllabus modules may omit an id when created; the service assigns one. */
export type SyllabusModuleInput = Omit<SyllabusModule, 'id'> & { id?: ID };

export type CourseInput = Pick<
  Course,
  | 'title'
  | 'type'
  | 'description'
  | 'duration'
  | 'fee'
  | 'level'
  | 'instructor'
  | 'seats'
  | 'image'
  | 'certificate'
  | 'isActive'
> & { syllabus: SyllabusModuleInput[] };

export type BatchInput = Omit<Batch, 'id'>;

export interface CourseFilter {
  query?: string;
  activeOnly?: boolean;
}

export interface BatchAvailability {
  batch: Batch;
  seatsTaken: number;
  seatsLeft: number;
  isFull: boolean;
  isOpen: boolean;
}

const toSyllabus = (modules: readonly SyllabusModuleInput[]): SyllabusModule[] =>
  modules.map((module) => ({ ...module, id: module.id ?? generateId('mod') }));

const assertInstructorExists = (staffId: ID): void => {
  ensureFound(useStaffStore.getState().getStaffById(staffId), 'Instructor');
};

const validateBatch = (batch: BatchInput): void => {
  if (batch.endDate < batch.startDate) {
    throw new ApiError('VALIDATION', 'Batch end date must be on or after the start date.');
  }
  if (batch.endTime <= batch.startTime) {
    throw new ApiError('VALIDATION', 'Class end time must be after the start time.');
  }
  if (batch.days.length === 0) throw new ApiError('VALIDATION', 'Select at least one class day.');
  if (batch.seats < 1) throw new ApiError('VALIDATION', 'A batch needs at least one seat.');
};

const getCourseOrThrow = (id: ID): Course => ensureFound(useCourseStore.getState().getCourseById(id), 'Course');

const hasLiveEnrollments = (predicate: (enrollmentBatchId: ID, enrollmentCourseId: ID) => boolean): boolean =>
  useCourseStore
    .getState()
    .enrollments.some(
      (enrollment) =>
        (enrollment.status === 'active' || enrollment.status === 'pending') &&
        predicate(enrollment.batchId, enrollment.courseId),
    );

export const courseService = {
  /** Customers only ever see active courses. */
  listCourses: ({ query = '', activeOnly = false }: CourseFilter = {}): Promise<Course[]> =>
    simulateRequest(() => {
      const user = requireUser();
      return selectFilteredCourses(useCourseStore.getState().courses, query, user.role === 'customer' || activeOnly);
    }),

  getCourse: (id: ID): Promise<Course> => simulateRequest(() => getCourseOrThrow(id)),

  getBatchAvailability: (courseId: ID): Promise<BatchAvailability[]> =>
    simulateRequest(() => {
      const course = getCourseOrThrow(courseId);
      const { enrollments } = useCourseStore.getState();
      return course.batches.map((batch) => {
        const seatsLeft = selectSeatsLeft(enrollments, batch);
        return {
          batch,
          seatsTaken: selectSeatsTaken(enrollments, batch.id),
          seatsLeft,
          isFull: seatsLeft === 0,
          isOpen: batch.status !== 'completed' && seatsLeft > 0,
        };
      });
    }),

  createCourse: (input: CourseInput): Promise<Course> =>
    simulateRequest(() => {
      requireAdmin();
      assertInstructorExists(input.instructor);
      const course: Course = {
        ...newEntityMeta('crs'),
        ...input,
        title: input.title.trim(),
        syllabus: toSyllabus(input.syllabus),
        batches: [],
      };
      useCourseStore.getState().addCourse(course);
      return course;
    }),

  updateCourse: (id: ID, input: Partial<CourseInput>): Promise<Course> =>
    simulateRequest(() => {
      requireAdmin();
      getCourseOrThrow(id);
      if (input.instructor !== undefined) assertInstructorExists(input.instructor);
      const { syllabus, ...rest } = input;
      useCourseStore
        .getState()
        .updateCourse(id, syllabus !== undefined ? { ...rest, syllabus: toSyllabus(syllabus) } : rest);
      return getCourseOrThrow(id);
    }),

  setCourseActive: (id: ID, isActive: boolean): Promise<Course> =>
    simulateRequest(() => {
      requireAdmin();
      getCourseOrThrow(id);
      useCourseStore.getState().updateCourse(id, { isActive });
      return getCourseOrThrow(id);
    }),

  deleteCourse: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      getCourseOrThrow(id);
      if (hasLiveEnrollments((_batchId, courseId) => courseId === id)) {
        throw new ApiError('CONFLICT', 'This course has active students. Deactivate it instead.');
      }
      const { enrollments, deleteEnrollment, deleteCourse } = useCourseStore.getState();
      enrollments.filter((enrollment) => enrollment.courseId === id).forEach((enrollment) => deleteEnrollment(enrollment.id));
      deleteCourse(id);
    }),

  addBatch: (courseId: ID, input: BatchInput): Promise<Course> =>
    simulateRequest(() => {
      requireAdmin();
      getCourseOrThrow(courseId);
      validateBatch(input);
      useCourseStore.getState().addBatch(courseId, { ...input, id: generateId('bat') });
      return getCourseOrThrow(courseId);
    }),

  updateBatch: (courseId: ID, batchId: ID, input: Partial<BatchInput>): Promise<Course> =>
    simulateRequest(() => {
      requireAdmin();
      const course = getCourseOrThrow(courseId);
      const batch = ensureFound(selectBatch(course, batchId), 'Batch');
      const merged: BatchInput = { ...batch, ...input };
      validateBatch(merged);
      const taken = selectSeatsTaken(useCourseStore.getState().enrollments, batchId);
      if (merged.seats < taken) {
        throw new ApiError('VALIDATION', `${taken} students are already enrolled. Seats cannot be fewer than that.`);
      }
      useCourseStore.getState().updateBatch(courseId, batchId, input);
      return getCourseOrThrow(courseId);
    }),

  deleteBatch: (courseId: ID, batchId: ID): Promise<Course> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(selectBatch(getCourseOrThrow(courseId), batchId), 'Batch');
      const hasEnrollments = useCourseStore.getState().enrollments.some((enrollment) => enrollment.batchId === batchId);
      if (hasEnrollments) {
        throw new ApiError('CONFLICT', 'Students are enrolled in this batch. It cannot be deleted.');
      }
      useCourseStore.getState().deleteBatch(courseId, batchId);
      return getCourseOrThrow(courseId);
    }),
};
