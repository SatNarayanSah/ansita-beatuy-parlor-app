import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildCustomers } from '@/data/customers';
import type { Customer, CustomerTag, ID, UpdateInput } from '@/types';

import { findEntity, insertEntity, matchesQuery, removeEntity, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface CustomerData {
  customers: Customer[];
}

interface CustomerActions {
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: ID, patch: UpdateInput<Customer>) => void;
  deleteCustomer: (id: ID) => void;
  getCustomerById: (id: ID) => Customer | undefined;
  adjustLoyaltyPoints: (id: ID, delta: number) => void;
  reset: () => void;
}

export type CustomerState = CustomerData & CustomerActions;

const createInitialData = (): CustomerData => ({ customers: buildCustomers() });

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addCustomer: (customer) => set((state) => ({ customers: insertEntity(state.customers, customer) })),

      updateCustomer: (id, patch) =>
        set((state) => ({ customers: updateEntity(state.customers, id, patch) })),

      deleteCustomer: (id) => set((state) => ({ customers: removeEntity(state.customers, id) })),

      getCustomerById: (id) => findEntity(get().customers, id),

      adjustLoyaltyPoints: (id, delta) => {
        const customer = findEntity(get().customers, id);
        if (!customer) return;
        const loyaltyPoints = Math.max(0, customer.loyaltyPoints + delta);
        set((state) => ({ customers: updateEntity(state.customers, id, { loyaltyPoints }) }));
      },

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.customers,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ customers }): CustomerData => ({ customers }),
    },
  ),
);

// ---------- Selectors (pure; memoise in components with useMemo) ----------

export interface CustomerFilter {
  query?: string;
  tag?: CustomerTag | null;
}

export const selectFilteredCustomers = (
  customers: readonly Customer[],
  { query = '', tag = null }: CustomerFilter,
): Customer[] =>
  customers
    .filter((customer) => (tag ? customer.tags.includes(tag) : true))
    .filter((customer) => matchesQuery(query, customer.name, customer.phone, customer.email))
    .sort((a, b) => a.name.localeCompare(b.name));

export const selectCustomersByIds = (customers: readonly Customer[], ids: readonly ID[]): Customer[] =>
  customers.filter((customer) => ids.includes(customer.id));

export const selectNewCustomersSince = (customers: readonly Customer[], sinceISO: string): Customer[] =>
  customers.filter((customer) => customer.joinedAt >= sinceISO);

export const selectTopLoyaltyCustomers = (customers: readonly Customer[], limit = 5): Customer[] =>
  [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, limit);
