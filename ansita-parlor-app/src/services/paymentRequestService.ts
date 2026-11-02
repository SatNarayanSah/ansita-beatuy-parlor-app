import { useAppointmentStore } from '@/store/appointmentStore';
import { useCourseStore } from '@/store/courseStore';
import { usePaymentRequestStore } from '@/store/paymentRequestStore';
import type { Appointment, Enrollment, ID, PaymentRequest, PaymentRequestFilter, PaymentRequestInput } from '@/types';

import { api, isLocalImageUri, uploadImage } from './client';
import { refreshNotificationsSoon } from './sync';

/** Re-reads the bill a request belongs to, so screens showing it pick up the new balance. */
const refreshTarget = async (request: PaymentRequest): Promise<void> => {
  if (request.targetType === 'appointment') {
    const appointment = await api<Appointment>('GET', `/appointments/${request.targetId}`);
    useAppointmentStore.getState().mergeAppointments([appointment]);
  } else {
    const enrollment = await api<Enrollment>('GET', `/enrollments/${request.targetId}`);
    useCourseStore.getState().mergeEnrollments([enrollment]);
  }
};

/** Caches the changed request, refreshes its bill (best effort) and the notifications. */
const afterChange = async (request: PaymentRequest, { refreshBill = false } = {}): Promise<PaymentRequest> => {
  usePaymentRequestStore.getState().mergeRequests([request]);
  if (refreshBill) await refreshTarget(request).catch(() => undefined);
  refreshNotificationsSoon();
  return request;
};

/** Customers' "I've paid" requests and the parlour's verification of them. */
export const paymentRequestService = {
  /** Customers only ever receive their own (enforced by the server). Pending ones come first. */
  listRequests: async (filter: PaymentRequestFilter = {}): Promise<PaymentRequest[]> => {
    const list = await api<PaymentRequest[]>('GET', '/payment-requests', { query: { ...filter } });
    usePaymentRequestStore.getState().mergeRequests(list);
    return list;
  },

  getRequest: async (id: ID): Promise<PaymentRequest> => {
    const request = await api<PaymentRequest>('GET', `/payment-requests/${id}`);
    usePaymentRequestStore.getState().mergeRequests([request]);
    return request;
  },

  /** Admin: how many requests are waiting across all bills. */
  getPendingCount: async (): Promise<number> => {
    const { count } = await api<{ count: number }>('GET', '/payment-requests/pending-count');
    usePaymentRequestStore.getState().setPendingCount(count);
    return count;
  },

  /** Customer: a screenshot picked on this phone is uploaded first. Admins are notified. */
  createRequest: async (input: PaymentRequestInput): Promise<PaymentRequest> => {
    const proof = isLocalImageUri(input.proof) ? await uploadImage(input.proof) : (input.proof ?? null);
    return afterChange(await api<PaymentRequest>('POST', '/payment-requests', { body: { ...input, proof } }));
  },

  /** Customer: withdraw a pending request sent by mistake. */
  cancelRequest: async (id: ID): Promise<PaymentRequest> => afterChange(await api<PaymentRequest>('POST', `/payment-requests/${id}/cancel`)),

  /** Admin: records the payment on the bill, dated the day the customer paid. `amount` if less arrived. */
  approveRequest: async (id: ID, input: { amount?: number; note?: string } = {}): Promise<PaymentRequest> => {
    const request = await api<PaymentRequest>('POST', `/payment-requests/${id}/approve`, { body: input });
    const result = await afterChange(request, { refreshBill: true });
    await paymentRequestService.getPendingCount().catch(() => undefined);
    return result;
  },

  /** Admin: the customer is told the reason (3-300 characters). */
  rejectRequest: async (id: ID, reason: string): Promise<PaymentRequest> => {
    const result = await afterChange(await api<PaymentRequest>('POST', `/payment-requests/${id}/reject`, { body: { reason } }));
    await paymentRequestService.getPendingCount().catch(() => undefined);
    return result;
  },
};
