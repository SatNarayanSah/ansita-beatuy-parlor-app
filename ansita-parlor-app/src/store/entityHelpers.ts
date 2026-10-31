import type { BaseEntity, ID } from '@/types';

export const findEntity = <T extends BaseEntity>(items: readonly T[], id: ID): T | undefined =>
  items.find((item) => item.id === id);

export const sortByCreatedDesc = <T extends BaseEntity>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Case-insensitive "contains" match against any of the given fields. */
export const matchesQuery = (query: string, ...fields: readonly (string | null | undefined)[]): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle) ?? false);
};

// ---------- Cache helpers ----------
// The domain stores are a client-side cache of server data. These return `undefined`
// when nothing changed, so stores can skip `set()` and avoid needless re-renders and
// refetches (screens refetch whenever a store they watch changes).

const sameEntity = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Inserts or replaces each incoming entity; existing order is kept, new ones go first. */
export const mergeEntities = <T extends BaseEntity>(items: readonly T[], incoming: readonly T[]): T[] | undefined => {
  if (incoming.length === 0) return undefined;
  const byId = new Map(incoming.map((item) => [item.id, item]));
  let changed = false;
  const updated = items.map((item) => {
    const next = byId.get(item.id);
    if (!next) return item;
    byId.delete(item.id);
    if (sameEntity(item, next)) return item;
    changed = true;
    return next;
  });
  const added = [...byId.values()];
  if (!changed && added.length === 0) return undefined;
  return [...added, ...updated];
};

/** The complete server list replaces the cache. */
export const replaceEntities = <T extends BaseEntity>(items: readonly T[], incoming: readonly T[]): T[] | undefined => {
  if (items.length === incoming.length && items.every((item, index) => sameEntity(item, incoming[index]))) return undefined;
  return [...incoming];
};

export const withoutEntity = <T extends BaseEntity>(items: readonly T[], id: ID): T[] | undefined =>
  items.some((item) => item.id === id) ? items.filter((item) => item.id !== id) : undefined;
