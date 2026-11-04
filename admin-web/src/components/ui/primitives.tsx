"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { Loader2, Search, X } from "lucide-react";
import { forwardRef, useId } from "react";
import { initials, type Tone } from "@/lib/format";
import { cn } from "@/lib/utils";

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "gold";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-primary to-primary-dark shadow-[0_8px_20px_-8px_var(--ring)] hover:shadow-[0_12px_28px_-8px_var(--ring)] text-on-primary",
  secondary: "bg-primary-soft text-primary-dark hover:bg-primary-soft/70",
  outline: "border border-line-strong bg-surface text-ink hover:border-primary/50 hover:text-primary",
  ghost: "text-ink-2 hover:bg-bg-deep hover:text-ink",
  danger: "bg-danger text-white hover:brightness-110 shadow-[0_8px_20px_-10px_var(--danger)] dark:text-[#2a1520]",
  gold: "bg-gradient-to-br from-gold to-gold-text text-white shadow-[0_8px_20px_-10px_var(--gold)] dark:text-[#2a1520]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-4 text-sm gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-xl",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      transition={{ type: "tween", duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap transition-[background,box-shadow,color,border-color] outline-none select-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
});

// ---------- Form fields ----------

const fieldBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted outline-none transition-all duration-200 hover:border-line-strong focus:border-primary focus:ring-4 focus:ring-[var(--ring)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-[88px] resize-y py-2.5", className)} {...props} />;
  },
);

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium tracking-wide text-ink-2">{label}</span>
      {children}
      {error ? (
        <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-danger">
          {error}
        </motion.span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("group relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-9 pl-9" />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-bg-deep hover:text-ink"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  const id = useId();
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-line-strong",
        checked ? "justify-end" : "justify-start",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 35 }}
        className="h-5 w-5 rounded-full bg-white shadow-md"
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200",
          checked ? "border-primary bg-primary" : "border-line-strong bg-surface",
        )}
      >
        <motion.svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3.5}>
          <motion.path
            d="M5 12l5 5L19 7"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0 }}
            transition={{ duration: 0.25 }}
          />
        </motion.svg>
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

// ---------- Display ----------

const toneClasses: Record<Tone, string> = {
  rose: "bg-primary-soft text-primary-dark",
  plum: "bg-plum-soft text-plum",
  gold: "bg-gold-soft text-gold-text",
  // The app's status pairs (colors.ts → status / success / info / danger / warning / neutral).
  green: "bg-success-soft text-success",
  blue: "bg-info-soft text-info",
  red: "bg-danger-soft text-danger",
  amber: "bg-warning-soft text-warning",
  gray: "bg-neutral-soft text-neutral",
};

const dotClasses: Record<Tone, string> = {
  rose: "bg-primary",
  plum: "bg-plum",
  gold: "bg-gold",
  green: "bg-success",
  blue: "bg-info",
  red: "bg-danger",
  amber: "bg-warning",
  gray: "bg-neutral",
};

export function Badge({
  tone = "rose",
  dot,
  pulse,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-70", dotClasses[tone])} />}
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
        </span>
      )}
      {children}
    </motion.span>
  );
}

export function Card({ className, children, hover, ...props }: HTMLMotionProps<"div"> & { hover?: boolean }) {
  return (
    <motion.div
      className={cn("rounded-2xl border border-line bg-surface shadow-soft", hover && "hover-lift", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

const avatarTints = [
  "from-[#f8e1e8] to-[#efbfcd] text-[#84374f]",
  "from-[#efe3ec] to-[#c79bc0] text-[#5a2d52]",
  "from-[#f7edd8] to-[#e0bc6e] text-[#7a5a1c]",
  "from-[#e3f3ea] to-[#a8dcc0] text-[#287b55]",
  "from-[#e3ecf8] to-[#adc6ee] text-[#3768b5]",
  "from-[#f4e4da] to-[#e3b9a0] text-[#8a4a2a]",
];

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const tint = avatarTints[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % avatarTints.length];
  const showImage = src && /^https?:\/\//.test(src);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold ring-2 ring-surface",
        tint,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name) || "?"
      )}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-soft to-plum-soft text-primary"
      >
        {icon}
      </motion.div>
      <div>
        <p className="font-display text-lg font-semibold text-ink">{title}</p>
        {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft/60 px-4 py-7 text-center">
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" className={n <= Math.round(value) ? "text-gold" : "text-line-strong"}>
          <path
            fill="currentColor"
            d="M12 17.3 6.2 21l1.6-6.6L2.7 10l6.8-.6L12 3l2.5 6.4 6.8.6-5.1 4.4 1.6 6.6z"
          />
        </svg>
      ))}
    </span>
  );
}
