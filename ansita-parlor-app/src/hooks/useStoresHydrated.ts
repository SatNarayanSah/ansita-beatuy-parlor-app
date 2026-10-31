import { useEffect, useState } from 'react';

import { areStoresHydrated, hydratableStores } from '@/store';

/** True once every persisted store has finished loading from AsyncStorage. */
export const useStoresHydrated = (): boolean => {
  const [hydrated, setHydrated] = useState(areStoresHydrated);

  useEffect(() => {
    if (hydrated) return undefined;
    const check = (): void => {
      if (areStoresHydrated()) setHydrated(true);
    };
    const unsubscribers = hydratableStores.map((store) => store.persist.onFinishHydration(check));
    // A store may have finished between the initial render and this effect.
    check();
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [hydrated]);

  return hydrated;
};
