"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CalendarPlus, MessageSquareQuote, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StaffCard } from "@/components/site/cards";
import { Container, PageHero } from "@/components/site/section";
import { Avatar, Button, Drawer, EmptyState, ErrorState, Skeleton, Stars } from "@/components/ui";
import { api } from "@/lib/api";
import { label, timeAgo, time12 } from "@/lib/format";
import { useCategories, useStaff } from "@/lib/queries";
import type { Review, Staff } from "@/lib/types";

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function StaffReviews({ staffId }: { staffId: string }) {
  const reviews = useQuery({
    queryKey: ["staff", "public-reviews", staffId],
    queryFn: () => api.get<Review[]>(`/staff/${staffId}/reviews`),
  });
  if (reviews.isLoading) return <Skeleton className="h-32" />;
  if (reviews.isError) return <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />;
  const list = (reviews.data ?? []).filter((r) => r.comment || r.rating);
  if (!list.length) {
    return <EmptyState icon={<MessageSquareQuote className="h-7 w-7" />} title="No reviews yet" message="Be the first to visit and share your experience." />;
  }
  return (
    <ul className="flex flex-col gap-3">
      {list.map((review, i) => (
        <motion.li
          key={review.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl border border-line bg-bg/50 p-4"
        >
          <div className="flex items-center gap-3">
            <Avatar name={review.customerName ?? "Client"} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{review.customerName ?? "Client"}</p>
              <p className="text-[11px] text-muted">{timeAgo(review.createdAt)}</p>
            </div>
            <Stars value={review.rating} />
          </div>
          {review.comment && <p className="mt-3 text-sm leading-relaxed text-ink-2">{review.comment}</p>}
          {review.reply && (
            <p className="mt-3 rounded-xl bg-primary-soft/60 px-3 py-2 text-xs text-primary-dark">
              <span className="font-semibold">Ansita replied:</span> {review.reply}
            </p>
          )}
        </motion.li>
      ))}
    </ul>
  );
}

function StaffDrawer({ member, onClose }: { member: Staff | null; onClose: () => void }) {
  const categories = useCategories();
  const categoryMap = new Map((categories.data ?? []).map((c) => [c.id, c]));
  return (
    <Drawer
      open={!!member}
      onClose={onClose}
      title={member?.name ?? ""}
      description={member ? label(member.role) : undefined}
      footer={
        <Link href="/account/book" onClick={onClose}>
          <Button icon={<CalendarPlus className="h-4 w-4" />}>Book a visit</Button>
        </Link>
      }
    >
      {member && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={member.name} src={member.avatar} size={72} />
            <div>
              <div className="flex items-center gap-2">
                <Stars value={member.rating} size={16} />
                <span className="text-sm font-semibold text-ink">{member.rating > 0 ? member.rating.toFixed(1) : "New"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {member.specialties.map((id) => {
                  const category = categoryMap.get(id);
                  return category ? (
                    <span key={id} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `${category.color}1f`, color: category.color }}>
                      {category.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">Working hours</h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {DAY_ORDER.map((day) => {
                const hours = member.workingHours.find((h) => h.day === day);
                const off = !hours || hours.isOff;
                return (
                  <div key={day} className="flex items-center justify-between rounded-xl bg-bg/60 px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{label(day)}</span>
                    <span className={off ? "text-muted" : "text-ink-2"}>{off ? "Off" : `${time12(hours.start)} – ${time12(hours.end)}`}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold tracking-[0.2em] text-gold-text uppercase">Client reviews</h3>
            <StaffReviews staffId={member.id} />
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default function TeamPage() {
  const staff = useStaff();
  const categories = useCategories();
  const [selected, setSelected] = useState<Staff | null>(null);
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);
  const list = (staff.data ?? []).filter((s) => s.isActive);

  return (
    <>
      <title>Our team · Ansita Beauty Parlour</title>
      <PageHero
        eyebrow="The people behind the glow"
        title={
          <>
            Meet our <span className="text-gradient">experts</span>
          </>
        }
        subtitle="Tap anyone to see their working days and what clients say about them."
      />
      <Container className="py-8">
        {staff.isError ? (
          <ErrorState error={staff.error} onRetry={() => staff.refetch()} />
        ) : staff.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={<UserRound className="h-7 w-7" />} title="Team coming soon" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((member, i) => (
              <StaffCard key={member.id} member={member} categories={categoryMap} index={i} onClick={() => setSelected(member)} />
            ))}
          </div>
        )}
      </Container>
      <StaffDrawer member={selected} onClose={() => setSelected(null)} />
    </>
  );
}
