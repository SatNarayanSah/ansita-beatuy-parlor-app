"use client";

import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor, useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { BrandLogo } from "@/components/brand/brand-logo";

export function Splash({ text = "Preparing your studio…" }: { text?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="relative flex items-center justify-center">
        <motion.span
          className="absolute h-28 w-28 rounded-full border-2 border-primary/30"
          animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <BrandLogo size={96} priority />
        </motion.div>
      </div>
      <motion.p
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="text-base font-medium text-ink-2"
      >
        {text}
      </motion.p>
    </div>
  );
}

/**
 * Renders children only for a signed-in user with `role`. Signed-out visitors go to
 * /login (and come back afterwards); a user with the other role goes to their own area.
 */
export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = status === "signed-in" && user?.role === role;

  useEffect(() => {
    if (status === "signed-out") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "signed-in" && user && user.role !== role) router.replace(homeFor(user));
  }, [status, user, role, router, pathname]);

  if (!allowed) return <Splash text={role === "admin" ? "Preparing your studio…" : "Opening your account…"} />;
  return <>{children}</>;
}
