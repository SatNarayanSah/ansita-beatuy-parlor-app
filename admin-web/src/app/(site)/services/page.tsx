"use client";

import { AnimatePresence, motion } from "motion/react";
import { Scissors } from "lucide-react";
import { useMemo, useState } from "react";
import { ServiceCard } from "@/components/site/cards";
import { Container, PageHero } from "@/components/site/section";
import { EmptyState, ErrorState, SearchInput, Skeleton, Tabs } from "@/components/ui";
import { useCategories, useServices } from "@/lib/queries";

export default function ServicesPage() {
  const services = useServices();
  const categories = useCategories();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const active = useMemo(() => (services.data ?? []).filter((s) => s.isActive), [services.data]);
  const sortedCategories = useMemo(() => [...(categories.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [categories.data]);
  const categoryMap = useMemo(() => new Map(sortedCategories.map((c) => [c.id, c])), [sortedCategories]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return active.filter(
      (s) =>
        (category === "all" || s.categoryId === category) &&
        (!needle || s.name.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle)),
    );
  }, [active, category, query]);

  const tabs = [
    { value: "all", label: "All", count: active.length },
    ...sortedCategories.map((c) => ({
      value: c.id,
      label: (
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
          {c.name}
        </span>
      ),
      count: active.filter((s) => s.categoryId === c.id).length,
    })),
  ];

  return (
    <>
      <title>Services · Ansita Beauty Parlour</title>
      <PageHero
        eyebrow="Our menu"
        title={
          <>
            Treatments made <span className="text-gradient">for you</span>
          </>
        }
        subtitle="Every service with its price and how long it takes. Pick one and book your slot online."
      />
      <Container className="py-10">
        <div className="sticky top-16 z-20 -mx-4 mb-8 flex flex-col gap-3 bg-bg/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Tabs value={category} onChange={setCategory} options={tabs} />
          <SearchInput value={query} onChange={setQuery} placeholder="Search treatments…" className="md:w-72" />
        </div>

        {services.isError ? (
          <ErrorState error={services.error} onRetry={() => services.refetch()} />
        ) : services.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Scissors className="h-7 w-7" />}
            title="No treatments found"
            message={query ? `Nothing matches “${query}”. Try another word.` : "This category has no treatments yet."}
          />
        ) : (
          <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((service, i) => (
                <ServiceCard key={service.id} service={service} category={categoryMap.get(service.categoryId)} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </Container>
    </>
  );
}
