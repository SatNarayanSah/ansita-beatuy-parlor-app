import { useMemo } from 'react';

import { appointmentService } from '@/services';
import { selectActiveStaff, selectIsStaffWorkingOn, useStaffStore } from '@/store/staffStore';
import { useServiceStore } from '@/store/serviceStore';
import { useAppointmentStore } from '@/store/appointmentStore';
import type { ID, ISODate, Staff, TimeSlot, TimeString } from '@/types';

import { useServiceQuery } from './useServiceQuery';

/** "Any available" stylist in the booking flow. */
export const ANY_STAFF = 'any';
export type StaffChoice = ID | typeof ANY_STAFF;

/** Active staff qualified for every selected service's category. Best rated first. */
export const useQualifiedStaff = (serviceIds: readonly ID[]): Staff[] => {
  const staff = useStaffStore((state) => state.staff);
  const services = useServiceStore((state) => state.services);
  return useMemo(() => {
    const categories = new Set(services.filter((service) => serviceIds.includes(service.id)).map((service) => service.categoryId));
    if (categories.size === 0) return [];
    return selectActiveStaff(staff)
      .filter((member) => [...categories].every((category) => member.specialties.includes(category)))
      .sort((a, b) => b.rating - a.rating);
  }, [staff, services, serviceIds]);
};

/** Staff the choice resolves to: one person, or everyone qualified for "Any". */
const candidatesFor = (choice: StaffChoice | null, qualified: readonly Staff[]): Staff[] =>
  choice === ANY_STAFF ? [...qualified] : qualified.filter((member) => member.id === choice);

/** Calendar predicate: true when nobody in the choice works that day. */
export const useIsDayOff = (choice: StaffChoice | null, qualified: readonly Staff[]) =>
  useMemo(() => {
    const candidates = candidatesFor(choice, qualified);
    return (date: ISODate): boolean => !candidates.some((member) => selectIsStaffWorkingOn(member, date));
  }, [choice, qualified]);

/** A free start time and who would take it. */
export interface FreeSlot extends TimeSlot {
  staffId: ID;
}

interface SlotsParams {
  date: ISODate | null;
  choice: StaffChoice | null;
  qualified: readonly Staff[];
  serviceIds: readonly ID[];
  /** When rescheduling, the booking being moved does not block its own slot. */
  excludeAppointmentId?: ID;
}

/**
 * Free start times for the selected services on a date, via the fake API.
 * For "Any available" it asks every qualified stylist and keeps the first
 * (best rated) one free at each time. Refreshes when bookings change.
 */
export const useFreeSlots = ({ date, choice, qualified, serviceIds, excludeAppointmentId }: SlotsParams) => {
  const candidateIds = candidatesFor(choice, qualified)
    .map((member) => member.id)
    .join(',');

  return useServiceQuery<FreeSlot[]>(
    async () => {
      if (!date || candidateIds === '' || serviceIds.length === 0) return [];
      const ids = candidateIds.split(',');
      const perStaff = await Promise.all(
        ids.map((staffId) =>
          appointmentService
            .getAvailableSlots({ date, staffId, serviceIds: [...serviceIds], excludeAppointmentId })
            .then((slots) => slots.filter((slot) => slot.available).map((slot) => ({ ...slot, staffId }))),
        ),
      );
      const byTime = new Map<TimeString, FreeSlot>();
      perStaff.flat().forEach((slot) => {
        if (!byTime.has(slot.time)) byTime.set(slot.time, slot);
      });
      return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
    },
    [date, candidateIds, serviceIds.join(','), excludeAppointmentId],
    { refetchOn: [useAppointmentStore] },
  );
};
