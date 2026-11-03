"use client";

import { AnimatePresence, motion } from "motion/react";
import { Send } from "lucide-react";
import { useState } from "react";
import { Button, Dropdown, Field, Input, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sendEnquiry } from "@/lib/queries";

export const SUBJECTS = ["General enquiry", "Booking question", "Bridal package", "Academy & courses", "Feedback"];

function SuccessMark() {
  return (
    <motion.svg viewBox="0 0 52 52" className="h-20 w-20" initial="hidden" animate="show">
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.6, ease: "easeOut" } } }}
      />
      <motion.path
        d="M15 27l7 7 15-16"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { delay: 0.5, duration: 0.4, ease: "easeOut" } } }}
      />
    </motion.svg>
  );
}

/** Contact form → POST /contact. The parlour sees it as an admin notification. */
export function EnquiryForm({ defaultSubject = "General enquiry", subjects = SUBJECTS, onDone }: { defaultSubject?: string; subjects?: string[]; onDone?: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    subject: defaultSubject,
    message: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const allSubjects = subjects.includes(form.subject) ? subjects : [form.subject, ...subjects];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Add a phone number or email so we can reply.");
      return;
    }
    setSending(true);
    try {
      await sendEnquiry({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 py-7 text-center"
        >
          <SuccessMark />
          <h3 className="font-display text-2xl font-semibold text-ink">Message sent!</h3>
          <p className="max-w-sm text-sm text-muted">Thank you, {form.name.split(" ")[0]}. Our team will get back to you shortly.</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSent(false);
                setForm((f) => ({ ...f, message: "" }));
              }}
            >
              Send another
            </Button>
            {onDone && <Button onClick={onDone}>Done</Button>}
          </div>
        </motion.div>
      ) : (
        <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <Input required minLength={2} value={form.name} onChange={set("name")} placeholder="Sita Sharma" autoComplete="name" />
            </Field>
            <Field label="Subject">
              <Dropdown value={form.subject} onChange={(v) => setForm((f) => ({ ...f, subject: v }))} options={allSubjects.map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="98XXXXXXXX" autoComplete="tel" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" />
            </Field>
          </div>
          <Field label="Message">
            <Textarea required minLength={5} rows={5} value={form.message} onChange={set("message")} placeholder="How can we help?" />
          </Field>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-danger-soft px-3 py-2 text-xs font-medium text-danger"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <Button type="submit" size="lg" loading={sending} icon={<Send className="h-4 w-4" />} className="self-start">
            Send message
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
