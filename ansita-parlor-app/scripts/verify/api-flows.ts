/**
 * End-to-end check of the app's service layer against a running backend.
 *
 *   EXPO_PUBLIC_API_URL=http://localhost:8000 npm run verify:api
 *
 * Uses the admin from `python -m app.seed` (pass the same ADMIN_EMAIL / ADMIN_PASSWORD)
 * and registers a fresh test customer each run.
 */
import {
  appointmentService,
  authService,
  catalogService,
  customerService,
  getErrorMessage,
  isApiError,
  notificationService,
} from '@/services';
import { useAppointmentStore, useAuthStore, useBusinessStore, useServiceStore, useStaffStore } from '@/store';
import { addDaysISO, todayISO, weekdayOf } from '@/utils/date';

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD to the admin account created by the seed.');
  process.exit(1);
}
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };

let failures = 0;
const check = (label: string, condition: boolean, detail = ''): void => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.log(`  ✗ ${label}${detail ? ` (${detail})` : ''}`);
  }
};

const run = async (): Promise<void> => {
  const stamp = Date.now().toString(36);
  const customerEmail = `e2e-${stamp}@example.com`;
  const phone = `981${String(Date.now()).slice(-7)}`; // Ncell range

  console.log('Customer signs up');
  // Needs a backend without an email provider (codes come back as `demoCode`) and
  // EMAIL_CHECK_DELIVERABILITY=false, since example.com does not accept mail.
  const sent = await authService.sendEmailCode(customerEmail);
  check('email code is issued', /^\d{6}$/.test(sent.demoCode), 'set EMAIL_CHECK_DELIVERABILITY=false, no mail provider');
  const { verificationToken } = await authService.verifyEmailCode(customerEmail, sent.demoCode);
  const customer = await authService.register({
    name: 'Test Customer',
    email: customerEmail,
    phone,
    password: 'secret123',
    emailVerificationToken: verificationToken,
  });
  check('register returns a customer account', customer.role === 'customer' && customer.customerId !== null);
  check('session saved', useAuthStore.getState().token !== null);
  check('catalogue cached after sign-in', useServiceStore.getState().services.length > 0 && useStaffStore.getState().staff.length > 0);
  check('business settings cached', useBusinessStore.getState().loaded);

  console.log('Customer books');
  const services = await catalogService.listServices();
  const service = services[0];
  if (!service || !customer.customerId) throw new Error('No services seeded on the server.');
  // Find a day in the next two weeks with a free slot.
  let booking: { date: string; staffId: string; time: string } | null = null;
  for (let offset = 2; offset < 16 && !booking; offset += 1) {
    const date = addDaysISO(todayISO(), offset);
    const staff = await appointmentService.getAvailableStaff(date, [service.id]);
    for (const member of staff) {
      const slots = await appointmentService.getAvailableSlots({ date, staffId: member.id, serviceIds: [service.id] });
      const free = slots.find((slot) => slot.available);
      if (free) {
        booking = { date, staffId: member.id, time: free.time };
        break;
      }
    }
  }
  if (!booking) throw new Error(`No free slot found for ${service.name}.`);
  const appointment = await appointmentService.createAppointment({
    customerId: customer.customerId,
    serviceIds: [service.id],
    staffId: booking.staffId,
    date: booking.date,
    startTime: booking.time,
    notes: 'verify:api',
  });
  check('booking created as pending', appointment.status === 'pending', appointment.status);
  check('booking cached', useAppointmentStore.getState().getAppointmentById(appointment.id) !== undefined);
  try {
    await customerService.listCustomers();
    check('customer cannot open the CRM', false);
  } catch (error) {
    check('customer cannot open the CRM', isApiError(error) && error.code === 'FORBIDDEN', getErrorMessage(error));
  }
  await authService.logout();
  check('sign-out clears caches', useAppointmentStore.getState().appointments.length === 0 && useAuthStore.getState().token === null);

  console.log(`Admin confirms (${weekdayOf(booking.date)} ${booking.date} ${booking.time})`);
  await authService.login(ADMIN);
  const pending = await appointmentService.listAppointments({ status: 'pending' });
  check('admin sees the request', pending.some((item) => item.id === appointment.id));
  const notifications = await notificationService.listMine();
  check('admin was notified', notifications.some((item) => item.link?.id === appointment.id));
  const confirmed = await appointmentService.updateStatus(appointment.id, 'confirmed');
  check('admin confirms', confirmed.status === 'confirmed');
  try {
    await appointmentService.recordPayment(appointment.id, { amount: service.price + 1, method: 'cash' });
    check('overpayment refused', false);
  } catch (error) {
    check('overpayment refused', isApiError(error) && error.code === 'VALIDATION', getErrorMessage(error));
  }
  const paid = await appointmentService.recordPayment(appointment.id, { amount: service.price, method: 'esewa' });
  check('payment recorded', paid.paymentStatus === 'paid');
  await authService.logout();

  console.log('Customer sees the update');
  await authService.login({ email: customerEmail, password: 'secret123' });
  const mine = await appointmentService.listAppointments();
  check('customer sees confirmed + paid', mine.some((item) => item.id === appointment.id && item.status === 'confirmed' && item.paymentStatus === 'paid'));
  const inbox = await notificationService.listMine();
  check('customer was notified', inbox.some((item) => item.title === 'Appointment confirmed'));
  const cancelled = await appointmentService.updateStatus(appointment.id, 'cancelled', 'verify:api cleanup');
  check('customer can cancel', cancelled.status === 'cancelled');
  await authService.logout();
};

run()
  .catch((error: unknown) => {
    failures += 1;
    console.error(`\nFailed: ${getErrorMessage(error)}`);
  })
  .finally(() => {
    console.log(failures === 0 ? '\nAll API flows passed.' : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
