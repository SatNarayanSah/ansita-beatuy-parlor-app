import { selectCurrentUser, useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

import { ApiError } from './client';

/**
 * Server-side style guards. A real backend would resolve the user from the
 * auth token; here we read the persisted session.
 */

export const requireUser = (): User => {
  const user = selectCurrentUser(useAuthStore.getState());
  if (!user) throw new ApiError('UNAUTHORIZED');
  return user;
};

export const requireAdmin = (): User => {
  const user = requireUser();
  if (user.role !== 'admin') throw new ApiError('FORBIDDEN');
  return user;
};

/** Admins may act on any customer; customers only on themselves. */
export const requireCustomerAccess = (customerId: string): User => {
  const user = requireUser();
  if (user.role === 'customer' && user.customerId !== customerId) {
    throw new ApiError('FORBIDDEN');
  }
  return user;
};
