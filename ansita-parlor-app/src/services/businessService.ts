import { ONLINE_PAYMENT_METHODS, useBusinessStore } from '@/store/businessStore';
import type { AdminAlerts, BusinessProfile, BusinessSettings, Holiday, LoyaltyRules, PaymentSettingsUpdate } from '@/types';

import { api, withUploadedImage } from './client';

const cacheSettings = (settings: BusinessSettings): BusinessSettings => {
  useBusinessStore.getState().setSettings(settings);
  return settings;
};

/** Parlour profile, holidays, loyalty rules and admin alerts. Reading is open to any signed-in user. */
export const businessService = {
  getSettings: async (): Promise<BusinessSettings> => cacheSettings(await api<BusinessSettings>('GET', '/settings')),

  updateProfile: async (input: Partial<BusinessProfile>): Promise<BusinessSettings> =>
    cacheSettings(await api<BusinessSettings>('PATCH', '/settings/profile', { body: input })),

  /** Closing a day that already has bookings is refused by the server. */
  addHoliday: async (holiday: Holiday): Promise<BusinessSettings> =>
    cacheSettings(await api<BusinessSettings>('POST', '/settings/holidays', { body: holiday })),

  removeHoliday: async (date: string): Promise<BusinessSettings> =>
    cacheSettings(await api<BusinessSettings>('DELETE', `/settings/holidays/${date}`)),

  updateLoyalty: async (input: Partial<LoyaltyRules>): Promise<BusinessSettings> =>
    cacheSettings(await api<BusinessSettings>('PATCH', '/settings/loyalty', { body: input })),

  updateAlerts: async (input: Partial<AdminAlerts>): Promise<BusinessSettings> =>
    cacheSettings(await api<BusinessSettings>('PATCH', '/settings/alerts', { body: input })),

  /**
   * Online accounts customers pay into, and whether they may send "I've paid" requests.
   * A method can only be turned on once it has an account number/ID or a QR code.
   * A QR code picked on this phone is uploaded first.
   */
  updatePayments: async (input: PaymentSettingsUpdate): Promise<BusinessSettings> => {
    const body: PaymentSettingsUpdate = { ...input };
    for (const method of ONLINE_PAYMENT_METHODS) {
      const account = body[method];
      if (account) body[method] = await withUploadedImage(account, 'qr');
    }
    return cacheSettings(await api<BusinessSettings>('PATCH', '/settings/payments', { body }));
  },
};
