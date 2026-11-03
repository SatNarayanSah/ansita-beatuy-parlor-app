import { useOfferStore } from '@/store/offerStore';
import type { ID, ISODate, Offer, OfferQuote } from '@/types';

import { api } from './client';

export type OfferInput = Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>;

const cacheOffer = (offer: Offer): Offer => {
  useOfferStore.getState().mergeOffers([offer]);
  return offer;
};

/** Promotions. Customers see only live offers; admins see drafts and expired ones too. */
export const offerService = {
  listOffers: async (): Promise<Offer[]> => {
    const list = await api<Offer[]>('GET', '/offers');
    useOfferStore.getState().setOffers(list);
    return list;
  },

  /**
   * Previews the discount for a booking before it is made: the entered code (422 with the
   * reason when it can't be used) or, without a code, the best automatic offer.
   */
  quoteOffer: (input: { code?: string; serviceIds: ID[]; date: ISODate }): Promise<OfferQuote> =>
    api<OfferQuote>('POST', '/offers/quote', { body: input }),

  getOffer: async (id: ID): Promise<Offer> => cacheOffer(await api<Offer>('GET', `/offers/${id}`)),

  createOffer: async (input: OfferInput): Promise<Offer> => cacheOffer(await api<Offer>('POST', '/offers', { body: input })),

  updateOffer: async (id: ID, input: Partial<OfferInput>): Promise<Offer> =>
    cacheOffer(await api<Offer>('PATCH', `/offers/${id}`, { body: input })),

  setOfferActive: async (id: ID, isActive: boolean): Promise<Offer> =>
    cacheOffer(await api<Offer>('POST', `/offers/${id}/active`, { body: { isActive } })),

  deleteOffer: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/offers/${id}`);
    useOfferStore.getState().removeOffer(id);
  },
};
