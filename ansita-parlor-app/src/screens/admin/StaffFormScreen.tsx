import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ChipSelect, MultiChipSelect, TimeStepper } from '@/components/admin/Pickers';
import { Button, Card, Divider, Input, PhoneInput, QueryState, Screen, SectionHeader, SkeletonCard, Text, useToast } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { catalogService, getErrorMessage, staffService } from '@/services';
import { useBusinessStore } from '@/store';
import { useTheme } from '@/theme';
import type { ID, StaffRole, Weekday, WorkingHours } from '@/types';
import { timeToMinutes } from '@/utils/date';
import { formatEnumLabel } from '@/utils/format';
import { isValidPhone } from '@/utils/phone';
import { isValidEmail } from '@/utils/validators';

type Props = RootStackScreenProps<'StaffForm'>;

const ROLES: readonly StaffRole[] = ['owner', 'senior_stylist', 'stylist', 'beautician', 'trainer', 'receptionist'];
const DAYS: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS: Record<Weekday, string> = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };

/** Add or edit a staff member, including the weekly schedule and days off. */
export const StaffFormScreen = ({ navigation, route }: Props) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const staffId = route.params?.staffId;
  const business = useBusinessStore((state) => state.profile);

  const query = useServiceQuery(async () => {
    const [categories, member] = await Promise.all([catalogService.listCategories(), staffId ? staffService.getStaff(staffId) : null]);
    return { categories, member };
  }, [staffId]);

  const defaultHours = (): WorkingHours[] => DAYS.map((day) => ({ day, isOff: false, start: business.openTime, end: business.closeTime }));

  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('beautician');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialties, setSpecialties] = useState<ID[]>([]);
  const [hours, setHours] = useState<WorkingHours[]>(defaultHours);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const m = query.data?.member;
    if (!m) return;
    setName(m.name);
    setRole(m.role);
    setPhone(m.phone);
    setEmail(m.email);
    setSpecialties(m.specialties);
    // Keep the editor in Sun..Sat order whatever order the record stores.
    setHours(DAYS.map((day) => m.workingHours.find((h) => h.day === day) ?? { day, isOff: true, start: business.openTime, end: business.closeTime }));
  }, [query.data, business.openTime, business.closeTime]);

  const updateDay = (day: Weekday, patch: Partial<WorkingHours>): void =>
    setHours((current) => current.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  const errors = {
    name: name.trim().length < 2 ? 'Enter a name' : null,
    phone: !isValidPhone(phone) ? 'Enter a valid mobile number' : null,
    email: email && !isValidEmail(email) ? 'Enter a valid email' : null,
    specialties: specialties.length === 0 ? 'Choose at least one' : null,
    hours: hours.every((h) => h.isOff)
      ? 'Set at least one working day'
      : hours.some((h) => !h.isOff && timeToMinutes(h.end) <= timeToMinutes(h.start))
        ? 'Each shift must end after it starts'
        : null,
  };
  const valid = Object.values(errors).every((error) => error === null);

  const save = async (): Promise<void> => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    const input = { name: name.trim(), role, phone, email: email.trim().toLowerCase(), specialties, workingHours: hours };
    try {
      if (staffId) {
        await staffService.updateStaff(staffId, input);
        toast.success('Staff member updated');
        navigation.goBack();
      } else {
        const created = await staffService.createStaff({ ...input, avatar: null, isActive: true });
        toast.success(`${created.name} added`);
        navigation.replace('StaffDetail', { staffId: created.id });
      }
    } catch (error) {
      // e.g. new hours would strand upcoming bookings.
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <QueryState query={query} skeleton={<SkeletonCard />}>
        {({ categories }) => (
          <View style={{ gap: spacing.lg }}>
            <Input label="Full name" required value={name} onChangeText={setName} error={touched ? errors.name : null} leftIcon="person-outline" />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Role
              </Text>
              <ChipSelect options={ROLES.map((r) => ({ value: r, label: formatEnumLabel(r) }))} value={role} onChange={setRole} />
            </View>
            <PhoneInput value={phone} onChangeText={setPhone} required error={touched ? errors.phone : null} />
            <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail-outline" error={touched ? errors.email : null} />
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" tone="secondary">
                Specialties
              </Text>
              <MultiChipSelect options={categories.map((c) => ({ value: c.id, label: c.name }))} value={specialties} onChange={setSpecialties} />
              {touched && errors.specialties ? (
                <Text variant="caption" tone="danger">
                  {errors.specialties}
                </Text>
              ) : null}
              <Text variant="caption" tone="muted">
                Only services in these categories can be booked with this person.
              </Text>
            </View>

            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Weekly schedule" subtitle="Switch a day off to mark the weekly holiday" compact />
              <Card padding="md">
                {hours.map((day, index) => (
                  <View key={day.day} style={{ gap: spacing.sm }}>
                    {index > 0 ? <Divider spacing="sm" /> : null}
                    <View style={styles.dayRow}>
                      <Text variant="bodyMedium" style={styles.flex}>
                        {DAY_LABELS[day.day]}
                      </Text>
                      <Text variant="caption" tone={day.isOff ? 'muted' : 'success'}>
                        {day.isOff ? 'Day off' : 'Working'}
                      </Text>
                      <Switch
                        value={!day.isOff}
                        onValueChange={(working) => updateDay(day.day, { isOff: !working })}
                        trackColor={{ true: colors.primary, false: colors.borderStrong }}
                        thumbColor={colors.surface}
                        accessibilityLabel={`${DAY_LABELS[day.day]} working`}
                      />
                    </View>
                    {day.isOff ? null : (
                      <View style={styles.times}>
                        <View style={styles.flex}>
                          <TimeStepper label="Starts" value={day.start} onChange={(start) => updateDay(day.day, { start })} max={day.end} />
                        </View>
                        <View style={styles.flex}>
                          <TimeStepper label="Ends" value={day.end} onChange={(end) => updateDay(day.day, { end })} min={day.start} />
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </Card>
              {touched && errors.hours ? (
                <Text variant="caption" tone="danger">
                  {errors.hours}
                </Text>
              ) : null}
              <Button
                title="Copy Sunday's hours to all working days"
                variant="ghost"
                size="sm"
                onPress={() => {
                  const sunday = hours[0];
                  if (sunday) setHours((current) => current.map((h) => (h.isOff ? h : { ...h, start: sunday.start, end: sunday.end })));
                }}
              />
            </View>

            <Text variant="caption" tone="muted">
              Changing hours is blocked if it would leave upcoming bookings outside the new schedule.
            </Text>
            <Button title={staffId ? 'Save changes' : 'Add staff member'} size="lg" loading={saving} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  times: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
