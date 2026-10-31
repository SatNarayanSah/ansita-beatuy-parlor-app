import { create } from 'zustand';

import type { ID, ISODate, Staff, WorkingHours } from '@/types';
import { weekdayOf } from '@/utils/date';

import { findEntity, matchesQuery, mergeEntities, replaceEntities, withoutEntity } from './entityHelpers';

interface StaffData {
  staff: Staff[];
}

interface StaffActions {
  setStaff: (staff: readonly Staff[]) => void;
  mergeStaff: (staff: readonly Staff[]) => void;
  removeStaff: (id: ID) => void;
  getStaffById: (id: ID) => Staff | undefined;
  reset: () => void;
}

export type StaffState = StaffData & StaffActions;

/** Cache of staff members loaded from the server. */
export const useStaffStore = create<StaffState>()((set, get) => ({
  staff: [],

  setStaff: (list) => {
    const next = replaceEntities(get().staff, list);
    if (next) set({ staff: next });
  },
  mergeStaff: (list) => {
    const next = mergeEntities(get().staff, list);
    if (next) set({ staff: next });
  },
  removeStaff: (id) => {
    const next = withoutEntity(get().staff, id);
    if (next) set({ staff: next });
  },
  getStaffById: (id) => findEntity(get().staff, id),
  reset: () => set({ staff: [] }),
}));

// ---------- Selectors ----------

export const selectActiveStaff = (staff: readonly Staff[]): Staff[] =>
  staff.filter((member) => member.isActive).sort((a, b) => a.name.localeCompare(b.name));

export const selectFilteredStaff = (staff: readonly Staff[], query: string): Staff[] =>
  staff
    .filter((member) => matchesQuery(query, member.name, member.phone, member.email))
    .sort((a, b) => a.name.localeCompare(b.name));

export const selectWorkingHoursOn = (member: Staff, date: ISODate): WorkingHours | undefined => {
  const day = weekdayOf(date);
  return member.workingHours.find((hours) => hours.day === day);
};

export const selectIsStaffWorkingOn = (member: Staff, date: ISODate): boolean => {
  const hours = selectWorkingHoursOn(member, date);
  return member.isActive && hours !== undefined && !hours.isOff;
};
