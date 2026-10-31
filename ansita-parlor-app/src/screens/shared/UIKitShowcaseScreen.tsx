import { useState, type ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import {
  Avatar,
  AvatarGroup,
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  CountBadge,
  DatePickerField,
  Divider,
  EmptyState,
  FAB,
  FilterChips,
  IconButton,
  Input,
  ListItem,
  PhoneInput,
  RatingStars,
  Screen,
  SearchBar,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  SkeletonCard,
  SkeletonListItem,
  SkeletonText,
  StatCard,
  StatusPill,
  Text,
  ThemeModeSelector,
  TimeSlotGrid,
  useToast,
  type ButtonVariant,
  type FilterOption,
} from '@/components/ui';
import { getToneColors, useTheme, type Tone, type TypographyVariant } from '@/theme';
import type { AppointmentStatus, EnrollmentStatus, ISODate, PaymentStatus, TimeSlot, TimeString } from '@/types';
import { addDaysISO, generateTimeSlots, todayISO, weekdayOf } from '@/utils/date';

// ---------- Sample data ----------

const TONES: readonly Tone[] = ['neutral', 'primary', 'accent', 'highlight', 'success', 'warning', 'danger', 'info'];
const BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger'];
const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
const PAYMENT_STATUSES: readonly PaymentStatus[] = ['unpaid', 'partial', 'paid', 'refunded'];
const ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = ['pending', 'active', 'completed', 'dropped'];
const TYPE_SCALE: readonly TypographyVariant[] = [
  'display',
  'h1',
  'h2',
  'h3',
  'h4',
  'body',
  'bodyMedium',
  'bodySmall',
  'label',
  'caption',
  'button',
  'overline',
];

type Category = 'hair' | 'skin' | 'nails' | 'bridal' | 'spa';
const CATEGORY_OPTIONS: readonly FilterOption<Category>[] = [
  { value: 'hair', label: 'Hair', icon: 'cut-outline', count: 12 },
  { value: 'skin', label: 'Skin', icon: 'sparkles-outline', count: 8 },
  { value: 'nails', label: 'Nails', icon: 'color-palette-outline', count: 5 },
  { value: 'bridal', label: 'Bridal', icon: 'diamond-outline', count: 3 },
  { value: 'spa', label: 'Spa', icon: 'leaf-outline', count: 6 },
];

type Period = 'upcoming' | 'past';
const PERIOD_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
] as const;

const BOOKED: ReadonlySet<TimeString> = new Set(['10:00', '11:30', '14:00', '14:30', '17:00']);
const SLOTS: readonly TimeSlot[] = generateTimeSlots('09:00', '19:00', 30).map((time) => ({
  time,
  available: !BOOKED.has(time),
}));

const SAMPLE_PHOTO = 'https://i.pravatar.cc/200?img=47';

// ---------- Layout helpers ----------

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </View>
  );
};

const Row = ({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) => (
  <View style={[styles.row, wrap && styles.wrap]}>{children}</View>
);

const Caption = ({ children }: { children: ReactNode }) => (
  <Text variant="overline" tone="muted">
    {children}
  </Text>
);

const Swatch = ({ name, color, textColor }: { name: string; color: string; textColor?: string }) => {
  const { colors, radius } = useTheme();
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: color, borderRadius: radius.md, borderColor: colors.border }]}>
        {textColor ? (
          <Text variant="label" color={textColor}>
            Aa
          </Text>
        ) : null}
      </View>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
};

// ---------- Sections ----------

