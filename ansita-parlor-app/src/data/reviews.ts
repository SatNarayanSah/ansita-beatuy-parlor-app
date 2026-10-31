import type { Review } from '@/types';

import { CUSTOMER_IDS } from './customers';
import { seedBase } from './helpers';
import { STAFF_IDS } from './staff';

export const buildReviews = (): Review[] => [
  {
    ...seedBase('rev_001', 20),
    customerId: CUSTOMER_IDS.priya,
    appointmentId: 'apt_001',
    staffId: STAFF_IDS.meera,
    serviceIds: ['svc_haircut', 'svc_hair_spa'],
    rating: 5,
    comment: 'Meera understood exactly what I wanted. My hair feels amazing!',
    reply: 'Thank you Priya! See you next month.',
  },
  {
    ...seedBase('rev_002', 17),
    customerId: CUSTOMER_IDS.ritu,
    appointmentId: 'apt_002',
    staffId: STAFF_IDS.sabina,
    serviceIds: ['svc_facial_gold'],
    rating: 4,
    comment: 'Lovely facial and very relaxing. Waiting time was a bit long.',
    reply: null,
  },
  {
    ...seedBase('rev_003', 14),
    customerId: CUSTOMER_IDS.sujata,
    appointmentId: 'apt_003',
    staffId: STAFF_IDS.pooja,
    serviceIds: ['svc_manicure', 'svc_pedicure'],
    rating: 5,
    comment: 'Super neat work and a very clean setup.',
    reply: null,
  },
  {
    ...seedBase('rev_004', 13),
    customerId: CUSTOMER_IDS.arjun,
    appointmentId: 'apt_004',
    staffId: STAFF_IDS.rohit,
    serviceIds: ['svc_haircut'],
    rating: 4,
    comment: 'Good haircut, reasonable price.',
    reply: null,
  },
  {
    ...seedBase('rev_005', 6),
    customerId: CUSTOMER_IDS.priya,
    appointmentId: 'apt_008',
    staffId: STAFF_IDS.sabina,
    serviceIds: ['svc_hydra_facial'],
    rating: 5,
    comment: 'Best hydra facial in Kathmandu. My skin is glowing.',
    reply: 'So happy to hear that!',
  },
  {
    ...seedBase('rev_006', 1),
    customerId: CUSTOMER_IDS.sujata,
    appointmentId: 'apt_012',
    staffId: STAFF_IDS.anita,
    serviceIds: ['svc_party_makeup'],
    rating: 5,
    comment: 'Anita didi did a flawless job. Makeup lasted the whole night.',
    reply: null,
  },
];
