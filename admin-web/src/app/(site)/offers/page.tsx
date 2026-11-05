"use client";

import { Tag } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { OfferBanner } from "@/components/site/cards";
import { Container, PageHero } from "@/components/site/section";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useCategories, useOffers } from "@/lib/queries";

export default function OffersPage() {
  const offers = useOffers();
  const categories = useCategories();
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);

  return (
    <>
      <PageHero
        eyebrow="Offers & promo codes"
        title={
          <>
            Treat yourself, <span className="text-gradient">for less</span>
          </>
        }
        subtitle="Tap a code to copy it, then use it when you book or show it at the desk."
      />
      <Container className="py-8">
        {offers.isError ? (
          <ErrorState error={offers.error} onRetry={() => offers.refetch()} />
        ) : offers.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={i === 0 ? "h-80 lg:col-span-2" : "h-72"} />
            ))}
          </div>
        ) : !offers.data?.length ? (
          <EmptyState
            icon={<Tag className="h-7 w-7" />}
            title="No offers right now"
            message="New festive deals and promo codes appear here. Check back soon, or follow us in the app."
            action={
              <Link href="/services">
                <Button variant="outline">Browse services</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {offers.data.map((offer, i) => (
              <div key={offer.id} className={i === 0 ? "lg:col-span-2" : undefined}>
                <OfferBanner offer={offer} categories={categoryMap} index={i} featured={i === 0} />
              </div>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