const FoundationsSection = () => {
  const theme = useTheme();
  const { colors, spacing, radius, shadows } = theme;

  const core: [string, string, string?][] = [
    ['primary', colors.primary, colors.onPrimary],
    ['primaryDark', colors.primaryDark, colors.onPrimary],
    ['primarySoft', colors.primarySoft, colors.primaryDark],
    ['accent', colors.accent, colors.onAccent],
    ['accentSoft', colors.accentSoft, colors.accent],
    ['highlight', colors.highlight],
    ['background', colors.background, colors.text],
    ['surface', colors.surface, colors.text],
    ['surfaceAlt', colors.surfaceAlt, colors.text],
    ['border', colors.border],
    ['text', colors.text],
    ['textMuted', colors.textMuted],
    ['success', colors.success],
    ['warning', colors.warning],
    ['danger', colors.danger],
    ['info', colors.info],
  ];

  return (
    <Section title="Foundations" subtitle={`Active scheme: ${theme.scheme}`}>
      <Card style={{ gap: spacing.md }}>
        <Caption>Appearance</Caption>
        <ThemeModeSelector />
      </Card>

      <Caption>Colour tokens</Caption>
      <View style={styles.swatchGrid}>
        {core.map(([name, color, textColor]) => (
          <Swatch key={name} name={name} color={color} textColor={textColor} />
        ))}
      </View>

      <Caption>Appointment status tokens</Caption>
      <View style={styles.swatchGrid}>
        {APPOINTMENT_STATUSES.map((status) => (
          <Swatch key={status} name={status} color={colors.status[status].bg} textColor={colors.status[status].fg} />
        ))}
      </View>

      <Caption>Type scale</Caption>
      <Card variant="outlined" style={{ gap: spacing.sm }}>
        {TYPE_SCALE.map((variant) => (
          <View key={variant} style={styles.typeRow}>
            <Text variant="caption" tone="muted" style={styles.typeLabel}>
              {variant}
            </Text>
            <Text variant={variant} style={styles.flex} numberOfLines={1}>
              Ansita Beauty
            </Text>
          </View>
        ))}
      </Card>

      <Caption>Spacing (4pt grid)</Caption>
      <Card variant="outlined" style={{ gap: spacing.xs }}>
        {(Object.entries(spacing) as [string, number][])
          .filter(([, value]) => value > 0)
          .map(([key, value]) => (
            <View key={key} style={styles.typeRow}>
              <Text variant="caption" tone="muted" style={styles.typeLabel}>
                {key} · {value}
              </Text>
              <View style={{ width: value * 3, height: 10, borderRadius: 3, backgroundColor: colors.primaryMuted }} />
            </View>
          ))}
      </Card>

      <Caption>Radii & shadows</Caption>
      <Row>
        {(['sm', 'md', 'lg', 'xl'] as const).map((key) => (
          <View key={key} style={styles.radiusItem}>
            <View
              style={[
                styles.radiusBox,
                shadows[key === 'sm' ? 'sm' : key === 'md' ? 'md' : 'lg'],
                { borderRadius: radius[key], backgroundColor: colors.surface },
              ]}
            />
            <Text variant="caption" tone="secondary">
              {key} · {radius[key]}
            </Text>
          </View>
        ))}
      </Row>
    </Section>
  );
};

const ButtonsSection = () => {
  const { spacing } = useTheme();
  const [loading, setLoading] = useState(false);

  const fakeSubmit = (): void => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <Section title="Button" subtitle="Variants, sizes, icons, loading and disabled">
      {BUTTON_VARIANTS.map((variant) => (
        <View key={variant} style={{ gap: spacing.sm }}>
          <Caption>{variant}</Caption>
          <Row>
            <Button title="Book now" variant={variant} onPress={fakeSubmit} />
            <Button title="Icon" variant={variant} leftIcon="calendar-outline" onPress={fakeSubmit} />
            <Button title="Loading" variant={variant} loading />
            <Button title="Disabled" variant={variant} disabled />
          </Row>
        </View>
      ))}
      <Caption>Sizes</Caption>
      <Row>
        <Button title="Small" size="sm" />
        <Button title="Medium" size="md" />
        <Button title="Large" size="lg" />
      </Row>
      <Button title="Confirm booking" rightIcon="arrow-forward" loading={loading} onPress={fakeSubmit} fullWidth />

      <Caption>IconButton</Caption>
      <Row>
        <IconButton icon="notifications-outline" accessibilityLabel="Notifications" badgeCount={3} />
        <IconButton icon="heart-outline" accessibilityLabel="Favourite" variant="soft" />
        <IconButton icon="add" accessibilityLabel="Add" variant="filled" />
        <IconButton icon="share-outline" accessibilityLabel="Share" variant="outline" />
        <IconButton icon="trash-outline" accessibilityLabel="Delete" disabled />
      </Row>
    </Section>
  );
};

