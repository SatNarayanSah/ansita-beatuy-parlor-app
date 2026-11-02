import type { BaseEntity, ID, ISODate, ImageUri, TimeString, Weekday } from './common';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export type CourseType = 'certification' | 'diploma' | 'workshop';

export type BatchStatus = 'upcoming' | 'ongoing' | 'completed';

export interface SyllabusModule {
  id: ID;
  title: string;
  topics: string[];
  /** Duration in hours. */
  hours: number;
}

export interface Batch {
  id: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  days: Weekday[];
  startTime: TimeString;
  endTime: TimeString;
  seats: number;
  status: BatchStatus;
}

export interface Course extends BaseEntity {
  title: string;
  type: CourseType;
  description: string;
  /** Human-readable duration, e.g. "3 months" or "2 days". */
  duration: string;
  /** Fee in NPR. */
  fee: number;
  level: CourseLevel;
  syllabus: SyllabusModule[];
  /** Staff id of the lead instructor. */
  instructor: ID;
  batches: Batch[];
  /** Default seat capacity for new batches. */
  seats: number;
  image: ImageUri | null;
  certificate: boolean;
  isActive: boolean;
}
