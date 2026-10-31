import type { BaseEntity, ID, UpdateInput } from '@/types';
import { nowISO } from '@/utils/date';
import { generateId, type IdPrefix } from '@/utils/id';

/** Fresh id + timestamps for a new entity. */
export const newEntityMeta = (prefix: IdPrefix): BaseEntity => {
  const timestamp = nowISO();
  return { id: generateId(prefix), createdAt: timestamp, updatedAt: timestamp };
};

export const findEntity = <T extends BaseEntity>(items: readonly T[], id: ID): T | undefined =>
  items.find((item) => item.id === id);

/** Newest first, matching how lists are displayed. */
export const insertEntity = <T extends BaseEntity>(items: readonly T[], item: T): T[] => [
  item,
  ...items.filter((existing) => existing.id !== item.id),
];

export const patchEntity = <T extends BaseEntity>(item: T, patch: UpdateInput<T>): T => ({
  ...item,
  ...patch,
  updatedAt: nowISO(),
});

export const updateEntity = <T extends BaseEntity>(
  items: readonly T[],
  id: ID,
  patch: UpdateInput<T>,
): T[] => items.map((item) => (item.id === id ? patchEntity(item, patch) : item));

export const removeEntity = <T extends BaseEntity>(items: readonly T[], id: ID): T[] =>
  items.filter((item) => item.id !== id);

export const sortByCreatedDesc = <T extends BaseEntity>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Case-insensitive "contains" match against any of the given fields. */
export const matchesQuery = (query: string, ...fields: readonly (string | null | undefined)[]): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle) ?? false);
};
