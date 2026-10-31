import { create } from 'zustand';

import type { Appointment, AppointmentStatus, ID, ISODate } from '@/types';

import { findEntity, mergeEntities, replaceEntities, withoutEntity } from './entityHelpers';

interface AppointmentData {
  appointments: Appointment[];
}

interface AppointmentActions {
  setAppointments: (appointments: readonly Appointment[]) => void;
  mergeAppointments: (appointments: readonly Appointment[]) => void;
  removeAppointment: (id: ID) => void;
  getAppointmentById: (id: ID) => Appointment | undefined;
  reset: () => void;
}

export type AppointmentState = AppointmentData & AppointmentActions;

/** Cache of appointments loaded from the server. */
export const useAppointmentStore = create<AppointmentState>()((set, get) => ({
  appointments: [],

  setAppointments: (list) => {
    const next = replaceEntities(get().appointments, list);
    if (next) set({ appointments: next });
  },
  mergeAppointments: (list) => {
    const next = mergeEntities(get().appointments, list);
    if (next) set({ appointments: next });
  },
  removeAppointment: (id) => {
    const next = withoutEntity(get().appointments, id);
    if (next) set({ appointments: next });
  },
  getAppointmentById: (id) => findEntity(get().appointments, id),
  reset: () => set({ appointments: [] }),
}));

// ---------- Selectors ----------

/** Statuses that still occupy a time slot. */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ['pending', 'confirmed'];

const byDateTimeAsc = (a: Appointment, b: Appointment): number =>
  a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date);

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

/** Pending/confirmed bookings from `today` onwards, soonest first. */
export const selectUpcomingAppointments = (appointments: readonly Appointment[], today: ISODate): Appointment[] =>
  appointments
    .filter(
      (appointment) =>
        appointment.date >= today && ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status),
    )
    .sort(byDateTimeAsc);

export const selectStatusCounts = (
  appointments: readonly Appointment[],
): Record<AppointmentStatus, number> =>
  appointments.reduce<Record<AppointmentStatus, number>>(
    (counts, appointment) => ({ ...counts, [appointment.status]: counts[appointment.status] + 1 }),
    { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 },
  );
