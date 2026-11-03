"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import type {
  Appointment,
  BusinessSettings,
  Course,
  Customer,
  Enrollment,
  Notification,
  Offer,
  PaymentRequest,
  Review,
  Service,
  ServiceCategory,
  Staff,
} from "./types";

/** Query keys. Mutations invalidate by the first segment, e.g. ["appointments"]. */
export const keys = {
  appointments: (filters: Record<string, unknown> = {}) => ["appointments", filters] as const,
  customers: (filters: Record<string, unknown> = {}) => ["customers", filters] as const,
  customer: (id: string) => ["customers", "one", id] as const,
  customerStats: (id: string) => ["customers", "stats", id] as const,
  categories: ["categories"] as const,
  services: ["services"] as const,
  staff: ["staff"] as const,
  courses: ["courses"] as const,
  batchAvailability: (courseId: string) => ["courses", "availability", courseId] as const,
  enrollments: (filters: Record<string, unknown> = {}) => ["enrollments", filters] as const,
  reviews: ["reviews"] as const,
  offers: ["offers"] as const,
  notifications: ["notifications"] as const,
  unread: ["notifications", "unread"] as const,
  settings: ["settings"] as const,
  publicSettings: ["settings", "public"] as const,
  featuredReviews: ["reviews", "featured"] as const,
  reviewFor: (appointmentId: string) => ["reviews", "appointment", appointmentId] as const,
  paymentRequests: (filters: Record<string, unknown> = {}) => ["payment-requests", filters] as const,
  pendingPayments: ["payment-requests", "pending-count"] as const,
};

// ---------- Reads ----------

export interface AppointmentFilters {
  status?: string;
  customerId?: string;
  staffId?: string;
  date?: string;
  from?: string;
  to?: string;
}

export const useAppointments = (filters: AppointmentFilters = {}, enabled = true) =>
  useQuery({
    queryKey: keys.appointments(filters as Record<string, unknown>),
    queryFn: () => api.get<Appointment[]>("/appointments", { ...filters }),
    enabled,
  });

export const useCustomers = (filters: { query?: string; tag?: string } = {}) =>
  useQuery({
    queryKey: keys.customers(filters),
    queryFn: () => api.get<Customer[]>("/customers", filters),
  });

export interface CustomerStats {
  totalVisits: number;
  totalSpent: number;
  lastVisit: string | null;
  upcomingCount: number;
  cancelledCount: number;
  activeEnrollments: number;
}

export const useCustomerStats = (id: string | null) =>
  useQuery({
    queryKey: keys.customerStats(id ?? ""),
    queryFn: () => api.get<CustomerStats>(`/customers/${id}/stats`),
    enabled: !!id,
  });

export const useCategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: () => api.get<ServiceCategory[]>("/categories") });

export const useServices = () =>
  useQuery({ queryKey: keys.services, queryFn: () => api.get<Service[]>("/services") });

export const useStaff = () => useQuery({ queryKey: keys.staff, queryFn: () => api.get<Staff[]>("/staff") });

export const useCourses = () => useQuery({ queryKey: keys.courses, queryFn: () => api.get<Course[]>("/courses") });

export interface BatchAvailability {
  batch: Course["batches"][number];
  seatsTaken: number;
  seatsLeft: number;
  isFull: boolean;
  isOpen: boolean;
}

export const useBatchAvailability = (courseId: string | null) =>
  useQuery({
    queryKey: keys.batchAvailability(courseId ?? ""),
    queryFn: () => api.get<BatchAvailability[]>(`/courses/${courseId}/batches/availability`),
    enabled: !!courseId,
  });

export const useEnrollments = (filters: { courseId?: string; batchId?: string; studentId?: string; status?: string } = {}) =>
  useQuery({
    queryKey: keys.enrollments(filters),
    queryFn: () => api.get<Enrollment[]>("/enrollments", filters),
  });

export const useReviews = () => useQuery({ queryKey: keys.reviews, queryFn: () => api.get<Review[]>("/reviews") });

export const useOffers = () => useQuery({ queryKey: keys.offers, queryFn: () => api.get<Offer[]>("/offers") });

export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: () => api.get<Notification[]>("/notifications") });

export const useUnreadCount = () =>
  useQuery({
    queryKey: keys.unread,
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 30_000,
  });

export const useSettings = () =>
  useQuery({ queryKey: keys.settings, queryFn: () => api.get<BusinessSettings>("/settings") });

// ---------- Offer codes ----------

export interface OfferQuote {
  offer: Offer | null;
  discount: number;
  total: number;
  payable: number;
  /** True when the offer applies by itself (it has no code). */
  automatic: boolean;
}

