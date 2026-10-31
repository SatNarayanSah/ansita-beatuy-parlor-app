import { useMemo } from 'react';

import { useCourseStore } from '@/store/courseStore';
import { useCustomerStore } from '@/store/customerStore';
import { useServiceStore } from '@/store/serviceStore';
import { useStaffStore } from '@/store/staffStore';
import type { Course, Customer, ID, Service, ServiceCategory, Staff } from '@/types';

/**
 * Id -> entity lookups for public catalogue data (services, categories,
 * staff, courses), used to label records returned by the services.
 */

const useMap = <T extends { id: ID }>(items: readonly T[]): ReadonlyMap<ID, T> =>
  useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

export const useServiceMap = (): ReadonlyMap<ID, Service> => useMap(useServiceStore((state) => state.services));

export const useCategoryMap = (): ReadonlyMap<ID, ServiceCategory> => useMap(useServiceStore((state) => state.categories));

export const useStaffMap = (): ReadonlyMap<ID, Staff> => useMap(useStaffStore((state) => state.staff));

/** Admin screens only: customers are private to the parlour. */
export const useCustomerMap = (): ReadonlyMap<ID, Customer> => useMap(useCustomerStore((state) => state.customers));

export const useCourseMap = (): ReadonlyMap<ID, Course> => useMap(useCourseStore((state) => state.courses));

/** "Hair Spa + Eyebrow Threading" */
export const serviceNames = (ids: readonly ID[], services: ReadonlyMap<ID, Service>): string =>
  ids.map((id) => services.get(id)?.name ?? 'Service').join(' + ');

export const firstName = (name: string | undefined): string => name?.split(' ')[0] ?? '';
