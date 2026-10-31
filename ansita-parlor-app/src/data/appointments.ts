import { format } from 'date-fns';

import type {
  Appointment,
  AppointmentStatus,
  ID,
  PaymentMethod,
  PaymentStatus,
  Service,
  TimeString,
} from '@/types';
import {
  addMinutesToTime,
  combineDateTime,
  daysFromToday,
  generateTimeSlots,
  timeRangesOverlap,
  weekdayOf,
} from '@/utils/date';

import { CATEGORY_IDS } from './categories';
import { CUSTOMER_IDS as C, CUSTOMER_PROFILES, type CustomerProfile } from './customers';
import { pastTimestamp } from './helpers';
import { createRandom, type SeededRandom } from './random';
import { buildServices } from './services';
import { STAFF_IDS as S, STAFF_PROFILES, type StaffProfile } from './team';

/** Seeded history window: bookings run from 60 days ago to 30 days ahead. */
export const HISTORY_DAYS = 60;
export const FUTURE_DAYS = 30;

const SLOT_STEP_MINUTES = 30;

// ---------- Story bookings ----------

/**
 * Hand-written bookings that give the demo a narrative: the demo customer's
 * history, upcoming weddings and engagements. They are placed first; random
 * bookings then fill around them. If a story lands on a staff day off or a
 * taken slot, it moves to the nearest free slot.
 */
interface StoryBooking {
  customerId: ID;
  serviceIds: ID[];
  staffId: ID;
  dayOffset: number;
  startTime: TimeString;
  status?: AppointmentStatus;
  /** Advance or partial payment in NPR. */
  amountPaid?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  cancellationReason?: string;
}

const STORY_BOOKINGS: StoryBooking[] = [
  // Demo customer (Priya): a regular with a full history.
  { customerId: C.priya, serviceIds: ['svc_haircut', 'svc_hair_spa'], staffId: S.sarita, dayOffset: -52, startTime: '11:00', status: 'completed', paymentMethod: 'esewa' },
  { customerId: C.priya, serviceIds: ['svc_hydra_facial'], staffId: S.puja, dayOffset: -38, startTime: '14:00', status: 'completed', paymentMethod: 'khalti' },
  { customerId: C.priya, serviceIds: ['svc_cleanup'], staffId: S.puja, dayOffset: -27, startTime: '12:00', status: 'cancelled', cancellationReason: 'Travelling to Pokhara that week.' },
  { customerId: C.priya, serviceIds: ['svc_root_touchup'], staffId: S.sarita, dayOffset: -18, startTime: '15:00', status: 'completed', paymentMethod: 'cash', notes: 'Ammonia-free, shade 5.0.' },
  { customerId: C.priya, serviceIds: ['svc_gel_polish', 'svc_pedicure'], staffId: S.rojina, dayOffset: -6, startTime: '13:00', status: 'completed', paymentMethod: 'fonepay' },
  { customerId: C.priya, serviceIds: ['svc_global_color'], staffId: S.sarita, dayOffset: 2, startTime: '11:00', status: 'confirmed', notes: 'Wants a soft chocolate brown for Tihar.' },
  { customerId: C.priya, serviceIds: ['svc_eyebrow', 'svc_fruit_facial'], staffId: S.puja, dayOffset: 9, startTime: '15:00', status: 'pending' },
  // Brides and engagements: big-ticket bookings with advances.
  { customerId: C.sabina, serviceIds: ['svc_gold_facial'], staffId: S.puja, dayOffset: -21, startTime: '12:00', status: 'completed', paymentMethod: 'esewa', notes: 'Pre-bridal facial 1 of 3.' },
  { customerId: C.sabina, serviceIds: ['svc_hydra_facial', 'svc_detan'], staffId: S.puja, dayOffset: -7, startTime: '12:00', status: 'completed', paymentMethod: 'esewa', notes: 'Pre-bridal facial 2 of 3.' },
  { customerId: C.sabina, serviceIds: ['svc_bridal'], staffId: S.ansita, dayOffset: -4, startTime: '11:00', status: 'completed', amountPaid: 10000, paymentMethod: 'fonepay', notes: 'Bridal trial. Balance due on the wedding day.' },
  { customerId: C.sabina, serviceIds: ['svc_gold_facial'], staffId: S.puja, dayOffset: 3, startTime: '12:00', status: 'confirmed', notes: 'Pre-bridal facial 3 of 3.' },
  { customerId: C.sabina, serviceIds: ['svc_bridal'], staffId: S.ansita, dayOffset: 11, startTime: '11:00', status: 'confirmed', amountPaid: 10000, paymentMethod: 'fonepay', notes: 'Wedding day. Red Banarasi sari, traditional gold jewellery.' },
  { customerId: C.anjali, serviceIds: ['svc_engagement'], staffId: S.ansita, dayOffset: 13, startTime: '13:00', status: 'confirmed', amountPaid: 3000, paymentMethod: 'khalti', notes: 'Soft pastel look, pink lehenga.' },
  { customerId: C.kritika, serviceIds: ['svc_bridal'], staffId: S.ansita, dayOffset: 24, startTime: '11:00', status: 'pending', amountPaid: 5000, paymentMethod: 'esewa', notes: 'Newari bridal look with haku patasi option for the reception.' },
  { customerId: C.kritika, serviceIds: ['svc_bridal'], staffId: S.ansita, dayOffset: 6, startTime: '11:00', status: 'confirmed', notes: 'Bridal trial.' },
  { customerId: C.alisha, serviceIds: ['svc_engagement'], staffId: S.ansita, dayOffset: 15, startTime: '11:00', status: 'pending', amountPaid: 2000, paymentMethod: 'khalti' },
  { customerId: C.shreya, serviceIds: ['svc_party_makeup', 'svc_draping'], staffId: S.ansita, dayOffset: -30, startTime: '13:00', status: 'completed', paymentMethod: 'cash', notes: 'Teej celebration.' },
  { customerId: C.manisha, serviceIds: ['svc_body_massage'], staffId: S.rojina, dayOffset: -12, startTime: '15:00', status: 'no_show' },
];

