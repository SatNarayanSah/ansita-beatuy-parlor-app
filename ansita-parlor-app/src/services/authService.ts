import { DEMO_ACCOUNTS } from '@/data/users';
import { selectCurrentUser, useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import { newEntityMeta } from '@/store/entityHelpers';
import type { Customer, ImageUri, User, UserRole } from '@/types';
import { nowISO } from '@/utils/date';
import { normalizePhone } from '@/utils/phone';
import { generateToken } from '@/utils/id';

import { ApiError, ensureFound, simulateRequest } from './client';
import { notifyAdmins, notifyUser } from './notify';
import { requireUser } from './session';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ProfileInput {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: ImageUri | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const startSession = (user: User): void => {
  useAuthStore.getState().setSession({ userId: user.id, token: generateToken(), signedInAt: nowISO() });
};

const assertEmailAvailable = (email: string, exceptUserId?: string): void => {
  const taken = useAuthStore
    .getState()
    .users.some((user) => user.id !== exceptUserId && normalizeEmail(user.email) === email);
  if (taken) throw new ApiError('CONFLICT', 'An account with this email already exists.');
};

export const authService = {
  login: ({ email, password }: LoginInput): Promise<User> =>
    simulateRequest(() => {
      const { credentials, getUserById } = useAuthStore.getState();
      const credential = credentials.find(
        (item) => normalizeEmail(item.email) === normalizeEmail(email) && item.password === password,
      );
      const user = credential ? getUserById(credential.userId) : undefined;
      if (!user) throw new ApiError('UNAUTHORIZED', 'Invalid email or password.');
      startSession(user);
      return user;
    }),

  /** One-tap "Continue as demo admin / customer". */
  loginAsDemo: (role: UserRole): Promise<User> => {
    const { email, password } = DEMO_ACCOUNTS[role];
    return authService.login({ email, password });
  },

  logout: (): Promise<void> =>
    simulateRequest(() => useAuthStore.getState().clearSession(), { neverFail: true }),

  /** Creates a customer profile plus an app account and signs the user in. */
  register: (input: RegisterInput): Promise<User> =>
    simulateRequest(() => {
      const email = normalizeEmail(input.email);
      const phone = normalizePhone(input.phone);
      assertEmailAvailable(email);

      const customerStore = useCustomerStore.getState();
      const existingCustomer = customerStore.customers.find((customer) => customer.phone === phone);
      const linkedAlready = existingCustomer
        ? useAuthStore.getState().users.some((user) => user.customerId === existingCustomer.id)
        : false;
      if (linkedAlready) {
        throw new ApiError('CONFLICT', 'An account with this phone number already exists.');
      }

      // Walk-in customers who later download the app keep their history.
      let customerId: string;
      if (existingCustomer) {
        customerId = existingCustomer.id;
        customerStore.updateCustomer(customerId, { name: input.name.trim(), email });
      } else {
        const timestamp = nowISO();
        const customer: Customer = {
          ...newEntityMeta('cus'),
          name: input.name.trim(),
          phone,
          email,
          gender: 'female',
          dob: null,
          address: { line1: '', line2: '', city: '', province: '', postalCode: '' },
          notes: '',
          loyaltyPoints: 0,
          joinedAt: timestamp,
          avatar: null,
          tags: ['new'],
        };
        customerStore.addCustomer(customer);
        customerId = customer.id;
      }

      const user: User = {
        ...newEntityMeta('usr'),
        role: 'customer',
        name: input.name.trim(),
        email,
        phone,
        avatar: null,
        customerId,
        staffId: null,
      };
      useAuthStore.getState().addUser(user, { email, password: input.password, userId: user.id });
      startSession(user);

      notifyUser(user.id, {
        type: 'system',
        title: 'Welcome to Ansita!',
        message: 'Book your first appointment or explore our beauty courses.',
      });
      notifyAdmins({
        type: 'system',
        title: 'New customer signed up',
        message: `${user.name} created an account in the app.`,
        link: { kind: 'customer', id: customerId },
      });
      return user;
    }),

  /** Resolves the signed-in user, or null when there is no valid session. */
  getCurrentUser: (): Promise<User | null> =>
    simulateRequest(() => selectCurrentUser(useAuthStore.getState()), { neverFail: true }),

  /** Updates the account and, for customers, mirrors the change onto the customer profile. */
  updateProfile: (input: ProfileInput): Promise<User> =>
    simulateRequest(() => {
      const user = requireUser();
      const email = input.email !== undefined ? normalizeEmail(input.email) : undefined;
      if (email !== undefined) assertEmailAvailable(email, user.id);
      const patch: ProfileInput = {
        ...input,
        ...(email !== undefined ? { email } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
      };

      const authStore = useAuthStore.getState();
      authStore.updateUser(user.id, patch);
      if (email !== undefined) {
        useAuthStore.setState((state) => ({
          credentials: state.credentials.map((credential) =>
            credential.userId === user.id ? { ...credential, email } : credential,
          ),
        }));
      }
      if (user.customerId) {
        useCustomerStore.getState().updateCustomer(user.customerId, patch);
      }
      return ensureFound(useAuthStore.getState().getUserById(user.id), 'User');
    }),

  changePassword: ({ currentPassword, newPassword }: ChangePasswordInput): Promise<void> =>
    simulateRequest(() => {
      const user = requireUser();
      const credential = useAuthStore.getState().credentials.find((item) => item.userId === user.id);
      if (!credential || credential.password !== currentPassword) {
        throw new ApiError('VALIDATION', 'Current password is incorrect.');
      }
      if (currentPassword === newPassword) {
        throw new ApiError('VALIDATION', 'New password must be different from the current one.');
      }
      useAuthStore.getState().setPassword(user.id, newPassword);
    }),

  /** Demo logins for the sign-in screen's quick-fill buttons. */
  getDemoAccounts: (): Promise<DemoAccount[]> =>
    simulateRequest(
      () => {
        const { credentials, getUserById } = useAuthStore.getState();
        return credentials.flatMap((credential) => {
          const user = getUserById(credential.userId);
          return user
            ? [{ email: credential.email, password: credential.password, role: user.role, name: user.name }]
            : [];
        });
      },
      { neverFail: true },
    ),
};
