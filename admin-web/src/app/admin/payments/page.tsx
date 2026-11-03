"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Hourglass, Settings2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { openHref } from "@/components/layout/open-from-url";
import {
  RequestCard,
  ReviewDialog,
} from "@/components/payments/payment-requests";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  Skeleton,
  StatCard,
  Tabs,
} from "@/components/ui";
import { money } from "@/lib/format";
import { usePaymentRequests, useSettings } from "@/lib/queries";
import type { PaymentRequest, PaymentRequestStatus } from "@/lib/types";

type Filter = "pending" | "approved" | "rejected" | "all";

export default function PaymentsPage() {
  const router = useRouter();
  const requests = usePaymentRequests();
  const settings = useSettings();
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<{
    request: PaymentRequest;
    action: "approve" | "reject";
  } | null>(null);

  const all = useMemo(
    () => (requests.data ?? []).filter((r) => r.status !== "cancelled"),
    [requests.data],
  );
  const count = (s: PaymentRequestStatus) =>
    all.filter((r) => r.status === s).length;
  const pendingTotal = all
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0);
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!q ||
        `${r.customerName} ${r.customerPhone} ${r.reference} ${r.targetLabel}`
          .toLowerCase()
          .includes(q)),
  );

  const payments = settings.data?.payments;
  const enabledMethods = payments
    ? (["esewa", "khalti", "fonepay", "bank"] as const).filter(
        (m) => payments[m].enabled,
      ).length
    : 0;
  const notSetUp =
    settings.data && (!payments?.requests || enabledMethods === 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Money"
        title="Payments to verify"
        subtitle="Customers who paid by eSewa, Khalti, Fonepay or bank transfer. Check each one in your statement, then approve or reject."
        actions={
          <Link href="/admin/settings?tab=payments">
            <Button variant="outline" icon={<Settings2 className="h-4 w-4" />}>
              Payment accounts
            </Button>
          </Link>
        }
      />

      {notSetUp && (
        <Card className="flex flex-col gap-3 border-warning/40 bg-warning-soft/50 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-ink-2">
            {!payments?.requests
              ? "Customers can't send payment requests: it's switched off in Settings."
              : "Add at least one payment account (eSewa, Khalti, Fonepay or bank) so customers know where to pay."}
          </p>
          <Link href="/admin/settings?tab=payments">
            <Button size="sm">Set up</Button>
          </Link>
        </Card>
      )}

      {requests.isLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            label="Waiting"
            value={count("pending")}
            icon={<Hourglass />}
            accent="gold"
            hint={`${money(pendingTotal)} reported`}
            index={0}
          />
          <StatCard
            label="Approved"
            value={count("approved")}
            icon={<BadgeCheck />}
            accent="green"
            index={1}
          />
          <StatCard
            label="Rejected"
            value={count("rejected")}
            icon={<Wallet />}
            accent="plum"
            index={2}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            {
              value: "pending",
              label: `To verify${count("pending") ? ` · ${count("pending")}` : ""}`,
            },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "all", label: "All" },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Customer, phone or transaction ID"
          className="sm:w-72"
        />
      </div>

      {requests.error ? (
        <ErrorState error={requests.error} onRetry={() => requests.refetch()} />
      ) : requests.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="h-7 w-7" />}
            title={
              filter === "pending" ? "Nothing to verify" : "No requests here"
            }
            message={
              filter === "pending"
                ? "When a customer says they've paid online, it shows up here."
                : "Try another tab."
            }
          />
        </Card>
      ) : (
        <motion.div layout className="grid gap-3 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {rows.map((r, i) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: Math.min(i, 10) * 0.04 },
                }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <RequestCard
                  request={r}
                  admin
                  onReview={(request, action) =>
                    setReviewing({ request, action })
                  }
                  onOpenTarget={(req) =>
                    router.push(
                      openHref(
                        req.targetType === "appointment"
                          ? "/admin/appointments"
                          : "/admin/enrollments",
                        req.targetId,
                      ),
                    )
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {reviewing && (
        <ReviewDialog
          request={reviewing.request}
          action={reviewing.action}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}
