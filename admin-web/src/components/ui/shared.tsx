"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { label, money, PAYMENT_METHODS, STATUS_TONE } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./motion";
import { Modal } from "./overlay";
import { Badge, Button, Card, Field, Input } from "./primitives";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? "gray";
  return (
    <Badge tone={tone} dot pulse={status === "pending"} className={className}>
      {label(status)}
    </Badge>
  );
}

export function StatCard({
  label: title,
  value,
  format,
  icon,
  accent = "rose",
  hint,
  index = 0,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon: React.ReactNode;
  accent?: "rose" | "plum" | "gold" | "green";
  hint?: React.ReactNode;
  index?: number;
}) {
  const accents = {
    rose: "from-primary/90 to-primary-dark text-white",
    plum: "from-plum/90 to-[#35222f] text-white dark:to-[#5a2d52]",
    gold: "from-gold to-[#84682f] text-white",
    green: "from-success to-success text-white",
  };
  const glows = {
    rose: "bg-primary/20",
    plum: "bg-plum/20",
    gold: "bg-gold/25",
    green: "bg-success/20",
  };
  return (
    <Card
      hover
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 240, damping: 24 }}
      className="group relative h-full overflow-hidden p-4 sm:p-5"
    >
      <div
        className={cn(
          "absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-150",
          glows[accent],
        )}
      />
      {/* Phones show these two per row: icon on top, smaller numbers, so long amounts fit. */}
      <div className="relative flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium tracking-wide text-muted uppercase sm:text-xs">{title}</p>
          <p className="mt-1.5 truncate font-display text-xl leading-tight font-bold text-ink sm:mt-2 sm:text-[28px] sm:leading-none">
            <AnimatedNumber value={value} format={format} />
          </p>
          {hint && <div className="mt-1.5 line-clamp-2 text-[11px] text-muted sm:mt-2 sm:text-xs">{hint}</div>}
        </div>
        <motion.div
          whileHover={{ rotate: 12, scale: 1.08 }}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg sm:h-11 sm:w-11 sm:rounded-2xl [&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-5 sm:[&_svg]:w-5",
            accents[accent],
          )}
        >
          {icon}
        </motion.div>
      </div>
    </Card>
  );
}

/** Animated table: rows fade/slide in, and leave smoothly when filtered out. */
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  empty,
}: {
  rows: T[];
  columns: { header: string; cell: (row: T) => React.ReactNode; className?: string }[];
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
}) {
  if (!rows.length && empty) return <>{empty}</>;
  const [first, ...rest] = columns;
  return (
    <>
      {/* Phones: each row becomes a card (first column as the title, the rest as label/value). */}
      <ul className="flex flex-col gap-3 p-3 md:hidden">
        <AnimatePresence initial={true}>
          {rows.map((row, index) => (
            <motion.li
              key={row.id}
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.03 } }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "rounded-2xl border border-line bg-surface p-4 shadow-soft transition-colors",
                onRowClick && "cursor-pointer active:bg-surface-alt",
              )}
            >
              <div className="min-w-0">{first.cell(row)}</div>
              {rest.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3">
                  {rest.map((column) => (
                    <div key={column.header} className="min-w-0 text-sm">
                      <dt className="mb-0.5 text-[10px] font-semibold tracking-wider text-muted uppercase">{column.header}</dt>
                      <dd className="min-w-0 break-words text-ink">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] tracking-wider text-muted uppercase">
            {columns.map((column) => (
              <th key={column.header} className={cn("px-4 py-3 font-semibold", column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={true}>
            {rows.map((row, index) => (
              <motion.tr
                key={row.id}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 15) * 0.025 } }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.18 } }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "group border-b border-line/70 transition-colors last:border-0",
                  onRowClick && "cursor-pointer hover:bg-surface-alt",
                )}
              >
                {columns.map((column) => (
                  <td key={column.header} className={cn("px-4 py-3 align-middle", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      </div>
    </>
  );
}

/** Payment progress bar that fills in on mount. */
export function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <motion.div
          className={cn("h-full rounded-full", pct >= 100 ? "bg-success" : pct > 0 ? "bg-gold" : "bg-transparent")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="text-[11px] text-muted tabular-nums">
        {money(paid)} of {money(total)}
      </span>
    </div>
  );
}

/** Ask for an amount (capped at the balance due) and a method, then call onSubmit. */
export function PaymentDialog({
  open,
  onClose,
  due,
  title = "Record payment",
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  due: number;
  title?: string;
  loading?: boolean;
  onSubmit: (amount: number, method: PaymentMethod) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const value = Number(amount || due);
  const invalid = !(value > 0) || value > due;

  return (
    <Modal
      open={open}
      onClose={() => {
        setAmount("");
        onClose();
      }}
      title={title}
      description={`Balance due: ${money(due)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} disabled={invalid} onClick={() => onSubmit(value, method)}>
            Save {money(value)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Amount (NPR)" error={value > due ? `Can't exceed ${money(due)}` : undefined}>
          <Input type="number" min={1} max={due} placeholder={String(due)} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <div className="flex flex-wrap gap-2">
          {[0.25, 0.5, 1].map((fraction) => (
            <button
              key={fraction}
              type="button"
              onClick={() => setAmount(String(Math.round(due * fraction)))}
              className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs text-ink-2 transition hover:border-primary hover:text-primary"
            >
              {fraction === 1 ? "Full" : `${fraction * 100}%`}
            </button>
          ))}
        </div>
        <Field label="Method">
          <div className="grid grid-cols-3 gap-2">
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
                {method === m && (
                  <motion.span layoutId="pay-method" className="absolute inset-0 rounded-xl bg-primary-soft" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                )}
                <span className="relative">{label(m)}</span>
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
