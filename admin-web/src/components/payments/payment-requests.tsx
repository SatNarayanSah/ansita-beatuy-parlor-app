"use client";

/**
 * "I've paid" requests.
 *
 * Customer: <PayOnline> on a booking or course shows where to pay (eSewa/Khalti/Fonepay/bank,
 * with QR), sends the transaction details, and lists their requests (pending → withdraw,
 * rejected → reason). Admin: <PaymentRequestsFor> on a booking/enrollment and the
 * /admin/payments queue use <RequestCard> with Approve / Reject.
 * Nothing changes on a bill until an admin approves (the server records the payment then).
 */

import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCircle2, Clock, Copy, ExternalLink, Hourglass, Landmark, QrCode, Send, Smartphone, Undo2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, ConfirmDialog, Field, ImageUpload, Input, Modal, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, label, money, ONLINE_METHODS, timeAgo, todayISO } from "@/lib/format";
import { PAYMENT_KEYS, useAction, usePaymentRequests, useSettings } from "@/lib/queries";
import type { OnlineMethod, PaymentAccount, PaymentRequest, PaymentRequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS: Record<PaymentRequestStatus, { text: string; tone: "amber" | "green" | "red" | "gray" }> = {
  pending: { text: "Waiting for confirmation", tone: "amber" },
  approved: { text: "Confirmed", tone: "green" },
  rejected: { text: "Not confirmed", tone: "red" },
  cancelled: { text: "Withdrawn", tone: "gray" },
};

const METHOD_ICON: Record<OnlineMethod, React.ReactNode> = {
  esewa: <Smartphone className="h-4 w-4" />,
  khalti: <Smartphone className="h-4 w-4" />,
  fonepay: <QrCode className="h-4 w-4" />,
  bank: <Landmark className="h-4 w-4" />,
};

type Target = { type: "appointment" | "enrollment"; id: string; due: number; payable: boolean };

// ---------- Customer ----------

/** Customer view on a booking/course: their requests, and the "I've paid" button when allowed. */
export function PayOnline({ target }: { target: Target }) {
  const settings = useSettings();
  const requests = usePaymentRequests({ targetType: target.type, targetId: target.id });
  const [open, setOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState<PaymentRequest | null>(null);
  const withdraw = useAction((id: string) => api.post(`/payment-requests/${id}/cancel`), {
    invalidate: PAYMENT_KEYS,
    success: "Request withdrawn",
    onSuccess: () => setWithdrawing(null),
  });

  const payments = settings.data?.payments;
  // Until the parlour sets up any account, every method is offered (same rule as the server).
  const enabled = payments?.requests ? ONLINE_METHODS.filter((m) => payments[m].enabled) : [];
  const methods = payments?.requests && enabled.length === 0 ? [...ONLINE_METHODS] : enabled;
  const list = requests.data ?? [];
  const pendingTotal = list.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);
  const room = target.due - pendingTotal;
  const canSend = target.payable && room > 0 && methods.length > 0;
  // Old withdrawn requests are noise for the customer; show the rest.
  const shown = list.filter((r) => r.status !== "cancelled");

  if (!shown.length && !canSend) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {shown.map((r) => (
          <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <RequestCard request={r} compact onWithdraw={r.status === "pending" ? () => setWithdrawing(r) : undefined} />
          </motion.div>
        ))}
      </AnimatePresence>
      {canSend && (
        <Button variant="secondary" className="w-full" icon={<Send className="h-4 w-4" />} onClick={() => setOpen(true)}>
          I&apos;ve paid online
        </Button>
      )}
      {target.payable && room > 0 && pendingTotal > 0 && (
        <p className="text-xs text-muted">{money(pendingTotal)} is waiting for the parlour to confirm.</p>
      )}
      {open && payments && (
        <PaidDialog target={target} room={room} methods={methods} accounts={payments} onClose={() => setOpen(false)} />
      )}
      <ConfirmDialog
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        onConfirm={() => withdrawing && withdraw.mutate(withdrawing.id)}
        loading={withdraw.isPending}
        title="Withdraw this payment request?"
        confirmLabel="Withdraw"
        message="Only do this if you sent it by mistake. The parlour won't check it."
      />
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select the number instead.");
        }
      }}
      className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-primary/50 hover:text-primary"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Where to send the money for one method. */
