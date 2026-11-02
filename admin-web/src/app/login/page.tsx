"use client";

import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthShowcase } from "@/components/layout/auth-showcase";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button, fadeUp, Input, staggerParent } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { homeFor, safeNext, useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, status, user } = useAuth();
  const router = useRouter();
  const shake = useAnimationControls();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "signed-in" && user) router.replace(homeFor(user));
  }, [status, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const signedIn = await login(email.trim(), password);
      // Read ?next= at submit time (not during render), so the page needs no Suspense boundary.
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next"), signedIn));
    } catch (err) {
      setError(errorMessage(err));
      shake.start({ x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.5 } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <AuthShowcase />
      <div className="relative flex items-center justify-center px-6 py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-32 -right-20 h-80 w-80 animate-float rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 animate-float rounded-full bg-gold/15 blur-3xl [animation-delay:-4s]" />
        </div>
        <motion.form
          variants={staggerParent}
          initial="hidden"
          animate="show"
          onSubmit={onSubmit}
          className="relative w-full max-w-sm"
        >
          <motion.div variants={fadeUp} className="mb-8">
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="mb-6 block w-fit"
            >
              <BrandLogo size={88} priority />
            </motion.span>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Welcome <span className="text-gradient">back</span>
            </h2>
            <p className="mt-2 text-sm text-muted">Sign in to book visits and manage your account. Parlour staff sign in here too.</p>
          </motion.div>

          <motion.div animate={shake} className="flex flex-col gap-4">
            <motion.label variants={fadeUp} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-2">Email</span>
              <div className="group relative">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ansita.com"
                  className="h-12 pl-10"
                />
              </div>
            </motion.label>
            <motion.label variants={fadeUp} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-2">Password</span>
              <div className="group relative">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
                <Input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted hover:text-ink"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.label>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
              >
                {error}
              </motion.p>
            )}

            <motion.div variants={fadeUp}>
              <Button type="submit" size="lg" loading={loading} className="group mt-2 w-full">
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-6 text-center text-sm text-muted">
            New to Ansita?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </motion.p>
          <motion.p variants={fadeUp} className="mt-3 text-center text-xs">
            <Link href="/" className="text-muted hover:text-primary">
              ← Back to the website
            </Link>
          </motion.p>
        </motion.form>
      </div>
    </div>
  );
}
