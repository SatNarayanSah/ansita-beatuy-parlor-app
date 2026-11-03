"use client";

import { motion } from "motion/react";
import { Clock, Mail, MapPin, MessageCircle, Phone, Smartphone } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { time12 } from "@/lib/format";
import { usePublicSettings } from "@/lib/queries";
import { Container, whatsappLink } from "./section";
import { SITE_LINKS, SiteLogo } from "./site-header";

const noopSubscribe = () => () => {};

export function SiteFooter() {
  const settings = usePublicSettings();
  const profile = settings.data?.profile;
  // Read the clock only in the browser: the page shell is prerendered at build time.
  const year = useSyncExternalStore(noopSubscribe, () => new Date().getFullYear(), () => null);

  return (
    <footer className="relative mt-14 overflow-hidden border-t border-line bg-surface/70">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <Container className="relative grid gap-7 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <SiteLogo />
          <p className="text-sm leading-relaxed text-muted">
            {profile?.tagline || "Beauty, care and training under one roof."}
          </p>
          <motion.div
            className="hover-lift-sm flex items-start gap-3 rounded-2xl border border-line bg-bg/60 p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-plum text-white">
              <Smartphone className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-ink-2">
              <span className="block font-semibold text-ink">Get the Ansita app</span>
              Book, track visits and collect loyalty points on your phone. Same account as this website.
            </p>
          </motion.div>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">Explore</h3>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-1">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="group inline-flex items-center gap-2 text-ink-2 transition-colors hover:text-primary">
                  <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-3" />
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/account/book" className="font-medium text-primary hover:underline">
                Book a visit →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">Visit us</h3>
          <ul className="flex flex-col gap-3 text-sm text-ink-2">
            {profile?.address && (
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {profile.address}
              </li>
            )}
            {profile?.phone && (
              <li>
                <a href={`tel:${profile.phone}`} className="flex gap-2.5 hover:text-primary">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {profile.phone}
                </a>
              </li>
            )}
            {profile?.whatsapp && (
              <li>
                <a href={whatsappLink(profile.whatsapp)} target="_blank" rel="noreferrer" className="flex gap-2.5 hover:text-primary">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  WhatsApp us
                </a>
              </li>
            )}
            {profile?.email && (
              <li>
                <a href={`mailto:${profile.email}`} className="flex gap-2.5 break-all hover:text-primary">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {profile.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">Opening hours</h3>
          {profile ? (
            <div className="flex items-start gap-2.5 text-sm text-ink-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Every day
                <span className="block font-semibold text-ink">
                  {time12(profile.openTime)} – {time12(profile.closeTime)}
                </span>
                <span className="mt-1 block text-xs text-muted">Closed on public holidays we announce.</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted sm:flex-row">
          <p>
            © {year ? `${year} ` : ""}{profile?.name ?? "Ansita Beauty Parlour"}. All rights reserved.
          </p>
          <p>
            Staff? <Link href="/login" className="text-primary hover:underline">Sign in to the admin studio</Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}
