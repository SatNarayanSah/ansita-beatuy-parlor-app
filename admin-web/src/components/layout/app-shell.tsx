"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, Globe, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { usePendingPaymentCount, useSettings, useUnreadCount } from "@/lib/queries";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import { type NavItem } from "./nav";

type Sections = { title: string; items: NavItem[] }[];

function Brand({
  collapsed = false,
  href,
  tagline,
  onNavigate,
}: {
  collapsed?: boolean;
  href: string;
  tagline: string;
  onNavigate?: () => void;
}) {
  const settings = useSettings();
  return (
    <Link href={href} onNavigate={onNavigate} className="group flex min-w-0 items-center gap-3 px-2" title="Go to the website home page">
      <motion.span whileHover={{ rotate: -8, scale: 1.06 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
        <BrandLogo size={44} priority />
      </motion.span>
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-lg font-bold tracking-wide text-primary">
            {settings.data?.profile.name.split(" ")[0] ?? "Ansita"}
          </span>
          <span className="block text-[10px] font-semibold tracking-[0.18em] text-ink-2 uppercase">{tagline}</span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({ sections, onNavigate }: { sections: Sections; onNavigate?: () => void }) {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const hasPayments = sections.some((s) => s.items.some((i) => i.href === "/admin/payments"));
  const pendingPayments = usePendingPaymentCount(hasPayments);
  return (
    <nav className="flex flex-col gap-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">{section.title}</p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item, itemIndex) => {
              // "/account" is the dashboard: only exact matches, so its sub-pages don't light it up too.
              const isRoot = item.href === "/" || item.href.split("/").length === 2;
              const active = pathname === item.href || (!isRoot && pathname.startsWith(item.href + "/"));
              const Icon = item.icon;
              const badge = item.href.endsWith("/notifications")
                ? unread.data?.count ?? 0
                : item.href === "/admin/payments"
                  ? pendingPayments.data?.count ?? 0
                  : 0;
              return (
                <motion.li
                  key={item.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + (sectionIndex * 3 + itemIndex) * 0.03 }}
                >
                  <Link
                    href={item.href}
                    onNavigate={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "text-primary-dark" : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-soft to-primary-soft/40 shadow-soft"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    {active && (
                      <motion.span
                        layoutId="nav-active-bar"
                        className="absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    <Icon
                      className={cn(
                        "relative h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110",
                        active ? "text-primary" : "text-muted group-hover:text-primary",
                      )}
                    />
                    <span className="relative flex-1">{item.label}</span>
                    <AnimatePresence>
                      {badge > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="relative rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums"
                        >
                          {badge > 99 ? "99+" : badge}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-bg/70 p-3">
      <Avatar name={user.name} src={user.avatar} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 170, damping: 16 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          logout();
          router.replace("/login");
        }}
        className="cursor-pointer rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <motion.button
      whileTap={{ scale: 0.85, rotate: 30 }}
      onClick={toggle}
      className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-line bg-surface text-ink-2 hover:text-primary"
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

function BellButton({ href }: { href: string }) {
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  return (
    <Link
      href={href}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:text-primary"
      aria-label={`Notifications (${count} unread)`}
    >
      <motion.span
        key={count}
        animate={count > 0 ? { rotate: [0, -18, 16, -10, 8, 0] } : undefined}
        transition={{ duration: 0.8 }}
      >
        <Bell className="h-[18px] w-[18px]" />
      </motion.span>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-bg"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

/** Back to the public website (landing page). Icon only on phones, labelled from sm up. */
function WebsiteButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="group flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-2.5 text-sm font-medium text-ink-2 transition-colors hover:border-primary/40 hover:text-primary sm:px-3"
      aria-label="Go to the website home page"
      title="Go to the website home page"
    >
      <Globe className="h-[18px] w-[18px] transition-transform duration-500 group-hover:rotate-[20deg]" />
      <span className="hidden sm:inline">Website</span>
    </Link>
  );
}

function Greeting() {
  const { user } = useAuth();
  // The shell only renders in the browser (after the auth check), so reading the clock here is safe.
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kathmandu" }).format(new Date()));
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const text = `${part}, ${user?.name.split(" ")[0] ?? ""}`;
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kathmandu" }).format(new Date());
  return (
    <div className="hidden min-w-0 lg:block">
      <p className="truncate text-sm font-semibold text-ink">{text}</p>
      <p className="text-xs text-muted" suppressHydrationWarning>
        {date}
      </p>
    </div>
  );
}

export function AppShell({
  children,
  sections,
  homeHref,
  tagline,
  notificationsHref,
}: {
  children: React.ReactNode;
  sections: Sections;
  homeHref: string;
  tagline: string;
  notificationsHref: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mobile menu: Escape closes it, the page behind doesn't scroll, and it closes if the
  // window grows past the lg breakpoint (where the fixed sidebar takes over).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => mq.matches && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <div className="relative min-h-screen">
      {/* Soft ambient glow behind everything */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[480px] w-[480px] animate-float rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[420px] w-[420px] animate-float rounded-full bg-gold/10 blur-3xl [animation-delay:-6s]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col gap-4 border-r border-line bg-surface/80 px-4 py-4 backdrop-blur-xl lg:flex">
        <Brand href={homeHref} tagline={tagline} />
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <NavLinks sections={sections} />
        </div>
        <UserCard />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-[#2b2528]/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="absolute inset-y-0 left-0 flex w-[280px] max-w-[86vw] flex-col gap-4 bg-surface px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <Brand href={homeHref} tagline={tagline} onNavigate={() => setMobileOpen(false)} />
                <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavLinks sections={sections} onNavigate={() => setMobileOpen(false)} />
              </div>
              <UserCard />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line/70 bg-bg/75 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Phones/tablets have no sidebar: show the brand here, like the public site header. */}
          <Link href={homeHref} className="flex min-w-0 items-center gap-2 lg:hidden" title="Go to the website home page">
            <BrandLogo size={36} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-base font-bold tracking-wide text-primary">Ansita</span>
              <span className="hidden truncate text-[9px] font-semibold tracking-[0.16em] text-ink-2 uppercase min-[400px]:block">{tagline}</span>
            </span>
          </Link>
          <Greeting />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <WebsiteButton href={homeHref} />
            <ThemeToggle />
            <BellButton href={notificationsHref} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
