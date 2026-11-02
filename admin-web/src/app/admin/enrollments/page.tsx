"use client";

import { AnimatePresence, motion } from "motion/react";
import { Award, CalendarCheck, ClipboardList, Plus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, Checkbox, DataTable, Drawer, Dropdown, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PaymentDialog, PaymentProgress, Skeleton, StatCard, StatusBadge, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { ENROLLMENT_STATUSES, formatDate, label, money, PAYMENT_METHODS, todayISO } from "@/lib/format";
import { useAction, useBatchAvailability, useCourses, useCustomers, useEnrollments, useLookups } from "@/lib/queries";
import type { AttendanceRecord, AttendanceStatus, Enrollment, EnrollmentStatus, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

const ATTENDANCE: AttendanceStatus[] = ["present", "late", "absent"];
const ATTENDANCE_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-success text-white",
  late: "bg-warning text-white",
  absent: "bg-danger text-white",
};

function attendanceRate(records: AttendanceRecord[]) {
  if (!records.length) return null;
  return Math.round((records.filter((r) => r.status !== "absent").length / records.length) * 100);
}

function AttendancePicker({ value, onChange }: { value: AttendanceStatus | undefined; onChange: (s: AttendanceStatus) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-xl border border-line bg-bg-deep/60 p-1">
      {ATTENDANCE.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={cn(
            "relative cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
            value === s ? "text-white" : "text-muted hover:text-ink",
          )}
        >
          {value === s && (
            <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("absolute inset-0 rounded-lg", ATTENDANCE_STYLE[s])} />
          )}
          <span className="relative">{label(s)}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- New enrollment ----------

function NewEnrollment({ onClose }: { onClose: () => void }) {
  const customers = useCustomers();
  const courses = useCourses();
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [withPayment, setWithPayment] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const availability = useBatchAvailability(courseId || null);
  const course = courses.data?.find((c) => c.id === courseId);
  const openBatches = (availability.data ?? []).filter((b) => b.isOpen);

  const save = useAction(
    () =>
      api.post("/enrollments", {
        studentId,
        courseId,
        batchId,
        initialPayment: withPayment && Number(amount) > 0 ? { amount: Number(amount), method } : null,
      }),
    { invalidate: ["enrollments", "courses", "customers"], success: "Student enrolled", onSuccess: onClose },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="New enrollment"
      description="Reserve a seat in a batch for a customer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!studentId || !courseId || !batchId} onClick={() => save.mutate()}>
            Enroll student
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Student">
          <Dropdown value={studentId} onChange={setStudentId} placeholder="Choose a customer…" searchable options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.name, description: c.phone }))} />
        </Field>
        <Field label="Course">
          <Dropdown
            value={courseId}
            onChange={(v) => {
              setCourseId(v);
              setBatchId("");
              setAmount("");
            }}
            placeholder="Choose a course…"
            options={(courses.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.title, description: money(c.fee) }))}
          />
        </Field>
        <AnimatePresence>
          {courseId && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="mb-2 text-xs font-medium text-ink-2">Batch</p>
              {availability.isLoading ? (
                <Skeleton className="h-16" />
              ) : openBatches.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">No open batches. Add one from the course page.</p>
              ) : (
                <div className="grid gap-2">
                  {openBatches.map(({ batch, seatsLeft }) => (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => setBatchId(batch.id)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-colors",
                        batchId === batch.id ? "border-primary bg-primary-soft/60" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span>
                        <span className="block text-sm font-semibold text-ink">{batch.name}</span>
                        <span className="text-xs text-muted">
                          {formatDate(batch.startDate, "d MMM")} – {formatDate(batch.endDate, "d MMM yyyy")}
                        </span>
                      </span>
                      <Badge tone={seatsLeft <= 2 ? "amber" : "green"}>{seatsLeft} seats left</Badge>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {course && (
          <div className="rounded-xl border border-line p-3">
            <Checkbox checked={withPayment} onChange={setWithPayment} label="Take a payment now" />
            <AnimatePresence>
              {withPayment && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label={`Amount (fee ${money(course.fee)})`}>
                      <Input type="number" min={1} max={course.fee} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(course.fee)} />
                    </Field>
                    <Field label="Method">
                      <Dropdown value={method} onChange={setMethod} options={PAYMENT_METHODS.map((v) => ({ value: v, label: label(v) }))} />
                    </Field>
                  </div>
                  <p className="mt-2 text-xs text-muted">Any payment makes the enrollment active; without one it stays pending.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- Batch attendance ----------

function BatchAttendance({ onClose }: { onClose: () => void }) {
  const courses = useCourses();
  const lookups = useLookups();
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [date, setDate] = useState(todayISO());
  const enrollments = useEnrollments(batchId ? { batchId, status: "active" } : { status: "__none__" });
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const course = courses.data?.find((c) => c.id === courseId);
  const students = batchId ? enrollments.data ?? [] : [];

  const existing = (e: Enrollment) => e.attendance.find((a) => a.date === date)?.status;
  const save = useAction(
    () =>
      api.post("/enrollments/attendance", {
        date,
        entries: students.map((e) => ({ enrollmentId: e.id, status: marks[e.id] ?? existing(e) ?? "present" })),
      }),
    { invalidate: ["enrollments"], success: () => `Attendance saved for ${students.length} ${students.length === 1 ? "student" : "students"}`, onSuccess: onClose },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Batch attendance"
      description="Mark one class for every active student."
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!students.length} onClick={() => save.mutate()}>
            Save attendance
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Course">
          <Dropdown
            value={courseId}
            onChange={(v) => {
              setCourseId(v);
              setBatchId("");
              setMarks({});
            }}
            placeholder="Choose…"
            options={(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))}
          />
        </Field>
        <Field label="Batch">
          <Dropdown
            value={batchId}
            disabled={!course}
            onChange={(v) => {
              setBatchId(v);
              setMarks({});
            }}
            placeholder="Choose…"
            options={(course?.batches ?? []).map((b) => ({ value: b.id, label: b.name }))}
          />
        </Field>
        <Field label="Class date">
          <Input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
        </Field>
      </div>
      <div className="mt-5">
        {!batchId ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Pick a course and batch.</p>
        ) : enrollments.isLoading ? (
          <Skeleton className="h-32" />
        ) : students.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No active students in this batch.</p>
        ) : (
          <>
            <div className="mb-2 flex justify-end gap-2">
              {ATTENDANCE.map((s) => (
                <Button key={s} size="sm" variant="ghost" onClick={() => setMarks(Object.fromEntries(students.map((e) => [e.id, s])))}>
                  All {label(s).toLowerCase()}
                </Button>
              ))}
            </div>
            <ul className="flex flex-col gap-2">
              {students.map((e, i) => {
                const name = lookups.customer.get(e.studentId)?.name ?? "Student";
                return (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-2.5"
                  >
                    <Avatar name={name} size={32} />
                    <span className="flex-1 text-sm font-medium text-ink">{name}</span>
                    <AttendancePicker value={marks[e.id] ?? existing(e) ?? "present"} onChange={(s) => setMarks((m) => ({ ...m, [e.id]: s }))} />
                  </motion.li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------- Detail ----------

function EnrollmentDetail({ enrollment, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  const lookups = useLookups();
  const [paying, setPaying] = useState(false);
  const [date, setDate] = useState(todayISO());
  const student = lookups.customer.get(enrollment.studentId);
  const course = lookups.course.get(enrollment.courseId);
  const batch = course?.batches.find((b) => b.id === enrollment.batchId);
  const due = enrollment.feeTotal - enrollment.feePaid;
  const rate = attendanceRate(enrollment.attendance);
  const locked = enrollment.status === "completed" || enrollment.status === "dropped";

  const setStatus = useAction((status: EnrollmentStatus) => api.post(`/enrollments/${enrollment.id}/status`, { status }), {
    invalidate: ["enrollments", "courses"],
    success: (_, s) => `Marked ${label(s).toLowerCase()}`,
  });
  const pay = useAction(({ amount, method }: { amount: number; method: PaymentMethod }) => api.post(`/enrollments/${enrollment.id}/payments`, { amount, method }), {
    invalidate: ["enrollments", "notifications"],
    success: "Fee payment recorded",
    onSuccess: () => setPaying(false),
  });
  const mark = useAction((status: AttendanceStatus) => api.post(`/enrollments/${enrollment.id}/attendance`, { date, status }), {
    invalidate: ["enrollments"],
    success: (_, s) => `Marked ${s} for ${formatDate(date, "d MMM")}`,
  });
  const certify = useAction(() => api.post(`/enrollments/${enrollment.id}/certificate`), {
    invalidate: ["enrollments", "notifications"],
    success: "Certificate issued 🎓",
  });

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={student?.name ?? "Enrollment"}
        description={`${course?.title ?? "Course"} · ${batch?.name ?? "Batch"}`}
        footer={
          <>
            {due > 0 && enrollment.status !== "dropped" && (
              <Button variant="gold" icon={<Wallet className="h-4 w-4" />} onClick={() => setPaying(true)}>
                Record fee
              </Button>
            )}
            {course?.certificate && (
              <Button
                icon={<Award className="h-4 w-4" />}
                loading={certify.isPending}
                disabled={enrollment.certificateIssued || enrollment.status !== "completed" || due > 0}
                onClick={() => certify.mutate()}
              >
                {enrollment.certificateIssued ? "Certificate issued" : "Issue certificate"}
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={student?.name ?? "?"} src={student?.avatar} size={56} />
            <div>
              <StatusBadge status={enrollment.status} />
              <p className="mt-1 text-xs text-muted">Enrolled {formatDate(enrollment.createdAt.slice(0, 10))}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink-2">Status</p>
            <Tabs
              value={enrollment.status}
              onChange={(s) => !locked && s !== enrollment.status && setStatus.mutate(s)}
              options={ENROLLMENT_STATUSES.map((s) => ({ value: s, label: label(s) }))}
            />
            {locked && <p className="mt-1.5 text-xs text-muted">Completed and dropped enrollments can&apos;t change status.</p>}
          </div>

          <Card className="p-4">
            <p className="mb-2 text-xs font-medium text-ink-2">Fees</p>
            <PaymentProgress paid={enrollment.feePaid} total={enrollment.feeTotal} />
            {enrollment.payments.length > 0 && (
              <ul className="mt-3 divide-y divide-line text-sm">
                {enrollment.payments.map((p) => (
                  <li key={p.id} className="flex justify-between py-2">
                    <span className="text-ink-2">
                      {formatDate(p.paidOn)} · {label(p.method)}
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-ink-2">Attendance {rate !== null && `· ${rate}%`}</p>
            </div>
            {enrollment.status === "active" ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line p-3">
                <Input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value || todayISO())} className="h-9 w-40" />
                <AttendancePicker value={enrollment.attendance.find((a) => a.date === date)?.status} onChange={(s) => mark.mutate(s)} />
              </div>
            ) : (
              <p className="mb-3 text-xs text-muted">Attendance can be marked for active students only.</p>
            )}
            {enrollment.attendance.length === 0 ? (
              <p className="text-xs text-muted">No classes recorded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...enrollment.attendance].reverse().map((a, i) => (
                  <motion.span
                    key={a.date}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i, 30) * 0.015 }}
                    title={`${formatDate(a.date)} · ${label(a.status)}`}
                    className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", ATTENDANCE_STYLE[a.status])}
                  >
                    {formatDate(a.date, "d MMM")}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>
      <PaymentDialog
        open={paying}
        onClose={() => setPaying(false)}
        due={due}
        title="Record fee payment"
        loading={pay.isPending}
        onSubmit={(amount, method) => pay.mutate({ amount, method })}
      />
    </>
  );
}

// ---------- Page ----------

export default function EnrollmentsPage() {
  const enrollments = useEnrollments();
  const lookups = useLookups();
  const [status, setStatus] = useState<"all" | EnrollmentStatus>("all");
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [creating, setCreating] = useState(false);
  const [attendance, setAttendance] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const all = useMemo(() => enrollments.data ?? [], [enrollments.data]);
  const scoped = all.filter((e) => (!courseId || e.courseId === courseId) && (!batchId || e.batchId === batchId));
  const rows = scoped.filter((e) => status === "all" || e.status === status);
  const course = courseId ? lookups.course.get(courseId) : undefined;
  const viewing = viewingId ? all.find((e) => e.id === viewingId) : undefined;

  const totals = useMemo(
    () => ({
      active: all.filter((e) => e.status === "active").length,
      collected: all.reduce((s, e) => s + e.feePaid, 0),
      due: all.filter((e) => e.status !== "dropped").reduce((s, e) => s + (e.feeTotal - e.feePaid), 0),
      certificates: all.filter((e) => e.certificateIssued).length,
    }),
    [all],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Academy"
        title="Enrollments"
        subtitle="Students, fees, attendance and certificates."
        actions={
          <>
            <Button variant="outline" icon={<CalendarCheck className="h-4 w-4" />} onClick={() => setAttendance(true)}>
              Batch attendance
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Enroll student
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard index={0} label="Active students" value={totals.active} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard index={1} label="Fees collected" value={totals.collected} format={money} icon={<Wallet className="h-5 w-5" />} accent="gold" />
        <StatCard index={2} label="Fees due" value={totals.due} format={money} icon={<Wallet className="h-5 w-5" />} accent="plum" />
        <StatCard index={3} label="Certificates" value={totals.certificates} icon={<Award className="h-5 w-5" />} accent="green" />
      </div>

      <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={status}
            onChange={setStatus}
            options={[
              { value: "all" as const, label: "All", count: scoped.length },
              ...ENROLLMENT_STATUSES.map((s) => ({ value: s, label: label(s), count: scoped.filter((e) => e.status === s).length })),
            ]}
          />
          <div className="flex gap-2">
            <Dropdown
              value={courseId}
              onChange={(v) => {
                setCourseId(v);
                setBatchId("");
              }}
              aria-label="Filter by course"
              className="w-48"
              options={[{ value: "", label: "All courses" }, ...[...lookups.course.values()].map((c) => ({ value: c.id, label: c.title }))]}
            />
            <Dropdown value={batchId} onChange={setBatchId} disabled={!course} aria-label="Filter by batch" className="w-40" options={[{ value: "", label: "All batches" }, ...(course?.batches ?? []).map((b) => ({ value: b.id, label: b.name }))]} />
          </div>
        </div>
        {enrollments.error ? (
          <div className="p-4">
            <ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} />
          </div>
        ) : enrollments.isLoading || !lookups.ready ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <DataTable
            rows={rows}
            onRowClick={(row) => setViewingId(row.id)}
            empty={<EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No enrollments" message="Enroll a customer into a course batch to get started." />}
            columns={[
              {
                header: "Student",
                cell: (e) => {
                  const s = lookups.customer.get(e.studentId);
                  return (
                    <div className="flex items-center gap-3">
                      <Avatar name={s?.name ?? "?"} src={s?.avatar} size={32} />
                      <div>
                        <p className="font-semibold text-ink">{s?.name ?? "Student"}</p>
                        <p className="text-xs text-muted">{s?.phone}</p>
                      </div>
                    </div>
                  );
                },
              },
              {
                header: "Course",
                cell: (e) => {
                  const c = lookups.course.get(e.courseId);
                  return (
                    <div>
                      <p className="font-medium text-ink">{c?.title ?? "—"}</p>
                      <p className="text-xs text-muted">{c?.batches.find((b) => b.id === e.batchId)?.name ?? "—"}</p>
                    </div>
                  );
                },
              },
              { header: "Status", cell: (e) => <StatusBadge status={e.status} /> },
              { header: "Fee", className: "w-48", cell: (e) => <PaymentProgress paid={e.feePaid} total={e.feeTotal} /> },
              {
                header: "Attendance",
                cell: (e) => {
                  const rate = attendanceRate(e.attendance);
                  return rate === null ? <span className="text-xs text-muted">—</span> : <span className={cn("font-semibold tabular-nums", rate >= 75 ? "text-success" : "text-warning")}>{rate}%</span>;
                },
              },
              {
                header: "Certificate",
                cell: (e) => (e.certificateIssued ? <Badge tone="gold"><Award className="h-3 w-3" /> Issued</Badge> : <span className="text-xs text-muted">—</span>),
              },
            ]}
          />
        )}
      </Card>

      {creating && <NewEnrollment onClose={() => setCreating(false)} />}
      {attendance && <BatchAttendance onClose={() => setAttendance(false)} />}
      {viewing && <EnrollmentDetail key={viewing.id} enrollment={viewing} onClose={() => setViewingId(null)} />}
    </div>
  );
}
