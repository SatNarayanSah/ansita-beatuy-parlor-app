import { useCallback, type ReactElement, type ReactNode } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import type { ServiceQueryState } from '@/hooks/useServiceQuery';
import { overlayClearance, useTheme } from '@/theme';

import { Appear } from './Appear';
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { StaleDataBanner } from './QueryState';
import { MAX_CONTENT_WIDTH } from './Screen';

export interface ListScreenProps<T> {
  /** Drives skeleton, error and pull-to-refresh. */
  query: Pick<ServiceQueryState<unknown>, 'loading' | 'error' | 'refreshing' | 'refetch'> & { data: unknown };
  /** Items to show once loaded (already filtered/sorted). */
  items: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactElement;
  /** Filters, search, segmented controls: scrolls with the list. */
  header?: ReactNode;
  skeleton: ReactNode;
  empty: EmptyStateProps;
  /** FAB or sticky footer. */
  overlay?: ReactNode;
  edges?: readonly Edge[];
  /** Fixed row height (row + gap) enables getItemLayout for instant scroll jumps. */
  itemHeight?: number;
}

/**
 * Virtualised counterpart of Screen + QueryState for long lists: skeleton
 * while loading, error with retry, empty state, pull-to-refresh, staggered
 * row entry and the tablet width cap.
 */
export const ListScreen = <T,>({ query, items, keyExtractor, renderItem, header, skeleton, empty, overlay, edges = ['left', 'right'], itemHeight }: ListScreenProps<T>) => {
  const { colors, spacing } = useTheme();
  const loaded = query.data !== undefined;
  const failed = !loaded && query.error !== null && !query.loading;

  const render = useCallback<ListRenderItem<T>>(({ item, index }) => <Appear index={index}>{renderItem(item, index)}</Appear>, [renderItem]);

  const listHeader = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
      {header}
      {loaded && query.error ? <StaleDataBanner message={query.error} onRetry={() => void query.refetch()} /> : null}
      {!loaded && !failed ? skeleton : null}
      {failed ? (
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title="Couldn’t load this"
          message={query.error ?? undefined}
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={loaded ? items : []}
        keyExtractor={keyExtractor}
        renderItem={render}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={loaded ? <EmptyState {...empty} /> : undefined}
        ItemSeparatorComponent={Separator}
        getItemLayout={itemHeight ? (_, index) => ({ length: itemHeight, offset: itemHeight * index, index }) : undefined}
        contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: overlay ? overlayClearance : spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl refreshing={query.refreshing} onRefresh={() => void query.refetch()} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
      {overlay}
    </SafeAreaView>
  );
};

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  separator: { height: 8 },
});
