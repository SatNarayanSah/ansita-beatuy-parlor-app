"use client";

import { motion } from "motion/react";
import { ArrowRight, Gem, GraduationCap, HeartHandshake, Leaf, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { Container, PageHero, Reveal, SectionHeading } from "@/components/site/section";
import { AnimatedNumber, Button } from "@/components/ui";
import { useCourses, usePublicSettings, useServices, useStaff } from "@/lib/queries";

const VALUES = [
  { icon: HeartHandshake, title: "Warm, personal care", text: "We listen first, then recommend what truly suits your skin, hair and budget." },
  { icon: ShieldCheck, title: "Hygiene you can trust", text: "Sanitised tools, fresh disposables and clean stations for every single client." },
  { icon: Leaf, title: "Gentle products", text: "Quality brands chosen for Nepali skin and hair, with patch tests when needed." },
  { icon: Wallet, title: "Honest pricing", text: "Clear prices online, no surprise add-ons, and loyalty points on every visit." },
];

const TILES = [
  { title: "Bridal", from: "#a44a67", to: "#5a2d52", span: "sm:col-span-2 sm:row-span-2" },
  { title: "Hair", from: "#e0bc6e", to: "#a44a67", span: "" },
  { title: "Skin", from: "#2f8f63", to: "#5a2d52", span: "" },
  { title: "Nails", from: "#d0704f", to: "#84374f", span: "" },
  { title: "Academy", from: "#5a2d52", to: "#35222f", span: "" },
];

export default function AboutPage() {
  const settings = usePublicSettings();
  const services = useServices();
  const staff = useStaff();
  const courses = useCourses();
  const name = settings.data?.profile.name ?? "Ansita Beauty Parlour";

  const stats = [
    { value: (services.data ?? []).filter((s) => s.isActive).length, label: "Treatments" },
    { value: (staff.data ?? []).filter((s) => s.isActive).length, label: "Experts" },
    { value: (courses.data ?? []).filter((c) => c.isActive).length, label: "Academy courses" },
    { value: 7, label: "Days a week" },
  ];

  return (
    <>
      <title>About · Ansita Beauty Parlour</title>
      <PageHero
        eyebrow="Our story"
        title={
          <>
            A parlour built on <span className="text-gradient">trust</span>
          </>
        }
        subtitle={`${name} started with one chair and a simple promise: make every client leave feeling more like themselves.`}
      />

      <section className="py-16">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-gold-text uppercase">Who we are</p>
            <h2 className="font-display text-3xl leading-tight font-bold text-ink sm:text-4xl">
              Beauty, care and craft, <span className="text-gradient">under one roof.</span>
            </h2>
            <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-ink-2 sm:text-base">
              <p>
                From everyday haircuts and facials to full bridal looks, our team brings years of experience and a lot of heart.
                We keep up with the latest techniques so you don&apos;t have to.
              </p>
              <p>
                We also run the Ansita Academy, where our senior artists teach small batches of students, many of whom now run
                their own parlours.
              </p>
              <p>{settings.data?.profile.tagline}</p>
            </div>
            <Link href="/services" className="mt-7 inline-block">
              <Button className="group">
                See our services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </Reveal>

          <div className="grid auto-rows-[140px] grid-cols-2 gap-3 sm:grid-cols-3">
            {TILES.map((tile, i) => (
              <motion.div
                key={tile.title}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 160, damping: 20 }}
                whileHover={{ scale: 1.03, rotate: i % 2 ? 1 : -1 }}
                className={`group relative overflow-hidden rounded-3xl p-5 text-white shadow-lift ${tile.span}`}
                style={{ background: `linear-gradient(135deg, ${tile.from}, ${tile.to})` }}
              >
                <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/15 blur-xl transition-transform duration-700 group-hover:scale-150" />
                <Sparkles className="h-5 w-5 text-white/80" />
                <p className="absolute bottom-5 left-5 font-display text-2xl font-semibold">{tile.title}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <Reveal className="grid grid-cols-2 gap-4 rounded-[2rem] border border-line bg-surface p-8 shadow-soft lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-4xl font-bold text-gradient">
                  <AnimatedNumber value={stat.value} />
                </p>
                <p className="mt-1 text-sm text-muted">{stat.label}</p>
              </div>
            ))}
          </Reveal>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <SectionHeading eyebrow="What we stand for" title={<>Why clients <span className="text-gradient">choose us</span></>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <motion.div whileHover={{ y: -6 }} className="h-full rounded-3xl border border-line bg-surface p-6 shadow-soft transition-shadow hover:shadow-lift">
                  <motion.span
                    whileHover={{ rotate: 12, scale: 1.1 }}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-soft to-plum-soft text-primary"
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#35222f] via-[#5a2d52] to-[#84374f] p-10 text-center text-white shadow-2xl">
              <motion.div className="absolute -top-20 -left-20 h-64 w-64 rounded-full border-[28px] border-white/10" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
              <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-[#e0bc6e]/25 blur-3xl" />
              <Gem className="relative mx-auto h-8 w-8 text-[#f7edd8]" />
              <h2 className="relative mt-4 font-display text-3xl font-bold sm:text-4xl">Come and see us</h2>
              <p className="relative mx-auto mt-3 max-w-lg text-sm text-white/75">Book online in a minute, or drop by for a chat about bridal packages and courses.</p>
              <div className="relative mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/account/book">
                  <Button variant="gold" size="lg">
                    Book a visit
                  </Button>
                </Link>
                <Link href="/academy">
                  <Button size="lg" icon={<GraduationCap className="h-4 w-4" />} className="border border-white/30 bg-white/10 bg-none text-white shadow-none hover:bg-white/20 dark:text-white">
                    Join the academy
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
