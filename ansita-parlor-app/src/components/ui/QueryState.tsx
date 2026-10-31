import type { ReactNode } from 'react';

import type { ServiceQueryState } from '@/hooks/useServiceQuery';

import { EmptyState, type EmptyStateProps } from './EmptyState';

export interface QueryStateProps<T> {
  query: Pick<ServiceQueryState<T>, 'data' | 'loading' | 'error' | 'refetch'>;
  /** Rendered during the first load. */
  skeleton: ReactNode;
  /** When true for the loaded data, `empty` is shown instead of `children`. */
  isEmpty?: (data: T) => boolean;
  empty?: EmptyStateProps;
  children: (data: T) => ReactNode;
}

/**
 * The four states of a loaded list: skeleton, error with retry, empty, content.
 * Pair with Screen's `refreshing` / `onRefresh` for pull-to-refresh.
 */
export const QueryState = <T,>({ query, skeleton, isEmpty, empty, children }: QueryStateProps<T>) => {
  if (query.loading && query.data === undefined) return <>{skeleton}</>;
  if (query.error && query.data === undefined) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        tone="danger"
        title="Couldn't load this"
        message={query.error}
        actionLabel="Try again"
        onAction={() => void query.refetch()}
      />
    );
  }
  if (query.data === undefined) return <>{skeleton}</>;
  if (empty && isEmpty?.(query.data)) return <EmptyState {...empty} />;
  return <>{children(query.data)}</>;
};
