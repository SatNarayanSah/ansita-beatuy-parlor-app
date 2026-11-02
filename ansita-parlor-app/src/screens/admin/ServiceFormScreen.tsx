import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { ChipSelect } from '@/components/admin/Pickers';
import { FormInput } from '@/components/form/FormFields';
import { ImagePickerField } from '@/components/form/ImagePickerField';
import { Button, Card, ConfirmDialog, IconButton, ListItem, QueryState, Screen, SectionHeader, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useT, type Translate } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, getErrorMessage } from '@/services';
import { useTheme } from '@/theme';
import { benefitsSchema, MAX_BENEFIT_LENGTH, MAX_BENEFITS, wholeNumberText } from '@/utils/formSchemas';
import { durationSchema, priceSchema } from '@/utils/validators';

type Props = RootStackScreenProps<'ServiceForm'>;

const makeSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(2, { error: 'Enter a service name' }).max(60),
    categoryId: z.string().min(1, { error: 'Choose a category' }),
    duration: wholeNumberText(durationSchema, 'the duration'),
    price: wholeNumberText(priceSchema, 'the price'),
    description: z.string().trim().max(300, { error: 'Keep it under 300 characters' }),
    benefits: benefitsSchema({ tooLong: t('admin.benefitTooLong'), tooMany: t('admin.benefitsMax'), duplicate: t('admin.benefitDuplicate') }),
    isActive: z.boolean(),
    image: z.string().nullable(),
  });

type Schema = ReturnType<typeof makeSchema>;
type Values = z.input<Schema>;

const toBenefitFields = (benefits: readonly string[] | undefined): Values['benefits'] => (benefits ?? []).map((text) => ({ text }));

export const ServiceFormScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const t = useT();
  const schema = useMemo(() => makeSchema(t), [t]);
  const serviceId = route.params?.serviceId;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const query = useServiceQuery(async () => {
    const [categories, service] = await Promise.all([catalogService.listCategories(), serviceId ? catalogService.getService(serviceId) : null]);
    return { categories, service };
  }, [serviceId]);

  const { control, handleSubmit, reset, formState } = useForm<Values, unknown, z.output<Schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', categoryId: route.params?.categoryId ?? '', duration: '30', price: '', description: '', benefits: [], isActive: true, image: null },
    mode: 'onTouched',
  });
  const benefits = useFieldArray({ control, name: 'benefits' });
  // The "at most 8" rule is reported on the list itself, not on a row.
  const benefitsError = formState.errors.benefits?.root?.message ?? formState.errors.benefits?.message;
  const { dialog, allowLeave } = useUnsavedChangesGuard(formState.isDirty && !formState.isSubmitting);

  useEffect(() => {
    const s = query.data?.service;
    if (s) reset({ name: s.name, categoryId: s.categoryId, duration: String(s.duration), price: String(s.price), description: s.description, benefits: toBenefitFields(s.benefits), isActive: s.isActive, image: s.image });
  }, [query.data, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (serviceId) {
        await catalogService.updateService(serviceId, values);
        toast.success('Service updated');
      } else {
        await catalogService.createService(values);
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
            <Controller
              control={control}
              name="image"
              render={({ field }) => <ImagePickerField label="Photo" value={field.value} onChange={field.onChange} helperText="Shown to customers in the app and on the website." />}
            />
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
            <View style={{ gap: spacing.sm }}>
              <SectionHeader
                title={t('admin.benefits')}
                subtitle={t('admin.benefitsHint')}
                compact
              />
              {benefits.fields.length === 0 ? (
                <Card variant="outlined" padding="md">
                  <Text variant="caption" tone="muted">
                    {t('admin.noBenefits')}
                  </Text>
                </Card>
              ) : null}
              {benefits.fields.map((benefit, index) => {
                const n = index + 1;
                return (
                  <View key={benefit.id} style={styles.benefitRow}>
                    <FormInput
                      control={control}
                      name={`benefits.${index}.text`}
                      label={t('admin.benefitN', { n })}
                      placeholder={t('admin.benefitPlaceholder')}
                      leftIcon="checkmark-circle-outline"
                      maxLength={MAX_BENEFIT_LENGTH}
                      containerStyle={styles.flex}
                    />
                    <View style={styles.benefitActions}>
                      <IconButton
                        icon="chevron-up"
                        size={32}
                        accessibilityLabel={t('admin.moveBenefitUp', { n })}
                        disabled={index === 0}
                        onPress={() => benefits.move(index, index - 1)}
                      />
                      <IconButton
                        icon="chevron-down"
                        size={32}
                        accessibilityLabel={t('admin.moveBenefitDown', { n })}
                        disabled={index === benefits.fields.length - 1}
                        onPress={() => benefits.move(index, index + 1)}
                      />
                    </View>
                    <IconButton icon="trash-outline" size={36} accessibilityLabel={t('admin.removeBenefit', { n })} onPress={() => benefits.remove(index)} style={styles.trash} />
                  </View>
                );
              })}
              {benefitsError ? (
                <Text variant="caption" tone="danger">
                  {benefitsError}
                </Text>
              ) : null}
              {benefits.fields.length < MAX_BENEFITS ? (
                <Button title={t('admin.addBenefit')} variant="outline" size="sm" leftIcon="add" onPress={() => benefits.append({ text: '' })} />
              ) : null}
            </View>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  benefitActions: { flexDirection: 'row', paddingBottom: 6 },
  trash: { marginBottom: 4 },
});
