import { useServiceStore, type ServiceFilter } from '@/store/serviceStore';
import type { ID, Service, ServiceCategory } from '@/types';

import { api } from './client';

export type ServiceInput = Pick<
  Service,
  'name' | 'categoryId' | 'duration' | 'price' | 'description' | 'image' | 'isActive'
>;

export type CategoryInput = Pick<ServiceCategory, 'name' | 'icon' | 'color'>;

const cacheService = (service: Service): Service => {
  useServiceStore.getState().mergeServices([service]);
  return service;
};

const cacheCategory = (category: ServiceCategory): ServiceCategory => {
  useServiceStore.getState().mergeCategories([category]);
  return category;
};

/** Parlor services ("catalog") and their categories. Named to avoid "serviceService". */
export const catalogService = {
  listCategories: async (): Promise<ServiceCategory[]> => {
    const list = await api<ServiceCategory[]>('GET', '/categories');
    useServiceStore.getState().setCategories(list);
    return list;
  },

  /** Customers only ever see active services (enforced by the server). */
  listServices: async (filter: ServiceFilter = {}): Promise<Service[]> => {
    const list = await api<Service[]>('GET', '/services', { query: { ...filter } });
    useServiceStore.getState().mergeServices(list);
    return list;
  },

  getService: async (id: ID): Promise<Service> => cacheService(await api<Service>('GET', `/services/${id}`)),

  createService: async (input: ServiceInput): Promise<Service> =>
    cacheService(await api<Service>('POST', '/services', { body: input })),

  updateService: async (id: ID, input: Partial<ServiceInput>): Promise<Service> =>
    cacheService(await api<Service>('PATCH', `/services/${id}`, { body: input })),

  setServiceActive: async (id: ID, isActive: boolean): Promise<Service> =>
    cacheService(await api<Service>('POST', `/services/${id}/active`, { body: { isActive } })),

  /** Upcoming bookings block deletion (the server answers with a CONFLICT). */
  deleteService: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/services/${id}`);
    useServiceStore.getState().removeService(id);
  },

  createCategory: async (input: CategoryInput): Promise<ServiceCategory> =>
    cacheCategory(await api<ServiceCategory>('POST', '/categories', { body: input })),

  updateCategory: async (id: ID, input: Partial<CategoryInput>): Promise<ServiceCategory> =>
    cacheCategory(await api<ServiceCategory>('PATCH', `/categories/${id}`, { body: input })),

  deleteCategory: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/categories/${id}`);
    useServiceStore.getState().removeCategory(id);
  },
};
