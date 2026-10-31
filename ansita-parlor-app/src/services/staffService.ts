import {
  ACTIVE_APPOINTMENT_STATUSES,
  selectFilteredAppointments,
  useAppointmentStore,
} from '@/store/appointmentStore';
import { useCourseStore } from '@/store/courseStore';
import { newEntityMeta } from '@/store/entityHelpers';
import { selectReviewsByStaff, useReviewStore } from '@/store/reviewStore';
import { selectActiveStaff, selectFilteredStaff, useStaffStore } from '@/store/staffStore';
import type { Appointment, ID, ISODate, Review, Staff } from '@/types';
import { todayISO } from '@/utils/date';
import { normalizePhone } from '@/utils/phone';

import { ApiError, ensureFound, simulateRequest } from './client';
import { requireAdmin } from './session';

export type StaffInput = Pick<
  Staff,
  'name' | 'role' | 'phone' | 'email' | 'specialties' | 'workingHours' | 'avatar' | 'isActive'
>;

export interface StaffFilter {
  query?: string;
  activeOnly?: boolean;
}

export const staffService = {
  listStaff: ({ query = '', activeOnly = false }: StaffFilter = {}): Promise<Staff[]> =>
    simulateRequest(() => {
      const { staff } = useStaffStore.getState();
      const filtered = selectFilteredStaff(staff, query);
      return activeOnly ? selectActiveStaff(filtered) : filtered;
    }),

  getStaff: (id: ID): Promise<Staff> =>
    simulateRequest(() => ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member')),

  createStaff: (input: StaffInput): Promise<Staff> =>
    simulateRequest(() => {
      requireAdmin();
      const member: Staff = {
        ...newEntityMeta('stf'),
        ...input,
        name: input.name.trim(),
        phone: normalizePhone(input.phone),
        rating: 0,
      };
      useStaffStore.getState().addStaff(member);
      return member;
    }),

  updateStaff: (id: ID, input: Partial<StaffInput>): Promise<Staff> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member');
      const patch: Partial<StaffInput> = {
        ...input,
        ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
      };
      useStaffStore.getState().updateStaff(id, patch);
      return ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member');
    }),

  setStaffActive: (id: ID, isActive: boolean): Promise<Staff> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member');
      useStaffStore.getState().updateStaff(id, { isActive });
      return ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member');
    }),

  /** Blocked while the member has upcoming bookings or leads a course. */
  deleteStaff: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member');
      const today = todayISO();
      const hasUpcoming = useAppointmentStore
        .getState()
        .appointments.some(
          (appointment) =>
            appointment.staffId === id &&
            appointment.date >= today &&
            ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status),
        );
      if (hasUpcoming) {
        throw new ApiError('CONFLICT', 'Reassign this staff member’s upcoming appointments first.');
      }
      if (useCourseStore.getState().courses.some((course) => course.instructor === id)) {
        throw new ApiError('CONFLICT', 'This staff member is the instructor of a course.');
      }
      useStaffStore.getState().deleteStaff(id);
    }),

  /** All of a staff member's appointments on a given date. */
  getSchedule: (staffId: ID, date: ISODate): Promise<Appointment[]> =>
    simulateRequest(() => {
      requireAdmin();
      return selectFilteredAppointments(useAppointmentStore.getState().appointments, { staffId, date });
    }),

  getReviews: (staffId: ID): Promise<Review[]> =>
    simulateRequest(() => selectReviewsByStaff(useReviewStore.getState().reviews, staffId)),
};
