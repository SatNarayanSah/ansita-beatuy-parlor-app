"use client";

import { AnimatePresence, motion } from "motion/react";
import { Copy, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, ImageUpload, Input, Modal, PageHeader, Select, Skeleton, Switch, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { addDaysISO, formatDate, money, todayISO, type Tone } from "@/lib/format";
import { useAction, useCategories, useOffers } from "@/lib/queries";
import type { DiscountType, Offer } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "live" | "scheduled" | "expired" | "paused";

function phaseOf(offer: Offer, today: string): Phase {
  if (!offer.isActive) return "paused";
  if (offer.validTo < today) return "expired";
  if (offer.validFrom > today) return "scheduled";
  return "live";
}

const PHASE_TONE: Record<Phase, Tone> = { live: "green", scheduled: "blue", expired: "gray", paused: "amber" };
const PHASE_LABEL: Record<Phase, string> = { live: "Live", scheduled: "Scheduled", expired: "Expired", paused: "Paused" };

function discountText(offer: Pick<Offer, "discountType" | "discountValue">) {
  return offer.discountType === "percent" ? `${offer.discountValue}% off` : `${money(offer.discountValue)} off`;
}

// ---------- Editor ----------

function OfferEditor({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const categories = useCategories();
  const today = todayISO();
  const [form, setForm] = useState({
    title: offer?.title ?? "",
    description: offer?.description ?? "",
    code: offer?.code ?? "",
    discountType: offer?.discountType ?? ("percent" as DiscountType),
    discountValue: String(offer?.discountValue ?? ""),
    maxDiscount: offer?.maxDiscount != null ? String(offer.maxDiscount) : "",
    minSpend: String(offer?.minSpend ?? 0),
    categoryIds: offer?.categoryIds ?? [],
    validFrom: offer?.validFrom ?? today,
    validTo: offer?.validTo ?? addDaysISO(today, 30),
    terms: offer?.terms.join("\n") ?? "",
    image: offer?.image ?? "",
    isActive: offer?.isActive ?? true,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const [uploading, setUploading] = useState(false);

  const body = {
    ...form,
    code: form.code.trim().toUpperCase() || null,
    discountValue: Number(form.discountValue),
    maxDiscount: form.discountType === "percent" && form.maxDiscount ? Number(form.maxDiscount) : null,
    minSpend: Number(form.minSpend) || 0,
    terms: form.terms
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean),
    image: form.image.trim() || null,
  };
  const save = useAction(() => (offer ? api.patch(`/offers/${offer.id}`, body) : api.post("/offers", body)), {
    invalidate: ["offers"],
    success: offer ? "Offer updated" : "Offer created",
    onSuccess: onClose,
  });
  const value = Number(form.discountValue);
  const valid =
    form.title.trim().length >= 2 && value > 0 && (form.discountType === "flat" || value <= 100) && form.validFrom && form.validTo >= form.validFrom;

  return (
    <Modal
      open
      onClose={onClose}
      title={offer ? "Edit offer" : "New offer"}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!valid || uploading} onClick={() => save.mutate()}>
            Save offer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Dashain glow special" autoFocus />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="min-h-[64px]" />
        </Field>
        <Field label="Promo code" hint="Leave empty to apply automatically.">
          <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="GLOW20" className="font-mono tracking-wider" />
        </Field>
        <Field label="Discount type">
          <Select value={form.discountType} onChange={(e) => set("discountType", e.target.value as DiscountType)}>
            <option value="percent">Percentage</option>
            <option value="flat">Flat amount</option>
          </Select>
        </Field>
        <Field label={form.discountType === "percent" ? "Discount (%)" : "Discount (NPR)"} error={form.discountType === "percent" && value > 100 ? "Max 100%" : undefined}>
          <Input type="number" min={1} value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} />
        </Field>
        <AnimatePresence mode="popLayout">
          {form.discountType === "percent" ? (
            <motion.div key="max" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Field label="Max discount (NPR)" hint="Optional cap">
                <Input type="number" min={0} value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} />
              </Field>
            </motion.div>
          ) : (
            <motion.div key="spacer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hidden sm:block" />
          )}
        </AnimatePresence>
        <Field label="Minimum bill (NPR)">
          <Input type="number" min={0} value={form.minSpend} onChange={(e) => set("minSpend", e.target.value)} />
        </Field>
        <ImageUpload
          label="Offer banner (optional)"
          value={form.image}
          onChange={(url) => set("image", url)}
          onUploadingChange={setUploading}
          className="sm:col-span-2"
        />
        <Field label="Valid from">
          <Input type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
        </Field>
        <Field label="Valid to" error={form.validTo < form.validFrom ? "Must be after the start date" : undefined}>
          <Input type="date" value={form.validTo} min={form.validFrom} onChange={(e) => set("validTo", e.target.value)} />
        </Field>
        <Field label="Applies to" hint="No selection = every service." className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(categories.data ?? []).map((c) => {
              const on = form.categoryIds.includes(c.id);
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => set("categoryIds", on ? form.categoryIds.filter((id) => id !== c.id) : [...form.categoryIds, c.id])}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    on ? "border-transparent text-white" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                  style={on ? { background: c.color } : undefined}
                >
                  {!on && <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />}
                  {c.name}
                </motion.button>
              );
            })}
          </div>
        </Field>
        <Field label="Terms" hint="One per line." className="sm:col-span-2">
          <Textarea value={form.terms} onChange={(e) => set("terms", e.target.value)} className="min-h-[72px]" />
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-line p-3 sm:col-span-2">
          <div>
            <p className="text-sm font-medium text-ink">Active</p>
            <p className="text-xs text-muted">Paused offers are hidden from customers.</p>
          </div>
          <Switch checked={form.isActive} onChange={(v) => set("isActive", v)} label="Active" />
        </div>
      </div>
    </Modal>
  );
}

