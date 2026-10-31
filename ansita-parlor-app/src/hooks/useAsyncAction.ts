import { useCallback, useEffect, useRef, useState } from 'react';

import { getErrorMessage } from '@/services/client';

export interface AsyncActionState<TArgs extends unknown[], TResult> {
  /** Runs the action. Resolves to the result, or `undefined` if it failed. */
  run: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: string | null;
  data: TResult | undefined;
  reset: () => void;
}

/**
 * Wraps a service call (mutation) with loading / error state.
 * Errors are captured into `error` instead of being thrown.
 */
export const useAsyncAction = <TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): AsyncActionState<TArgs, TResult> => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TResult | undefined>(undefined);
  const mounted = useRef(true);
  const actionRef = useRef(action);

  // Refs are updated after render, never during it.
  useEffect(() => {
    actionRef.current = action;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const result = await actionRef.current(...args);
      if (mounted.current) setData(result);
      return result;
    } catch (caught) {
      if (mounted.current) setError(getErrorMessage(caught));
      return undefined;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setData(undefined);
  }, []);

  return { run, loading, error, data, reset };
};