const InputsSection = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('priya@example');
  const [password, setPassword] = useState('secret123');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneWithError, setPhoneWithError] = useState('+97798');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState<ISODate | null>(null);
  const [dob, setDob] = useState<ISODate | null>('1998-04-12');

  return (
    <Section title="Inputs" subtitle="Input, PhoneInput, SearchBar, DatePickerField">
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search services, staff…" />
      <Input label="Full name" required placeholder="e.g. Priya Sharma" leftIcon="person-outline" value={name} onChangeText={setName} />
      <Input
        label="Email"
        leftIcon="mail-outline"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={email.includes('.') ? null : 'Enter a valid email address'}
      />
      <Input label="Password" leftIcon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry helperText="At least 8 characters" />
      <Input label="Branch" leftIcon="business-outline" value="Kathmandu — New Road" disabled />
      <Input
        label="Notes"
        placeholder="Allergies, preferences…"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={200}
        showCount
      />
      <PhoneInput value={phone} onChangeText={setPhone} required helperText="Default country: Nepal (+977)" />
      <PhoneInput label="Alternate number" value={phoneWithError} onChangeText={setPhoneWithError} error="Enter a 10-digit mobile number" />
      <DatePickerField
        label="Appointment date"
        value={date}
        onChange={setDate}
        minDate={todayISO()}
        maxDate={addDaysISO(todayISO(), 60)}
        isDateDisabled={(day) => weekdayOf(day) === 'tue'}
        markedDates={[addDaysISO(todayISO(), 2), addDaysISO(todayISO(), 5)]}
        helperText="Closed on Tuesdays"
        clearable
      />
      <DatePickerField label="Date of birth" value={dob} onChange={setDob} maxDate={todayISO()} showYearControls />
      <DatePickerField label="Disabled date" value={null} onChange={() => undefined} disabled />
    </Section>
  );
};

const DisplaySection = () => {
  const { spacing } = useTheme();
  const [rating, setRating] = useState(4);

  return (
    <Section title="Display" subtitle="Card, Badge, StatusPill, Avatar, RatingStars, Divider">
      <Caption>Card variants</Caption>
      <Card>
        <Text variant="h3">Elevated</Text>
        <Text variant="bodySmall" tone="secondary">
          Default card with a soft shadow.
        </Text>
      </Card>
      <Card variant="outlined">
        <Text variant="h3">Outlined</Text>
        <Text variant="bodySmall" tone="secondary">
          Hairline border, no shadow.
        </Text>
      </Card>
      <Card variant="filled" onPress={() => undefined} accessibilityLabel="Pressable card">
        <Text variant="h3">Filled + pressable</Text>
        <Text variant="bodySmall" tone="secondary">
          Tap me to see the scale effect.
        </Text>
      </Card>

      <Caption>Badge tones (soft / solid / outline)</Caption>
      {(['soft', 'solid', 'outline'] as const).map((variant) => (
        <Row key={variant}>
          {TONES.map((tone) => (
            <Badge key={tone} label={tone} tone={tone} variant={variant} size="sm" />
          ))}
        </Row>
      ))}
      <Row>
        <Badge label="Bestseller" tone="highlight" icon="star" />
        <Badge label="New" tone="primary" dot />
        <CountBadge count={5} />
        <CountBadge count={140} />
      </Row>

      <Caption>StatusPill — appointment</Caption>
      <Row>
        {APPOINTMENT_STATUSES.map((status) => (
          <StatusPill key={status} kind="appointment" status={status} />
        ))}
      </Row>
      <Caption>StatusPill — payment</Caption>
      <Row>
        {PAYMENT_STATUSES.map((status) => (
          <StatusPill key={status} kind="payment" status={status} size="sm" />
        ))}
      </Row>
      <Caption>StatusPill — enrollment</Caption>
      <Row>
        {ENROLLMENT_STATUSES.map((status) => (
          <StatusPill key={status} kind="enrollment" status={status} size="sm" />
        ))}
      </Row>

      <Caption>Avatar</Caption>
      <Row>
        <Avatar name="Ansita Shrestha" uri={SAMPLE_PHOTO} size="xl" ring />
        <Avatar name="Priya Sharma" size="lg" editable onPress={() => undefined} />
        <Avatar name="Sunita Gurung" size="md" />
        <Avatar name="Broken Image" uri="https://invalid.example/x.png" size="md" />
        <Avatar name="Maya Rai" size="sm" />
        <Avatar name="Kabita" size="xs" />
      </Row>
      <AvatarGroup names={['Asha K', 'Bina T', 'Chandra L', 'Dipa M', 'Esha P', 'Gita R']} />

      <Caption>RatingStars</Caption>
      <RatingStars value={4.6} showValue count={128} />
      <View style={[styles.row, { gap: spacing.md }]}>
        <RatingStars value={rating} onChange={setRating} size={30} />
        <Text variant="label" tone="secondary">
          {rating}/5
        </Text>
      </View>

      <Caption>Divider</Caption>
      <Divider />
      <Divider label="or continue with" spacing="sm" />
      <View style={[styles.row, styles.dividerRow]}>
        <Text variant="bodySmall">Left</Text>
        <Divider orientation="vertical" spacing="md" />
        <Text variant="bodySmall">Right</Text>
      </View>
    </Section>
  );
};

