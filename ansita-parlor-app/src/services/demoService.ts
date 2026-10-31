import { resetAllStores } from '@/store';

import { simulateRequest } from './client';

export interface ResetDemoOptions {
  /** Stay signed in after the reset (default true, as when resetting from Settings). */
  keepSession?: boolean;
}

/** Demo-only maintenance actions. A real backend would not expose these. */
export const demoService = {
  /**
   * Discards every change and restores fresh seed data, with dates re-anchored
   * to today. Device settings such as the theme are kept.
   */
  resetDemoData: ({ keepSession = true }: ResetDemoOptions = {}): Promise<void> =>
    simulateRequest(() => resetAllStores({ keepSession }), { neverFail: true }),
};