// ---------- Random fill configuration ----------

/** Relative booking frequency by customer tag (the highest applicable tag wins). */
const CUSTOMER_WEIGHT: Record<string, number> = { vip: 5, regular: 3, bridal: 2, student: 1.5, new: 1, inactive: 0.4 };

/** Services male customers book in the seed data. */
const MALE_SERVICES: ReadonlySet<ID> = new Set(['svc_haircut', 'svc_kids_haircut', 'svc_head_massage', 'svc_body_massage']);

/** Big-ticket services appear only as story bookings. */
const STORY_ONLY_SERVICES: ReadonlySet<ID> = new Set(['svc_bridal', 'svc_engagement']);

/** Cheap add-ons that are often booked alongside a main service. */
const ADD_ONS: readonly ID[] = ['svc_eyebrow', 'svc_upper_lip', 'svc_detan', 'svc_draping'];

const PAYMENT_WEIGHTS: Record<PaymentMethod, number> = { cash: 40, esewa: 22, khalti: 14, fonepay: 18, card: 6 };
const DIGITAL_PAYMENT_WEIGHTS = { esewa: 4, khalti: 3, fonepay: 3 } as const;

const CANCELLATION_REASONS = [
  'Customer was unwell.',
  'Clashed with a family puja.',
  'Rescheduled due to load-shedding at home.',
  'Customer travelling outside the valley.',
  'Booked by mistake.',
  'Office meeting came up.',
] as const;

const NOTES = [
  'Prefers a quiet room.',
  'Running 10 minutes late, informed by phone.',
  'Patch test done last visit.',
  'Asked for organic products.',
  'Coming with a friend.',
  'Wants the same shade as last time.',
] as const;

// ---------- Scheduling ----------

