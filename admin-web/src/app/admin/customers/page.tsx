"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Cake, Crown, Mail, MapPin, Pencil, Phone, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AnimatedNumber,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  Skeleton,
  StatusBadge,
  Tabs,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, label, money, relativeDay, time12, timeAgo } from "@/lib/format";
import { useAction, useAppointments, useCustomers, useCustomerStats, useLookups } from "@/lib/queries";
import type { Customer, CustomerTag } from "@/lib/types";
import { CUSTOMER_TAGS, CustomerForm } from "./_form";

function tagTone(tag: CustomerTag) {
  return ({ vip: "gold", bridal: "rose", new: "blue", student: "plum", regular: "green", inactive: "gray" } as const)[tag];
}

function TagBadge({ tag }: { tag: CustomerTag }) {
  return <Badge tone={tagTone(tag)}>{tag === "vip" ? "VIP" : label(tag)}</Badge>;
}

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function Stat({ title, value, format, delay }: { title: string; value: number; format?: (n: number) => string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-line bg-bg/60 p-3"
    >
      <p className="text-[11px] text-muted">{title}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink">
        <AnimatedNumber value={value} format={format} />
      </p>
    </motion.div>
  );
}

function CustomerDrawer({ customer, onClose, onEdit }: { customer: Customer | null; onClose: () => void; onEdit: (c: Customer) => void }) {
  const stats = useCustomerStats(customer?.id ?? null);
  const history = useAppointments({ customerId: customer?.id }, !!customer);
  const lookups = useLookups();
  const [deleting, setDeleting] = useState(false);

  const remove = useAction(() => api.del(`/customers/${customer?.id}`), {
    invalidate: ["customers", "appointments"],
    success: "Customer deleted",
    onSuccess: () => {
      setDeleting(false);
      onClose();
    },
  });

  const c = customer;
  const address = c ? [c.address?.line1, c.address?.line2, c.address?.city, c.address?.province].filter(Boolean).join(", ") : "";

  return (
    <>
      <Drawer
        open={!!c}
        onClose={onClose}
        title={c?.name ?? ""}
        description={c && <span>Customer since {formatDate(c.joinedAt.slice(0, 10), "MMM yyyy")}</span>}
        footer={
          c && (
            <>
              <Button variant="ghost" className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(true)}>
                Delete
              </Button>
              <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(c)}>
                Edit
              </Button>
            </>
          )
        }
      >
        {c && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
                <Avatar name={c.name} src={c.avatar} size={64} />
              </motion.div>
              <div className="flex min-w-0 flex-col gap-1 text-sm text-ink-2">
                <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted" />{c.phone || "—"}</span>
                {c.email && <span className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 text-muted" />{c.email}</span>}
                {c.dob && <span className="flex items-center gap-2"><Cake className="h-3.5 w-3.5 text-muted" />{formatDate(c.dob, "d MMMM")}</span>}
                {address && <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted" />{address}</span>}
              </div>
            </div>
            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t) => <TagBadge key={t} tag={t} />)}
              </div>
            )}

            {stats.isLoading ? (
              <Skeleton className="h-36" />
            ) : stats.data ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat title="Visits" value={stats.data.totalVisits} delay={0} />
                <Stat title="Total spent" value={stats.data.totalSpent} format={money} delay={0.05} />
                <Stat title="Upcoming" value={stats.data.upcomingCount} delay={0.1} />
                <Stat title="Cancelled" value={stats.data.cancelledCount} delay={0.15} />
                <Stat title="Courses" value={stats.data.activeEnrollments} delay={0.2} />
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl border border-line bg-bg/60 p-3">
                  <p className="text-[11px] text-muted">Last visit</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{stats.data.lastVisit ? formatDate(stats.data.lastVisit) : "—"}</p>
                </motion.div>
              </div>
            ) : null}

            {/* Loyalty */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold to-[#84682f] p-4 text-white">
              <motion.div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/15" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity }} />
              <p className="flex items-center gap-1.5 text-xs font-medium text-white/80"><Crown className="h-3.5 w-3.5" /> Loyalty points</p>
              <p className="mt-1 font-display text-4xl font-bold">
                <AnimatedNumber value={c.loyaltyPoints} />
              </p>
              <p className="relative mt-1 text-xs text-white/75">Earned automatically on completed visits.</p>
            </section>

            {c.notes && (
              <div className="rounded-2xl bg-gold-soft/60 p-4 text-sm text-ink-2">
                <p className="mb-1 text-[11px] font-semibold tracking-wider text-gold-text uppercase">Notes</p>
                {c.notes}
              </div>
            )}

            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Appointment history</h3>
              {history.isLoading ? (
                <Skeleton className="h-24" />
              ) : !history.data?.length ? (
                <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">No appointments yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {[...history.data].reverse().map((a, i) => (
                    <motion.li key={a.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
                        <span className="text-[9px] font-semibold uppercase">{formatDate(a.date, "MMM")}</span>
                        <span className="text-sm leading-none font-bold">{formatDate(a.date, "d")}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{a.serviceIds.map((id) => lookups.service.get(id)?.name).filter(Boolean).join(", ")}</p>
                        <p className="text-xs text-muted">
                          {relativeDay(a.date)} · {time12(a.startTime)} · {money(a.totalPrice)}
                        </p>
                      </div>
                      <StatusBadge status={a.status} />
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        title="Delete customer?"
        message={<>This permanently removes <b>{c?.name}</b>. Customers with appointments, enrollments or an app account may not be deletable.</>}
      />
    </>
  );
}

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string>("all");
  const debounced = useDebounced(query);
  const customers = useCustomers({ query: debounced, tag: tag === "all" ? undefined : tag });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ customer: Customer | null; open: boolean; key: number }>({ customer: null, open: false, key: 0 });
  const openForm = (customer: Customer | null) => setEditing((e) => ({ customer, open: true, key: e.key + 1 }));
  const selected = customers.data?.find((c) => c.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Clients"
        title="Customers"
        subtitle="Everyone who has booked in the app or at the desk."
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Add customer
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, phone or email" className="lg:w-80" />
        <Tabs
          value={tag}
          onChange={setTag}
          options={[{ value: "all", label: "All" }, ...CUSTOMER_TAGS.map((t) => ({ value: t, label: t === "vip" ? "VIP" : label(t) }))]}
        />
      </div>

      {customers.error ? (
        <ErrorState error={customers.error} onRetry={() => customers.refetch()} />
      ) : customers.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[170px]" />
          ))}
        </div>
      ) : !customers.data?.length ? (
        <Card>
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={query || tag !== "all" ? "No matches" : "No customers yet"}
            message={query || tag !== "all" ? "Try another search or tag." : "Add your first customer to start booking."}
            action={!query && tag === "all" ? <Button onClick={() => openForm(null)}>Add customer</Button> : undefined}
          />
        </Card>
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {customers.data.map((c, i) => (
              <motion.button
                key={c.id}
                type="button"
                layout
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 16) * 0.035, type: "spring", stiffness: 260, damping: 24 } }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                onClick={() => setSelectedId(c.id)}
                className="group hover-lift relative cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface p-5 text-left shadow-soft"
              >
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-br from-primary-soft via-plum-soft to-gold-soft opacity-70 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start justify-between">
                  <Avatar name={c.name} src={c.avatar} size={52} className="ring-4" />
                  {c.loyaltyPoints > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-gold-text shadow-sm">
                      <Crown className="h-3 w-3" /> {c.loyaltyPoints}
                    </span>
                  )}
                </div>
                <p className="relative mt-3 truncate font-display text-lg font-semibold text-ink group-hover:text-primary">{c.name}</p>
                <p className="relative truncate text-xs text-muted">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                <div className="relative mt-3 flex min-h-[22px] flex-wrap items-center gap-1.5">
                  {c.tags.slice(0, 3).map((t) => <TagBadge key={t} tag={t} />)}
                  <span className="ml-auto flex items-center gap-1 text-[11px] text-muted">
                    <CalendarDays className="h-3 w-3" /> joined {timeAgo(c.joinedAt)}
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <CustomerDrawer customer={selected} onClose={() => setSelectedId(null)} onEdit={openForm} />
      <CustomerForm
        key={editing.key}
        customer={editing.customer}
        open={editing.open}
        onClose={() => setEditing((e) => ({ ...e, open: false }))}
        onSaved={(c) => !editing.customer && setSelectedId(c.id)}
      />
    </div>
  );
}
