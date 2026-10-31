/**
 * End-to-end checks of the service layer for both roles, running the real
 * services and stores under Node (no device needed). `npm run verify:flows`
 */
import {
  appointmentService,
  authService,
  businessService,
  configureApi,
  customerService,
  enrollmentService,
  getErrorMessage,
  notificationService,
  staffService,
} from '@/services/index';
import { useAppointmentStore } from '@/store/appointmentStore';
import { useCourseStore } from '@/store/courseStore';
import { useCustomerStore } from '@/store/customerStore';
import { useStaffStore } from '@/store/staffStore';
import type { WorkingHours } from '@/types';
import { addDaysISO, todayISO, weekdayOf } from '@/utils/date';
import { businessProfileSchema } from '@/utils/formSchemas';

configureApi({ minLatencyMs: 0, maxLatencyMs: 0, simulateErrors: false });

let failures = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};
const expectError = async (label: string, fn: () => Promise<unknown>, contains: string): Promise<void> => {
  try {
    await fn();
    check(label, false, 'no error thrown');
  } catch (error) {
    const message = getErrorMessage(error);
    check(label, message.includes(contains), message);
  }
};

const run = async (): Promise<void> => {
  const today = todayISO();

  // ---- Customer books; admin sees it pending; admin confirms; customer notified ----
  const customer = await authService.loginAsDemo('customer');
  const customerId = customer.customerId ?? '';
  const sarita = useStaffStore.getState().staff.find((s) => s.name.startsWith('Sarita'));
  if (!sarita) throw new Error('no Sarita');
  // Next day Sarita works, 3+ days out.
  let day = addDaysISO(today, 3);
  while (!sarita.workingHours.find((h) => h.day === weekdayOf(day) && !h.isOff)) day = addDaysISO(day, 1);
  const slots = await appointmentService.getAvailableSlots({ date: day, staffId: sarita.id, serviceIds: ['svc_hair_protein'] });
  const free = slots.find((slot) => slot.available);
  check('free slots exist for customer booking', free !== undefined, `${slots.filter((s) => s.available).length} free`);
  const booked = await appointmentService.createAppointment({
    customerId,
    serviceIds: ['svc_hair_protein'],
    staffId: sarita.id,
    date: day,
    startTime: free?.time ?? '11:00',
    notes: 'flow test',
    preferredPaymentMethod: 'esewa',
  });
  check('customer booking starts pending', booked.status === 'pending');

  await authService.switchDemoRole('admin');
  const pending = await appointmentService.listAppointments({ status: 'pending' });
  check('admin sees the customer booking in pending list', pending.some((a) => a.id === booked.id));
  const adminNotes = await notificationService.listMine();
  check('admin got a "New booking request" notification', adminNotes.some((n) => n.link?.id === booked.id && n.title === 'New booking request'));

  await appointmentService.updateStatus(booked.id, 'confirmed');
  await authService.switchDemoRole('customer');
  const customerNotes = await notificationService.listMine();
  check('customer notified of confirmation', customerNotes.some((n) => n.link?.id === booked.id && n.title === 'Appointment confirmed'));
  await authService.switchDemoRole('admin');

  // ---- Conflict detection: same staff, same time ----
  await expectError(
    'double-booking the stylist is refused',
    () =>
      appointmentService.createAppointment({
        customerId: useCustomerStore.getState().customers[5]?.id ?? '',
        serviceIds: ['svc_cap_highlights'],
        staffId: sarita.id,
        date: day,
        startTime: booked.startTime,
        notes: '',
      }),
    'already booked',
  );

  // ---- Holidays ----
  await expectError('cannot close a day that has bookings', () => businessService.addHoliday({ date: day, name: 'Test' }), 'booking');
  let quiet = addDaysISO(today, 40);
  while (useAppointmentStore.getState().appointments.some((a) => a.date === quiet)) quiet = addDaysISO(quiet, 1);
  await businessService.addHoliday({ date: quiet, name: 'Flow test holiday' });
  const holidaySlots = await appointmentService.getAvailableSlots({ date: quiet, staffId: sarita.id, serviceIds: ['svc_hair_protein'] });
  check('holiday has no slots', holidaySlots.length === 0);
  await expectError(
    'booking on a holiday is refused',
    () => appointmentService.createAppointment({ customerId, serviceIds: ['svc_hair_protein'], staffId: sarita.id, date: quiet, startTime: '11:00', notes: '' }),
    'closed',
  );
  await businessService.removeHoliday(quiet);

  // ---- Staff hours: can't strand bookings ----
  const hoursOff: WorkingHours[] = sarita.workingHours.map((h) => (h.day === weekdayOf(day) ? { ...h, isOff: true } : h));
  await expectError('day off over an existing booking is refused', () => staffService.updateStaff(sarita.id, { workingHours: hoursOff }), 'outside the new hours');
  await expectError('deactivating staff with bookings is refused', () => staffService.setStaffActive(sarita.id, false), 'upcoming booking');
  const badHours: WorkingHours[] = sarita.workingHours.map((h) => ({ ...h, start: '18:00', end: '10:00' }));
  await expectError('shift ending before it starts is refused', () => staffService.updateStaff(sarita.id, { workingHours: badHours }), 'must end after');

  // ---- Complete + payment + loyalty rule ----
  const confirmedPast = useAppointmentStore
    .getState()
    .appointments.find((a) => a.status === 'confirmed' && a.date === today && a.startTime < new Date().toTimeString().slice(0, 5));
  await businessService.updateLoyalty({ rupeesPerPoint: 50 });
  if (confirmedPast) {
    const before = useCustomerStore.getState().customers.find((c) => c.id === confirmedPast.customerId)?.loyaltyPoints ?? 0;
    await appointmentService.updateStatus(confirmedPast.id, 'completed');
    const due = confirmedPast.totalPrice - confirmedPast.amountPaid;
    if (due > 0) await appointmentService.recordPayment(confirmedPast.id, { amount: due, method: 'cash' });
    const after = useCustomerStore.getState().customers.find((c) => c.id === confirmedPast.customerId)?.loyaltyPoints ?? 0;
    const updated = useAppointmentStore.getState().getAppointmentById(confirmedPast.id);
    check('completed + paid in full', updated?.status === 'completed' && updated.paymentStatus === 'paid');
    check('points use the configured rule (Rs. 50/point)', after - before === Math.floor(confirmedPast.totalPrice / 50), `+${after - before}`);
  } else {
    console.log('SKIP  no started confirmed appointment today (time-of-day dependent)');
  }
  await expectError(
    'completing a future booking is refused',
    () => appointmentService.updateStatus(booked.id, 'completed'),
    'after it has started',
  );
  await businessService.updateLoyalty({ rupeesPerPoint: 100 });

  // ---- Admin alerts toggle ----
  await businessService.updateAlerts({ cancellations: false });
  const beforeCount = (await notificationService.listMine()).length;
  await authService.switchDemoRole('customer');
  await appointmentService.updateStatus(booked.id, 'cancelled', 'flow test');
  await authService.switchDemoRole('admin');
  const afterCount = (await notificationService.listMine()).length;
  check('cancellation alert suppressed when switched off', afterCount === beforeCount);
  await businessService.updateAlerts({ cancellations: true });

  // ---- Training: fee instalments, completion, certificate rules ----
  const partial = useCourseStore.getState().enrollments.find((e) => e.status === 'active' && e.feePaid < e.feeTotal);
  if (partial) {
    await expectError('certificate blocked before completion', () => enrollmentService.issueCertificate(partial.id), 'completed');
    await enrollmentService.updateStatus(partial.id, 'completed');
    await expectError('certificate blocked while fee is due', () => enrollmentService.issueCertificate(partial.id), 'pending fee');
    const due = partial.feeTotal - partial.feePaid;
    await expectError('overpaying a fee is refused', () => enrollmentService.recordFeePayment(partial.id, { amount: due + 1, method: 'cash' }), 'exceeds');
    await enrollmentService.recordFeePayment(partial.id, { amount: due, method: 'esewa' });
    const issued = await enrollmentService.issueCertificate(partial.id);
    check('certificate issued once completed and paid', issued.certificateIssued);
  }

  // ---- Customer CRM ----
  const created = await customerService.createCustomer({
    name: 'Flow Test',
    phone: '9812300099',
    email: '',
    gender: 'female',
    dob: null,
    address: { line1: '', line2: '', city: 'Janakpur', province: 'Madhesh', postalCode: '' },
    notes: '',
    avatar: null,
    tags: ['new'],
  });
  check('walk-in customer created with E.164 phone', created.phone === '+9779812300099', created.phone);
  await expectError('duplicate phone refused', () => customerService.createCustomer({ ...created, name: 'Dup' }), 'already exists');
  const adjusted = await customerService.adjustLoyaltyPoints(created.id, -50);
  check('points never go below zero', adjusted.loyaltyPoints === 0);
  await customerService.deleteCustomer(created.id);
  check('customer deleted', !useCustomerStore.getState().customers.some((c) => c.id === created.id));

  // ---- Customer cannot do admin things ----
  await authService.loginAsDemo('customer');
  await expectError('customer cannot add a holiday', () => businessService.addHoliday({ date: quiet, name: 'x' }), 'permission');
  await expectError('customer cannot record payments', () => appointmentService.recordPayment(booked.id, { amount: 1, method: 'cash' }), 'permission');

  // ---- Business settings form accepts the seeded profile (landline phone) ----
  const settings = await businessService.getSettings();
  const parsed = businessProfileSchema.safeParse(settings.profile);
  check('seeded business profile passes the settings form validation', parsed.success, parsed.success ? settings.profile.phone : parsed.error.issues[0]?.message);
  check('a malformed business phone is rejected', !businessProfileSchema.safeParse({ ...settings.profile, phone: '12345' }).success);

  // ---- Mock offline mode ----
  configureApi({ offline: true });
  await expectError('requests fail while offline', () => notificationService.listMine(), 'offline');
  await authService.logout();
  check('sign-out still works offline', true);
  configureApi({ offline: false });
  await authService.loginAsDemo('customer');
  check('requests work again once back online', (await notificationService.listMine()).length > 0);

  console.log(`\n${failures === 0 ? 'ALL FLOWS PASSED' : `${failures} FAILURE(S)`}`);
  if (failures > 0) process.exitCode = 1;
};

run().catch((error: unknown) => {
  console.error('CRASH', error);
  process.exitCode = 1;
});
