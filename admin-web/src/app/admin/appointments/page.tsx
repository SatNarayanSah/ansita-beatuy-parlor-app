"use client";

import { OpenFromUrl } from "@/components/layout/open-from-url";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, LayoutList, Columns3 } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Button, Card, DataTable, Dropdown, EmptyState, ErrorState, Input, PageHeader, PaymentProgress, SearchInput, Skeleton, StatusBadge, Tabs } from "@/components/ui";
import { addDaysISO, APPOINTMENT_STATUSES, formatDate, label, money, relativeDay, time12, timeToMinutes, todayISO } from "@/lib/format";
import { useAppointments, useLookups, useSettings } from "@/lib/queries";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BookingWizard } from "./_booking";
import { AppointmentDrawer } from "./_details";

type View = "list" | "board";

const BLOCK_STYLE: Record<string, string> = {
  pending: "border-warning/30 bg-warning-soft text-warning",
  confirmed: "border-info/30 bg-info-soft text-info",
  completed: "border-success/30 bg-success-soft text-success",
  cancelled: "border-danger/30 bg-danger-soft/70 text-danger line-through opacity-70",
  no_show: "border-neutral/30 bg-neutral-soft text-neutral opacity-80",
};

const HOUR_PX = 72;

function DayBoard({ onOpen }: { onOpen: (id: string) => void }) {
  const [date, setDate] = useState(todayISO());
  const [direction, setDirection] = useState(0);
  const appointments = useAppointments({ date });
  const settings = useSettings();
  const lookups = useLookups();

  const open = settings.data?.profile.openTime ?? "09:00";
  const close = settings.data?.profile.closeTime ?? "19:00";
  const startMin = Math.floor(timeToMinutes(open) / 60) * 60;
  const endMin = Math.ceil(timeToMinutes(close) / 60) * 60;
  const hours = Array.from({ length: Math.max(1, (endMin - startMin) / 60) }, (_, i) => startMin / 60 + i);
  const holiday = settings.data?.holidays.find((h) => h.date === date);

  const staff = useMemo(() => {
    const ids = new Set((appointments.data ?? []).map((a) => a.staffId));
    return [...lookups.staff.values()].filter((s) => s.isActive || ids.has(s.id));
  }, [lookups.staff, appointments.data]);

  const shift = (days: number) => {
    setDirection(days);
    setDate((d) => addDaysISO(d, days));
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={date} initial={{ opacity: 0, x: direction * 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -20 }} transition={{ duration: 0.2 }}>
            <p className="font-display text-xl font-semibold text-ink">{relativeDay(date)}</p>
            <p className="text-xs text-muted">{formatDate(date, "EEEE, d MMMM yyyy")}</p>
          </motion.div>
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-2">
          {date !== todayISO() && (
            <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>
              Today
            </Button>
          )}
          <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-[160px]" />
        </div>
      </div>

      {holiday && (
        <div className="bg-gold-soft px-5 py-2 text-sm text-gold-text">Closed for {holiday.name}</div>
      )}

      {appointments.error ? (
        <div className="p-5">
          <ErrorState error={appointments.error} onRetry={() => appointments.refetch()} />
        </div>
      ) : appointments.isLoading || !lookups.ready ? (
        <div className="p-5">
          <Skeleton className="h-[420px]" />
        </div>
      ) : staff.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No staff yet" message="Add stylists on the Staff page to see the board." />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-fit">
            {/* Time rail */}
            <div className="sticky left-0 z-10 w-16 shrink-0 border-r border-line bg-surface">
              <div className="h-14 border-b border-line" />
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative border-b border-line/50 pr-2 text-right text-[10px] text-muted">
                  <span className="relative -top-2 bg-surface px-1">{time12(`${String(h).padStart(2, "0")}:00`)}</span>
                </div>
              ))}
            </div>
            {staff.map((member, col) => {
              const list = (appointments.data ?? []).filter((a) => a.staffId === member.id);
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: col * 0.05 }}
                  className="w-[200px] shrink-0 border-r border-line last:border-r-0"
                >
                  <div className="flex h-14 items-center gap-2 border-b border-line px-3">
                    <Avatar name={member.name} src={member.avatar} size={30} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                      <p className="text-[11px] text-muted">
                        {(() => {
                          const n = list.filter((a) => a.status !== "cancelled").length;
                          return `${n} ${n === 1 ? "booking" : "bookings"}`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="relative" style={{ height: hours.length * HOUR_PX }}>
                    {hours.map((h) => (
                      <div key={h} style={{ top: (h * 60 - startMin) * (HOUR_PX / 60), height: HOUR_PX }} className="absolute inset-x-0 border-b border-line/50" />
                    ))}
                    <AnimatePresence>
                      {list.map((a, i) => {
                        const top = (timeToMinutes(a.startTime) - startMin) * (HOUR_PX / 60);
                        const height = Math.max(28, (timeToMinutes(a.endTime) - timeToMinutes(a.startTime)) * (HOUR_PX / 60) - 3);
                        return (
                          <motion.button
                            key={a.id}
                            type="button"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ delay: 0.1 + i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
                            onClick={() => onOpen(a.id)}
                            style={{ top, height }}
                            className={cn(
                              "hover-grow absolute inset-x-1.5 cursor-pointer overflow-hidden rounded-xl border-l-4 px-2 py-1 text-left shadow-sm hover:z-[5]",
                              BLOCK_STYLE[a.status],
                            )}
                          >
                            <p className="truncate text-[11px] font-semibold">{lookups.customer.get(a.customerId)?.name ?? "Customer"}</p>
                            <p className="truncate text-[10px] opacity-80">
                              {time12(a.startTime)} · {a.serviceIds.map((id) => lookups.service.get(id)?.name).filter(Boolean).join(", ")}
                            </p>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function ListView({ onOpen }: { onOpen: (id: string) => void }) {
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState(addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(addDaysISO(todayISO(), 30));
  const [staffId, setStaffId] = useState("");
  const [query, setQuery] = useState("");
  const appointments = useAppointments({ from: from || undefined, to: to || undefined, staffId: staffId || undefined });
  const lookups = useLookups();

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (appointments.data ?? [])
      .filter((a) => !q || (lookups.customer.get(a.customerId)?.name ?? "").toLowerCase().includes(q))
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [appointments.data, query, lookups.customer]);
  const rows = status === "all" ? searched : searched.filter((a) => a.status === status);

  const counts = (s: string) => (s === "all" ? searched.length : searched.filter((a) => a.status === s).length);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Tabs
          value={status}
          onChange={setStatus}
          options={[{ value: "all", label: "All", count: counts("all") }, ...APPOINTMENT_STATUSES.map((s) => ({ value: s, label: label(s), count: counts(s) }))]}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search customer" />
          <Dropdown value={staffId} onChange={setStaffId} aria-label="Filter by staff" options={[{ value: "", label: "All staff" }, ...[...lookups.staff.values()].map((s) => ({ value: s.id, label: s.name }))]} />
          <div className="grid grid-cols-2 gap-2 sm:contents">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
        </div>
      </div>
      {appointments.error ? (
        <div className="p-5">
          <ErrorState error={appointments.error} onRetry={() => appointments.refetch()} />
        </div>
      ) : appointments.isLoading || !lookups.ready ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <DataTable<Appointment>
          rows={rows}
          onRowClick={(a) => onOpen(a.id)}
          empty={<EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No appointments" message="Try a different date range or filter." />}
          columns={[
            {
              header: "Customer",
              cell: (a) => {
                const c = lookups.customer.get(a.customerId);
                return (
                  <div className="flex items-center gap-3">
                    <Avatar name={c?.name ?? "?"} src={c?.avatar} size={34} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink transition-colors group-hover:text-primary">{c?.name ?? "Unknown"}</p>
                      <p className="truncate text-xs text-muted">{c?.phone}</p>
                    </div>
                  </div>
                );
              },
            },
            {
              header: "Services",
              cell: (a) => (
                <p className="max-w-[220px] truncate text-ink-2">{a.serviceIds.map((id) => lookups.service.get(id)?.name).filter(Boolean).join(", ")}</p>
              ),
            },
            { header: "Stylist", cell: (a) => <span className="text-ink-2">{lookups.staff.get(a.staffId)?.name ?? "—"}</span> },
            {
              header: "When",
              cell: (a) => (
                <div>
                  <p className="font-medium text-ink">{relativeDay(a.date)}</p>
                  <p className="text-xs text-muted">
                    {time12(a.startTime)} – {time12(a.endTime)}
                  </p>
                </div>
              ),
            },
            { header: "Total", cell: (a) => <span className="font-semibold text-ink">{money(a.totalPrice)}</span> },
            { header: "Paid", className: "w-[150px]", cell: (a) => <PaymentProgress paid={a.amountPaid} total={a.totalPrice - (a.pointsDiscount ?? 0)} /> },
            { header: "Status", cell: (a) => <StatusBadge status={a.status} /> },
          ]}
        />
      )}
    </Card>
  );
}

export default function AppointmentsPage() {
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  // All appointments, so the drawer always shows the latest copy after a change.
  const all = useAppointments();
  const selected = all.data?.find((a) => a.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Bookings"
        title="Appointments"
        subtitle="Confirm requests, take payments and keep every stylist's day on track."
        actions={
          <>
            <Tabs
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: <span className="flex items-center gap-1.5"><LayoutList className="h-3.5 w-3.5" />List</span> },
                { value: "board", label: <span className="flex items-center gap-1.5"><Columns3 className="h-3.5 w-3.5" />Day board</span> },
              ]}
            />
            <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setBooking(true)}>
              New appointment
            </Button>
          </>
        }
      />

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {view === "list" ? <ListView onOpen={setSelectedId} /> : <DayBoard onOpen={setSelectedId} />}
        </motion.div>
      </AnimatePresence>

      <AppointmentDrawer appointment={selected} onClose={() => setSelectedId(null)} />
      <OpenFromUrl onOpen={setSelectedId} />
      <BookingWizard open={booking} onClose={() => setBooking(false)} />
    </div>
  );
}
