import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Switch, View } from 'react-native';
import { z } from 'zod';

import { ChipSelect } from '@/components/admin/Pickers';
import { FormInput } from '@/components/form/FormFields';
import { Button, Card, ConfirmDialog, ListItem, QueryState, Screen, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import { wholeNumberText } from '@/utils/formSchemas';
import { durationSchema, priceSchema } from '@/utils/validators';

type Props = RootStackScreenProps<'ServiceForm'>;

const schema = z.object({
  name: z.string().trim().min(2, { error: 'Enter a service name' }).max(60),
  categoryId: z.string().min(1, { error: 'Choose a category' }),
  duration: wholeNumberText(durationSchema, 'the duration'),
  price: wholeNumberText(priceSchema, 'the price'),
  description: z.string().trim().max(300, { error: 'Keep it under 300 characters' }),
  isActive: z.boolean(),
});

type Values = z.input<typeof schema>;

export const ServiceFormScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const serviceId = route.params?.serviceId;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const query = useServiceQuery(async () => {
    const [categories, service] = await Promise.all([catalogService.listCategories(), serviceId ? catalogService.getService(serviceId) : null]);
    return { categories, service };
  }, [serviceId]);

  const { control, handleSubmit, reset, formState } = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', categoryId: route.params?.categoryId ?? '', duration: '30', price: '', description: '', isActive: true },
    mode: 'onTouched',
  });
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  useEffect(() => {
    const s = query.data?.service;
    if (s) reset({ name: s.name, categoryId: s.categoryId, duration: String(s.duration), price: String(s.price), description: s.description, isActive: s.isActive });
  }, [query.data, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (serviceId) {
        await catalogService.updateService(serviceId, values);
        toast.success('Service updated');
      } else {
        await catalogService.createService({ ...values, image: null });
        toast.success(`${values.name} added`);
      }
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  const remove = async (): Promise<void> => {
    if (!serviceId) return;
    setDeleting(true);
    try {
      await catalogService.deleteService(serviceId);
      toast.success('Service deleted');
      allowLeave();
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ categories }) => (
          <View style={{ gap: spacing.lg }}>
            <FormInput control={control} name="name" label="Service name" required placeholder="e.g. Hair Botox" />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Category
              </Text>
              <Controller
                control={control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <>
                    <ChipSelect options={categories.map((c) => ({ value: c.id, label: c.name }))} value={field.value || null} onChange={field.onChange} />
                    {fieldState.error ? (
                      <Text variant="caption" tone="danger">
                        {fieldState.error.message}
                      </Text>
                    ) : null}
                  </>
                )}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <FormInput control={control} name="duration" label="Duration (min)" required keyboardType="number-pad" leftIcon="time-outline" containerStyle={{ flex: 1 }} />
              <FormInput control={control} name="price" label="Price (Rs.)" required keyboardType="number-pad" leftIcon="pricetag-outline" containerStyle={{ flex: 1 }} />
            </View>
            <FormInput control={control} name="description" label="Description" placeholder="What's included, who it's for…" multiline maxLength={300} showCount />
            <Card padding="sm">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <ListItem
                    title="Bookable"
                    subtitle={field.value ? 'Customers can book this service' : 'Hidden from customers'}
                    leftIcon="eye-outline"
                    right={<Switch value={field.value} onValueChange={field.onChange} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.surface} />}
                  />
                )}
              />
            </Card>
            <Text variant="caption" tone="muted">
              Price changes apply to new bookings. Existing bookings keep the price they were booked at.
            </Text>
            <Button title={serviceId ? 'Save changes' : 'Add service'} size="lg" loading={formState.isSubmitting} onPress={() => void save()} fullWidth />
            {serviceId ? <Button title="Delete service" variant="ghost" onPress={() => setDeleteOpen(true)} /> : null}
          </View>
        )}
      </QueryState>
      <ConfirmDialog
        visible={deleteOpen}
        tone="danger"
        title="Delete this service?"
        message="Past bookings keep their record. Services with upcoming bookings can't be deleted; switch them off instead."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteOpen(false)}
      />
      {dialog}
    </Screen>
  );
};
