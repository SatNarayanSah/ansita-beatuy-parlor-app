import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildReviews } from '@/data/reviews';
import type { ID, Review, UpdateInput } from '@/types';
import { roundRating } from '@/utils/format';

import { findEntity, insertEntity, removeEntity, sortByCreatedDesc, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface ReviewData {
  reviews: Review[];
}

interface ReviewActions {
  addReview: (review: Review) => void;
  updateReview: (id: ID, patch: UpdateInput<Review>) => void;
  deleteReview: (id: ID) => void;
  getReviewById: (id: ID) => Review | undefined;
  reset: () => void;
}

export type ReviewState = ReviewData & ReviewActions;

const createInitialData = (): ReviewData => ({ reviews: buildReviews() });

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addReview: (review) => set((state) => ({ reviews: insertEntity(state.reviews, review) })),
      updateReview: (id, patch) => set((state) => ({ reviews: updateEntity(state.reviews, id, patch) })),
      deleteReview: (id) => set((state) => ({ reviews: removeEntity(state.reviews, id) })),
      getReviewById: (id) => findEntity(get().reviews, id),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.reviews,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ reviews }): ReviewData => ({ reviews }),
    },
  ),
);

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
