"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Brush,
  CalendarPlus,
  Check,
  Clock,
  Copy,
  Crown,
  Droplets,
  Flower2,
  Footprints,
  Hand,
  Scissors,
  Smile,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Badge, Stars } from "@/components/ui";
import { formatDate, label, minutesLabel, money } from "@/lib/format";
import type { Offer, Service, ServiceCategory, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

type IconKey = "scissors" | "droplets" | "footprints" | "hand" | "brush" | "crown" | "flower" | "smile" | "sparkles";

/** Categories store an Ionicons name (for the app); map it, or the category name, to a lucide icon. */
function iconKey(category: Pick<ServiceCategory, "icon" | "name"> | undefined): IconKey {
  const key = `${category?.icon ?? ""} ${category?.name ?? ""}`.toLowerCase();
  if (/cut|hair|scissor/.test(key)) return "scissors";
  if (/water|facial|bleach|drop/.test(key)) return "droplets";
  if (/foot|pedi/.test(key)) return "footprints";
  if (/hand|nail|mani/.test(key)) return "hand";
  if (/brush|makeup|color|palette/.test(key)) return "brush";
  if (/bridal|crown|diamond/.test(key)) return "crown";
  if (/spa|flower|massage|leaf/.test(key)) return "flower";
  if (/face|smile|happy/.test(key)) return "smile";
  return "sparkles";
}

export function CategoryIcon({ category, className }: { category: Pick<ServiceCategory, "icon" | "name"> | undefined; className?: string }) {
  switch (iconKey(category)) {
    case "scissors":
      return <Scissors className={className} />;
    case "droplets":
      return <Droplets className={className} />;
    case "footprints":
      return <Footprints className={className} />;
    case "hand":
      return <Hand className={className} />;
    case "brush":
      return <Brush className={className} />;
    case "crown":
      return <Crown className={className} />;
    case "flower":
      return <Flower2 className={className} />;
    case "smile":
      return <Smile className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export function ServiceCard({ service, category, index = 0 }: { service: Service; category?: ServiceCategory; index?: number }) {
  const color = category?.color ?? "#a44a67";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ delay: Math.min(index, 12) * 0.04, type: "spring", stiffness: 220, damping: 24 }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="relative h-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}22, ${color}55)` }}>
        {service.image && /^https?:\/\//.test(service.image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.image} alt={service.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <>
            <div className="absolute -right-6 -bottom-8 h-32 w-32 rounded-full opacity-40 blur-2xl transition-transform duration-700 group-hover:scale-150" style={{ background: color }} />
            <motion.span
              className="absolute top-5 left-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface/90 shadow-lg backdrop-blur"
              style={{ color }}
              whileHover={{ rotate: -10, scale: 1.08 }}
            >
              <CategoryIcon category={category} className="h-6 w-6" />
            </motion.span>
          </>
        )}
        {category && (
          <span className="absolute top-4 right-4 rounded-full bg-surface/90 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-ink-2 backdrop-blur">
            {category.name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg leading-snug font-semibold text-ink">{service.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted">{service.description || "Ask our team for details."}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="font-display text-xl font-semibold text-primary-dark">{money(service.price)}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3" /> {minutesLabel(service.duration)}
            </p>
          </div>
          <Link
            href={`/account/book?service=${service.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-soft px-3 py-2 text-xs font-semibold text-primary-dark transition-all hover:bg-primary hover:text-white dark:hover:text-[#2a1520]"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Book this
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export function discountLabel(offer: Pick<Offer, "discountType" | "discountValue">): string {
  return offer.discountType === "percent" ? `${offer.discountValue}% off` : `${money(offer.discountValue)} off`;
}

export function OfferCoupon({ offer, categories, index = 0 }: { offer: Offer; categories?: Map<string, ServiceCategory>; index?: number }) {
  const [copied, setCopied] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const scope = offer.categoryIds.length
    ? offer.categoryIds.map((id) => categories?.get(id)?.name).filter(Boolean).join(", ")
    : "All services";

  async function copy() {
    if (!offer.code) return;
    try {
      await navigator.clipboard.writeText(offer.code);
    } catch {
      /* clipboard blocked: still show the code */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, rotate: -1 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index, 8) * 0.06, type: "spring", stiffness: 180, damping: 22 }}
      whileHover={{ y: -6 }}
      className="relative flex overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="relative flex w-32 shrink-0 flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary via-plum to-[#35222f] p-4 text-center text-white sm:w-36">
        <Sparkles className="h-5 w-5 text-[#f7edd8]" />
        <p className="font-display text-2xl leading-tight font-semibold">{discountLabel(offer)}</p>
        {offer.maxDiscount != null && offer.discountType === "percent" && (
          <p className="text-[10px] text-white/75">up to {money(offer.maxDiscount)}</p>
        )}
        {/* Perforation */}
        <div className="absolute inset-y-3 -right-px flex flex-col justify-between">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="h-2 w-2 translate-x-1 rounded-full bg-surface" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 border-l-2 border-dashed border-line p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug font-semibold text-ink">{offer.title}</h3>
          <Badge tone="green" dot pulse>
            Live
          </Badge>
        </div>
        {offer.description && <p className="text-sm text-muted">{offer.description}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          <span>Valid till {formatDate(offer.validTo, "d MMM yyyy")}</span>
          {offer.minSpend > 0 && <span>Min spend {money(offer.minSpend)}</span>}
          <span className="truncate">On: {scope}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {offer.code ? (
            <button
              type="button"
              onClick={copy}
              className="group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-primary/50 bg-primary-soft/50 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-primary-dark transition-colors hover:border-primary"
              aria-label={`Copy code ${offer.code}`}
            >
              {offer.code}
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1 font-sans text-[11px] font-semibold tracking-normal text-success">
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ) : (
            <span className="text-xs font-medium text-success">Applied automatically at the desk</span>
          )}
          {offer.terms.length > 0 && (
            <button type="button" onClick={() => setShowTerms((s) => !s)} className="cursor-pointer text-xs text-muted underline-offset-2 hover:text-primary hover:underline">
              {showTerms ? "Hide terms" : "Terms"}
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {showTerms && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="list-disc overflow-hidden pl-4 text-xs text-muted"
            >
              {offer.terms.map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function StaffCard({
  member,
  categories,
  onClick,
  index = 0,
  compact = false,
}: {
  member: Staff;
  categories?: Map<string, ServiceCategory>;
  onClick?: () => void;
  index?: number;
  compact?: boolean;
}) {
  const workingDays = new Set(member.workingHours.filter((h) => !h.isOff).map((h) => h.day));
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index, 10) * 0.06, type: "spring", stiffness: 200, damping: 24 }}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className={cn(
        "group relative flex h-full flex-col items-center overflow-hidden rounded-3xl border border-line bg-surface p-4 text-center shadow-soft transition-shadow hover:shadow-lift sm:p-6",
        onClick && "cursor-pointer",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary-soft via-plum-soft to-gold-soft opacity-80" />
      <motion.div className="relative" whileHover={{ scale: 1.06, rotate: 3 }}>
        <span className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-primary via-plum to-gold opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-70" />
        <Avatar name={member.name} src={member.avatar} size={compact ? 72 : 88} className="relative ring-4" />
      </motion.div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{member.name}</h3>
      <p className="text-xs font-medium tracking-wide text-gold-text uppercase">{label(member.role)}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <Stars value={member.rating} />
        <span className="text-xs text-muted">{member.rating > 0 ? member.rating.toFixed(1) : "New"}</span>
      </div>
      {!compact && (
        <>
          {member.specialties.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {member.specialties.map((id) => {
                const category = categories?.get(id);
                if (!category) return null;
                return (
                  <span
                    key={id}
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{ background: `${category.color}1f`, color: category.color }}
                  >
                    {category.name}
                  </span>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex gap-1">
            {DAY_ORDER.map((day) => (
              <span
                key={day}
                title={label(day)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-semibold uppercase",
                  workingDays.has(day) ? "bg-primary-soft text-primary-dark" : "bg-bg-deep text-muted/60 line-through",
                )}
              >
                {day.slice(0, 2)}
              </span>
            ))}
          </div>
        </>
      )}
    </motion.article>
  );
}