const SelectionSection = () => {
  const [category, setCategory] = useState<Category | null>(null);
  const [tags, setTags] = useState<Category[]>(['hair', 'spa']);
  const [period, setPeriod] = useState<Period>('upcoming');
  const [slot, setSlot] = useState<TimeString | null>('09:30');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [removable, setRemovable] = useState(['Keratin', 'Facial', 'Manicure']);

  return (
    <Section title="Selection" subtitle="Chip, FilterChips, SegmentedControl, TimeSlotGrid">
      <Caption>Chip states</Caption>
      <Row>
        <Chip label="Default" onPress={() => undefined} />
        <Chip label="Selected" selected onPress={() => undefined} />
        <Chip label="Icon" icon="cut-outline" onPress={() => undefined} />
        <Chip label="Count" count={4} onPress={() => undefined} />
        <Chip label="Disabled" disabled onPress={() => undefined} />
      </Row>
      <Row>
        {removable.map((label) => (
          <Chip key={label} label={label} onRemove={() => setRemovable((list) => list.filter((item) => item !== label))} />
        ))}
      </Row>

      <Caption>FilterChips — single select with “All”</Caption>
      <FilterChips options={CATEGORY_OPTIONS} value={category} onChange={setCategory} allLabel="All" />
      <Caption>FilterChips — multi select, wrapped</Caption>
      <FilterChips options={CATEGORY_OPTIONS} value={tags} onChange={setTags} multiple layout="wrap" />

      <Caption>SegmentedControl</Caption>
      <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

      <Caption>TimeSlotGrid</Caption>
      <Row>
        <Button title={slotsLoading ? 'Show slots' : 'Show loading'} size="sm" variant="secondary" onPress={() => setSlotsLoading((v) => !v)} />
        <Text variant="bodySmall" tone="secondary">
          Selected: {slot ?? 'none'}
        </Text>
      </Row>
      <TimeSlotGrid slots={SLOTS} value={slot} onChange={setSlot} loading={slotsLoading} />
      <TimeSlotGrid slots={[]} value={null} onChange={() => undefined} />
    </Section>
  );
};

