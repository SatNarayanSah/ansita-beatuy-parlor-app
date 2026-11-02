import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";
import type { AppointmentStatus, EnrollmentStatus, PaymentMethod, Weekday } from "./types";

/** "Rs. 1,500" — same as the app. */
export function money(value: number | null | undefined): string {
  const amount = Math.round(Number(value) || 0);
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

export function compactMoney(value: number): string {
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(value >= 1000000 ? 0 : 1)}L`;
  if (value >= 1000) return `Rs. ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return money(value);
}

/** Today's date in the parlour's time zone (Asia/Kathmandu), as yyyy-MM-dd. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}

export function formatDate(iso: string | null | undefined, pattern = "d MMM yyyy"): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function relativeDay(iso: string): string {
  const diff = differenceInCalendarDays(parseISO(iso), parseISO(todayISO()));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(iso, "EEE, d MMM");
}

export function timeAgo(isoDateTime: string): string {
  try {
    return formatDistanceToNowStrict(parseISO(isoDateTime), { addSuffix: true });
  } catch {
    return isoDateTime;
  }
}

/** "14:30" → "2:30 PM" */
export function time12(value: string | null | undefined): string {
  if (!value) return "—";
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** "senior_stylist" → "Senior Stylist" */
export function label(value: string | null | undefined): string {
  if (!value) return "—";
  if (value === "esewa") return "eSewa";
  if (value === "no_show") return "No-show";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "esewa", "khalti", "fonepay", "card"];
export const APPOINTMENT_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];
export const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["pending", "active", "completed", "dropped"];

/** Mirrors ALLOWED_STATUS_TRANSITIONS on the server. */
export const NEXT_STATUSES: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export type Tone = "rose" | "plum" | "gold" | "green" | "blue" | "red" | "amber" | "gray";

export const STATUS_TONE: Record<string, Tone> = {
  pending: "amber",
  confirmed: "blue",
  completed: "green",
  cancelled: "red",
  no_show: "gray",
  active: "green",
  dropped: "red",
  unpaid: "red",
  partial: "amber",
  paid: "green",
  refunded: "gray",
  upcoming: "blue",
  ongoing: "green",
};