/**
 * What a booking would get: the entered code, or (without one) the best automatic offer.
 * Errors carry the server's reason ("doesn't cover these services", "valid until …").
 */
export const useOfferQuote = (input: { code: string | null; serviceIds: string[]; date: string }) =>
  useQuery({
    queryKey: ["offer-quote", input.code ?? "", [...input.serviceIds].sort().join(","), input.date],
    queryFn: () => api.post<OfferQuote>("/offers/quote", { code: input.code || null, serviceIds: input.serviceIds, date: input.date }),
    enabled: input.serviceIds.length > 0 && !!input.date,
    retry: false,
    staleTime: 30_000,
  });

// ---------- "I've paid" requests ----------

export interface PaymentRequestFilters {
  status?: string;
  targetType?: "appointment" | "enrollment";
  targetId?: string;
}

/** Customers get only their own; pending ones come first. */
export const usePaymentRequests = (filters: PaymentRequestFilters = {}, enabled = true) =>
  useQuery({
    queryKey: keys.paymentRequests({ ...filters }),
    queryFn: () => api.get<PaymentRequest[]>("/payment-requests", { ...filters }),
    enabled,
  });

/** Admin badge: requests waiting for verification. */
export const usePendingPaymentCount = (enabled = true) =>
  useQuery({
    queryKey: keys.pendingPayments,
    queryFn: () => api.get<{ count: number }>("/payment-requests/pending-count"),
    refetchInterval: 30_000,
    enabled,
  });

/** Everything a payment request touches, for `useAction({ invalidate })`. */
export const PAYMENT_KEYS = ["payment-requests", "appointments", "enrollments", "notifications", "customers"];

// ---------- Public website (no sign-in needed) ----------

export interface PublicSettings {
  profile: BusinessSettings["profile"];
  holidays: BusinessSettings["holidays"];
  loyalty: { enabled: boolean };
}

export const usePublicSettings = () =>
  useQuery({ queryKey: keys.publicSettings, queryFn: () => api.get<PublicSettings>("/settings/public"), staleTime: 5 * 60_000 });

export const useFeaturedReviews = (limit = 6) =>
  useQuery({ queryKey: keys.featuredReviews, queryFn: () => api.get<Review[]>("/reviews/featured", { limit }) });

/** POST /contact {name, phone?, email?, subject?, message}: becomes an admin notification. */
export const sendEnquiry = (body: { name: string; phone?: string; email?: string; subject?: string; message: string }) =>
  api.post<{ ok: true }>("/contact", body);

// ---------- Customer portal (signed in as a customer) ----------

/** The signed-in customer's own profile (GET /customers/{id} is allowed for yourself). */
export const useMyCustomer = (customerId: string | null | undefined) =>
  useQuery({
    queryKey: keys.customer(customerId ?? ""),
    queryFn: () => api.get<Customer>(`/customers/${customerId}`),
    enabled: !!customerId,
  });

/** The review for one appointment, or null if not reviewed yet. */
export const useReviewFor = (appointmentId: string | null) =>
  useQuery({
    queryKey: keys.reviewFor(appointmentId ?? ""),
    queryFn: () => api.get<Review | null>(`/reviews/by-appointment/${appointmentId}`),
    enabled: !!appointmentId,
  });

// ---------- Lookups (admin only: reads every customer) ----------

/** id → entity maps for showing names next to ids. */
export function useLookups() {
  const customers = useCustomers();
  const services = useServices();
  const staff = useStaff();
  const categories = useCategories();
  const courses = useCourses();
  return useMemo(
    () => ({
      customer: new Map((customers.data ?? []).map((c) => [c.id, c])),
      service: new Map((services.data ?? []).map((s) => [s.id, s])),
      staff: new Map((staff.data ?? []).map((s) => [s.id, s])),
      category: new Map((categories.data ?? []).map((c) => [c.id, c])),
      course: new Map((courses.data ?? []).map((c) => [c.id, c])),
      ready: !!(customers.data && services.data && staff.data && categories.data && courses.data),
    }),
    [customers.data, services.data, staff.data, categories.data, courses.data],
  );
}

// ---------- Writes ----------

/**
 * Wraps a write: shows a toast on success/failure and refreshes every query
 * whose key starts with one of `invalidate`.
 */
export function useAction<TVars = void, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  options: { invalidate: string[]; success?: string | ((result: TResult, vars: TVars) => string); onSuccess?: (result: TResult, vars: TVars) => void },
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      options.invalidate.forEach((key) => client.invalidateQueries({ queryKey: [key] }));
      const message = typeof options.success === "function" ? options.success(result, vars) : options.success;
      if (message) toast.success(message);
      options.onSuccess?.(result, vars);
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}