export function AccountDetails({ method, account }: { method: OnlineMethod; account: PaymentAccount }) {
  return (
    <motion.div
      key={method}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-alt/60 p-4 sm:flex-row sm:items-start"
    >
      {account.qr && (
        <a href={account.qr} target="_blank" rel="noreferrer" className="mx-auto shrink-0 sm:mx-0" title="Open the QR code">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded image on the API host */}
          <img src={account.qr} alt={`${label(method)} QR code`} className="h-36 w-36 rounded-xl border border-line bg-white object-contain p-1.5" />
        </a>
      )}
      <dl className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        {account.bankName && method === "bank" && (
          <div>
            <dt className="text-[10px] font-semibold tracking-wider text-muted uppercase">Bank</dt>
            <dd className="text-ink">{account.bankName}</dd>
          </div>
        )}
        {account.accountName && (
          <div>
            <dt className="text-[10px] font-semibold tracking-wider text-muted uppercase">Account name</dt>
            <dd className="text-ink">{account.accountName}</dd>
          </div>
        )}
        {account.accountNumber && (
          <div>
            <dt className="text-[10px] font-semibold tracking-wider text-muted uppercase">
              {method === "bank" ? "Account number" : `${label(method)} ID / number`}
            </dt>
            <dd className="flex items-center gap-2">
              <span className="min-w-0 font-mono text-base font-semibold tracking-wide break-all text-ink">{account.accountNumber}</span>
              <CopyButton value={account.accountNumber} />
            </dd>
          </div>
        )}
        {account.instructions && <p className="text-xs text-ink-2">{account.instructions}</p>}
        {!account.qr && !account.accountNumber && !account.instructions && (
          <p className="text-xs text-ink-2">
            The parlour hasn&apos;t added its {label(method)} details here yet. If you paid to the number they gave you, send the details below.
          </p>
        )}
      </dl>
    </motion.div>
  );
}

