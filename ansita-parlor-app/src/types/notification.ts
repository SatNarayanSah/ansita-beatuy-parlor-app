import type { BaseEntity, ID } from './common';

export type NotificationType =
  | 'appointment_booked'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'enrollment'
  | 'payment'
  | 'promotion'
  | 'system';

export interface NotificationLink {
  kind: 'appointment' | 'enrollment' | 'course' | 'customer';
  id: ID;
}

export interface Notification extends BaseEntity {
  /** Recipient user id. */
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link: NotificationLink | null;
}
