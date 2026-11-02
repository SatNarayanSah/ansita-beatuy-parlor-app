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
import { differenceInCalendarDays, parseISO } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Stars } from "@/components/ui";
import { formatDate, label, minutesLabel, money, todayISO } from "@/lib/format";
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
      <Link
        href={`/services/${service.id}`}
        aria-label={`${service.name}: details`}
        className="relative block h-36 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}22, ${color}55)` }}
      >
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
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg leading-snug font-semibold text-ink">
          <Link href={`/services/${service.id}`} className="transition-colors hover:text-primary">
            {service.name}
          </Link>
        </h3>
        <p className="line-clamp-2 flex-1 text-sm text-muted">{service.description || "Ask our team for details."}</p>
        {service.benefits?.length > 0 && (
          <p className="flex items-center gap-1.5 truncate text-xs text-success">
            <Check className="h-3.5 w-3.5 shrink-0" /> {service.benefits[0]}
          </p>
        )}
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

/** Days left including today: 0 = ends today, negative = ended. */
function daysLeft(validTo: string): number {
  return differenceInCalendarDays(parseISO(validTo), parseISO(todayISO()));
}

function endsLabel(validTo: string): string {
  const days = daysLeft(validTo);
  if (days <= 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 14) return `${days} days left`;
  return `Till ${formatDate(validTo, "d MMM")}`;
}

function DiscountBadge({ offer, featured, index }: { offer: Offer; featured: boolean; index: number }) {
  return (
    <motion.div
      initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
      whileInView={{ scale: 1, rotate: -4, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.15 + Math.min(index, 8) * 0.07, type: "spring", stiffness: 260, damping: 14 }}
      className="relative w-fit shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f3d48b] to-gold px-3.5 py-2 text-[#3a2410] shadow-lg"
    >
      <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 animate-[shine_3.2s_ease-in-out_infinite] bg-white/45" />
      <p className={cn("relative font-display leading-none font-bold tracking-tight", featured ? "text-3xl sm:text-4xl" : "text-2xl")}>
        {offer.discountType === "percent" ? `${offer.discountValue}%` : money(offer.discountValue)}
        <span className="ml-1 text-sm font-bold tracking-wide uppercase">off</span>
      </p>
      {offer.maxDiscount != null && offer.discountType === "percent" && (
        <p className="relative mt-0.5 text-[10px] font-semibold">up to {money(offer.maxDiscount)}</p>
      )}
    </motion.div>
  );
}

function EndsChip({ validTo }: { validTo: string }) {
  const urgent = daysLeft(validTo) <= 3;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-md",
        urgent ? "bg-danger/90 text-white" : "bg-[#1d1418]/45 text-white ring-1 ring-white/25",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", urgent ? "animate-ping bg-white" : "bg-[#8ff0bf]")} />
      {endsLabel(validTo)}
    </span>
  );
}

/**
 * Offer banner, two looks:
 * - With an image (often a designed poster with its own text): the poster is shown whole,
 *   never covered, with the details on a brand-coloured panel below it (beside it when featured).
 * - Without one: a rich brand gradient with the discount as a gold badge and the details on top.
 * Both have the countdown, tap-to-copy code, terms and a Book button. `featured` = large version.
 */
