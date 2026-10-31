import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';
import type { z } from 'zod';

import { CategoryIcon } from '@/components/customer/ServiceCards';
import { FormInput } from '@/components/form/FormFields';
import { Button, ConfirmDialog, Icon, QueryState, Screen, SkeletonCard, Text, useToast, type IconName } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import { categorySchema } from '@/utils/formSchemas';

type Props = RootStackScreenProps<'CategoryForm'>;
type Values = z.input<typeof categorySchema>;

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const query = useServiceQuery(async () => (categoryId ? ((await catalogService.listCategories()).find((c) => c.id === categoryId) ?? null) : null), [categoryId]);

  const { control, handleSubmit, reset, watch, formState } = useForm<Values, unknown, z.output<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', icon: ICONS[0] ?? 'sparkles-outline', color: COLORS[0] ?? '#C2577A' },
    mode: 'onTouched',
  });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  useEffect(() => {
    const c = query.data;
    if (c) reset({ name: c.name, icon: c.icon, color: c.color });
  }, [query.data, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (categoryId) await catalogService.updateCategory(categoryId, values);
      else await catalogService.createCategory(values);
      toast.success(categoryId ? 'Category updated' : 'Category added');
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  const remove = async (): Promise<void> => {
    if (!categoryId) return;
    setDeleting(true);
    try {
      await catalogService.deleteCategory(categoryId);
      toast.success('Category deleted');
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const [name, icon, color] = watch(['name', 'icon', 'color']);
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
            <FormInput control={control} name="name" label="Name" required placeholder="e.g. Mehendi" />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Icon
              </Text>
              <Controller
                control={control}
                name="icon"
                render={({ field }) => (
                  <View style={styles.grid}>
                    {ICONS.map((option) => {
                      const selected = field.value === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => field.onChange(option)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          accessibilityLabel={option.replace('-outline', '')}
                          style={[styles.tile, { borderRadius: radius.md, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}
                        >
                          <Icon name={option} size={22} color={selected ? colors.primaryDark : colors.textSecondary} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              />
            </View>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Colour
              </Text>
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <View style={styles.grid}>
                    {COLORS.map((option) => (
                      <Pressable
                        key={option}
                        onPress={() => field.onChange(option)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: field.value === option }}
                        accessibilityLabel={`Colour ${option}`}
                        style={[styles.swatch, { backgroundColor: option, borderColor: field.value === option ? colors.text : 'transparent' }]}
                      >
                        {field.value === option ? <Icon name="checkmark" size={18} color="#FFFFFF" /> : null}
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>
            <Button title={categoryId ? 'Save changes' : 'Add category'} size="lg" loading={formState.isSubmitting} onPress={() => void save()} fullWidth />
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
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteOpen(false)}
      />
      {dialog}
    </Screen>
  );
};

const styles = StyleSheet.create({
  preview: { alignItems: 'center', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
});
