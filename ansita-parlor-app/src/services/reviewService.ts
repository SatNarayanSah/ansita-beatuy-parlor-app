import { useAppointmentStore } from '@/store/appointmentStore';
import { newEntityMeta } from '@/store/entityHelpers';
import {
  selectAverageRating,
  selectReviewForAppointment,
  selectReviewsByCustomer,
  selectReviewsByStaff,
  useReviewStore,
} from '@/store/reviewStore';
import { useStaffStore } from '@/store/staffStore';
import type { ID, Review, ReviewRating } from '@/types';

import { ApiError, ensureFound, simulateRequest } from './client';
import { notifyAdmins, notifyCustomer } from './notify';
import { requireAdmin, requireCustomerAccess, requireUser } from './session';

export interface ReviewInput {
  appointmentId: ID;
  rating: ReviewRating;
  comment: string;
}

export interface ReviewFilter {
  staffId?: ID | null;
  customerId?: ID | null;
}

/** Keeps Staff.rating equal to the average of their reviews. */
const syncStaffRating = (staffId: ID): void => {
  const reviews = selectReviewsByStaff(useReviewStore.getState().reviews, staffId);
  useStaffStore.getState().updateStaff(staffId, { rating: selectAverageRating(reviews) });
};

const getReviewOrThrow = (id: ID): Review => ensureFound(useReviewStore.getState().getReviewById(id), 'Review');

export const reviewService = {
  listReviews: ({ staffId = null, customerId = null }: ReviewFilter = {}): Promise<Review[]> =>
    simulateRequest(() => {
      requireUser();
      const { reviews } = useReviewStore.getState();
      if (staffId) return selectReviewsByStaff(reviews, staffId);
      if (customerId) return selectReviewsByCustomer(reviews, customerId);
      return [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),

  getReviewForAppointment: (appointmentId: ID): Promise<Review | null> =>
    simulateRequest(() => {
      requireUser();
      return selectReviewForAppointment(useReviewStore.getState().reviews, appointmentId) ?? null;
    }),

  /** A customer can review each of their completed appointments once. */
  createReview: ({ appointmentId, rating, comment }: ReviewInput): Promise<Review> =>
    simulateRequest(() => {
      const appointment = ensureFound(
        useAppointmentStore.getState().getAppointmentById(appointmentId),
        'Appointment',
      );
      const user = requireCustomerAccess(appointment.customerId);
      if (user.role !== 'customer') throw new ApiError('FORBIDDEN', 'Only customers can write reviews.');
      if (appointment.status !== 'completed') {
        throw new ApiError('VALIDATION', 'You can review an appointment once it is completed.');
      }
      if (selectReviewForAppointment(useReviewStore.getState().reviews, appointmentId)) {
        throw new ApiError('CONFLICT', 'You have already reviewed this appointment.');
      }
      const review: Review = {
        ...newEntityMeta('rev'),
        customerId: appointment.customerId,
        appointmentId,
        staffId: appointment.staffId,
        serviceIds: [...appointment.serviceIds],
        rating,
        comment: comment.trim(),
        reply: null,
      };
      useReviewStore.getState().addReview(review);
      syncStaffRating(review.staffId);
      notifyAdmins({
        type: 'system',
        title: `New ${rating}★ review`,
        message: `${user.name}: “${review.comment || 'No comment'}”`,
        link: { kind: 'appointment', id: appointmentId },
      });
      return review;
    }),

  replyToReview: (id: ID, reply: string): Promise<Review> =>
    simulateRequest(() => {
      requireAdmin();
      const review = getReviewOrThrow(id);
      const trimmed = reply.trim();
      useReviewStore.getState().updateReview(id, { reply: trimmed.length > 0 ? trimmed : null });
      if (trimmed.length > 0) {
        notifyCustomer(review.customerId, {
          type: 'system',
          title: 'Ansita replied to your review',
          message: trimmed,
          link: { kind: 'appointment', id: review.appointmentId },
        });
      }
      return getReviewOrThrow(id);
    }),

  deleteReview: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      const review = getReviewOrThrow(id);
      useReviewStore.getState().deleteReview(id);
      syncStaffRating(review.staffId);
    }),
};
