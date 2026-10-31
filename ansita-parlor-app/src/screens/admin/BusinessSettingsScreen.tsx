import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { TimeStepper } from '@/components/admin/Pickers';
import { Button, Card, DatePickerField, Divider, IconButton, Input, ListItem, PhoneInput, Screen, SectionHeader, Text, useToast } from '@/components/ui';
import type { RootStackScreenProps } from '@/navigation/types';
import { businessService, getErrorMessage } from '@/services';
import { selectPointsFor, useBusinessStore } from '@/store';
import { useTheme } from '@/theme';
import type { AdminAlerts, BusinessProfile, ISODate } from '@/types';
import { formatDisplayDate, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

type Props = RootStackScreenProps<'BusinessSettings'>;

const ALERTS: readonly { key: keyof AdminAlerts; title: string; subtitle: string }[] = [
  { key: 'newBookings', title: 'New bookings & reschedules', subtitle: 'When customers request or move a booking' },
  { key: 'cancellations', title: 'Cancellations', subtitle: 'When a customer cancels' },
  { key: 'payments', title: 'Payments', subtitle: 'When a payment is received' },
  { key: 'enrollments', title: 'Course enrollments', subtitle: 'New students and drop-outs' },
];

/** Parlour profile, opening hours, holidays, loyalty rules and admin alerts. Changes apply app-wide. */
export const BusinessSettingsScreen = (_props: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const { profile, holidays, loyalty, alerts } = useBusinessStore();

  const [draft, setDraft] = useState<BusinessProfile>(profile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [holidayDate, setHolidayDate] = useState<ISODate | null>(null);
  const [holidayName, setHolidayName] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [rupeesPerPoint, setRupeesPerPoint] = useState(String(loyalty.rupeesPerPoint));
  const [pointValue, setPointValue] = useState(String(loyalty.pointValue));
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  // Pick up external changes (e.g. demo reset) while the screen is open.
  useEffect(() => setDraft(profile), [profile]);
  useEffect(() => {
    setRupeesPerPoint(String(loyalty.rupeesPerPoint));
    setPointValue(String(loyalty.pointValue));
  }, [loyalty]);

  const profileDirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const loyaltyDirty = rupeesPerPoint !== String(loyalty.rupeesPerPoint) || pointValue !== String(loyalty.pointValue);

  const run = async (setBusy: (busy: boolean) => void, action: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const upcoming = holidays.filter((h) => h.date >= todayISO());
  const exampleBill = 2500;

  return (
    <Screen gap="xl">
      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Business profile" subtitle="Shown to customers under Help & contact" compact />
        <Card style={{ gap: spacing.md }}>
          <Input label="Business name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Input label="Tagline" value={draft.tagline} onChangeText={(tagline) => setDraft({ ...draft, tagline })} />
          <PhoneInput label="Phone" value={draft.phone} onChangeText={(phone) => setDraft({ ...draft, phone })} />
          <PhoneInput label="WhatsApp" value={draft.whatsapp} onChangeText={(whatsapp) => setDraft({ ...draft, whatsapp })} />
          <Input label="Email" value={draft.email} onChangeText={(email) => setDraft({ ...draft, email })} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Address" value={draft.address} onChangeText={(address) => setDraft({ ...draft, address })} multiline />
          <View style={styles.row}>
            <View style={styles.flex}>
              <TimeStepper label="Opens" value={draft.openTime} onChange={(openTime) => setDraft({ ...draft, openTime })} max={draft.closeTime} />
            </View>
            <View style={styles.flex}>
              <TimeStepper label="Closes" value={draft.closeTime} onChange={(closeTime) => setDraft({ ...draft, closeTime })} min={draft.openTime} />
            </View>
          </View>
          <Text variant="caption" tone="muted">
            Opening hours are shown to customers and frame the admin calendar. Each stylist's shift is set under Staff.
          </Text>
          <Button
            title="Save profile"
            disabled={!profileDirty}
            loading={savingProfile}
            onPress={() => void run(setSavingProfile, () => businessService.updateProfile(draft), 'Business profile saved')}
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
                    onPress={() => void run(() => undefined, () => businessService.removeHoliday(holiday.date), 'Holiday removed')}
                  />
                </View>
              </View>
            ))
          )}
          <Divider spacing="sm" />
          <DatePickerField label="Add a holiday" value={holidayDate} onChange={setHolidayDate} minDate={todayISO()} placeholder="Pick a date" />
          <Input label="Name" value={holidayName} onChangeText={setHolidayName} placeholder="e.g. Laxmi Puja" />
          <Button
            title="Add holiday"
            variant="secondary"
            leftIcon="add"
            disabled={!holidayDate || holidayName.trim().length < 2}
            loading={addingHoliday}
            onPress={() =>
              void run(setAddingHoliday, () => businessService.addHoliday({ date: holidayDate ?? '', name: holidayName }), 'Holiday added').then((ok) => {
                if (ok) {
                  setHolidayDate(null);
                  setHolidayName('');
                }
              })
            }
            fullWidth
          />
          <Text variant="caption" tone="muted">
            A day that already has bookings can't be closed until they're moved or cancelled.
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
                onValueChange={(enabled) => void run(() => undefined, () => businessService.updateLoyalty({ enabled }), enabled ? 'Loyalty programme on' : 'Loyalty programme paused')}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
              />
            }
          />
          <View style={styles.row}>
            <Input label="Spend per point (Rs.)" value={rupeesPerPoint} onChangeText={(t) => setRupeesPerPoint(t.replace(/\D/g, ''))} keyboardType="number-pad" containerStyle={styles.flex} />
            <Input label="Point value (Rs.)" value={pointValue} onChangeText={(t) => setPointValue(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" containerStyle={styles.flex} />
          </View>
          <Text variant="caption" tone="muted">
            Example: a {formatCurrency(exampleBill)} visit earns {selectPointsFor({ ...loyalty, enabled: true, rupeesPerPoint: Number(rupeesPerPoint) || 1 }, exampleBill)} points, worth{' '}
            {formatCurrency(Math.round(selectPointsFor({ ...loyalty, enabled: true, rupeesPerPoint: Number(rupeesPerPoint) || 1 }, exampleBill) * (Number(pointValue) || 0)))} when redeemed.
          </Text>
          <Button
            title="Save rules"
            disabled={!loyaltyDirty}
            loading={savingLoyalty}
            onPress={() =>
              void run(setSavingLoyalty, () => businessService.updateLoyalty({ rupeesPerPoint: Number(rupeesPerPoint), pointValue: Number(pointValue) }), 'Loyalty rules saved')
            }
            fullWidth
          />
        </Card>
      </View>

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
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
