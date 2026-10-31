/**
 * Seed-data invariants: counts, no double-booking, shifts, payments, links,
 * determinism. `npm run verify:seed`
 */
import { createSeedData } from '@/data/index';
import { STAFF_PROFILES } from '@/data/team';
import { addDaysISO, timeRangesOverlap, todayISO, weekdayOf } from '@/utils/date';
import { isValidPhone } from '@/utils/phone';

const d = createSeedData();
const today = todayISO();
const problems: string[] = [];
const tally = <T>(items: readonly T[], key: (item: T) => string | number) =>
  items.reduce<Record<string, number>>((m, item) => ((m[key(item)] = (m[key(item)] ?? 0) + 1), m), {});

console.log('users', d.users.length, d.credentials.map((c) => `${c.email}/${c.password}`).join(', '));
console.log('staff', d.staff.map((s) => `${s.name} (${s.role}) rating ${s.rating}`).join('; '));
console.log('customers', d.customers.length, '| services', d.services.length, '| categories', d.categories.length);
console.log('services per category', tally(d.services, (s) => s.categoryId));
console.log('appointments', d.appointments.length);
console.log('  by status', tally(d.appointments, (a) => a.status));
const past = d.appointments.filter((a) => a.date < today).length;
const todayCount = d.appointments.filter((a) => a.date === today).length;
console.log('  past', past, 'today', todayCount, 'future', d.appointments.length - past - todayCount);
console.log('  range', d.appointments[0]?.date, 'to', d.appointments.at(-1)?.date, `(allowed ${addDaysISO(today, -60)} to ${addDaysISO(today, 30)})`);
console.log('  payment', tally(d.appointments, (a) => a.paymentStatus), tally(d.appointments.filter((a) => a.paymentMethod), (a) => a.paymentMethod ?? ''));
console.log('  per staff', tally(d.appointments, (a) => a.staffId));

for (const a of d.appointments) {
  const staff = STAFF_PROFILES.find((s) => s.id === a.staffId);
  if (!staff) { problems.push(`${a.id} unknown staff`); continue; }
  const shift = staff.workingHours.find((h) => h.day === weekdayOf(a.date));
  if (!shift || shift.isOff) problems.push(`${a.id} on ${staff.name} day off`);
  else if (a.startTime < shift.start || a.endTime > shift.end) problems.push(`${a.id} outside shift ${a.startTime}-${a.endTime}`);
  const cats = a.serviceIds.map((id) => d.services.find((s) => s.id === id)?.categoryId ?? '?');
  if (cats.some((c) => !staff.specialties.includes(c))) problems.push(`${a.id} service outside ${staff.name} specialties`);
  const cust = d.customers.find((c) => c.id === a.customerId);
  if (!cust) problems.push(`${a.id} unknown customer`);
  else if (cust.joinedAt.slice(0, 10) > a.date) problems.push(`${a.id} before ${cust.name} joined`);
  if (a.amountPaid > a.totalPrice) problems.push(`${a.id} overpaid`);
  if ((a.paymentStatus === 'paid') !== (a.amountPaid === a.totalPrice && a.totalPrice > 0)) problems.push(`${a.id} payment status mismatch`);
  if (a.paymentStatus === 'unpaid' && (a.amountPaid !== 0 || a.paymentMethod)) problems.push(`${a.id} unpaid with money`);
  if (a.date < today && (a.status === 'pending' || a.status === 'confirmed')) problems.push(`${a.id} past but ${a.status}`);
  if (a.date > today && (a.status === 'completed' || a.status === 'no_show')) problems.push(`${a.id} future but ${a.status}`);
  if (a.status === 'cancelled' && !a.cancellationReason) problems.push(`${a.id} cancelled without reason`);
  if (a.createdAt > new Date().toISOString()) problems.push(`${a.id} created in the future`);
  for (const b of d.appointments) {
    if (b.id <= a.id || b.date !== a.date) continue;
    if ((b.staffId === a.staffId || b.customerId === a.customerId) && timeRangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime))
      problems.push(`overlap ${a.id} ${b.id}`);
  }
}

