import type { Appointment, ID, Review, ReviewRating } from '@/types';
import { combineDateTime, todayISO } from '@/utils/date';

import { buildAppointments } from './appointments';
import { CATEGORY_IDS } from './categories';
import { CUSTOMER_IDS } from './customers';
import { createRandom } from './random';
import { buildServices } from './services';

const COMMENTS: Record<ID, Partial<Record<ReviewRating, readonly string[]>>> = {
  [CATEGORY_IDS.hair]: {
    5: ['Sarita didi understood exactly what I wanted. My hair has never looked this good!', 'Colour came out perfect and my scalp did not itch at all.', 'Best hair spa in Kathmandu. Hair feels so soft.'],
    4: ['Good cut and friendly staff. Had to wait about 15 minutes.', 'Nice result, slightly pricier than nearby parlours but worth it.'],
    3: ['Haircut was okay, a bit shorter than I asked for.'],
    2: ['Colour faded faster than I expected.'],
  },
  [CATEGORY_IDS.skin]: {
    5: ['My skin is glowing after the facial. Didi was so gentle.', 'Hydra facial was so relaxing, I almost fell asleep!', 'Very hygienic setup and they used fresh products in front of me.'],
    4: ['Lovely facial, waiting time was a bit long.', 'Skin felt fresh. Would like a longer massage next time.'],
    3: ['Clean-up was fine but slightly rushed.'],
  },
  [CATEGORY_IDS.makeup]: {
    5: ['Flawless job. Makeup lasted the whole night of dancing!', 'Everyone at the function asked who did my makeup.', 'Sari draping was so neat, it did not move all day.'],
    4: ['Beautiful makeup, foundation was a shade light in photos.'],
  },
  [CATEGORY_IDS.nails]: {
    5: ['Rojina is so creative with nail art. Gel polish still perfect after 2 weeks.', 'Super relaxing pedicure and very clean tools.'],
    4: ['Neat work. Would love more colour options.'],
    3: ['Manicure was fine but one nail chipped in 3 days.'],
  },
  [CATEGORY_IDS.waxing]: {
    5: ['Quick and almost painless threading. Perfect brow shape.', 'Rica wax was gentle on my sensitive skin.'],
    4: ['Good waxing, slightly crowded on Saturday.'],
  },
  [CATEGORY_IDS.spa]: {
    5: ['Best massage I have had in the valley. All my back pain was gone.', 'Head massage after a long office week was heaven.'],
    4: ['Very relaxing, the room could have been a little warmer.'],
    2: ['Pressure was too hard for me even after I asked to reduce it.'],
  },
};

const REPLIES = [
  'Thank you so much! We look forward to seeing you again.',
  'Dhanyabad! It was a pleasure pampering you.',
  'Thank you for the feedback. We are working on reducing waiting times.',
  'Sorry it was not perfect this time. Please call us and we will fix it free of charge.',
  'So happy you loved it! See you next month.',
] as const;

const RATING_WEIGHTS = { '5': 66, '4': 26, '3': 6, '2': 2 } as const;

/** Picks a comment for the rating, falling back to the nearest rating that has comments. */
const commentFor = (categoryId: ID, rating: ReviewRating, pick: (items: readonly string[]) => string): string => {
  const pool = COMMENTS[categoryId] ?? {};
  const ratings: ReviewRating[] = [rating, 4, 5, 3];
  const options = ratings.map((r) => pool[r]).find((list) => list && list.length > 0);
  return options ? pick(options) : 'Great service, thank you!';
};

/**
 * Reviews for about 40% of completed appointments. The demo customer's most
 * recent completed visit is left unreviewed so "Write a review" can be tried.
 */
export const buildReviews = (appointments: readonly Appointment[] = buildAppointments()): Review[] => {
  const random = createRandom(53);
  const services = new Map(buildServices().map((service) => [service.id, service]));
  // Past days only: today's statuses depend on the clock, which would make review ids unstable.
  const today = todayISO();
  const completed = appointments.filter((appointment) => appointment.status === 'completed' && appointment.date < today);

  const demoVisits = completed.filter((appointment) => appointment.customerId === CUSTOMER_IDS.priya);
  const keepUnreviewed = demoVisits[demoVisits.length - 1]?.id;

  return completed.flatMap((appointment): Review[] => {
    const roll = random.next();
    const rating = Number(random.weighted(RATING_WEIGHTS)) as ReviewRating;
    const replyRoll = random.next();
    const delayHours = random.int(2, 30);
    const isDemo = appointment.customerId === CUSTOMER_IDS.priya;

    if (appointment.id === keepUnreviewed) return [];
    if (!isDemo && roll > 0.4) return [];

    const main = services.get(appointment.serviceIds[0] ?? '');
    const finishedAt = combineDateTime(appointment.date, appointment.endTime);
    const reviewedAt = new Date(Math.min(Date.now() - 60_000, finishedAt.getTime() + delayHours * 3_600_000));
    // Replies to low ratings always; to others sometimes.
    const reply = rating <= 3 || replyRoll < 0.35 ? (REPLIES[rating <= 3 ? random.int(2, 3) : random.pick([0, 1, 4])] ?? null) : null;
    const timestamp = reviewedAt.toISOString();
    const repliedAt = new Date(Math.min(Date.now() - 60_000, reviewedAt.getTime() + 20 * 3_600_000)).toISOString();

    return [
      {
        id: `rev_${appointment.id.slice(4)}`,
        createdAt: timestamp,
        updatedAt: reply ? repliedAt : timestamp,
        customerId: appointment.customerId,
        appointmentId: appointment.id,
        staffId: appointment.staffId,
        serviceIds: appointment.serviceIds,
        rating,
        comment: commentFor(main?.categoryId ?? '', rating, random.pick),
        reply,
      },
    ];
  });
};
