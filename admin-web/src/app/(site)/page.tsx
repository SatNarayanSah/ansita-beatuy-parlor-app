"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import {
  ArrowRight,
  Award,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Quote,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryIcon, OfferBanner, ServiceCard, StaffCard } from "@/components/site/cards";
import { Container, openStatus, Reveal, SectionHeading } from "@/components/site/section";
import { AnimatedNumber, Avatar, Badge, Button, Skeleton, Stars } from "@/components/ui";
import { label, money, time12 } from "@/lib/format";
import { useCategories, useCourses, useFeaturedReviews, useOffers, usePublicSettings, useServices, useStaff } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 31) % 100,
  size: 4 + ((i * 7) % 8),
  delay: (i * 0.7) % 5,
  duration: 3 + ((i * 3) % 4),
}));

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const cardsY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const settings = usePublicSettings();
  const services = useServices();
  const staff = useStaff();
  const categories = useCategories();
  const profile = settings.data?.profile;
  const name = profile?.name ?? "Ansita Beauty Parlour";
  const words = ["Where", "beauty", "meets"];
  const team = (staff.data ?? []).filter((s) => s.isActive);
  const rated = team.filter((s) => s.rating > 0);
  const avgRating = rated.length ? rated.reduce((sum, s) => sum + s.rating, 0) / rated.length : 0;
  const status = openStatus(settings.data);
  const featured = (services.data ?? []).filter((s) => s.isActive).slice(0, 3);
  const categoryMap = new Map((categories.data ?? []).map((c) => [c.id, c]));

  return (
    <section ref={ref} className="relative overflow-hidden pt-7 pb-12 sm:pt-10 lg:pb-16">
      {/* Parallax blobs */}
      <motion.div style={{ y: blobY }} className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -left-20 h-[28rem] w-[28rem] animate-float rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-20 right-0 h-[24rem] w-[24rem] animate-float rounded-full bg-gold/20 blur-3xl [animation-delay:-4s]" />
        <div className="absolute bottom-0 left-1/3 h-[20rem] w-[20rem] animate-float rounded-full bg-plum/15 blur-3xl [animation-delay:-8s]" />
      </motion.div>
      {/* Twinkling sparkles */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {SPARKS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-gold to-primary"
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.4, 1.2, 0.4], y: [0, -14, 0] }}
            transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <Container className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <motion.div style={{ y: textY, opacity: fade }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-ink-2 shadow-soft backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", status?.open ? "bg-success" : "bg-warning")} />
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", status?.open ? "bg-success" : "bg-warning")} />
            </span>
            {status ? status.label : "Welcome"}
            {profile && (
              <span className="text-muted">
                · {time12(profile.openTime)} – {time12(profile.closeTime)}
              </span>
            )}
          </motion.div>

          <h1 className="font-display text-5xl leading-[1.05] font-bold text-ink sm:text-6xl xl:text-7xl">
            {words.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 40, rotate: 4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ delay: 0.1 + i * 0.12, type: "spring", stiffness: 120, damping: 16 }}
                className="mr-4 inline-block"
              >
                {word}
              </motion.span>
            ))}
            <br />
            <motion.span
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 16 }}
              className="text-gradient inline-block pb-2"
            >
              confidence.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-4 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg"
          >
            {profile?.tagline ? `${profile.tagline}. ` : ""}Hair, skin, nails and bridal care at {name}, plus a beauty
            academy that trains the next generation of artists.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <Link href="/account/book" className="block">
              <Button size="lg" icon={<CalendarPlus className="h-4 w-4" />} className="group w-full sm:w-auto">
                Book an appointment
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/services" className="block">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Explore services
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
            className="mt-7 grid max-w-md grid-cols-3 gap-4"
          >
            {[
              { value: (services.data ?? []).length, label: "Services", format: undefined },
              { value: team.length, label: "Experts", format: undefined },
              { value: avgRating, label: "Avg. rating", format: (n: number) => (n ? n.toFixed(1) : "—") },
            ].map((stat) => (
              <div key={stat.label} className="border-l-2 border-primary/30 pl-3">
                <p className="font-display text-3xl font-bold text-ink">
                  <AnimatedNumber value={stat.value} format={stat.format} />
                </p>
                <p className="text-xs text-muted">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Floating card composition */}
        <motion.div style={{ y: cardsY }} className="relative mx-auto h-[360px] w-full max-w-md sm:h-[440px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: -4 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 16 }}
            className="absolute inset-x-6 top-6 bottom-10 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#5a2d52] via-[#84374f] to-[#a44a67] shadow-2xl"
          >
            <div className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-dashed border-white/20" />
            <div className="absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-white/15 [animation-direction:reverse]" />
            <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[#e0bc6e]/40 blur-3xl" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <motion.span
                animate={{ y: [0, -8, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-full bg-white/90 p-1.5 shadow-2xl ring-4 ring-white/20"
              >
                <BrandLogo size={128} priority className="h-24 w-24 sm:h-32 sm:w-32" />
              </motion.span>
              <p className="text-2xl font-bold tracking-wide sm:text-3xl">{name.split(" ")[0]}</p>
              <p className="px-4 text-center text-[10px] tracking-[0.3em] text-white/75 uppercase">Beauty · Care · Academy</p>
            </div>
          </motion.div>

          {featured[0] && (
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0, y: [0, -10, 0] }}
              transition={{ opacity: { delay: 0.7 }, x: { delay: 0.7, type: "spring" }, y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
              className="absolute top-14 -left-8 hidden w-52 rounded-2xl border border-line bg-surface/90 p-3 shadow-lift backdrop-blur-xl sm:block"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <CategoryIcon category={categoryMap.get(featured[0].categoryId)} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{featured[0].name}</p>
                  <p className="text-xs text-primary-dark">{money(featured[0].price)}</p>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0, y: [0, 12, 0] }}
            transition={{ opacity: { delay: 0.9 }, x: { delay: 0.9, type: "spring" }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
            className="absolute top-4 right-0 w-44 rounded-2xl border border-line bg-surface/90 p-3 shadow-lift backdrop-blur-xl sm:top-auto sm:bottom-24 sm:-right-6 sm:w-48"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-soft text-gold">
                <Star className="h-4 w-4 fill-current" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{avgRating ? `${avgRating.toFixed(1)} / 5` : "Loved locally"}</p>
                <p className="text-[11px] text-muted">from our clients</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, type: "spring" }}
            className="absolute bottom-0 left-10 flex items-center gap-2 rounded-2xl border border-line bg-surface/90 px-3 py-2 shadow-lift backdrop-blur-xl"
          >
            <div className="flex -space-x-2">
              {team.slice(0, 4).map((m) => (
                <Avatar key={m.id} name={m.name} src={m.avatar} size={30} />
              ))}
            </div>
            <p className="text-xs font-medium text-ink-2">{team.length || ""} experts ready for you</p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}

function Categories() {
  const categories = useCategories();
  const services = useServices();
  const list = [...(categories.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  if (categories.isLoading) {
    return (
      <Container className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </Container>
    );
  }
  if (!list.length) return null;
  return (
    <section className="py-10">
      <Container>
        <SectionHeading eyebrow="What we do" title={<>Care for every <span className="text-gradient">part of you</span></>} subtitle="Pick a category to see every treatment, price and how long it takes." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {list.map((category, i) => {
            const count = (services.data ?? []).filter((s) => s.categoryId === category.id && s.isActive).length;
            return (
              <Reveal key={category.id} delay={i * 0.07} className="h-full">
                <Link href="/services" className="group relative block h-full overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift sm:p-4">
                  <div
                    className="absolute -right-10 -bottom-10 h-36 w-36 rounded-full opacity-20 blur-2xl transition-all duration-700 group-hover:scale-[2.2] group-hover:opacity-30"
                    style={{ background: category.color }}
                  />
                  <motion.span
                    whileHover={{ rotate: -12, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 170, damping: 16 }}
                    className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-500 group-hover:-translate-y-1"
                    style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}bb)` }}
                  >
                    <CategoryIcon category={category} className="h-6 w-6" />
                  </motion.span>
                  <h3 className="relative mt-4 font-display text-lg font-semibold text-ink sm:mt-4 sm:text-xl">{category.name}</h3>
                  <p className="relative mt-1 flex items-center gap-1 text-xs text-muted">
                    {count} {count === 1 ? "treatment" : "treatments"}
                    <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function PopularServices() {
  const services = useServices();
  const categories = useCategories();
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);
  const list = (services.data ?? []).filter((s) => s.isActive).slice(0, 6);
  if (!services.isLoading && !list.length) return null;
  return (
    <section className="py-10">
      <Container>
        <SectionHeading
          align="left"
          eyebrow="Most loved"
          title="Popular treatments"
          subtitle="Clear prices, honest timings. Book online in under a minute."
          action={
            <Link href="/services">
              <Button variant="outline" className="group">
                All services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)
            : list.map((service, i) => <ServiceCard key={service.id} service={service} category={categoryMap.get(service.categoryId)} index={i} />)}
        </div>
      </Container>
    </section>
  );
}

function OffersStrip() {
  const offers = useOffers();
  const categories = useCategories();
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);
  const list = (offers.data ?? []).slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="py-10">
      <Container>
        <SectionHeading
          align="left"
          eyebrow="Limited time"
          title={<>Offers <span className="text-gradient">you&apos;ll love</span></>}
          action={
            <Link href="/offers">
              <Button variant="outline" className="group">
                See all offers <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          }
        />
        {/* The newest offer as a wide hero, the next two side by side. */}
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((offer, i) => (
            <div key={offer.id} className={i === 0 ? "lg:col-span-2" : undefined}>
              <OfferBanner offer={offer} categories={categoryMap} index={i} featured={i === 0} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function AcademyTeaser() {
  const courses = useCourses();
  const list = (courses.data ?? []).filter((c) => c.isActive).slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="py-10">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#35222f] via-[#5a2d52] to-[#84374f] p-4 text-white shadow-2xl sm:rounded-[2.5rem] sm:p-8">
            <div className="absolute -top-20 -right-20 h-72 w-72 animate-float rounded-full bg-[#e0bc6e]/25 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-72 w-72 animate-float rounded-full bg-[#efbfcd]/20 blur-3xl [animation-delay:-6s]" />
            <div className="relative grid gap-7 lg:grid-cols-[1fr_1.3fr] lg:items-center">
              <div>
                <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] text-[#f7edd8] uppercase">
                  <GraduationCap className="h-4 w-4" /> Ansita Academy
                </p>
                <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl">
                  Turn your passion into a <span className="text-[#f7edd8]">profession.</span>
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-white/75">
                  Hands-on courses taught by our senior artists, in small batches, with a certificate at the end.
                </p>
                <Link href="/academy" className="mt-4 inline-block">
                  <Button variant="gold" size="lg" className="group">
                    Explore courses <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {list.map((course, i) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.1, type: "spring", stiffness: 140, damping: 20 }}
                    className="hover-nudge"
                  >
                    <Link href="/academy" className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md transition-colors hover:bg-white/15 sm:gap-4 sm:p-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:h-12 sm:w-12">
                        {course.certificate ? <Award className="h-5 w-5 text-[#f7edd8]" /> : <Sparkles className="h-5 w-5 text-[#f7edd8]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{course.title}</p>
                        <p className="text-xs text-white/70">
                          {label(course.type)} · {label(course.level)} · {course.duration}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold whitespace-nowrap text-[#f7edd8] sm:text-lg">{money(course.fee)}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function TeamPreview() {
  const staff = useStaff();
  const list = (staff.data ?? []).filter((s) => s.isActive).slice(0, 4);
  if (!list.length) return null;
  return (
    <section className="py-10">
      <Container>
        <SectionHeading
          align="left"
          eyebrow="The artists"
          title="Meet the team"
          subtitle="Skilled, friendly and always learning the latest techniques."
          action={
            <Link href="/team">
              <Button variant="outline" className="group">
                Whole team <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {list.map((member, i) => (
            <Link key={member.id} href="/team" className="block h-full">
              <StaffCard member={member} index={i} compact />
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials() {
  const reviews = useFeaturedReviews();
  const list = reviews.data ?? [];
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const current = list.length ? list[index % list.length] : null;

  useEffect(() => {
    if (list.length < 2) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % list.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [list.length]);

  if (!current) return null;
  const go = (step: number) => {
    setDirection(step);
    setIndex((i) => (i + step + list.length) % list.length);
  };

  return (
    <section className="py-10">
      <Container>
        <SectionHeading eyebrow="Kind words" title={<>What our clients <span className="text-gradient">say</span></>} />
        <Reveal className="relative mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-4 py-8 text-center shadow-lift sm:px-10">
            <Quote className="absolute top-6 left-6 h-16 w-16 text-primary-soft" />
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
                className="relative"
              >
                <Stars value={current.rating} size={18} />
                <p className="mt-4 font-display text-xl leading-relaxed text-ink sm:text-2xl">“{current.comment}”</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Avatar name={current.customerName ?? "Client"} size={40} />
                  <p className="text-sm font-semibold text-ink">{current.customerName ?? "Happy client"}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          {list.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button onClick={() => go(-1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:text-primary" aria-label="Previous review">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1.5">
                {list.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setDirection(i > index ? 1 : -1);
                      setIndex(i);
                    }}
                    className={cn("h-2 cursor-pointer rounded-full transition-all duration-300", i === index % list.length ? "w-6 bg-primary" : "w-2 bg-line-strong")}
                    aria-label={`Review ${i + 1}`}
                  />
                ))}
              </div>
              <button onClick={() => go(1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:text-primary" aria-label="Next review">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </Reveal>
      </Container>
    </section>
  );
}

function VisitAndCta() {
  const settings = usePublicSettings();
  const profile = settings.data?.profile;
  const status = openStatus(settings.data);
  return (
    <section className="py-10">
      <Container className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <div className="h-full rounded-[2rem] border border-line bg-surface p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold text-ink">Visit today</h3>
              {status && (
                <Badge tone={status.open ? "green" : "amber"} dot pulse={status.open}>
                  {status.open ? "Open now" : "Closed now"}
                </Badge>
              )}
            </div>
            {profile ? (
              <ul className="mt-4 flex flex-col gap-4 text-sm text-ink-2">
                <li className="flex gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-primary" />
                  <span>
                    <span className="block font-semibold text-ink">
                      {time12(profile.openTime)} – {time12(profile.closeTime)}
                    </span>
                    {status?.label}
                  </span>
                </li>
                {profile.address && (
                  <li className="flex gap-3">
                    <MapPin className="h-5 w-5 shrink-0 text-primary" />
                    {profile.address}
                  </li>
                )}
                <li className="flex gap-3">
                  <Users className="h-5 w-5 shrink-0 text-primary" />
                  Walk-ins welcome, but booking guarantees your stylist.
                </li>
              </ul>
            ) : (
              <Skeleton className="mt-4 h-28" />
            )}
            <Link href="/contact" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Directions & contact <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-plum p-6 text-white shadow-2xl sm:p-8 dark:from-[#84374f] dark:via-[#7a2f4a] dark:to-[#5a2d52]">
            <motion.div
              className="absolute -top-16 -right-16 h-64 w-64 rounded-full border-[30px] border-white/10"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#e0bc6e]/30 blur-3xl" />
            <h3 className="relative font-display text-3xl leading-tight font-bold sm:text-4xl">
              Ready for your <span className="text-[#f7edd8]">glow-up?</span>
            </h3>
            <p className="relative mt-3 max-w-md text-sm text-white/80">
              Create a free account to book online, see your history and earn loyalty points on every visit.
            </p>
            <div className="relative mt-5 flex flex-wrap gap-3">
              <Link href="/account/book">
                <Button variant="gold" size="lg" icon={<CalendarPlus className="h-4 w-4" />}>
                  Book now
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" className="border border-white/30 bg-white/10 bg-none text-white shadow-none hover:bg-white/20 dark:text-white">
                  Create account
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export default function HomePage() {
  const settings = usePublicSettings();
  return (
    <>
      <title>{settings.data?.profile.name ?? "Ansita Beauty Parlour"}</title>
      <Hero />
      <Categories />
      <PopularServices />
      <OffersStrip />
      <AcademyTeaser />
      <TeamPreview />
      <Testimonials />
      <VisitAndCta />
    </>
  );
}
