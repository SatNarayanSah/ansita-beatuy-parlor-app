"use client";

import { PaymentRequestsFor } from "@/components/payments/payment-requests";
import { AnimatePresence, motion } from "motion/react";
import { BadgePercent, CalendarClock, CheckCircle2, CircleSlash, Crown, Trash2, Undo2, Wallet, XCircle, Check } from "lucide-react";
import { useState } from "react";
import {
  Avatar,
  Button,
  ConfirmDialog,
  Drawer,
  Field,
  Input,
  Modal,
  PaymentDialog,
  PaymentProgress,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/api";
import { balanceDue, billTotal, formatDate, label, money, NEXT_STATUSES, time12, todayISO } from "@/lib/format";
import { useAction, useLookups, useSettings } from "@/lib/queries";
import type { Appointment, AppointmentStatus, LoyaltyRules, PaymentMethod } from "@/lib/types";
import { SlotPicker, StaffChooser, useAvailableStaff } from "./_booking";

const STATUS_ACTION: Record<string, { label: string; icon: React.ReactNode; variant: "primary" | "outline" | "danger" | "secondary" }> = {
  confirmed: { label: "Confirm", icon: <Check className="h-4 w-4" />, variant: "primary" },
  completed: { label: "Mark completed", icon: <CheckCircle2 className="h-4 w-4" />, variant: "primary" },
  no_show: { label: "No-show", icon: <CircleSlash className="h-4 w-4" />, variant: "outline" },
  cancelled: { label: "Cancel", icon: <XCircle className="h-4 w-4" />, variant: "outline" },
};

const INVALIDATE = ["appointments", "customers", "notifications", "availability"];

function RescheduleModal({ appointment, open, onClose }: { appointment: Appointment; open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(appointment.date);
  const [staffId, setStaffId] = useState(appointment.staffId);
  const [startTime, setStartTime] = useState("");
  const staff = useAvailableStaff(date, appointment.serviceIds);
  const save = useAction(
    () => api.patch<Appointment>(`/appointments/${appointment.id}`, { date, staffId, startTime }),
    { invalidate: INVALIDATE, success: "Appointment rescheduled", onSuccess: onClose },
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reschedule"
      description={`Currently ${formatDate(appointment.date, "EEE d MMM")} at ${time12(appointment.startTime)}`}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!staffId || !startTime} loading={save.isPending} onClick={() => save.mutate()}>
            Save new time
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Date">
          <Input
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setStartTime("");
            }}
          />
        </Field>
        <Field label="Stylist">
          <StaffChooser
            staff={staff.data}
            loading={staff.isLoading}
            value={staffId}
            onChange={(id) => {
              setStaffId(id);
              setStartTime("");
            }}
          />
        </Field>
        <Field label="Start time">
          <SlotPicker
            date={date}
            staffId={staff.data?.some((s) => s.id === staffId) ? staffId : ""}
            serviceIds={appointment.serviceIds}
            excludeAppointmentId={appointment.id}
            value={startTime}
            onChange={setStartTime}
          />
        </Field>
      </div>
    </Modal>
  );
}

/** Rupees off for `points`, rounded down like the server. */
const pointsWorth = (loyalty: LoyaltyRules, points: number) => Math.floor(points * loyalty.pointValue);

/** Most points usable on a bill: what the customer has, but no more than covers the balance due. */
const maxRedeemable = (loyalty: LoyaltyRules, balance: number, due: number) =>
  loyalty.pointValue > 0 ? Math.min(balance, Math.floor(due / loyalty.pointValue)) : 0;

