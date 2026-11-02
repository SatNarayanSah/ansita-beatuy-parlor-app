import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';
import type { z } from 'zod';

import { OnlinePaymentSettings } from '@/components/admin/OnlinePaymentSettings';
import { TimeStepper } from '@/components/admin/Pickers';
import { FormInput, FormPhoneInput } from '@/components/form/FormFields';
import { Button, Card, DatePickerField, Divider, IconButton, ListItem, Screen, SectionHeader, Text, useToast } from '@/components/ui';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { RootStackScreenProps } from '@/navigation/types';
import { businessService, getErrorMessage } from '@/services';
import { selectPointsFor, useBusinessStore } from '@/store';
import { useTheme } from '@/theme';
import type { AdminAlerts, LoyaltyRules } from '@/types';
import { formatDisplayDate, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { businessProfileSchema, holidaySchema, loyaltySchema } from '@/utils/formSchemas';

type Props = RootStackScreenProps<'BusinessSettings'>;

const ALERTS: readonly { key: keyof AdminAlerts; title: string; subtitle: string }[] = [
  { key: 'newBookings', title: 'New bookings & reschedules', subtitle: 'When customers request or move a booking' },
  { key: 'cancellations', title: 'Cancellations', subtitle: 'When a customer cancels' },
  { key: 'payments', title: 'Payments', subtitle: 'When a payment is received' },
  { key: 'enrollments', title: 'Course enrollments', subtitle: 'New students and drop-outs' },
];

const EXAMPLE_BILL = 2500;

/** Parlour profile, opening hours, holidays, loyalty rules, online payments and admin alerts. Changes apply app-wide. */
const loyaltyDefaults = (loyalty: LoyaltyRules) => ({
  rupeesPerPoint: String(loyalty.rupeesPerPoint),
  pointValue: String(loyalty.pointValue),
  minRedeemPoints: String(loyalty.minRedeemPoints),
});

export const BusinessSettingsScreen = (_props: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const { profile, holidays, loyalty, alerts, payments } = useBusinessStore();
  const [paymentsDirty, setPaymentsDirty] = useState(false);

  const profileForm = useForm<z.input<typeof businessProfileSchema>, unknown, z.output<typeof businessProfileSchema>>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: profile,
    mode: 'onTouched',
  });
  const holidayForm = useForm<z.input<typeof holidaySchema>, unknown, z.output<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { date: '', name: '' },
    mode: 'onTouched',
  });
  const loyaltyForm = useForm<z.input<typeof loyaltySchema>, unknown, z.output<typeof loyaltySchema>>({
    resolver: zodResolver(loyaltySchema),
    defaultValues: loyaltyDefaults(loyalty),
    mode: 'onTouched',
  });

  // Pick up changes loaded from the server while the screen is open.
  const resetProfile = profileForm.reset;
  const resetLoyalty = loyaltyForm.reset;
  useEffect(() => resetProfile(profile), [profile, resetProfile]);
  useEffect(() => resetLoyalty(loyaltyDefaults(loyalty)), [loyalty, resetLoyalty]);

  const dirty = profileForm.formState.isDirty || loyaltyForm.formState.isDirty || paymentsDirty;
  const { dialog } = useUnsavedChangesGuard(dirty && !profileForm.formState.isSubmitting && !loyaltyForm.formState.isSubmitting);

  const [openTime, closeTime] = useWatch({ control: profileForm.control, name: ['openTime', 'closeTime'] });
  const [rupeesText, valueText] = useWatch({ control: loyaltyForm.control, name: ['rupeesPerPoint', 'pointValue'] });
  const examplePoints = selectPointsFor({ ...loyalty, enabled: true, rupeesPerPoint: Number(rupeesText) || 1 }, EXAMPLE_BILL);

  const attempt = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  const saveProfile = profileForm.handleSubmit(async (values) => {
    await attempt(() => businessService.updateProfile(values), 'Business profile saved');
  });
  const addHoliday = holidayForm.handleSubmit(async (values) => {
    if (await attempt(() => businessService.addHoliday(values), 'Holiday added')) holidayForm.reset({ date: '', name: '' });
  });
  const saveLoyalty = loyaltyForm.handleSubmit(async (values) => {
    await attempt(() => businessService.updateLoyalty(values), 'Loyalty rules saved');
  });

  const upcoming = holidays.filter((h) => h.date >= todayISO());

  return (
    <Screen gap="xl">
      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Business profile" subtitle="Shown to customers under Help & contact" compact />
        <Card style={{ gap: spacing.md }}>
          <FormInput control={profileForm.control} name="name" label="Business name" required />
          <FormInput control={profileForm.control} name="tagline" label="Tagline" />
          <FormPhoneInput control={profileForm.control} name="phone" label="Phone" required />
          <FormPhoneInput control={profileForm.control} name="whatsapp" label="WhatsApp" required />
          <FormInput control={profileForm.control} name="email" label="Email" required keyboardType="email-address" autoCapitalize="none" />
          <FormInput control={profileForm.control} name="address" label="Address" required multiline />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Controller
                control={profileForm.control}
                name="openTime"
                render={({ field }) => <TimeStepper label="Opens" value={field.value} onChange={field.onChange} max={closeTime} />}
              />
            </View>
            <View style={styles.flex}>
              <Controller
                control={profileForm.control}
                name="closeTime"
                render={({ field, fieldState }) => (
                  <>
                    <TimeStepper label="Closes" value={field.value} onChange={field.onChange} min={openTime} />
                    {fieldState.error ? (
                      <Text variant="caption" tone="danger">
                        {fieldState.error.message}
                      </Text>
                    ) : null}
                  </>
                )}
              />
            </View>
          </View>
          <Text variant="caption" tone="muted">
            Opening hours are shown to customers and frame the admin calendar. Each stylist’s shift is set under Staff.
          </Text>
          <Button
            title="Save profile"
            disabled={!profileForm.formState.isDirty}
            loading={profileForm.formState.isSubmitting}
            onPress={() => void saveProfile()}
            fullWidth
          />
        </Card>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Holidays" subtitle="The parlour is closed; no bookings can be made" compact />
        <Card style={{ gap: spacing.sm }}>
          {upcoming.length === 0 ? (
            <Text variant="bodySmall" tone="muted">
              No upcoming holidays.
            </Text>
          ) : (
            upcoming.map((holiday, index) => (
              <View key={holiday.date}>
                {index > 0 ? <Divider spacing="xs" /> : null}
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="bodyMedium">{holiday.name}</Text>
                    <Text variant="caption" tone="muted">
                      {formatDisplayDate(holiday.date)}
                    </Text>
                  </View>
                  <IconButton
                    icon="trash-outline"
                    accessibilityLabel={`Remove ${holiday.name}`}
                    onPress={() => void attempt(() => businessService.removeHoliday(holiday.date), 'Holiday removed')}
                  />
                </View>
              </View>
            ))
          )}
          <Divider spacing="sm" />
          <Controller
            control={holidayForm.control}
            name="date"
            render={({ field, fieldState }) => (
              <DatePickerField
                label="Add a holiday"
                value={field.value || null}
                onChange={(value) => field.onChange(value ?? '')}
                minDate={todayISO()}
                placeholder="Pick a date"
                error={fieldState.error?.message}
              />
            )}
          />
          <FormInput control={holidayForm.control} name="name" label="Name" placeholder="e.g. Laxmi Puja" />
          <Button title="Add holiday" variant="secondary" leftIcon="add" loading={holidayForm.formState.isSubmitting} onPress={() => void addHoliday()} fullWidth />
          <Text variant="caption" tone="muted">
            A day that already has bookings can’t be closed until they’re moved or cancelled.
          </Text>
        </Card>
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Loyalty rules" compact />
        <Card style={{ gap: spacing.md }}>
          <ListItem
            title="Loyalty programme"
            subtitle={loyalty.enabled ? 'Customers earn points on completed visits' : 'Paused: no new points are awarded'}
            leftIcon="diamond-outline"
            leftIconTone="accent"
            right={
              <Switch
                value={loyalty.enabled}
                onValueChange={(enabled) => void attempt(() => businessService.updateLoyalty({ enabled }), enabled ? 'Loyalty programme on' : 'Loyalty programme paused')}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel="Loyalty programme"
              />
            }
          />
          <View style={styles.row}>
            <FormInput control={loyaltyForm.control} name="rupeesPerPoint" label="Spend per point (Rs.)" keyboardType="number-pad" containerStyle={styles.flex} />
            <FormInput control={loyaltyForm.control} name="pointValue" label="Point value (Rs.)" keyboardType="decimal-pad" containerStyle={styles.flex} />
          </View>
          <FormInput
            control={loyaltyForm.control}
            name="minRedeemPoints"
            label="Points needed to use them"
            keyboardType="number-pad"
            helperText="A customer can use points as a discount once they have at least this many."
          />
          <Text variant="caption" tone="muted">
            Example: a {formatCurrency(EXAMPLE_BILL)} visit earns {examplePoints} points, worth {formatCurrency(Math.round(examplePoints * (Number(valueText) || 0)))} when redeemed.
          </Text>
          <Button
            title="Save rules"
            disabled={!loyaltyForm.formState.isDirty}
            loading={loyaltyForm.formState.isSubmitting}
            onPress={() => void saveLoyalty()}
            fullWidth
          />
        </Card>
      </View>

      <OnlinePaymentSettings payments={payments} onDirtyChange={setPaymentsDirty} />

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Admin notifications" subtitle="Which events create a notification for admins" compact />
        <Card padding="sm">
          {ALERTS.map((alert, index) => (
            <View key={alert.key}>
              {index > 0 ? <Divider inset={16} /> : null}
              <ListItem
                title={alert.title}
                subtitle={alert.subtitle}
                right={
                  <Switch
                    value={alerts[alert.key]}
                    onValueChange={(value) => void businessService.updateAlerts({ [alert.key]: value }).catch((error: unknown) => toast.error(getErrorMessage(error)))}
                    trackColor={{ true: colors.primary, false: colors.borderStrong }}
                    thumbColor={colors.surface}
                    accessibilityLabel={alert.title}
                  />
                }
              />
            </View>
          ))}
        </Card>
      </View>
      {dialog}
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1 },
});
