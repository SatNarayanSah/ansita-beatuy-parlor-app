"use client";

import { OpenFromUrl } from "@/components/layout/open-from-url";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, CalendarPlus, Clock, MessageSquareQuote, RotateCcw, Star, XCircle } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  PaymentProgress,
  Skeleton,
  Stars,
  StatusBadge,
  Tabs,
  Textarea,
} from "@/components/ui";
import { PayOnline } from "@/components/payments/payment-requests";
import { api } from "@/lib/api";
import { balanceDue, billTotal, formatDate, label, minutesLabel, money, relativeDay, time12 } from "@/lib/format";
import { useAction, useAppointments, useReviewFor } from "@/lib/queries";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isUpcoming, serviceNames, startsAt, useNames } from "../_parts";

type Tab = "upcoming" | "past" | "cancelled";

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ["", "Poor", "Fair", "Good", "Great", "Loved it!"];
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            whileHover={{ scale: 1.25, rotate: -8 }}
            whileTap={{ scale: 0.85 }}
            animate={n <= shown ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 0.25 }}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="cursor-pointer"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star className={cn("h-8 w-8 transition-colors", n <= shown ? "fill-gold text-gold" : "text-line-strong")} />
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.span key={shown} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-sm font-medium text-gold-text">
          {words[shown]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function ReviewSection({ appointment }: { appointment: Appointment }) {
  const review = useReviewFor(appointment.id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submit = useAction(() => api.post("/reviews", { appointmentId: appointment.id, rating, comment: comment.trim() }), {
    invalidate: ["reviews", "staff"],
    success: "Thank you for your review!",
  });

  if (review.isLoading) return <Skeleton className="h-28" />;
  if (review.data) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-bg/50 p-4">
        <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Your review</p>
        <Stars value={review.data.rating} size={18} />
        {review.data.comment && <p className="mt-2 text-sm text-ink-2">{review.data.comment}</p>}
        {review.data.reply && (
          <div className="mt-3 rounded-xl border-l-4 border-primary bg-primary-soft/40 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
              <MessageSquareQuote className="h-3.5 w-3.5" /> Reply from Ansita
            </p>
            <p className="mt-1 text-sm text-ink-2">{review.data.reply}</p>
          </div>
        )}
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gold/40 bg-gold-soft/40 p-4">
      <p className="font-display text-lg font-semibold text-ink">Rate your visit</p>
      <p className="mb-3 text-xs text-muted">Your feedback helps our stylists and other customers.</p>
      <StarInput value={rating} onChange={setRating} />
      <Textarea className="mt-3" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="What did you love? What could be better?" />
      <Button className="mt-3" disabled={!rating} loading={submit.isPending} onClick={() => submit.mutate()}>
        Submit review
      </Button>
    </motion.div>
  );
}

function DetailDrawer({ appointment, names, onClose }: { appointment: Appointment | null; names: ReturnType<typeof useNames>; onClose: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const cancel = useAction(
    () => api.post(`/appointments/${appointment?.id}/status`, { status: "cancelled", reason: reason.trim() || undefined }),
    {
      invalidate: ["appointments", "customers", "notifications", "availability"],
      success: "Appointment cancelled",
      onSuccess: () => {
        setCancelling(false);
        setReason("");
      },
    },
  );
  const a = appointment;
  const member = a ? names.staff.get(a.staffId) : undefined;
  const canCancel = a ? isUpcoming(a) : false;

  return (
    <>
      <Drawer
        open={!!a}
        onClose={onClose}
        title={a ? serviceNames(a, names) : ""}
        description={a && <StatusBadge status={a.status} />}
        footer={
          a && (
            <>
              {canCancel && (
                <Button variant="ghost" icon={<XCircle className="h-4 w-4" />} onClick={() => setCancelling(true)}>
                  Cancel booking
                </Button>
              )}
              <Link href={`/account/book?service=${a.serviceIds[0] ?? ""}`}>
                <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />}>
                  Book again
                </Button>
              </Link>
            </>
          )
        }
      >
        {a && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line bg-bg/50 p-3">
                <p className="text-[11px] tracking-wider text-muted uppercase">Date</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{formatDate(a.date, "EEE, d MMM yyyy")}</p>
              </div>
              <div className="rounded-2xl border border-line bg-bg/50 p-3">
                <p className="text-[11px] tracking-wider text-muted uppercase">Time</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {time12(a.startTime)} – {time12(a.endTime)}
                </p>
              </div>
            </div>

            {member && (
              <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <Avatar name={member.name} src={member.avatar} size={42} />
                <div>
                  <p className="text-sm font-semibold text-ink">{member.name}</p>
                  <p className="text-xs text-muted">{label(member.role)}</p>
                </div>
                {member.rating > 0 && (
                  <span className="ml-auto">
                    <Stars value={member.rating} />
                  </span>
                )}
              </div>
            )}

            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Services</h3>
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {a.serviceIds.map((id) => {
                  const s = names.service.get(id);
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-ink">{s?.name ?? "Service"}</span>
                      <span className="text-xs text-muted">{s ? minutesLabel(s.duration) : ""}</span>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold">
                  <span className="text-ink">Total</span>
                  <span className="text-primary-dark">{billTotal(a) < a.totalPrice && <span className="mr-1.5 text-xs font-normal text-muted line-through">{money(a.totalPrice)}</span>}{money(billTotal(a))}</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted uppercase">
                Payment <StatusBadge status={a.paymentStatus} />
              </h3>
              <PaymentProgress paid={a.amountPaid} total={billTotal(a)} />
              {a.offerDiscount > 0 && (
                <p className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-success-soft/70 px-3 py-2 text-xs text-success">
                  <span className="truncate">
                    Offer · {a.offerTitle}
                    {a.offerCode ? ` (${a.offerCode})` : ""}
                  </span>
                  <span className="shrink-0 font-semibold">−{money(a.offerDiscount)}</span>
                </p>
              )}
              {a.payments?.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {a.payments.map((p) => (
                    <li key={p.id} className="flex justify-between text-xs text-ink-2">
                      <span>
                        {formatDate(p.paidOn)} · {label(p.method)}
                          {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      <span className="font-medium">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {a.preferredPaymentMethod && a.paymentStatus !== "paid" && (
                <p className="mt-2 text-xs text-muted">You plan to pay by {label(a.preferredPaymentMethod)}.</p>
              )}
              <PayOnline
                target={{
                  type: "appointment",
                  id: a.id,
                  due: balanceDue(a),
                  payable: a.status !== "cancelled" && a.status !== "no_show",
                }}
              />
            </section>

            {a.notes && (
              <div className="rounded-2xl bg-gold-soft/60 p-4 text-sm text-ink-2">
                <p className="mb-1 text-[11px] font-semibold tracking-wider text-gold-text uppercase">Your notes</p>
                {a.notes}
              </div>
            )}
            {a.cancellationReason && (
              <div className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">
                <p className="mb-1 text-[11px] font-semibold tracking-wider uppercase">Cancellation reason</p>
                {a.cancellationReason}
              </div>
            )}

            {a.status === "completed" && <ReviewSection key={a.id} appointment={a} />}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={() => cancel.mutate()}
        loading={cancel.isPending}
        title="Cancel this booking?"
        confirmLabel="Yes, cancel"
        message={
          <div className="flex flex-col gap-3">
            <p>The parlour will be notified and the time will be freed for others.</p>
            <Field label="Reason (optional)">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Something came up" />
            </Field>
          </div>
        }
      />
    </>
  );
}

export default function MyAppointmentsPage() {
  const appointments = useAppointments();
  const names = useNames();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const all = appointments.data ?? [];
    return {
      upcoming: all.filter(isUpcoming).sort((a, b) => startsAt(a) - startsAt(b)),
      past: all.filter((a) => !isUpcoming(a) && a.status !== "cancelled").sort((a, b) => startsAt(b) - startsAt(a)),
      cancelled: all.filter((a) => a.status === "cancelled").sort((a, b) => startsAt(b) - startsAt(a)),
    };
  }, [appointments.data]);
  const list = groups[tab];
  const selected = appointments.data?.find((a) => a.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Bookings"
        title="My appointments"
        subtitle="See what's coming up, cancel if plans change, and rate your visits."
        actions={
          <Link href="/account/book">
            <Button icon={<CalendarPlus className="h-4 w-4" />}>Book a visit</Button>
          </Link>
        }
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "Upcoming", count: groups.upcoming.length },
          { value: "past", label: "Past", count: groups.past.length },
          { value: "cancelled", label: "Cancelled", count: groups.cancelled.length },
        ]}
      />

      {appointments.error ? (
        <ErrorState error={appointments.error} onRetry={() => appointments.refetch()} />
      ) : appointments.isLoading || !names.ready ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-7 w-7" />}
            title={tab === "upcoming" ? "Nothing coming up" : tab === "past" ? "No past visits yet" : "No cancellations"}
            message={tab === "upcoming" ? "Book your next treatment in a few taps." : undefined}
            action={
              tab === "upcoming" && (
                <Link href="/account/book">
                  <Button icon={<CalendarPlus className="h-4 w-4" />}>Book a visit</Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {list.map((a, i) => {
              const member = names.staff.get(a.staffId);
              return (
                <motion.button
                  key={a.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 10) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedId(a.id)}
                  className="group hover-lift flex cursor-pointer gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-soft"
                >
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-primary-soft to-plum-soft py-2">
                    <span className="text-[10px] font-semibold text-primary-dark uppercase">{formatDate(a.date, "MMM")}</span>
                    <span className="font-display text-2xl leading-none font-semibold text-primary-dark">{formatDate(a.date, "d")}</span>
                    <span className="text-[10px] text-muted">{formatDate(a.date, "EEE")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold text-ink">{serviceNames(a, names)}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3 w-3" /> {relativeDay(a.date)} · {time12(a.startTime)}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs text-ink-2">
                        {member && <Avatar name={member.name} src={member.avatar} size={22} />}
                        {member?.name}
                      </span>
                      <span className="text-sm font-semibold text-primary-dark">{money(billTotal(a))}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <DetailDrawer appointment={selected} names={names} onClose={() => setSelectedId(null)} />
      <OpenFromUrl onOpen={setSelectedId} />
    </div>
  );
}
