import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The parlour's badge logo (अंशिता ब्युटी पार्लर तथा प्रशिक्षण केन्द्र, जनकपुर-८), the same
 * file the mobile app uses (ansita-parlor-app/assets/logo-app.png). next/image serves
 * a resized copy for each size.
 */
export function BrandLogo({ size = 40, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Ansita Beauty Parlour logo"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 object-contain drop-shadow-sm select-none", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

/** "Ansita" wordmark with the app's tagline, as in the app's BrandWordmark. */
export function BrandWordmark({
  name = "Ansita",
  tagline = "Beauty Parlour & Training Centre · Janakpur",
  className,
  light,
}: {
  name?: string;
  tagline?: string | null;
  className?: string;
  light?: boolean;
}) {
  return (
    <span className={cn("min-w-0 leading-tight", className)}>
      <span className={cn("block truncate text-lg font-bold tracking-wide", light ? "text-white" : "text-primary")}>{name}</span>
      {tagline && (
        <span className={cn("block truncate text-[10px] font-semibold tracking-[0.12em] uppercase", light ? "text-white/75" : "text-ink-2")}>
          {tagline}
        </span>
      )}
    </span>
  );
}
