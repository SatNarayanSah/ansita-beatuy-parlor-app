"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function Reader({ onOpen, param }: { onOpen: (id: string) => void; param: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const id = params.get(param);
  useEffect(() => {
    if (!id) return;
    onOpen(id);
    // Drop the parameter so a refresh doesn't reopen it. The native history call (which Next
    // keeps in sync) can't race the navigation that brought us here, unlike router.replace.
    const rest = new URLSearchParams(window.location.search);
    rest.delete(param);
    const query = rest.toString();
    window.history.replaceState(window.history.state, "", pathname + (query ? `?${query}` : "") + window.location.hash);
  }, [id, onOpen, pathname, param]);
  return null;
}

/**
 * Opens a record named in the URL (`?open=<id>`), e.g. from a notification or the payments
 * queue. It reacts to every navigation, also when Next keeps the page mounted in the background.
 */
export function OpenFromUrl({ onOpen, param = "open" }: { onOpen: (id: string) => void; param?: string }) {
  return (
    <Suspense fallback={null}>
      <Reader onOpen={onOpen} param={param} />
    </Suspense>
  );
}

/** `/admin/appointments` + id → `/admin/appointments?open=id`. */
export const openHref = (route: string, id?: string | null) => (id ? `${route}?open=${encodeURIComponent(id)}` : route);
