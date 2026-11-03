"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { BrandLogo, BrandWordmark } from "@/components/brand/brand-logo";

const PETALS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i * 1.3) % 9,
  duration: 11 + ((i * 7) % 8),
  size: 10 + ((i * 5) % 14),
}));

export function AuthShowcase() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#5a2d52] via-[#84374f] to-[#a44a67] lg:flex lg:flex-col lg:justify-between lg:p-8">
      {/* Drifting light */}
      <div className="absolute -top-24 -left-24 h-96 w-96 animate-float rounded-full bg-[#e0bc6e]/30 blur-3xl" />
      <div className="absolute right-0 bottom-0 h-[28rem] w-[28rem] animate-float rounded-full bg-[#efbfcd]/25 blur-3xl [animation-delay:-5s]" />
      <div className="absolute top-1/2 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-white/10" />
      <div className="absolute top-1/2 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-dashed border-white/15 [animation-direction:reverse]" />

      {/* Falling petals */}
      {PETALS.map((petal, i) => (
        <motion.span
          key={i}
          className="absolute -top-8 rounded-[60%_0_60%_0] bg-gradient-to-br from-white/70 to-[#efbfcd]/40"
          style={{ left: `${petal.left}%`, width: petal.size, height: petal.size }}
          animate={{ y: ["0vh", "110vh"], x: [0, 40, -30, 20], rotate: [0, 180, 360] }}
          transition={{ duration: petal.duration, delay: petal.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <Link href="/" className="flex w-fit items-center gap-3 text-white">
          <span className="rounded-full bg-white/90 p-1 shadow-lg">
            <BrandLogo size={52} priority />
          </span>
          <BrandWordmark light />
        </Link>
      </motion.div>

      <div className="relative">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 20 }}
          className="font-display text-5xl leading-[1.1] font-bold text-white xl:text-6xl"
        >
          Beauty that
          <br />
          feels like
          <br />
          <span className="text-[#f7edd8]">you.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 max-w-md text-sm leading-relaxed text-white/75"
        >
          Book your next visit, follow your academy course and collect loyalty points. Your account works
          the same here and in the Ansita mobile app.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="relative grid grid-cols-3 gap-3"
      >
        {["Bookings", "Academy", "Rewards"].map((item, i) => (
          <motion.div
            key={item}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs font-medium text-white backdrop-blur-md"
          >
            {item}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

