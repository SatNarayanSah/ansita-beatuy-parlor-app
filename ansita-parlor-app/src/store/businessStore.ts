import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildBusinessSettings } from '@/data/business';
import type { AdminAlerts, BusinessProfile, BusinessSettings, Holiday, ISODate, LoyaltyRules, NotificationType } from '@/types';

import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface BusinessActions {
  updateProfile: (patch: Partial<BusinessProfile>) => void;
  setHolidays: (holidays: Holiday[]) => void;
  updateLoyalty: (patch: Partial<LoyaltyRules>) => void;
  updateAlerts: (patch: Partial<AdminAlerts>) => void;
  reset: () => void;
}

export type BusinessState = BusinessSettings & BusinessActions;

/** Parlour-wide settings. Part of the demo data, so "Reset demo data" restores them. */
export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      ...buildBusinessSettings(),
      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
      setHolidays: (holidays) => set({ holidays: [...holidays].sort((a, b) => a.date.localeCompare(b.date)) }),
      updateLoyalty: (patch) => set((state) => ({ loyalty: { ...state.loyalty, ...patch } })),
      updateAlerts: (patch) => set((state) => ({ alerts: { ...state.alerts, ...patch } })),
      reset: () => set(buildBusinessSettings()),
    }),
    {
      name: STORAGE_KEYS.business,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(buildBusinessSettings()),
      partialize: ({ profile, holidays, loyalty, alerts }): BusinessSettings => ({ profile, holidays, loyalty, alerts }),
    },
  ),
);

// ---------- Selectors ----------

export const selectHolidayOn = (holidays: readonly Holiday[], date: ISODate): Holiday | undefined =>
  holidays.find((holiday) => holiday.date === date);

/** Points earned for a completed visit under the current rules. */
export const selectPointsFor = (loyalty: LoyaltyRules, amount: number): number =>
  loyalty.enabled ? Math.floor(amount / Math.max(1, loyalty.rupeesPerPoint)) : 0;

/** Admin alert switch governing a notification type; untoggled types always send. */
export const selectAlertEnabled = (alerts: AdminAlerts, type: NotificationType): boolean => {
  switch (type) {
    case 'appointment_booked':
      return alerts.newBookings;
    case 'appointment_cancelled':
      return alerts.cancellations;
    case 'payment':
      return alerts.payments;
    case 'enrollment':
      return alerts.enrollments;
    default:
      return true;
  }
};
