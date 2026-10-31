import type { DemoCredential, User, UserRole } from '@/types';

import { CUSTOMER_IDS } from './customers';
import { seedBase } from './helpers';
import { STAFF_IDS } from './team';

export const USER_IDS = {
  admin: 'usr_admin',
  customer: 'usr_customer',
} as const;

/** The two demo logins, used by the sign-in screen and "Continue as demo …" buttons. */
export const DEMO_ACCOUNTS: Record<UserRole, { email: string; password: string; userId: string }> = {
  admin: { email: 'admin@ansita.com', password: 'admin123', userId: USER_IDS.admin },
  customer: { email: 'customer@ansita.com', password: 'customer123', userId: USER_IDS.customer },
};

export const buildUsers = (): User[] => [
  {
    ...seedBase(USER_IDS.admin, 1100),
    role: 'admin',
    name: 'Ansita Shrestha',
    email: DEMO_ACCOUNTS.admin.email,
    phone: '+9779841500100',
    avatar: null,
    customerId: null,
    staffId: STAFF_IDS.ansita,
  },
  {
    ...seedBase(USER_IDS.customer, 420),
    role: 'customer',
    name: 'Priya Sharma',
    email: DEMO_ACCOUNTS.customer.email,
    phone: '+9779841234567',
    avatar: null,
    customerId: CUSTOMER_IDS.priya,
    staffId: null,
  },
];

export const buildDemoCredentials = (): DemoCredential[] => Object.values(DEMO_ACCOUNTS).map((account) => ({ ...account }));
