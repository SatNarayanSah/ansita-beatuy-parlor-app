import { useEffect } from 'react';
import { AppState } from 'react-native';

import { refreshLiveData } from '@/services/sync';

/** How often bookings and notifications are re-fetched while the app is open. */
const POLL_INTERVAL_MS = 60_000;

/**
 * Keeps data made on other devices flowing in (a customer's booking appears on the
 * admin's phone, a confirmation on the customer's): refreshes every minute while the
 * app is in the foreground, and immediately when it comes back to the foreground.
 */
export const useLiveSync = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return undefined;
    const refresh = (): void => {
      if (AppState.currentState === 'active') refreshLiveData().catch(() => undefined);
    };
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [enabled]);
};
