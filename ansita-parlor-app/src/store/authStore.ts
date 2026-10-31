import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { buildDemoCredentials, buildUsers } from '@/data/users';
import type { DemoCredential, ID, Session, UpdateInput, User, UserRole } from '@/types';

import { findEntity, insertEntity, removeEntity, updateEntity } from './entityHelpers';
import { persistStorage, resetOnVersionMismatch, STORAGE_KEYS, STORE_VERSION } from './storage';

interface AuthData {
  users: User[];
  credentials: DemoCredential[];
  session: Session | null;
}

interface AuthActions {
  setSession: (session: Session) => void;
  clearSession: () => void;
  addUser: (user: User, credential: DemoCredential) => void;
  updateUser: (id: ID, patch: UpdateInput<User>) => void;
  /** Removes the user and their credentials, ending the session if it was theirs. */
  deleteUser: (id: ID) => void;
  setPassword: (userId: ID, password: string) => void;
  getUserById: (id: ID) => User | undefined;
  getCurrentUser: () => User | null;
  reset: () => void;
}

export type AuthState = AuthData & AuthActions;

const createInitialData = (): AuthData => ({
  users: buildUsers(),
  credentials: buildDemoCredentials(),
  session: null,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),

      addUser: (user, credential) =>
        set((state) => ({
          users: insertEntity(state.users, user),
          credentials: [...state.credentials, credential],
        })),

      updateUser: (id, patch) => set((state) => ({ users: updateEntity(state.users, id, patch) })),

      deleteUser: (id) =>
        set((state) => ({
          users: removeEntity(state.users, id),
          credentials: state.credentials.filter((credential) => credential.userId !== id),
          session: state.session?.userId === id ? null : state.session,
        })),

      setPassword: (userId, password) =>
        set((state) => ({
          credentials: state.credentials.map((credential) =>
            credential.userId === userId ? { ...credential, password } : credential,
          ),
        })),

      getUserById: (id) => findEntity(get().users, id),

      getCurrentUser: () => selectCurrentUser(get()),

      reset: () => set(createInitialData()),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: persistStorage,
      version: STORE_VERSION,
      migrate: resetOnVersionMismatch(createInitialData()),
      partialize: ({ users, credentials, session }): AuthData => ({ users, credentials, session }),
    },
  ),
);

// ---------- Selectors ----------

export const selectCurrentUser = (state: AuthData): User | null => {
  const { session } = state;
  if (!session) return null;
  return findEntity(state.users, session.userId) ?? null;
};

export const selectIsAuthenticated = (state: AuthData): boolean => selectCurrentUser(state) !== null;

export const selectCurrentRole = (state: AuthData): UserRole | null => selectCurrentUser(state)?.role ?? null;

export const selectUsersByRole = (users: readonly User[], role: UserRole): User[] =>
  users.filter((user) => user.role === role);

export const selectUserByCustomerId = (users: readonly User[], customerId: ID): User | undefined =>
  users.find((user) => user.customerId === customerId);
