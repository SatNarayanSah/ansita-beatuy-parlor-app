import { create } from 'zustand';

import type { ID, Service, ServiceCategory } from '@/types';

import { findEntity, matchesQuery, mergeEntities, replaceEntities, withoutEntity } from './entityHelpers';

interface ServiceData {
  services: Service[];
  categories: ServiceCategory[];
}

interface ServiceActions {
  setServices: (services: readonly Service[]) => void;
  mergeServices: (services: readonly Service[]) => void;
  removeService: (id: ID) => void;
  getServiceById: (id: ID) => Service | undefined;

  setCategories: (categories: readonly ServiceCategory[]) => void;
  mergeCategories: (categories: readonly ServiceCategory[]) => void;
  removeCategory: (id: ID) => void;
  getCategoryById: (id: ID) => ServiceCategory | undefined;

  reset: () => void;
}

export type ServiceState = ServiceData & ServiceActions;

/** Cache of the parlour's services and categories, loaded from the server. */
export const useServiceStore = create<ServiceState>()((set, get) => ({
  services: [],
  categories: [],

  setServices: (list) => {
    const next = replaceEntities(get().services, list);
    if (next) set({ services: next });
  },
  mergeServices: (list) => {
    const next = mergeEntities(get().services, list);
    if (next) set({ services: next });
  },
  removeService: (id) => {
    const next = withoutEntity(get().services, id);
    if (next) set({ services: next });
  },
  getServiceById: (id) => findEntity(get().services, id),

  setCategories: (list) => {
    const next = replaceEntities(get().categories, list);
    if (next) set({ categories: next });
  },
  mergeCategories: (list) => {
    const next = mergeEntities(get().categories, list);
    if (next) set({ categories: next });
  },
  removeCategory: (id) => {
    const next = withoutEntity(get().categories, id);
    if (next) set({ categories: next });
  },
  getCategoryById: (id) => findEntity(get().categories, id),

  reset: () => set({ services: [], categories: [] }),
}));

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
