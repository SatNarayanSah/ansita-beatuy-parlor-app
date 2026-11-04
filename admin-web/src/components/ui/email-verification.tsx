"use client";

import { CheckCircle2, Info, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Input } from "./primitives";

export interface VerifiedEmail {
  email: string;
  token: string;
}

interface CodeSent {
  email: string;
  sentTo: string;
  expiresInMinutes: number;
  /** Only while the server has no email provider set up (development). */
  demoCode: string;
}

const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** True when `verified` proves exactly the address typed in the field. */
export const isEmailVerified = (email: string, verified: VerifiedEmail | null) =>
  verified !== null && verified.email === normalizeEmail(email);

/**
 * Sits under an email field: emails a 6-digit code, then checks it. On success the
 * parent gets a short-lived token to send with sign-up or an email change.
 * Editing the email afterwards makes it unverified again.
 */
export function EmailVerification({
  email,
  verified,
  onVerified,
}: {
  email: string;
  verified: VerifiedEmail | null;
  onVerified: (value: VerifiedEmail) => void;
}) {
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const current = normalizeEmail(email);
  // A code sent to an address that has since been edited no longer applies.
  const pending = sent && sent.email === current ? sent : null;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function sendCode() {
    setError("");
    setSending(true);
    try {
      const result = await api.post<CodeSent>("/auth/email/send-code", { email: current });
      setSent(result);
      setCode("");
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  async function checkCode(value: string) {
    if (!/^\d{6}$/.test(value) || checking) return;
    setError("");
    setChecking(true);
    try {
      const result = await api.post<{ email: string; verificationToken: string }>("/auth/email/verify", { email: current, code: value });
      onVerified({ email: result.email, token: result.verificationToken });
      setSent(null);
      setCode("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  if (isEmailVerified(email, verified)) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-success" aria-live="polite">
        <CheckCircle2 className="h-4 w-4" /> Email verified
      </p>
    );
  }

  if (!pending) {
    return (
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          icon={<MailCheck className="h-4 w-4" />}
          loading={sending}
          disabled={!EMAIL_RE.test(current)}
          onClick={sendCode}
        >
          Send verification code
        </Button>
        <p className={error ? "text-xs text-danger" : "text-xs text-muted"}>
          {error || "We'll email you a 6-digit code to confirm the address is yours."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <p className="text-xs text-ink-2">
        Enter the 6-digit code we sent to <strong>{pending.sentTo}</strong>. It expires in {pending.expiresInMinutes} minutes.
      </p>
      {pending.demoCode && (
        <p className="flex items-center gap-1.5 rounded-lg bg-gold-soft px-2.5 py-1.5 text-xs text-ink">
          <Info className="h-3.5 w-3.5" /> Test mode, your code is <strong>{pending.demoCode}</strong>
        </p>
      )}
      <div className="flex gap-2">
        <Input
          aria-label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="6-digit code"
          value={code}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            setCode(digits);
            if (digits.length === 6) void checkCode(digits);
          }}
          onKeyDown={(e) => {
            // Inside the sign-up form, Enter should check the code, not submit the form.
            if (e.key === "Enter") {
              e.preventDefault();
              void checkCode(code);
            }
          }}
          className="tracking-[0.3em]"
        />
        <Button size="sm" className="h-10" loading={checking} disabled={code.length !== 6} onClick={() => checkCode(code)}>
          Verify
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button variant="ghost" size="sm" className="w-fit" loading={sending} disabled={secondsLeft > 0} onClick={sendCode}>
        {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
      </Button>
    </div>
  );
}