const DataSection = () => {
  const { colors, spacing } = useTheme();
  const [statsLoading, setStatsLoading] = useState(false);
  const [notify, setNotify] = useState(true);

  return (
    <Section title="Data" subtitle="StatCard, ListItem, SectionHeader">
      <Row>
        <Button title={statsLoading ? 'Show values' : 'Show loading'} size="sm" variant="secondary" onPress={() => setStatsLoading((v) => !v)} />
      </Row>
      <View style={styles.statGrid}>
        <StatCard label="Today's bookings" value={18} icon="calendar-outline" trend={12} loading={statsLoading} style={styles.flex} />
        <StatCard label="Revenue" value="Rs 42,500" icon="cash-outline" tone="highlight" trend={-4} loading={statsLoading} style={styles.flex} />
      </View>
      <View style={styles.statGrid}>
        <StatCard label="Students" value={36} icon="school-outline" tone="accent" caption="3 batches running" loading={statsLoading} style={styles.flex} />
        <StatCard label="Rating" value="4.8" icon="star-outline" tone="success" caption="128 reviews" onPress={() => undefined} loading={statsLoading} style={styles.flex} />
      </View>

      <SectionHeader title="Upcoming" subtitle="Next 3 appointments" actionLabel="See all" onAction={() => undefined} />
      <SectionHeader title="Compact overline header" compact />

      <Card padding="sm">
        <ListItem
          title="Priya Sharma"
          subtitle="Hair spa · 45 min"
          left={<Avatar name="Priya Sharma" size="md" />}
          right={<StatusPill kind="appointment" status="confirmed" size="sm" />}
          onPress={() => undefined}
        />
        <Divider inset={60} />
        <ListItem
          title="Bridal makeup trial"
          subtitle="Sunita Gurung"
          description="Bring reference photos. Prefers a natural, dewy finish with soft rose tones."
          leftIcon="diamond-outline"
          leftIconTone="highlight"
          rightText="Rs 6,000"
          onPress={() => undefined}
        />
        <Divider inset={60} />
        <ListItem
          title="Booking reminders"
          subtitle="Push notification 1 hour before"
          leftIcon="notifications-outline"
          right={
            <Switch value={notify} onValueChange={setNotify} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.surface} />
          }
        />
        <Divider inset={60} />
        <ListItem title="Edit profile" leftIcon="person-outline" leftIconTone="accent" showChevron compact onPress={() => undefined} />
        <ListItem title="Disabled row" leftIcon="lock-closed-outline" leftIconTone="neutral" showChevron compact disabled onPress={() => undefined} />
        <ListItem title="Sign out" leftIcon="log-out-outline" destructive compact onPress={() => undefined} />
      </Card>
      <View style={{ height: spacing.xs }} />
    </Section>
  );
};

const FeedbackSection = () => {
  const { spacing } = useTheme();
  const toast = useToast();

  return (
    <Section title="Feedback" subtitle="Skeleton, EmptyState, Toast">
      <Caption>Skeleton</Caption>
      <Card variant="outlined" style={{ gap: spacing.md }}>
        <View style={styles.row}>
          <Skeleton circle height={48} />
          <View style={[styles.flex, { gap: spacing.sm }]}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={11} />
          </View>
        </View>
        <SkeletonText lines={3} />
      </Card>
      <SkeletonListItem />
      <SkeletonCard />

      <Caption>EmptyState</Caption>
      <Card variant="outlined" padding="none">
        <EmptyState
          icon="calendar-clear-outline"
          title="No appointments yet"
          message="Book your first visit and it will show up here."
          actionLabel="Book a service"
          onAction={() => toast.info('Booking flow comes in a later phase')}
          secondaryActionLabel="Browse services"
          onSecondaryAction={() => undefined}
        />
      </Card>
      <Card variant="outlined" padding="none">
        <EmptyState icon="search-outline" tone="accent" title="No results" message="Try a different search term." compact />
      </Card>

      <Caption>Toast / Snackbar</Caption>
      <Row>
        <Button title="Success" size="sm" variant="secondary" onPress={() => toast.success('Appointment booked for 3:30 PM')} />
        <Button title="Error" size="sm" variant="secondary" onPress={() => toast.error('Could not reach the server')} />
        <Button title="Info" size="sm" variant="secondary" onPress={() => toast.info('Salon closes early on Friday')} />
        <Button
          title="Warning"
          size="sm"
          variant="secondary"
          onPress={() => toast.show({ message: 'Only 2 seats left in this batch', type: 'warning' })}
        />
        <Button
          title="With action"
          size="sm"
          variant="secondary"
          onPress={() =>
            toast.show({
              message: 'Appointment cancelled',
              type: 'info',
              action: { label: 'Undo', onPress: () => toast.success('Appointment restored') },
            })
          }
        />
      </Row>
    </Section>
  );
};

