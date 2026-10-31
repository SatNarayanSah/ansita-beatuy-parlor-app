import type { Appointment, ID, ISODateTime, Notification, NotificationLink, NotificationType } from '@/types';
import { combineDateTime, formatShortDate, formatTime12, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

import { buildAppointments } from './appointments';
import { buildCourses } from './courses';
import { CUSTOMER_IDS, CUSTOMER_PROFILES } from './customers';
import { buildEnrollments } from './enrollments';
import { pastTimestamp } from './helpers';
import { buildOffers, OFFER_IDS } from './offers';
import { buildReviews } from './reviews';
import { buildServices } from './services';
import { STAFF_PROFILES } from './team';
import { USER_IDS } from './users';

interface Draft {
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  link: NotificationLink | null;
  at: ISODateTime;
}

const TWO_DAYS_MS = 2 * 24 * 3_600_000;

/**
 * Notifications derived from the generated records, so every link points at
 * a real appointment, enrollment or offer. Anything under two days old is unread.
 */
export const buildNotifications = (): Notification[] => {
  const appointments = buildAppointments();
  const reviews = buildReviews(appointments);
  const enrollments = buildEnrollments();
  const courses = buildCourses();
  const offers = buildOffers();
  const services = new Map(buildServices().map((service) => [service.id, service]));
  const today = todayISO();
  const now = new Date().toISOString();

  const customerName = (id: ID): string => CUSTOMER_PROFILES.find((customer) => customer.id === id)?.name ?? 'A customer';
  const firstName = (id: ID): string => STAFF_PROFILES.find((staff) => staff.id === id)?.name.split(' ')[0] ?? 'our team';
  const serviceNames = (appointment: Appointment): string =>
    appointment.serviceIds.map((id) => services.get(id)?.name ?? 'Service').join(' + ');
  const when = (appointment: Appointment): string =>
    `${formatShortDate(appointment.date)} at ${formatTime12(appointment.startTime)}`;
  const appointmentLink = (appointment: Appointment): NotificationLink => ({ kind: 'appointment', id: appointment.id });

  const drafts: Draft[] = [];
  const admin = (draft: Omit<Draft, 'userId'>): void => void drafts.push({ ...draft, userId: USER_IDS.admin });
  const customer = (draft: Omit<Draft, 'userId'>): void => void drafts.push({ ...draft, userId: USER_IDS.customer });

  // Today's statuses depend on the clock, so only past and future days feed notifications.
  const future = appointments.filter((appointment) => appointment.date > today);
  const past = appointments.filter((appointment) => appointment.date < today);

  // ---------- Admin ----------

  future
    .filter((appointment) => appointment.status === 'pending')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .forEach((appointment) =>
      admin({
        type: 'appointment_booked',
        title: 'New booking request',
        message: `${customerName(appointment.customerId)} requested ${serviceNames(appointment)} on ${when(appointment)}.`,
        link: appointmentLink(appointment),
        at: appointment.createdAt,
      }),
    );

  future
    .filter((appointment) => appointment.status === 'cancelled')
    .slice(0, 3)
    .forEach((appointment) =>
      admin({
        type: 'appointment_cancelled',
        title: 'Appointment cancelled',
        message: `${customerName(appointment.customerId)} cancelled ${serviceNames(appointment)} on ${when(appointment)}.`,
        link: appointmentLink(appointment),
        at: appointment.updatedAt,
      }),
    );

  [...reviews]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)
    .forEach((review) =>
      admin({
        type: 'system',
        title: `New ${review.rating}★ review`,
        message: `${customerName(review.customerId)}: “${review.comment}”`,
        link: { kind: 'appointment', id: review.appointmentId },
        at: review.createdAt,
      }),
    );

  enrollments.forEach((enrollment) => {
    const course = courses.find((item) => item.id === enrollment.courseId);
    const title = course?.title ?? 'a course';
    if (enrollment.status === 'pending') {
      admin({
        type: 'enrollment',
        title: 'New course enrollment',
        message: `${customerName(enrollment.studentId)} enrolled in ${title}. Fee not yet paid.`,
        link: { kind: 'enrollment', id: enrollment.id },
        at: enrollment.createdAt,
      });
    }
    enrollment.payments
      .filter((payment) => payment.paidOn >= pastTimestamp(25).slice(0, 10))
      .forEach((payment) =>
        admin({
          type: 'payment',
          title: 'Course fee received',
          message: `${customerName(enrollment.studentId)} paid ${formatCurrency(payment.amount)} for ${title}.`,
          link: { kind: 'enrollment', id: enrollment.id },
          at: combineDateTime(payment.paidOn, '12:00').toISOString(),
        }),
      );
  });

  const certificatesDue = enrollments.filter((enrollment) => enrollment.status === 'completed' && !enrollment.certificateIssued);
  if (certificatesDue[0]) {
    admin({
      type: 'system',
      title: 'Certificate pending',
      message: `${certificatesDue.length} student${certificatesDue.length === 1 ? '' : 's'} finished a course and ${certificatesDue.length === 1 ? 'is' : 'are'} waiting for a certificate.`,
      link: { kind: 'enrollment', id: certificatesDue[0].id },
      at: pastTimestamp(1, 3),
    });
  }

  admin({
    type: 'system',
    title: 'Welcome to Ansita Admin',
    message: 'Manage bookings, customers, staff, courses and offers from one place.',
    link: null,
    at: pastTimestamp(58),
  });

  // ---------- Demo customer ----------

  const mine = (list: readonly Appointment[]) => list.filter((appointment) => appointment.customerId === CUSTOMER_IDS.priya);
  const myUpcoming = mine(future).filter((appointment) => appointment.status === 'confirmed' || appointment.status === 'pending');
  const next = myUpcoming[0];

  if (next) {
    customer({
      type: 'appointment_reminder',
      title: 'Upcoming appointment',
      message: `${serviceNames(next)} with ${firstName(next.staffId)} on ${when(next)}. See you soon!`,
      link: appointmentLink(next),
      at: pastTimestamp(0, 1),
    });
  }

  myUpcoming
    .filter((appointment) => appointment.status === 'confirmed')
    .forEach((appointment) =>
      customer({
        type: 'appointment_confirmed',
        title: 'Appointment confirmed',
        message: `Your ${serviceNames(appointment)} with ${firstName(appointment.staffId)} is confirmed for ${when(appointment)}.`,
        link: appointmentLink(appointment),
        at: appointment.createdAt,
      }),
    );

  mine(past).forEach((appointment) => {
    if (appointment.status === 'completed' && appointment.amountPaid > 0) {
      customer({
        type: 'payment',
        title: 'Payment received',
        message: `Thank you! ${formatCurrency(appointment.amountPaid)} received for ${serviceNames(appointment)}.`,
        link: appointmentLink(appointment),
        at: appointment.updatedAt,
      });
    }
    if (appointment.status === 'cancelled') {
      customer({
        type: 'appointment_cancelled',
        title: 'Appointment cancelled',
        message: `Your ${serviceNames(appointment)} on ${when(appointment)} was cancelled.`,
        link: appointmentLink(appointment),
        at: appointment.updatedAt,
      });
    }
  });

  reviews
    .filter((review) => review.customerId === CUSTOMER_IDS.priya && review.reply)
    .forEach((review) =>
      customer({
        type: 'system',
        title: 'Ansita replied to your review',
        message: review.reply ?? '',
        link: { kind: 'appointment', id: review.appointmentId },
        at: review.updatedAt,
      }),
    );

  enrollments
    .filter((enrollment) => enrollment.studentId === CUSTOMER_IDS.priya)
    .forEach((enrollment) => {
      const course = courses.find((item) => item.id === enrollment.courseId);
      const balance = enrollment.feeTotal - enrollment.feePaid;
      customer({
        type: 'enrollment',
        title: 'Seat reserved',
        message: `You are enrolled in ${course?.title ?? 'the course'}.${balance > 0 ? ` Balance of ${formatCurrency(balance)} is due before the first class.` : ''}`,
        link: { kind: 'enrollment', id: enrollment.id },
        at: enrollment.createdAt,
      });
    });

  [OFFER_IDS.festive, OFFER_IDS.nails].forEach((offerId, index) => {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer) return;
    customer({
      type: 'promotion',
      title: `${offer.title} ✨`,
      message: offer.code ? `${offer.description} Use code ${offer.code}.` : offer.description,
      link: { kind: 'offer', id: offer.id },
      at: pastTimestamp(index === 0 ? 1 : 4, 2),
    });
  });

  customer({
    type: 'system',
    title: 'Welcome to Ansita!',
    message: 'Book appointments, explore beauty courses and collect loyalty points on every visit.',
    link: null,
    at: pastTimestamp(59),
  });

  return drafts
    .filter((draft) => draft.at <= now)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(({ at, ...draft }, index) => ({
      id: `ntf_${String(index + 1).padStart(3, '0')}`,
      createdAt: at,
      updatedAt: at,
      ...draft,
      isRead: Date.now() - new Date(at).getTime() > TWO_DAYS_MS,
    }));
};
