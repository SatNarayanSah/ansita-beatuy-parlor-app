"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgePercent, Check, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import { money } from "@/lib/format";
import { useOfferQuote, type OfferQuote } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const normalizeCode = (code: string) => code.replace(/\s+/g, "").toUpperCase();

/**
 * Promo code box with a live preview from the server (`POST /offers/quote`).
 * - No code: shows the automatic offer the booking will get, if any.
 * - Code applied: shows the discount, or the server's reason it can't be used.
 * `onChange` reports the code to send with the booking (null unless it's valid) and the quote.
 */
export function PromoCode({
  serviceIds,
  date,
  initialCode = "",
  presetCode,
  onChange,
  className,
}: {
  serviceIds: string[];
  /** Visit date (offers must be valid on it). */
  date: string;
  initialCode?: string;
  /** A code arriving later (e.g. from an offer link while the page is already mounted): fills in and applies it. */
  presetCode?: string | null;
  onChange: (validCode: string | null, quote: OfferQuote | null) => void;
  className?: string;
}) {
  const startCode = normalizeCode(presetCode || initialCode);
  const [input, setInput] = useState(startCode);
  const [applied, setApplied] = useState<string | null>(startCode || null);
  const quote = useOfferQuote({ code: applied, serviceIds, date });

  // Adjusting state while rendering (React's recommended alternative to an effect for this).
  const [lastPreset, setLastPreset] = useState(presetCode);
  if (presetCode !== lastPreset) {
    setLastPreset(presetCode);
    if (presetCode) {
      setInput(normalizeCode(presetCode));
      setApplied(normalizeCode(presetCode));
    }
  }

  const data = quote.data ?? null;
  const failed = !!applied && quote.isError;
  const validCode = applied && data?.offer && !failed ? applied : null;

  useEffect(() => {
    onChange(validCode, failed ? null : data);
    // Report only when the outcome changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validCode, failed, data?.discount, data?.offer?.id]);

  const apply = () => {
    const code = normalizeCode(input);
    setApplied(code || null);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-xs font-medium tracking-wide text-ink-2" htmlFor="promo-code">
        Promo code
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <BadgePercent className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="promo-code"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder="e.g. TIHAR25"
            maxLength={40}
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 font-mono text-sm tracking-widest text-ink uppercase outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-[var(--ring)]"
          />
        </div>
        {applied ? (
          <button
            type="button"
            onClick={() => {
              setApplied(null);
              setInput("");
            }}
            className="flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-line px-3 text-xs font-medium text-ink-2 transition-colors hover:border-danger/50 hover:text-danger"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={apply}
            disabled={!normalizeCode(input)}
            className="h-10 cursor-pointer rounded-xl bg-primary-soft px-4 text-xs font-semibold text-primary-dark transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-[#2a1520]"
          >
            Apply
          </button>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {quote.isFetching && applied ? (
          <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-muted">
            Checking code…
          </motion.p>
        ) : failed ? (
          <motion.p key="error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs font-medium text-danger">
            {errorMessage(quote.error)}
          </motion.p>
        ) : data?.offer && data.discount > 0 ? (
          <motion.div
            key={`ok-${data.offer.id}`}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-3 py-2 text-xs text-success"
          >
            {data.automatic ? <Sparkles className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{data.offer.title}</span>
              {data.automatic ? " applied automatically" : " applied"}
            </span>
            <span className="shrink-0 font-bold">−{money(data.discount)}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
