"use client";

import { animate, motion, useInView, useMotionValue, useTransform, type Variants } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26 } },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** Children wrapped in <StaggerItem> reveal one after another. */
export function Stagger({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "ul" }) {
  const Comp = as === "ul" ? motion.ul : motion.div;
  return (
    <Comp variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ className, children, ...props }: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div variants={fadeUp} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/** Counts up from 0 when it scrolls into view, and tweens smoothly on later changes. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const text = useTransform(motionValue, (n) => format(n));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, value, motionValue]);

  return (
    <motion.span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </motion.span>
  );
}

/** Segmented control with a sliding highlight. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-bg-deep/70 p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "text-primary-dark" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                className="absolute inset-0 rounded-lg bg-surface shadow-soft"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cn(
                  "relative rounded-full px-1.5 text-[10px] tabular-nums",
                  active ? "bg-primary-soft text-primary-dark" : "bg-line text-muted",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-semibold tracking-[0.2em] text-gold-text uppercase">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
