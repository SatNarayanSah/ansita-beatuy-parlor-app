import { ACTIVE_APPOINTMENT_STATUSES, useAppointmentStore } from '@/store/appointmentStore';
import { useBusinessStore } from '@/store/businessStore';
import type { AdminAlerts, BusinessProfile, BusinessSettings, Holiday, LoyaltyRules } from '@/types';
import { isValidISODate, isValidTime, timeToMinutes, todayISO } from '@/utils/date';
import { normalizePhone } from '@/utils/phone';

import { ApiError, simulateRequest } from './client';
import { requireAdmin, requireUser } from './session';

const snapshot = (): BusinessSettings => {
  const { profile, holidays, loyalty, alerts } = useBusinessStore.getState();
  return { profile, holidays, loyalty, alerts };
};

/** Parlour profile, holidays, loyalty rules and admin alerts. Reading is open to any signed-in user. */
export const businessService = {
  getSettings: (): Promise<BusinessSettings> =>
    simulateRequest(() => {
      requireUser();
      return snapshot();
    }),

  updateProfile: (input: Partial<BusinessProfile>): Promise<BusinessSettings> =>
    simulateRequest(() => {
      requireAdmin();
      const merged = { ...useBusinessStore.getState().profile, ...input };
      if (merged.name.trim().length < 2) throw new ApiError('VALIDATION', 'Enter the business name.');
      if (!isValidTime(merged.openTime) || !isValidTime(merged.closeTime)) throw new ApiError('VALIDATION', 'Enter valid opening hours.');
      if (timeToMinutes(merged.closeTime) <= timeToMinutes(merged.openTime)) {
        throw new ApiError('VALIDATION', 'Closing time must be after opening time.');
      }
      useBusinessStore.getState().updateProfile({
        ...input,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: normalizePhone(input.whatsapp) } : {}),
      });
      return snapshot();
    }),

  /** Closing a day that already has bookings is refused, so no customer is silently stranded. */
  addHoliday: ({ date, name }: Holiday): Promise<BusinessSettings> =>
    simulateRequest(() => {
      requireAdmin();
      if (!isValidISODate(date)) throw new ApiError('VALIDATION', 'Choose a valid date.');
      if (date < todayISO()) throw new ApiError('VALIDATION', 'Holidays must be today or later.');
      if (name.trim().length < 2) throw new ApiError('VALIDATION', 'Give the holiday a name.');
      const { holidays, setHolidays } = useBusinessStore.getState();
      if (holidays.some((holiday) => holiday.date === date)) throw new ApiError('CONFLICT', 'That day is already a holiday.');
      const booked = useAppointmentStore
        .getState()
        .appointments.filter((a) => a.date === date && ACTIVE_APPOINTMENT_STATUSES.includes(a.status)).length;
      if (booked > 0) {
        throw new ApiError('CONFLICT', `${booked} booking${booked === 1 ? ' is' : 's are'} on that day. Reschedule or cancel ${booked === 1 ? 'it' : 'them'} first.`);
      }
      setHolidays([...holidays, { date, name: name.trim() }]);
      return snapshot();
    }),

  removeHoliday: (date: string): Promise<BusinessSettings> =>
    simulateRequest(() => {
      requireAdmin();
      const { holidays, setHolidays } = useBusinessStore.getState();
      setHolidays(holidays.filter((holiday) => holiday.date !== date));
      return snapshot();
    }),

  updateLoyalty: (input: Partial<LoyaltyRules>): Promise<BusinessSettings> =>
    simulateRequest(() => {
      requireAdmin();
      if (input.rupeesPerPoint !== undefined && (!Number.isInteger(input.rupeesPerPoint) || input.rupeesPerPoint < 1 || input.rupeesPerPoint > 10000)) {
        throw new ApiError('VALIDATION', 'Spend per point must be between Rs. 1 and Rs. 10,000.');
      }
      if (input.pointValue !== undefined && (input.pointValue <= 0 || input.pointValue > 100)) {
        throw new ApiError('VALIDATION', 'Point value must be between Rs. 0.01 and Rs. 100.');
      }
      useBusinessStore.getState().updateLoyalty(input);
      return snapshot();
    }),

  updateAlerts: (input: Partial<AdminAlerts>): Promise<BusinessSettings> =>
    simulateRequest(
      () => {
        requireAdmin();
        useBusinessStore.getState().updateAlerts(input);
        return snapshot();
      },
      { neverFail: true },
    ),
};
