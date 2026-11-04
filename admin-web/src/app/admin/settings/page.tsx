"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellRing, Building2, CalendarOff, Gift, KeyRound, Landmark, Plus, Save, Trash2, UserCog, Wallet } from "lucide-react";
import { useState } from "react";
import { OpenFromUrl } from "@/components/layout/open-from-url";
import { AccountDetails } from "@/components/payments/payment-requests";
import {
  Avatar,
  Button,
  Card,
  EmailVerification,
  EmptyState,
  ErrorState,
  Field,
  ImageUpload,
  Input,
  isEmailVerified,
  useEmailVerificationRequired,
  normalizeEmail,
  PageHeader,
  Skeleton,
  Switch,
  Tabs,
  Textarea,
  type VerifiedEmail,
} from "@/components/ui";
import { api, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { mobileNumberError, phoneHint } from "@/lib/phone";
import { formatDate, label, money, ONLINE_METHODS, relativeDay, todayISO } from "@/lib/format";
import { useAction, useSettings } from "@/lib/queries";
import type { AdminAlerts, BusinessProfile, BusinessSettings, LoyaltyRules, OnlineMethod, PaymentAccount, PaymentSettings, User } from "@/lib/types";

type Section = "profile" | "holidays" | "loyalty" | "payments" | "alerts" | "account";
const SECTIONS: Section[] = ["profile", "holidays", "loyalty", "payments", "alerts", "account"];

function Panel({ icon, title, description, children, footer }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 240, damping: 26 }} className="overflow-hidden">
      <div className="flex items-start gap-4 border-b border-line p-4">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-soft to-plum-soft text-primary"
        >
          {icon}
        </motion.span>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line bg-bg/50 px-4 py-3">{footer}</div>}
    </Card>
  );
}

// ---------- Profile ----------

function ProfileSection({ profile }: { profile: BusinessProfile }) {
  const [form, setForm] = useState(profile);
  const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => setForm((f) => ({ ...f, [key]: value }));
  const save = useAction(() => api.patch<BusinessSettings>("/settings/profile", form), { invalidate: ["settings"], success: "Business profile saved" });
  const dirty = JSON.stringify(form) !== JSON.stringify(profile);
  return (
    <Panel
      icon={<Building2 className="h-5 w-5" />}
      title="Business profile"
      description="Shown to customers in the app."
      footer={
        <>
          {dirty && (
            <Button variant="ghost" onClick={() => setForm(profile)}>
              Reset
            </Button>
          )}
          <Button icon={<Save className="h-4 w-4" />} loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Parlour name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Tagline">
          <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Opens">
            <Input type="time" value={form.openTime} onChange={(e) => set("openTime", e.target.value)} />
          </Field>
          <Field label="Closes">
            <Input type="time" value={form.closeTime} onChange={(e) => set("closeTime", e.target.value)} />
          </Field>
        </div>
        <Field label="Address" className="sm:col-span-2">
          <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} className="min-h-[64px]" />
        </Field>
      </div>
    </Panel>
  );
}

// ---------- Holidays ----------

