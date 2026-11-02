import { Suspense } from "react";
import { Container } from "@/components/site/section";
import { Skeleton } from "@/components/ui";
import { ServiceDetail } from "./_detail";

/** /services/<id>. The id is only known at request time, so it's read inside Suspense. */
export default function ServicePage({ params }: PageProps<"/services/[id]">) {
  return (
    <Suspense
      fallback={
        <Container className="grid gap-8 py-12 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] rounded-3xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-24" />
            <Skeleton className="h-12 w-48" />
          </div>
        </Container>
      }
    >
      <ServiceDetail params={params} />
    </Suspense>
  );
}
