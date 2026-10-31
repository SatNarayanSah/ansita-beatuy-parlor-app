import type { Address, Customer, CustomerTag, Gender } from '@/types';

import { pastTimestamp, seedBase } from './helpers';

export const CUSTOMER_IDS = {
  priya: 'cus_priya',
  neha: 'cus_neha',
  aasha: 'cus_aasha',
  ritu: 'cus_ritu',
  sujata: 'cus_sujata',
  deepa: 'cus_deepa',
  kiran: 'cus_kiran',
  arjun: 'cus_arjun',
  pemba: 'cus_pemba',
  laxmi: 'cus_laxmi',
  sneha: 'cus_sneha',
  bikram: 'cus_bikram',
} as const;

const address = (line1: string, city = 'Kathmandu', postalCode = '44600'): Address => ({
  line1,
  line2: '',
  city,
  province: 'Bagmati',
  postalCode,
});

interface CustomerSeed {
  id: string;
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

const CUSTOMER_SEEDS: CustomerSeed[] = [
  { id: CUSTOMER_IDS.priya, name: 'Priya Sharma', phone: '+9779841234567', email: 'priya@example.com', gender: 'female', dob: '1996-04-12', address: address('Baneshwor-10'), notes: 'Prefers ammonia-free colour. Sensitive scalp.', loyaltyPoints: 420, joinedDaysAgo: 380, tags: ['vip', 'regular'] },
  { id: CUSTOMER_IDS.neha, name: 'Neha Gupta', phone: '+9779851000011', email: 'neha.gupta@example.com', gender: 'female', dob: '1999-09-03', address: address('Lazimpat-2'), notes: 'Wedding in Mangsir - bridal trial booked.', loyaltyPoints: 180, joinedDaysAgo: 90, tags: ['bridal'] },
  { id: CUSTOMER_IDS.aasha, name: 'Aasha Tamang', phone: '+9779801000012', email: 'aasha.t@example.com', gender: 'female', dob: '2001-01-22', address: address('Boudha-6'), notes: '', loyaltyPoints: 60, joinedDaysAgo: 40, tags: ['student'] },
  { id: CUSTOMER_IDS.ritu, name: 'Ritu Agrawal', phone: '+9779841000013', email: 'ritu.agrawal@example.com', gender: 'female', dob: '1988-11-30', address: address('Jhamsikhel', 'Lalitpur', '44700'), notes: 'Allergic to fragrance-heavy products.', loyaltyPoints: 950, joinedDaysAgo: 720, tags: ['vip', 'regular'] },
  { id: CUSTOMER_IDS.sujata, name: 'Sujata Shrestha', phone: '+9779861000014', email: 'sujata.s@example.com', gender: 'female', dob: '1994-06-18', address: address('Kupondole', 'Lalitpur', '44700'), notes: '', loyaltyPoints: 240, joinedDaysAgo: 210, tags: ['regular'] },
  { id: CUSTOMER_IDS.deepa, name: 'Deepa Karki', phone: '+9779841000015', email: 'deepa.k@example.com', gender: 'female', dob: '1985-02-08', address: address('Maharajgunj-3'), notes: 'Usually books on Saturdays.', loyaltyPoints: 310, joinedDaysAgo: 500, tags: ['regular'] },
  { id: CUSTOMER_IDS.kiran, name: 'Kiran Yadav', phone: '+9779811000016', email: 'kiran.y@example.com', gender: 'female', dob: '2002-07-14', address: address('Kalanki-14'), notes: 'Enrolled in beautician course.', loyaltyPoints: 30, joinedDaysAgo: 25, tags: ['student', 'new'] },
  { id: CUSTOMER_IDS.arjun, name: 'Arjun Thapa', phone: '+9779851000017', email: 'arjun.t@example.com', gender: 'male', dob: '1992-12-05', address: address('Thamel-26'), notes: 'Haircut every 4 weeks.', loyaltyPoints: 150, joinedDaysAgo: 160, tags: ['regular'] },
  { id: CUSTOMER_IDS.pemba, name: 'Pemba Lhamu Sherpa', phone: '+9779801000018', email: '', gender: 'female', dob: null, address: address('Swayambhu-15'), notes: 'Prefers phone calls over messages.', loyaltyPoints: 0, joinedDaysAgo: 8, tags: ['new'] },
  { id: CUSTOMER_IDS.laxmi, name: 'Laxmi Maharjan', phone: '+9779841000019', email: 'laxmi.m@example.com', gender: 'female', dob: '1979-03-27', address: address('Kirtipur-5', 'Kirtipur', '44618'), notes: 'Has not visited in over 4 months.', loyaltyPoints: 120, joinedDaysAgo: 610, tags: ['inactive'] },
  { id: CUSTOMER_IDS.sneha, name: 'Sneha Gurung', phone: '+9779861000020', email: 'sneha.g@example.com', gender: 'female', dob: '2003-10-09', address: address('Chabahil-7'), notes: 'Nail art workshop student.', loyaltyPoints: 45, joinedDaysAgo: 15, tags: ['student', 'new'] },
  { id: CUSTOMER_IDS.bikram, name: 'Bikram Rai', phone: '+9779811000021', email: 'bikram.rai@example.com', gender: 'male', dob: '1990-08-21', address: address('Suryabinayak', 'Bhaktapur', '44800'), notes: '', loyaltyPoints: 75, joinedDaysAgo: 55, tags: ['regular'] },
];

export const buildCustomers = (): Customer[] =>
  CUSTOMER_SEEDS.map(({ joinedDaysAgo, ...seed }) => ({
    ...seedBase(seed.id, joinedDaysAgo),
    ...seed,
    joinedAt: pastTimestamp(joinedDaysAgo),
    avatar: null,
  }));