interface Booking {
  customerId: ID;
  serviceIds: ID[];
  staffId: ID;
  dayOffset: number;
  startTime: TimeString;
  endTime: TimeString;
  story?: StoryBooking;
}

const shiftFor = (staff: StaffProfile, dayOffset: number) => {
  const day = weekdayOf(daysFromToday(dayOffset));
  const hours = staff.workingHours.find((entry) => entry.day === day);
  return hours && !hours.isOff ? hours : null;
};

class Schedule {
  readonly bookings: Booking[] = [];

  /** Returns a free start time for `staff` on that day, trying `preferred` first. */
  findSlot(
    random: SeededRandom,
    staff: StaffProfile,
    customerId: ID,
    dayOffset: number,
    duration: number,
    preferred?: TimeString,
  ): TimeString | null {
    const shift = shiftFor(staff, dayOffset);
    if (!shift) return null;
    const starts = generateTimeSlots(shift.start, shift.end, SLOT_STEP_MINUTES, duration);
    // Preferred time first, then the remaining slots in random order.
    const shuffled = random.shuffle(starts);
    const ordered = preferred && starts.includes(preferred) ? [preferred, ...shuffled.filter((t) => t !== preferred)] : shuffled;
    return ordered.find((start) => this.isFree(staff.id, customerId, dayOffset, start, addMinutesToTime(start, duration))) ?? null;
  }

  /** Neither the staff member nor the customer may be double-booked. */
  isFree(staffId: ID, customerId: ID, dayOffset: number, start: TimeString, end: TimeString): boolean {
    return !this.bookings.some(
      (booking) =>
        booking.dayOffset === dayOffset &&
        (booking.staffId === staffId || booking.customerId === customerId) &&
        timeRangesOverlap(start, end, booking.startTime, booking.endTime),
    );
  }

  add(booking: Booking): void {
    this.bookings.push(booking);
  }
}

const durationOf = (serviceIds: readonly ID[], services: ReadonlyMap<ID, Service>): number =>
  serviceIds.reduce((sum, id) => sum + (services.get(id)?.duration ?? 0), 0);

const placeStories = (random: SeededRandom, schedule: Schedule, services: ReadonlyMap<ID, Service>): void => {
  STORY_BOOKINGS.forEach((story) => {
    const staff = STAFF_PROFILES.find((member) => member.id === story.staffId);
    if (!staff) return;
    const duration = durationOf(story.serviceIds, services);
    // Search outward from the intended day, staying on the same side of today.
    const direction = story.dayOffset < 0 ? -1 : 1;
    for (let shift = 0; shift < 7; shift += 1) {
      const dayOffset = story.dayOffset + shift * direction;
      const start = schedule.findSlot(random, staff, story.customerId, dayOffset, duration, story.startTime);
      if (start) {
        schedule.add({ ...story, dayOffset, startTime: start, endTime: addMinutesToTime(start, duration), story });
        return;
      }
    }
  });
};

/** Bookings per staff member per working day: busiest this week, sparse further out. */
const dailyBookingWeights = (dayOffset: number): Record<'0' | '1' | '2' | '3', number> => {
  if (dayOffset === 0) return { '0': 0, '1': 1, '2': 3, '3': 2 };
  if (dayOffset < 0) return { '0': 62, '1': 30, '2': 8, '3': 0 };
  if (dayOffset <= 7) return { '0': 30, '1': 45, '2': 25, '3': 0 };
  return { '0': 78, '1': 18, '2': 4, '3': 0 };
};

const tagWeight = (customer: CustomerProfile): number =>
  Math.max(...customer.tags.map((tag) => CUSTOMER_WEIGHT[tag] ?? 1), 1);

