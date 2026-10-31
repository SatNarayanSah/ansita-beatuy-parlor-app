import { subDays, subHours } from 'date-fns';

import type { BaseEntity, ID, ISODateTime } from '@/types';

/** Timestamp `daysAgo` days (and optionally `hoursAgo` hours) before now. */
export const pastTimestamp = (daysAgo: number, hoursAgo = 0): ISODateTime =>
  subHours(subDays(new Date(), daysAgo), hoursAgo).toISOString();

/** Base entity fields for a seed record created `daysAgo` days ago. */
export const seedBase = (id: ID, daysAgo: number): BaseEntity => {
  const timestamp = pastTimestamp(daysAgo);
  return { id, createdAt: timestamp, updatedAt: timestamp };
};
