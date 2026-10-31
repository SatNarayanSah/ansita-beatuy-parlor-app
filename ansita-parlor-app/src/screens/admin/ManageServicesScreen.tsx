import { useState } from 'react';
import { Switch, View } from 'react-native';

import { CategoryIcon } from '@/components/customer/ServiceCards';
import { Card, Divider, FAB, ListItem, QueryState, Screen, SearchBar, SectionHeader, SegmentedControl, SkeletonListItem, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, getErrorMessage } from '@/services';
import { selectServiceCountByCategory, useServiceStore } from '@/store';
import { useTheme } from '@/theme';
import type { Service } from '@/types';
import { formatCurrency, formatDuration } from '@/utils/format';

type Props = RootStackScreenProps<'ManageServices'>;
type Tab = 'services' | 'categories';

/** Services grouped by category with inline active toggles, and category management. */
export const ManageServicesScreen = ({ navigation }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('services');
  const [search, setSearch] = useState('');

  const query = useServiceQuery(
    async () => {
      const [categories, services] = await Promise.all([catalogService.listCategories(), catalogService.listServices()]);
      return { categories, services };
    },
    [],
    { refetchOn: [useServiceStore] },
  );

  const toggle = (service: Service, isActive: boolean): void => {
    catalogService
      .setServiceActive(service.id, isActive)
      .then(() => toast.info(`${service.name} is now ${isActive ? 'bookable' : 'hidden from customers'}`))
      .catch((error: unknown) => toast.error(getErrorMessage(error)));
  };

  return (
    <Screen
      refreshing={query.refreshing}
      onRefresh={() => void query.refetch()}
      overlay={
        <FAB
          icon="add"
          label={tab === 'services' ? 'Service' : 'Category'}
          onPress={() => (tab === 'services' ? navigation.navigate('ServiceForm') : navigation.navigate('CategoryForm'))}
        />
      }
    >
      <SegmentedControl
        options={[
          { value: 'services', label: 'Services', icon: 'pricetags-outline' },
          { value: 'categories', label: 'Categories', icon: 'grid-outline' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'services' ? <SearchBar value={search} onChangeText={setSearch} placeholder="Search services" /> : null}

      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.sm }}>
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </View>
        }
        isEmpty={(data) => data.categories.length === 0}
        empty={{ icon: 'grid-outline', title: 'No categories yet', message: 'Create a category, then add services to it.', actionLabel: 'Add category', onAction: () => navigation.navigate('CategoryForm') }}
      >
        {({ categories, services }) => {
          if (tab === 'categories') {
            const counts = selectServiceCountByCategory(services);
            return (
              <Card padding="sm">
                {categories.map((category, index) => (
                  <View key={category.id}>
                    {index > 0 ? <Divider inset={64} /> : null}
                    <ListItem
                      title={category.name}
                      subtitle={`${counts[category.id] ?? 0} services`}
                      left={<CategoryIcon category={category} size={44} />}
                      showChevron
                      onPress={() => navigation.navigate('CategoryForm', { categoryId: category.id })}
                    />
                  </View>
                ))}
              </Card>
            );
          }
          const needle = search.trim().toLowerCase();
          return (
            <View style={{ gap: spacing.lg }}>
              {categories.map((category) => {
                const items = services.filter((s) => s.categoryId === category.id && (!needle || s.name.toLowerCase().includes(needle)));
                if (items.length === 0 && needle) return null;
                return (
                  <View key={category.id} style={{ gap: spacing.sm }}>
                    <SectionHeader
                      title={category.name}
                      subtitle={`${items.filter((s) => s.isActive).length} of ${items.length} active`}
                      actionLabel="Add"
                      onAction={() => navigation.navigate('ServiceForm', { categoryId: category.id })}
                      compact
                    />
                    <Card padding="sm">
                      {items.length === 0 ? (
                        <Text variant="bodySmall" tone="muted" style={{ padding: spacing.sm }}>
                          No services in this category.
                        </Text>
                      ) : (
                        items.map((service, index) => (
                          <View key={service.id}>
                            {index > 0 ? <Divider /> : null}
                            <ListItem
                              title={service.name}
                              subtitle={`${formatDuration(service.duration)} · ${formatCurrency(service.price)}`}
                              style={service.isActive ? undefined : { opacity: 0.55 }}
                              onPress={() => navigation.navigate('ServiceForm', { serviceId: service.id })}
                              right={
                                <Switch
                                  value={service.isActive}
                                  onValueChange={(value) => toggle(service, value)}
                                  trackColor={{ true: colors.primary, false: colors.borderStrong }}
                                  thumbColor={colors.surface}
                                  accessibilityLabel={`${service.name} active`}
                                />
                              }
                            />
                          </View>
                        ))
                      )}
                    </Card>
                  </View>
                );
              })}
            </View>
          );
        }}
      </QueryState>
    </Screen>
  );
};
