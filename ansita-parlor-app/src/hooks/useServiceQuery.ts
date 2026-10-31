import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

import { getErrorMessage } from '@/services/client';

/** Anything with a zustand-style `subscribe`. */
interface Subscribable {
  subscribe: (listener: () => void) => () => void;
}

export interface ServiceQueryOptions {
  /**
   * Stores whose changes should trigger a silent refetch (no loading flags),
   * so lists stay current after a mutation made anywhere in the app.
   */
  refetchOn?: readonly Subscribable[];
}

export interface ServiceQueryState<T> {
  data: T | undefined;
  /** True while the current dependencies have not loaded yet. */
  loading: boolean;
  /** True during a pull-to-refresh / manual refetch while data is shown. */
  refreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Loads data from a service when mounted and whenever `deps` change.
 * Stale responses from earlier calls are ignored.
 *
 * `loading` is derived (the request for the current deps hasn't settled)
 * rather than set inside the effect, so no state is updated synchronously
 * during an effect.
 */
export const useServiceQuery = <T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  { refetchOn = [] }: ServiceQueryOptions = {},
): ServiceQueryState<T> => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Identifies the deps; deps are ids, dates and flags in this app, so JSON is a faithful key.
  const depsKey = JSON.stringify(deps);
  const [settledKey, setSettledKey] = useState<string | null>(null);

  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  // Keep the latest fetcher for callbacks; declared before the load effect so it runs first.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const load = useCallback(async (key: string, mode: 'initial' | 'refresh' | 'silent'): Promise<void> => {
    const id = ++requestId.current;
    try {
      const result = await fetcherRef.current();
      if (id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (caught) {
      if (id !== requestId.current) return;
      // A failed silent refresh keeps showing the last good data.
      if (mode !== 'silent') setError(getErrorMessage(caught));
    } finally {
      if (id === requestId.current) {
        setSettledKey(key);
        if (mode === 'refresh') setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(depsKey, 'initial');
    return () => {
      // Invalidate in-flight requests on unmount or dependency change.
      requestId.current += 1;
    };
  }, [depsKey, load]);

  // Store subscriptions are set up once; the store list is expected to be static.
  const depsKeyRef = useRef(depsKey);
  useEffect(() => {
    depsKeyRef.current = depsKey;
  }, [depsKey]);
  useEffect(() => {
    const unsubscribers = refetchOn.map((store) => store.subscribe(() => void load(depsKeyRef.current, 'silent')));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(() => {
    setRefreshing(true);
    return load(depsKeyRef.current, 'refresh');
  }, [load]);

  return { data, loading: settledKey !== depsKey, refreshing, error: settledKey === depsKey ? error : null, refetch };
};
