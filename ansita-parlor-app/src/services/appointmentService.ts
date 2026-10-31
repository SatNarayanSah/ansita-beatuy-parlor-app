import {
  ACTIVE_APPOINTMENT_STATUSES,
  selectFilteredAppointments,
  useAppointmentStore,
  type AppointmentFilter,
} from '@/store/appointmentStore';
import { useCustomerStore } from '@/store/customerStore';
import { newEntityMeta } from '@/store/entityHelpers';
import { selectServicesByIds, selectServicesTotals, useServiceStore } from '@/store/serviceStore';
import { selectActiveStaff, selectWorkingHoursOn, useStaffStore } from '@/store/staffStore';
import type {
  Appointment,
  AppointmentStatus,
  ID,
  ISODate,
  PaymentMethod,
  PaymentStatus,
  Service,
  Staff,
  TimeSlot,
  TimeString,
  User,
} from '@/types';
import {
  addMinutesToTime,
  formatRelativeDay,
  formatTime12,
  generateTimeSlots,
  isPastDateTime,
  isValidISODate,
  isValidTime,
  timeRangesOverlap,
  timeToMinutes,
} from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';

import { ApiError, ensureFound, simulateRequest } from './client';
import { notifyAdmins, notifyCustomer } from './notify';
import { requireAdmin, requireCustomerAccess, requireUser } from './session';

/** Booking slots are offered every 30 minutes. */
export const SLOT_INTERVAL_MINUTES = 30;

/** Customers earn 1 loyalty point per Rs. 100 spent on completed appointments. */
const RUPEES_PER_LOYALTY_POINT = 100;

export interface AppointmentInput {
  customerId: ID;
  serviceIds: ID[];
  staffId: ID;
  date: ISODate;
  startTime: TimeString;
  notes: string;
}

export interface SlotQuery {
  date: ISODate;
  staffId: ID;
  serviceIds: ID[];
  /** Ignore this appointment when checking conflicts (used when rescheduling). */
  excludeAppointmentId?: ID;
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
}

/** Which statuses each status may move to. Terminal statuses have none. */
export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const canTransition = (from: AppointmentStatus, to: AppointmentStatus): boolean =>
  ALLOWED_STATUS_TRANSITIONS[from].includes(to);

// ---------- Internal helpers ----------

const resolveServices = (serviceIds: readonly ID[]): Service[] => {
  if (serviceIds.length === 0) throw new ApiError('VALIDATION', 'Select at least one service.');
  const services = selectServicesByIds(useServiceStore.getState().services, serviceIds);
  if (services.length !== serviceIds.length) {
    throw new ApiError('NOT_FOUND', 'One or more selected services no longer exist.');
  }
  const inactive = services.find((service) => !service.isActive);
  if (inactive) throw new ApiError('VALIDATION', `${inactive.name} is currently unavailable.`);
  return services;
};

const resolveStaff = (staffId: ID): Staff => {
  const member = ensureFound(useStaffStore.getState().getStaffById(staffId), 'Staff member');
  if (!member.isActive) throw new ApiError('VALIDATION', `${member.name} is not taking bookings.`);
  return member;
};

const totalDurationOf = (serviceIds: readonly ID[]): number =>
  selectServicesTotals(resolveServices(serviceIds)).duration;

/** Active bookings of a staff member (or customer) on a date, optionally excluding one. */
const busyAppointments = (
  date: ISODate,
  predicate: (appointment: Appointment) => boolean,
  excludeId?: ID,
): Appointment[] =>
  useAppointmentStore
    .getState()
    .appointments.filter(
      (appointment) =>
        appointment.id !== excludeId &&
        appointment.date === date &&
        ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status) &&
        predicate(appointment),
    );

const computePaymentStatus = (amountPaid: number, total: number): PaymentStatus => {
  if (amountPaid <= 0) return 'unpaid';
  if (amountPaid >= total) return 'paid';
  return 'partial';
};

