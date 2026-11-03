"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { useLayoutEffect, useMemo, useState } from "react";
import { PromoCode } from "@/components/payments/promo-code";
import { Avatar, Button, EmptyState, Field, Input, Modal, SearchInput, Skeleton, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, label, minutesLabel, money, PAYMENT_METHODS, time12, todayISO } from "@/lib/format";
import { type OfferQuote, useAction, useCategories, useCustomers, useServices } from "@/lib/queries";
import type { Appointment, PaymentMethod, Staff, TimeSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Staff who can do every selected service and work on `date`. */
export function useAvailableStaff(date: string, serviceIds: string[]) {
  return useQuery({
    queryKey: ["availability", "staff", date, serviceIds],
    queryFn: () => api.get<Staff[]>("/availability/staff", { date, serviceIds }),
    enabled: !!date && serviceIds.length > 0,
  });
}

export function SlotPicker({
  date,
  staffId,
  serviceIds,
  excludeAppointmentId,
  value,
  onChange,
}: {
  date: string;
  staffId: string;
  serviceIds: string[];
  excludeAppointmentId?: string;
  value: string;
  onChange: (time: string) => void;
}) {
  const slots = useQuery({
    queryKey: ["availability", "slots", date, staffId, serviceIds, excludeAppointmentId],
    queryFn: () =>
      api.get<TimeSlot[]>("/availability/slots", { date, staffId, serviceIds, excludeAppointmentId }),
    enabled: !!date && !!staffId && serviceIds.length > 0,
  });
  if (!staffId) return <p className="text-xs text-muted">Choose a stylist to see free times.</p>;
  if (slots.isLoading)
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  if (slots.error) return <p className="text-xs text-danger">{(slots.error as Error).message}</p>;
  if (!slots.data?.length) return <p className="text-xs text-muted">No slots on this day.</p>;
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {slots.data.map((slot, i) => {
        const selected = value === slot.time;
        return (
          <motion.button
            key={slot.time}
            type="button"
            disabled={!slot.available}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i, 30) * 0.012 }}
            whileTap={slot.available ? { scale: 0.94 } : undefined}
            onClick={() => onChange(slot.time)}
            className={cn(
              "hover-lift-sm relative cursor-pointer rounded-xl border px-1 py-2 text-xs font-medium",
              selected
                ? "border-primary bg-primary text-white shadow-[0_6px_16px_-6px_var(--ring)] dark:text-[#2a1520]"
                : slot.available
                  ? "border-line bg-surface text-ink-2 hover:border-primary/60 hover:text-primary"
                  : "cursor-not-allowed border-line/50 bg-bg-deep/50 text-muted line-through opacity-60",
            )}
          >
            {time12(slot.time)}
          </motion.button>
        );
      })}
    </div>
  );
}

