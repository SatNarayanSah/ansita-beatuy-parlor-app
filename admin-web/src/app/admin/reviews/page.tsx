"use client";

import { AnimatePresence, motion } from "motion/react";
import { MessageSquareReply, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedNumber, Avatar, Button, Card, ConfirmDialog, Dropdown, EmptyState, ErrorState, PageHeader, Skeleton, Stars, Tabs, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useAction, useLookups, useReviews } from "@/lib/queries";
import type { Review } from "@/lib/types";

function ReviewCard({ review, index, onDelete }: { review: Review; index: number; onDelete: (r: Review) => void }) {
  const lookups = useLookups();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(review.reply ?? "");
  const reply = useAction(() => api.post<Review>(`/reviews/${review.id}/reply`, { reply: text.trim() }), {
    invalidate: ["reviews"],
    success: "Reply saved",
    onSuccess: () => setReplying(false),
  });
  const name = lookups.customer.get(review.customerId)?.name ?? review.customerName ?? "Customer";
  const member = lookups.staff.get(review.staffId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.04, type: "spring", stiffness: 240, damping: 24 } }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
    >
      <Card hover className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Avatar name={name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-muted">
              for {member?.name ?? "staff"} · {timeAgo(review.createdAt)}
            </p>
          </div>
          <Stars value={review.rating} size={15} />
        </div>
        <div className="flex flex-wrap gap-1">
          {review.serviceIds.map((id) => (
            <span key={id} className="rounded-full bg-bg-deep px-2 py-0.5 text-[11px] text-ink-2">
              {lookups.service.get(id)?.name ?? "Service"}
            </span>
          ))}
        </div>
        <p className="flex-1 text-sm leading-relaxed text-ink-2">{review.comment ? `“${review.comment}”` : <span className="text-muted">No comment left.</span>}</p>

        <AnimatePresence mode="wait" initial={false}>
          {replying ? (
            <motion.div key="edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank the customer, or respond to their feedback…" autoFocus className="min-h-[72px]" />
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
                <Button size="sm" disabled={!text.trim()} loading={reply.isPending} onClick={() => reply.mutate()}>
                  Post reply
                </Button>
              </div>
            </motion.div>
          ) : review.reply ? (
            <motion.div key="reply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border-l-4 border-primary bg-primary-soft/50 px-3 py-2 text-sm text-ink-2">
              <p className="mb-0.5 text-[11px] font-semibold text-primary-dark">Your reply</p>
              {review.reply}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!replying && (
          <div className="flex justify-end gap-1 border-t border-line pt-3">
            <Button size="sm" variant="ghost" icon={<MessageSquareReply className="h-3.5 w-3.5" />} onClick={() => setReplying(true)}>
              {review.reply ? "Edit reply" : "Reply"}
            </Button>
            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onDelete(review)}>
              Delete
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function ReviewsPage() {
  const reviews = useReviews();
  const lookups = useLookups();
  const [staffId, setStaffId] = useState("");
  const [rating, setRating] = useState("all");
  const [deleting, setDeleting] = useState<Review | null>(null);

  const remove = useAction((id: string) => api.del(`/reviews/${id}`), {
    invalidate: ["reviews", "staff"],
    success: "Review deleted",
    onSuccess: () => setDeleting(null),
  });

  const all = useMemo(() => reviews.data ?? [], [reviews.data]);
  const average = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((n) => ({ n, count: all.filter((r) => r.rating === n).length }));
  const filtered = all.filter((r) => (!staffId || r.staffId === staffId) && (rating === "all" || String(r.rating) === rating));

  return (
    <div>
      <PageHeader eyebrow="Feedback" title="Reviews" subtitle="What customers say after their visits. Replies show in the app." />

      {reviews.error ? (
        <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
      ) : reviews.isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-44" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <Card initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-6 p-6 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary-soft via-plum-soft to-gold-soft p-5 text-center">
              <p className="font-display text-5xl font-bold text-ink">
                <AnimatedNumber value={average} format={(n) => n.toFixed(1)} />
              </p>
              <div className="mt-2">
                <Stars value={average} size={18} />
              </div>
              <p className="mt-1 text-xs text-ink-2">{all.length} {all.length === 1 ? "review" : "reviews"}</p>
            </div>
            <div className="flex flex-col justify-center gap-2.5">
              {distribution.map(({ n, count }, i) => (
                <button key={n} type="button" onClick={() => setRating(rating === String(n) ? "all" : String(n))} className="group flex cursor-pointer items-center gap-3">
                  <span className="flex w-8 items-center gap-0.5 text-xs font-semibold text-ink-2">
                    {n} <Star className="h-3 w-3 fill-gold text-gold" />
                  </span>
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold to-primary group-hover:brightness-110"
                      initial={{ width: 0 }}
                      animate={{ width: all.length ? `${(count / all.length) * 100}%` : 0 }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                  <span className="w-8 text-right text-xs text-muted tabular-nums">{count}</span>
                </button>
              ))}
            </div>
          </Card>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={rating}
              onChange={setRating}
              options={[{ value: "all", label: "All" }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n}★` }))]}
            />
            <Dropdown value={staffId} onChange={setStaffId} aria-label="Filter by staff" className="sm:w-56" options={[{ value: "", label: "All staff" }, ...[...lookups.staff.values()].map((s) => ({ value: s.id, label: s.name, description: s.rating ? `${s.rating.toFixed(1)}★ rating` : undefined }))]} />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState icon={<Star className="h-7 w-7" />} title={all.length ? "No matching reviews" : "No reviews yet"} message={all.length ? "Try another filter." : "Customers can review completed visits in the app."} />
            </Card>
          ) : (
            <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((r, i) => (
                  <ReviewCard key={r.id} review={r} index={i} onDelete={setDeleting} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete review?"
        message="The review disappears from the app and the stylist's rating is recalculated."
      />
    </div>
  );
}