/** Full server-side validation of a booking. Returns the computed end time and total. */
const validateBooking = (
  input: AppointmentInput,
  excludeId?: ID,
): { endTime: TimeString; totalPrice: number } => {
  if (!isValidISODate(input.date)) throw new ApiError('VALIDATION', 'Choose a valid date.');
  if (!isValidTime(input.startTime)) throw new ApiError('VALIDATION', 'Choose a valid time.');
  if (isPastDateTime(input.date, input.startTime)) {
    throw new ApiError('VALIDATION', 'This time has already passed. Pick a later slot.');
  }
  ensureFound(useCustomerStore.getState().getCustomerById(input.customerId), 'Customer');

  const services = resolveServices(input.serviceIds);
  const { price, duration } = selectServicesTotals(services);
  const endTime = addMinutesToTime(input.startTime, duration);

  const member = resolveStaff(input.staffId);
  const hours = selectWorkingHoursOn(member, input.date);
  if (!hours || hours.isOff) {
    throw new ApiError('VALIDATION', `${member.name} is not working on this day.`);
  }
  if (timeToMinutes(input.startTime) < timeToMinutes(hours.start) || timeToMinutes(endTime) > timeToMinutes(hours.end)) {
    throw new ApiError(
      'VALIDATION',
      `${member.name} works ${formatTime12(hours.start)} - ${formatTime12(hours.end)}. The booking must fit within these hours.`,
    );
  }

  const staffClash = busyAppointments(input.date, (a) => a.staffId === input.staffId, excludeId).find((a) =>
    timeRangesOverlap(input.startTime, endTime, a.startTime, a.endTime),
  );
  if (staffClash) {
    throw new ApiError(
      'CONFLICT',
      `${member.name} is already booked from ${formatTime12(staffClash.startTime)} to ${formatTime12(staffClash.endTime)}.`,
    );
  }

  const customerClash = busyAppointments(input.date, (a) => a.customerId === input.customerId, excludeId).find(
    (a) => timeRangesOverlap(input.startTime, endTime, a.startTime, a.endTime),
  );
  if (customerClash) {
    throw new ApiError('CONFLICT', 'This customer already has another appointment at that time.');
  }

  return { endTime, totalPrice: price };
};

const getAppointmentOrThrow = (id: ID): Appointment =>
  ensureFound(useAppointmentStore.getState().getAppointmentById(id), 'Appointment');

/** Loads an appointment the current user is allowed to see. */
const getAccessibleAppointment = (id: ID): { appointment: Appointment; user: User } => {
  const appointment = getAppointmentOrThrow(id);
  const user = requireCustomerAccess(appointment.customerId);
  return { appointment, user };
};

const describe = (appointment: Appointment): string => {
  const names = selectServicesByIds(useServiceStore.getState().services, appointment.serviceIds)
    .map((service) => service.name)
    .join(', ');
  return `${names || 'Your appointment'} on ${formatRelativeDay(appointment.date)} at ${formatTime12(appointment.startTime)}`;
};

const customerName = (customerId: ID): string =>
  useCustomerStore.getState().getCustomerById(customerId)?.name ?? 'A customer';

// ---------- Public API ----------

