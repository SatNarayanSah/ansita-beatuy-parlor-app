import type { Appointment, AppointmentPayment, AppointmentStatus, Enrollment, ID, ISODate, Service, Staff } from '@/types';

import { addDaysISO } from './date';

/**
 * Business metrics shared by the Dashboard and Reports.
 * Revenue means money received in the range, counted on the day it was paid
 * (a booking for next week that is paid today is today's revenue).
 */

export const inRange = (date: ISODate, from: ISODate, to: ISODate): boolean => date >= from && date <= to;

/** Total ever collected on these bookings, whenever it was paid. */
export const sumCollected = (appointments: readonly Appointment[]): number =>
  appointments.reduce((sum, appointment) => sum + appointment.amountPaid, 0);

/** A booking's payments. Records without a payment list count on the booking date. */
export const paymentsOf = (a: Appointment): readonly AppointmentPayment[] =>
  a.payments?.length
    ? a.payments
    : a.amountPaid > 0
      ? [{ id: a.id, amount: a.amountPaid, paidOn: a.date, method: a.paymentMethod ?? 'cash' }]
      : [];

/** Money received on one booking between `from` and `to`. */
const paidBetween = (a: Appointment, from: ISODate, to: ISODate): number =>
  paymentsOf(a).reduce((sum, p) => sum + (inRange(p.paidOn, from, to) ? p.amount : 0), 0);

/** Money received between `from` and `to` (inclusive), by payment date. */
export const collectedBetween = (appointments: readonly Appointment[], from: ISODate, to: ISODate): number =>
  appointments.reduce((sum, a) => sum + paidBetween(a, from, to), 0);

/** Money received per day, every day in the range included (zero days too). */
export const revenueByDay = (appointments: readonly Appointment[], from: ISODate, to: ISODate): { date: ISODate; value: number }[] => {
  const totals = new Map<ISODate, number>();
  appointments.forEach((a) =>
    paymentsOf(a).forEach((p) => {
      if (inRange(p.paidOn, from, to)) totals.set(p.paidOn, (totals.get(p.paidOn) ?? 0) + p.amount);
    }),
  );
  const days: { date: ISODate; value: number }[] = [];
  for (let date = from; date <= to; date = addDaysISO(date, 1)) days.push({ date, value: totals.get(date) ?? 0 });
  return days;
};

export const statusCounts = (appointments: readonly Appointment[]): Record<AppointmentStatus, number> =>
  appointments.reduce<Record<AppointmentStatus, number>>(
    (counts, a) => ({ ...counts, [a.status]: counts[a.status] + 1 }),
    { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 },
  );

export interface Ranked {
  id: ID;
  label: string;
  value: number;
  count: number;
}

/** Bookings per service (cancelled excluded), most booked first. */
export const topServicesByBookings = (appointments: readonly Appointment[], services: ReadonlyMap<ID, Service>, limit = 5): Ranked[] => {
  const counts = new Map<ID, number>();
  appointments
    .filter((a) => a.status !== 'cancelled')
    .forEach((a) => a.serviceIds.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1)));
  return [...counts]
    .map(([id, count]) => ({ id, label: services.get(id)?.name ?? 'Service', value: count, count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

/**
 * Money received per service between `from` and `to`. A multi-service booking's
 * payment is split in proportion to each service's list price.
 */
export const revenueByService = (appointments: readonly Appointment[], services: ReadonlyMap<ID, Service>, from: ISODate, to: ISODate): Ranked[] => {
  const totals = new Map<ID, { value: number; count: number }>();
  appointments.forEach((a) => {
    const paid = paidBetween(a, from, to);
    if (paid <= 0) return;
    const prices = a.serviceIds.map((id) => services.get(id)?.price ?? 0);
    const listTotal = prices.reduce((sum, price) => sum + price, 0) || 1;
    a.serviceIds.forEach((id, index) => {
      const share = (paid * (prices[index] ?? 0)) / listTotal;
      const current = totals.get(id) ?? { value: 0, count: 0 };
      totals.set(id, { value: current.value + share, count: current.count + 1 });
    });
  });
  return [...totals]
    .map(([id, { value, count }]) => ({ id, label: services.get(id)?.name ?? 'Service', value: Math.round(value), count }))
    .sort((a, b) => b.value - a.value);
};

/** Money received per stylist between `from` and `to`; `count` is their completed visits dated in the range. */
export const revenueByStaff = (appointments: readonly Appointment[], staff: ReadonlyMap<ID, Staff>, from: ISODate, to: ISODate): Ranked[] => {
  const totals = new Map<ID, { value: number; count: number }>();
  appointments.forEach((a) => {
    const paid = paidBetween(a, from, to);
    const completed = a.status === 'completed' && inRange(a.date, from, to) ? 1 : 0;
    if (paid <= 0 && !completed) return;
    const current = totals.get(a.staffId) ?? { value: 0, count: 0 };
    totals.set(a.staffId, { value: current.value + paid, count: current.count + completed });
  });
  return [...totals]
    .map(([id, { value, count }]) => ({ id, label: staff.get(id)?.name ?? 'Staff', value, count }))
    .sort((a, b) => b.value - a.value);
};

export interface Retention {
  /** Customers with at least one completed visit in the range. */
  active: number;
  /** Of those, first-ever completed visit in the range. */
  newCustomers: number;
  /** Of those, visited before the range too. */
  returning: number;
  /** Share of active customers with 2+ visits in the range (0-1). */
  repeatRate: number;
  /** Customers who visited in the same-length period before, but not in this one. */
  lapsed: number;
}

export const retention = (all: readonly Appointment[], from: ISODate, to: ISODate): Retention => {
  const completed = all.filter((a) => a.status === 'completed');
  const visitsInRange = new Map<ID, number>();
  completed.filter((a) => inRange(a.date, from, to)).forEach((a) => visitsInRange.set(a.customerId, (visitsInRange.get(a.customerId) ?? 0) + 1));
  const before = new Set(completed.filter((a) => a.date < from).map((a) => a.customerId));

  const length = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const prevFrom = addDaysISO(from, -length);
  const prevTo = addDaysISO(from, -1);
  const previous = new Set(completed.filter((a) => inRange(a.date, prevFrom, prevTo)).map((a) => a.customerId));

  const active = visitsInRange.size;
  const returning = [...visitsInRange.keys()].filter((id) => before.has(id)).length;
  return {
    active,
    newCustomers: active - returning,
    returning,
    repeatRate: active === 0 ? 0 : [...visitsInRange.values()].filter((count) => count >= 2).length / active,
    lapsed: [...previous].filter((id) => !visitsInRange.has(id)).length,
  };
};

/** Course fees received in the range, by payment date. */
export const feesCollected = (enrollments: readonly Enrollment[], from: ISODate, to: ISODate): number =>
  enrollments.reduce((sum, e) => sum + e.payments.filter((p) => inRange(p.paidOn, from, to)).reduce((s, p) => s + p.amount, 0), 0);
