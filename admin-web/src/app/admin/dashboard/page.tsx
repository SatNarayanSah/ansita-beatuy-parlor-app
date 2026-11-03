"use client";

import { motion } from "motion/react";
import { ArrowUpRight, CalendarCheck, Check, Clock, GraduationCap, Hourglass, Users, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  Stars,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { addDaysISO, balanceDue, billTotal, compactMoney, formatDate, label, money, time12, todayISO } from "@/lib/format";
import { useAction, useAppointments, useEnrollments, useLookups, usePaymentRequests, useReviews } from "@/lib/queries";
import type { AppointmentStatus } from "@/lib/types";

// The app's status colours (colors.ts → status.*.fg), as CSS variables so dark mode follows.
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: "var(--warning)",
  confirmed: "var(--info)",
  completed: "var(--success)",
  cancelled: "var(--danger)",
  no_show: "var(--neutral)",
};

function ChartTooltip({ active, payload, label: title, formatter }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string; formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      {title && <p className="mb-1 font-semibold text-ink">{title}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-ink-2">
          {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function Section({ title, action, children, className, delay = 0 }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <Card
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 24 }}
      className={className}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </Card>
  );
}

export default function DashboardPage() {
  const today = todayISO();
  const appointments = useAppointments();
  const paymentRequests = usePaymentRequests({ status: "pending" });
  const toVerify = paymentRequests.data ?? [];
  const enrollments = useEnrollments();
  const reviews = useReviews();
  const lookups = useLookups();

  const confirm = useAction((id: string) => api.post(`/appointments/${id}/status`, { status: "confirmed" }), {
    invalidate: ["appointments", "notifications"],
    success: "Appointment confirmed",
  });
  const decline = useAction((id: string) => api.post(`/appointments/${id}/status`, { status: "cancelled", reason: "Declined by the parlour" }), {
    invalidate: ["appointments", "notifications"],
    success: "Request declined",
  });

  const stats = useMemo(() => {
    const list = appointments.data ?? [];
    const monthPrefix = today.slice(0, 7);
    const payments = [
      ...list.flatMap((a) => a.payments ?? []),
      ...(enrollments.data ?? []).flatMap((e) => e.payments ?? []),
    ];
    const revenueOn = (date: string) => payments.filter((p) => p.paidOn === date).reduce((s, p) => s + p.amount, 0);
    const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i - 13));
    const monthAppointments = list.filter((a) => a.date.startsWith(monthPrefix));

    const serviceCounts = new Map<string, number>();
    list
      .filter((a) => a.status === "completed" || a.status === "confirmed")
      .forEach((a) => a.serviceIds.forEach((id) => serviceCounts.set(id, (serviceCounts.get(id) ?? 0) + 1)));

    return {
      todayList: list.filter((a) => a.date === today && a.status !== "cancelled").sort((a, b) => a.startTime.localeCompare(b.startTime)),
      pending: list.filter((a) => a.status === "pending" && a.date >= today),
      revenueToday: revenueOn(today),
      revenueMonth: payments.filter((p) => p.paidOn.startsWith(monthPrefix)).reduce((s, p) => s + p.amount, 0),
      outstanding: list
        .filter((a) => a.status === "completed" || a.status === "confirmed")
        .reduce((s, a) => s + balanceDue(a), 0),
      trend: days.map((d) => ({ day: formatDate(d, "d MMM"), revenue: revenueOn(d) })),
      statusMix: (Object.keys(STATUS_COLORS) as AppointmentStatus[])
        .map((s) => ({ name: label(s), key: s, value: monthAppointments.filter((a) => a.status === s).length }))
        .filter((s) => s.value > 0),
      monthCount: monthAppointments.length,
      topServices: [...serviceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({ name: lookups.service.get(id)?.name ?? "Service", count })),
      activeStudents: (enrollments.data ?? []).filter((e) => e.status === "active").length,
    };
  }, [appointments.data, enrollments.data, today, lookups.service]);

  const loading = appointments.isLoading || !lookups.ready;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Live numbers from the shared parlour database."
        actions={
          <Link href="/admin/appointments">
            <Button icon={<CalendarCheck className="h-4 w-4" />}>Open bookings</Button>
          </Link>
        }
      />

      {toVerify.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Link
            href="/admin/payments"
            className="group flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft/60 p-4 transition-colors hover:border-warning"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
              <Wallet className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                {toVerify.length} online payment{toVerify.length === 1 ? "" : "s"} to verify
              </span>
              <span className="block truncate text-xs text-ink-2">
                {money(toVerify.reduce((sum, r) => sum + r.amount, 0))} reported · latest from {toVerify[0].customerName}
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard index={0} label="Today's bookings" value={stats.todayList.length} icon={<CalendarCheck className="h-5 w-5" />} hint={`${stats.pending.length} waiting for confirmation`} />
          <StatCard index={1} label="Collected today" value={stats.revenueToday} format={(n) => money(n)} icon={<Wallet className="h-5 w-5" />} accent="gold" hint={`${money(stats.revenueMonth)} this month`} />
          <StatCard index={2} label="Customers" value={lookups.customer.size} icon={<Users className="h-5 w-5" />} accent="plum" hint={`${money(stats.outstanding)} still to collect`} />
          <StatCard index={3} label="Active students" value={stats.activeStudents} icon={<GraduationCap className="h-5 w-5" />} accent="green" hint={`${lookups.course.size} courses in the academy`} />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Section title="Revenue · last 14 days" className="xl:col-span-2" delay={0.15}>
          <div className="h-[260px]">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend} margin={{ left: -10, right: 8, top: 10 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => compactMoney(v).replace("Rs. ", "")} />
                  <Tooltip content={<ChartTooltip formatter={money} />} cursor={{ stroke: "var(--primary)", strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#rev)" animationDuration={1400} activeDot={{ r: 5, strokeWidth: 3, stroke: "var(--surface)" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        <Section title="This month" delay={0.22}>
          {stats.statusMix.length === 0 && !loading ? (
            <EmptyState icon={<CalendarCheck className="h-7 w-7" />} title="No bookings yet" message="This month's appointments will show here." />
          ) : (
            <div className="relative h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusMix} dataKey="value" nameKey="name" innerRadius={68} outerRadius={98} paddingAngle={3} cornerRadius={6} animationDuration={1200} stroke="none">
                    {stats.statusMix.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-bold text-ink">{stats.monthCount}</span>
                <span className="text-xs text-muted">appointments</span>
              </div>
            </div>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {stats.statusMix.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-ink-2">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.key] }} />
                {s.name} · {s.value}
              </span>
            ))}
          </div>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Section
          title="Today's schedule"
          className="xl:col-span-2"
          delay={0.28}
          action={
            <Link href="/admin/appointments" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {stats.todayList.length === 0 ? (
            <EmptyState icon={<Clock className="h-7 w-7" />} title="A quiet day" message="No appointments are booked for today." />
          ) : (
            <ol className="relative ml-2 border-l-2 border-dashed border-line pl-4">
              {stats.todayList.map((a, i) => {
                const customer = lookups.customer.get(a.customerId);
                const member = lookups.staff.get(a.staffId);
                return (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="relative pb-4 last:pb-0"
                  >
                    <span className="absolute top-3 -left-[33px] h-4 w-4 rounded-full border-4 border-surface bg-primary shadow" />
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg/50 p-3 transition-colors hover:border-primary/40">
                      <div className="w-20 shrink-0 text-xs font-semibold text-primary-dark">
                        {time12(a.startTime)}
                        <span className="block font-normal text-muted">{time12(a.endTime)}</span>
                      </div>
                      <Avatar name={customer?.name ?? "?"} src={customer?.avatar} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{customer?.name ?? "Customer"}</p>
                        <p className="truncate text-xs text-muted">
                          {a.serviceIds.map((id) => lookups.service.get(id)?.name).filter(Boolean).join(", ")} · {member?.name}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </Section>

        <Section title="Waiting for you" delay={0.34}>
          {stats.pending.length === 0 ? (
            <EmptyState icon={<Hourglass className="h-7 w-7" />} title="All caught up" message="New booking requests from the app appear here." />
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.pending.slice(0, 6).map((a, i) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="rounded-2xl border border-warning/30 bg-warning-soft/50 p-3"
                >
                  <p className="text-sm font-semibold text-ink">{lookups.customer.get(a.customerId)?.name ?? "Customer"}</p>
                  <p className="text-xs text-muted">
                    {formatDate(a.date, "EEE d MMM")} · {time12(a.startTime)} · {money(billTotal(a))}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} loading={confirm.isPending && confirm.variables === a.id} onClick={() => confirm.mutate(a.id)}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} loading={decline.isPending && decline.variables === a.id} onClick={() => decline.mutate(a.id)}>
                      Decline
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Section title="Most booked services" delay={0.4}>
          {stats.topServices.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-7 w-7" />} title="No data yet" />
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topServices} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <defs>
                    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--plum)" />
                      <stop offset="100%" stopColor="var(--primary)" />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fill: "var(--text-2)", fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} bookings`} />} cursor={{ fill: "var(--surface-alt)" }} />
                  <Bar dataKey="count" fill="url(#bar)" radius={[0, 8, 8, 0]} barSize={18} animationDuration={1200} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section
          title="Latest reviews"
          delay={0.46}
          action={
            <Link href="/admin/reviews" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              All reviews <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {!reviews.data?.length ? (
            <EmptyState icon={<Users className="h-7 w-7" />} title="No reviews yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {reviews.data.slice(0, 4).map((r, i) => (
                <motion.li key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.06 }} className="flex gap-3 py-3">
                  <Avatar name={r.customerName ?? lookups.customer.get(r.customerId)?.name ?? "?"} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{lookups.customer.get(r.customerId)?.name ?? r.customerName}</p>
                      <Stars value={r.rating} />
                    </div>
                    <p className="line-clamp-2 text-xs text-muted">{r.comment || "No comment"}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