const pickCustomer = (random: SeededRandom, dayOffset: number, serviceIds: readonly ID[]): CustomerProfile | null => {
  const maleOk = serviceIds.every((id) => MALE_SERVICES.has(id));
  const eligible = CUSTOMER_PROFILES.filter(
    (customer) =>
      // The demo customer's history is hand-written in STORY_BOOKINGS.
      customer.id !== C.priya &&
      // Only after they joined; inactive customers stopped visiting 6+ weeks ago.
      customer.joinedDaysAgo >= -dayOffset &&
      (customer.gender !== 'male' || maleOk) &&
      !(customer.tags.includes('inactive') && dayOffset > -42),
  );
  if (eligible.length === 0) return null;
  const weights = Object.fromEntries(eligible.map((customer) => [customer.id, tagWeight(customer)]));
  const id = random.weighted(weights);
  return eligible.find((customer) => customer.id === id) ?? null;
};

const pickServices = (random: SeededRandom, staff: StaffProfile, services: readonly Service[]): ID[] => {
  const options = services.filter(
    (service) =>
      service.isActive &&
      staff.specialties.includes(service.categoryId) &&
      !STORY_ONLY_SERVICES.has(service.id) &&
      !ADD_ONS.includes(service.id),
  );
  const main = random.pick(options);
  const ids = [main.id];
  // Skin and makeup customers often add threading; makeup sometimes adds draping.
  if (main.categoryId === CATEGORY_IDS.skin && random.chance(0.35)) ids.push(random.pick(['svc_eyebrow', 'svc_upper_lip', 'svc_detan']));
  if (main.categoryId === CATEGORY_IDS.makeup && random.chance(0.4)) ids.push('svc_draping');
  if (main.id === 'svc_manicure' && random.chance(0.5)) ids.push('svc_pedicure');
  // Only keep add-ons the staff member is qualified for.
  return ids.filter((id) => {
    const service = services.find((item) => item.id === id);
    return service ? staff.specialties.includes(service.categoryId) : false;
  });
};

const fillRandom = (random: SeededRandom, schedule: Schedule, services: readonly Service[], byId: ReadonlyMap<ID, Service>): void => {
  for (let dayOffset = -HISTORY_DAYS; dayOffset <= FUTURE_DAYS; dayOffset += 1) {
    STAFF_PROFILES.forEach((staff) => {
      if (!shiftFor(staff, dayOffset)) return;
      const already = schedule.bookings.filter((b) => b.dayOffset === dayOffset && b.staffId === staff.id).length;
      const target = Number(random.weighted(dailyBookingWeights(dayOffset)));
      for (let n = already; n < target; n += 1) {
        const serviceIds = pickServices(random, staff, services);
        const customer = pickCustomer(random, dayOffset, serviceIds);
        if (!customer) continue;
        const duration = durationOf(serviceIds, byId);
        const start = schedule.findSlot(random, staff, customer.id, dayOffset, duration);
        if (!start) continue;
        schedule.add({ customerId: customer.id, serviceIds, staffId: staff.id, dayOffset, startTime: start, endTime: addMinutesToTime(start, duration) });
      }
    });
  }
};

// ---------- Status and payment ----------

interface Outcome {
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  paymentMethod: PaymentMethod | null;
  notes: string;
  cancellationReason: string | null;
}

const roundTo = (value: number, step: number): number => Math.max(step, Math.round(value / step) * step);

/**
 * Random draws happen unconditionally and in a fixed order, so today's
 * time-of-day branch never shifts the sequence used by later bookings.
 */
