import { ACTIVE_APPOINTMENT_STATUSES, useAppointmentStore } from '@/store/appointmentStore';
import { newEntityMeta } from '@/store/entityHelpers';
import {
  selectFilteredServices,
  selectSortedCategories,
  useServiceStore,
  type ServiceFilter,
} from '@/store/serviceStore';
import type { ID, Service, ServiceCategory } from '@/types';
import { todayISO } from '@/utils/date';

import { ApiError, ensureFound, simulateRequest } from './client';
import { requireAdmin, requireUser } from './session';

export type ServiceInput = Pick<
  Service,
  'name' | 'categoryId' | 'duration' | 'price' | 'description' | 'image' | 'isActive'
>;

export type CategoryInput = Pick<ServiceCategory, 'name' | 'icon' | 'color'>;

const assertCategoryExists = (categoryId: ID): void => {
  ensureFound(useServiceStore.getState().getCategoryById(categoryId), 'Category');
};

const isServiceBookedAhead = (serviceId: ID): boolean => {
  const today = todayISO();
  return useAppointmentStore
    .getState()
    .appointments.some(
      (appointment) =>
        appointment.date >= today &&
        ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status) &&
        appointment.serviceIds.includes(serviceId),
    );
};

/** Parlor services ("catalog") and their categories. Named to avoid "serviceService". */
export const catalogService = {
  listCategories: (): Promise<ServiceCategory[]> =>
    simulateRequest(() => selectSortedCategories(useServiceStore.getState().categories)),

  /** Customers only ever see active services. */
  listServices: (filter: ServiceFilter = {}): Promise<Service[]> =>
    simulateRequest(() => {
      const user = requireUser();
      const activeOnly = user.role === 'customer' ? true : (filter.activeOnly ?? false);
      return selectFilteredServices(useServiceStore.getState().services, { ...filter, activeOnly });
    }),

  getService: (id: ID): Promise<Service> =>
    simulateRequest(() => ensureFound(useServiceStore.getState().getServiceById(id), 'Service')),

  createService: (input: ServiceInput): Promise<Service> =>
    simulateRequest(() => {
      requireAdmin();
      assertCategoryExists(input.categoryId);
      const service: Service = { ...newEntityMeta('svc'), ...input, name: input.name.trim() };
      useServiceStore.getState().addService(service);
      return service;
    }),

  updateService: (id: ID, input: Partial<ServiceInput>): Promise<Service> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useServiceStore.getState().getServiceById(id), 'Service');
      if (input.categoryId !== undefined) assertCategoryExists(input.categoryId);
      useServiceStore.getState().updateService(id, input);
      return ensureFound(useServiceStore.getState().getServiceById(id), 'Service');
    }),

  setServiceActive: (id: ID, isActive: boolean): Promise<Service> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useServiceStore.getState().getServiceById(id), 'Service');
      useServiceStore.getState().updateService(id, { isActive });
      return ensureFound(useServiceStore.getState().getServiceById(id), 'Service');
    }),

  /** Past appointments keep their snapshot price; upcoming bookings block deletion. */
  deleteService: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useServiceStore.getState().getServiceById(id), 'Service');
      if (isServiceBookedAhead(id)) {
        throw new ApiError(
          'CONFLICT',
          'This service has upcoming bookings. Deactivate it instead, or reschedule those bookings first.',
        );
      }
      useServiceStore.getState().deleteService(id);
    }),

  createCategory: (input: CategoryInput): Promise<ServiceCategory> =>
    simulateRequest(() => {
      requireAdmin();
      const { categories } = useServiceStore.getState();
      const name = input.name.trim();
      if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
        throw new ApiError('CONFLICT', 'A category with this name already exists.');
      }
      const category: ServiceCategory = {
        ...newEntityMeta('cat'),
        ...input,
        name,
        sortOrder: categories.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1,
      };
      useServiceStore.getState().addCategory(category);
      return category;
    }),

  updateCategory: (id: ID, input: Partial<CategoryInput>): Promise<ServiceCategory> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useServiceStore.getState().getCategoryById(id), 'Category');
      useServiceStore.getState().updateCategory(id, input);
      return ensureFound(useServiceStore.getState().getCategoryById(id), 'Category');
    }),

  deleteCategory: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useServiceStore.getState().getCategoryById(id), 'Category');
      if (useServiceStore.getState().services.some((service) => service.categoryId === id)) {
        throw new ApiError('CONFLICT', 'Move or delete the services in this category first.');
      }
      useServiceStore.getState().deleteCategory(id);
    }),
};
