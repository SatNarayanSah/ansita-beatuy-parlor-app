"use client";

import { motion } from "motion/react";
import { CalendarOff, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { Container, openStatus, PageHero, Reveal, whatsappLink } from "@/components/site/section";
import { Badge, Card, ErrorState, Skeleton } from "@/components/ui";
import { formatDate, time12, todayISO } from "@/lib/format";
import { usePublicSettings } from "@/lib/queries";

export default function ContactPage() {
  const settings = usePublicSettings();
  const profile = settings.data?.profile;
  const status = openStatus(settings.data);
  // Only once data has loaded (in the browser): reading the clock during prerender fails the build.
  const today = settings.data ? todayISO() : "";
  const holidays = (settings.data?.holidays ?? []).filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const channels = profile
    ? [
        profile.phone && { icon: Phone, title: "Call us", value: profile.phone, href: `tel:${profile.phone}`, tint: "from-primary to-primary-dark" },
        profile.whatsapp && { icon: MessageCircle, title: "WhatsApp", value: "Chat with us", href: whatsappLink(profile.whatsapp), tint: "from-success to-success" },
        profile.email && { icon: Mail, title: "Email", value: profile.email, href: `mailto:${profile.email}`, tint: "from-plum to-[#35222f]" },
      ].filter(Boolean) as { icon: typeof Phone; title: string; value: string; href: string; tint: string }[]
    : [];

  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title={
          <>
            We&apos;d love to <span className="text-gradient">hear from you</span>
          </>
        }
        subtitle="Questions about a treatment, a bridal package or a course? Send a message and our team will reply soon."
      />

      <Container className="py-8">
        {settings.isError && <ErrorState error={settings.error} onRetry={() => settings.refetch()} />}

        <div className="grid gap-4 sm:grid-cols-3">
          {settings.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            : channels.map((c, i) => (
                <Reveal key={c.title} delay={i * 0.08}>
                  <motion.a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="group hover-lift flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-soft"
                  >
                    <motion.span whileHover={{ rotate: -12 }} transition={{ type: "spring", stiffness: 170, damping: 16 }} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${c.tint}`}>
                      <c.icon className="h-5 w-5" />
                    </motion.span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{c.title}</p>
                      <p className="truncate font-semibold text-ink group-hover:text-primary">{c.value}</p>
                    </div>
                  </motion.a>
                </Reveal>
              ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <Card className="p-4 sm:p-6">
              <h2 className="font-display text-2xl font-semibold text-ink">Send us a message</h2>
              <p className="mt-1 mb-4 text-sm text-muted">We usually reply within a few hours during opening times.</p>
              <EnquiryForm />
            </Card>
          </Reveal>

          <div className="flex flex-col gap-4">
            <Reveal delay={0.1}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                    <Clock className="h-5 w-5 text-primary" /> Opening hours
                  </h2>
                  {status && (
                    <Badge tone={status.open ? "green" : "amber"} dot pulse={status.open}>
                      {status.label}
                    </Badge>
                  )}
                </div>
                {profile ? (
                  <p className="mt-4 text-sm text-ink-2">
                    Every day · <span className="font-semibold text-ink">{time12(profile.openTime)} – {time12(profile.closeTime)}</span>
                  </p>
                ) : (
                  <Skeleton className="mt-4 h-5 w-48" />
                )}
                {holidays.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.15em] text-gold-text uppercase">
                      <CalendarOff className="h-3.5 w-3.5" /> Upcoming closures
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {holidays.map((h, i) => (
                        <motion.li
                          key={h.date}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="flex items-center justify-between rounded-xl bg-bg/60 px-3 py-2 text-sm"
                        >
                          <span className="text-ink">{h.name}</span>
                          <span className="text-xs text-muted">{formatDate(h.date, "EEE, d MMM")}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </Reveal>

            <Reveal delay={0.15}>
              <Card className="overflow-hidden">
                {profile?.address ? (
                  <>
                    <iframe
                      title="Map to the parlour"
                      src={`https://www.google.com/maps?q=${encodeURIComponent(profile.address)}&output=embed`}
                      className="h-64 w-full border-0 grayscale-[30%] dark:opacity-80 dark:invert-[0.9] dark:hue-rotate-180"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="flex items-start gap-3 p-4 text-sm text-ink-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        {profile.address}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block font-semibold text-primary hover:underline"
                        >
                          Get directions →
                        </a>
                      </span>
                    </div>
                  </>
                ) : (
                  <Skeleton className="h-64 rounded-none" />
                )}
              </Card>
            </Reveal>
          </div>
        </div>
      </Container>
    </>
  );
}
