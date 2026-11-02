"use client";

import { AnimatePresence, motion } from "motion/react";
import { Clock, Pencil, Plus, Scissors, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, ImageUpload, Input, Modal, PageHeader, SearchInput, Select, Skeleton, Switch, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { minutesLabel, money } from "@/lib/format";
import { useAction, useCategories, useServices } from "@/lib/queries";
import type { Service, ServiceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const SWATCHES = ["#a44a67", "#84374f", "#5A2D52", "#C79BC0", "#b08b3e", "#E0BC6E", "#3FA772", "#5B8AD6", "#E0655B", "#8A7C82"];

// ---------- Category modal ----------

function CategoryModal({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category: ServiceCategory | null;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "sparkles");
  const [color, setColor] = useState(category?.color ?? SWATCHES[0]);
  const save = useAction(
    () =>
      category
        ? api.patch(`/categories/${category.id}`, { name, icon, color })
        : api.post("/categories", { name, icon, color }),
    { invalidate: ["categories"], success: category ? "Category updated" : "Category added", onSuccess: onClose },
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? "Edit category" : "New category"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={name.trim().length < 2} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hair" autoFocus />
        </Field>
        <Field label="Icon" hint="Ionicons name used by the mobile app, e.g. cut, color-palette, sparkles">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
        </Field>
        <Field label="Colour">
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((swatch) => (
              <motion.button
                key={swatch}
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setColor(swatch)}
                className={cn(
                  "h-8 w-8 cursor-pointer rounded-full ring-offset-2 ring-offset-surface transition",
                  color.toLowerCase() === swatch.toLowerCase() && "ring-2 ring-ink",
                )}
                style={{ background: swatch }}
                aria-label={swatch}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-lg border border-line bg-transparent"
            />
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function CategoryManager({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: ServiceCategory[] }) {
  const [editing, setEditing] = useState<ServiceCategory | "new" | null>(null);
  const [deleting, setDeleting] = useState<ServiceCategory | null>(null);
  const remove = useAction((id: string) => api.del(`/categories/${id}`), {
    invalidate: ["categories"],
    success: "Category deleted",
    onSuccess: () => setDeleting(null),
  });
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Service categories"
        description="Groups shown in the app's service menu."
        footer={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            Add category
          </Button>
        }
      >
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {categories.map((category) => (
              <motion.li
                key={category.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 rounded-xl border border-line p-3"
              >
                <span className="h-4 w-4 rounded-full" style={{ background: category.color }} />
                <span className="flex-1 text-sm font-medium text-ink">{category.name}</span>
                <span className="text-xs text-muted">{category.icon}</span>
                <Button size="icon" variant="ghost" onClick={() => setEditing(category)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleting(category)} aria-label="Delete">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Modal>
      {editing && (
        <CategoryModal
          key={editing === "new" ? "new" : editing.id}
          open
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete category?"
        message={`"${deleting?.name}" will be removed. Categories that still have services can't be deleted.`}
      />
    </>
  );
}

// ---------- Service modal ----------

function ServiceModal({
  service,
  categories,
  defaultCategory,
  onClose,
}: {
  service: Service | null;
  categories: ServiceCategory[];
  defaultCategory?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: service?.name ?? "",
    categoryId: service?.categoryId ?? defaultCategory ?? categories[0]?.id ?? "",
    duration: String(service?.duration ?? 60),
    price: String(service?.price ?? ""),
    description: service?.description ?? "",
    image: service?.image ?? "",
    isActive: service?.isActive ?? true,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const [uploading, setUploading] = useState(false);
  const body = {
    ...form,
    duration: Number(form.duration),
    price: Number(form.price),
    image: form.image.trim() || null,
  };
  const save = useAction(() => (service ? api.patch(`/services/${service.id}`, body) : api.post("/services", body)), {
    invalidate: ["services"],
    success: service ? "Service updated" : "Service added",
    onSuccess: onClose,
  });
  const valid = form.name.trim().length >= 2 && form.categoryId && Number(form.duration) > 0 && form.price !== "" && Number(form.price) >= 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={service ? "Edit service" : "New service"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!valid || uploading} onClick={() => save.mutate()}>
            Save service
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Bridal makeup" autoFocus />
        </Field>
        <Field label="Category" className="sm:col-span-2">
          <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duration (minutes)" hint={Number(form.duration) > 0 ? minutesLabel(Number(form.duration)) : undefined}>
          <Input type="number" min={5} step={5} value={form.duration} onChange={(e) => set("duration", e.target.value)} />
        </Field>
        <Field label="Price (NPR)">
          <Input type="number" min={0} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="1500" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <ImageUpload
          label="Service image (optional)"
          value={form.image}
          onChange={(url) => set("image", url)}
          onUploadingChange={setUploading}
          className="sm:col-span-2"
        />
        <div className="flex items-center justify-between rounded-xl border border-line p-3 sm:col-span-2">
          <div>
            <p className="text-sm font-medium text-ink">Bookable</p>
            <p className="text-xs text-muted">Inactive services are hidden from the app.</p>
          </div>
          <Switch checked={form.isActive} onChange={(v) => set("isActive", v)} label="Active" />
        </div>
      </div>
    </Modal>
  );
}

// ---------- Page ----------

export default function ServicesPage() {
  const services = useServices();
  const categories = useCategories();
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [managing, setManaging] = useState(false);

  const toggle = useAction(({ id, isActive }: { id: string; isActive: boolean }) => api.post(`/services/${id}/active`, { isActive }), {
    invalidate: ["services"],
    success: (_, v) => (v.isActive ? "Service is bookable again" : "Service hidden from the app"),
  });
  const remove = useAction((id: string) => api.del(`/services/${id}`), {
    invalidate: ["services"],
    success: "Service deleted",
    onSuccess: () => setDeleting(null),
  });

  const categoryList = useMemo(() => [...(categories.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [categories.data]);
  const categoryMap = useMemo(() => new Map(categoryList.map((c) => [c.id, c])), [categoryList]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (services.data ?? [])
      .filter((s) => category === "all" || s.categoryId === category)
      .filter((s) => !needle || s.name.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
  }, [services.data, category, query]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (services.data ?? []).forEach((s) => map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + 1));
    return map;
  }, [services.data]);

  const error = services.error || categories.error;

  return (
    <div>
      <PageHeader
        eyebrow="Parlour"
        title="Services"
        subtitle={`${services.data?.length ?? 0} services across ${categoryList.length} categories`}
        actions={
          <>
            <Button variant="outline" icon={<Settings2 className="h-4 w-4" />} onClick={() => setManaging(true)}>
              Categories
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")} disabled={!categoryList.length}>
              New service
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: "all", name: "All", color: "var(--primary)" }, ...categoryList].map((c) => {
            const active = category === c.id;
            const count = c.id === "all" ? services.data?.length ?? 0 : counts.get(c.id) ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "relative flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  active ? "border-transparent text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="service-cat"
                    className="absolute inset-0 rounded-full"
                    style={{ background: c.color }}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                {!active && <span className="relative h-2 w-2 rounded-full" style={{ background: c.color }} />}
                <span className="relative">{c.name}</span>
                <span className={cn("relative tabular-nums", active ? "text-white/80" : "text-muted")}>{count}</span>
              </button>
            );
          })}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search services…" className="lg:w-72" />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => (services.refetch(), categories.refetch())} />
      ) : services.isLoading || categories.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Scissors className="h-7 w-7" />}
          title={query ? "No matching services" : "No services yet"}
          message={query ? "Try a different search." : "Add the treatments customers can book."}
          action={
            !query && categoryList.length > 0 ? (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
                New service
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((service, i) => {
              const cat = categoryMap.get(service.categoryId);
              return (
                <Card
                  key={service.id}
                  layout
                  hover
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: service.isActive ? 1 : 0.6, y: 0, scale: 1, transition: { delay: Math.min(i, 12) * 0.035 } }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                  className="group relative flex flex-col overflow-hidden p-5"
                >
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: cat?.color ?? "var(--primary)" }} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge tone="gray" className="mb-2">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat?.color }} />
                        {cat?.name ?? "Uncategorised"}
                      </Badge>
                      <h3 className="font-display text-lg leading-snug font-semibold text-ink">{service.name}</h3>
                    </div>
                    <Switch
                      checked={service.isActive}
                      disabled={toggle.isPending && toggle.variables?.id === service.id}
                      onChange={(isActive) => toggle.mutate({ id: service.id, isActive })}
                      label="Active"
                    />
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-muted">{service.description || "No description"}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="font-display text-2xl font-semibold text-primary-dark">{money(service.price)}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" /> {minutesLabel(service.duration)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(service)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(service)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {editing && (
        <ServiceModal
          key={editing === "new" ? "new" : editing.id}
          service={editing === "new" ? null : editing}
          categories={categoryList}
          defaultCategory={category !== "all" ? category : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      <CategoryManager open={managing} onClose={() => setManaging(false)} categories={categoryList} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete service?"
        message={
          <>
            <b>{deleting?.name}</b> will be removed permanently. Services with bookings can&apos;t be deleted; switch them off instead.
          </>
        }
      />
    </div>
  );
}
