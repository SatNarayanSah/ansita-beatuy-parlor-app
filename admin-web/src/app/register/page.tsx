"use client";

import { motion, useAnimationControls } from "motion/react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShowcase } from "@/components/layout/auth-showcase";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  Button,
  EmailVerification,
  fadeUp,
  Input,
  isEmailVerified,
  staggerParent,
  useEmailVerificationRequired,
  type VerifiedEmail,
} from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { mobileNumberError, phoneHint } from "@/lib/phone";

function IconInput({
  icon: Icon,
  label,
  ...props
}: { icon: typeof Mail; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <motion.label variants={fadeUp} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-2">{label}</span>
      <div className="group relative">
        <Icon className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
        <Input {...props} className="h-12 pl-10" />
      </div>
    </motion.label>
  );
}

export default function RegisterPage() {
  const { register, status, user } = useAuth();
  const router = useRouter();
  const shake = useAnimationControls();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<VerifiedEmail | null>(null);
  const verificationRequired = useEmailVerificationRequired();
  const hint = phoneHint(form.phone);
  const set =(key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (status === "signed-in" && user && !loading) router.replace(homeFor(user));
  }, [status, user, router, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const problem = verificationRequired && (!verified || !isEmailVerified(form.email, verified))
      ? "Verify your email with the code we send you."
      : mobileNumberError(form.phone) || (form.password.length < 6 ? "Use at least 6 characters for your password." : "");
    if (problem) {
      setError(problem);
      shake.start({ x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.5 } });
      return;
    }
    setLoading(true);
    try {
      const created = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        emailVerificationToken: verified?.token ?? "",
      });
      router.replace(homeFor(created));
    } catch (err) {
      setError(errorMessage(err));
      shake.start({ x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.5 } });
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <AuthShowcase />
      <div className="relative flex items-center justify-center px-4 py-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-32 -right-20 h-80 w-80 animate-float rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 animate-float rounded-full bg-gold/15 blur-3xl [animation-delay:-4s]" />
        </div>
        <motion.form variants={staggerParent} initial="hidden" animate="show" onSubmit={onSubmit} className="relative w-full max-w-sm">
          <motion.div variants={fadeUp} className="mb-6">
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
              className="mb-4 block w-fit"
            >
              <BrandLogo size={88} priority />
            </motion.span>
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Join <span className="text-gradient">Ansita</span>
            </h2>
            <p className="mt-2 text-sm text-muted">
              Create an account to book visits online. Been here before? Use the same phone number and we&apos;ll keep your history.
            </p>
          </motion.div>

          <motion.div animate={shake} className="flex flex-col gap-4">
            <IconInput icon={UserIcon} label="Full name" required minLength={2} autoComplete="name" value={form.name} onChange={set("name")} placeholder="Sita Sharma" />
            <IconInput icon={Mail} label="Email" type="email" required autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
            {verificationRequired && (
              <motion.div variants={fadeUp}>
                <EmailVerification email={form.email} verified={verified} onVerified={setVerified} />
              </motion.div>
            )}
            <div className="flex flex-col gap-1.5">
              <IconInput icon={Phone} label="Mobile (NTC or Ncell)" type="tel" required minLength={5} autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="98XXXXXXXX" />
              {hint && <p className={hint.error ? "text-xs text-danger" : "text-xs text-success"}>{hint.text}</p>}
            </div>
            <motion.label variants={fadeUp} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-2">Password</span>
              <div className="group relative">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
                <Input
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 6 characters"
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
                Create account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-4 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
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
