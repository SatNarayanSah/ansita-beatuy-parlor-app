import { useAuthStore } from '@/store/authStore';
import { useCustomerStore, type CustomerFilter } from '@/store/customerStore';
import type { Customer, ID, ISODate, User } from '@/types';

import { api } from './client';

export type CustomerInput = Pick<
  Customer,
  'name' | 'phone' | 'email' | 'gender' | 'dob' | 'address' | 'notes' | 'avatar' | 'tags'
>;

export interface CustomerStats {
  totalVisits: number;
  totalSpent: number;
  lastVisit: ISODate | null;
  upcomingCount: number;
  cancelledCount: number;
  activeEnrollments: number;
}

const cacheCustomer = (customer: Customer): Customer => {
  useCustomerStore.getState().mergeCustomers([customer]);
  return customer;
};

export const customerService = {
  listCustomers: async (filter: CustomerFilter = {}): Promise<Customer[]> => {
    const list = await api<Customer[]>('GET', '/customers', { query: { ...filter } });
    const store = useCustomerStore.getState();
    if (!filter.query && !filter.tag) store.setCustomers(list);
    else store.mergeCustomers(list);
    return list;
  },

  getCustomer: async (id: ID): Promise<Customer> => cacheCustomer(await api<Customer>('GET', `/customers/${id}`)),

  createCustomer: async (input: CustomerInput): Promise<Customer> =>
    cacheCustomer(await api<Customer>('POST', '/customers', { body: input })),

  /** Admins can edit anyone; customers their own profile (tags/notes are admin-only on the server). */
  updateCustomer: async (id: ID, input: Partial<CustomerInput>): Promise<Customer> => {
    const customer = cacheCustomer(await api<Customer>('PATCH', `/customers/${id}`, { body: input }));
    // The server keeps the linked account in sync; mirror that for the signed-in customer.
    const { user } = useAuthStore.getState();
    if (user?.customerId === id) {
      const me = await api<User | null>('GET', '/auth/me').catch(() => null);
      if (me) useAuthStore.getState().setUser(me);
    }
    return customer;
  },

  /** Blocked while the customer has upcoming bookings or an ongoing course. */
  deleteCustomer: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/customers/${id}`);
    useCustomerStore.getState().removeCustomer(id);
  },

  getCustomerStats: (id: ID): Promise<CustomerStats> => api<CustomerStats>('GET', `/customers/${id}/stats`),
};
