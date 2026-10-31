import { resetCacheStores } from '@/store';
import { selectCurrentUser, useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import type { Customer, ImageUri, User } from '@/types';

import { api } from './client';
import { loadSessionData, refreshNotificationsSoon } from './sync';

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

export interface PasswordResetRequest {
  /** Masked address shown on screen, e.g. "cu•••••@ansita.com". */
  sentTo: string;
  /**
   * The code itself, returned only while the server has no email/SMS sending set up
   * (`EXPOSE_RESET_CODE`). Empty otherwise.
   */
  demoCode: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  newPassword: string;
}

interface SessionResponse {
  user: User;
  token: string;
}

/** Saves the session, then fills the caches before the navigator shows the signed-in tabs. */
const startSession = async ({ user, token }: SessionResponse): Promise<User> => {
  resetCacheStores();
  useAuthStore.getState().setToken(token);
  // Load data while still on the sign-in screen; partial failures are retried by later screens.
  await loadSessionData(user).catch(() => undefined);
  useAuthStore.getState().setSession(user, token);
  return user;
};

export const authService = {
  login: async ({ email, password }: LoginInput): Promise<User> =>
    startSession(await api<SessionResponse>('POST', '/auth/login', { body: { email: email.trim(), password } })),

  /** Step 1 of "Forgot password": the server issues a 6-digit code valid for 10 minutes. */
  requestPasswordReset: (email: string): Promise<PasswordResetRequest> =>
    api<PasswordResetRequest>('POST', '/auth/password-reset/request', { body: { email: email.trim() } }),

  /** Step 2 of "Forgot password": checks the code and sets the new password. Does not sign in. */
  resetPassword: async ({ email, code, newPassword }: ResetPasswordInput): Promise<void> => {
    await api<null>('POST', '/auth/password-reset/confirm', { body: { email: email.trim(), code, newPassword } });
  },

  /** Always succeeds locally; the token is simply forgotten. */
  logout: async (): Promise<void> => {
    await api<null>('POST', '/auth/logout').catch(() => undefined);
    useAuthStore.getState().clearSession();
    resetCacheStores();
  },

  /** Creates a customer profile plus an app account and signs the user in. */
  register: async (input: RegisterInput): Promise<User> =>
    startSession(await api<SessionResponse>('POST', '/auth/register', { body: input })),

  /** Resolves the signed-in user, or null when there is no valid session. */
  getCurrentUser: async (): Promise<User | null> => {
    if (!useAuthStore.getState().token) return null;
    const user = await api<User | null>('GET', '/auth/me');
    if (user) useAuthStore.getState().setUser(user);
    return user ?? selectCurrentUser(useAuthStore.getState());
  },

  /** Updates the account and, for customers, the linked customer profile. */
  updateProfile: async (input: ProfileInput): Promise<User> => {
    const user = await api<User>('PATCH', '/auth/me', { body: input });
    useAuthStore.getState().setUser(user);
    if (user.customerId) {
      const customer = await api<Customer>('GET', `/customers/${user.customerId}`).catch(() => null);
      if (customer) useCustomerStore.getState().mergeCustomers([customer]);
    }
    return user;
  },

  /** Other sessions of this account are signed out; this device gets a fresh token. */
  changePassword: async (input: ChangePasswordInput): Promise<void> => {
    const { token } = await api<{ token: string }>('POST', '/auth/change-password', { body: input });
    useAuthStore.getState().setToken(token);
    refreshNotificationsSoon();
  },
};
