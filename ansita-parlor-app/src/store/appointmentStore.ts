import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildAppointments } from '@/data/appointments';
import { buildServices } from '@/data/services';
import type { Appointment, AppointmentStatus, ID, ISODate, UpdateInput } from '@/types';

import { findEntity, insertEntity, removeEntity, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface AppointmentData {
  appointments: Appointment[];
}

interface AppointmentActions {
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: ID, patch: UpdateInput<Appointment>) => void;
  deleteAppointment: (id: ID) => void;
  getAppointmentById: (id: ID) => Appointment | undefined;
  reset: () => void;
}

export type AppointmentState = AppointmentData & AppointmentActions;

const createInitialData = (): AppointmentData => ({
  appointments: buildAppointments(buildServices()),
});

export const useAppointmentStore = create<AppointmentState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addAppointment: (appointment) =>
        set((state) => ({ appointments: insertEntity(state.appointments, appointment) })),
      updateAppointment: (id, patch) =>
        set((state) => ({ appointments: updateEntity(state.appointments, id, patch) })),
      deleteAppointment: (id) =>
        set((state) => ({ appointments: removeEntity(state.appointments, id) })),
      getAppointmentById: (id) => findEntity(get().appointments, id),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.appointments,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ appointments }): AppointmentData => ({ appointments }),
    },
  ),
);

// ---------- Selectors ----------

/** Statuses that still occupy a time slot. */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ['pending', 'confirmed'];

const byDateTimeAsc = (a: Appointment, b: Appointment): number =>
  a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date);

const byDateTimeDesc = (a: Appointment, b: Appointment): number => byDateTimeAsc(b, a);

export interface AppointmentFilter {
  status?: AppointmentStatus | null;
  customerId?: ID | null;
  staffId?: ID | null;
  date?: ISODate | null;
  from?: ISODate | null;
  to?: ISODate | null;
}

export const selectFilteredAppointments = (
  appointments: readonly Appointment[],
  { status = null, customerId = null, staffId = null, date = null, from = null, to = null }: AppointmentFilter,
): Appointment[] =>
  appointments
    .filter((appointment) => (status ? appointment.status === status : true))
    .filter((appointment) => (customerId ? appointment.customerId === customerId : true))
    .filter((appointment) => (staffId ? appointment.staffId === staffId : true))
    .filter((appointment) => (date ? appointment.date === date : true))
    .filter((appointment) => (from ? appointment.date >= from : true))
    .filter((appointment) => (to ? appointment.date <= to : true))
    .sort(byDateTimeAsc);

export const selectAppointmentsOnDate = (appointments: readonly Appointment[], date: ISODate): Appointment[] =>
  appointments.filter((appointment) => appointment.date === date).sort(byDateTimeAsc);

/** Pending/confirmed bookings from `today` onwards, soonest first. */
export const selectUpcomingAppointments = (appointments: readonly Appointment[], today: ISODate): Appointment[] =>
  appointments
    .filter(
      (appointment) =>
        appointment.date >= today && ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status),
    )
    .sort(byDateTimeAsc);

/** Everything that is no longer actionable, most recent first. */
export const selectPastAppointments = (appointments: readonly Appointment[], today: ISODate): Appointment[] =>
  appointments
    .filter(
      (appointment) =>
        appointment.date < today || !ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status),
    )
    .sort(byDateTimeDesc);

export const selectAppointmentsByCustomer = (appointments: readonly Appointment[], customerId: ID): Appointment[] =>
  appointments.filter((appointment) => appointment.customerId === customerId).sort(byDateTimeDesc);

export const selectStatusCounts = (
  appointments: readonly Appointment[],
): Record<AppointmentStatus, number> =>
  appointments.reduce<Record<AppointmentStatus, number>>(
    (counts, appointment) => ({ ...counts, [appointment.status]: counts[appointment.status] + 1 }),
    { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 },
  );

/** Total collected (amountPaid) for appointments within the date range. */
export const selectRevenue = (appointments: readonly Appointment[], from: ISODate, to: ISODate): number =>
  appointments
    .filter((appointment) => appointment.date >= from && appointment.date <= to)
    .reduce((sum, appointment) => sum + appointment.amountPaid, 0);

/** Map of ISO date -> number of active bookings, for calendar dots. */
export const selectBookedDates = (appointments: readonly Appointment[]): Record<ISODate, number> =>
  appointments
    .filter((appointment) => ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status))
    .reduce<Record<ISODate, number>>((dates, appointment) => {
      dates[appointment.date] = (dates[appointment.date] ?? 0) + 1;
      return dates;
    }, {});
