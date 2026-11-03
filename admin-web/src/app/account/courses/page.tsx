"use client";

import { motion } from "motion/react";
import { Award, CalendarDays, Clock, GraduationCap } from "lucide-react";
import Link from "next/link";
import { PayOnline } from "@/components/payments/payment-requests";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PaymentProgress, Skeleton, StatusBadge } from "@/components/ui";
import { formatDate, label, money, time12 } from "@/lib/format";
import { useEnrollments } from "@/lib/queries";
import type { AttendanceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Ring, useNames } from "../_parts";

const ATTENDANCE_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-success",
  late: "bg-warning",
  absent: "bg-danger",
};

export default function MyCoursesPage() {
  const enrollments = useEnrollments();
  const names = useNames();
  const list = enrollments.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Academy"
        title="My courses"
        subtitle="Your batches, fees, attendance and certificates."
        actions={
          <Link href="/academy">
            <Button variant="outline" icon={<GraduationCap className="h-4 w-4" />}>
              Browse courses
            </Button>
          </Link>
        }
      />

      {enrollments.error ? (
        <ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} />
      ) : enrollments.isLoading || !names.ready ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GraduationCap className="h-7 w-7" />}
            title="No courses yet"
            message="Learn makeup, hair, nails and more at the Ansita Academy, from short workshops to diplomas."
            action={
              <Link href="/academy">
                <Button>Explore the academy</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((e, i) => {
            const course = names.course.get(e.courseId);
            const batch = course?.batches.find((b) => b.id === e.batchId);
            const counted = e.attendance.filter((r) => r.status !== "absent").length;
            const pct = e.attendance.length ? Math.round((counted / e.attendance.length) * 100) : 0;
            const recent = [...e.attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).reverse();
            const due = e.feeTotal - e.feePaid;
            return (
              <Card
                key={e.id}
                hover
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 220, damping: 24 }}
                className="relative overflow-hidden p-4"
              >
                <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-plum/10 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      {course && <Badge tone="plum">{label(course.type)}</Badge>}
                      {course && <Badge tone="gold">{label(course.level)}</Badge>}
                    </div>
                    <h2 className="font-display text-xl font-semibold text-ink">{course?.title ?? "Course"}</h2>
                    {batch && <p className="text-sm text-muted">{batch.name}</p>}
                  </div>
                  <StatusBadge status={e.status} />
                </div>

                {batch && (
                  <div className="relative mt-4 grid gap-2 text-xs text-ink-2 sm:grid-cols-2">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      {formatDate(batch.startDate, "d MMM")} – {formatDate(batch.endDate, "d MMM yyyy")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {batch.days.map((d) => label(d)).join(", ")} · {time12(batch.startTime)}–{time12(batch.endTime)}
                    </span>
                  </div>
                )}

                <div className="relative mt-4 flex items-center gap-4">
                  <Ring value={pct}>
                    <span className="text-center">
                      <span className="block font-display text-lg leading-none font-semibold text-ink">{pct}%</span>
                      <span className="text-[9px] tracking-wider text-muted uppercase">attended</span>
                    </span>
                  </Ring>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
                      Recent classes {e.attendance.length > 0 && `(${e.attendance.length})`}
                    </p>
                    {recent.length === 0 ? (
                      <p className="text-xs text-muted">No attendance marked yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {recent.map((r, j) => (
                          <motion.span
                            key={r.date}
                            title={`${formatDate(r.date)}: ${label(r.status)}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 + j * 0.03 }}
                            className={cn("h-3.5 w-3.5 rounded-full", ATTENDANCE_STYLE[r.status])}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative mt-4">
                  <p className="mb-1.5 flex justify-between text-[11px] font-semibold tracking-wider text-muted uppercase">
                    Fees <span className="normal-case">{due > 0 ? `${money(due)} due` : "Paid in full"}</span>
                  </p>
                  <PaymentProgress paid={e.feePaid} total={e.feeTotal} />
                  <PayOnline target={{ type: "enrollment", id: e.id, due, payable: e.status !== "dropped" }} />
                </div>

                {course?.certificate && (
                  <div
                    className={cn(
                      "relative mt-4 flex items-center gap-3 rounded-2xl p-3 text-sm",
                      e.certificateIssued ? "bg-gradient-to-r from-gold-soft to-primary-soft text-ink" : "bg-bg-deep/60 text-muted",
                    )}
                  >
                    <motion.span
                      animate={e.certificateIssued ? { rotate: [0, -12, 12, 0] } : undefined}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                      className={cn("flex h-9 w-9 items-center justify-center rounded-xl", e.certificateIssued ? "bg-gold text-white" : "bg-line text-muted")}
                    >
                      <Award className="h-5 w-5" />
                    </motion.span>
                    {e.certificateIssued
                      ? "Certificate ready to collect at the parlour 🎓"
                      : "Certificate awarded when you complete the course with fees cleared."}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