const OverlaysSection = ({ fabVisible, onToggleFab }: { fabVisible: boolean; onToggleFab: (value: boolean) => void }) => {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = (): void => {
    setDeleting(true);
    setTimeout(() => {
      setDeleting(false);
      setDangerOpen(false);
      toast.success('Customer deleted');
    }, 1200);
  };

  return (
    <Section title="Overlays" subtitle="BottomSheet, ConfirmDialog, FAB">
      <Row>
        <Button title="Bottom sheet" leftIcon="albums-outline" variant="outline" onPress={() => setSheetOpen(true)} />
        <Button title="Confirm" variant="outline" onPress={() => setConfirmOpen(true)} />
        <Button title="Delete" variant="danger" leftIcon="trash-outline" onPress={() => setDangerOpen(true)} />
      </Row>
      <ListItem
        title="Show FAB"
        subtitle="Floating button, bottom-right"
        compact
        right={
          <Switch value={fabVisible} onValueChange={onToggleFab} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.surface} />
        }
      />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Hair spa"
        subtitle="45 min · Rs 1,800"
        footer={
          <>
            <Button title="Cancel" variant="outline" onPress={() => setSheetOpen(false)} style={styles.flex} fullWidth />
            <Button
              title="Book"
              onPress={() => {
                setSheetOpen(false);
                toast.success('Added to booking');
              }}
              style={styles.flex}
              fullWidth
            />
          </>
        }
      >
        <View style={{ gap: spacing.md }}>
          <Text variant="body" tone="secondary">
            Deep-conditioning treatment with a relaxing scalp massage. Drag the handle down, tap the backdrop, or press
            back to close.
          </Text>
          <RatingStars value={4.7} showValue count={86} />
          <Row>
            <Badge label="Bestseller" tone="highlight" icon="star" />
            <Badge label="Hair" tone="primary" />
          </Row>
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={confirmOpen}
        title="Confirm appointment?"
        message="Priya Sharma · Hair spa · Today at 3:30 PM"
        icon="calendar-outline"
        confirmLabel="Confirm"
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success('Appointment confirmed');
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      <ConfirmDialog
        visible={dangerOpen}
        tone="danger"
        title="Delete customer?"
        message="Their visit history and notes will be removed. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDangerOpen(false)}
      />
    </Section>
  );
};

// ---------- Screen ----------

/** Dev-only gallery of every UI kit component, for visual checks in light and dark mode. */
export const UIKitShowcaseScreen = () => {
  const toast = useToast();
  const { colors } = useTheme();
  const [fabVisible, setFabVisible] = useState(true);
  const [fabExtended, setFabExtended] = useState(false);

  return (
    <Screen
      gap="huge"
      overlay={
        <FAB
          visible={fabVisible}
          label={fabExtended ? 'New booking' : undefined}
          icon="add"
          accessibilityLabel="New booking"
          onPress={() => {
            setFabExtended((value) => !value);
            toast.info('FAB pressed');
          }}
        />
      }
    >
      <View style={[styles.banner, { backgroundColor: getToneColors(colors, 'accent').bg }]}>
        <Text variant="overline" tone="accent">
          Ansita design system
        </Text>
        <Text variant="h1">UI Kit</Text>
        <Text variant="bodySmall" tone="secondary">
          Every component in its variants and states. Switch the theme below to check dark mode.
        </Text>
      </View>
      <FoundationsSection />
      <ButtonsSection />
      <InputsSection />
      <SelectionSection />
      <DisplaySection />
      <DataSection />
      <FeedbackSection />
      <OverlaysSection fabVisible={fabVisible} onToggleFab={setFabVisible} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  banner: { borderRadius: 20, padding: 20, gap: 4 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  swatch: { width: '25%', padding: 4, gap: 4 },
  swatchChip: { height: 48, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeLabel: { width: 84 },
  radiusItem: { alignItems: 'center', gap: 6, padding: 6 },
  radiusBox: { width: 60, height: 60 },
  dividerRow: { height: 24 },
  statGrid: { flexDirection: 'row', gap: 12 },
});
