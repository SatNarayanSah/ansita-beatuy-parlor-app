import { create } from 'zustand';

import type { ID, PaymentRequest } from '@/types';

import { mergeEntities } from './entityHelpers';

interface PaymentRequestData {
  /** Requests seen so far (any status). Screens watch this store to refetch after a change. */
  requests: PaymentRequest[];
  /** Admin: requests waiting for verification across all bills. */
  pendingCount: number;
}

interface PaymentRequestActions {
  mergeRequests: (requests: readonly PaymentRequest[]) => void;
  setPendingCount: (count: number) => void;
  reset: () => void;
}

export type PaymentRequestState = PaymentRequestData & PaymentRequestActions;

/** Cache of customers' "I've paid" requests. */
export const usePaymentRequestStore = create<PaymentRequestState>()((set, get) => ({
  requests: [],
  pendingCount: 0,
  mergeRequests: (list) => {
    const next = mergeEntities(get().requests, list);
    if (next) set({ requests: next });
  },
  setPendingCount: (count) => {
    if (get().pendingCount !== count) set({ pendingCount: count });
  },
  reset: () => set({ requests: [], pendingCount: 0 }),
}));

// ---------- Selectors ----------

/** Total of the pending requests on one bill: the customer can't claim more than due minus this. */
export const selectPendingTotal = (requests: readonly PaymentRequest[], targetId: ID): number =>
  requests.filter((request) => request.targetId === targetId && request.status === 'pending').reduce((sum, request) => sum + request.amount, 0);