export function StaffChooser({
  staff,
  loading,
  value,
  onChange,
}: {
  staff: Staff[] | undefined;
  loading: boolean;
  value: string;
  onChange: (id: string) => void;
}) {
  if (loading) return <Skeleton className="h-16" />;
  if (!staff?.length)
    return <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">No stylist can do these services on this day (or the parlour is closed).</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {staff.map((member) => {
        const selected = member.id === value;
        return (
          <button
            key={member.id}
            type="button"
            onClick={() => onChange(member.id)}
            className={cn(
              "relative flex cursor-pointer items-center gap-2 rounded-2xl border py-1.5 pr-3 pl-1.5 text-sm transition-colors",
              selected ? "border-primary text-primary-dark" : "border-line text-ink-2 hover:border-line-strong",
            )}
          >
            {selected && (
              <motion.span layoutId="staff-pick" className="absolute inset-0 rounded-2xl bg-primary-soft" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
            )}
            <span className="relative">
              <Avatar name={member.name} src={member.avatar} size={28} />
            </span>
            <span className="relative font-medium">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}

const STEPS = ["Customer", "Services", "Time", "Confirm"];

export function BookingWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(todayISO());
  const [staffId, setStaffId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [offerCode, setOfferCode] = useState<string | null>(null);
  const [quote, setQuote] = useState<OfferQuote | null>(null);

  const customers = useCustomers();
  const services = useServices();
  const categories = useCategories();
  const staff = useAvailableStaff(step >= 2 ? date : "", serviceIds);

  const reset = () => {
    setStep(0);
    setCustomerId("");
    setCustomerQuery("");
    setServiceIds([]);
    setDate(todayISO());
    setStaffId("");
    setStartTime("");
    setNotes("");
    setMethod("");
  };

  // Choosing different services, day or stylist invalidates the picks that depend on them.
  const changeDate = (value: string) => {
    setDate(value);
    setStaffId("");
    setStartTime("");
  };
  const changeStaff = (value: string) => {
    setStaffId(value);
    setStartTime("");
  };
  const toggleService = (id: string) => {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    setStaffId("");
    setStartTime("");
  };
  // Reset the wizard if its page is hidden while open.
  useLayoutEffect(() => () => reset(), []);

  const create = useAction(
    () =>
      api.post<Appointment>("/appointments", {
        customerId,
        serviceIds,
        staffId,
        date,
        startTime,
        notes,
        preferredPaymentMethod: method || null,
        offerCode,
      }),
    {
      invalidate: ["appointments", "customers", "notifications", "availability"],
      success: "Appointment booked",
      onSuccess: () => {
        reset();
        onClose();
      },
    },
  );

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    return (customers.data ?? [])
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 40);
  }, [customers.data, customerQuery]);

  const selected = (services.data ?? []).filter((s) => serviceIds.includes(s.id));
  const total = selected.reduce((s, x) => s + x.price, 0);
  const duration = selected.reduce((s, x) => s + x.duration, 0);
  const customer = customers.data?.find((c) => c.id === customerId);
  const member = staff.data?.find((s) => s.id === staffId);

  const canNext = [!!customerId, serviceIds.length > 0, !!staffId && !!startTime, true][step];
  const go = (delta: number) => {
    setDirection(delta);
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New appointment"
      description="Admin bookings are confirmed straight away."
      className="sm:max-w-2xl"
      footer={
        <>
          {step > 0 && (
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => go(-1)} className="mr-auto">
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => go(1)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button loading={create.isPending} icon={<Check className="h-4 w-4" />} onClick={() => create.mutate()}>
              Book appointment
            </Button>
          )}
        </>
      }
    >
      {/* Step indicator */}
      <div className="mb-4 flex items-center gap-2">
        {STEPS.map((name, i) => (
          <div key={name} className="flex flex-1 items-center gap-2">
            <motion.span
              animate={{
                scale: i === step ? 1.1 : 1,
                backgroundColor: i <= step ? "var(--primary)" : "var(--border)",
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </motion.span>
            <span className={cn("hidden text-xs font-medium sm:block", i === step ? "text-ink" : "text-muted")}>{name}</span>
            {i < STEPS.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden rounded bg-line">
                <motion.span className="absolute inset-y-0 left-0 bg-primary" animate={{ width: i < step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="relative min-h-[320px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            {step === 0 && (
              <div className="flex flex-col gap-3">
                <SearchInput value={customerQuery} onChange={setCustomerQuery} placeholder="Search name, phone or email" />
                {customers.isLoading ? (
                  <Skeleton className="h-40" />
                ) : filteredCustomers.length === 0 ? (
                  <EmptyState icon={<Clock className="h-7 w-7" />} title="No customers found" message="Add the customer on the Customers page first." />
                ) : (
                  <ul className="grid max-h-[300px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {filteredCustomers.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setCustomerId(c.id)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition-all",
                            customerId === c.id ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong hover:bg-surface-alt",
                          )}
                        >
                          <Avatar name={c.name} src={c.avatar} size={34} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                            <span className="block truncate text-xs text-muted">{c.phone}</span>
                          </span>
                          {customerId === c.id && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full bg-primary p-1 text-white">
                              <Check className="h-3 w-3" />
                            </motion.span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="max-h-[300px] overflow-y-auto pr-1">
                  {(categories.data ?? [])
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((category) => {
                      const list = (services.data ?? []).filter((s) => s.categoryId === category.id && s.isActive);
                      if (!list.length) return null;
                      return (
                        <div key={category.id} className="mb-4">
                          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                            <span className="h-2 w-2 rounded-full" style={{ background: category.color }} />
                            {category.name}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {list.map((service) => {
                              const on = serviceIds.includes(service.id);
                              return (
                                <motion.button
                                  key={service.id}
                                  type="button"
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => toggleService(service.id)}
                                  className={cn(
                                    "flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors",
                                    on ? "border-primary bg-primary-soft" : "border-line hover:border-line-strong",
                                  )}
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-ink">{service.name}</span>
                                    <span className="text-xs text-muted">{minutesLabel(service.duration)}</span>
                                  </span>
                                  <span className="text-sm font-semibold text-primary-dark">{money(service.price)}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <motion.div layout className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary-soft to-plum-soft px-4 py-3">
                  <span className="text-sm text-ink-2">
                    {serviceIds.length} selected · {minutesLabel(duration)}
                  </span>
                  <motion.span key={total} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-display text-lg font-semibold text-primary-dark">
                    {money(total)}
                  </motion.span>
                </motion.div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <Field label="Date">
                  <Input type="date" min={todayISO()} value={date} onChange={(e) => changeDate(e.target.value)} />
                </Field>
                <Field label="Stylist">
                  <StaffChooser staff={staff.data} loading={staff.isLoading} value={staffId} onChange={changeStaff} />
                </Field>
                <Field label="Start time">
                  <SlotPicker date={date} staffId={staffId} serviceIds={serviceIds} value={startTime} onChange={setStartTime} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Notes (optional)">
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[64px]" />
                  </Field>
                  <Field label="Plans to pay with">
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMethod(method === m ? "" : m)}
                          className={cn(
                            "cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors",
                            method === m ? "border-primary bg-primary-soft text-primary-dark" : "border-line text-ink-2 hover:border-line-strong",
                          )}
                        >
                          {label(m)}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="overflow-hidden rounded-2xl border border-line">
                <div className="flex items-center gap-3 bg-gradient-to-r from-primary-soft to-plum-soft p-4">
                  <Avatar name={customer?.name ?? "?"} src={customer?.avatar} size={44} />
                  <div>
                    <p className="font-display text-lg font-semibold text-ink">{customer?.name}</p>
                    <p className="text-xs text-ink-2">{customer?.phone}</p>
                  </div>
                </div>
                <dl className="divide-y divide-line text-sm">
                  {[
                    ["When", `${formatDate(date, "EEEE, d MMM yyyy")} · ${time12(startTime)}`],
                    ["Stylist", member?.name ?? "—"],
                    ["Duration", minutesLabel(duration)],
                    ["Payment", method ? label(method) : "Not specified"],
                    ...(notes ? [["Notes", notes]] : []),
                  ].map(([k, v], i) => (
                    <motion.div key={k} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex justify-between gap-4 px-4 py-2.5">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-medium text-ink">{v}</dd>
                    </motion.div>
                  ))}
                  <div className="px-4 py-3">
                    {selected.map((s) => (
                      <div key={s.id} className="flex justify-between py-0.5 text-ink-2">
                        <span>{s.name}</span>
                        <span>{money(s.price)}</span>
                      </div>
                    ))}
                    {quote?.offer && quote.discount > 0 && (
                      <div className="flex justify-between py-0.5 font-medium text-success">
                        <span className="truncate">Offer · {quote.offer.title}</span>
                        <span className="shrink-0">−{money(quote.discount)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between border-t border-dashed border-line pt-2 font-semibold text-ink">
                      <span>Total</span>
                      <span className="font-display text-lg text-primary-dark">{money(total - (quote?.discount ?? 0))}</span>
                    </div>
                  </div>
                </dl>
                <PromoCode
                  className="mt-4"
                  serviceIds={serviceIds}
                  date={date}
                  onChange={(code, q) => {
                    setOfferCode(code);
                    setQuote(q);
                  }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
}
