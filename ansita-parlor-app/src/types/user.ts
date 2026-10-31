import type { BaseEntity, ID, ISODateTime, ImageUri } from './common';

export type UserRole = 'admin' | 'customer';

/** An account that can sign in to the app. */
export interface User extends BaseEntity {
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  avatar: ImageUri | null;
  /** Set when role is `customer`: links the account to its Customer profile. */
  customerId: ID | null;
  /** Set when an admin account belongs to a staff member. */
  staffId: ID | null;
}

/** Demo-only credentials. Never store plain passwords in a real app. */
export interface DemoCredential {
  email: string;
  password: string;
  userId: ID;
}

export interface Session {
  userId: ID;
  token: string;
  signedInAt: ISODateTime;
}
