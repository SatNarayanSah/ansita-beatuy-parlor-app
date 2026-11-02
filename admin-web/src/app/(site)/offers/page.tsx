"use client";

import { Tag } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { OfferCoupon } from "@/components/site/cards";
import { Container, PageHero } from "@/components/site/section";
import { Button, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { useCategories, useOffers } from "@/lib/queries";

export default function OffersPage() {
  const offers = useOffers();
  const categories = useCategories();
  const categoryMap = useMemo(() => new Map((categories.data ?? []).map((c) => [c.id, c])), [categories.data]);

  return (
    <>
      <title>Offers · Ansita Beauty Parlour</title>
      <PageHero
        eyebrow="Offers & promo codes"
        title={
          <>
            Treat yourself, <span className="text-gradient">for less</span>
          </>
        }
        subtitle="Tap a code to copy it, then mention it when you book or at the desk."
      />
      <Container className="py-12">
        {offers.isError ? (
          <ErrorState error={offers.error} onRetry={() => offers.refetch()} />
        ) : offers.isLoading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
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
          <div className="grid gap-5 lg:grid-cols-2">
            {offers.data.map((offer, i) => (
              <OfferCoupon key={offer.id} offer={offer} categories={categoryMap} index={i} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
