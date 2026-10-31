import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/customer/ServiceCards';
import { Button, ConfirmDialog, Icon, Input, QueryState, Screen, SkeletonCard, Text, useToast, type IconName } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';

type Props = RootStackScreenProps<'CategoryForm'>;

const ICONS: readonly IconName[] = [
  'cut-outline',
  'water-outline',
  'color-palette-outline',
  'hand-left-outline',
  'sparkles-outline',
  'leaf-outline',
  'diamond-outline',
  'flower-outline',
  'brush-outline',
  'heart-outline',
  'eye-outline',
  'body-outline',
];

const COLORS = ['#C2577A', '#9C3D5E', '#5A2D52', '#C49A45', '#D0704F', '#2F8F63', '#3768B5', '#6B6166'];

export const CategoryFormScreen = ({ navigation, route }: Props) => {
  const { colors, radius, spacing } = useTheme();
  const toast = useToast();
  const categoryId = route.params?.categoryId;
  const query = useServiceQuery(async () => (categoryId ? (await catalogService.listCategories()).find((c) => c.id === categoryId) ?? null : null), [categoryId]);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(ICONS[0] ?? 'sparkles-outline');
  const [color, setColor] = useState(COLORS[0] ?? '#C2577A');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const c = query.data;
    if (c) {
      setName(c.name);
      setIcon(c.icon);
      setColor(c.color);
    }
  }, [query.data]);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      if (categoryId) await catalogService.updateCategory(categoryId, { name: name.trim(), icon, color });
      else await catalogService.createCategory({ name, icon, color });
      toast.success(categoryId ? 'Category updated' : 'Category added');
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!categoryId) return;
    setSaving(true);
    try {
      await catalogService.deleteCategory(categoryId);
      toast.success('Category deleted');
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const preview = { id: 'preview', name, icon, color, sortOrder: 0, createdAt: '', updatedAt: '' };

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {() => (
          <View style={{ gap: spacing.xl }}>
            <View style={styles.preview}>
              <CategoryIcon category={preview} size={72} />
              <Text variant="h3">{name || 'New category'}</Text>
            </View>
            <Input label="Name" required value={name} onChangeText={setName} placeholder="e.g. Mehendi" error={name.length > 0 && name.trim().length < 2 ? 'Enter at least 2 characters' : null} />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Icon
              </Text>
              <View style={styles.grid}>
                {ICONS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setIcon(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: icon === option }}
                    accessibilityLabel={option.replace('-outline', '')}
                    style={[styles.tile, { borderRadius: radius.md, borderColor: icon === option ? colors.primary : colors.border, backgroundColor: icon === option ? colors.primarySoft : colors.surface }]}
                  >
                    <Icon name={option} size={22} color={icon === option ? colors.primaryDark : colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Colour
              </Text>
              <View style={styles.grid}>
                {COLORS.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setColor(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: color === option }}
                    accessibilityLabel={`Colour ${option}`}
                    style={[styles.swatch, { backgroundColor: option, borderColor: color === option ? colors.text : 'transparent' }]}
                  >
                    {color === option ? <Icon name="checkmark" size={18} color="#FFFFFF" /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
            <Button title={categoryId ? 'Save changes' : 'Add category'} size="lg" disabled={name.trim().length < 2} loading={saving} onPress={() => void save()} fullWidth />
            {categoryId ? <Button title="Delete category" variant="ghost" onPress={() => setDeleteOpen(true)} /> : null}
          </View>
        )}
      </QueryState>
      <ConfirmDialog
        visible={deleteOpen}
        tone="danger"
        title="Delete this category?"
        message="Only empty categories can be deleted. Move or delete its services first."
        confirmLabel="Delete"
        loading={saving}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteOpen(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  preview: { alignItems: 'center', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
});
