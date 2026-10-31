import type {
  Appointment,
  Course,
  Customer,
  DemoCredential,
  Enrollment,
  Notification,
  Offer,
  Review,
  Service,
  ServiceCategory,
  Staff,
  User,
} from '@/types';

import { buildAppointments } from './appointments';
import { buildCategories } from './categories';
import { buildCourses } from './courses';
import { buildCustomers } from './customers';
import { buildEnrollments } from './enrollments';
import { buildNotifications } from './notifications';
import { buildOffers } from './offers';
import { buildReviews } from './reviews';
import { buildServices } from './services';
import { buildStaff } from './staff';
import { buildDemoCredentials, buildUsers } from './users';

export interface SeedData {
  users: User[];
  credentials: DemoCredential[];
  customers: Customer[];
  categories: ServiceCategory[];
  services: Service[];
  staff: Staff[];
  appointments: Appointment[];
  courses: Course[];
  enrollments: Enrollment[];
  notifications: Notification[];
  reviews: Review[];
  offers: Offer[];
}

/**
 * Builds a fresh copy of all demo data. Dates are relative to "now", so the
 * demo always shows bookings for today and the coming days.
 */
export const createSeedData = (): SeedData => {
  const appointments = buildAppointments();
  return {
    users: buildUsers(),
    credentials: buildDemoCredentials(),
    customers: buildCustomers(),
    categories: buildCategories(),
    services: buildServices(),
    staff: buildStaff(),
    appointments,
    courses: buildCourses(),
    enrollments: buildEnrollments(),
    notifications: buildNotifications(),
    reviews: buildReviews(appointments),
    offers: buildOffers(),
  };
};

export { CATEGORY_IDS } from './categories';
export { COURSE_IDS, BATCH_IDS } from './courses';
export { CUSTOMER_IDS } from './customers';
export { OFFER_IDS } from './offers';
export { PARLOR_HOURS, STAFF_IDS } from './staff';
export { DEMO_ACCOUNTS, USER_IDS } from './users';
