import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ratingsByService, ServiceRow } from '@/components/customer/ServiceCards';
import { FAB, FilterChips, ListScreen, SearchBar, SkeletonListItem, Text, type FilterOption } from '@/components/ui';
import { isIconName } from '@/components/ui/Icon';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { CustomerTabScreenProps } from '@/navigation/types';
import { catalogService, reviewService } from '@/services';
import { useReviewStore, useServiceStore } from '@/store';
import { useTheme } from '@/theme';
import type { ID } from '@/types';

type Props = CustomerTabScreenProps<'Book'>;

/** Service catalogue: category chips, search, cards; a FAB starts a fresh booking. */
export const ServicesScreen = ({ navigation, route }: Props) => {
  const { spacing } = useTheme();
  const t = useT();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<ID | null>(route.params?.categoryId ?? null);

  useEffect(() => {
    if (route.params?.categoryId) setCategoryId(route.params.categoryId);
  }, [route.params?.categoryId]);

  const data = useServiceQuery(
    async () => {
      const [categories, services, reviews] = await Promise.all([
        catalogService.listCategories(),
        catalogService.listServices({ activeOnly: true }),
        reviewService.listReviews(),
      ]);
      return { categories, services, ratings: ratingsByService(reviews) };
    },
    [],
    { refetchOn: [useServiceStore, useReviewStore] },
  );

  const options = useMemo<FilterOption<ID>[]>(() => {
    const services = data.data?.services ?? [];
    return (data.data?.categories ?? []).map((category) => ({
      value: category.id,
      label: category.name,
      icon: isIconName(category.icon) ? category.icon : undefined,
      count: services.filter((service) => service.categoryId === category.id).length,
    }));
  }, [data.data]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data.data?.services ?? []).filter(
      (service) =>
        (categoryId ? service.categoryId === categoryId : true) &&
        (needle ? `${service.name} ${service.description}`.toLowerCase().includes(needle) : true),
    );
  }, [data.data, categoryId, query]);

  const categoryMap = useMemo(() => new Map((data.data?.categories ?? []).map((c) => [c.id, c])), [data.data]);

  return (
    <ListScreen
      query={data}
      items={visible}
      keyExtractor={(service) => service.id}
      renderItem={(service) => (
        <ServiceRow
          service={service}
          category={categoryMap.get(service.categoryId)}
          rating={data.data?.ratings.get(service.id)}
          onPress={() => navigation.navigate('ServiceDetail', { serviceId: service.id })}
        />
      )}
      header={
        <>
          <SearchBar value={query} onChangeText={setQuery} placeholder={t('services.search')} />
          <FilterChips options={options} value={categoryId} onChange={setCategoryId} allLabel={t('services.all')} />
          {data.data ? (
            <Text variant="caption" tone="muted">
              {visible.length} services
            </Text>
          ) : null}
        </>
      }
      skeleton={
        <View style={{ gap: spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
      }
      empty={{
        icon: 'search-outline',
        title: 'No services found',
        message: query ? `Nothing matches “${query}”. Try another word.` : 'No services in this category yet.',
        actionLabel: 'Clear filters',
        onAction: () => {
          setQuery('');
          setCategoryId(null);
        },
      }}
      overlay={<FAB icon="calendar" label={t('booking.title')} onPress={() => navigation.navigate('Booking')} />}
    />
  );
};
