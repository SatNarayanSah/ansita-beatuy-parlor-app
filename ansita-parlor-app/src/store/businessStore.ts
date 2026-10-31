import { create } from 'zustand';

import type { AdminAlerts, BusinessSettings, Holiday, ISODate, LoyaltyRules, NotificationType } from '@/types';

interface BusinessData extends BusinessSettings {
  /** False until the settings have been loaded from the server once. */
  loaded: boolean;
}

interface BusinessActions {
  setSettings: (settings: BusinessSettings) => void;
  reset: () => void;
}

export type BusinessState = BusinessData & BusinessActions;

/** Neutral placeholders shown only until the real settings arrive from the server. */
const emptySettings = (): BusinessData => ({
  profile: { name: '', tagline: '', phone: '', whatsapp: '', email: '', address: '', openTime: '10:00', closeTime: '19:00' },
  holidays: [],
  loyalty: { enabled: false, rupeesPerPoint: 100, pointValue: 1 },
  alerts: { newBookings: true, cancellations: true, payments: true, enrollments: true },
  loaded: false,
});

/** Cache of the parlour-wide settings (profile, holidays, loyalty rules, admin alerts). */
export const useBusinessStore = create<BusinessState>()((set, get) => ({
  ...emptySettings(),
  setSettings: ({ profile, holidays, loyalty, alerts }) => {
    const current = get();
    const unchanged =
      current.loaded &&
      JSON.stringify({ profile: current.profile, holidays: current.holidays, loyalty: current.loyalty, alerts: current.alerts }) ===
        JSON.stringify({ profile, holidays, loyalty, alerts });
    if (!unchanged) set({ profile, holidays, loyalty, alerts, loaded: true });
  },
  reset: () => set(emptySettings()),
}));

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