// ---------- Page ----------

export default function OffersPage() {
  const offers = useOffers();
  const categories = useCategories();
  const today = todayISO();
  const [phase, setPhase] = useState<"all" | Phase>("all");
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);

  const toggle = useAction(({ id, isActive }: { id: string; isActive: boolean }) => api.post(`/offers/${id}/active`, { isActive }), {
    invalidate: ["offers"],
    success: (_, v) => (v.isActive ? "Offer activated" : "Offer paused"),
  });
  const remove = useAction((id: string) => api.del(`/offers/${id}`), {
    invalidate: ["offers"],
    success: "Offer deleted",
    onSuccess: () => setDeleting(null),
  });

  const all = useMemo(() => [...(offers.data ?? [])].sort((a, b) => b.validTo.localeCompare(a.validTo)), [offers.data]);
  const list = all.filter((o) => phase === "all" || phaseOf(o, today) === phase);
  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        eyebrow="Parlour"
        title="Offers"
        subtitle="Promotions and promo codes shown in the app."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            New offer
          </Button>
        }
      />
      <Tabs
        value={phase}
        onChange={setPhase}
        className="mb-5"
        options={[
          { value: "all" as const, label: "All", count: all.length },
          ...(["live", "scheduled", "paused", "expired"] as Phase[]).map((p) => ({
            value: p,
            label: PHASE_LABEL[p],
            count: all.filter((o) => phaseOf(o, today) === p).length,
          })),
        ]}
      />

      {offers.error ? (
        <ErrorState error={offers.error} onRetry={() => offers.refetch()} />
      ) : offers.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Tag className="h-7 w-7" />} title="No offers here" message="Create a festive discount or a promo code." />
      ) : (
        <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((offer, i) => {
              const p = phaseOf(offer, today);
              return (
                <Card
                  key={offer.id}
                  layout
                  hover
                  initial={{ opacity: 0, y: 24, rotate: -1 }}
                  animate={{ opacity: p === "expired" ? 0.6 : 1, y: 0, rotate: 0, transition: { delay: Math.min(i, 9) * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative overflow-visible"
                >
                  {/* Coupon head */}
                  <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-primary via-primary-dark to-plum px-5 pt-5 pb-6 text-white">
                    <motion.div
                      className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="relative flex items-start justify-between gap-2">
                      <Badge tone={PHASE_TONE[p]} dot pulse={p === "live"} className="bg-white/90">
                        {PHASE_LABEL[p]}
                      </Badge>
                      <Switch checked={offer.isActive} onChange={(isActive) => toggle.mutate({ id: offer.id, isActive })} label="Active" />
                    </div>
                    <p className="relative mt-4 font-display text-4xl font-bold">{discountText(offer)}</p>
                    <p className="relative mt-1 text-sm text-white/85">{offer.title}</p>
                  </div>
                  {/* Perforation */}
                  <div className="relative h-0">
                    <span className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-bg" />
                    <span className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-bg" />
                    <div className="absolute inset-x-5 top-0 border-t-2 border-dashed border-line-strong" />
                  </div>
                  <div className="p-5">
                    {offer.code ? (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(offer.code!);
                          toast.success(`Copied ${offer.code}`);
                        }}
                        className="group/code mb-3 flex w-full cursor-pointer items-center justify-between rounded-xl border-2 border-dashed border-gold/60 bg-gold-soft px-3 py-2 font-mono text-sm font-bold tracking-[0.2em] text-gold-text"
                      >
                        {offer.code}
                        <Copy className="h-4 w-4 opacity-60 transition-transform group-hover/code:scale-110" />
                      </button>
                    ) : (
                      <p className="mb-3 rounded-xl bg-bg-deep px-3 py-2 text-xs text-muted">Applies automatically, no code needed</p>
                    )}
                    {offer.description && <p className="line-clamp-2 text-sm text-ink-2">{offer.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      <Badge tone="gray">
                        {formatDate(offer.validFrom, "d MMM")} – {formatDate(offer.validTo, "d MMM yyyy")}
                      </Badge>
                      {offer.minSpend > 0 && <Badge tone="gray">Min {money(offer.minSpend)}</Badge>}
                      {offer.maxDiscount != null && <Badge tone="gray">Up to {money(offer.maxDiscount)}</Badge>}
                      <Badge tone="rose">
                        {offer.categoryIds.length ? offer.categoryIds.map((id) => categoryName.get(id) ?? "?").join(", ") : "All services"}
                      </Badge>
                    </div>
                    <div className="mt-4 flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(offer)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5 text-danger" />} onClick={() => setDeleting(offer)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {editing && <OfferEditor key={editing === "new" ? "new" : editing.id} offer={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete offer?"
        message={
          <>
            <b>{deleting?.title}</b> will be removed from the app.
          </>
        }
      />
    </div>
  );
}
