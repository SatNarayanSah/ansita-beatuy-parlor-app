import type {
  Appointment,
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  Service,
  TimeString,
} from '@/types';
import { addMinutesToTime, daysFromToday } from '@/utils/date';

import { CUSTOMER_IDS as C } from './customers';
import { seedBase } from './helpers';
import { STAFF_IDS as S } from './staff';

interface AppointmentSeed {
  id: string;
  customerId: string;
  serviceIds: string[];
  staffId: string;
  dayOffset: number;
  startTime: TimeString;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  /** Only for `partial` payments. */
  amountPaid?: number;
  notes?: string;
  cancellationReason?: string;
}

const APPOINTMENT_SEEDS: AppointmentSeed[] = [
  // Past
  { id: 'apt_001', customerId: C.priya, serviceIds: ['svc_haircut', 'svc_hair_spa'], staffId: S.meera, dayOffset: -21, startTime: '11:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'upi' },
  { id: 'apt_002', customerId: C.ritu, serviceIds: ['svc_facial_gold'], staffId: S.sabina, dayOffset: -18, startTime: '12:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'card' },
  { id: 'apt_003', customerId: C.sujata, serviceIds: ['svc_manicure', 'svc_pedicure'], staffId: S.pooja, dayOffset: -15, startTime: '15:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash' },
  { id: 'apt_004', customerId: C.arjun, serviceIds: ['svc_haircut'], staffId: S.rohit, dayOffset: -14, startTime: '17:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'upi' },
  { id: 'apt_005', customerId: C.deepa, serviceIds: ['svc_hair_spa'], staffId: S.meera, dayOffset: -12, startTime: '10:30', status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash' },
  { id: 'apt_006', customerId: C.laxmi, serviceIds: ['svc_cleanup'], staffId: S.sabina, dayOffset: -10, startTime: '14:00', status: 'cancelled', paymentStatus: 'unpaid', cancellationReason: 'Customer was travelling.' },
  { id: 'apt_007', customerId: C.bikram, serviceIds: ['svc_haircut'], staffId: S.rohit, dayOffset: -8, startTime: '18:00', status: 'no_show', paymentStatus: 'unpaid' },
  { id: 'apt_008', customerId: C.priya, serviceIds: ['svc_hydra_facial'], staffId: S.sabina, dayOffset: -7, startTime: '16:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'upi' },
  { id: 'apt_009', customerId: C.neha, serviceIds: ['svc_bridal_package'], staffId: S.anita, dayOffset: -5, startTime: '11:00', status: 'completed', paymentStatus: 'partial', paymentMethod: 'upi', amountPaid: 6000, notes: 'Session 1 of pre-bridal package.' },
  { id: 'apt_010', customerId: C.ritu, serviceIds: ['svc_global_color'], staffId: S.meera, dayOffset: -3, startTime: '13:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'card', notes: 'Shade: burgundy 4.62' },
  { id: 'apt_011', customerId: C.aasha, serviceIds: ['svc_threading', 'svc_cleanup'], staffId: S.pooja, dayOffset: -2, startTime: '12:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash' },
  { id: 'apt_012', customerId: C.sujata, serviceIds: ['svc_party_makeup'], staffId: S.anita, dayOffset: -1, startTime: '17:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'upi' },
  // Today
  { id: 'apt_013', customerId: C.deepa, serviceIds: ['svc_manicure'], staffId: S.pooja, dayOffset: 0, startTime: '10:00', status: 'completed', paymentStatus: 'paid', paymentMethod: 'cash' },
  { id: 'apt_014', customerId: C.bikram, serviceIds: ['svc_haircut'], staffId: S.rohit, dayOffset: 0, startTime: '12:00', status: 'confirmed', paymentStatus: 'unpaid' },
  { id: 'apt_015', customerId: C.kiran, serviceIds: ['svc_facial_gold'], staffId: S.sabina, dayOffset: 0, startTime: '14:00', status: 'confirmed', paymentStatus: 'unpaid' },
  { id: 'apt_016', customerId: C.pemba, serviceIds: ['svc_threading', 'svc_waxing_full'], staffId: S.pooja, dayOffset: 0, startTime: '15:30', status: 'pending', paymentStatus: 'unpaid', notes: 'First visit.' },
  { id: 'apt_017', customerId: C.neha, serviceIds: ['svc_engagement'], staffId: S.anita, dayOffset: 0, startTime: '16:00', status: 'confirmed', paymentStatus: 'partial', paymentMethod: 'upi', amountPaid: 3000, notes: 'Engagement look - pastel lehenga.' },
  // Upcoming
  { id: 'apt_018', customerId: C.aasha, serviceIds: ['svc_hd_makeup'], staffId: S.anita, dayOffset: 1, startTime: '12:00', status: 'confirmed', paymentStatus: 'unpaid' },
  { id: 'apt_019', customerId: C.priya, serviceIds: ['svc_global_color'], staffId: S.meera, dayOffset: 2, startTime: '11:00', status: 'confirmed', paymentStatus: 'unpaid', notes: 'Ammonia-free, shade 5.0' },
  { id: 'apt_020', customerId: C.ritu, serviceIds: ['svc_body_massage'], staffId: S.sabina, dayOffset: 3, startTime: '15:00', status: 'pending', paymentStatus: 'unpaid' },
  { id: 'apt_021', customerId: C.sujata, serviceIds: ['svc_gel_nails'], staffId: S.pooja, dayOffset: 4, startTime: '13:00', status: 'confirmed', paymentStatus: 'unpaid' },
  { id: 'apt_022', customerId: C.sneha, serviceIds: ['svc_hair_spa'], staffId: S.meera, dayOffset: 5, startTime: '16:00', status: 'pending', paymentStatus: 'unpaid' },
  { id: 'apt_023', customerId: C.arjun, serviceIds: ['svc_haircut'], staffId: S.rohit, dayOffset: 6, startTime: '18:00', status: 'pending', paymentStatus: 'unpaid' },
  { id: 'apt_024', customerId: C.deepa, serviceIds: ['svc_keratin'], staffId: S.meera, dayOffset: 7, startTime: '12:00', status: 'pending', paymentStatus: 'unpaid' },
  { id: 'apt_025', customerId: C.neha, serviceIds: ['svc_bridal_hd'], staffId: S.anita, dayOffset: 9, startTime: '10:00', status: 'confirmed', paymentStatus: 'partial', paymentMethod: 'upi', amountPaid: 5000, notes: 'Bridal trial run.' },
  { id: 'apt_026', customerId: C.priya, serviceIds: ['svc_manicure', 'svc_pedicure'], staffId: S.pooja, dayOffset: 12, startTime: '15:00', status: 'pending', paymentStatus: 'unpaid' },
];

export const buildAppointments = (services: readonly Service[]): Appointment[] => {
  const serviceById = new Map(services.map((service) => [service.id, service]));

  return APPOINTMENT_SEEDS.map((seed) => {
    const booked = seed.serviceIds
      .map((id) => serviceById.get(id))
      .filter((service): service is Service => service !== undefined);
    const totalPrice = booked.reduce((sum, service) => sum + service.price, 0);
    const totalDuration = booked.reduce((sum, service) => sum + service.duration, 0);
    const amountPaid =
      seed.paymentStatus === 'paid' ? totalPrice : seed.paymentStatus === 'partial' ? (seed.amountPaid ?? 0) : 0;

    return {
      // Bookings are created a few days before the appointment date.
      ...seedBase(seed.id, Math.max(1, 4 - seed.dayOffset)),
      customerId: seed.customerId,
      serviceIds: seed.serviceIds,
      staffId: seed.staffId,
      date: daysFromToday(seed.dayOffset),
      startTime: seed.startTime,
      endTime: addMinutesToTime(seed.startTime, totalDuration),
      status: seed.status,
      notes: seed.notes ?? '',
      totalPrice,
      amountPaid,
      paymentStatus: seed.paymentStatus,
      paymentMethod: seed.paymentMethod ?? null,
      cancellationReason: seed.cancellationReason ?? null,
    };
  });
};