export function OfferBanner({
  offer,
  categories,
  index = 0,
  featured = false,
}: {
  offer: Offer;
  categories?: Map<string, ServiceCategory>;
  index?: number;
  featured?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const scope = offer.categoryIds.length
    ? offer.categoryIds.map((id) => categories?.get(id)?.name).filter(Boolean).join(", ")
    : "All services";
  const hasImage = !!offer.image && /^https?:\/\//.test(offer.image);

  async function copy() {
    if (!offer.code) return;
    try {
      await navigator.clipboard.writeText(offer.code);
    } catch {
      /* clipboard blocked: the code is still shown */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const details = (
    <>
      <h3 className={cn("font-display leading-tight font-bold drop-shadow-sm", featured ? "text-2xl sm:text-4xl" : "text-xl")}>{offer.title}</h3>
      {offer.description && <p className={cn("text-sm text-white/85", !featured && "line-clamp-2")}>{offer.description}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-white/75">
        <span>On {scope}</span>
        {offer.minSpend > 0 && <span>· Min bill {money(offer.minSpend)}</span>}
        <span>· Valid till {formatDate(offer.validTo, "d MMM yyyy")}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {offer.code ? (
          <button
            type="button"
            onClick={copy}
            className="relative inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-white/60 bg-white/10 px-3 py-1.5 font-mono text-sm font-bold tracking-widest backdrop-blur-md transition-colors hover:border-white hover:bg-white/20"
            aria-label={`Copy code ${offer.code}`}
          >
            {offer.code}
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1 font-sans text-[11px] font-semibold tracking-normal text-[#8ff0bf]">
                  <Check className="h-3.5 w-3.5" /> Copied!
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Copy className="h-3.5 w-3.5 opacity-70" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ) : (
          <span className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">Applied automatically</span>
        )}
        <Link
          href="/account/book"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-primary-dark shadow-lg transition-transform hover:scale-105"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Book now
        </Link>
        {offer.terms.length > 0 && (
          <button type="button" onClick={() => setShowTerms((v) => !v)} className="cursor-pointer text-xs text-white/75 underline-offset-2 hover:text-white hover:underline">
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
            className="list-disc overflow-hidden pl-4 text-xs text-white/80"
          >
            {offer.terms.map((term, i) => (
              <li key={i}>{term}</li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );

  const motionProps = {
    initial: { opacity: 0, y: 28, scale: 0.97 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: "-40px" },
    transition: { delay: Math.min(index, 8) * 0.07, type: "spring" as const, stiffness: 170, damping: 22 },
    whileHover: { y: -6 },
  };

  if (hasImage) {
    return (
      <motion.article
        {...motionProps}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-primary-dark via-plum to-[#2b1626] text-white shadow-lift",
          featured && "lg:flex-row",
        )}
      >
        <div className={cn("relative aspect-[16/9] shrink-0 overflow-hidden bg-[#2b1626]", featured && "lg:aspect-auto lg:w-[58%]")}>
          {/* Blurred copy fills any gap, so posters of other shapes still look intentional. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded image on the API host */}
          <img src={offer.image!} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded image on the API host */}
          <img
            src={offer.image!}
            alt={offer.title}
            className="relative h-full w-full object-contain transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute top-3 right-3">
            <EndsChip validTo={offer.validTo} />
          </div>
        </div>
        <div className={cn("relative flex flex-1 flex-col gap-2.5 p-5 sm:p-6", featured && "lg:justify-center lg:p-8")}>
          <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gold/25 blur-3xl" />
          <DiscountBadge offer={offer} featured={featured} index={index} />
          {details}
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      {...motionProps}
      className={cn(
        "group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-3xl text-white shadow-lift",
        featured ? "min-h-[340px] sm:min-h-[400px]" : "min-h-[300px]",
      )}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary via-plum to-[#2b1626]">
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-gold/40 blur-3xl transition-transform duration-1000 group-hover:scale-125" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary/60 blur-3xl" />
        <Sparkles className="absolute top-10 right-8 h-24 w-24 rotate-12 text-white/10 transition-transform duration-1000 group-hover:rotate-45" />
        <span className="absolute right-6 bottom-24 font-display text-[110px] leading-none font-bold text-white/[0.07] select-none sm:text-[140px]">
          {offer.discountType === "percent" ? `${offer.discountValue}%` : "Rs"}
        </span>
      </div>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
        <DiscountBadge offer={offer} featured={featured} index={index} />
        <EndsChip validTo={offer.validTo} />
      </div>
      <div className={cn("relative flex flex-col gap-2.5 p-5 sm:p-6", featured && "sm:max-w-[70%]")}>{details}</div>
    </motion.article>
  );
}

/** Offers that apply to a service: ones for every service, or for its category. */
export function offersFor(offers: Offer[] | undefined, categoryId: string): Offer[] {
  return (offers ?? []).filter((o) => !o.categoryIds.length || o.categoryIds.includes(categoryId));
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
