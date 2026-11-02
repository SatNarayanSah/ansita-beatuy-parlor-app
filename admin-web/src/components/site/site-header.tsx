"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { CalendarPlus, LayoutDashboard, LogIn, Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { usePublicSettings } from "@/lib/queries";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const SITE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/offers", label: "Offers" },
  { href: "/academy", label: "Academy" },
  { href: "/team", label: "Team" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function SiteLogo({ light = false }: { light?: boolean }) {
  const settings = usePublicSettings();
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-2.5">
      <motion.span whileHover={{ rotate: -8, scale: 1.06 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
        <BrandLogo size={46} priority className="h-10 w-10 sm:h-[46px] sm:w-[46px]" />
      </motion.span>
      <span className="min-w-0 leading-tight">
        <span className={cn("block text-lg font-bold tracking-wide", light ? "text-white" : "text-primary")}>
          {settings.data?.profile.name.split(" ")[0] ?? "Ansita"}
        </span>
        <span className={cn("hidden text-[9px] font-semibold tracking-[0.16em] uppercase min-[380px]:block", light ? "text-white/75" : "text-ink-2")}>
          Beauty Parlour &amp; Training Centre
        </span>
      </span>
    </Link>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <motion.button
      whileTap={{ scale: 0.85, rotate: 30 }}
      onClick={toggle}
      className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-line bg-surface/70 text-ink-2 hover:text-primary"
      aria-label="Toggle dark mode"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25 }}
        >
          {theme === "dark" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function AccountButton({ compact = false }: { compact?: boolean }) {
  const { status, user } = useAuth();
  if (status === "loading") return <span className="h-10 w-24 rounded-xl" />;
  if (status === "signed-in" && user) {
    const href = user.role === "admin" ? "/admin/dashboard" : "/account";
    return (
      <Link href={href}>
        <Button variant="outline" icon={<LayoutDashboard className="h-4 w-4" />} className={compact ? "w-full" : ""}>
          {user.role === "admin" ? "Admin" : "My account"}
        </Button>
      </Link>
    );
  }
  return (
    <Link href="/login">
      <Button variant="ghost" icon={<LogIn className="h-4 w-4" />} className={compact ? "w-full border border-line" : ""}>
        Sign in
      </Button>
    </Link>
  );
}

const noopSubscribe = () => () => {};

/**
 * Full-screen mobile menu. Rendered in a portal on <body>: the header has a transform and a
 * backdrop-filter, and either one makes `position: fixed` children size to the header instead
 * of the screen (the menu used to be squeezed into the header strip).
 */
function MobileMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-[#2b2528]/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="absolute inset-y-0 right-0 flex w-[320px] max-w-[88vw] flex-col gap-6 overflow-y-auto border-l border-line bg-surface px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <SiteLogo />
                <button onClick={onClose} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line text-ink-2 hover:text-primary" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {SITE_LINKS.map((link, i) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <motion.div key={link.href} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                      <Link
                        href={link.href}
                        onNavigate={onClose}
                        className={cn(
                          "flex rounded-xl px-4 py-3 text-base font-medium transition-colors",
                          active ? "bg-primary-soft text-primary-dark" : "text-ink-2 hover:bg-bg-deep",
                        )}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
              <div className="mt-auto flex flex-col gap-2" onClick={onClose}>
                <AccountButton compact />
                <Link href="/account/book">
                  <Button className="w-full" icon={<CalendarPlus className="h-4 w-4" />}>
                    Book now
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
    document.body,
  );
}

function DesktopLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="ml-6 hidden items-center gap-1 lg:flex">
      {SITE_LINKS.map((link) => {
        const active = pathname !== null && isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn("relative px-3 py-2 text-sm font-medium transition-colors", active ? "text-primary-dark" : "text-ink-2 hover:text-ink")}
          >
            {link.label}
            {active && (
              <motion.span
                layoutId="site-nav-underline"
                className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-primary to-gold"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/*
 * The current path is request-time data on pages with an id in the URL (e.g. /services/<id>),
 * so only these two small pieces read it, each inside its own Suspense boundary. The rest of
 * the header still prerenders; the fallback is the same links without the active underline.
 */
function ActiveDesktopLinks() {
  return <DesktopLinks pathname={usePathname()} />;
}

function MobileMenuAtPath(props: { open: boolean; onClose: () => void }) {
  return <MobileMenu {...props} pathname={usePathname()} />;
}

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 22 }}
      className={cn(
        "sticky top-0 z-40 transition-[background,box-shadow,border-color,backdrop-filter] duration-300",
        scrolled ? "border-b border-line/70 bg-bg/80 shadow-soft backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className={cn("mx-auto flex max-w-7xl items-center gap-2 px-4 sm:gap-4 transition-[height] duration-300 sm:px-6", scrolled ? "h-16" : "h-20")}>
        <SiteLogo />

        <Suspense fallback={<DesktopLinks pathname={null} />}>
          <ActiveDesktopLinks />
        </Suspense>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeButton />
          <div className="hidden items-center gap-2 sm:flex">
            <AccountButton />
            <Link href="/account/book">
              <Button icon={<CalendarPlus className="h-4 w-4" />}>Book now</Button>
            </Link>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-ink-2 lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Suspense fallback={null}>
        <MobileMenuAtPath open={open} onClose={() => setOpen(false)} />
      </Suspense>
    </motion.header>
  );
}
