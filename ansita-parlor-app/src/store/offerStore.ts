import { create } from 'zustand';

import type { ID, ISODate, Offer } from '@/types';

import { findEntity, mergeEntities, replaceEntities, withoutEntity } from './entityHelpers';

interface OfferData {
  offers: Offer[];
}

interface OfferActions {
  setOffers: (offers: readonly Offer[]) => void;
  mergeOffers: (offers: readonly Offer[]) => void;
  removeOffer: (id: ID) => void;
  getOfferById: (id: ID) => Offer | undefined;
  reset: () => void;
}

export type OfferState = OfferData & OfferActions;

/** Cache of offers loaded from the server. */
export const useOfferStore = create<OfferState>()((set, get) => ({
  offers: [],

  setOffers: (list) => {
    const next = replaceEntities(get().offers, list);
    if (next) set({ offers: next });
  },
  mergeOffers: (list) => {
    const next = mergeEntities(get().offers, list);
    if (next) set({ offers: next });
  },
  removeOffer: (id) => {
    const next = withoutEntity(get().offers, id);
    if (next) set({ offers: next });
  },
  getOfferById: (id) => findEntity(get().offers, id),
  reset: () => set({ offers: [] }),
}));

// ---------- Selectors ----------

export type OfferAvailability = 'live' | 'scheduled' | 'expired' | 'draft';

export const selectOfferAvailability = (offer: Offer, today: ISODate): OfferAvailability => {
  if (!offer.isActive) return 'draft';
  if (today < offer.validFrom) return 'scheduled';
  if (today > offer.validTo) return 'expired';
  return 'live';
};

/** Offers customers can use today, ending soonest first. */
export const selectLiveOffers = (offers: readonly Offer[], today: ISODate): Offer[] =>
  offers
    .filter((offer) => selectOfferAvailability(offer, today) === 'live')
    .sort((a, b) => a.validTo.localeCompare(b.validTo));
