import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildStaff } from '@/data/staff';
import type { ID, ISODate, Staff, UpdateInput, WorkingHours } from '@/types';
import { weekdayOf } from '@/utils/date';

import { findEntity, insertEntity, matchesQuery, removeEntity, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface StaffData {
  staff: Staff[];
}

interface StaffActions {
  addStaff: (member: Staff) => void;
  updateStaff: (id: ID, patch: UpdateInput<Staff>) => void;
  deleteStaff: (id: ID) => void;
  getStaffById: (id: ID) => Staff | undefined;
  reset: () => void;
}

export type StaffState = StaffData & StaffActions;

const createInitialData = (): StaffData => ({ staff: buildStaff() });

export const useStaffStore = create<StaffState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addStaff: (member) => set((state) => ({ staff: insertEntity(state.staff, member) })),
      updateStaff: (id, patch) => set((state) => ({ staff: updateEntity(state.staff, id, patch) })),
      deleteStaff: (id) => set((state) => ({ staff: removeEntity(state.staff, id) })),
      getStaffById: (id) => findEntity(get().staff, id),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.staff,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ staff }): StaffData => ({ staff }),
    },
  ),
);

// ---------- Selectors ----------

export const selectActiveStaff = (staff: readonly Staff[]): Staff[] =>
  staff.filter((member) => member.isActive).sort((a, b) => a.name.localeCompare(b.name));

export const selectFilteredStaff = (staff: readonly Staff[], query: string): Staff[] =>
  staff
    .filter((member) => matchesQuery(query, member.name, member.phone, member.email))
    .sort((a, b) => a.name.localeCompare(b.name));

/** Active staff qualified for every given category. */
export const selectStaffForCategories = (staff: readonly Staff[], categoryIds: readonly ID[]): Staff[] =>
  selectActiveStaff(staff).filter((member) =>
    categoryIds.every((categoryId) => member.specialties.includes(categoryId)),
  );

export const selectWorkingHoursOn = (member: Staff, date: ISODate): WorkingHours | undefined => {
  const day = weekdayOf(date);
  return member.workingHours.find((hours) => hours.day === day);
};

export const selectIsStaffWorkingOn = (member: Staff, date: ISODate): boolean => {
  const hours = selectWorkingHoursOn(member, date);
  return member.isActive && hours !== undefined && !hours.isOff;
};
