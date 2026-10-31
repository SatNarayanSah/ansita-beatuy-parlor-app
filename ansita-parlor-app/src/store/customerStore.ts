import { create } from 'zustand';

import type { Customer, CustomerTag, ID } from '@/types';

import { findEntity, matchesQuery, mergeEntities, replaceEntities, withoutEntity } from './entityHelpers';

interface CustomerData {
  customers: Customer[];
}

interface CustomerActions {
  setCustomers: (customers: readonly Customer[]) => void;
  mergeCustomers: (customers: readonly Customer[]) => void;
  removeCustomer: (id: ID) => void;
  getCustomerById: (id: ID) => Customer | undefined;
  reset: () => void;
}

export type CustomerState = CustomerData & CustomerActions;

/** Cache of customers loaded from the server (all of them for admins, their own profile for customers). */
export const useCustomerStore = create<CustomerState>()((set, get) => ({
  customers: [],

  setCustomers: (list) => {
    const next = replaceEntities(get().customers, list);
    if (next) set({ customers: next });
  },
  mergeCustomers: (list) => {
    const next = mergeEntities(get().customers, list);
    if (next) set({ customers: next });
  },
  removeCustomer: (id) => {
    const next = withoutEntity(get().customers, id);
    if (next) set({ customers: next });
  },
  getCustomerById: (id) => findEntity(get().customers, id),
  reset: () => set({ customers: [] }),
}));

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