/** How many loyalty points to put on this bill; prefilled with as many as fit the balance due. */
function RedeemPointsModal({
  open,
  onClose,
  customerName,
  balance,
  due,
  loyalty,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  customerName: string;
  balance: number;
  due: number;
  loyalty: LoyaltyRules;
  loading?: boolean;
  onSubmit: (points: number) => void;
}) {
  const max = maxRedeemable(loyalty, balance, due);
  const [text, setText] = useState("");
  const points = Number(text || max);
  const invalid = !Number.isInteger(points) || points < 1 || points > max;
  const discount = invalid ? 0 : pointsWorth(loyalty, points);
  const close = () => {
    setText("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Use loyalty points"
      description={`${customerName} has ${balance.toLocaleString("en-IN")} points · each is worth ${money(loyalty.pointValue)}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="gold" icon={<Crown className="h-4 w-4" />} loading={loading} disabled={invalid} onClick={() => onSubmit(points)}>
            Take {money(discount)} off
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Points to use"
          error={points > max ? `At most ${max.toLocaleString("en-IN")} points on this bill` : undefined}
          hint={invalid ? undefined : `${money(due - discount)} left to pay · ${(balance - points).toLocaleString("en-IN")} points left`}
        >
          <Input type="number" min={1} max={max} placeholder={String(max)} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        </Field>
        <p className="text-xs text-muted">Balance due: {money(due)}. The part paid with points earns no new points.</p>
      </div>
    </Modal>
  );
}

export function AppointmentDrawer({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const lookups = useLookups();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [offerCodeOpen, setOfferCodeOpen] = useState(false);
  const [offerCodeText, setOfferCodeText] = useState("");
  const [removingOffer, setRemovingOffer] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [unredeeming, setUnredeeming] = useState(false);
  const loyalty = useSettings().data?.loyalty;

  const setStatus = useAction(
    (vars: { status: AppointmentStatus; reason?: string }) => api.post<Appointment>(`/appointments/${appointment?.id}/status`, vars),
    {
      invalidate: INVALIDATE,
      success: (_, vars) => `Marked ${label(vars.status).toLowerCase()}`,
      onSuccess: () => {
        setCancelling(false);
        setReason("");
      },
    },
  );
  const pay = useAction(
    (vars: { amount: number; method: PaymentMethod }) => api.post<Appointment>(`/appointments/${appointment?.id}/payments`, vars),
    { invalidate: INVALIDATE, success: (_, v) => `${money(v.amount)} recorded`, onSuccess: () => setPaying(false) },
  );
  const redeem = useAction((points: number) => api.post<Appointment>(`/appointments/${appointment?.id}/redeem-points`, { points }), {
    invalidate: INVALIDATE,
    success: (result, points) => `${points} points used: ${money(result.pointsDiscount)} off`,
    onSuccess: () => setRedeeming(false),
  });
  const unredeem = useAction(() => api.del(`/appointments/${appointment?.id}/redeem-points`), {
    invalidate: INVALIDATE,
    success: "Points returned to the customer",
    onSuccess: () => setUnredeeming(false),
  });
  const applyCode = useAction((code: string) => api.post<Appointment>(`/appointments/${appointment?.id}/offer`, { code }), {
    invalidate: INVALIDATE,
    success: (result) => (result.offerDiscount ? `${result.offerTitle}: ${money(result.offerDiscount)} off` : "Code applied"),
    onSuccess: () => {
      setOfferCodeOpen(false);
      setOfferCodeText("");
    },
  });
  const removeOfferAction = useAction(() => api.del<Appointment>(`/appointments/${appointment?.id}/offer`), {
    invalidate: INVALIDATE,
    success: "Offer removed from the bill",
    onSuccess: () => setRemovingOffer(false),
  });
  const remove = useAction(() => api.del(`/appointments/${appointment?.id}`), {
    invalidate: INVALIDATE,
    success: "Appointment deleted",
    onSuccess: () => {
      setDeleting(false);
      onClose();
    },
  });

  const a = appointment;
  const customer = a ? lookups.customer.get(a.customerId) : undefined;
  const member = a ? lookups.staff.get(a.staffId) : undefined;
  const due = a ? balanceDue(a) : 0;
  const canPay = a && due > 0 && a.status !== "cancelled" && a.status !== "no_show";
  const points = customer?.loyaltyPoints ?? 0;
  // Points go on a bill with money still due, once the customer has the minimum.
  const canOfferPoints = !!a && !!loyalty?.enabled && (a.status === "confirmed" || a.status === "completed") && !a.pointsRedeemed && due > 0;
  const canRedeem = canOfferPoints && !!loyalty && points >= loyalty.minRedeemPoints && maxRedeemable(loyalty, points, due) > 0;
  const canReschedule = a && (a.status === "pending" || a.status === "confirmed");

  return (
    <>
      <Drawer
        open={!!a}
        onClose={onClose}
        title={customer?.name ?? "Appointment"}
        description={
          a && (
            <span className="flex flex-wrap items-center gap-2">
              {formatDate(a.date, "EEEE, d MMM yyyy")} · {time12(a.startTime)}–{time12(a.endTime)}
              <StatusBadge status={a.status} />
            </span>
          )
        }
        footer={
          a && (
            <>
              <Button variant="ghost" className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleting(true)}>
                Delete
              </Button>
              {canReschedule && (
                <Button variant="outline" icon={<CalendarClock className="h-4 w-4" />} onClick={() => setRescheduling(true)}>
                  Reschedule
                </Button>
              )}
              {canPay && (
                <Button variant="gold" icon={<Wallet className="h-4 w-4" />} onClick={() => setPaying(true)}>
                  Record payment
                </Button>
              )}
            </>
          )
        }
      >
        {a && (
          <div className="flex flex-col gap-4">
            {/* Status actions */}
            {NEXT_STATUSES[a.status].length > 0 && (
              <section>
                <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Update status</h3>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES[a.status].map((status) => {
                    const action = STATUS_ACTION[status];
                    return (
                      <Button
                        key={status}
                        size="sm"
                        variant={action.variant}
                        icon={action.icon}
                        loading={setStatus.isPending && setStatus.variables?.status === status}
                        onClick={() => (status === "cancelled" ? setCancelling((c) => !c) : setStatus.mutate({ status }))}
                      >
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {cancelling && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-danger/30 bg-danger-soft/60 p-3">
                        <Textarea placeholder="Reason (optional, shared with the customer)" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[60px]" />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setCancelling(false)}>
                            Keep it
                          </Button>
                          <Button size="sm" variant="danger" loading={setStatus.isPending} onClick={() => setStatus.mutate({ status: "cancelled", reason })}>
                            Cancel appointment
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* People */}
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <Avatar name={customer?.name ?? "?"} src={customer?.avatar} size={40} />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">Customer</p>
                  <p className="truncate text-sm font-semibold text-ink">{customer?.name ?? "Unknown"}</p>
                  <p className="truncate text-xs text-muted">{customer?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <Avatar name={member?.name ?? "?"} src={member?.avatar} size={40} />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">Stylist</p>
                  <p className="truncate text-sm font-semibold text-ink">{member?.name ?? "Unknown"}</p>
                  <p className="truncate text-xs text-muted">{label(member?.role)}</p>
                </div>
              </div>
            </section>

            {/* Services */}
            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Services</h3>
              <ul className="overflow-hidden rounded-2xl border border-line">
                {a.serviceIds.map((id, i) => {
                  const s = lookups.service.get(id);
                  return (
                    <motion.li key={id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex justify-between border-b border-line px-4 py-2.5 text-sm last:border-0">
                      <span className="text-ink">{s?.name ?? "Removed service"}</span>
                      <span className="text-muted">{s ? money(s.price) : ""}</span>
                    </motion.li>
                  );
                })}
                <li className="flex justify-between bg-surface-alt px-4 py-2.5 text-sm font-semibold">
                  <span className="text-ink">Total at booking</span>
                  <span className="text-primary-dark">{billTotal(a) < a.totalPrice && <span className="mr-1.5 text-xs font-normal text-muted line-through">{money(a.totalPrice)}</span>}{money(billTotal(a))}</span>
                </li>
              </ul>
            </section>

            {/* Payments */}
            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Payment</h3>
              <div className="rounded-2xl border border-line p-4">
                <div className="mb-3 flex items-center justify-between">
                  <StatusBadge status={a.paymentStatus} />
                  {a.preferredPaymentMethod && <span className="text-xs text-muted">Prefers {label(a.preferredPaymentMethod)}</span>}
                </div>
                <PaymentProgress paid={a.amountPaid} total={billTotal(a)} />
                {a.offerDiscount > 0 ? (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-success-soft/70 px-3 py-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 text-success">
                      <BadgePercent className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {a.offerTitle}
                        {a.offerCode ? ` · ${a.offerCode}` : " · automatic"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-success">−{money(a.offerDiscount)}</span>
                      {a.status !== "cancelled" && a.status !== "no_show" && (
                        <button
                          type="button"
                          onClick={() => setRemovingOffer(true)}
                          className="flex cursor-pointer items-center gap-1 text-muted transition hover:text-danger"
                        >
                          <Undo2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </span>
                  </div>
                ) : (
                  a.status !== "cancelled" &&
                  a.status !== "no_show" &&
                  due > 0 && (
                    <button
                      type="button"
                      onClick={() => setOfferCodeOpen(true)}
                      className="mt-3 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary-dark"
                    >
                      <BadgePercent className="h-3.5 w-3.5" /> Apply a promo code
                    </button>
                  )
                )}
                {a.pointsRedeemed > 0 && (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-gold-soft/60 px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-gold-text">
                      <Crown className="h-3.5 w-3.5" /> {a.pointsRedeemed.toLocaleString("en-IN")} loyalty points used
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-success">−{money(a.pointsDiscount)}</span>
                      {a.status !== "cancelled" && a.status !== "no_show" && (
                        <button
                          type="button"
                          onClick={() => setUnredeeming(true)}
                          className="flex cursor-pointer items-center gap-1 text-muted transition hover:text-danger"
                        >
                          <Undo2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </span>
                  </div>
                )}
                {canRedeem && loyalty && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/40 bg-gold-soft/40 px-3 py-2.5">
                    <p className="text-xs text-ink-2">
                      <Crown className="mr-1 inline h-3.5 w-3.5 text-gold-text" />
                      {customer?.name.split(" ")[0]} has <b>{points.toLocaleString("en-IN")} points</b>, worth up to{" "}
                      <b>{money(Math.min(due, pointsWorth(loyalty, points)))}</b> off.
                    </p>
                    <Button size="sm" variant="gold" icon={<Crown className="h-3.5 w-3.5" />} onClick={() => setRedeeming(true)}>
                      Use points
                    </Button>
                  </div>
                )}
                {canOfferPoints && !canRedeem && loyalty && points > 0 && points < loyalty.minRedeemPoints && (
                  <p className="mt-3 text-xs text-muted">
                    {points.toLocaleString("en-IN")} points · they can be used from {loyalty.minRedeemPoints.toLocaleString("en-IN")} points
                  </p>
                )}
                {a.payments?.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-line pt-3">
                    {a.payments.map((p) => (
                      <li key={p.id} className="flex justify-between text-xs">
                        <span className="text-ink-2">
                          {formatDate(p.paidOn)} · {label(p.method)}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </span>
                        <span className="font-semibold text-success">+{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <PaymentRequestsFor targetType="appointment" targetId={a.id} />

            {(a.notes || a.cancellationReason) && (
              <section className="flex flex-col gap-3">
                {a.notes && (
                  <div className="rounded-2xl bg-gold-soft/60 p-4 text-sm text-ink-2">
                    <p className="mb-1 text-[11px] font-semibold tracking-wider text-gold-text uppercase">Notes</p>
                    {a.notes}
                  </div>
                )}
                {a.cancellationReason && (
                  <div className="rounded-2xl bg-danger-soft p-4 text-sm text-danger">
                    <p className="mb-1 text-[11px] font-semibold tracking-wider uppercase">Cancellation reason</p>
                    {a.cancellationReason}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </Drawer>

      {a && (
        <>
          <PaymentDialog open={paying} onClose={() => setPaying(false)} due={due} loading={pay.isPending} onSubmit={(amount, method) => pay.mutate({ amount, method })} />
          <ConfirmDialog
            open={deleting}
            onClose={() => setDeleting(false)}
            onConfirm={() => remove.mutate()}
            loading={remove.isPending}
            title="Delete appointment?"
            message="This removes the booking and its payment history permanently. To keep a record, cancel it instead."
          />
          {loyalty && (
            <RedeemPointsModal
              key={`${a.id}-${redeeming}`}
              open={redeeming}
              onClose={() => setRedeeming(false)}
              customerName={customer?.name.split(" ")[0] ?? "The customer"}
              balance={points}
              due={due}
              loyalty={loyalty}
              loading={redeem.isPending}
              onSubmit={(value) => redeem.mutate(value)}
            />
          )}
          <ConfirmDialog
            open={unredeeming}
            onClose={() => setUnredeeming(false)}
            onConfirm={() => unredeem.mutate()}
            loading={unredeem.isPending}
            title="Remove the points discount?"
            message={`${a.pointsRedeemed} points go back to the customer and ${money(a.pointsDiscount)} is added back to the bill.`}
            confirmLabel="Remove discount"
          />
          {rescheduling && <RescheduleModal key={a.id} appointment={a} open={rescheduling} onClose={() => setRescheduling(false)} />}
          <Modal
            open={offerCodeOpen}
            onClose={() => setOfferCodeOpen(false)}
            title="Apply a promo code"
            description="The offer is checked against these services and the visit date."
            footer={
              <>
                <Button variant="ghost" onClick={() => setOfferCodeOpen(false)}>
                  Cancel
                </Button>
                <Button loading={applyCode.isPending} disabled={!offerCodeText.trim()} onClick={() => applyCode.mutate(offerCodeText.trim())}>
                  Apply code
                </Button>
              </>
            }
          >
            <Field label="Promo code">
              <Input
                value={offerCodeText}
                onChange={(e) => setOfferCodeText(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && offerCodeText.trim() && applyCode.mutate(offerCodeText.trim())}
                className="font-mono tracking-widest uppercase"
                maxLength={40}
                autoFocus
              />
            </Field>
          </Modal>
          <ConfirmDialog
            open={removingOffer}
            onClose={() => setRemovingOffer(false)}
            onConfirm={() => removeOfferAction.mutate()}
            loading={removeOfferAction.isPending}
            title="Remove the offer?"
            message={`${money(a.offerDiscount)} (${a.offerTitle ?? "offer"}) is added back to the bill.`}
            confirmLabel="Remove offer"
          />
        </>
      )}
    </>
  );
}
