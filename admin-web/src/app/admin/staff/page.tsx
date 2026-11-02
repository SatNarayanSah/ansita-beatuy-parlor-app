"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Mail, Pencil, Phone, Plus, Star, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, ConfirmDialog, Drawer, Dropdown, EmptyState, ErrorState, Field, ImageUpload, Input, PageHeader, SearchInput, Skeleton, Stars, StatusBadge, Switch, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, label, time12, todayISO } from "@/lib/format";
import { useAction, useLookups, useStaff } from "@/lib/queries";
import type { Appointment, Review, Staff, StaffRole, Weekday, WorkingHours } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLES: StaffRole[] = ["owner", "senior_stylist", "stylist", "beautician", "trainer", "receptionist"];
const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const defaultHours = (): WorkingHours[] => WEEK.map((day) => ({ day, isOff: false, start: "10:00", end: "18:00" }));

function workingDays(hours: WorkingHours[]) {
  return WEEK.filter((d) => hours.find((h) => h.day === d && !h.isOff));
}

// ---------- Editor ----------

function StaffEditor({ member, onClose }: { member: Staff | null; onClose: () => void }) {
  const lookups = useLookups();
  const categories = [...lookups.category.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  const [form, setForm] = useState({
    name: member?.name ?? "",
    role: member?.role ?? ("stylist" as StaffRole),
    phone: member?.phone ?? "",
    email: member?.email ?? "",
    avatar: member?.avatar ?? "",
    isActive: member?.isActive ?? true,
    specialties: member?.specialties ?? [],
  });
  const [hours, setHours] = useState<WorkingHours[]>(() =>
    member
      ? WEEK.map((day) => member.workingHours.find((h) => h.day === day) ?? { day, isOff: true, start: "10:00", end: "18:00" })
      : defaultHours(),
  );
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const [uploading, setUploading] = useState(false);
  const setDay = (day: Weekday, patch: Partial<WorkingHours>) => setHours((list) => list.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  const body = {
    name: form.name.trim(),
    role: form.role,
    phone: form.phone,
    email: form.email,
    avatar: form.avatar.trim() || null,
    isActive: form.isActive,
    specialties: form.specialties,
    workingHours: hours,
  };
  const save = useAction(() => (member ? api.patch(`/staff/${member.id}`, body) : api.post("/staff", body)), {
    invalidate: ["staff"],
    success: member ? "Staff updated" : "Staff member added",
    onSuccess: onClose,
  });
  const valid = form.name.trim().length >= 2 && form.specialties.length > 0 && hours.some((h) => !h.isOff);

  return (
    <Drawer
      open
      onClose={onClose}
      title={member ? `Edit ${member.name}` : "New staff member"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!valid || uploading} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </Field>
          <Field label="Role">
            <Dropdown value={form.role} onChange={(v) => set("role", v)} options={ROLES.map((v) => ({ value: v, label: label(v) }))} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+977…" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <ImageUpload
            label="Photo (optional)"
            shape="round"
            hint="A square photo of the face works best."
            value={form.avatar}
            onChange={(url) => set("avatar", url)}
            onUploadingChange={setUploading}
            className="sm:col-span-2"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">Specialties</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = form.specialties.includes(c.id);
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => set("specialties", on ? form.specialties.filter((id) => id !== c.id) : [...form.specialties, c.id])}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    on ? "border-transparent text-white" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                  style={on ? { background: c.color } : undefined}
                >
                  {!on && <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />}
                  {c.name}
                </motion.button>
              );
            })}
          </div>
          {form.specialties.length === 0 && <p className="mt-1.5 text-xs text-danger">Choose at least one.</p>}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">Weekly shifts</p>
          <div className="flex flex-col gap-2">
            {hours.map((h, i) => (
              <motion.div
                key={h.day}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                className={cn("flex items-center gap-3 rounded-xl border p-2.5 transition-colors", h.isOff ? "border-line bg-bg-deep/50" : "border-line bg-surface")}
              >
                <span className="w-12 text-sm font-semibold text-ink">{label(h.day)}</span>
                <Switch checked={!h.isOff} onChange={(on) => setDay(h.day, { isOff: !on })} label={`Works on ${h.day}`} />
                <AnimatePresence mode="wait" initial={false}>
                  {h.isOff ? (
                    <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-muted">
                      Day off
                    </motion.span>
                  ) : (
                    <motion.div key="on" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 items-center gap-2">
                      <Input type="time" value={h.start} onChange={(e) => setDay(h.day, { start: e.target.value })} className="h-9" />
                      <span className="text-xs text-muted">to</span>
                      <Input type="time" value={h.end} onChange={(e) => setDay(h.day, { end: e.target.value })} className="h-9" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ---------- Detail ----------

function StaffDetail({ member, onClose, onEdit }: { member: Staff; onClose: () => void; onEdit: () => void }) {
  const lookups = useLookups();
  const [tab, setTab] = useState<"schedule" | "reviews" | "hours">("schedule");
  const [date, setDate] = useState(todayISO());
  const schedule = useQuery({
    queryKey: ["appointments", "staff-schedule", member.id, date],
    queryFn: () => api.get<Appointment[]>(`/staff/${member.id}/schedule`, { date }),
  });
  const reviews = useQuery({
    queryKey: ["reviews", "staff", member.id],
    queryFn: () => api.get<Review[]>(`/staff/${member.id}/reviews`),
  });

  return (
    <Drawer
      open
      onClose={onClose}
      title={member.name}
      description={
        <span className="flex items-center gap-2">
          {label(member.role)} · <Stars value={member.rating} size={12} /> {member.rating.toFixed(1)}
        </span>
      }
      footer={
        <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>
          Edit profile
        </Button>
      }
    >
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={member.name} src={member.avatar} size={64} />
        <div className="flex flex-col gap-1 text-sm text-ink-2">
          {member.phone && (
            <span className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted" /> {member.phone}
            </span>
          )}
          {member.email && (
            <span className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted" /> {member.email}
            </span>
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: "schedule", label: "Schedule" },
          { value: "reviews", label: "Reviews", count: reviews.data?.length },
          { value: "hours", label: "Shifts" },
        ]}
      />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab === "schedule" && (
            <div className="flex flex-col gap-3">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} className="sm:w-48" />
              {schedule.isLoading ? (
                <Skeleton className="h-24" />
              ) : schedule.error ? (
                <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />
              ) : !schedule.data?.length ? (
                <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="Free all day" message={`No bookings on ${formatDate(date, "EEE d MMM")}.`} />
              ) : (
                schedule.data.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-line p-3"
                  >
                    <div className="w-20 text-xs font-semibold text-primary-dark">
                      {time12(a.startTime)}
                      <span className="block font-normal text-muted">{time12(a.endTime)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{lookups.customer.get(a.customerId)?.name ?? "Customer"}</p>
                      <p className="truncate text-xs text-muted">
                        {a.serviceIds.map((id) => lookups.service.get(id)?.name).filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </motion.div>
                ))
              )}
            </div>
          )}
          {tab === "reviews" &&
            (reviews.isLoading ? (
              <Skeleton className="h-24" />
            ) : !reviews.data?.length ? (
              <EmptyState icon={<Star className="h-7 w-7" />} title="No reviews yet" />
            ) : (
              <ul className="flex flex-col gap-3">
                {reviews.data.map((r, i) => (
                  <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">{lookups.customer.get(r.customerId)?.name ?? r.customerName}</span>
                      <Stars value={r.rating} />
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{r.comment || <span className="text-muted">No comment</span>}</p>
                    {r.reply && <p className="mt-2 rounded-lg bg-primary-soft/60 px-3 py-2 text-xs text-primary-dark">Reply: {r.reply}</p>}
                  </motion.li>
                ))}
              </ul>
            ))}
          {tab === "hours" && (
            <ul className="flex flex-col gap-2">
              {WEEK.map((day) => {
                const h = member.workingHours.find((x) => x.day === day);
                const off = !h || h.isOff;
                return (
                  <li key={day} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-sm">
                    <span className="font-medium text-ink">{label(day)}</span>
                    {off ? <Badge tone="gray">Day off</Badge> : <span className="text-ink-2">{time12(h.start)} – {time12(h.end)}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>
    </Drawer>
  );
}

// ---------- Page ----------

export default function StaffPage() {
  const staff = useStaff();
  const lookups = useLookups();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [viewing, setViewing] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);

  const toggle = useAction(({ id, isActive }: { id: string; isActive: boolean }) => api.post(`/staff/${id}/active`, { isActive }), {
    invalidate: ["staff"],
    success: (_, v) => (v.isActive ? "Staff member is active" : "Staff member deactivated"),
  });
  const remove = useAction((id: string) => api.del(`/staff/${id}`), {
    invalidate: ["staff"],
    success: "Staff member removed",
    onSuccess: () => setDeleting(null),
  });

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (staff.data ?? [])
      .filter((s) => filter === "all" || (filter === "active" ? s.isActive : !s.isActive))
      .filter((s) => !needle || s.name.toLowerCase().includes(needle) || label(s.role).toLowerCase().includes(needle));
  }, [staff.data, query, filter]);

  const activeCount = (staff.data ?? []).filter((s) => s.isActive).length;
  const current = viewing ? staff.data?.find((s) => s.id === viewing.id) ?? viewing : null;

  return (
    <div>
      <PageHeader
        eyebrow="Parlour"
        title="Staff"
        subtitle={`${activeCount} active team members`}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Add staff
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: staff.data?.length ?? 0 },
            { value: "active", label: "Active", count: activeCount },
            { value: "inactive", label: "Inactive", count: (staff.data?.length ?? 0) - activeCount },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or role…" className="sm:w-72" />
      </div>

      {staff.error ? (
        <ErrorState error={staff.error} onRetry={() => staff.refetch()} />
      ) : staff.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<UserRound className="h-7 w-7" />} title="No staff found" message="Add your stylists and beauticians so customers can book them." />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((member, i) => {
              const days = workingDays(member.workingHours);
              return (
                <Card
                  key={member.id}
                  layout
                  hover
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: member.isActive ? 1 : 0.65, y: 0, transition: { delay: Math.min(i, 12) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  onClick={() => setViewing(member)}
                  className="group relative cursor-pointer overflow-hidden p-5"
                >
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary-soft via-plum-soft to-gold-soft opacity-70 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex items-start justify-between">
                    <motion.div whileHover={{ scale: 1.06, rotate: -3 }} transition={{ type: "spring", stiffness: 170, damping: 16 }}>
                      <Avatar name={member.name} src={member.avatar} size={64} className="ring-4" />
                    </motion.div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={member.isActive}
                        disabled={toggle.isPending && toggle.variables?.id === member.id}
                        onChange={(isActive) => toggle.mutate({ id: member.id, isActive })}
                        label="Active"
                      />
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <h3 className="font-display text-lg font-semibold text-ink">{member.name}</h3>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <span>{label(member.role)}</span>·<Stars value={member.rating} size={12} />
                      <span className="tabular-nums">{member.rating ? member.rating.toFixed(1) : "New"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.specialties.map((id) => {
                        const c = lookups.category.get(id);
                        return c ? (
                          <span key={id} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: c.color }}>
                            {c.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex gap-1">
                        {WEEK.map((d) => (
                          <span
                            key={d}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold",
                              days.includes(d) ? "bg-primary-soft text-primary-dark" : "bg-bg-deep text-muted",
                            )}
                            title={label(d)}
                          >
                            {d[0].toUpperCase()}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(member)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(member)} aria-label="Delete">
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

      {current && !editing && (
        <StaffDetail
          key={current.id}
          member={current}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(current);
          }}
        />
      )}
      {editing && <StaffEditor key={editing === "new" ? "new" : editing.id} member={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Remove staff member?"
        message={
          <>
            <b>{deleting?.name}</b> will be deleted. Staff with upcoming appointments or courses must be reassigned first. To keep their history, deactivate them instead.
          </>
        }
      />
    </div>
  );
}
