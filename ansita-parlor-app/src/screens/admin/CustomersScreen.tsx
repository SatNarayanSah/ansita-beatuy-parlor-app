import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Badge,
  FAB,
  FilterChips,
  ListScreen,
  SearchBar,
  SegmentedControl,
  SkeletonListItem,
  Text,
  type FilterOption,
  type SegmentOption,
} from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { AdminTabScreenProps } from '@/navigation/types';
import { appointmentService, customerService } from '@/services';
import { useAppointmentStore, useCustomerStore } from '@/store';
import { useTheme, type Tone } from '@/theme';
import type { Customer, CustomerTag, ID, ISODate } from '@/types';
import { formatRelativeDay } from '@/utils/date';
import { formatCurrency, formatEnumLabel } from '@/utils/format';
import { sameDataProps } from '@/utils/memo';
import { formatPhone } from '@/utils/phone';

type Props = AdminTabScreenProps<'Customers'>;
type SortKey = 'name' | 'recent' | 'spend';

interface CustomerStat {
  lastVisit: ISODate | null;
  spend: number;
}

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

const NO_STAT: CustomerStat = { lastVisit: null, spend: 0 };

interface CustomerRowProps {
  customer: Customer;
  stat: CustomerStat;
  onPress: (customer: Customer) => void;
}

const CustomerRow = memo(({ customer, stat, onPress }: CustomerRowProps) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={() => onPress(customer)}
      accessibilityRole="button"
      accessibilityLabel={`${customer.name}, ${stat.lastVisit ? `last visit ${formatRelativeDay(stat.lastVisit)}` : 'no visits'}`}
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
        <Text variant="label">{formatCurrency(stat.spend)}</Text>
        <Text variant="caption" tone="muted">
          {stat.lastVisit ? formatRelativeDay(stat.lastVisit) : 'No visits'}
        </Text>
      </View>
    </Pressable>
  );
}, sameDataProps);
CustomerRow.displayName = 'CustomerRow';

/** Searchable, filterable CRM list. Virtualised: the book can grow to thousands. */
export const CustomersScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<CustomerTag | null>(null);
  const [sort, setSort] = useState<SortKey>('name');

  const query = useServiceQuery(
    async () => {
      const [customers, all] = await Promise.all([customerService.listCustomers(), appointmentService.listAppointments()]);
      const stats = new Map<ID, CustomerStat>();
      all.forEach((a) => {
        const current = stats.get(a.customerId) ?? { lastVisit: null, spend: 0 };
        const lastVisit = a.status === 'completed' && (!current.lastVisit || a.date > current.lastVisit) ? a.date : current.lastVisit;
        stats.set(a.customerId, { lastVisit, spend: current.spend + a.amountPaid });
      });
      return { customers, stats };
    },
    [],
    { refetchOn: [useCustomerStore, useAppointmentStore] },
  );

  const rows = useMemo(() => {
    if (!query.data) return [];
    const { stats } = query.data;
    const needle = search.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    const stat = (id: ID) => stats.get(id) ?? NO_STAT;
    return query.data.customers
      .filter(
        (c) =>
          (tag ? c.tags.includes(tag) : true) &&
          (!needle || c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle) || (digits.length > 2 && c.phone.includes(digits))),
      )
      .sort((a, b) => {
        if (sort === 'recent') return (stat(b.id).lastVisit ?? '').localeCompare(stat(a.id).lastVisit ?? '');
        if (sort === 'spend') return stat(b.id).spend - stat(a.id).spend;
        return a.name.localeCompare(b.name);
      });
  }, [query.data, search, tag, sort]);

  const openCustomer = useCallback((customer: Customer) => navigation.navigate('CustomerDetail', { customerId: customer.id }), [navigation]);
  const renderItem = useCallback(
    (customer: Customer) => <CustomerRow customer={customer} stat={query.data?.stats.get(customer.id) ?? NO_STAT} onPress={openCustomer} />,
    [query.data, openCustomer],
  );

  return (
    <ListScreen
      query={query}
      items={rows}
      keyExtractor={(customer) => customer.id}
      renderItem={renderItem}
      header={
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, phone or email" />
          <FilterChips options={TAG_OPTIONS} value={tag} onChange={setTag} allLabel="All" />
          <SegmentedControl options={SORT_OPTIONS} value={sort} onChange={setSort} />
          {query.data ? (
            <Text variant="caption" tone="muted">
              {rows.length} customers
            </Text>
          ) : null}
        </>
      }
      skeleton={
        <View style={{ gap: spacing.sm }}>
          {Array.from({ length: 7 }, (_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
      }
      empty={{
        icon: 'people-outline',
        title: search || tag ? 'No matching customers' : 'No customers yet',
        message: search || tag ? 'Try another search or filter.' : 'Add your first customer to start tracking visits.',
        actionLabel: search || tag ? 'Clear filters' : 'Add customer',
        onAction:
          search || tag
            ? () => {
                setSearch('');
                setTag(null);
              }
            : () => navigation.navigate('CustomerForm'),
      }}
      overlay={<FAB icon="person-add" accessibilityLabel="Add customer" onPress={() => navigation.navigate('CustomerForm')} />}
    />
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
});
