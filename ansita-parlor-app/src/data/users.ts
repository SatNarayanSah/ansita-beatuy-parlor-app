import type { DemoCredential, User } from '@/types';

import { CUSTOMER_IDS } from './customers';
import { seedBase } from './helpers';
import { STAFF_IDS } from './staff';

export const USER_IDS = {
  admin: 'usr_admin',
  reception: 'usr_reception',
  priya: 'usr_priya',
  neha: 'usr_neha',
} as const;

export const buildUsers = (): User[] => [
  {
    ...seedBase(USER_IDS.admin, 900),
    role: 'admin',
    name: 'Anita Verma',
    email: 'admin@ansita.com.np',
    phone: '+9779841011001',
    avatar: null,
    customerId: null,
    staffId: STAFF_IDS.anita,
  },
  {
    ...seedBase(USER_IDS.reception, 300),
    role: 'admin',
    name: 'Front Desk',
    email: 'desk@ansita.com.np',
    phone: '+9779841011000',
    avatar: null,
    customerId: null,
    staffId: null,
  },
  {
    ...seedBase(USER_IDS.priya, 380),
    role: 'customer',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '+9779841234567',
    avatar: null,
    customerId: CUSTOMER_IDS.priya,
    staffId: null,
  },
  {
    ...seedBase(USER_IDS.neha, 90),
    role: 'customer',
    name: 'Neha Gupta',
    email: 'neha.gupta@example.com',
    phone: '+9779851000011',
    avatar: null,
    customerId: CUSTOMER_IDS.neha,
    staffId: null,
  },
];

/** Demo logins shown on the sign-in screen. */
export const buildDemoCredentials = (): DemoCredential[] => [
  { email: 'admin@ansita.com.np', password: 'admin123', userId: USER_IDS.admin },
  { email: 'desk@ansita.com.np', password: 'desk123', userId: USER_IDS.reception },
  { email: 'priya@example.com', password: 'priya123', userId: USER_IDS.priya },
  { email: 'neha.gupta@example.com', password: 'neha123', userId: USER_IDS.neha },
];
