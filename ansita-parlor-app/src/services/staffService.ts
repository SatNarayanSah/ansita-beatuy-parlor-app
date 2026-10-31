import { useAppointmentStore } from '@/store/appointmentStore';
import { useReviewStore } from '@/store/reviewStore';
import { useStaffStore } from '@/store/staffStore';
import type { Appointment, ID, ISODate, Review, Staff } from '@/types';

import { api } from './client';

export type StaffInput = Pick<
  Staff,
  'name' | 'role' | 'phone' | 'email' | 'specialties' | 'workingHours' | 'avatar' | 'isActive'
>;

export interface StaffFilter {
  query?: string;
  activeOnly?: boolean;
}

const cacheStaff = (member: Staff): Staff => {
  useStaffStore.getState().mergeStaff([member]);
  return member;
};

export const staffService = {
  listStaff: async ({ query = '', activeOnly = false }: StaffFilter = {}): Promise<Staff[]> => {
    const list = await api<Staff[]>('GET', '/staff', { query: { query, activeOnly: activeOnly || undefined } });
    const store = useStaffStore.getState();
    if (!query && !activeOnly) store.setStaff(list);
    else store.mergeStaff(list);
    return list;
  },

  getStaff: async (id: ID): Promise<Staff> => cacheStaff(await api<Staff>('GET', `/staff/${id}`)),

  createStaff: async (input: StaffInput): Promise<Staff> => cacheStaff(await api<Staff>('POST', '/staff', { body: input })),

  /** Hour changes that would strand upcoming bookings are refused by the server. */
  updateStaff: async (id: ID, input: Partial<StaffInput>): Promise<Staff> =>
    cacheStaff(await api<Staff>('PATCH', `/staff/${id}`, { body: input })),

  /** Deactivating is refused while the member has upcoming bookings. */
  setStaffActive: async (id: ID, isActive: boolean): Promise<Staff> =>
    cacheStaff(await api<Staff>('POST', `/staff/${id}/active`, { body: { isActive } })),

  /** Blocked while the member has upcoming bookings or leads a course. */
  deleteStaff: async (id: ID): Promise<void> => {
    await api<null>('DELETE', `/staff/${id}`);
    useStaffStore.getState().removeStaff(id);
  },

  /** All of a staff member's appointments on a given date. */
  getSchedule: async (staffId: ID, date: ISODate): Promise<Appointment[]> => {
    const list = await api<Appointment[]>('GET', `/staff/${staffId}/schedule`, { query: { date } });
    useAppointmentStore.getState().mergeAppointments(list);
    return list;
  },

  getReviews: async (staffId: ID): Promise<Review[]> => {
    const list = await api<Review[]>('GET', `/staff/${staffId}/reviews`);
    useReviewStore.getState().mergeReviews(list);
    return list;
  },
};
