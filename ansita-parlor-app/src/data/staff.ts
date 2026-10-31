import type { Staff } from '@/types';
import { roundRating } from '@/utils/format';

import { seedBase } from './helpers';
import { buildReviews } from './reviews';
import { STAFF_PROFILES } from './team';

export { PARLOR_HOURS, STAFF_IDS } from './team';

/** Staff with `rating` equal to the average of their seeded reviews, as reviewService keeps it. */
export const buildStaff = (): Staff[] => {
  const reviews = buildReviews();
  return STAFF_PROFILES.map(({ joinedDaysAgo, ...profile }) => {
    const own = reviews.filter((review) => review.staffId === profile.id);
    const rating = own.length === 0 ? 0 : roundRating(own.reduce((sum, review) => sum + review.rating, 0) / own.length);
    return { ...seedBase(profile.id, joinedDaysAgo), ...profile, rating };
  });
};