export const appointmentService = {
  /** Customers only ever receive their own appointments. */
  listAppointments: (filter: AppointmentFilter = {}): Promise<Appointment[]> =>
    simulateRequest(() => {
      const user = requireUser();
      const scoped: AppointmentFilter = user.role === 'customer' ? { ...filter, customerId: user.customerId } : filter;
      return selectFilteredAppointments(useAppointmentStore.getState().appointments, scoped);
    }),

  getAppointment: (id: ID): Promise<Appointment> =>
    simulateRequest(() => getAccessibleAppointment(id).appointment),

  /** Active staff who can perform every selected service and work on that date. */
  getAvailableStaff: (date: ISODate, serviceIds: ID[]): Promise<Staff[]> =>
    simulateRequest(() => {
      requireUser();
      const categoryIds = [...new Set(resolveServices(serviceIds).map((service) => service.categoryId))];
      return selectActiveStaff(useStaffStore.getState().staff).filter((member) => {
        const hours = selectWorkingHoursOn(member, date);
        return (
          hours !== undefined &&
          !hours.isOff &&
          categoryIds.every((categoryId) => member.specialties.includes(categoryId))
        );
      });
    }),

  /** Every 30-minute start time in the staff member's hours, flagged as available or not. */
  getAvailableSlots: ({ date, staffId, serviceIds, excludeAppointmentId }: SlotQuery): Promise<TimeSlot[]> =>
    simulateRequest(() => {
      requireUser();
      const member = resolveStaff(staffId);
      const hours = selectWorkingHoursOn(member, date);
      if (!hours || hours.isOff) return [];

      const duration = totalDurationOf(serviceIds);
      const busy = busyAppointments(date, (a) => a.staffId === staffId, excludeAppointmentId);

      return generateTimeSlots(hours.start, hours.end, SLOT_INTERVAL_MINUTES, duration).map((time) => {
        const end = addMinutesToTime(time, duration);
        const clashes = busy.some((a) => timeRangesOverlap(time, end, a.startTime, a.endTime));
        return { time, available: !clashes && !isPastDateTime(date, time) };
      });
    }),

  /** Admin bookings are confirmed immediately; customer requests start as pending. */
  createAppointment: (input: AppointmentInput): Promise<Appointment> =>
    simulateRequest(() => {
      const user = requireCustomerAccess(input.customerId);
      const { endTime, totalPrice } = validateBooking(input);
      const appointment: Appointment = {
        ...newEntityMeta('apt'),
        customerId: input.customerId,
        serviceIds: [...input.serviceIds],
        staffId: input.staffId,
        date: input.date,
        startTime: input.startTime,
        endTime,
        status: user.role === 'admin' ? 'confirmed' : 'pending',
        notes: input.notes.trim(),
        totalPrice,
        amountPaid: 0,
        paymentStatus: 'unpaid',
        paymentMethod: null,
        cancellationReason: null,
      };
      useAppointmentStore.getState().addAppointment(appointment);

      const link = { kind: 'appointment', id: appointment.id } as const;
      if (user.role === 'admin') {
        notifyCustomer(appointment.customerId, {
          type: 'appointment_confirmed',
          title: 'Appointment booked',
          message: `${describe(appointment)} is confirmed.`,
          link,
        });
        notifyAdmins(
          {
            type: 'appointment_booked',
            title: 'New appointment',
            message: `${user.name} booked ${customerName(appointment.customerId)}: ${describe(appointment)}.`,
            link,
          },
          user.id,
        );
      } else {
        notifyAdmins({
          type: 'appointment_booked',
          title: 'New booking request',
          message: `${customerName(appointment.customerId)} requested ${describe(appointment)}.`,
          link,
        });
        notifyCustomer(appointment.customerId, {
          type: 'appointment_booked',
          title: 'Booking request sent',
          message: `We received your request for ${describe(appointment)}. We’ll confirm it shortly.`,
          link,
        });
      }
      return appointment;
    }),

  /**
   * Change services, staff, date or time. A customer's change sends the booking back
   * to "pending" for the parlor to re-confirm.
   */
  updateAppointment: (id: ID, input: Partial<Omit<AppointmentInput, 'customerId'>>): Promise<Appointment> =>
    simulateRequest(() => {
      const { appointment, user } = getAccessibleAppointment(id);
      if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
        throw new ApiError('VALIDATION', 'Only pending or confirmed appointments can be changed.');
      }
      const next: AppointmentInput = {
        customerId: appointment.customerId,
        serviceIds: input.serviceIds ?? appointment.serviceIds,
        staffId: input.staffId ?? appointment.staffId,
        date: input.date ?? appointment.date,
        startTime: input.startTime ?? appointment.startTime,
        notes: input.notes ?? appointment.notes,
      };
      const { endTime, totalPrice } = validateBooking(next, id);
      const status: AppointmentStatus = user.role === 'admin' ? appointment.status : 'pending';

      useAppointmentStore.getState().updateAppointment(id, {
        ...next,
        notes: next.notes.trim(),
        endTime,
        totalPrice,
        status,
        paymentStatus: computePaymentStatus(appointment.amountPaid, totalPrice),
      });
      const updated = getAppointmentOrThrow(id);

      const link = { kind: 'appointment', id } as const;
      if (user.role === 'admin') {
        notifyCustomer(updated.customerId, {
          type: 'appointment_confirmed',
          title: 'Appointment updated',
          message: `Your booking was updated: ${describe(updated)}.`,
          link,
        });
      } else {
        notifyAdmins({
          type: 'appointment_booked',
          title: 'Reschedule request',
          message: `${customerName(updated.customerId)} changed their booking to ${describe(updated)}.`,
          link,
        });
      }
      return updated;
    }),

  /**
   * Move an appointment through its lifecycle. Customers may only cancel their own
   * pending/confirmed bookings; everything else is admin-only.
   */
  updateStatus: (id: ID, status: AppointmentStatus, reason?: string): Promise<Appointment> =>
    simulateRequest(() => {
      const { appointment, user } = getAccessibleAppointment(id);
      if (user.role === 'customer' && status !== 'cancelled') throw new ApiError('FORBIDDEN');
      if (!canTransition(appointment.status, status)) {
        throw new ApiError(
          'VALIDATION',
          `A ${formatEnumLabel(appointment.status)} appointment cannot be marked ${formatEnumLabel(status)}.`,
        );
      }
      if (status === 'completed' && !isPastDateTime(appointment.date, appointment.startTime)) {
        throw new ApiError('VALIDATION', 'An appointment can only be completed after it has started.');
      }

      useAppointmentStore.getState().updateAppointment(id, {
        status,
        cancellationReason: status === 'cancelled' ? (reason?.trim() || null) : appointment.cancellationReason,
      });
      const updated = getAppointmentOrThrow(id);
      const link = { kind: 'appointment', id } as const;

      if (status === 'completed') {
        const points = Math.floor(updated.totalPrice / RUPEES_PER_LOYALTY_POINT);
        useCustomerStore.getState().adjustLoyaltyPoints(updated.customerId, points);
        notifyCustomer(updated.customerId, {
          type: 'system',
          title: 'Thanks for visiting!',
          message: `You earned ${points} loyalty points. We’d love your review.`,
          link,
        });
      } else if (status === 'confirmed') {
        notifyCustomer(updated.customerId, {
          type: 'appointment_confirmed',
          title: 'Appointment confirmed',
          message: `${describe(updated)} is confirmed. See you soon!`,
          link,
        });
      } else if (status === 'cancelled') {
        if (user.role === 'admin') {
          notifyCustomer(updated.customerId, {
            type: 'appointment_cancelled',
            title: 'Appointment cancelled',
            message: `${describe(updated)} was cancelled${updated.cancellationReason ? `: ${updated.cancellationReason}` : '.'}`,
            link,
          });
        } else {
          notifyAdmins({
            type: 'appointment_cancelled',
            title: 'Appointment cancelled',
            message: `${customerName(updated.customerId)} cancelled ${describe(updated)}.`,
            link,
          });
        }
      }
      return updated;
    }),

  /** Adds a payment; the payment status is derived from the running total. */
  recordPayment: (id: ID, { amount, method }: PaymentInput): Promise<Appointment> =>
    simulateRequest(() => {
      requireAdmin();
      const appointment = getAppointmentOrThrow(id);
      if (appointment.status === 'cancelled' || appointment.status === 'no_show') {
        throw new ApiError('VALIDATION', 'Payments cannot be recorded for this appointment.');
      }
      const due = appointment.totalPrice - appointment.amountPaid;
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new ApiError('VALIDATION', 'Enter a valid amount.');
      }
      if (amount > due) {
        throw new ApiError('VALIDATION', `Amount exceeds the balance due (${formatCurrency(due)}).`);
      }
      const amountPaid = appointment.amountPaid + amount;
      useAppointmentStore.getState().updateAppointment(id, {
        amountPaid,
        paymentMethod: method,
        paymentStatus: computePaymentStatus(amountPaid, appointment.totalPrice),
      });
      notifyCustomer(appointment.customerId, {
        type: 'payment',
        title: 'Payment received',
        message: `Thank you! ${formatCurrency(amount)} received for ${describe(appointment)}.`,
        link: { kind: 'appointment', id },
      });
      return getAppointmentOrThrow(id);
    }),

  /** Hard delete, for removing bookings entered by mistake. */
  deleteAppointment: (id: ID): Promise<void> =>
    simulateRequest(() => {
      requireAdmin();
      getAppointmentOrThrow(id);
      useAppointmentStore.getState().deleteAppointment(id);
    }),
};