function HolidaysSection({ holidays }: { holidays: BusinessSettings["holidays"] }) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const today = todayISO();
  const add = useAction(() => api.post("/settings/holidays", { date, name }), {
    invalidate: ["settings"],
    success: "Holiday added",
    onSuccess: () => {
      setDate("");
      setName("");
    },
  });
  const remove = useAction((d: string) => api.del(`/settings/holidays/${d}`), { invalidate: ["settings"], success: "Holiday removed" });
  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Panel icon={<CalendarOff className="h-5 w-5" />} title="Holidays" description="No bookings can be made on these days. Days that already have bookings can't be closed.">
      <form
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (date && name.trim()) add.mutate();
        }}
      >
        <Field label="Date" className="sm:w-48">
          <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Name" className="flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dashain (Vijaya Dashami)" />
        </Field>
        <Button type="submit" icon={<Plus className="h-4 w-4" />} loading={add.isPending} disabled={!date || !name.trim()}>
          Add
        </Button>
      </form>
      {sorted.length === 0 ? (
        <EmptyState icon={<CalendarOff className="h-7 w-7" />} title="No holidays set" message="The parlour is open every day." />
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sorted.map((h) => {
              const past = h.date < today;
              return (
                <motion.li
                  key={h.date}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: past ? 0.5 : 1, x: 0 }}
                  exit={{ opacity: 0, x: 30, height: 0 }}
                  className="flex items-center gap-4 rounded-xl border border-line p-3"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
                    <span className="text-[10px] font-semibold uppercase">{formatDate(h.date, "MMM")}</span>
                    <span className="font-display text-lg leading-none font-semibold">{formatDate(h.date, "d")}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{h.name}</p>
                    <p className="text-xs text-muted">{relativeDay(h.date)}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    loading={remove.isPending && remove.variables === h.date}
                    onClick={() => remove.mutate(h.date)}
                    aria-label={`Remove ${h.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </Panel>
  );
}

// ---------- Loyalty ----------

function LoyaltySection({ loyalty }: { loyalty: LoyaltyRules }) {
  const [form, setForm] = useState({
    enabled: loyalty.enabled,
    rupeesPerPoint: String(loyalty.rupeesPerPoint),
    pointValue: String(loyalty.pointValue),
    minRedeemPoints: String(loyalty.minRedeemPoints),
  });
  const save = useAction(
    () =>
      api.patch("/settings/loyalty", {
        enabled: form.enabled,
        rupeesPerPoint: Number(form.rupeesPerPoint),
        pointValue: Number(form.pointValue),
        minRedeemPoints: Number(form.minRedeemPoints),
      }),
    { invalidate: ["settings"], success: "Loyalty rules saved" },
  );
  const perPoint = Number(form.rupeesPerPoint) || 0;
  const value = Number(form.pointValue) || 0;
  const earned = perPoint > 0 ? Math.floor(1000 / perPoint) : 0;

  return (
    <Panel
      icon={<Gift className="h-5 w-5" />}
      title="Loyalty points"
      description="Customers earn points on completed visits and use them as a discount on a bill."
      footer={
        <Button icon={<Save className="h-4 w-4" />} loading={save.isPending} onClick={() => save.mutate()}>
          Save rules
        </Button>
      }
    >
      <div className="mb-4 flex items-center justify-between rounded-xl border border-line p-4">
        <div>
          <p className="text-sm font-semibold text-ink">Loyalty programme</p>
          <p className="text-xs text-muted">{form.enabled ? "Points are being awarded." : "No points are awarded while off."}</p>
        </div>
        <Switch checked={form.enabled} onChange={(enabled) => setForm((f) => ({ ...f, enabled }))} label="Enable loyalty" />
      </div>
      <motion.div animate={{ opacity: form.enabled ? 1 : 0.5 }} className="grid gap-4 sm:grid-cols-2">
        <Field label="Spend per point (NPR)" hint="Between Rs. 1 and Rs. 10,000">
          <Input type="number" min={1} max={10000} value={form.rupeesPerPoint} onChange={(e) => setForm((f) => ({ ...f, rupeesPerPoint: e.target.value }))} />
        </Field>
        <Field label="Value of one point (NPR)" hint="Between Rs. 0.01 and Rs. 100">
          <Input type="number" min={0.01} max={100} step={0.01} value={form.pointValue} onChange={(e) => setForm((f) => ({ ...f, pointValue: e.target.value }))} />
        </Field>
        <Field label="Points needed to use them" hint="A customer can use points as a discount once they have at least this many" className="sm:col-span-2">
          <Input type="number" min={0} max={100000} value={form.minRedeemPoints} onChange={(e) => setForm((f) => ({ ...f, minRedeemPoints: e.target.value }))} />
        </Field>
      </motion.div>
      <motion.div
        key={`${earned}-${value}`}
        initial={{ scale: 0.97, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mt-4 rounded-2xl bg-gradient-to-br from-gold-soft to-primary-soft p-4 text-sm text-ink"
      >
        A <b>Rs. 1,000</b> visit earns <b className="text-primary-dark">{earned} points</b>, worth <b className="text-gold-text">{money(earned * value)}</b> off a
        later visit, once they have <b>{Number(form.minRedeemPoints) || 0} points</b>.
      </motion.div>
    </Panel>
  );
}

// ---------- Online payments ----------

const METHOD_HINT: Record<OnlineMethod, string> = {
  esewa: "Your eSewa ID (mobile number) and QR from the eSewa merchant app.",
  khalti: "Your Khalti ID (mobile number) and QR.",
  fonepay: "Fonepay merchant QR; customers scan it from any bank app.",
  bank: "Bank account for direct transfers (Connect IPS, mobile banking).",
};

function PaymentsSection({ payments }: { payments: PaymentSettings }) {
  const [requests, setRequests] = useState(payments.requests);
  const [accounts, setAccounts] = useState<Record<OnlineMethod, PaymentAccount>>(() => ({
    esewa: payments.esewa,
    khalti: payments.khalti,
    fonepay: payments.fonepay,
    bank: payments.bank,
  }));
  const [method, setMethod] = useState<OnlineMethod>("esewa");
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<PaymentAccount>) => setAccounts((all) => ({ ...all, [method]: { ...all[method], ...patch } }));
  const account = accounts[method];
  const save = useAction(
    () => api.patch("/settings/payments", { requests, ...Object.fromEntries(ONLINE_METHODS.map((m) => [m, { ...accounts[m], qr: accounts[m].qr || null }])) }),
    { invalidate: ["settings"], success: "Payment accounts saved" },
  );
  const missing = ONLINE_METHODS.filter((m) => accounts[m].enabled && !accounts[m].accountNumber.trim() && !accounts[m].qr);

  return (
    <Panel
      icon={<Wallet className="h-5 w-5" />}
      title="Online payments"
      description="Where customers can pay you directly. After paying they send the transaction ID, and you approve it in Payments."
      footer={
        <Button icon={<Save className="h-4 w-4" />} loading={save.isPending} disabled={uploading || missing.length > 0} onClick={() => save.mutate()}>
          Save accounts
        </Button>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-line p-4">
        <div>
          <p className="text-sm font-semibold text-ink">&ldquo;I&apos;ve paid&rdquo; requests</p>
          <p className="text-xs text-muted">{requests ? "Customers can tell you they've paid online." : "Off: customers pay at the counter only."}</p>
        </div>
        <Switch checked={requests} onChange={setRequests} label="Allow payment requests" />
      </div>

      <motion.div animate={{ opacity: requests ? 1 : 0.5 }}>
        <Tabs
          value={method}
          onChange={setMethod}
          className="mb-4"
          options={ONLINE_METHODS.map((m) => ({ value: m, label: `${label(m)}${accounts[m].enabled ? " ✓" : ""}` }))}
        />
        <AnimatePresence mode="wait">
          <motion.div key={method} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <div className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-surface-alt/60 p-3">
              <p className="flex items-center gap-2 text-xs text-ink-2">
                <Landmark className="h-4 w-4 shrink-0 text-primary" /> {METHOD_HINT[method]}
              </p>
              <Switch checked={account.enabled} onChange={(enabled) => set({ enabled })} label={`Accept ${label(method)}`} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {method === "bank" && (
                <Field label="Bank name" className="sm:col-span-2">
                  <Input value={account.bankName} onChange={(e) => set({ bankName: e.target.value })} placeholder="e.g. Nabil Bank, Janakpur branch" maxLength={120} />
                </Field>
              )}
              <Field label="Account name">
                <Input value={account.accountName} onChange={(e) => set({ accountName: e.target.value })} placeholder="Ansita Beauty Parlour" maxLength={120} />
              </Field>
              <Field
                label={method === "bank" ? "Account number" : `${label(method)} ID / number`}
                error={account.enabled && !account.accountNumber.trim() && !account.qr ? "Add a number or a QR code" : undefined}
              >
                <Input value={account.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} className="font-mono" maxLength={64} />
              </Field>
              <Field label="Instructions for customers (optional)" className="sm:col-span-2">
                <Input value={account.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="e.g. Write your name in the remarks" maxLength={300} />
              </Field>
              <ImageUpload
                label="QR code (optional)"
                shape="square"
                hint="Customers can scan it to pay."
                value={account.qr}
                onChange={(qr) => set({ qr: qr || null })}
                onUploadingChange={setUploading}
              />
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-2">What customers see</p>
                {account.enabled ? (
                  <AccountDetails method={method} account={account} />
                ) : (
                  <p className="rounded-2xl border border-dashed border-line p-4 text-center text-xs text-muted">Turn {label(method)} on to offer it.</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </Panel>
  );
}

// ---------- Alerts ----------

const ALERT_ROWS: { key: keyof AdminAlerts; title: string; description: string }[] = [
  { key: "newBookings", title: "New bookings", description: "When a customer requests an appointment in the app." },
  { key: "cancellations", title: "Cancellations", description: "When a customer cancels a booking." },
  { key: "payments", title: "Payments", description: "When a customer says they've paid online and it needs checking." },
  { key: "enrollments", title: "Enrollments", description: "When a student joins a course." },
];

function AlertsSection({ alerts }: { alerts: AdminAlerts }) {
  const save = useAction((patch: Partial<AdminAlerts>) => api.patch("/settings/alerts", patch), { invalidate: ["settings"], success: "Alert preference saved" });
  return (
    <Panel icon={<BellRing className="h-5 w-5" />} title="Admin alerts" description="Choose which events notify admins.">
      <ul className="flex flex-col divide-y divide-line">
        {ALERT_ROWS.map((row, i) => (
          <motion.li key={row.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{row.title}</p>
              <p className="text-xs text-muted">{row.description}</p>
            </div>
            <Switch
              checked={save.isPending && save.variables && row.key in save.variables ? !!save.variables[row.key] : alerts[row.key]}
              disabled={save.isPending}
              onChange={(v) => save.mutate({ [row.key]: v })}
              label={row.title}
            />
          </motion.li>
        ))}
      </ul>
    </Panel>
  );
}

// ---------- Account ----------

function AccountSection() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [verified, setVerified] = useState<VerifiedEmail | null>(null);
  // True only when the new address needs an emailed code (off while the server can't send email).
  const verificationRequired = useEmailVerificationRequired();
  const emailChanged = verificationRequired && normalizeEmail(form.email) !== normalizeEmail(user?.email ?? "");
  const phoneChanged = form.phone.trim() !== (user?.phone ?? "");
  const hint = phoneChanged ? phoneHint(form.phone) : null;
  const blocked = (emailChanged && !isEmailVerified(form.email, verified)) || (phoneChanged && Boolean(mobileNumberError(form.phone)));
  const saveProfile = useAction(
    () => api.patch<User>("/auth/me", { ...form, ...(emailChanged && verified ? { emailVerificationToken: verified.token } : {}) }),
    {
    invalidate: [],
    success: "Account updated",
    onSuccess: (me) => setUser(me),
    },
  );
  const changePassword = useAction(
    () => api.post<{ token: string }>("/auth/change-password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
    {
      invalidate: [],
      success: "Password changed. Other devices have been signed out.",
      onSuccess: ({ token }) => {
        tokenStore.set(token);
        setPw({ currentPassword: "", newPassword: "", confirm: "" });
      },
    },
  );
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.newPassword;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel
        icon={<UserCog className="h-5 w-5" />}
        title="Your account"
        description="Name and contact details for your admin login."
        footer={
          <Button icon={<Save className="h-4 w-4" />} loading={saveProfile.isPending} disabled={form.name.trim().length < 2 || blocked} onClick={() => saveProfile.mutate()}>
            Save
          </Button>
        }
      >
        <div className="mb-4 flex items-center gap-4">
          <Avatar name={form.name || "?"} src={user?.avatar} size={56} />
          <div>
            <p className="font-semibold text-ink">{user?.name}</p>
            <p className="text-xs text-muted">Admin</p>
          </div>
        </div>
        <div className="grid gap-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="flex flex-col gap-2">
            <Field label="Email" hint={emailChanged ? "Confirm the new address with a code before saving." : "Used to sign in."}>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            {emailChanged && <EmailVerification email={form.email} verified={verified} onVerified={setVerified} />}
          </div>
          <Field label="Mobile (NTC or Ncell)" error={hint?.error ? hint.text : undefined} hint={hint && !hint.error ? hint.text : undefined}>
            <Input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
        </div>
      </Panel>
      <Panel
        icon={<KeyRound className="h-5 w-5" />}
        title="Change password"
        description="Signs out every other device using this account."
        footer={
          <Button
            icon={<KeyRound className="h-4 w-4" />}
            loading={changePassword.isPending}
            disabled={!pw.currentPassword || pw.newPassword.length < 6 || pw.newPassword !== pw.confirm}
            onClick={() => changePassword.mutate()}
          >
            Update password
          </Button>
        }
      >
        <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
          <Field label="Current password">
            <Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} />
          </Field>
          <Field label="New password" hint="At least 6 characters.">
            <Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} />
          </Field>
          <Field label="Confirm new password" error={mismatch ? "Passwords don't match" : undefined}>
            <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
          </Field>
        </form>
      </Panel>
    </div>
  );
}

// ---------- Page ----------

export default function SettingsPage() {
  const settings = useSettings();
  const [section, setSection] = useState<Section>("profile");
  const data = settings.data;

  return (
    <div>
      <PageHeader eyebrow="Business" title="Settings" subtitle="Parlour profile, holidays, loyalty, online payments, alerts and your account." />
      <OpenFromUrl param="tab" onOpen={(tab) => SECTIONS.includes(tab as Section) && setSection(tab as Section)} />
      <Tabs
        value={section}
        onChange={setSection}
        className="mb-4"
        options={[
          { value: "profile", label: "Profile" },
          { value: "holidays", label: "Holidays", count: data?.holidays.filter((h) => h.date >= todayISO()).length },
          { value: "loyalty", label: "Loyalty" },
          { value: "payments", label: "Payments" },
          { value: "alerts", label: "Alerts" },
          { value: "account", label: "Account" },
        ]}
      />
      {settings.error ? (
        <ErrorState error={settings.error} onRetry={() => settings.refetch()} />
      ) : !data ? (
        <Skeleton className="h-96" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={section} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
            {section === "profile" && <ProfileSection key={JSON.stringify(data.profile)} profile={data.profile} />}
            {section === "holidays" && <HolidaysSection holidays={data.holidays} />}
            {section === "loyalty" && <LoyaltySection key={JSON.stringify(data.loyalty)} loyalty={data.loyalty} />}
            {section === "payments" && <PaymentsSection key={JSON.stringify(data.payments)} payments={data.payments} />}
            {section === "alerts" && <AlertsSection alerts={data.alerts} />}
            {section === "account" && <AccountSection />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
