import { useEffect, useState } from 'react';

import { loadSessionData, watchSession } from '@/services/sync';
import { useAuthStore } from '@/store/authStore';

/** Don't hold the splash longer than this; screens show their own loading states after. */
const MAX_WAIT_MS = 8_000;

/**
 * When the app opens with a saved session, loads that account's data from the server
 * before the first screen is shown. Returns true once loaded, failed, or timed out.
 */
export const useSessionBootstrap = (hydrated: boolean): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    watchSession();
  }, []);

  useEffect(() => {
    if (!hydrated || ready) return undefined;
    let cancelled = false;
    const load = async (): Promise<void> => {
      const { user, token } = useAuthStore.getState();
      if (user && token) {
        const timeout = new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS));
        await Promise.race([loadSessionData(user).catch(() => undefined), timeout]);
      }
      if (!cancelled) setReady(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrated, ready]);

  return ready;
};
