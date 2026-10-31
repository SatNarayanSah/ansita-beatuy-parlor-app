import type { Address, Customer, CustomerTag, Gender } from '@/types';

import { pastTimestamp, seedBase } from './helpers';

/** Named ids for customers that other seed files reference directly. */
export const CUSTOMER_IDS = {
  /** Linked to the demo customer login. */
  priya: 'cus_001',
  sabina: 'cus_002',
  anjali: 'cus_003',
  sristi: 'cus_004',
  manisha: 'cus_005',
  kritika: 'cus_006',
  shreya: 'cus_016',
  alisha: 'cus_022',
} as const;

const KTM = { city: 'Kathmandu', postalCode: '44600' };
const LTP = { city: 'Lalitpur', postalCode: '44700' };
const BKT = { city: 'Bhaktapur', postalCode: '44800' };

const address = (line1: string, place: { city: string; postalCode: string } = KTM): Address => ({
  line1,
  line2: '',
  city: place.city,
  province: 'Bagmati',
  postalCode: place.postalCode,
});

interface CustomerSeed {
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  dob: string | null;
  address: Address;
  notes: string;
  loyaltyPoints: number;
  joinedDaysAgo: number;
  tags: CustomerTag[];
}

/**
 * Loyalty points are lifetime totals (1 point per Rs. 100), so long-standing
 * VIPs carry far more than the 60 days of seeded history would earn.
 */
