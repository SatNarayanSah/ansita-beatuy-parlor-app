"use client";

import { openHref } from "@/components/layout/open-from-url";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  CheckCheck,
  Clock,
  GraduationCap,
  Info,
  Megaphone,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Skeleton, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo, todayISO } from "@/lib/format";
import { useAction, useNotifications } from "@/lib/queries";
import type { Notification, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_STYLE: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  appointment_booked: { icon: CalendarPlus, className: "bg-info-soft text-info" },
  appointment_confirmed: { icon: CalendarCheck, className: "bg-success-soft text-success" },
  appointment_cancelled: { icon: CalendarX, className: "bg-danger-soft text-danger" },
  appointment_reminder: { icon: Clock, className: "bg-warning-soft text-warning" },
  enrollment: { icon: GraduationCap, className: "bg-plum-soft text-plum" },
  payment: { icon: Wallet, className: "bg-gold-soft text-gold-text" },
  promotion: { icon: Megaphone, className: "bg-primary-soft text-primary" },
  system: { icon: Info, className: "bg-neutral-soft text-neutral" },
};

const LINK_ROUTE: Record<string, string> = {
  appointment: "/account/appointments",
  enrollment: "/account/courses",
  course: "/academy",
  customer: "/account/profile",
  offer: "/offers",
};

const OPENS_RECORD = new Set(["appointment"]);

const INVALIDATE = ["notifications", "payment-requests"];

export default function AccountNotificationsPage() {
  const notifications = useNotifications();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [clearing, setClearing] = useState(false);

  const markRead = useAction((id: string) => api.post(`/notifications/${id}/read`), { invalidate: INVALIDATE });
  const markAll = useAction(() => api.post("/notifications/read-all"), { invalidate: INVALIDATE, success: "All caught up" });
  const removeOne = useAction((id: string) => api.del(`/notifications/${id}`), { invalidate: INVALIDATE });
  const clearAll = useAction(() => api.del("/notifications"), {
    invalidate: INVALIDATE,
    success: "Notifications cleared",
    onSuccess: () => setClearing(false),
  });

  const all = notifications.data ?? [];
  const unread = all.filter((n) => !n.isRead).length;
  const list = [...all]
    .filter((n) => filter === "all" || !n.isRead)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // createdAt is UTC; compare its local (Kathmandu) calendar day with today.
  const localDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date(iso));
  const today = todayISO();
  const groups = [
    { title: "Today", items: list.filter((n) => localDay(n.createdAt) === today) },
    { title: "Earlier", items: list.filter((n) => localDay(n.createdAt) !== today) },
  ].filter((g) => g.items.length);

  function open(n: Notification) {
    if (!n.isRead) markRead.mutate(n.id);
    // Appointments and enrollments open the record itself; other kinds open their page.
    if (n.link && LINK_ROUTE[n.link.kind]) router.push(OPENS_RECORD.has(n.link.kind) ? openHref(LINK_ROUTE[n.link.kind], n.link.id) : LINK_ROUTE[n.link.kind]);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up."}
        actions={
          <>
            <Button variant="outline" icon={<CheckCheck className="h-4 w-4" />} disabled={!unread} loading={markAll.isPending} onClick={() => markAll.mutate()}>
              Mark all read
            </Button>
            <Button variant="ghost" icon={<Trash2 className="h-4 w-4" />} disabled={!all.length} onClick={() => setClearing(true)}>
              Clear all
            </Button>
          </>
        }
      />

      <Tabs
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: all.length },
          { value: "unread", label: "Unread", count: unread },
        ]}
      />

      {notifications.error ? (
        <ErrorState error={notifications.error} onRetry={() => notifications.refetch()} />
      ) : notifications.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={filter === "unread" ? <Bell className="h-7 w-7" /> : <BellOff className="h-7 w-7" />}
            title={filter === "unread" ? "Nothing unread" : "No notifications"}
            message="Booking confirmations, payment receipts, course updates and offers show up here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 px-1 text-[11px] font-semibold tracking-[0.2em] text-muted uppercase">{group.title}</h2>
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={true} mode="popLayout">
                  {group.items.map((n, i) => {
                    const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
                    const Icon = style.icon;
                    return (
                      <motion.li
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 12) * 0.03 } }}
                        exit={{ opacity: 0, x: 80, transition: { duration: 0.2 } }}
                        className={cn(
                          "group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border p-4 transition-colors",
                          n.isRead ? "border-line bg-surface hover:bg-surface-alt" : "border-primary/30 bg-primary-soft/40 hover:bg-primary-soft/60",
                        )}
                        onClick={() => open(n)}
                      >
                        {!n.isRead && <motion.span layoutId={`unread-${n.id}`} className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                        <motion.span whileHover={{ rotate: -10, scale: 1.1 }} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", style.className)}>
                          <Icon className="h-5 w-5" />
                        </motion.span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn("truncate text-sm text-ink", n.isRead ? "font-medium" : "font-semibold")}>{n.title}</p>
                            {!n.isRead && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />}
                          </div>
                          <p className="mt-0.5 text-sm text-ink-2">{n.message}</p>
                          <p className="mt-1 text-[11px] text-muted">{timeAgo(n.createdAt)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeOne.mutate(n.id);
                          }}
                          className="cursor-pointer rounded-lg p-1.5 text-muted opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
                          aria-label="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={clearing}
        onClose={() => setClearing(false)}
        onConfirm={() => clearAll.mutate()}
        loading={clearAll.isPending}
        title="Clear all notifications?"
        message="This deletes every notification in your inbox."
        confirmLabel="Clear all"
      />
    </div>
  );
}
