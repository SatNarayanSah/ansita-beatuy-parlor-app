import type { BaseEntity, ID } from './common';

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface Review extends BaseEntity {
  customerId: ID;
  appointmentId: ID;
  staffId: ID;
  serviceIds: ID[];
  rating: ReviewRating;
  comment: string;
  /** Optional reply from the parlor. */
  reply: string | null;
  /** Reviewer's first name, added by the server so customers can see who wrote it. */
  customerName?: string;
}
