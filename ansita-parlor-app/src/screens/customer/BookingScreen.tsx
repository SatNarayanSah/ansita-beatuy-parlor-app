import { usePreventRemove } from '@react-navigation/native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateCalendar } from '@/components/customer/DateCalendar';
import { CUSTOMER_PAYMENT_METHODS, PaymentMethodPicker } from '@/components/customer/PaymentMethodPicker';
import { PromoCodeCard, usePromoQuote } from '@/components/customer/PromoCodeCard';
import { ServiceRow } from '@/components/customer/ServiceCards';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  FilterChips,
  Icon,
  Input,
  QueryState,
  SkeletonListItem,
  Stepper,
  Text,
  TimeSlotGrid,
  useToast,
  type FilterOption,
} from '@/components/ui';
import { isIconName } from '@/components/ui/Icon';
import { useAdoptParam } from '@/hooks/useAdoptParam';
import { ANY_STAFF, useFreeSlots, useIsDayOff, useQualifiedStaff, type FreeSlot, type StaffChoice } from '@/hooks/useBookingAvailability';
import { useCategoryMap, useServiceMap } from '@/hooks/useCatalog';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT, type TranslationKey, type Translate } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, catalogService, getErrorMessage, isApiError } from '@/services';
import { selectCurrentUser, useAuthStore, useServiceStore, useSettingsStore } from '@/store';
import { useTheme } from '@/theme';
import type { ID, ISODate, PaymentMethod, Staff, Weekday } from '@/types';
import { addMinutesToTime, formatDisplayDate, formatTime12, formatTimeRange } from '@/utils/date';
import { formatCurrency, formatDuration, formatEnumLabel } from '@/utils/format';

type Props = RootStackScreenProps<'Booking'>;

const STEP_KEYS = ['booking.step.services', 'booking.step.stylist', 'booking.step.date', 'booking.step.time', 'booking.step.review'] as const;
const LAST_STEP = STEP_KEYS.length - 1;

const DAY_KEYS: Record<Weekday, TranslationKey> = {
  sun: 'day.sun',
  mon: 'day.mon',
  tue: 'day.tue',
  wed: 'day.wed',
  thu: 'day.thu',
  fri: 'day.fri',
  sat: 'day.sat',
};

const offDaysLabel = (t: Translate, member: Staff): string => {
  const off = member.workingHours.filter((hours) => hours.isOff).map((hours) => t(DAY_KEYS[hours.day]));
  return off.length ? t('booking.offOn', { days: off.join(', ') }) : t('booking.worksEveryDay');
};

// ---------- Step 2: stylist ----------

interface StaffOptionProps {
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
  leading: ReactNode;
  trailing?: ReactNode;
}

