"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Button, Dropdown, Field, Input, Modal, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { label } from "@/lib/format";
import { useAction } from "@/lib/queries";
import type { Customer, CustomerTag, Gender } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CUSTOMER_TAGS: CustomerTag[] = ["vip", "regular", "new", "bridal", "student", "inactive"];

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  gender: "female" as Gender,
  dob: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
  notes: "",
  tags: [] as CustomerTag[],
};

function fromCustomer(c: Customer | null) {
  if (!c) return EMPTY;
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    gender: c.gender,
    dob: c.dob ?? "",
    line1: c.address?.line1 ?? "",
    line2: c.address?.line2 ?? "",
    city: c.address?.city ?? "",
    province: c.address?.province ?? "",
    postalCode: c.address?.postalCode ?? "",
    notes: c.notes,
    tags: c.tags,
  };
}

/** Mount with a `key` per customer so the form starts from that customer's values. */
export function CustomerForm({ customer, open, onClose, onSaved }: { customer: Customer | null; open: boolean; onClose: () => void; onSaved?: (c: Customer) => void }) {
  const [form, setForm] = useState(() => fromCustomer(customer));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = useAction(
    () => {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        gender: form.gender,
        dob: form.dob || null,
        address: { line1: form.line1, line2: form.line2, city: form.city, province: form.province, postalCode: form.postalCode },
        notes: form.notes,
        tags: form.tags,
      };
      return customer ? api.patch<Customer>(`/customers/${customer.id}`, body) : api.post<Customer>("/customers", body);
    },
    {
      invalidate: ["customers"],
      success: customer ? "Customer updated" : "Customer added",
      onSuccess: (c) => {
        onSaved?.(c);
        onClose();
      },
    },
  );

  const valid = form.name.trim().length >= 2 && form.phone.trim().length >= 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? "Edit customer" : "New customer"}
      description={customer ? customer.name : "Walk-in customers keep their history if they sign up in the app later."}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>
            {customer ? "Save changes" : "Add customer"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate();
        }}
      >
        <Field label="Full name">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98XXXXXXXX" />
        </Field>
        <Field label="Email (optional)">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gender">
            <Dropdown value={form.gender} onChange={(v) => set("gender", v as Gender)} options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]} />
          </Field>
          <Field label="Birthday">
            <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          </Field>
        </div>
        <Field label="Address" className="sm:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Street / tole" value={form.line1} onChange={(e) => set("line1", e.target.value)} />
            <Input placeholder="Area (optional)" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
            <Input placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Province" value={form.province} onChange={(e) => set("province", e.target.value)} />
              <Input placeholder="Postal code" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </div>
          </div>
        </Field>
        <Field label="Tags" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_TAGS.map((tag) => {
              const on = form.tags.includes(tag);
              return (
                <motion.button
                  key={tag}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => set("tags", on ? form.tags.filter((t) => t !== tag) : [...form.tags, tag])}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    on ? "border-primary bg-primary text-white dark:text-[#2a1520]" : "border-line text-ink-2 hover:border-primary/50",
                  )}
                >
                  {tag === "vip" ? "VIP" : label(tag)}
                </motion.button>
              );
            })}
          </div>
        </Field>
        <Field label="Private notes" className="sm:col-span-2" hint="Allergies, preferences… only admins see these.">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