const decideOutcome = (random: SeededRandom, booking: Booking, totalPrice: number, nowTime: TimeString): Outcome => {
  const statusRoll = random.next();
  const partialRoll = random.next();
  const method = random.weighted(PAYMENT_WEIGHTS);
  const digital = random.weighted(DIGITAL_PAYMENT_WEIGHTS);
  const reason = random.pick(CANCELLATION_REASONS);
  const note = random.chance(0.12) ? random.pick(NOTES) : '';

  const { story } = booking;
  if (story) {
    const status = story.status ?? 'confirmed';
    const advance = story.amountPaid ?? 0;
    const settled = status === 'completed' && advance === 0;
    const amountPaid = settled ? totalPrice : status === 'cancelled' ? 0 : advance;
    return {
      status,
      paymentStatus: amountPaid >= totalPrice ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid',
      amountPaid,
      paymentMethod: amountPaid > 0 ? (story.paymentMethod ?? method) : null,
      notes: story.notes ?? '',
      cancellationReason: status === 'cancelled' ? (story.cancellationReason ?? reason) : null,
    };
  }

  const unpaid = { paymentStatus: 'unpaid' as const, amountPaid: 0, paymentMethod: null };

  let status: AppointmentStatus;
  if (booking.dayOffset < 0) {
    status = statusRoll < 0.82 ? 'completed' : statusRoll < 0.92 ? 'cancelled' : 'no_show';
  } else if (booking.dayOffset === 0) {
    status = booking.endTime <= nowTime ? 'completed' : booking.startTime <= nowTime || statusRoll < 0.7 ? 'confirmed' : 'pending';
  } else {
    status = statusRoll < 0.58 ? 'confirmed' : statusRoll < 0.92 ? 'pending' : 'cancelled';
  }

  switch (status) {
    case 'completed':
      return partialRoll < 0.1
        ? { status, paymentStatus: 'partial', amountPaid: roundTo(totalPrice * 0.5, 100), paymentMethod: method, notes: note || 'Balance to be paid next visit.', cancellationReason: null }
        : { status, paymentStatus: 'paid', amountPaid: totalPrice, paymentMethod: method, notes: note, cancellationReason: null };
    case 'confirmed':
      // Larger bookings take an advance through a wallet.
      return totalPrice >= 4000 && partialRoll < 0.6
        ? { status, paymentStatus: 'partial', amountPaid: roundTo(totalPrice * 0.3, 500), paymentMethod: digital, notes: note, cancellationReason: null }
        : { status, ...unpaid, notes: note, cancellationReason: null };
    case 'cancelled':
      return { status, ...unpaid, notes: note, cancellationReason: reason };
    case 'pending':
    case 'no_show':
      return { status, ...unpaid, notes: note, cancellationReason: null };
  }
};

// ---------- Build ----------

/**
 * 100+ appointments across all statuses from 60 days ago to 30 days ahead.
 * No staff member or customer is ever double-booked, and every booking sits
 * inside the staff member's shift on a working day.
 */
export const buildAppointments = (): Appointment[] => {
  const random = createRandom(20241031);
  const services = buildServices();
  const byId = new Map(services.map((service) => [service.id, service]));
  const schedule = new Schedule();

  placeStories(random, schedule, byId);
  fillRandom(random, schedule, services, byId);

  const nowTime = format(new Date(), 'HH:mm');
  const sorted = [...schedule.bookings].sort((a, b) =>
    a.dayOffset === b.dayOffset ? a.startTime.localeCompare(b.startTime) || a.staffId.localeCompare(b.staffId) : a.dayOffset - b.dayOffset,
  );

  return sorted.map((booking, index) => {
    const totalPrice = booking.serviceIds.reduce((sum, id) => sum + (byId.get(id)?.price ?? 0), 0);
    const outcome = decideOutcome(random, booking, totalPrice, nowTime);
    const date = daysFromToday(booking.dayOffset);
    // Booked 1-10 days ahead; future bookings were made within the last two weeks.
    const lead = random.int(1, 10);
    const createdDaysAgo = booking.dayOffset < 0 ? lead - booking.dayOffset : random.int(0, Math.min(14, lead + 4));
    const createdAt = pastTimestamp(createdDaysAgo, random.int(0, 8));
    const finished = outcome.status === 'completed' || outcome.status === 'no_show';
    const updatedAt = finished && booking.dayOffset < 0 ? combineDateTime(date, booking.endTime).toISOString() : createdAt;

    return {
      id: `apt_${String(index + 1).padStart(3, '0')}`,
      createdAt,
      updatedAt,
      customerId: booking.customerId,
      serviceIds: booking.serviceIds,
      staffId: booking.staffId,
      date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice,
      ...outcome,
    };
  });
};
