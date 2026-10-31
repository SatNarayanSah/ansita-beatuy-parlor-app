import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildOffers } from '@/data/offers';
import type { ID, ISODate, Offer, UpdateInput } from '@/types';

import { findEntity, insertEntity, removeEntity, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface OfferData {
  offers: Offer[];
}

interface OfferActions {
  addOffer: (offer: Offer) => void;
  updateOffer: (id: ID, patch: UpdateInput<Offer>) => void;
  deleteOffer: (id: ID) => void;
  getOfferById: (id: ID) => Offer | undefined;
  reset: () => void;
}

export type OfferState = OfferData & OfferActions;

const createInitialData = (): OfferData => ({ offers: buildOffers() });

export const useOfferStore = create<OfferState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addOffer: (offer) => set((state) => ({ offers: insertEntity(state.offers, offer) })),
      updateOffer: (id, patch) => set((state) => ({ offers: updateEntity(state.offers, id, patch) })),
      deleteOffer: (id) => set((state) => ({ offers: removeEntity(state.offers, id) })),
      getOfferById: (id) => findEntity(get().offers, id),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.offers,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ offers }): OfferData => ({ offers }),
    },
  ),
);

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
