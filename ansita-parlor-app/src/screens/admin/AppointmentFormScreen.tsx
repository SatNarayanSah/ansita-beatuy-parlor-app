import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipSelect, MultiChipSelect, SelectSheet } from '@/components/admin/Pickers';
import {
  Avatar,
  Button,
  Card,
  DatePickerField,
  FilterChips,
  Icon,
  Input,
  ListItem,
  PhoneInput,
  QueryState,
  Screen,
  SectionHeader,
  SkeletonCard,
  Text,
  TimeSlotGrid,
  useToast,
  type FilterOption,
} from '@/components/ui';
import { isIconName } from '@/components/ui/Icon';
import { useQualifiedStaff } from '@/hooks/useBookingAvailability';
import { useCategoryMap, useCustomerMap, useServiceMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, customerService, getErrorMessage } from '@/services';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  selectHolidayOn,
  selectIsStaffWorkingOn,
  useAppointmentStore,
  useBusinessStore,
  useCustomerStore,
  useServiceStore,
} from '@/store';
import { useTheme } from '@/theme';
import type { Customer, ID, ISODate, TimeString } from '@/types';
import { addMinutesToTime, formatTime12, formatTimeRange, timeRangesOverlap, todayISO } from '@/utils/date';
import { formatCurrency, formatDuration } from '@/utils/format';
import { formatPhone, isValidPhone } from '@/utils/phone';

type Props = RootStackScreenProps<'AppointmentForm'>;

