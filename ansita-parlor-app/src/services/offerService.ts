import { newEntityMeta } from '@/store/entityHelpers';
import { selectLiveOffers, useOfferStore } from '@/store/offerStore';
import type { ID, Offer } from '@/types';
import { todayISO } from '@/utils/date';

import { ApiError, ensureFound, simulateRequest } from './client';
import { requireAdmin, requireUser } from './session';

export type OfferInput = Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>;

const validateOffer = (input: Partial<OfferInput>, current?: Offer): void => {
  const merged = { ...current, ...input };
  if (merged.discountValue !== undefined && merged.discountValue <= 0) {
    throw new ApiError('VALIDATION', 'Discount must be more than zero.');
  }
  if (merged.discountType === 'percent' && (merged.discountValue ?? 0) > 100) {
    throw new ApiError('VALIDATION', 'A percentage discount cannot exceed 100%.');
  }
  if (merged.validFrom && merged.validTo && merged.validTo < merged.validFrom) {
    throw new ApiError('VALIDATION', 'The end date must be on or after the start date.');
  }
  const code = input.code?.trim().toUpperCase();
  if (code) {
    const taken = useOfferStore
      .getState()
      .offers.some((offer) => offer.id !== current?.id && offer.code?.toUpperCase() === code);
    if (taken) throw new ApiError('CONFLICT', 'Another offer already uses this code.');
  }
};

/** Promotions. Customers see only live offers; admins see drafts and expired ones too. */
export const offerService = {
  listOffers: (): Promise<Offer[]> =>
    simulateRequest(() => {
      const user = requireUser();
      const { offers } = useOfferStore.getState();
      if (user.role === 'customer') return selectLiveOffers(offers, todayISO());
      return [...offers].sort((a, b) => b.validFrom.localeCompare(a.validFrom));
    }),

  getOffer: (id: ID): Promise<Offer> =>
    simulateRequest(() => ensureFound(useOfferStore.getState().getOfferById(id), 'Offer')),

  createOffer: (input: OfferInput): Promise<Offer> =>
    simulateRequest(() => {
      requireAdmin();
      validateOffer(input);
      const offer: Offer = {
        ...newEntityMeta('ofr'),
        ...input,
        title: input.title.trim(),
        code: input.code?.trim().toUpperCase() || null,
      };
      useOfferStore.getState().addOffer(offer);
      return offer;
    }),

  updateOffer: (id: ID, input: Partial<OfferInput>): Promise<Offer> =>
    simulateRequest(() => {
      requireAdmin();
      const current = ensureFound(useOfferStore.getState().getOfferById(id), 'Offer');
      validateOffer(input, current);
      const patch = input.code !== undefined ? { ...input, code: input.code?.trim().toUpperCase() || null } : input;
      useOfferStore.getState().updateOffer(id, patch);
      return ensureFound(useOfferStore.getState().getOfferById(id), 'Offer');
    }),

  setOfferActive: (id: ID, isActive: boolean): Promise<Offer> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useOfferStore.getState().getOfferById(id), 'Offer');
      useOfferStore.getState().updateOffer(id, { isActive });
      return ensureFound(useOfferStore.getState().getOfferById(id), 'Offer');
    }),

  deleteOffer: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useOfferStore.getState().getOfferById(id), 'Offer');
      useOfferStore.getState().deleteOffer(id);
    }),
};
