import type { BaseEntity, ID, ImageUri, TimeString, Weekday } from './common';

export type StaffRole =
  | 'owner'
  | 'senior_stylist'
  | 'stylist'
  | 'beautician'
  | 'trainer'
  | 'receptionist';

export interface WorkingHours {
  day: Weekday;
  isOff: boolean;
  start: TimeString;
  end: TimeString;
}

export interface Staff extends BaseEntity {
  name: string;
  role: StaffRole;
  phone: string;
  email: string;
  /** Category ids this staff member is qualified to perform. */
  specialties: ID[];
  workingHours: WorkingHours[];
  avatar: ImageUri | null;
  /** Average rating 0-5, recalculated when reviews change. */
  rating: number;
  isActive: boolean;
}
