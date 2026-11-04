import { resetCacheStores } from '@/store';
import { selectCurrentUser, useAuthStore } from '@/store/authStore';
import { useCustomerStore } from '@/store/customerStore';
import type { Customer, ImageUri, User } from '@/types';

import { api, isLocalImageUri, uploadImage } from './client';
import { unregisterPhoneNotifications } from './phoneNotifications';
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
  /** From `verifyEmailCode`: proves the email is real and belongs to this person. */
  emailVerificationToken: string;
}

export interface ProfileInput {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: ImageUri | null;
  /** Needed only when `email` changes: from `verifyEmailCode` for the new address. */
  emailVerificationToken?: string;
}

export interface EmailCodeSent {
  /** The address as the server normalised it (lower case). */
  email: string;
  /** Masked address shown on screen, e.g. "si•••@gmail.com". */
  sentTo: string;
  expiresInMinutes: number;
  /** Only while the server has no email provider set up (development). Empty otherwise. */
  demoCode: string;
}

export interface AuthOptions {
  /** false while the server can't send email: sign-up and email changes need no code. */
  emailVerification: boolean;
}

export interface EmailVerified {
  email: string;
  verificationToken: string;
  expiresInMinutes: number;
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

  /** Which sign-up steps the server has switched on (e.g. emailed codes). Public. */
  getAuthOptions: (): Promise<AuthOptions> => api<AuthOptions>('GET', '/auth/options'),

  /** Emails a 6-digit code to prove the address is real (sign-up, or changing your email). */
  sendEmailCode: (email: string): Promise<EmailCodeSent> =>
    api<EmailCodeSent>('POST', '/auth/email/send-code', { body: { email: email.trim() } }),

  /** Checks the emailed code; the returned token goes with `register` / `updateProfile`. */
  verifyEmailCode: (email: string, code: string): Promise<EmailVerified> =>
    api<EmailVerified>('POST', '/auth/email/verify', { body: { email: email.trim(), code: code.trim() } }),

  /** Step 1 of "Forgot password": the server issues a 6-digit code valid for 10 minutes. */
  requestPasswordReset: (email: string): Promise<PasswordResetRequest> =>
    api<PasswordResetRequest>('POST', '/auth/password-reset/request', { body: { email: email.trim() } }),

  /** Step 2 of "Forgot password": checks the code and sets the new password. Does not sign in. */
  resetPassword: async ({ email, code, newPassword }: ResetPasswordInput): Promise<void> => {
    await api<null>('POST', '/auth/password-reset/confirm', { body: { email: email.trim(), code, newPassword } });
  },

  /** Always succeeds locally; the token is simply forgotten. */
  logout: async (): Promise<void> => {
    // While still signed in, so the server can drop this phone from the account.
    await unregisterPhoneNotifications().catch(() => undefined);
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
    // A photo picked on this phone is uploaded first, so the saved link works everywhere.
    const body = isLocalImageUri(input.avatar) ? { ...input, avatar: await uploadImage(input.avatar) } : input;
    const user = await api<User>('PATCH', '/auth/me', { body });
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
