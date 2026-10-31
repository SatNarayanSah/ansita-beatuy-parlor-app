import { useCourseStore } from '@/store/courseStore';
import type { Batch, Course, ID, SyllabusModule } from '@/types';

import { api } from './client';

/** Syllabus modules may omit an id when created; the server assigns one. */
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

const cacheCourse = (course: Course): Course => {
  useCourseStore.getState().mergeCourses([course]);
  return course;
};

export const courseService = {
  /** Customers only ever see active courses (enforced by the server). */
  listCourses: async ({ query = '', activeOnly = false }: CourseFilter = {}): Promise<Course[]> => {
    const list = await api<Course[]>('GET', '/courses', { query: { query, activeOnly: activeOnly || undefined } });
    useCourseStore.getState().mergeCourses(list);
    return list;
  },

  getCourse: async (id: ID): Promise<Course> => cacheCourse(await api<Course>('GET', `/courses/${id}`)),

  getBatchAvailability: (courseId: ID): Promise<BatchAvailability[]> =>
    api<BatchAvailability[]>('GET', `/courses/${courseId}/batches/availability`),

  createCourse: async (input: CourseInput): Promise<Course> =>
    cacheCourse(await api<Course>('POST', '/courses', { body: input })),

  updateCourse: async (id: ID, input: Partial<CourseInput>): Promise<Course> =>
    cacheCourse(await api<Course>('PATCH', `/courses/${id}`, { body: input })),

  setCourseActive: async (id: ID, isActive: boolean): Promise<Course> =>
    cacheCourse(await api<Course>('POST', `/courses/${id}/active`, { body: { isActive } })),

  /** Refused while students are active; past enrollments are removed with the course. */
  deleteCourse: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/courses/${id}`);
    useCourseStore.getState().removeCourse(id);
  },

  addBatch: async (courseId: ID, input: BatchInput): Promise<Course> =>
    cacheCourse(await api<Course>('POST', `/courses/${courseId}/batches`, { body: input })),

  updateBatch: async (courseId: ID, batchId: ID, input: Partial<BatchInput>): Promise<Course> =>
    cacheCourse(await api<Course>('PATCH', `/courses/${courseId}/batches/${batchId}`, { body: input })),

  deleteBatch: async (courseId: ID, batchId: ID): Promise<Course> =>
    cacheCourse(await api<Course>('DELETE', `/courses/${courseId}/batches/${batchId}`)),
};
