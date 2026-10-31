import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Badge, FAB, FilterChips, QueryState, Screen, SearchBar, SegmentedControl, SkeletonListItem, Text, type FilterOption, type SegmentOption } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { AdminTabScreenProps } from '@/navigation/types';
import { appointmentService, customerService } from '@/services';
import { useAppointmentStore, useCustomerStore } from '@/store';
import { useTheme, type Tone } from '@/theme';
import type { CustomerTag, ID, ISODate } from '@/types';
import { formatRelativeDay } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';
import { formatPhone } from '@/utils/phone';

type Props = AdminTabScreenProps<'Customers'>;
type SortKey = 'name' | 'recent' | 'spend';

export const TAG_TONES: Record<CustomerTag, Tone> = {
  vip: 'highlight',
  regular: 'primary',
  new: 'info',
  bridal: 'accent',
  student: 'success',
  inactive: 'neutral',
};

const TAG_OPTIONS: readonly FilterOption<CustomerTag>[] = (Object.keys(TAG_TONES) as CustomerTag[]).map((tag) => ({
  value: tag,
  label: tag === 'vip' ? 'VIP' : formatEnumLabel(tag),
}));

const SORT_OPTIONS: readonly SegmentOption<SortKey>[] = [
  { value: 'name', label: 'A–Z' },
  { value: 'recent', label: 'Last visit' },
  { value: 'spend', label: 'Top spend' },
];

export const CustomersScreen = ({ navigation }: Props) => {
  const { colors, radius, spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<CustomerTag | null>(null);
  const [sort, setSort] = useState<SortKey>('name');

  const query = useServiceQuery(
    async () => {
      const [customers, completed, all] = await Promise.all([
        customerService.listCustomers(),
        appointmentService.listAppointments({ status: 'completed' }),
        appointmentService.listAppointments(),
      ]);
      const stats = new Map<ID, { lastVisit: ISODate | null; spend: number }>();
      completed.forEach((a) => {
        const current = stats.get(a.customerId) ?? { lastVisit: null, spend: 0 };
        stats.set(a.customerId, { ...current, lastVisit: !current.lastVisit || a.date > current.lastVisit ? a.date : current.lastVisit });
      });
      all.forEach((a) => {
        const current = stats.get(a.customerId) ?? { lastVisit: null, spend: 0 };
        stats.set(a.customerId, { ...current, spend: current.spend + a.amountPaid });
      });
      return { customers, stats };
    },
    [],
    { refetchOn: [useCustomerStore, useAppointmentStore] },
  );

  const rows = useMemo(() => {
    if (!query.data) return [];
    const needle = search.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    const filtered = query.data.customers.filter(
      (c) =>
        (tag ? c.tags.includes(tag) : true) &&
        (!needle || c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle) || (digits.length > 2 && c.phone.includes(digits))),
    );
    const stat = (id: ID) => query.data?.stats.get(id) ?? { lastVisit: null, spend: 0 };
    return [...filtered].sort((a, b) => {
      if (sort === 'recent') return (stat(b.id).lastVisit ?? '').localeCompare(stat(a.id).lastVisit ?? '');
      if (sort === 'spend') return stat(b.id).spend - stat(a.id).spend;
      return a.name.localeCompare(b.name);
    });
  }, [query.data, search, tag, sort]);

  return (
    <Screen
      refreshing={query.refreshing}
      onRefresh={() => void query.refetch()}
      overlay={<FAB icon="person-add" accessibilityLabel="Add customer" onPress={() => navigation.navigate('CustomerForm')} />}
    >
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, phone or email" />
      <FilterChips options={TAG_OPTIONS} value={tag} onChange={setTag} allLabel="All" />
      <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} />

      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.sm }}>
            {Array.from({ length: 7 }, (_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </View>
        }
        isEmpty={() => rows.length === 0}
        empty={{
          icon: 'people-outline',
          title: search || tag ? 'No matching customers' : 'No customers yet',
          message: search || tag ? 'Try another search or filter.' : 'Add your first customer to start tracking visits.',
          actionLabel: 'Add customer',
          onAction: () => navigation.navigate('CustomerForm'),
        }}
      >
        {(data) => (
          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" tone="muted">
              {rows.length} customers
            </Text>
            {rows.map((customer) => {
              const stat = data.stats.get(customer.id);
              return (
                <Pressable
                  key={customer.id}
                  onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
                  accessibilityRole="button"
                  accessibilityLabel={customer.name}
                  style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }, pressed && styles.pressed]}
                >
                  <Avatar name={customer.name} uri={customer.avatar} size="md" />
                  <View style={styles.body}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {customer.name}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {formatPhone(customer.phone)}
                    </Text>
                    <View style={styles.tags}>
                      {customer.tags.slice(0, 3).map((t) => (
                        <Badge key={t} label={t === 'vip' ? 'VIP' : formatEnumLabel(t)} tone={TAG_TONES[t]} size="sm" />
                      ))}
                    </View>
                  </View>
                  <View style={styles.right}>
                    <Text variant="label">{formatCurrency(stat?.spend ?? 0)}</Text>
                    <Text variant="caption" tone="muted">
                      {stat?.lastVisit ? formatRelativeDay(stat.lastVisit) : 'No visits'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
});