for (const c of d.customers) if (!/^\+97798\d{8}$/.test(c.phone) || !isValidPhone(c.phone)) problems.push(`bad phone ${c.name} ${c.phone}`);
if (new Set(d.customers.map((c) => c.phone)).size !== d.customers.length) problems.push('duplicate phones');
console.log('customer tags', tally(d.customers.flatMap((c) => c.tags), (t) => t));
console.log('customers with no appointments:', d.customers.filter((c) => !d.appointments.some((a) => a.customerId === c.id)).map((c) => c.name).join(', ') || 'none');
const demoAppts = d.appointments.filter((a) => a.customerId === 'cus_001');
console.log('demo customer appointments', demoAppts.map((a) => `${a.date} ${a.status}`).join(', '));

console.log('courses:', d.courses.map((c) => `${c.title} Rs ${c.fee} [${c.batches.map((b) => b.status).join('/')}] ${c.syllabus.length} modules`).join(' | '));
console.log('enrollments', d.enrollments.length, tally(d.enrollments, (e) => e.status));
console.log('  fees', d.enrollments.map((e) => `${e.feePaid}/${e.feeTotal}`).join(' '));
for (const e of d.enrollments) {
  if (e.feePaid > e.feeTotal) problems.push(`${e.id} overpaid`);
  const batch = d.courses.find((c) => c.id === e.courseId)?.batches.find((b) => b.id === e.batchId);
  if (!batch) problems.push(`${e.id} bad batch`);
  const cust = d.customers.find((c) => c.id === e.studentId);
  if (!cust) problems.push(`${e.id} unknown student`);
  else if (cust.joinedAt.slice(0, 10) > e.createdAt.slice(0, 10)) problems.push(`${e.id} enrolled before ${cust.name} joined`);
  if (e.attendance.some((r) => r.date >= today)) problems.push(`${e.id} attendance in future`);
  if (e.status === 'completed' && e.feePaid < e.feeTotal) problems.push(`${e.id} completed with fee due`);
}
for (const b of d.courses.flatMap((c) => c.batches)) {
  if ((b.status === 'ongoing') !== (b.startDate <= today && b.endDate >= today)) problems.push(`${b.id} status ${b.status} vs dates`);
}

console.log('reviews', d.reviews.length, tally(d.reviews, (r) => r.rating), 'with reply', d.reviews.filter((r) => r.reply).length);
for (const r of d.reviews) {
  const a = d.appointments.find((x) => x.id === r.appointmentId);
  if (!a || a.status !== 'completed' || a.customerId !== r.customerId || a.staffId !== r.staffId) problems.push(`${r.id} inconsistent`);
  if (r.createdAt > new Date().toISOString() || r.updatedAt > new Date().toISOString()) problems.push(`${r.id} in future`);
}
if (new Set(d.reviews.map((r) => r.id)).size !== d.reviews.length) problems.push('duplicate review ids');
console.log('demo customer unreviewed completed:', demoAppts.filter((a) => a.status === 'completed' && !d.reviews.some((r) => r.appointmentId === a.id)).map((a) => a.id).join(','));

const byUser = tally(d.notifications, (n) => n.userId);
console.log('notifications', d.notifications.length, byUser, 'unread', d.notifications.filter((n) => !n.isRead).length);
const pools: Record<string, readonly { id: string }[]> = { appointment: d.appointments, enrollment: d.enrollments, course: d.courses, customer: d.customers, offer: d.offers };
for (const n of d.notifications) {
  if (n.link && !pools[n.link.kind]?.some((x) => x.id === n.link?.id)) problems.push(`${n.id} dangling ${n.link.kind}:${n.link.id}`);
}
d.notifications.filter((n) => n.userId === 'usr_customer').slice(0, 6).forEach((n) => console.log('   -', n.title, '|', n.message));

console.log('offers:', d.offers.map((o) => `${o.title} ${o.validFrom}..${o.validTo}${o.isActive ? '' : ' (draft)'}`).join(' | '));

const again = createSeedData();
const sig = (x: typeof d) => JSON.stringify([x.appointments.map((a) => [a.id, a.customerId, a.date, a.startTime]), x.reviews.map((r) => r.id), x.staff.map((s) => s.rating)]);
if (sig(again) !== sig(d)) problems.push('not deterministic');

console.log('\nPROBLEMS:', problems.length ? `\n${problems.join('\n')}` : 'none');
if (problems.length > 0) process.exitCode = 1;
