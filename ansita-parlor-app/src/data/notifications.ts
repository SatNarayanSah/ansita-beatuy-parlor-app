import type { Notification } from '@/types';

import { pastTimestamp } from './helpers';
import { USER_IDS } from './users';

type NotificationSeed = Omit<Notification, 'createdAt' | 'updatedAt'> & {
  daysAgo: number;
  hoursAgo: number;
};

const NOTIFICATION_SEEDS: NotificationSeed[] = [
  // Admin
  { id: 'ntf_001', userId: USER_IDS.admin, type: 'appointment_booked', title: 'New booking request', message: 'Pemba Lhamu Sherpa requested Eyebrow Threading + Full Body Waxing today at 3:30 PM.', isRead: false, link: { kind: 'appointment', id: 'apt_016' }, daysAgo: 0, hoursAgo: 2 },
  { id: 'ntf_002', userId: USER_IDS.admin, type: 'enrollment', title: 'New course enrollment', message: 'Priya Sharma enrolled in Nail Art Workshop (Weekend Workshop).', isRead: false, link: { kind: 'enrollment', id: 'enr_005' }, daysAgo: 6, hoursAgo: 0 },
  { id: 'ntf_003', userId: USER_IDS.admin, type: 'payment', title: 'Fee received', message: 'Sneha Gurung paid Rs. 9,000 for Hair Cutting & Styling.', isRead: true, link: { kind: 'enrollment', id: 'enr_006' }, daysAgo: 4, hoursAgo: 0 },
  { id: 'ntf_004', userId: USER_IDS.admin, type: 'appointment_cancelled', title: 'Appointment cancelled', message: 'Laxmi Maharjan cancelled her Classic Clean-up.', isRead: true, link: { kind: 'appointment', id: 'apt_006' }, daysAgo: 10, hoursAgo: 3 },
  { id: 'ntf_005', userId: USER_IDS.admin, type: 'system', title: 'Welcome to Ansita Admin', message: 'Manage bookings, customers, staff and training from one place.', isRead: true, link: null, daysAgo: 30, hoursAgo: 0 },
  // Customer: Priya
  { id: 'ntf_101', userId: USER_IDS.priya, type: 'appointment_confirmed', title: 'Appointment confirmed', message: 'Your Global Hair Colour with Meera is confirmed for 11:00 AM.', isRead: false, link: { kind: 'appointment', id: 'apt_019' }, daysAgo: 1, hoursAgo: 0 },
  { id: 'ntf_102', userId: USER_IDS.priya, type: 'enrollment', title: 'Enrollment received', message: 'We received your request for the Nail Art Workshop. Pay the fee at the front desk to confirm your seat.', isRead: false, link: { kind: 'enrollment', id: 'enr_005' }, daysAgo: 6, hoursAgo: 0 },
  { id: 'ntf_103', userId: USER_IDS.priya, type: 'promotion', title: 'Festive offer ✨', message: 'Get 20% off on all facials this week. Book now!', isRead: true, link: null, daysAgo: 9, hoursAgo: 0 },
  { id: 'ntf_104', userId: USER_IDS.priya, type: 'payment', title: 'Payment received', message: 'Thank you! Rs. 3,000 received for Hydra Facial.', isRead: true, link: { kind: 'appointment', id: 'apt_008' }, daysAgo: 7, hoursAgo: 0 },
  // Customer: Neha
  { id: 'ntf_201', userId: USER_IDS.neha, type: 'appointment_reminder', title: 'Appointment today', message: 'Your Engagement Makeup with Anita is today at 4:00 PM.', isRead: false, link: { kind: 'appointment', id: 'apt_017' }, daysAgo: 0, hoursAgo: 4 },
  { id: 'ntf_202', userId: USER_IDS.neha, type: 'appointment_confirmed', title: 'Bridal trial confirmed', message: 'Your Bridal HD Makeup trial is confirmed.', isRead: true, link: { kind: 'appointment', id: 'apt_025' }, daysAgo: 2, hoursAgo: 0 },
];

export const buildNotifications = (): Notification[] =>
  NOTIFICATION_SEEDS.map(({ daysAgo, hoursAgo, ...seed }) => {
    const timestamp = pastTimestamp(daysAgo, hoursAgo);
    return { ...seed, createdAt: timestamp, updatedAt: timestamp };
  });
