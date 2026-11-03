"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { OpenFromUrl } from "@/components/layout/open-from-url";
import { PromoCode } from "@/components/payments/promo-code";
import { Avatar, Button, Card, EmptyState, ErrorState, Field, PageHeader, Skeleton, Stars, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { addDaysISO, formatDate, label, minutesLabel, money, PAYMENT_METHODS, time12, todayISO } from "@/lib/format";
import { type OfferQuote, useAction, useCategories, useServices, useSettings } from "@/lib/queries";
import type { Appointment, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SlotGrid, useAvailableStaff } from "../_parts";

const STEPS = ["Services", "Date & time", "Details", "Confirm"];

/** ?code=TIHAR25 from an offer card's "Book now". */
function readCode(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("code") ?? "";
}

function readPreselected(): string[] {
  if (typeof window === "undefined") return [];
  const id = new URLSearchParams(window.location.search).get("service");
  return id ? [id] : [];
}

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  const colors = ["#a44a67", "#e0bc6e", "#5a2d52", "#efbfcd", "#3fa772"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 120 + ((i * 37) % 90);
        return (
          <motion.span
            key={i}
            className="absolute top-[38%] left-1/2 h-2.5 w-1.5 rounded-sm"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 80,
              opacity: 0,
              rotate: 360 + i * 25,
              scale: 1,
            }}
            transition={{ duration: 1.6 + (i % 5) * 0.15, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          />
        );
      })}
    </div>
  );
}

function Success({ appointment, onAgain }: { appointment: Appointment; onAgain: () => void }) {
  return (
    <Card className="relative mx-auto max-w-lg overflow-hidden p-6 text-center" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
      <Confetti />
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-success to-success text-white shadow-xl"
      >
        <motion.svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={3}>
          <motion.path d="M5 12l5 5L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
        </motion.svg>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4 font-display text-3xl font-bold text-ink">
        Request sent!
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-2 text-sm text-ink-2">
        {formatDate(appointment.date, "EEEE, d MMMM")} at {time12(appointment.startTime)}. The parlour will confirm shortly, and you&apos;ll get a notification as soon as they do.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href="/account/appointments">
          <Button icon={<CalendarCheck className="h-4 w-4" />}>My appointments</Button>
        </Link>
        <Button variant="outline" onClick={onAgain}>
          Book another
        </Button>
      </motion.div>
    </Card>
  );
}

