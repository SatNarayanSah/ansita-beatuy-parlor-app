import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ServiceQueryState } from '@/hooks/useServiceQuery';
import { useTheme } from '@/theme';

import { EmptyState, type EmptyStateProps } from './EmptyState';
import { Icon } from './Icon';
import { Text } from './Text';

export interface QueryStateProps<T> {
  query: Pick<ServiceQueryState<T>, 'data' | 'loading' | 'error' | 'refetch'>;
  /** Rendered during the first load. */
  skeleton: ReactNode;
  /** When true for the loaded data, `empty` is shown instead of `children`. */
  isEmpty?: (data: T) => boolean;
  empty?: EmptyStateProps;
  children: (data: T) => ReactNode;
}

/** Shown above content when a refresh failed but earlier data is still on screen. */
export const StaleDataBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }]}
    >
      <Icon name="cloud-offline-outline" size={18} color={colors.warning} />
      <View style={styles.flex}>
        <Text variant="label" tone="warning">
          Couldn’t refresh
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {message} Showing the last saved data.
        </Text>
      </View>
      <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry" hitSlop={10}>
        <Text variant="label" tone="primary">
          Retry
        </Text>
      </Pressable>
    </View>
  );
};

/**
 * The states of a loaded list: skeleton, error with retry, empty, content,
 * and content with a "couldn't refresh" banner when a reload failed.
 * Pair with Screen's `refreshing` / `onRefresh` for pull-to-refresh.
 */
export const QueryState = <T,>({ query, skeleton, isEmpty, empty, children }: QueryStateProps<T>) => {
  if (query.data === undefined) {
    if (query.error && !query.loading) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title="Couldn’t load this"
          message={query.error}
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      );
    }
    return <>{skeleton}</>;
  }
  const content = empty && isEmpty?.(query.data) ? <EmptyState {...empty} /> : children(query.data);
  if (!query.error) return <>{content}</>;
  return (
    <>
      <StaleDataBanner message={query.error} onRetry={() => void query.refetch()} />
      {content}
    </>
  );
};

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
