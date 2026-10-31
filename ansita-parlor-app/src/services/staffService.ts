import {
  ACTIVE_APPOINTMENT_STATUSES,
  selectFilteredAppointments,
  useAppointmentStore,
} from '@/store/appointmentStore';
import { useCourseStore } from '@/store/courseStore';
import { newEntityMeta } from '@/store/entityHelpers';
import { selectReviewsByStaff, useReviewStore } from '@/store/reviewStore';
import { selectActiveStaff, selectFilteredStaff, useStaffStore } from '@/store/staffStore';
import type { Appointment, ID, ISODate, Review, Staff, WorkingHours } from '@/types';
import { timeToMinutes, todayISO, weekdayOf } from '@/utils/date';
import { formatEnumLabel } from '@/utils/format';
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

const validateHours = (hours: readonly WorkingHours[]): void => {
  const bad = hours.find((day) => !day.isOff && timeToMinutes(day.end) <= timeToMinutes(day.start));
  if (bad) throw new ApiError('VALIDATION', `Shift on ${formatEnumLabel(bad.day)} must end after it starts.`);
  if (hours.every((day) => day.isOff)) throw new ApiError('VALIDATION', 'Set at least one working day.');
};

/** Upcoming active bookings that would fall outside these hours (or on a day off). */
const bookingsOutside = (staffId: ID, hours: readonly WorkingHours[]): Appointment[] => {
  const today = todayISO();
  return useAppointmentStore.getState().appointments.filter((appointment) => {
    if (appointment.staffId !== staffId || appointment.date < today || !ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) return false;
    const day = hours.find((entry) => entry.day === weekdayOf(appointment.date));
    return (
      !day ||
      day.isOff ||
      timeToMinutes(appointment.startTime) < timeToMinutes(day.start) ||
      timeToMinutes(appointment.endTime) > timeToMinutes(day.end)
    );
  });
};

const assertNoStrandedBookings = (staffId: ID, hours: readonly WorkingHours[]): void => {
  const stranded = bookingsOutside(staffId, hours);
  if (stranded.length > 0) {
    throw new ApiError(
      'CONFLICT',
      `${stranded.length} upcoming booking${stranded.length === 1 ? ' falls' : 's fall'} outside the new hours (first on ${stranded[0]?.date}). Reschedule ${stranded.length === 1 ? 'it' : 'them'} first.`,
    );
  }
};

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
      if (input.name.trim().length < 2) throw new ApiError('VALIDATION', 'Enter the staff member’s name.');
      if (input.specialties.length === 0) throw new ApiError('VALIDATION', 'Choose at least one specialty.');
      validateHours(input.workingHours);
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
      if (input.specialties !== undefined && input.specialties.length === 0) throw new ApiError('VALIDATION', 'Choose at least one specialty.');
      if (input.workingHours) {
        validateHours(input.workingHours);
        assertNoStrandedBookings(id, input.workingHours);
      }
      const patch: Partial<StaffInput> = {
        ...input,
        ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
      };
      useStaffStore.getState().updateStaff(id, patch);
      return ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member');
    }),

  /** Deactivating is refused while the member has upcoming bookings. */
  setStaffActive: (id: ID, isActive: boolean): Promise<Staff> =>
    simulateRequest(() => {
      requireAdmin();
      ensureFound(useStaffStore.getState().getStaffById(id), 'Staff member');
      if (!isActive) {
        const upcoming = bookingsOutside(id, []);
        if (upcoming.length > 0) {
          throw new ApiError('CONFLICT', `Reassign or cancel ${upcoming.length} upcoming booking${upcoming.length === 1 ? '' : 's'} before deactivating.`);
        }
      }
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
