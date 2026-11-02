"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { time12, todayISO } from "@/lib/format";
import { useCategories, useCourses, useServices, useStaff } from "@/lib/queries";
import type { Appointment, Staff, TimeSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * id → entity maps for the customer portal. Unlike the admin `useLookups`, this never
 * reads the customer list (customers aren't allowed to).
 */
export function useNames() {
  const services = useServices();
  const staff = useStaff();
  const categories = useCategories();
  const courses = useCourses();
  return useMemo(
    () => ({
      service: new Map((services.data ?? []).map((s) => [s.id, s])),
      staff: new Map((staff.data ?? []).map((s) => [s.id, s])),
      category: new Map((categories.data ?? []).map((c) => [c.id, c])),
      course: new Map((courses.data ?? []).map((c) => [c.id, c])),
      ready: !!(services.data && staff.data && categories.data && courses.data),
    }),
    [services.data, staff.data, categories.data, courses.data],
  );
}

export function serviceNames(a: Appointment, names: ReturnType<typeof useNames>): string {
  return a.serviceIds.map((id) => names.service.get(id)?.name ?? "Service").join(", ");
}

/** Current time in Kathmandu as yyyy-MM-dd and HH:mm, to decide what is upcoming. */
export function nowKathmandu(): { date: string; time: string } {
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kathmandu" }).format(new Date());
  return { date: todayISO(), time };
}

export function isUpcoming(a: Appointment): boolean {
  if (a.status !== "pending" && a.status !== "confirmed") return false;
  const now = nowKathmandu();
  return a.date > now.date || (a.date === now.date && a.startTime >= now.time);
}

/** Absolute start time of an appointment (Kathmandu is UTC+05:45). */
export function startsAt(a: Appointment): number {
  return new Date(`${a.date}T${a.startTime}:00+05:45`).getTime();
}

export function useAvailableStaff(date: string, serviceIds: string[]) {
  return useQuery({
    queryKey: ["availability", "staff", date, serviceIds],
    queryFn: () => api.get<Staff[]>("/availability/staff", { date, serviceIds }),
    enabled: !!date && serviceIds.length > 0,
  });
}

export function SlotGrid({
  date,
  staffId,
  serviceIds,
  value,
  onChange,
}: {
  date: string;
  staffId: string;
  serviceIds: string[];
  value: string;
  onChange: (time: string) => void;
}) {
  const slots = useQuery({
    queryKey: ["availability", "slots", date, staffId, serviceIds],
    queryFn: () => api.get<TimeSlot[]>("/availability/slots", { date, staffId, serviceIds }),
    enabled: !!date && !!staffId && serviceIds.length > 0,
  });
  if (!staffId) return <p className="text-sm text-muted">Choose a stylist to see free times.</p>;
  if (slots.isLoading)
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  if (slots.error) return <p className="text-sm text-danger">{(slots.error as Error).message}</p>;
  const available = slots.data?.filter((s) => s.available) ?? [];
  if (!available.length)
    return (
      <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
        No free times left with this stylist on this day. Try another stylist or date.
      </p>
    );
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {slots.data!.map((slot, i) => {
        const selected = value === slot.time;
        return (
          <motion.button
            key={slot.time}
            type="button"
            disabled={!slot.available}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i, 30) * 0.012 }}
            whileTap={slot.available ? { scale: 0.94 } : undefined}
            onClick={() => onChange(slot.time)}
            className={cn(
              "hover-lift-sm cursor-pointer rounded-xl border px-1 py-2.5 text-xs font-medium",
              selected
                ? "border-primary bg-primary text-white shadow-[0_6px_16px_-6px_var(--ring)] dark:text-[#2a1520]"
                : slot.available
                  ? "border-line bg-surface text-ink-2 hover:border-primary/60 hover:text-primary"
                  : "cursor-not-allowed border-line/50 bg-bg-deep/50 text-muted line-through opacity-60",
            )}
          >
            {time12(slot.time)}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Animated circular progress (0–100). */
export function Ring({ value, size = 76, stroke = 8, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (Math.max(0, Math.min(100, value)) / 100) * c }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