export default function BookPage() {
  const { user } = useAuth();
  const services = useServices();
  const categories = useCategories();
  const settings = useSettings();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [serviceIds, setServiceIds] = useState<string[]>(readPreselected);
  const [date, setDate] = useState("");
  const [staffId, setStaffId] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>("cash");
  const [booked, setBooked] = useState<Appointment | null>(null);
  const [initialCode] = useState(readCode);
  const [presetCode, setPresetCode] = useState<string | null>(null);
  const [offerCode, setOfferCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<OfferQuote | null>(null);

  const today = todayISO();
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => addDaysISO(today, i)), [today]);
  const holidays = useMemo(() => new Map((settings.data?.holidays ?? []).map((h) => [h.date, h.name])), [settings.data]);

  const chosen = (services.data ?? []).filter((s) => serviceIds.includes(s.id));
  const total = chosen.reduce((sum, s) => sum + s.price, 0);
  const duration = chosen.reduce((sum, s) => sum + s.duration, 0);
  const staff = useAvailableStaff(date, serviceIds);
  const member = staff.data?.find((s) => s.id === staffId);

  const grouped = useMemo(() => {
    const list = (services.data ?? []).filter((s) => s.isActive);
    return [...(categories.data ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ category: c, items: list.filter((s) => s.categoryId === c.id) }))
      .filter((g) => g.items.length);
  }, [services.data, categories.data]);

  const book = useAction(
    () =>
      api.post<Appointment>("/appointments", {
        customerId: user?.customerId,
        serviceIds,
        staffId,
        date,
        startTime: time,
        notes: notes.trim(),
        preferredPaymentMethod: method,
        offerCode,
      }),
    {
      invalidate: ["appointments", "customers", "notifications", "availability"],
      success: "Booking request sent",
      onSuccess: (appointment) => setBooked(appointment),
    },
  );

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function reset() {
    setBooked(null);
    setServiceIds([]);
    setDate("");
    setStaffId("");
    setTime("");
    setNotes("");
    setStep(0);
  }

  const canNext = [serviceIds.length > 0, !!(date && staffId && time), true, true][step];

  if (booked) return <Success appointment={booked} onAgain={reset} />;

  return (
    <div>
      <OpenFromUrl param="code" onOpen={setPresetCode} />
      <PageHeader eyebrow="Book online" title="Book a visit" subtitle="Choose your treatments, then a stylist and a time that suits you." />

      {/* progress */}
      <div className="mb-4">
        <div className="mb-3 flex justify-between gap-2">
          {STEPS.map((name, i) => (
            <button
              key={name}
              type="button"
              disabled={i > step}
              onClick={() => i < step && go(i)}
              className={cn("flex items-center gap-2 text-xs font-medium transition-colors", i <= step ? "cursor-pointer text-primary-dark" : "text-muted")}
            >
              <motion.span
                animate={{ scale: i === step ? 1.1 : 1 }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                  i < step ? "border-primary bg-primary text-white dark:text-[#2a1520]" : i === step ? "border-primary bg-primary-soft text-primary-dark" : "border-line bg-surface",
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </motion.span>
              <span className="hidden sm:inline">{name}</span>
            </button>
          ))}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-plum to-gold"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden p-4 sm:p-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {step === 0 &&
                (services.error ? (
                  <ErrorState error={services.error} onRetry={() => services.refetch()} />
                ) : services.isLoading || categories.isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : grouped.length === 0 ? (
                  <EmptyState icon={<Sparkles className="h-7 w-7" />} title="No services available" message="Please check back soon." />
                ) : (
                  <div className="flex flex-col gap-4">
                    {grouped.map(({ category, items }) => (
                      <section key={category.id}>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                          {category.name}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {items.map((s) => {
                            const on = serviceIds.includes(s.id);
                            return (
                              <motion.button
                                key={s.id}
                                type="button"
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setServiceIds((ids) => (on ? ids.filter((id) => id !== s.id) : [...ids, s.id]));
                                  setStaffId("");
                                  setTime("");
                                }}
                                className={cn(
                                  "hover-lift-sm relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left",
                                  on ? "border-primary bg-primary-soft/50" : "border-line bg-surface hover:border-line-strong",
                                )}
                              >
                                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", on ? "border-primary bg-primary text-white" : "border-line-strong")}>
                                  {on && <Check className="h-3.5 w-3.5" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-ink">{s.name}</span>
                                  {s.description && <span className="line-clamp-2 block text-xs text-muted">{s.description}</span>}
                                  <span className="mt-1.5 flex items-center gap-3 text-xs">
                                    <span className="font-semibold text-primary-dark">{money(s.price)}</span>
                                    <span className="flex items-center gap-1 text-muted">
                                      <Clock className="h-3 w-3" />
                                      {minutesLabel(s.duration)}
                                    </span>
                                  </span>
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                ))}

              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <section>
                    <h3 className="mb-3 text-sm font-semibold text-ink">Pick a day</h3>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                      {days.map((d, i) => {
                        const holiday = holidays.get(d);
                        const on = d === date;
                        return (
                          <motion.button
                            key={d}
                            type="button"
                            disabled={!!holiday}
                            title={holiday ? `Closed: ${holiday}` : undefined}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i, 14) * 0.02 }}
                            onClick={() => {
                              setDate(d);
                              setStaffId("");
                              setTime("");
                            }}
                            className={cn(
                              "hover-lift-sm flex w-16 shrink-0 cursor-pointer flex-col items-center rounded-2xl border py-2.5",
                              on
                                ? "border-primary bg-gradient-to-b from-primary to-primary-dark text-white shadow-[0_8px_20px_-8px_var(--ring)] dark:text-[#2a1520]"
                                : holiday
                                  ? "cursor-not-allowed border-line/50 bg-bg-deep/50 text-muted opacity-50"
                                  : "border-line bg-surface text-ink-2 hover:border-primary/50",
                            )}
                          >
                            <span className="text-[10px] font-semibold uppercase">{i === 0 ? "Today" : formatDate(d, "EEE")}</span>
                            <span className="font-display text-xl font-semibold">{formatDate(d, "d")}</span>
                            <span className="text-[10px]">{holiday ? "Closed" : formatDate(d, "MMM")}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </section>

                  {date && (
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <h3 className="mb-3 text-sm font-semibold text-ink">Choose your stylist</h3>
                      {staff.isLoading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Skeleton className="h-20" />
                          <Skeleton className="h-20" />
                        </div>
                      ) : staff.error ? (
                        <ErrorState error={staff.error} onRetry={() => staff.refetch()} />
                      ) : !staff.data?.length ? (
                        <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
                          No stylist offers all of these services on this day. Try another day or fewer services.
                        </p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {staff.data.map((m) => {
                            const on = m.id === staffId;
                            return (
                              <motion.button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setStaffId(m.id);
                                  setTime("");
                                }}
                                className={cn(
                                  "hover-lift-sm relative flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left",
                                  on ? "border-primary" : "border-line hover:border-line-strong",
                                )}
                              >
                                {on && <motion.span layoutId="book-staff" className="absolute inset-0 rounded-2xl bg-primary-soft/60" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                                <span className="relative">
                                  <Avatar name={m.name} src={m.avatar} size={44} />
                                </span>
                                <span className="relative min-w-0">
                                  <span className="block text-sm font-semibold text-ink">{m.name}</span>
                                  <span className="block text-xs text-muted">{label(m.role)}</span>
                                  {m.rating > 0 && <Stars value={m.rating} size={12} />}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </motion.section>
                  )}

                  {date && staffId && (
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <h3 className="mb-3 text-sm font-semibold text-ink">Pick a time</h3>
                      <SlotGrid date={date} staffId={staffId} serviceIds={serviceIds} value={time} onChange={setTime} />
                    </motion.section>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <Field label="Anything we should know? (optional)" hint="Allergies, hair length, a reference look…">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="e.g. I have sensitive skin" />
                  </Field>
                  <Field label="How would you like to pay?" hint="You pay at the parlour after your visit.">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(m)}
                          className={cn(
                            "relative cursor-pointer rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                            method === m ? "border-primary text-primary-dark" : "border-line text-ink-2 hover:border-line-strong",
                          )}
                        >
                          {method === m && <motion.span layoutId="book-pay" className="absolute inset-0 rounded-xl bg-primary-soft" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                          <span className="relative">{label(m)}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <h3 className="font-display text-xl font-semibold text-ink">Review your booking</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["When", `${formatDate(date, "EEEE, d MMMM")} · ${time12(time)}`],
                      ["Stylist", member?.name ?? "—"],
                      ["Duration", minutesLabel(duration)],
                      ["Pay by", method ? label(method) : "Decide later"],
                      ...(quote?.offer && quote.discount > 0 ? [["Offer", `${quote.offer.title} · −${money(quote.discount)}`]] : []),
                    ].map(([k, v], i) => (
                      <motion.div key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-line bg-bg/50 p-3">
                        <dt className="text-[11px] tracking-wider text-muted uppercase">{k}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-ink">{v}</dd>
                      </motion.div>
                    ))}
                  </dl>
                  {notes.trim() && <p className="rounded-2xl bg-gold-soft/60 p-3 text-sm text-ink-2">“{notes.trim()}”</p>}
                  <p className="text-xs text-muted">Your request goes to the parlour as “pending”. You’ll be notified once it’s confirmed.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <h3 className="font-display text-lg font-semibold text-ink">Your selection</h3>
            {chosen.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No services chosen yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {chosen.map((s) => (
                    <motion.li key={s.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex justify-between gap-3 text-sm">
                      <span className="text-ink-2">{s.name}</span>
                      <span className="font-medium text-ink">{money(s.price)}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
            {chosen.length > 0 && (
              <PromoCode
                className="mt-4 border-t border-line pt-4"
                serviceIds={serviceIds}
                date={date || todayISO()}
                initialCode={initialCode}
                presetCode={presetCode}
                onChange={(code, q) => {
                  setOfferCode(code);
                  setQuote(q);
                }}
              />
            )}
            <AnimatePresence initial={false}>
              {quote?.offer && quote.discount > 0 && chosen.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex flex-col gap-1 overflow-hidden text-sm"
                >
                  <div className="flex justify-between text-ink-2">
                    <span>Subtotal</span>
                    <span>{money(total)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-success">
                    <span className="truncate">Offer · {quote.offer.title}</span>
                    <span className="shrink-0">−{money(quote.discount)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
              <div>
                <p className="text-xs text-muted">{quote?.discount ? "To pay" : "Total"} · {minutesLabel(duration || 0)}</p>
                <motion.p
                  key={total - (quote?.discount ?? 0)}
                  initial={{ scale: 1.15, color: "var(--primary)" }}
                  animate={{ scale: 1, color: "var(--text)" }}
                  className="font-display text-2xl font-semibold"
                >
                  {money(total - (quote?.discount ?? 0))}
                </motion.p>
                {!!quote?.discount && <p className="text-xs text-muted line-through">{money(total)}</p>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {step > 0 && (
                <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => go(step - 1)}>
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button className="flex-1" disabled={!canNext} onClick={() => go(step + 1)}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="flex-1" loading={book.isPending} icon={<CalendarCheck className="h-4 w-4" />} onClick={() => book.mutate()}>
                  Request booking
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