const StaffOption = ({ selected, onPress, title, subtitle, leading, trailing }: StaffOptionProps) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${subtitle}`}
      style={[
        styles.option,
        {
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : colors.surface,
        },
      ]}
    >
      {leading}
      <View style={styles.flex}>
        <Text variant="h4">{title}</Text>
        <Text variant="caption" tone="secondary">
          {subtitle}
        </Text>
      </View>
      {trailing}
      <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.primary : colors.textMuted} />
    </Pressable>
  );
};

// ---------- Screen ----------

/**
 * Five-step booking: services -> stylist -> date -> time -> review.
 * Only free slots are offered, computed from the stylist's hours, existing
 * bookings and the total duration of the selected services.
 */
export const BookingScreen = ({ navigation, route }: Props) => {
  const { colors, spacing, radius, shadows } = useTheme();
  const t = useT();
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const preferences = useSettingsStore((state) => state.preferences);
  const serviceMap = useServiceMap();
  const categories = useCategoryMap();

  const presetServices = route.params?.serviceIds ?? [];
  const [serviceIds, setServiceIds] = useState<ID[]>(presetServices);
  const qualified = useQualifiedStaff(serviceIds);

  const presetStaff = route.params?.staffId ?? preferences.favoriteStaffId;
  const [staffChoiceRaw, setStaffChoice] = useState<StaffChoice | null>(() =>
    presetStaff && qualified.some((member) => member.id === presetStaff) ? presetStaff : null,
  );
  // Later choices are stored raw and validated here, so changing an earlier
  // step silently drops whatever no longer fits (no syncing effects).
  const staffChoice = staffChoiceRaw === ANY_STAFF || qualified.some((member) => member.id === staffChoiceRaw) ? staffChoiceRaw : null;
  const [step, setStep] = useState(() => (presetServices.length === 0 ? 0 : route.params?.staffId && staffChoice ? 2 : 1));
  const [dateRaw, setDate] = useState<ISODate | null>(null);
  const [slotPick, setSlotPick] = useState<{ context: string; slot: FreeSlot } | null>(null);
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>(
    CUSTOMER_PAYMENT_METHODS.includes(preferences.paymentMethod) ? preferences.paymentMethod : 'cash',
  );
  const [categoryFilter, setCategoryFilter] = useState<ID | null>(route.params?.categoryId ?? null);
  const [bookedId, setBookedId] = useState<ID | null>(null);

  const catalog = useServiceQuery(() => catalogService.listServices({ activeOnly: true }), [], { refetchOn: [useServiceStore] });
  const isDayOff = useIsDayOff(staffChoice, qualified);
  const date = dateRaw && !isDayOff(dateRaw) ? dateRaw : null;
  // A picked slot only counts for the date, stylist and services it was picked for.
  const slotContext = `${date}|${staffChoice}|${serviceIds.join(',')}`;
  const slot = slotPick?.context === slotContext ? slotPick.slot : null;
  const setSlot = (next: FreeSlot | null): void => setSlotPick(next ? { context: slotContext, slot: next } : null);
  const slots = useFreeSlots({ date, choice: step >= 3 ? staffChoice : null, qualified, serviceIds });
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(() => serviceIds.map((id) => serviceMap.get(id)).filter((s) => s !== undefined), [serviceIds, serviceMap]);
  const totals = useMemo(
    () => selected.reduce((sum, service) => ({ price: sum.price + service.price, duration: sum.duration + service.duration }), { price: 0, duration: 0 }),
    [selected],
  );
  const slotStaff = slot ? qualified.find((member) => member.id === slot.staffId) : undefined;

  // Promo code (prefilled from an offer) and the automatic offer, previewed on the review step.
  const promo = usePromoQuote({ serviceIds, date, enabled: step === LAST_STEP && slot !== null, initialCode: route.params?.offerCode });
  useAdoptParam(route.params?.offerCode, promo.adopt);
  const discount = promo.quote?.offer ? promo.quote.discount : 0;
  const payable = Math.max(0, totals.price - discount);

  // Back steps backwards through the flow instead of leaving it.
  usePreventRemove(step > 0 && bookedId === null, () => setStep((current) => Math.max(0, current - 1)));

  useEffect(() => {
    if (bookedId) navigation.replace('BookingSuccess', { appointmentId: bookedId });
  }, [bookedId, navigation]);

  const toggleService = (id: ID): void =>
    setServiceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const canContinue = [
    serviceIds.length > 0 && qualified.length > 0,
    staffChoice !== null,
    date !== null,
    slot !== null,
    // Wait for the offer preview so the total shown is what gets booked.
    !promo.pending,
  ][step];

  const confirm = async (): Promise<void> => {
    if (!user?.customerId || !date || !slot) return;
    setSubmitting(true);
    try {
      const appointment = await appointmentService.createAppointment({
        customerId: user.customerId,
        serviceIds,
        staffId: slot.staffId,
        date,
        startTime: slot.time,
        notes,
        preferredPaymentMethod: payment,
        // Empty lets the server apply the best automatic offer.
        offerCode: promo.codeToSend,
      });
      setBookedId(appointment.id);
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Someone else just took the slot: send the customer back to pick another.
      if (isApiError(error) && error.code === 'CONFLICT') setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const next = (): void => {
    if (step === LAST_STEP) void confirm();
    else setStep(step + 1);
  };

  const categoryOptions = useMemo<FilterOption<ID>[]>(
    () => [...categories.values()].map((c) => ({ value: c.id, label: c.name, icon: isIconName(c.icon) ? c.icon : undefined })),
    [categories],
  );

  // ---------- Step bodies ----------

  const servicesStep = (
    <View style={{ gap: spacing.md }}>
      <Text variant="bodySmall" tone="secondary">
        {t('booking.pickServices')}
      </Text>
      {promo.code ? (
        <View style={styles.inline}>
          <Icon name="pricetag-outline" size={16} color={colors.primary} />
          <Text variant="caption" tone="secondary" style={styles.flex}>
            {t('promo.ready', { code: promo.code })}
          </Text>
        </View>
      ) : null}
      <FilterChips options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} allLabel={t('services.all')} />
      <QueryState
        query={catalog}
        skeleton={
          <View style={{ gap: spacing.md }}>
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </View>
        }
        isEmpty={(list) => list.length === 0}
        empty={{ icon: 'sparkles-outline', title: t('booking.noServices'), message: t('booking.noServicesHint') }}
      >
        {(list) => (
          <View style={{ gap: spacing.sm }}>
            {list
              .filter((service) => (categoryFilter ? service.categoryId === categoryFilter : true))
              .map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  category={categories.get(service.categoryId)}
                  selected={serviceIds.includes(service.id)}
                  onPress={() => toggleService(service.id)}
                />
              ))}
          </View>
        )}
      </QueryState>
    </View>
  );

  const stylistStep = (
    <View style={{ gap: spacing.md }}>
      <Text variant="bodySmall" tone="secondary">
        {t(qualified.length === 1 ? 'booking.qualifiedOne' : 'booking.qualifiedMany', {
          count: qualified.length,
          what: t(selected.length === 1 ? 'booking.thisService' : 'booking.allTheseServices'),
        })}
      </Text>
      <StaffOption
        selected={staffChoice === ANY_STAFF}
        onPress={() => setStaffChoice(ANY_STAFF)}
        title={t('booking.anyStylist')}
        subtitle={t('booking.anyStylistHint')}
        leading={
          <View style={[styles.anyIcon, { backgroundColor: colors.highlightSoft, borderRadius: radius.pill }]}>
            <Icon name="sparkles" size={22} color={colors.highlight} />
          </View>
        }
      />
      {qualified.map((member) => (
        <StaffOption
          key={member.id}
          selected={staffChoice === member.id}
          onPress={() => setStaffChoice(member.id)}
          title={member.name}
          subtitle={`${formatEnumLabel(member.role)} · ★ ${member.rating} · ${offDaysLabel(t, member)}`}
          leading={<Avatar name={member.name} uri={member.avatar} size="md" />}
          trailing={member.id === preferences.favoriteStaffId ? <Icon name="heart" size={18} color={colors.primary} /> : undefined}
        />
      ))}
    </View>
  );

  const dateStep = (
    <View style={{ gap: spacing.md }}>
      <Card padding="sm">
        <DateCalendar value={date} onChange={setDate} isDisabled={isDayOff} />
      </Card>
      <View style={styles.inline}>
        <Icon name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text variant="caption" tone="muted" style={styles.flex}>
          {t(staffChoice === ANY_STAFF ? 'booking.greyedAny' : 'booking.greyedStaff')}
        </Text>
      </View>
    </View>
  );

  const timeStep = (
    <View style={{ gap: spacing.md }}>
      <Text variant="bodySmall" tone="secondary">
        {date ? `${formatDisplayDate(date)} · ` : ''}
        {t('booking.appointmentLength', { duration: formatDuration(totals.duration) })}
      </Text>
      {!slots.loading && (slots.data?.length ?? 0) === 0 ? (
        <Card variant="outlined" padding="none">
          <EmptyState
            compact
            icon="time-outline"
            title={t('booking.fullyBooked')}
            message={t('booking.fullyBookedHint')}
            actionLabel={t('booking.pickAnotherDate')}
            onAction={() => setStep(2)}
          />
        </Card>
      ) : (
        <TimeSlotGrid
          slots={slots.data ?? []}
          value={slot?.time ?? null}
          onChange={(time) => setSlot(slots.data?.find((item) => item.time === time) ?? null)}
          loading={slots.loading}
        />
      )}
      {slot && staffChoice === ANY_STAFF && slotStaff ? (
        <Animated.View entering={FadeIn} style={styles.inline}>
          <Icon name="person-circle-outline" size={18} color={colors.primary} />
          <Text variant="bodySmall" style={styles.flex}>
            {t('booking.withStaff', { name: slotStaff.name })}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );

  const reviewStep = (
    <View style={{ gap: spacing.md }}>
      <Card style={{ gap: spacing.sm }}>
        {selected.map((service) => (
          <View key={service.id} style={styles.lineItem}>
            <View style={styles.flex}>
              <Text variant="bodyMedium">{service.name}</Text>
              <Text variant="caption" tone="muted">
                {formatDuration(service.duration)}
              </Text>
            </View>
            <Text variant="bodyMedium">{formatCurrency(service.price)}</Text>
          </View>
        ))}
        <Divider />
        {discount > 0 && promo.quote?.offer ? (
          <>
            <View style={styles.lineItem}>
              <Text variant="bodyMedium" tone="secondary" style={styles.flex}>
                {t('bill.subtotal')}
              </Text>
              <Text variant="bodyMedium" tone="secondary">
                {formatCurrency(totals.price)}
              </Text>
            </View>
            <View style={styles.lineItem}>
              <Text variant="bodyMedium" tone="success" style={styles.flex}>
                {promo.codeToSend
                  ? t('bill.offerWithCode', { title: promo.quote.offer.title, code: promo.codeToSend })
                  : t('bill.offer', { title: promo.quote.offer.title })}
              </Text>
              <Text variant="bodyMedium" tone="success">
                −{formatCurrency(discount)}
              </Text>
            </View>
          </>
        ) : null}
        <View style={styles.lineItem}>
          <Text variant="h4" style={styles.flex}>
            {t('bill.total')}
          </Text>
          <Text variant="h3" tone="primary">
            {formatCurrency(payable)}
          </Text>
        </View>
      </Card>

      <PromoCodeCard state={promo} />

      <Card padding="sm">
        <View style={[styles.summaryRow, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }]}>
          <Icon name="calendar-outline" size={18} color={colors.primary} />
          <Text variant="bodyMedium" style={styles.flex}>
            {date ? formatDisplayDate(date) : ''}
          </Text>
          <Button title={t('booking.change')} size="sm" variant="ghost" onPress={() => setStep(2)} />
        </View>
        <View style={[styles.summaryRow, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }]}>
          <Icon name="time-outline" size={18} color={colors.primary} />
          <Text variant="bodyMedium" style={styles.flex}>
            {slot ? formatTimeRange(slot.time, addMinutesToTime(slot.time, totals.duration)) : ''}
          </Text>
          <Button title={t('booking.change')} size="sm" variant="ghost" onPress={() => setStep(3)} />
        </View>
        <View style={[styles.summaryRow, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs }]}>
          <Icon name="person-outline" size={18} color={colors.primary} />
          <Text variant="bodyMedium" style={styles.flex}>
            {slotStaff?.name ?? ''}
          </Text>
          <Button title={t('booking.change')} size="sm" variant="ghost" onPress={() => setStep(1)} />
        </View>
      </Card>

      <Input
        label={t('booking.notesLabel')}
        placeholder={t('booking.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={200}
        showCount
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" tone="secondary">
          {t('booking.howPay')}
        </Text>
        <PaymentMethodPicker value={payment} onChange={setPayment} />
      </View>

      <View style={styles.inline}>
        <Icon name="shield-checkmark-outline" size={16} color={colors.success} />
        <Text variant="caption" tone="muted" style={styles.flex}>
          {t('booking.requestNote')}
        </Text>
      </View>
    </View>
  );

  const bodies = [servicesStep, stylistStep, dateStep, timeStep, reviewStep];

  const footerHint =
    step === 0
      ? serviceIds.length === 0
        ? t('booking.hint.selectService')
        : qualified.length === 0
          ? t('booking.hint.cantCombine')
          : t('booking.hint.selected', { count: serviceIds.length, duration: formatDuration(totals.duration), price: formatCurrency(totals.price) })
      : step === 3 && slot
        ? t('booking.hint.slot', { time: formatTime12(slot.time) })
        : null;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <View style={[styles.capped, { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs }]}>
          <Stepper steps={STEP_KEYS.map((key) => t(key))} current={step} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={[styles.capped, { padding: spacing.md, paddingBottom: spacing.xl }]}
        >
          <Animated.View key={step} entering={FadeInRight.duration(220)}>
            {bodies[step]}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, shadows.lg, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, gap: spacing.sm }]}>
          <View style={[styles.capped, { gap: spacing.sm }]}>
            {footerHint ? (
              <View style={styles.inline}>
                {step === 0 && serviceIds.length > 0 && qualified.length === 0 ? <Badge label={t('booking.cantCombine')} tone="warning" size="sm" /> : null}
                <Text variant="caption" tone={step === 0 && serviceIds.length > 0 && qualified.length === 0 ? 'warning' : 'secondary'} style={styles.flex}>
                  {footerHint}
                </Text>
              </View>
            ) : null}
            <View style={styles.buttons}>
              {step > 0 ? <Button title={t('common.back')} variant="outline" onPress={() => setStep(step - 1)} /> : null}
              <Button
                title={step === LAST_STEP ? t('booking.confirm') : t('common.next')}
                rightIcon={step === LAST_STEP ? 'checkmark' : 'arrow-forward'}
                disabled={!canContinue}
                loading={submitting}
                onPress={next}
                style={styles.flex}
                fullWidth
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  capped: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  flex: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  anyIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  buttons: { flexDirection: 'row', gap: 12 },
});

