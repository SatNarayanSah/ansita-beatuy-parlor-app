import { create } from 'zustand';

import type { ID, Review } from '@/types';
import { roundRating } from '@/utils/format';

import { findEntity, mergeEntities, replaceEntities, sortByCreatedDesc, withoutEntity } from './entityHelpers';

interface ReviewData {
  reviews: Review[];
}

interface ReviewActions {
  setReviews: (reviews: readonly Review[]) => void;
  mergeReviews: (reviews: readonly Review[]) => void;
  removeReview: (id: ID) => void;
  getReviewById: (id: ID) => Review | undefined;
  reset: () => void;
}

export type ReviewState = ReviewData & ReviewActions;

/** Cache of reviews loaded from the server. */
export const useReviewStore = create<ReviewState>()((set, get) => ({
  reviews: [],

  setReviews: (list) => {
    const next = replaceEntities(get().reviews, list);
    if (next) set({ reviews: next });
  },
  mergeReviews: (list) => {
    const next = mergeEntities(get().reviews, list);
    if (next) set({ reviews: next });
  },
  removeReview: (id) => {
    const next = withoutEntity(get().reviews, id);
    if (next) set({ reviews: next });
  },
  getReviewById: (id) => findEntity(get().reviews, id),
  reset: () => set({ reviews: [] }),
}));

// ---------- Selectors ----------

export const selectReviewsByStaff = (reviews: readonly Review[], staffId: ID): Review[] =>
  sortByCreatedDesc(reviews.filter((review) => review.staffId === staffId));

export const selectReviewsByCustomer = (reviews: readonly Review[], customerId: ID): Review[] =>
  sortByCreatedDesc(reviews.filter((review) => review.customerId === customerId));

export const selectReviewForAppointment = (reviews: readonly Review[], appointmentId: ID): Review | undefined =>
  reviews.find((review) => review.appointmentId === appointmentId);

/** Average rating rounded to one decimal; 0 when there are no reviews. */
export const selectAverageRating = (reviews: readonly Review[]): number =>
  reviews.length === 0
    ? 0
    : roundRating(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length);
