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
  /** True during the first load (no data yet). */
  loading: boolean;
  /** True during a pull-to-refresh / manual refetch while data is shown. */
  refreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Loads data from a service when mounted and whenever `deps` change.
 * Stale responses from earlier calls are ignored.
 */
export const useServiceQuery = <T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  { refetchOn = [] }: ServiceQueryOptions = {},
): ServiceQueryState<T> => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent'): Promise<void> => {
    const id = ++requestId.current;
    if (mode === 'initial') setLoading(true);
    else if (mode === 'refresh') setRefreshing(true);
    if (mode !== 'silent') setError(null);
    try {
      const result = await fetcherRef.current();
      if (id === requestId.current) setData(result);
    } catch (caught) {
      if (id === requestId.current) setError(getErrorMessage(caught));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load('initial');
    return () => {
      // Invalidate in-flight requests on unmount or dependency change.
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Store subscriptions are set up once; the store list is expected to be static.
  useEffect(() => {
    const unsubscribers = refetchOn.map((store) => store.subscribe(() => void load('silent')));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(() => load('refresh'), [load]);

  return { data, loading, refreshing, error, refetch };
};
