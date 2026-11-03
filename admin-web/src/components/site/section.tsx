"use client";

import { motion } from "motion/react";
import { timeToMinutes, todayISO } from "@/lib/format";
import type { PublicSettings } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Page-width container used by every public page. */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-4", className)}>{children}</div>;
}

/** A section that fades up once when scrolled into view. */
export function Reveal({
  className,
  children,
  delay = 0,
  y = 28,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, type: "spring", stiffness: 120, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  action?: React.ReactNode;
}) {
  return (
    <Reveal
      className={cn(
        "mb-7 flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
      )}
    >
      <div className={cn(align === "center" && "max-w-2xl")}>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-gold-text uppercase">{eyebrow}</p>
        <h2 className="font-display text-3xl leading-tight font-bold text-ink sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </Reveal>
  );
}

/** Compact animated hero for inner pages. */
export function PageHero({ eyebrow, title, subtitle, children }: { eyebrow: string; title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-line/60 pt-10 pb-8 sm:pt-12 sm:pb-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-72 w-72 animate-float rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-10 top-10 h-64 w-64 animate-float rounded-full bg-gold/15 blur-3xl [animation-delay:-5s]" />
        <div className="absolute bottom-0 left-0 h-56 w-56 animate-float rounded-full bg-plum/10 blur-3xl [animation-delay:-9s]" />
      </div>
      <Container className="text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 text-[11px] font-semibold tracking-[0.3em] text-gold-text uppercase"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 120, damping: 20 }}
          className="mx-auto max-w-3xl font-display text-4xl leading-[1.1] font-bold text-ink sm:text-5xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base"
          >
            {subtitle}
          </motion.p>
        )}
        {children && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6">
            {children}
          </motion.div>
        )}
      </Container>
    </section>
  );
}

/** Minutes since midnight in the parlour's time zone. */
function nowMinutesKathmandu(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: false, timeZone: "Asia/Kathmandu" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export interface OpenStatus {
  open: boolean;
  label: string;
  holiday: string | null;
}

/** Whether the parlour is open right now (Kathmandu time), honouring holidays. */
export function openStatus(settings: PublicSettings | undefined): OpenStatus | null {
  if (!settings) return null;
  const today = todayISO();
  const holiday = settings.holidays.find((h) => h.date === today);
  if (holiday) return { open: false, label: `Closed today · ${holiday.name}`, holiday: holiday.name };
  const now = nowMinutesKathmandu();
  const opens = timeToMinutes(settings.profile.openTime);
  const closes = timeToMinutes(settings.profile.closeTime);
  if (now < opens) return { open: false, label: "Opens later today", holiday: null };
  if (now >= closes) return { open: false, label: "Closed for today", holiday: null };
  return { open: true, label: "Open now", holiday: null };
}

export function whatsappLink(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}
