"use client";

import { AnimatePresence, motion } from "motion/react";
import { Award, BookOpen, CalendarRange, Clock, GraduationCap, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Checkbox, ConfirmDialog, Drawer, Dropdown, EmptyState, ErrorState, Field, ImageUpload, Input, Modal, PageHeader, SearchInput, Skeleton, StatusBadge, Switch, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, label, money, time12 } from "@/lib/format";
import { useAction, useBatchAvailability, useCourses, useLookups, useStaff } from "@/lib/queries";
import type { Batch, BatchStatus, Course, CourseLevel, CourseType, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: CourseType[] = ["certification", "diploma", "workshop"];
const LEVELS: CourseLevel[] = ["beginner", "intermediate", "advanced"];
const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const BATCH_STATUSES: BatchStatus[] = ["upcoming", "ongoing", "completed"];

const LEVEL_TONE = { beginner: "green", intermediate: "gold", advanced: "plum" } as const;

interface ModuleDraft {
  key: string;
  id?: string;
  title: string;
  hours: string;
  topics: string;
}

// ---------- Course editor ----------

function CourseEditor({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const staff = useStaff();
  const [form, setForm] = useState({
    title: course?.title ?? "",
    type: course?.type ?? ("certification" as CourseType),
    level: course?.level ?? ("beginner" as CourseLevel),
    description: course?.description ?? "",
    duration: course?.duration ?? "",
    fee: String(course?.fee ?? ""),
    instructor: course?.instructor ?? "",
    seats: String(course?.seats ?? 12),
    image: course?.image ?? "",
    certificate: course?.certificate ?? true,
    isActive: course?.isActive ?? true,
  });
  const [modules, setModules] = useState<ModuleDraft[]>(
    () =>
      course?.syllabus.map((m) => ({ key: m.id, id: m.id, title: m.title, hours: String(m.hours), topics: m.topics.join(", ") })) ?? [],
  );
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const [uploading, setUploading] = useState(false);
  const instructors = (staff.data ?? []).filter((s) => s.isActive || s.id === form.instructor);
  const instructor = form.instructor || instructors[0]?.id || "";

  const body = {
    ...form,
    instructor,
    fee: Number(form.fee),
    seats: Number(form.seats),
    image: form.image.trim() || null,
    syllabus: modules
      .filter((m) => m.title.trim())
      .map((m) => ({
        ...(m.id ? { id: m.id } : {}),
        title: m.title.trim(),
        hours: Number(m.hours) || 0,
        topics: m.topics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })),
  };
  const save = useAction(() => (course ? api.patch(`/courses/${course.id}`, body) : api.post("/courses", body)), {
    invalidate: ["courses"],
    success: course ? "Course updated" : "Course created",
    onSuccess: onClose,
  });
  const valid = form.title.trim().length >= 2 && form.duration.trim() && form.fee !== "" && Number(form.seats) >= 1 && instructor;

  return (
    <Drawer
      open
      onClose={onClose}
      title={course ? "Edit course" : "New course"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!valid || uploading} onClick={() => save.mutate()}>
            Save course
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Professional Makeup Artistry" autoFocus />
          </Field>
          <Field label="Type">
            <Dropdown value={form.type} onChange={(v) => set("type", v)} options={TYPES.map((v) => ({ value: v, label: label(v) }))} />
          </Field>
          <Field label="Level">
            <Dropdown value={form.level} onChange={(v) => set("level", v)} options={LEVELS.map((v) => ({ value: v, label: label(v) }))} />
          </Field>
          <Field label="Duration" hint='e.g. "3 months" or "2 days"'>
            <Input value={form.duration} onChange={(e) => set("duration", e.target.value)} />
          </Field>
          <Field label="Fee (NPR)">
            <Input type="number" min={0} value={form.fee} onChange={(e) => set("fee", e.target.value)} />
          </Field>
          <Field label="Instructor">
            <Dropdown value={instructor} onChange={(v) => set("instructor", v)} placeholder="Choose an instructor" options={instructors.map((s) => ({ value: s.id, label: s.name, description: label(s.role) }))} />
          </Field>
          <Field label="Seats per batch">
            <Input type="number" min={1} value={form.seats} onChange={(e) => set("seats", e.target.value)} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <ImageUpload
            label="Course image (optional)"
            value={form.image}
            onChange={(url) => set("image", url)}
            onUploadingChange={setUploading}
            className="sm:col-span-2"
          />
          <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
            <Checkbox checked={form.certificate} onChange={(v) => set("certificate", v)} label="Awards a certificate" />
            <Checkbox checked={form.isActive} onChange={(v) => set("isActive", v)} label="Open for enrollment" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-ink-2">Syllabus · {modules.reduce((s, m) => s + (Number(m.hours) || 0), 0)} hours</p>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setModules((list) => [...list, { key: crypto.randomUUID(), title: "", hours: "4", topics: "" }])}
            >
              Module
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {modules.map((m, i) => (
                <motion.div
                  key={m.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 rounded-xl border border-line bg-bg/50 p-3">
                    <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-dark">
                      {i + 1}
                    </span>
                    <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_80px]">
                      <Input
                        value={m.title}
                        placeholder="Module title"
                        onChange={(e) => setModules((list) => list.map((x) => (x.key === m.key ? { ...x, title: e.target.value } : x)))}
                      />
                      <Input
                        type="number"
                        min={0}
                        value={m.hours}
                        placeholder="Hrs"
                        onChange={(e) => setModules((list) => list.map((x) => (x.key === m.key ? { ...x, hours: e.target.value } : x)))}
                      />
                      <Input
                        className="sm:col-span-2"
                        value={m.topics}
                        placeholder="Topics, separated by commas"
                        onChange={(e) => setModules((list) => list.map((x) => (x.key === m.key ? { ...x, topics: e.target.value } : x)))}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setModules((list) => list.filter((x) => x.key !== m.key))} aria-label="Remove module">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {modules.length === 0 && <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">No modules yet.</p>}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ---------- Batch editor ----------

function BatchModal({ course, batch, onClose }: { course: Course; batch: Batch | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: batch?.name ?? `Batch ${course.batches.length + 1}`,
    startDate: batch?.startDate ?? "",
    endDate: batch?.endDate ?? "",
    days: batch?.days ?? (["sun", "mon", "tue", "wed", "thu"] as Weekday[]),
    startTime: batch?.startTime ?? "10:00",
    endTime: batch?.endTime ?? "13:00",
    seats: String(batch?.seats ?? course.seats),
    status: batch?.status ?? ("upcoming" as BatchStatus),
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const body = { ...form, seats: Number(form.seats) };
  const save = useAction(
    () => (batch ? api.patch(`/courses/${course.id}/batches/${batch.id}`, body) : api.post(`/courses/${course.id}/batches`, body)),
    { invalidate: ["courses", "enrollments"], success: batch ? "Batch updated" : "Batch added", onSuccess: onClose },
  );
  const valid = form.name.trim() && form.startDate && form.endDate && form.days.length > 0 && Number(form.seats) >= 1;

  return (
    <Modal
      open
      onClose={onClose}
      title={batch ? "Edit batch" : "New batch"}
      description={course.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>
            Save batch
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Starts">
          <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Ends">
          <Input type="date" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
        <Field label="Class days" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {WEEK.map((d) => {
              const on = form.days.includes(d);
              return (
                <motion.button
                  key={d}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => set("days", on ? form.days.filter((x) => x !== d) : [...form.days, d])}
                  className={cn(
                    "h-9 w-12 cursor-pointer rounded-lg border text-xs font-semibold transition-colors",
                    on ? "border-primary bg-primary text-white" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                >
                  {label(d)}
                </motion.button>
              );
            })}
          </div>
        </Field>
        <Field label="Class starts">
          <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </Field>
        <Field label="Class ends">
          <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </Field>
        <Field label="Seats">
          <Input type="number" min={1} value={form.seats} onChange={(e) => set("seats", e.target.value)} />
        </Field>
        <Field label="Status">
          <Dropdown value={form.status} onChange={(v) => set("status", v)} options={BATCH_STATUSES.map((v) => ({ value: v, label: label(v) }))} />
        </Field>
      </div>
    </Modal>
  );
}

// ---------- Course detail ----------

function CourseDetail({ course, onClose, onEdit }: { course: Course; onClose: () => void; onEdit: () => void }) {
  const lookups = useLookups();
  const availability = useBatchAvailability(course.id);
  const [batchEditing, setBatchEditing] = useState<Batch | "new" | null>(null);
  const [batchDeleting, setBatchDeleting] = useState<Batch | null>(null);
  const [tab, setTab] = useState<"batches" | "syllabus">("batches");
  const removeBatch = useAction((id: string) => api.del(`/courses/${course.id}/batches/${id}`), {
    invalidate: ["courses"],
    success: "Batch deleted",
    onSuccess: () => setBatchDeleting(null),
  });
  const totalHours = course.syllabus.reduce((s, m) => s + m.hours, 0);

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={course.title}
        description={`${label(course.type)} · ${label(course.level)} · ${course.duration}`}
        footer={
          <>
            <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>
              Edit course
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setBatchEditing("new")}>
              Add batch
            </Button>
          </>
        }
      >
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "Fee", value: money(course.fee) },
            { label: "Instructor", value: lookups.staff.get(course.instructor)?.name ?? "—" },
            { label: "Hours", value: totalHours ? `${totalHours} hrs` : "—" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl border border-line bg-bg/50 p-3"
            >
              <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">{item.label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{item.value}</p>
            </motion.div>
          ))}
        </div>
        {course.description && <p className="mb-5 text-sm leading-relaxed text-ink-2">{course.description}</p>}

        <Tabs
          value={tab}
          onChange={setTab}
          className="mb-4"
          options={[
            { value: "batches", label: "Batches", count: course.batches.length },
            { value: "syllabus", label: "Syllabus", count: course.syllabus.length },
          ]}
        />

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {tab === "batches" ? (
              availability.isLoading ? (
                <Skeleton className="h-28" />
              ) : availability.error ? (
                <ErrorState error={availability.error} onRetry={() => availability.refetch()} />
              ) : !availability.data?.length ? (
                <EmptyState icon={<CalendarRange className="h-7 w-7" />} title="No batches yet" message="Add a batch so students can enroll." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {availability.data.map(({ batch, seatsTaken, seatsLeft, isFull }, i) => {
                    const pct = batch.seats ? (seatsTaken / batch.seats) * 100 : 0;
                    return (
                      <motion.li
                        key={batch.id}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="group rounded-2xl border border-line p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-ink">{batch.name}</p>
                            <p className="text-xs text-muted">
                              {formatDate(batch.startDate, "d MMM")} – {formatDate(batch.endDate)} · {batch.days.map((d) => label(d)).join(", ")} ·{" "}
                              {time12(batch.startTime)}–{time12(batch.endTime)}
                            </p>
                          </div>
                          <StatusBadge status={batch.status} />
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                          <motion.div
                            className={cn("h-full rounded-full", isFull ? "bg-danger" : pct > 70 ? "bg-gold" : "bg-gradient-to-r from-primary to-plum")}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted">
                            {seatsTaken}/{batch.seats} seats · {isFull ? "Full" : `${seatsLeft} left`}
                          </span>
                          <div className="flex gap-1 opacity-70 group-hover:opacity-100">
                            <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setBatchEditing(batch)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5 text-danger" />} onClick={() => setBatchDeleting(batch)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )
            ) : course.syllabus.length === 0 ? (
              <EmptyState icon={<BookOpen className="h-7 w-7" />} title="No syllabus yet" />
            ) : (
              <ol className="flex flex-col gap-2">
                {course.syllabus.map((m, i) => (
                  <motion.li key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-3 rounded-xl border border-line p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-plum text-xs font-bold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{m.title}</p>
                        <span className="text-xs text-muted">{m.hours} hrs</span>
                      </div>
                      {m.topics.length > 0 && <p className="mt-0.5 text-xs text-muted">{m.topics.join(" · ")}</p>}
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>
      </Drawer>
      {batchEditing && (
        <BatchModal key={batchEditing === "new" ? "new" : batchEditing.id} course={course} batch={batchEditing === "new" ? null : batchEditing} onClose={() => setBatchEditing(null)} />
      )}
      <ConfirmDialog
        open={!!batchDeleting}
        onClose={() => setBatchDeleting(null)}
        onConfirm={() => batchDeleting && removeBatch.mutate(batchDeleting.id)}
        loading={removeBatch.isPending}
        title="Delete batch?"
        message={`"${batchDeleting?.name}" will be removed. Batches with enrolled students can't be deleted.`}
      />
    </>
  );
}

// ---------- Page ----------

export default function CoursesPage() {
  const courses = useCourses();
  const lookups = useLookups();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | CourseType>("all");
  const [editing, setEditing] = useState<Course | "new" | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);

  const toggle = useAction(({ id, isActive }: { id: string; isActive: boolean }) => api.post(`/courses/${id}/active`, { isActive }), {
    invalidate: ["courses"],
    success: (_, v) => (v.isActive ? "Course is open for enrollment" : "Course closed"),
  });
  const remove = useAction((id: string) => api.del(`/courses/${id}`), {
    invalidate: ["courses"],
    success: "Course deleted",
    onSuccess: () => setDeleting(null),
  });

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (courses.data ?? []).filter((c) => (type === "all" || c.type === type) && (!needle || c.title.toLowerCase().includes(needle)));
  }, [courses.data, query, type]);
  const viewing = viewingId ? courses.data?.find((c) => c.id === viewingId) ?? null : null;

  return (
    <div>
      <PageHeader
        eyebrow="Academy"
        title="Courses"
        subtitle="Training programmes, batches and syllabus."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            New course
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All", count: courses.data?.length ?? 0 },
            ...TYPES.map((t) => ({ value: t, label: label(t), count: (courses.data ?? []).filter((c) => c.type === t).length })),
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search courses…" className="sm:w-72" />
      </div>

      {courses.error ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
      ) : courses.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No courses" message="Create a course to start taking enrollments." />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((course, i) => {
              const openBatches = course.batches.filter((b) => b.status !== "completed").length;
              return (
                <Card
                  key={course.id}
                  layout
                  hover
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: course.isActive ? 1 : 0.65, y: 0, transition: { delay: Math.min(i, 9) * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  onClick={() => setViewingId(course.id)}
                  className="group flex cursor-pointer flex-col overflow-hidden"
                >
                  <div className="relative h-32 overflow-hidden bg-gradient-to-br from-plum via-primary-dark to-primary">
                    {course.image && /^https?:\/\//.test(course.image) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110" />
                    )}
                    <motion.div
                      className="absolute -right-6 -bottom-8 text-white/15"
                      animate={{ rotate: [0, 8, 0] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <GraduationCap className="h-36 w-36" />
                    </motion.div>
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge tone="rose" className="bg-white/90 text-primary-dark">
                        {label(course.type)}
                      </Badge>
                      {course.certificate && (
                        <Badge tone="gold" className="bg-white/90">
                          <Award className="h-3 w-3" /> Certificate
                        </Badge>
                      )}
                    </div>
                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={course.isActive}
                        disabled={toggle.isPending && toggle.variables?.id === course.id}
                        onChange={(isActive) => toggle.mutate({ id: course.id, isActive })}
                        label="Open for enrollment"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg leading-snug font-semibold text-ink">{course.title}</h3>
                      <Badge tone={LEVEL_TONE[course.level]}>{label(course.level)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">by {lookups.staff.get(course.instructor)?.name ?? "—"}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-ink-2">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted" /> {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarRange className="h-3.5 w-3.5 text-muted" /> {openBatches} open
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted" /> {course.seats} seats
                      </span>
                    </div>
                    <div className="mt-auto flex items-end justify-between pt-4">
                      <p className="font-display text-2xl font-semibold text-primary-dark">{money(course.fee)}</p>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(course)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(course)} aria-label="Delete">
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {viewing && !editing && <CourseDetail key={viewing.id} course={viewing} onClose={() => setViewingId(null)} onEdit={() => setEditing(viewing)} />}
      {editing && <CourseEditor key={editing === "new" ? "new" : editing.id} course={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete course?"
        message={
          <>
            <b>{deleting?.title}</b> will be deleted. Courses with enrollments can&apos;t be deleted; close them instead.
          </>
        }
      />
    </div>
  );
}
