"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, CheckCircle2, CircleSlash, Trash2, Wallet, XCircle, Check } from "lucide-react";
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
import { formatDate, label, money, NEXT_STATUSES, time12, todayISO } from "@/lib/format";
import { useAction, useLookups } from "@/lib/queries";
import type { Appointment, AppointmentStatus, PaymentMethod } from "@/lib/types";
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

export function AppointmentDrawer({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const lookups = useLookups();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

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
  const due = a ? a.totalPrice - a.amountPaid : 0;
  const canPay = a && due > 0 && a.status !== "cancelled" && a.status !== "no_show";
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
          <div className="flex flex-col gap-6">
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
                  <span className="text-primary-dark">{money(a.totalPrice)}</span>
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
                <PaymentProgress paid={a.amountPaid} total={a.totalPrice} />
                {a.payments?.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-line pt-3">
                    {a.payments.map((p) => (
                      <li key={p.id} className="flex justify-between text-xs">
                        <span className="text-ink-2">
                          {formatDate(p.paidOn)} · {label(p.method)}
                        </span>
                        <span className="font-semibold text-success">+{money(p.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

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
          {rescheduling && <RescheduleModal key={a.id} appointment={a} open={rescheduling} onClose={() => setRescheduling(false)} />}
        </>
      )}
    </>
  );
}
