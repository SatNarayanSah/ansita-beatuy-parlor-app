"use client";

import { motion } from "motion/react";
import { ArrowRight, Bell, CalendarCheck, CalendarPlus, Crown, GraduationCap, Sparkles, Tag, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AnimatedNumber,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PaymentProgress,
  Skeleton,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formatDate, money, relativeDay, time12, timeAgo } from "@/lib/format";
import { useAppointments, useCustomerStats, useEnrollments, useMyCustomer, useNotifications, useSettings } from "@/lib/queries";
import type { Appointment } from "@/lib/types";
import { isUpcoming, serviceNames, startsAt, useNames } from "./_parts";

function LoyaltyCard({ points, pointValue, minRedeem, enabled, name }: { points: number; pointValue: number; minRedeem: number; enabled: boolean; name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="hover-lift relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5a2d52] via-[#84374f] to-[#b08b3e] p-6 text-white shadow-lift"
    >
      {/* moving sheen */}
      <motion.div
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
        animate={{ x: ["0%", "400%"] }}
        transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
      />
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#e0bc6e]/30 blur-3xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.3em] text-white/70 uppercase">Ansita rewards</p>
          <p className="mt-1 font-display text-lg">{name}</p>
        </div>
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur"
        >
          <Crown className="h-5 w-5 text-[#f7edd8]" />
        </motion.span>
      </div>
      <div className="relative mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-5xl leading-none font-bold">
            <AnimatedNumber value={points} />
          </p>
          <p className="mt-1 text-xs text-white/75">loyalty points</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold">
            <AnimatedNumber value={points * pointValue} format={(n) => money(n)} />
          </p>
          <p className="text-xs text-white/75">
            {!enabled ? "rewards paused" : points >= minRedeem ? "ready to use at the desk" : `usable from ${minRedeem.toLocaleString("en-IN")} points`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function NextVisit({ appointment, names }: { appointment: Appointment | undefined; names: ReturnType<typeof useNames> }) {
  const countdown = useCountdown(appointment ? startsAt(appointment) : null);
  if (!appointment) {
    return (
      <Card className="flex h-full flex-col justify-center overflow-hidden p-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <EmptyState
          icon={<CalendarPlus className="h-7 w-7" />}
          title="No visit booked"
          message="Treat yourself. Pick a service and a time that suits you."
          action={
            <Link href="/account/book">
              <Button icon={<CalendarPlus className="h-4 w-4" />}>Book a visit</Button>
            </Link>
          }
        />
      </Card>
    );
  }
  const member = names.staff.get(appointment.staffId);
  return (
    <Card className="relative h-full overflow-hidden p-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-gold-text uppercase">Your next visit</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{relativeDay(appointment.date)} · {time12(appointment.startTime)}</h2>
          <p className="mt-1 text-sm text-ink-2">{serviceNames(appointment, names)}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      {countdown && (
        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {(
            [
              ["days", countdown.days],
              ["hrs", countdown.hours],
              ["min", countdown.minutes],
              ["sec", countdown.seconds],
            ] as const
          ).map(([unit, value]) => (
            <div key={unit} className="rounded-2xl border border-line bg-bg/60 py-3 text-center">
              <motion.p key={value} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-2xl font-semibold text-primary-dark tabular-nums">
                {String(value).padStart(2, "0")}
              </motion.p>
              <p className="text-[10px] tracking-wider text-muted uppercase">{unit}</p>
            </div>
          ))}
        </div>
      )}
      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {member && <Avatar name={member.name} src={member.avatar} size={34} />}
          <div className="text-sm">
            <p className="font-medium text-ink">{member?.name ?? "Your stylist"}</p>
            <p className="text-xs text-muted">{money(appointment.totalPrice)} · ends {time12(appointment.endTime)}</p>
          </div>
        </div>
        <Link href="/account/appointments" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Manage <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function Panel({ title, href, children, delay = 0 }: { title: string; href?: string; children: React.ReactNode; delay?: number }) {
  return (
    <Card initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring", stiffness: 200, damping: 24 }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </Card>
  );
}

export default function AccountDashboard() {
  const { user } = useAuth();
  const customerId = user?.customerId ?? null;
  const customer = useMyCustomer(customerId);
  const stats = useCustomerStats(customerId);
  const appointments = useAppointments();
  const enrollments = useEnrollments();
  const notifications = useNotifications();
  const settings = useSettings();
  const names = useNames();

  const upcoming = useMemo(
    () => (appointments.data ?? []).filter(isUpcoming).sort((a, b) => startsAt(a) - startsAt(b)),
    [appointments.data],
  );
  const activeCourses = (enrollments.data ?? []).filter((e) => e.status === "active" || e.status === "pending");

  if (!customerId) {
    return <ErrorState error={new Error("This account isn't linked to a customer profile. Please contact the parlour.")} />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Welcome back"
        title={`Hello, ${user?.name.split(" ")[0] ?? "there"}`}
        subtitle="Your visits, rewards and courses in one place."
        actions={
          <Link href="/account/book">
            <Button icon={<CalendarPlus className="h-4 w-4" />}>Book a visit</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {customer.isLoading || settings.isLoading ? (
          <Skeleton className="h-[210px] rounded-3xl" />
        ) : (
          <LoyaltyCard
            name={customer.data?.name ?? user?.name ?? ""}
            points={customer.data?.loyaltyPoints ?? 0}
            pointValue={settings.data?.loyalty.pointValue ?? 0}
            minRedeem={settings.data?.loyalty.minRedeemPoints ?? 500}
            enabled={settings.data?.loyalty.enabled ?? false}
          />
        )}
        {appointments.isLoading || !names.ready ? <Skeleton className="h-[210px] rounded-3xl" /> : <NextVisit appointment={upcoming[0]} names={names} />}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px]" />)
        ) : (
          <>
            <StatCard index={0} label="Visits" value={stats.data?.totalVisits ?? 0} icon={<Sparkles className="h-5 w-5" />} hint={stats.data?.lastVisit ? `Last on ${formatDate(stats.data.lastVisit)}` : "Your first visit awaits"} />
            <StatCard index={1} label="Total spent" value={stats.data?.totalSpent ?? 0} format={(n) => money(n)} icon={<Wallet className="h-5 w-5" />} accent="gold" />
            <StatCard index={2} label="Upcoming" value={stats.data?.upcomingCount ?? 0} icon={<CalendarCheck className="h-5 w-5" />} accent="plum" />
            <StatCard index={3} label="Active courses" value={stats.data?.activeEnrollments ?? 0} icon={<GraduationCap className="h-5 w-5" />} accent="green" />
          </>
        )}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
        className="mt-6 grid gap-3 sm:grid-cols-3"
      >
        {[
          { href: "/account/book", icon: CalendarPlus, title: "Book a visit", text: "Pick services, stylist and time" },
          { href: "/offers", icon: Tag, title: "Explore offers", text: "Seasonal deals and promo codes" },
          { href: "/academy", icon: GraduationCap, title: "Ansita Academy", text: "Learn beauty as a career" },
        ].map((action) => (
          <motion.div key={action.href} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
            <Link
              href={action.href}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-plum-soft text-primary transition-transform group-hover:scale-110 group-hover:rotate-6">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{action.title}</span>
                <span className="block truncate text-xs text-muted">{action.text}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Upcoming appointments" href="/account/appointments" delay={0.25}>
          {appointments.error ? (
            <ErrorState error={appointments.error} onRetry={() => appointments.refetch()} />
          ) : upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nothing booked yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.slice(0, 4).map((a, i) => (
                <motion.li key={a.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="flex items-center gap-3 rounded-2xl border border-line bg-bg/50 p-3">
                  <div className="w-14 shrink-0 rounded-xl bg-primary-soft py-1.5 text-center">
                    <p className="text-[10px] font-semibold text-primary-dark uppercase">{formatDate(a.date, "MMM")}</p>
                    <p className="font-display text-lg leading-none font-semibold text-primary-dark">{formatDate(a.date, "d")}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{serviceNames(a, names)}</p>
                    <p className="text-xs text-muted">{time12(a.startTime)} · {names.staff.get(a.staffId)?.name}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </motion.li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="My courses" href="/account/courses" delay={0.3}>
          {activeCourses.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted">Not enrolled in a course.</p>
              <Link href="/academy" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                Browse the academy
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {activeCourses.slice(0, 3).map((e) => {
                const course = names.course.get(e.courseId);
                return (
                  <li key={e.id} className="rounded-2xl border border-line bg-bg/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{course?.title ?? "Course"}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <PaymentProgress paid={e.feePaid} total={e.feeTotal} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Latest updates" href="/account/notifications" delay={0.35}>
          {!notifications.data?.length ? (
            <p className="flex flex-col items-center gap-2 py-6 text-sm text-muted">
              <Bell className="h-5 w-5" /> No notifications yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {[...notifications.data]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 4)
                .map((n) => (
                  <li key={n.id} className="flex gap-2 py-2.5">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{n.title}</p>
                      <p className="line-clamp-1 text-xs text-muted">{n.message}</p>
                      <p className="text-[11px] text-muted">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