const CUSTOMER_SEEDS: CustomerSeed[] = [
  { name: 'Priya Sharma', phone: '+9779841234567', email: 'customer@ansita.com', gender: 'female', dob: '1996-04-12', address: address('Baneshwor-10'), notes: 'Prefers ammonia-free colour. Sensitive scalp.', loyaltyPoints: 640, joinedDaysAgo: 420, tags: ['vip', 'regular'] },
  { name: 'Sabina Shrestha', phone: '+9779851087654', email: 'sabina.shrestha@gmail.com', gender: 'female', dob: '1998-11-02', address: address('Kupondole-4', LTP), notes: 'Wedding on Mangsir 18. Bridal trial and pre-bridal facials booked.', loyaltyPoints: 260, joinedDaysAgo: 75, tags: ['bridal'] },
  { name: 'Anjali Karki', phone: '+9779803456781', email: 'anjali.karki@gmail.com', gender: 'female', dob: '1997-02-19', address: address('Maharajgunj-3'), notes: 'Engagement next month. Likes soft, natural looks.', loyaltyPoints: 180, joinedDaysAgo: 50, tags: ['bridal', 'new'] },
  { name: 'Sristi Thapa', phone: '+9779818123450', email: 'sristi.thapa@yahoo.com', gender: 'female', dob: '2001-07-07', address: address('Kalanki-14'), notes: 'Basic Beautician course student.', loyaltyPoints: 90, joinedDaysAgo: 70, tags: ['student', 'regular'] },
  { name: 'Manisha Rai', phone: '+9779842210987', email: 'manisha.rai@gmail.com', gender: 'female', dob: '1990-05-23', address: address('Jhamsikhel', LTP), notes: 'Allergic to fragrance-heavy products. Patch test first.', loyaltyPoints: 1120, joinedDaysAgo: 900, tags: ['vip', 'regular'] },
  { name: 'Kritika Adhikari', phone: '+9779860045671', email: 'kritika.adhikari@gmail.com', gender: 'female', dob: '1999-09-30', address: address('Chabahil-7'), notes: 'Bride-to-be. Wants a Newari-style bridal look.', loyaltyPoints: 140, joinedDaysAgo: 40, tags: ['bridal', 'new'] },
  { name: 'Sunita Gurung', phone: '+9779846654321', email: 'sunita.gurung@gmail.com', gender: 'female', dob: '1985-03-14', address: address('Boudha-6'), notes: 'Monthly hair spa. Usually books Saturday mornings.', loyaltyPoints: 870, joinedDaysAgo: 760, tags: ['vip', 'regular'] },
  { name: 'Rojita Maharjan', phone: '+9779841122334', email: 'rojita.m@gmail.com', gender: 'female', dob: '1993-12-01', address: address('Kirtipur-5', { city: 'Kirtipur', postalCode: '44618' }), notes: '', loyaltyPoints: 310, joinedDaysAgo: 380, tags: ['regular'] },
  { name: 'Bipana Basnet', phone: '+9779808765432', email: 'bipana.basnet@gmail.com', gender: 'female', dob: '2003-06-25', address: address('Koteshwor-32'), notes: 'Nail Art student. Interested in gel extensions.', loyaltyPoints: 60, joinedDaysAgo: 30, tags: ['student', 'new'] },
  { name: 'Asmita Poudel', phone: '+9779849988776', email: 'asmita.poudel@gmail.com', gender: 'female', dob: '1995-01-08', address: address('Naxal-1'), notes: 'Prefers Puja for facials.', loyaltyPoints: 420, joinedDaysAgo: 510, tags: ['regular'] },
  { name: 'Nirmala Bhattarai', phone: '+9779851234098', email: 'nirmala.b@gmail.com', gender: 'female', dob: '1978-08-17', address: address('Old Baneshwor-31'), notes: 'Root touch-up every 5 weeks, shade 4.0 dark brown.', loyaltyPoints: 980, joinedDaysAgo: 1000, tags: ['vip', 'regular'] },
  { name: 'Pratiksha KC', phone: '+9779813345566', email: 'pratiksha.kc@gmail.com', gender: 'female', dob: '2000-04-04', address: address('Sanepa-2', LTP), notes: '', loyaltyPoints: 150, joinedDaysAgo: 160, tags: ['regular'] },
  { name: 'Samjhana Tamang', phone: '+9779800112233', email: '', gender: 'female', dob: null, address: address('Swayambhu-15'), notes: 'Prefers phone calls over messages.', loyaltyPoints: 20, joinedDaysAgo: 12, tags: ['new'] },
  { name: 'Laxmi Magar', phone: '+9779845566778', email: 'laxmi.magar@gmail.com', gender: 'female', dob: '1982-10-21', address: address('Suryabinayak-4', BKT), notes: 'Has not visited in a few months.', loyaltyPoints: 230, joinedDaysAgo: 640, tags: ['inactive'] },
  { name: 'Rabina Khadka', phone: '+9779862233445', email: 'rabina.khadka@gmail.com', gender: 'female', dob: '1994-02-28', address: address('Gongabu-29'), notes: 'Skin Care Specialist course graduate.', loyaltyPoints: 360, joinedDaysAgo: 300, tags: ['student', 'regular'] },
  { name: 'Shreya Joshi', phone: '+9779841098765', email: 'shreya.joshi@gmail.com', gender: 'female', dob: '1996-07-15', address: address('Thapathali-11'), notes: 'Wedding in Poush. Wants pre-bridal package quote.', loyaltyPoints: 210, joinedDaysAgo: 95, tags: ['bridal', 'regular'] },
  { name: 'Usha Pandey', phone: '+9779854433221', email: 'usha.pandey@gmail.com', gender: 'female', dob: '1975-11-11', address: address('Dillibazar-30'), notes: 'Back pain, avoid deep pressure massage.', loyaltyPoints: 760, joinedDaysAgo: 870, tags: ['vip'] },
  { name: 'Prakriti Lama', phone: '+9779817788990', email: 'prakriti.lama@gmail.com', gender: 'female', dob: '2002-03-03', address: address('Jorpati-6'), notes: '', loyaltyPoints: 40, joinedDaysAgo: 20, tags: ['new'] },
  { name: 'Smriti Neupane', phone: '+9779843322110', email: 'smriti.neupane@gmail.com', gender: 'female', dob: '1992-09-09', address: address('Balkhu-14'), notes: 'Short on time, prefers express services.', loyaltyPoints: 280, joinedDaysAgo: 290, tags: ['regular'] },
  { name: 'Dikshya Shakya', phone: '+9779808899001', email: 'dikshya.shakya@gmail.com', gender: 'female', dob: '1999-05-12', address: address('Patan Durbar Square', LTP), notes: 'Hair Styling course student.', loyaltyPoints: 110, joinedDaysAgo: 120, tags: ['student', 'regular'] },
  { name: 'Kabita Dahal', phone: '+9779846677889', email: 'kabita.dahal@gmail.com', gender: 'female', dob: '1988-06-06', address: address('Chandol-4'), notes: '', loyaltyPoints: 330, joinedDaysAgo: 450, tags: ['regular'] },
  { name: 'Alisha Bajracharya', phone: '+9779861122003', email: 'alisha.b@gmail.com', gender: 'female', dob: '2000-12-24', address: address('Kumaripati-5', LTP), notes: 'Engagement in two weeks.', loyaltyPoints: 90, joinedDaysAgo: 35, tags: ['bridal', 'new'] },
  { name: 'Bimala Chaudhary', phone: '+9779804455667', email: 'bimala.c@gmail.com', gender: 'female', dob: '1986-01-30', address: address('Sitapaila-8'), notes: 'Bridal Makeup course graduate, now freelancing.', loyaltyPoints: 400, joinedDaysAgo: 520, tags: ['student', 'regular'] },
  { name: 'Sujata Ghimire', phone: '+9779852211009', email: 'sujata.ghimire@gmail.com', gender: 'female', dob: '1991-04-18', address: address('Bhaktapur Durbar Square', BKT), notes: '', loyaltyPoints: 190, joinedDaysAgo: 230, tags: ['regular'] },
  { name: 'Roshni Singh', phone: '+9779814455009', email: 'roshni.singh@gmail.com', gender: 'female', dob: '1997-08-08', address: address('Thamel-26'), notes: 'Tourist guide, books around trekking season.', loyaltyPoints: 70, joinedDaysAgo: 140, tags: ['inactive'] },
  { name: 'Mira Thakuri', phone: '+9779842299887', email: 'mira.thakuri@gmail.com', gender: 'female', dob: '1989-02-02', address: address('Budhanilkantha-2'), notes: 'Refers many friends. Give priority slots.', loyaltyPoints: 1340, joinedDaysAgo: 1050, tags: ['vip', 'regular'] },
  { name: 'Aarati Sapkota', phone: '+9779809988776', email: 'aarati.sapkota@gmail.com', gender: 'female', dob: '2004-10-10', address: address('Tokha-9'), notes: 'Advanced Makeup course student.', loyaltyPoints: 30, joinedDaysAgo: 25, tags: ['student', 'new'] },
  { name: 'Rajesh Shrestha', phone: '+9779851100223', email: 'rajesh.shrestha@gmail.com', gender: 'male', dob: '1987-05-05', address: address('New Road-22'), notes: 'Haircut every 4 weeks. Brings his son for kids cuts.', loyaltyPoints: 220, joinedDaysAgo: 330, tags: ['regular'] },
  { name: 'Suman Bhandari', phone: '+9779848877665', email: 'suman.bhandari@gmail.com', gender: 'male', dob: '1994-09-19', address: address('Kalimati-13'), notes: 'Head massage regular.', loyaltyPoints: 130, joinedDaysAgo: 180, tags: ['regular'] },
  { name: 'Nisha Upreti', phone: '+9779816655443', email: 'nisha.upreti@gmail.com', gender: 'female', dob: '1998-03-21', address: address('Battisputali-9'), notes: 'Booked through Instagram.', loyaltyPoints: 10, joinedDaysAgo: 6, tags: ['new'] },
];

/** `cus_001`..`cus_030`, in the order above. */
export const customerId = (index: number): string => `cus_${String(index + 1).padStart(3, '0')}`;

export interface CustomerProfile {
  id: string;
  name: string;
  gender: Gender;
  joinedDaysAgo: number;
  tags: readonly CustomerTag[];
}

/** Lightweight view used by the appointment and enrollment generators. */
export const CUSTOMER_PROFILES: readonly CustomerProfile[] = CUSTOMER_SEEDS.map((seed, index) => ({
  id: customerId(index),
  name: seed.name,
  gender: seed.gender,
  joinedDaysAgo: seed.joinedDaysAgo,
  tags: seed.tags,
}));

export const buildCustomers = (): Customer[] =>
  CUSTOMER_SEEDS.map(({ joinedDaysAgo, ...seed }, index) => ({
    ...seedBase(customerId(index), joinedDaysAgo),
    ...seed,
    joinedAt: pastTimestamp(joinedDaysAgo),
    avatar: null,
  }));
