import { useReviewStore } from '@/store/reviewStore';
import { useStaffStore } from '@/store/staffStore';
import type { ID, Review, ReviewRating, Staff } from '@/types';

import { api } from './client';
import { refreshNotificationsSoon } from './sync';

export interface ReviewInput {
  appointmentId: ID;
  rating: ReviewRating;
  comment: string;
}

export interface ReviewFilter {
  staffId?: ID | null;
  customerId?: ID | null;
}

/** The server recalculates the stylist's average rating; fetch the updated value. */
const refreshStaff = async (staffId: ID): Promise<void> => {
  const member = await api<Staff>('GET', `/staff/${staffId}`).catch(() => null);
  if (member) useStaffStore.getState().mergeStaff([member]);
};

export const reviewService = {
  listReviews: async (filter: ReviewFilter = {}): Promise<Review[]> => {
    const list = await api<Review[]>('GET', '/reviews', { query: { ...filter } });
    const store = useReviewStore.getState();
    if (!filter.staffId && !filter.customerId) store.setReviews(list);
    else store.mergeReviews(list);
    return list;
  },

  getReviewForAppointment: async (appointmentId: ID): Promise<Review | null> => {
    const review = await api<Review | null>('GET', `/reviews/by-appointment/${appointmentId}`);
    if (review) useReviewStore.getState().mergeReviews([review]);
    return review;
  },

  /** A customer can review each of their completed appointments once. */
  createReview: async (input: ReviewInput): Promise<Review> => {
    const review = await api<Review>('POST', '/reviews', { body: input });
    useReviewStore.getState().mergeReviews([review]);
    await refreshStaff(review.staffId);
    refreshNotificationsSoon();
    return review;
  },

  replyToReview: async (id: ID, reply: string): Promise<Review> => {
    const review = await api<Review>('POST', `/reviews/${id}/reply`, { body: { reply } });
    useReviewStore.getState().mergeReviews([review]);
    return review;
  },

  deleteReview: async (id: ID): Promise<void> => {
    const staffId = useReviewStore.getState().getReviewById(id)?.staffId;
    await api<null>('DELETE', `/reviews/${id}`);
    useReviewStore.getState().removeReview(id);
    if (staffId) await refreshStaff(staffId);
  },
};
