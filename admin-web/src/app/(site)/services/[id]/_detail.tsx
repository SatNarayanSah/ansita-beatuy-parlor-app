"use client";

import { motion } from "motion/react";
import { ArrowLeft, CalendarPlus, Check, ChevronRight, Clock, MessageCircle, Scissors, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { use, useMemo } from "react";
import { CategoryIcon, OfferBanner, offersFor, ServiceCard } from "@/components/site/cards";
import { Container, whatsappLink } from "@/components/site/section";
import { Avatar, Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { label, minutesLabel, money } from "@/lib/format";
import { useCategories, useOffers, usePublicSettings, useServices, useStaff } from "@/lib/queries";

const STEPS = [
  { icon: CalendarPlus, title: "Book online", text: "Pick a stylist and a free time in under a minute." },
  { icon: Sparkles, title: "Relax at the parlour", text: "Arrive a few minutes early; we take it from there." },
  { icon: Wallet, title: "Pay your way", text: "Cash, card, eSewa, Khalti, Fonepay or bank transfer." },
];

export function ServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const services = useServices();
  const categories = useCategories();
  const offers = useOffers();
  const staff = useStaff();
  const settings = usePublicSettings();

  const service = services.data?.find((s) => s.id === id && s.isActive);
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);
  const category = service ? categoryMap.get(service.categoryId) : undefined;
  const color = category?.color ?? "#a44a67";
  const related = useMemo(
    () => (services.data ?? []).filter((s) => s.isActive && service && s.categoryId === service.categoryId && s.id !== service.id).slice(0, 3),
    [services.data, service],
  );
  const experts = (staff.data ?? []).filter((m) => m.isActive && service && m.specialties.includes(service.categoryId));
  const deals = service ? offersFor(offers.data, service.categoryId).slice(0, 2) : [];
  const whatsapp = settings.data?.profile.whatsapp;
  const bookHref = service ? `/account/book?service=${service.id}` : "/account/book";
  const hasImage = !!service?.image && /^https?:\/\//.test(service.image);

  if (services.isError) {
    return (
      <Container className="py-16">
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      </Container>
    );
  }
  if (services.isLoading) {
    return (
      <Container className="grid gap-8 py-12 lg:grid-cols-2">
        <Skeleton className="aspect-[4/3] rounded-3xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-24" />
        </div>
      </Container>
    );
  }
  if (!service) {
    return (
      <Container className="py-16">
        <title>Treatment not found · Ansita Beauty Parlour</title>
        <EmptyState
          icon={<Scissors className="h-7 w-7" />}
          title="This treatment isn't available"
          message="It may have been renamed or taken off the menu."
          action={
            <Link href="/services">
              <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />}>
                All services
              </Button>
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <>
      <title>{`${service.name} · Ansita Beauty Parlour`}</title>
      <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 right-0 h-96 w-96 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
        </div>
        <Container>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <Link href="/services" className="hover:text-primary">
              Services
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            {category && (
              <>
                <span className="shrink-0">{category.name}</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </>
            )}
            <span className="truncate font-medium text-ink-2">{service.name}</span>
          </nav>

          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Picture, or a designed card in the category's colour */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
              className="group relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-lift"
              style={{ background: `linear-gradient(140deg, ${color}, ${color}aa 45%, #35222f)` }}
            >
              {hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded image on the API host
                <img src={service.image!} alt={service.name} className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105" />
              ) : (
                <>
                  <div className="absolute -top-10 -left-10 h-60 w-60 rounded-full bg-white/15 blur-2xl" />
                  <div className="absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-gold/30 blur-3xl transition-transform duration-1000 group-hover:scale-125" />
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 14 }}
                    className="absolute inset-0 m-auto flex h-32 w-32 items-center justify-center rounded-[2rem] bg-white/90 shadow-2xl backdrop-blur sm:h-40 sm:w-40"
                    style={{ color }}
                  >
                    <CategoryIcon category={category} className="h-14 w-14 sm:h-16 sm:w-16" />
                  </motion.span>
                  <p className="absolute inset-x-0 bottom-5 text-center font-display text-sm font-semibold tracking-[0.25em] text-white/80 uppercase">
                    {category?.name ?? "Ansita"}
                  </p>
                </>
              )}
              {deals.length > 0 && (
                <span className="absolute top-4 left-4 rounded-full bg-gradient-to-br from-[#f3d48b] to-gold px-3 py-1 text-xs font-bold text-[#3a2410] shadow-lg">
                  Offer available
                </span>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex min-w-0 flex-col gap-5">
              {category && (
                <span
                  className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: `${color}1f`, color }}
                >
                  <CategoryIcon category={category} className="h-3.5 w-3.5" /> {category.name}
                </span>
              )}
              <h1 className="font-display text-3xl leading-tight font-bold text-ink sm:text-5xl">{service.name}</h1>
              {service.description && <p className="text-base leading-relaxed text-ink-2 sm:text-lg">{service.description}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
                  <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">Price</p>
                  <p className="mt-1 font-display text-2xl font-bold text-primary-dark">{money(service.price)}</p>
                </div>
                <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
                  <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">Takes about</p>
                  <p className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold text-ink">
                    <Clock className="h-5 w-5 text-muted" /> {minutesLabel(service.duration)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href={bookHref} className="sm:flex-1">
                  <Button size="lg" className="w-full" icon={<CalendarPlus className="h-4 w-4" />}>
                    Book this service
                  </Button>
                </Link>
                {whatsapp && (
                  <a href={whatsappLink(whatsapp)} target="_blank" rel="noreferrer" className="sm:flex-1">
                    <Button size="lg" variant="outline" className="w-full" icon={<MessageCircle className="h-4 w-4" />}>
                      Ask on WhatsApp
                    </Button>
                  </a>
                )}
              </div>
              {experts.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {experts.slice(0, 4).map((m) => (
                      <Avatar key={m.id} name={m.name} src={m.avatar} size={34} className="ring-2 ring-bg" />
                    ))}
                  </div>
                  <p className="min-w-0 text-xs text-ink-2">
                    Done by{" "}
                    <span className="font-semibold text-ink">
                      {experts
                        .slice(0, 2)
                        .map((m) => m.name.split(" ")[0])
                        .join(" & ")}
                      {experts.length > 2 ? ` +${experts.length - 2}` : ""}
                    </span>{" "}
                    · {label(experts[0].role)}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </Container>
      </section>

      {service.benefits?.length > 0 && (
        <section className="border-t border-line/60 bg-surface-alt/40 py-14">
          <Container>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">Why you&apos;ll love it</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Benefits of {service.name}</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {service.benefits.map((benefit, i) => (
                <motion.li
                  key={benefit}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 220, damping: 22 }}
                  className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 400, damping: 15 }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
                    style={{ background: color }}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </motion.span>
                  <p className="pt-1 text-sm font-medium text-ink">{benefit}</p>
                </motion.li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="py-14">
        <Container>
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">How your visit goes</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl border border-line bg-surface p-5"
              >
                <span className="absolute top-4 right-5 font-display text-4xl font-bold text-line">{i + 1}</span>
                <step.icon className="h-6 w-6 text-primary" />
                <p className="mt-3 font-semibold text-ink">{step.title}</p>
                <p className="mt-1 text-sm text-muted">{step.text}</p>
              </motion.li>
            ))}
          </ol>
        </Container>
      </section>

      {deals.length > 0 && (
        <section className="pb-14">
          <Container>
            <h2 className="mb-6 font-display text-2xl font-bold text-ink sm:text-3xl">Save on this treatment</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              {deals.map((offer, i) => (
                <OfferBanner key={offer.id} offer={offer} categories={categoryMap} index={i} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {related.length > 0 && (
        <section className="border-t border-line/60 py-14">
          <Container>
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">More {category?.name.toLowerCase() ?? "treatments"}</h2>
              <Link href="/services" className="shrink-0 text-sm font-medium text-primary hover:underline">
                All services
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((s, i) => (
                <ServiceCard key={s.id} service={s} category={categoryMap.get(s.categoryId)} index={i} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Phones: price and Book always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted">{service.name}</p>
            <p className="font-display text-lg font-bold text-primary-dark">{money(service.price)}</p>
          </div>
          <Link href={bookHref}>
            <Button icon={<CalendarPlus className="h-4 w-4" />}>Book</Button>
          </Link>
        </div>
      </div>
      <div className="h-20 sm:hidden" />
    </>
  );
}
