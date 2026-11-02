import { useAppointmentStore, type AppointmentFilter } from '@/store/appointmentStore';
import { useCustomerStore } from '@/store/customerStore';
import { useStaffStore } from '@/store/staffStore';
import type {
  Appointment,
  AppointmentStatus,
  Customer,
  ID,
  ISODate,
  PaymentMethod,
  Staff,
  TimeSlot,
  TimeString,
} from '@/types';

import { api } from './client';
import { refreshNotificationsSoon } from './sync';

/** Booking slots are offered every 30 minutes (the server uses the same interval). */
export const SLOT_INTERVAL_MINUTES = 30;

export interface AppointmentInput {
  customerId: ID;
  serviceIds: ID[];
  staffId: ID;
  date: ISODate;
  startTime: TimeString;
  notes: string;
  preferredPaymentMethod?: PaymentMethod | null;
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

/** Which statuses each status may move to (mirrors the server rule, for showing the right buttons). */
export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const canTransition = (from: AppointmentStatus, to: AppointmentStatus): boolean =>
  ALLOWED_STATUS_TRANSITIONS[from].includes(to);

const isUnfiltered = (filter: AppointmentFilter): boolean => Object.values(filter).every((value) => !value);

/** Caches the saved appointment and picks up the notifications the server created. */
/** Re-reads a customer whose loyalty balance the server just changed. */
const refreshCustomer = async (customerId: ID): Promise<void> => {
  const customer = await api<Customer>('GET', `/customers/${customerId}`).catch(() => null);
  if (customer) useCustomerStore.getState().mergeCustomers([customer]);
};

const saved = (appointment: Appointment): Appointment => {
  useAppointmentStore.getState().mergeAppointments([appointment]);
  refreshNotificationsSoon();
  return appointment;
};

export const appointmentService = {
  /** Customers only ever receive their own appointments (enforced by the server). */
  listAppointments: async (filter: AppointmentFilter = {}): Promise<Appointment[]> => {
    const list = await api<Appointment[]>('GET', '/appointments', { query: { ...filter } });
    const store = useAppointmentStore.getState();
    if (isUnfiltered(filter)) store.setAppointments(list);
    else store.mergeAppointments(list);
    return list;
  },

  getAppointment: async (id: ID): Promise<Appointment> => {
    const appointment = await api<Appointment>('GET', `/appointments/${id}`);
    useAppointmentStore.getState().mergeAppointments([appointment]);
    return appointment;
  },

  /** Active staff who can perform every selected service and work on that date. */
  getAvailableStaff: async (date: ISODate, serviceIds: ID[]): Promise<Staff[]> => {
    const staff = await api<Staff[]>('GET', '/availability/staff', { query: { date, serviceIds } });
    useStaffStore.getState().mergeStaff(staff);
    return staff;
  },

  /** Every 30-minute start time in the staff member's hours, flagged as available or not. */
  getAvailableSlots: ({ date, staffId, serviceIds, excludeAppointmentId }: SlotQuery): Promise<TimeSlot[]> =>
    api<TimeSlot[]>('GET', '/availability/slots', { query: { date, staffId, serviceIds, excludeAppointmentId } }),

  /** Admin bookings are confirmed immediately; customer requests start as pending. */
  createAppointment: async (input: AppointmentInput): Promise<Appointment> =>
    saved(await api<Appointment>('POST', '/appointments', { body: input })),

  /** Change services, staff, date or time. A customer's change goes back to "pending". */
  updateAppointment: async (id: ID, input: Partial<Omit<AppointmentInput, 'customerId'>>): Promise<Appointment> =>
    saved(await api<Appointment>('PATCH', `/appointments/${id}`, { body: input })),

  /** Customers may only cancel; everything else is admin-only (enforced by the server). */
  updateStatus: async (id: ID, status: AppointmentStatus, reason?: string): Promise<Appointment> => {
    const appointment = saved(await api<Appointment>('POST', `/appointments/${id}/status`, { body: { status, reason } }));
    // Completing awards loyalty points; cancelling or a no-show gives back points used on the bill.
    if (status !== 'confirmed') await refreshCustomer(appointment.customerId);
    return appointment;
  },

  /** Adds a payment; the server derives the payment status from the running total. */
  recordPayment: async (id: ID, input: PaymentInput): Promise<Appointment> =>
    saved(await api<Appointment>('POST', `/appointments/${id}/payments`, { body: input })),

  /**
   * Uses the customer's loyalty points as a discount on this bill (admin only). The server
   * checks the minimum balance and that the discount fits the amount due.
   */
  redeemPoints: async (id: ID, points: number): Promise<Appointment> => {
    const appointment = saved(await api<Appointment>('POST', `/appointments/${id}/redeem-points`, { body: { points } }));
    await refreshCustomer(appointment.customerId);
    return appointment;
  },

  /** Takes the loyalty discount off and gives the points back. */
  removePointsDiscount: async (id: ID): Promise<Appointment> => {
    const appointment = saved(await api<Appointment>('DELETE', `/appointments/${id}/redeem-points`));
    await refreshCustomer(appointment.customerId);
    return appointment;
  },

  /** Hard delete, for removing bookings entered by mistake. */
  deleteAppointment: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/appointments/${id}`);
    useAppointmentStore.getState().removeAppointment(id);
  },
};
