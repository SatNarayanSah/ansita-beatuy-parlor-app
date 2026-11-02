import { create } from 'zustand';

import type {
  AdminAlerts,
  Appointment,
  BusinessSettings,
  Holiday,
  ISODate,
  LoyaltyRules,
  NotificationType,
  OnlinePaymentMethod,
  PaymentAccount,
  PaymentSettings,
} from '@/types';

interface BusinessData extends BusinessSettings {
  /** False until the settings have been loaded from the server once. */
  loaded: boolean;
}

interface BusinessActions {
  setSettings: (settings: BusinessSettings) => void;
  reset: () => void;
}

export type BusinessState = BusinessData & BusinessActions;

const emptyAccount = (): PaymentAccount => ({ enabled: false, accountName: '', accountNumber: '', bankName: '', qr: null, instructions: '' });

/** Order the online methods are listed in. */
export const ONLINE_PAYMENT_METHODS: readonly OnlinePaymentMethod[] = ['esewa', 'khalti', 'fonepay', 'bank'];

/** Neutral placeholders shown only until the real settings arrive from the server. */
const emptySettings = (): BusinessData => ({
  profile: { name: '', tagline: '', phone: '', whatsapp: '', email: '', address: '', openTime: '10:00', closeTime: '19:00' },
  holidays: [],
  loyalty: { enabled: false, rupeesPerPoint: 100, pointValue: 1, minRedeemPoints: 500 },
  alerts: { newBookings: true, cancellations: true, payments: true, enrollments: true },
  payments: { requests: false, esewa: emptyAccount(), khalti: emptyAccount(), fonepay: emptyAccount(), bank: emptyAccount() },
  loaded: false,
});

/** Cache of the parlour-wide settings (profile, holidays, loyalty rules, admin alerts). */
export const useBusinessStore = create<BusinessState>()((set, get) => ({
  ...emptySettings(),
  setSettings: ({ profile, holidays, loyalty, alerts, payments }) => {
    const current = get();
    // Older servers don't send payment settings; keep online payments off for them.
    const nextPayments = payments ?? emptySettings().payments;
    const unchanged =
      current.loaded &&
      JSON.stringify({ profile: current.profile, holidays: current.holidays, loyalty: current.loyalty, alerts: current.alerts, payments: current.payments }) ===
        JSON.stringify({ profile, holidays, loyalty, alerts, payments: nextPayments });
    if (!unchanged) set({ profile, holidays, loyalty, alerts, payments: nextPayments, loaded: true });
  },
  reset: () => set(emptySettings()),
}));

// ---------- Selectors ----------

export const selectHolidayOn = (holidays: readonly Holiday[], date: ISODate): Holiday | undefined =>
  holidays.find((holiday) => holiday.date === date);

/** Points earned for a completed visit under the current rules. */
export const selectPointsFor = (loyalty: LoyaltyRules, amount: number): number =>
  loyalty.enabled ? Math.floor(amount / Math.max(1, loyalty.rupeesPerPoint)) : 0;

/** NPR off the bill for `points`, in whole rupees (the server rounds the same way). */
export const selectPointsWorth = (loyalty: LoyaltyRules, points: number): number => Math.floor(points * loyalty.pointValue);

/** Balance still to pay: the total less money received and any loyalty discount. */
export const selectAmountDue = (appointment: Pick<Appointment, 'totalPrice' | 'amountPaid' | 'pointsDiscount'>): number =>
  Math.max(0, appointment.totalPrice - appointment.amountPaid - (appointment.pointsDiscount ?? 0));

/**
 * Methods customers can pay by and then send "I've paid" for; empty while requests are off.
 * Until the parlour sets up any account, all are offered (same rule as the server).
 */
export const selectOnlineMethods = (payments: PaymentSettings): OnlinePaymentMethod[] => {
  if (!payments.requests) return [];
  const enabled = ONLINE_PAYMENT_METHODS.filter((method) => payments[method].enabled);
  return enabled.length > 0 ? enabled : [...ONLINE_PAYMENT_METHODS];
};

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
