"use client";

import { motion } from "motion/react";
import { Crown, KeyRound, LogOut, MapPin, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Card, Dropdown, ErrorState, Field, ImageUpload, Input, PageHeader, Skeleton } from "@/components/ui";
import { api, tokenStore } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useAction, useMyCustomer } from "@/lib/queries";
import type { Customer, Gender, User } from "@/lib/types";

function Section({ icon, title, subtitle, children, delay = 0 }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; delay?: number }) {
  return (
    <Card initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring", stiffness: 220, damping: 24 }} className="p-4 sm:p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-plum-soft text-primary">{icon}</span>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

/** Profile photo: uploads straight away and saves it to the account (the app shows the same photo). */
function PhotoForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const save = useAction((avatar: string | null) => api.patch<User>("/auth/me", { avatar }), {
    invalidate: ["customers"],
    success: (_, avatar) => (avatar ? "Profile photo updated" : "Photo removed"),
    onSuccess: (updated) => setUser(updated),
  });
  return (
    <ImageUpload
      label="Profile photo"
      shape="round"
      hint="A square photo of your face works best. It also shows in the app."
      value={user.avatar && /^https?:\/\//.test(user.avatar) ? user.avatar : ""}
      onChange={(url) => save.mutate(url || null)}
    />
  );
}

function AccountForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone });
  const save = useAction(() => api.patch<User>("/auth/me", { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() }), {
    invalidate: ["customers"],
    success: "Account updated",
    onSuccess: (updated) => setUser(updated),
  });
  const dirty = form.name !== user.name || form.email !== user.email || form.phone !== user.phone;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <PhotoForm user={user} />
      </div>
      <Field label="Full name" className="sm:col-span-2">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
      </Field>
      <Field label="Email">
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </Field>
      <Field label="Phone">
        <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={!dirty} loading={save.isPending} icon={<Save className="h-4 w-4" />}>
          Save account
        </Button>
      </div>
    </form>
  );
}

function PersonalForm({ customer }: { customer: Customer }) {
  const [form, setForm] = useState({
    gender: customer.gender,
    dob: customer.dob ?? "",
    line1: customer.address?.line1 ?? "",
    line2: customer.address?.line2 ?? "",
    city: customer.address?.city ?? "",
    province: customer.address?.province ?? "",
    postalCode: customer.address?.postalCode ?? "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });
  const save = useAction(
    () =>
      api.patch<Customer>(`/customers/${customer.id}`, {
        gender: form.gender,
        dob: form.dob || null,
        address: { line1: form.line1, line2: form.line2, city: form.city, province: form.province, postalCode: form.postalCode },
      }),
    { invalidate: ["customers"], success: "Details saved" },
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Gender">
        <Dropdown value={form.gender} onChange={(v) => setForm({ ...form, gender: v as Gender })} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]} />
      </Field>
      <Field label="Date of birth" hint="We'll send you a birthday treat.">
        <Input type="date" value={form.dob} onChange={set("dob")} />
      </Field>
      <Field label="Address line 1" className="sm:col-span-2">
        <Input value={form.line1} onChange={set("line1")} placeholder="Street, tole" />
      </Field>
      <Field label="Address line 2" className="sm:col-span-2">
        <Input value={form.line2} onChange={set("line2")} />
      </Field>
      <Field label="City">
        <Input value={form.city} onChange={set("city")} />
      </Field>
      <Field label="Province">
        <Input value={form.province} onChange={set("province")} placeholder="e.g. Madhesh" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" loading={save.isPending} icon={<Save className="h-4 w-4" />}>
          Save details
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const mismatch = form.confirm.length > 0 && form.next !== form.confirm;
  const change = useAction(
    () => api.post<{ token: string }>("/auth/change-password", { currentPassword: form.current, newPassword: form.next }),
    {
      invalidate: [],
      success: "Password changed",
      onSuccess: (result) => {
        // Older tokens stop working after a change; keep this session on the new one.
        if (result?.token) tokenStore.set(result.token);
        setForm({ current: "", next: "", confirm: "" });
      },
    },
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        change.mutate();
      }}
      className="grid gap-4 sm:grid-cols-3"
    >
      <Field label="Current password">
        <Input type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required />
      </Field>
      <Field label="New password" hint="At least 6 characters">
        <Input type="password" autoComplete="new-password" minLength={6} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required />
      </Field>
      <Field label="Confirm new password" error={mismatch ? "Passwords don't match" : undefined}>
        <Input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={mismatch || form.next.length < 6 || !form.current} loading={change.isPending} icon={<KeyRound className="h-4 w-4" />}>
          Change password
        </Button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const customer = useMyCustomer(user?.customerId);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Account" title="Profile" subtitle="Keep your details up to date so we can reach you." />

      <Card initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative mb-4 overflow-hidden p-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary-soft/70 via-plum-soft/40 to-gold-soft/60" />
        <div className="relative flex flex-wrap items-center gap-4">
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }}>
            <Avatar name={user.name} src={user.avatar} size={76} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-semibold text-ink">{user.name}</h2>
            <p className="text-sm text-ink-2">{user.email}</p>
            {customer.data && <p className="mt-1 text-xs text-muted">Member since {formatDate(customer.data.joinedAt.slice(0, 10), "MMMM yyyy")}</p>}
          </div>
          {customer.data && (
            <div className="flex items-center gap-2 rounded-2xl bg-surface/80 px-4 py-2.5 shadow-soft">
              <Crown className="h-5 w-5 text-gold" />
              <span className="text-sm">
                <span className="font-display text-lg font-semibold text-ink">{customer.data.loyaltyPoints}</span> <span className="text-muted">points</span>
              </span>
            </div>
          )}
          <Button
            variant="outline"
            icon={<LogOut className="h-4 w-4" />}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Section icon={<UserRound className="h-5 w-5" />} title="Account" subtitle="Used to sign in and for booking updates." delay={0.05}>
          <AccountForm key={`${user.name}|${user.email}|${user.phone}`} user={user} />
        </Section>

        <Section icon={<MapPin className="h-5 w-5" />} title="Personal details" delay={0.1}>
          {customer.error ? (
            <ErrorState error={customer.error} onRetry={() => customer.refetch()} />
          ) : !customer.data ? (
            <Skeleton className="h-56" />
          ) : (
            <PersonalForm key={customer.data.updatedAt} customer={customer.data} />
          )}
        </Section>

        <Section icon={<KeyRound className="h-5 w-5" />} title="Password" subtitle="You'll stay signed in on this device." delay={0.15}>
          <PasswordForm />
        </Section>
      </div>
    </div>
  );
}
