import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildCategories } from '@/data/categories';
import { buildServices } from '@/data/services';
import type { ID, Service, ServiceCategory, UpdateInput } from '@/types';

import { findEntity, insertEntity, matchesQuery, removeEntity, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface ServiceData {
  services: Service[];
  categories: ServiceCategory[];
}

interface ServiceActions {
  addService: (service: Service) => void;
  updateService: (id: ID, patch: UpdateInput<Service>) => void;
  deleteService: (id: ID) => void;
  getServiceById: (id: ID) => Service | undefined;

  addCategory: (category: ServiceCategory) => void;
  updateCategory: (id: ID, patch: UpdateInput<ServiceCategory>) => void;
  deleteCategory: (id: ID) => void;
  getCategoryById: (id: ID) => ServiceCategory | undefined;

  reset: () => void;
}

export type ServiceState = ServiceData & ServiceActions;

const createInitialData = (): ServiceData => ({
  services: buildServices(),
  categories: buildCategories(),
});

export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addService: (service) => set((state) => ({ services: insertEntity(state.services, service) })),
      updateService: (id, patch) => set((state) => ({ services: updateEntity(state.services, id, patch) })),
      deleteService: (id) => set((state) => ({ services: removeEntity(state.services, id) })),
      getServiceById: (id) => findEntity(get().services, id),

      addCategory: (category) =>
        set((state) => ({ categories: insertEntity(state.categories, category) })),
      updateCategory: (id, patch) =>
        set((state) => ({ categories: updateEntity(state.categories, id, patch) })),
      deleteCategory: (id) => set((state) => ({ categories: removeEntity(state.categories, id) })),
      getCategoryById: (id) => findEntity(get().categories, id),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.services,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ services, categories }): ServiceData => ({ services, categories }),
    },
  ),
);

// ---------- Selectors ----------

export interface ServiceFilter {
  query?: string;
  categoryId?: ID | null;
  activeOnly?: boolean;
}

export const selectSortedCategories = (categories: readonly ServiceCategory[]): ServiceCategory[] =>
  [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

export const selectFilteredServices = (
  services: readonly Service[],
  { query = '', categoryId = null, activeOnly = false }: ServiceFilter,
): Service[] =>
  services
    .filter((service) => (activeOnly ? service.isActive : true))
    .filter((service) => (categoryId ? service.categoryId === categoryId : true))
    .filter((service) => matchesQuery(query, service.name, service.description))
    .sort((a, b) => a.name.localeCompare(b.name));

export const selectServicesByIds = (services: readonly Service[], ids: readonly ID[]): Service[] =>
  ids
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is Service => service !== undefined);

export const selectServicesTotals = (
  services: readonly Service[],
): { price: number; duration: number } =>
  services.reduce(
    (totals, service) => ({
      price: totals.price + service.price,
      duration: totals.duration + service.duration,
    }),
    { price: 0, duration: 0 },
  );

export const selectServiceCountByCategory = (services: readonly Service[]): Record<ID, number> =>
  services.reduce<Record<ID, number>>((counts, service) => {
    counts[service.categoryId] = (counts[service.categoryId] ?? 0) + 1;
    return counts;
  }, {});
