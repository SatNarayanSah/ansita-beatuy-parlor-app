"use client";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-[480px] w-[480px] animate-float rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[420px] w-[420px] animate-float rounded-full bg-gold/10 blur-3xl [animation-delay:-6s]" />
      </div>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