/** Walk-in / phone booking, or edit & reschedule an existing one. */
export const AppointmentFormScreen = ({ navigation, route }: Props) => {
  const { colors, spacing, radius } = useTheme();
  const toast = useToast();
  const params = route.params ?? {};
  const editingId = params.appointmentId;
  const services = useServiceMap();
  const categories = useCategoryMap();
  const customers = useCustomerMap();
  const customerList = useCustomerStore((state) => state.customers);
  const allServices = useServiceStore((state) => state.services);
  const appointments = useAppointmentStore((state) => state.appointments);
  const holidays = useBusinessStore((state) => state.holidays);

  const existing = useServiceQuery(
    async () => (editingId ? appointmentService.getAppointment(editingId) : null),
    [editingId],
  );

  const [customerId, setCustomerId] = useState<ID | null>(params.customerId ?? null);
  const [serviceIds, setServiceIds] = useState<ID[]>([]);
  const [staffId, setStaffId] = useState<ID | null>(params.staffId ?? null);
  const [date, setDate] = useState<ISODate | null>(params.date ?? todayISO());
  const [time, setTime] = useState<TimeString | null>(params.time ?? null);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<ID | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Prefill once when editing.
  useEffect(() => {
    const a = existing.data;
    if (!a) return;
    setCustomerId(a.customerId);
    setServiceIds(a.serviceIds);
    setStaffId(a.staffId);
    setDate(a.date);
    setTime(a.startTime);
    setNotes(a.notes);
  }, [existing.data]);

  const qualified = useQualifiedStaff(serviceIds);
  const selected = serviceIds.map((id) => services.get(id)).filter((s) => s !== undefined);
  const totals = selected.reduce((sum, s) => ({ price: sum.price + s.price, duration: sum.duration + s.duration }), { price: 0, duration: 0 });
  const staffMember = qualified.find((m) => m.id === staffId);
  const holiday = date ? selectHolidayOn(holidays, date) : undefined;
  const staffOff = staffMember && date ? !selectIsStaffWorkingOn(staffMember, date) : false;
  const endTime = time ? addMinutesToTime(time, totals.duration) : null;

  const slots = useServiceQuery(
    async () =>
      date && staffId && serviceIds.length > 0 && qualified.some((m) => m.id === staffId)
        ? appointmentService.getAvailableSlots({ date, staffId, serviceIds, excludeAppointmentId: editingId })
        : [],
    [date, staffId, serviceIds.join(','), editingId, qualified.length],
    { refetchOn: [useAppointmentStore] },
  );

  // Everything else booked that day for this stylist or this customer, for the conflict panel.
  const sameDay = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.id !== editingId &&
            a.date === date &&
            ACTIVE_APPOINTMENT_STATUSES.includes(a.status) &&
            (a.staffId === staffId || a.customerId === customerId),
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments, editingId, date, staffId, customerId],
  );
  const clashes = time && endTime ? sameDay.filter((a) => timeRangesOverlap(time, endTime, a.startTime, a.endTime)) : [];

  const categoryOptions = useMemo<FilterOption<ID>[]>(
    () => [...categories.values()].map((c) => ({ value: c.id, label: c.name, icon: isIconName(c.icon) ? c.icon : undefined })),
    [categories],
  );
  const serviceOptions = allServices
    .filter((s) => s.isActive && (category ? s.categoryId === category : true))
    .map((s) => ({ value: s.id, label: `${s.name} · ${formatCurrency(s.price)}` }));

  const canSave = Boolean(customerId && serviceIds.length && staffMember && date && time && !holiday && !staffOff && clashes.length === 0);

  const createCustomer = async (): Promise<void> => {
    if (!newCustomer) return;
    try {
      const created = await customerService.createCustomer({
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: '',
        gender: 'female',
        dob: null,
        address: { line1: '', line2: '', city: 'Kathmandu', province: 'Bagmati', postalCode: '' },
        notes: '',
        avatar: null,
        tags: ['new'],
      });
      setCustomerId(created.id);
      setNewCustomer(null);
      setPickerOpen(false);
      toast.success(`${created.name} added`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const save = async (): Promise<void> => {
    if (!customerId || !staffId || !date || !time) return;
    setSaving(true);
    setServerError(null);
    try {
      if (editingId) {
        await appointmentService.updateAppointment(editingId, { serviceIds, staffId, date, startTime: time, notes });
        toast.success('Appointment updated. The customer has been notified.');
        navigation.goBack();
      } else {
        const created = await appointmentService.createAppointment({ customerId, serviceIds, staffId, date, startTime: time, notes });
        toast.success('Appointment booked and confirmed');
        navigation.replace('AppointmentDetail', { appointmentId: created.id });
      }
    } catch (error) {
      setServerError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const customer = customerId ? customers.get(customerId) : undefined;
  const newCustomerValid = newCustomer !== null && newCustomer.name.trim().length >= 2 && isValidPhone(newCustomer.phone);

  return (
    <Screen>
      <QueryState query={existing} skeleton={<SkeletonCard />}>
        {() => (
          <View style={{ gap: spacing.xl }}>
            {/* Customer */}
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Customer" compact />
              {customer ? (
                <Card padding="sm">
                  <ListItem
                    title={customer.name}
                    subtitle={formatPhone(customer.phone)}
                    left={<Avatar name={customer.name} uri={customer.avatar} size="md" />}
                    right={editingId ? undefined : <Button title="Change" size="sm" variant="ghost" onPress={() => setPickerOpen(true)} />}
                  />
                </Card>
              ) : (
                <Button title="Choose or add customer" leftIcon="person-add-outline" variant="secondary" onPress={() => setPickerOpen(true)} fullWidth />
              )}
            </View>

            {/* Services */}
            <View style={{ gap: spacing.sm }}>
              <SectionHeader
                title="Services"
                subtitle={selected.length ? `${selected.length} selected · ${formatDuration(totals.duration)} · ${formatCurrency(totals.price)}` : 'Pick one or more'}
                compact
              />
              <FilterChips options={categoryOptions} value={category} onChange={setCategory} allLabel="All" />
              <MultiChipSelect options={serviceOptions} value={serviceIds} onChange={setServiceIds} />
            </View>

            {/* Staff */}
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Stylist" compact />
              {serviceIds.length === 0 ? (
                <Text variant="bodySmall" tone="muted">
                  Choose services first.
                </Text>
              ) : qualified.length === 0 ? (
                <Text variant="bodySmall" tone="warning">
                  No single stylist offers all these services. Book them as separate appointments.
                </Text>
              ) : (
                <ChipSelect options={qualified.map((m) => ({ value: m.id, label: m.name }))} value={staffMember ? staffId : null} onChange={setStaffId} />
              )}
              {staffId && serviceIds.length > 0 && !staffMember && qualified.length > 0 ? (
                <Text variant="caption" tone="warning">
                  The previous stylist does not offer all selected services. Pick another.
                </Text>
              ) : null}
            </View>

            {/* Date & time */}
            <View style={{ gap: spacing.sm }}>
              <SectionHeader title="Date & time" compact />
              <DatePickerField value={date} onChange={(value) => setDate(value)} minDate={todayISO()} isDateDisabled={(day) => selectHolidayOn(holidays, day) !== undefined} />
              {holiday ? (
                <Text variant="bodySmall" tone="danger">
                  The parlour is closed on this day ({holiday.name}).
                </Text>
              ) : staffOff ? (
                <Text variant="bodySmall" tone="danger">
                  {staffMember?.name} is not working on this day.
                </Text>
              ) : staffMember && serviceIds.length > 0 ? (
                <TimeSlotGrid slots={slots.data ?? []} value={time} onChange={setTime} loading={slots.loading} emptyMessage="No start times fit this booking on this day." />
              ) : null}
            </View>

            {/* Conflict panel */}
            {date && (staffId || customerId) && sameDay.length > 0 ? (
              <Card
                variant="outlined"
                style={{ gap: spacing.sm, borderColor: clashes.length ? colors.danger : colors.border, backgroundColor: clashes.length ? colors.dangerSoft : colors.surface }}
              >
                <View style={styles.row}>
                  <Icon name={clashes.length ? 'warning' : 'information-circle-outline'} size={18} color={clashes.length ? colors.danger : colors.info} />
                  <Text variant="label" tone={clashes.length ? 'danger' : 'default'} style={styles.flex}>
                    {clashes.length ? `Clashes with ${clashes.length} booking${clashes.length === 1 ? '' : 's'}` : 'Already booked that day'}
                  </Text>
                </View>
                {sameDay.map((a) => {
                  const clash = clashes.includes(a);
                  return (
                    <Text key={a.id} variant="caption" tone={clash ? 'danger' : 'secondary'}>
                      {formatTimeRange(a.startTime, a.endTime)} · {customers.get(a.customerId)?.name ?? 'Customer'}
                      {a.staffId === staffId ? ` with ${staffMember?.name.split(' ')[0] ?? 'this stylist'}` : ' (same customer, other stylist)'}
                      {clash ? '  ← clash' : ''}
                    </Text>
                  );
                })}
              </Card>
            ) : null}

            <Input label="Notes" placeholder="Allergies, references, phone booking details…" value={notes} onChangeText={setNotes} multiline maxLength={200} showCount />

            {time && endTime && canSave ? (
              <Card variant="filled" style={{ gap: 2 }}>
                <Text variant="label">
                  {formatTime12(time)} – {formatTime12(endTime)} · {formatCurrency(totals.price)}
                </Text>
                <Text variant="caption" tone="muted">
                  {editingId ? 'The customer will be notified of the change.' : 'Admin bookings are confirmed straight away.'}
                </Text>
              </Card>
            ) : null}
            {serverError ? (
              <Text variant="bodySmall" tone="danger">
                {serverError}
              </Text>
            ) : null}
            <Button title={editingId ? 'Save changes' : 'Book appointment'} size="lg" disabled={!canSave} loading={saving} onPress={() => void save()} fullWidth />
          </View>
        )}
      </QueryState>

      <SelectSheet<Customer>
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setNewCustomer(null);
        }}
        title="Customer"
        placeholder="Search name or phone"
        items={customerList}
        keyOf={(c) => c.id}
        searchText={(c) => `${c.name} ${c.phone}`}
        onSelect={(c) => {
          setCustomerId(c.id);
          setPickerOpen(false);
        }}
        renderItem={(c) => (
          <View style={[styles.pickRow, { borderRadius: radius.md, backgroundColor: c.id === customerId ? colors.primarySoft : 'transparent' }]}>
            <Avatar name={c.name} uri={c.avatar} size="sm" />
            <View style={styles.flex}>
              <Text variant="bodyMedium">{c.name}</Text>
              <Text variant="caption" tone="muted">
                {formatPhone(c.phone)}
              </Text>
            </View>
          </View>
        )}
        header={
          newCustomer ? (
            <Card variant="filled" style={{ gap: spacing.md }}>
              <Text variant="label">New customer</Text>
              <Input label="Full name" value={newCustomer.name} onChangeText={(name) => setNewCustomer({ ...newCustomer, name })} />
              <PhoneInput value={newCustomer.phone} onChangeText={(phone) => setNewCustomer({ ...newCustomer, phone })} />
              <View style={styles.row}>
                <Button title="Cancel" variant="ghost" onPress={() => setNewCustomer(null)} />
                <Button title="Add & select" disabled={!newCustomerValid} onPress={() => void createCustomer()} style={styles.flex} fullWidth />
              </View>
            </Card>
          ) : (
            <Button title="New customer" leftIcon="person-add-outline" variant="outline" onPress={() => setNewCustomer({ name: '', phone: '' })} fullWidth />
          )
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8 },
});
