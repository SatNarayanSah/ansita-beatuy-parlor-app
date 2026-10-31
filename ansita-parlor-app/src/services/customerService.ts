import { ACTIVE_APPOINTMENT_STATUSES, useAppointmentStore } from '@/store/appointmentStore';
import { selectUserByCustomerId, useAuthStore } from '@/store/authStore';
import { useCourseStore } from '@/store/courseStore';
import { selectFilteredCustomers, useCustomerStore, type CustomerFilter } from '@/store/customerStore';
import { newEntityMeta } from '@/store/entityHelpers';
import type { Customer, ID, ISODate } from '@/types';
import { nowISO, todayISO } from '@/utils/date';
import { normalizePhone } from '@/utils/phone';

import { ApiError, ensureFound, simulateRequest } from './client';
import { requireAdmin, requireCustomerAccess } from './session';

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

const assertPhoneAvailable = (phone: string, exceptId?: ID): void => {
  const taken = useCustomerStore
    .getState()
    .customers.some((customer) => customer.id !== exceptId && customer.phone === phone);
  if (taken) throw new ApiError('CONFLICT', 'A customer with this phone number already exists.');
};

const normalizeInput = <T extends Partial<CustomerInput>>(input: T): T => ({
  ...input,
  ...(input.name !== undefined ? { name: input.name.trim() } : {}),
  ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
  ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
});

export const customerService = {
  listCustomers: (filter: CustomerFilter = {}): Promise<Customer[]> =>
    simulateRequest(() => {
      requireAdmin();
      return selectFilteredCustomers(useCustomerStore.getState().customers, filter);
    }),

  getCustomer: (id: ID): Promise<Customer> =>
    simulateRequest(() => {
      requireCustomerAccess(id);
      return ensureFound(useCustomerStore.getState().getCustomerById(id), 'Customer');
    }),

  createCustomer: (input: CustomerInput): Promise<Customer> =>
    simulateRequest(() => {
      requireAdmin();
      const data = normalizeInput(input);
      assertPhoneAvailable(data.phone);
      const customer: Customer = {
        ...newEntityMeta('cus'),
        ...data,
        loyaltyPoints: 0,
        joinedAt: nowISO(),
      };
      useCustomerStore.getState().addCustomer(customer);
      return customer;
    }),

  /** Admins can edit anyone; customers can edit their own profile (tags/notes are admin-only). */
  updateCustomer: (id: ID, input: Partial<CustomerInput>): Promise<Customer> =>
    simulateRequest(() => {
      const user = requireCustomerAccess(id);
      ensureFound(useCustomerStore.getState().getCustomerById(id), 'Customer');
      const { tags, notes, ...profile } = normalizeInput(input);
      const patch: Partial<CustomerInput> = user.role === 'admin' ? { ...profile, tags, notes } : profile;
      if (patch.tags === undefined) delete patch.tags;
      if (patch.notes === undefined) delete patch.notes;
      if (patch.phone !== undefined) assertPhoneAvailable(patch.phone, id);

      useCustomerStore.getState().updateCustomer(id, patch);

      // Keep the linked app account in sync.
      const linkedUser = selectUserByCustomerId(useAuthStore.getState().users, id);
      if (linkedUser) {
        useAuthStore.getState().updateUser(linkedUser.id, {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
        });
      }
      return ensureFound(useCustomerStore.getState().getCustomerById(id), 'Customer');
    }),

  /** Blocked while the customer has upcoming bookings or an ongoing course. */
  deleteCustomer: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useCustomerStore.getState().getCustomerById(id), 'Customer');
      const today = todayISO();
      const hasUpcoming = useAppointmentStore
        .getState()
        .appointments.some(
          (appointment) =>
            appointment.customerId === id &&
            appointment.date >= today &&
            ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status),
        );
      if (hasUpcoming) {
        throw new ApiError('CONFLICT', 'Cancel this customer’s upcoming appointments first.');
      }
      const hasActiveCourse = useCourseStore
        .getState()
        .enrollments.some(
          (enrollment) =>
            enrollment.studentId === id && (enrollment.status === 'active' || enrollment.status === 'pending'),
        );
      if (hasActiveCourse) {
        throw new ApiError('CONFLICT', 'This customer is enrolled in an ongoing course.');
      }

      const linkedUser = selectUserByCustomerId(useAuthStore.getState().users, id);
      if (linkedUser) useAuthStore.getState().deleteUser(linkedUser.id);
      useCustomerStore.getState().deleteCustomer(id);
    }),

  adjustLoyaltyPoints: (id: ID, delta: number): Promise<Customer> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useCustomerStore.getState().getCustomerById(id), 'Customer');
      useCustomerStore.getState().adjustLoyaltyPoints(id, Math.trunc(delta));
      return ensureFound(useCustomerStore.getState().getCustomerById(id), 'Customer');
    }),

  getCustomerStats: (id: ID): Promise<CustomerStats> =>
    simulateRequest(() => {
      requireCustomerAccess(id);
      const today = todayISO();
      const appointments = useAppointmentStore
        .getState()
        .appointments.filter((appointment) => appointment.customerId === id);
      const completed = appointments.filter((appointment) => appointment.status === 'completed');
      const lastVisit = completed.reduce<ISODate | null>(
        (latest, appointment) => (latest === null || appointment.date > latest ? appointment.date : latest),
        null,
      );
      return {
        totalVisits: completed.length,
        totalSpent: appointments.reduce((sum, appointment) => sum + appointment.amountPaid, 0),
        lastVisit,
        upcomingCount: appointments.filter(
          (appointment) =>
            appointment.date >= today && ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status),
        ).length,
        cancelledCount: appointments.filter((appointment) => appointment.status === 'cancelled').length,
        activeEnrollments: useCourseStore
          .getState()
          .enrollments.filter((enrollment) => enrollment.studentId === id && enrollment.status === 'active')
          .length,
      };
    }),
};
