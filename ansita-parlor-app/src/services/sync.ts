import { resetCacheStores } from '@/store';
import { useAppointmentStore } from '@/store/appointmentStore';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCourseStore } from '@/store/courseStore';
import { useCustomerStore } from '@/store/customerStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useOfferStore } from '@/store/offerStore';
import { usePaymentRequestStore } from '@/store/paymentRequestStore';
import { useReviewStore } from '@/store/reviewStore';
import { useServiceStore } from '@/store/serviceStore';
import { useStaffStore } from '@/store/staffStore';
import type {
  Appointment,
  BusinessSettings,
  Course,
  Customer,
  Enrollment,
  Notification,
  Offer,
  Review,
  Service,
  ServiceCategory,
  Staff,
  User,
} from '@/types';

import { api } from './client';

/**
 * Keeps the local caches (the stores) filled from the server. Screens read the
 * caches for lookups such as id → name, and refetch when a cache changes.
 */

const settle = async (tasks: Promise<unknown>[]): Promise<void> => {
  const results = await Promise.allSettled(tasks);
  const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failure) throw failure.reason;
};

export const refreshNotifications = async (): Promise<void> => {
  const list = await api<Notification[]>('GET', '/notifications');
  useNotificationStore.getState().setNotifications(list);
};

let notificationTimer: ReturnType<typeof setTimeout> | undefined;

/** Server-side changes often create notifications; fetch them shortly after a mutation. */
export const refreshNotificationsSoon = (): void => {
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    if (useAuthStore.getState().token) refreshNotifications().catch(() => undefined);
  }, 400);
};

/** Services referenced by the user's appointments but missing from the cache (e.g. since deactivated). */
const loadMissingServices = async (appointments: readonly Appointment[]): Promise<void> => {
  const { services } = useServiceStore.getState();
  const known = new Set(services.map((service) => service.id));
  const missing = [...new Set(appointments.flatMap((appointment) => appointment.serviceIds))].filter((id) => !known.has(id));
  const found = await Promise.allSettled(missing.map((id) => api<Service>('GET', `/services/${id}`)));
  useServiceStore
    .getState()
    .mergeServices(found.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])));
};

/** Admin: "Payments to verify" on the dashboard. Optional, so a failure never blocks the rest. */
const loadPendingPaymentCount = (user: User): Promise<void> =>
  user.role === 'admin'
    ? api<{ count: number }>('GET', '/payment-requests/pending-count')
        .then(({ count }) => usePaymentRequestStore.getState().setPendingCount(count))
        .catch(() => undefined)
    : Promise.resolve();

const loadAppointments = async (user: User): Promise<void> => {
  const list = await api<Appointment[]>('GET', '/appointments');
  useAppointmentStore.getState().setAppointments(list);
  if (user.role === 'customer') await loadMissingServices(list);
};

/** Everything the app needs after sign-in. Rejects if any part failed (the rest is still applied). */
export const loadSessionData = async (user: User): Promise<void> => {
  const common = [
    api<BusinessSettings>('GET', '/settings').then((settings) => useBusinessStore.getState().setSettings(settings)),
    api<ServiceCategory[]>('GET', '/categories').then((list) => useServiceStore.getState().setCategories(list)),
    api<Service[]>('GET', '/services').then((list) => useServiceStore.getState().mergeServices(list)),
    api<Staff[]>('GET', '/staff').then((list) => useStaffStore.getState().setStaff(list)),
    api<Course[]>('GET', '/courses').then((list) => useCourseStore.getState().setCourses(list)),
    api<Offer[]>('GET', '/offers').then((list) => useOfferStore.getState().setOffers(list)),
    api<Review[]>('GET', '/reviews').then((list) => useReviewStore.getState().setReviews(list)),
    api<Enrollment[]>('GET', '/enrollments').then((list) => useCourseStore.getState().setEnrollments(list)),
    refreshNotifications(),
  ];
  const byRole =
    user.role === 'admin'
      ? [api<Customer[]>('GET', '/customers').then((list) => useCustomerStore.getState().setCustomers(list))]
      : user.customerId
        ? [api<Customer>('GET', `/customers/${user.customerId}`).then((customer) => useCustomerStore.getState().setCustomers([customer]))]
        : [];
  await settle([...common, ...byRole, loadAppointments(user), loadPendingPaymentCount(user)]);
};

/** The fast-changing data: bookings, notifications, settings and the account itself. */
export const refreshLiveData = async (): Promise<void> => {
  const { user } = useAuthStore.getState();
  if (!user) return;
  await settle([
    refreshNotifications(),
    loadAppointments(user),
    loadPendingPaymentCount(user),
    api<BusinessSettings>('GET', '/settings').then((settings) => useBusinessStore.getState().setSettings(settings)),
    api<User>('GET', '/auth/me').then((me) => {
      if (me && useAuthStore.getState().user?.id === me.id) useAuthStore.getState().setUser(me);
    }),
  ]);
};

let watching = false;

/** Clears the caches whenever the session ends (sign-out or an expired token). */
export const watchSession = (): void => {
  if (watching) return;
  watching = true;
  useAuthStore.subscribe((state, previous) => {
    if (previous.token && !state.token) resetCacheStores();
  });
};