function PaidDialog({
  target,
  room,
  methods,
  accounts,
  onClose,
}: {
  target: Target;
  room: number;
  methods: OnlineMethod[];
  accounts: Record<OnlineMethod, PaymentAccount>;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<OnlineMethod>(methods[0]);
  const [amount, setAmount] = useState(String(room));
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [proof, setProof] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const value = Number(amount);
  const amountError = amount && !(value > 0) ? "Enter the amount you paid" : value > room ? `At most ${money(room)}` : undefined;
  const refError = reference && reference.trim().length < 4 ? "At least 4 characters" : undefined;
  const valid = value > 0 && value <= room && reference.trim().length >= 4 && !!paidOn && paidOn <= todayISO();

  const send = useAction(
    () =>
      api.post("/payment-requests", {
        targetType: target.type,
        targetId: target.id,
        amount: value,
        method,
        reference: reference.trim(),
        paidOn,
        note: note.trim(),
        proof: proof || null,
      }),
    { invalidate: PAYMENT_KEYS, success: "Sent! The parlour will confirm your payment soon.", onSuccess: onClose },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="I've paid online"
      description={`Pay the parlour first, then send the details so they can confirm it. Left to pay: ${money(room)}.`}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={send.isPending} disabled={!valid || uploading} icon={<Send className="h-4 w-4" />} onClick={() => send.mutate()}>
            Send for confirmation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">1 · How did you pay?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "relative flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                  method === m ? "border-primary text-primary-dark" : "border-line text-ink-2 hover:border-line-strong",
                )}
              >
                {method === m && (
                  <motion.span layoutId="paid-method" className="absolute inset-0 rounded-xl bg-primary-soft" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                )}
                <span className="relative">{METHOD_ICON[m]}</span>
                <span className="relative">{label(m)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">2 · Pay to</p>
          <AnimatePresence mode="wait">
            <AccountDetails key={method} method={method} account={accounts[method]} />
          </AnimatePresence>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-ink-2">3 · Payment details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount paid (NPR)" error={amountError}>
              <Input type="number" min={1} max={room} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Date paid">
              <Input type="date" max={todayISO()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
            <Field label="Transaction ID" hint="From your payment app's receipt or bank slip." error={refError} className="sm:col-span-2">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={method === "bank" ? "e.g. FT2611030042" : "e.g. 0ABC12X"}
                className="font-mono tracking-wider uppercase"
                maxLength={64}
                autoComplete="off"
              />
            </Field>
            <ImageUpload
              label="Screenshot of the payment (optional)"
              hint="Helps the parlour confirm it faster."
              value={proof}
              onChange={setProof}
              onUploadingChange={setUploading}
              className="sm:col-span-2"
            />
            <Field label="Note (optional)" className="sm:col-span-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-[64px]" placeholder="Anything the parlour should know" />
            </Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Shared card ----------

/** One request. Admin mode shows the customer and what it's for, plus Approve/Reject. */
export function RequestCard({
  request: r,
  compact,
  admin,
  onWithdraw,
  onReview,
  onOpenTarget,
}: {
  request: PaymentRequest;
  /** Customer view: no customer name/target line. */
  compact?: boolean;
  admin?: boolean;
  onWithdraw?: () => void;
  onReview?: (r: PaymentRequest, action: "approve" | "reject") => void;
  onOpenTarget?: (r: PaymentRequest) => void;
}) {
  const status = STATUS[r.status];
  const Icon = r.status === "pending" ? Hourglass : r.status === "approved" ? CheckCircle2 : r.status === "rejected" ? XCircle : Undo2;
  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 text-sm",
        r.status === "pending" ? "border-warning/40 bg-warning-soft/50" : r.status === "rejected" ? "border-danger/30 bg-danger-soft/40" : "border-line bg-surface",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            r.status === "pending" ? "bg-warning-soft text-warning" : r.status === "approved" ? "bg-success-soft text-success" : r.status === "rejected" ? "bg-danger-soft text-danger" : "bg-neutral-soft text-neutral",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-ink">{money(r.amount)}</span>
            <span className="text-xs text-ink-2">via {label(r.method)}</span>
            <Badge tone={status.tone} dot pulse={r.status === "pending"} className="ml-auto">
              {status.text}
            </Badge>
          </div>
          {!compact && (
            <p className="mt-1 truncate text-xs text-ink-2">
              <span className="font-medium text-ink">{r.customerName}</span>
              {r.customerPhone ? ` · ${r.customerPhone}` : ""} · {r.targetLabel}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            ID <span className="font-mono font-semibold tracking-wide text-ink-2">{r.reference}</span> · paid {formatDate(r.paidOn)} · sent {timeAgo(r.createdAt)}
          </p>
          {r.note && <p className="mt-1.5 text-xs text-ink-2">“{r.note}”</p>}
          {r.status === "approved" && r.approvedAmount !== null && r.approvedAmount !== r.amount && (
            <p className="mt-1.5 text-xs text-success">Confirmed {money(r.approvedAmount)}.</p>
          )}
          {r.status === "rejected" && r.reviewNote && <p className="mt-1.5 text-xs font-medium text-danger">Reason: {r.reviewNote}</p>}
          {r.status === "approved" && r.reviewNote && <p className="mt-1.5 text-xs text-ink-2">Note: {r.reviewNote}</p>}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {r.proof && (
              <a
                href={r.proof}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-lg border border-line bg-surface px-1.5 py-1 text-xs text-ink-2 hover:border-primary/50 hover:text-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded image on the API host */}
                <img src={r.proof} alt="" className="h-8 w-8 rounded-md object-cover" />
                Screenshot <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {admin && onOpenTarget && (
              <Button size="sm" variant="ghost" onClick={() => onOpenTarget(r)}>
                Open {r.targetType === "appointment" ? "booking" : "enrollment"}
              </Button>
            )}
            {admin && r.status === "pending" && onReview && (
              <span className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => onReview(r, "reject")}>
                  Reject
                </Button>
                <Button size="sm" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onReview(r, "approve")}>
                  Approve
                </Button>
              </span>
            )}
            {onWithdraw && (
              <Button size="sm" variant="ghost" className="ml-auto" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={onWithdraw}>
                Withdraw
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Admin ----------

/** Approve (optionally a different amount) or reject (reason required). */
export function ReviewDialog({ request, action, onClose }: { request: PaymentRequest; action: "approve" | "reject"; onClose: () => void }) {
  const max = Math.min(request.amount, request.balanceDue) || request.amount;
  const [amount, setAmount] = useState(String(max));
  const [text, setText] = useState("");
  const value = Number(amount);
  const approving = action === "approve";
  const reasons = ["Transaction not found", "Amount doesn't match", "Wrong account", "Duplicate of another payment"];

  const run = useAction(
    () =>
      approving
        ? api.post(`/payment-requests/${request.id}/approve`, { amount: value, note: text.trim() })
        : api.post(`/payment-requests/${request.id}/reject`, { reason: text.trim() }),
    { invalidate: PAYMENT_KEYS, success: approving ? `${money(value)} recorded` : "Request rejected", onSuccess: onClose },
  );
  const valid = approving ? value > 0 && value <= request.balanceDue : text.trim().length >= 3;

  return (
    <Modal
      open
      onClose={onClose}
      title={approving ? "Approve payment" : "Reject payment"}
      description={`${request.customerName} · ${request.targetLabel}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={approving ? "primary" : "danger"} loading={run.isPending} disabled={!valid} onClick={() => run.mutate()}>
            {approving ? `Record ${money(value || 0)}` : "Reject"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface-alt/60 p-3 text-xs sm:grid-cols-4">
          {[
            ["Reported", money(request.amount)],
            ["Method", label(request.method)],
            ["Transaction ID", request.reference],
            ["Paid on", formatDate(request.paidOn)],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">{k}</p>
              <p className="truncate font-medium text-ink">{v}</p>
            </div>
          ))}
        </div>
        {approving ? (
          <>
            <p className="text-sm text-ink-2">
              Check your {label(request.method)} statement for this transaction first. The payment is recorded on {formatDate(request.paidOn)}.
            </p>
            <Field
              label="Amount received (NPR)"
              hint={`Balance due now: ${money(request.balanceDue)}`}
              error={value > request.balanceDue ? `Only ${money(request.balanceDue)} is due now` : undefined}
            >
              <Input type="number" min={1} max={request.balanceDue} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </Field>
            <Field label="Note to the customer (optional)">
              <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
            </Field>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setText(r)}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors",
                    text === r ? "border-danger bg-danger-soft text-danger" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Field label="Reason (sent to the customer)">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoFocus />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Admin: the requests on one booking/enrollment, inside its detail drawer. */
export function PaymentRequestsFor({ targetType, targetId }: { targetType: "appointment" | "enrollment"; targetId: string }) {
  const requests = usePaymentRequests({ targetType, targetId });
  const [reviewing, setReviewing] = useState<{ request: PaymentRequest; action: "approve" | "reject" } | null>(null);
  const list = useMemo(() => (requests.data ?? []).filter((r) => r.status !== "cancelled"), [requests.data]);
  if (!list.length) return null;
  const pending = list.filter((r) => r.status === "pending").length;
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
        <Clock className="h-3.5 w-3.5" /> Customer payment requests
        {pending > 0 && <Badge tone="amber">{pending} to verify</Badge>}
      </h3>
      <div className="flex flex-col gap-2">
        {list.map((r) => (
          <RequestCard key={r.id} request={r} compact admin onReview={(request, action) => setReviewing({ request, action })} />
        ))}
      </div>
      {reviewing && <ReviewDialog request={reviewing.request} action={reviewing.action} onClose={() => setReviewing(null)} />}
    </section>
  );
}
