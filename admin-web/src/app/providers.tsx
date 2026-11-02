"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: true },
        },
      }),
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <AuthProvider>{children}</AuthProvider>
        </MotionConfig>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: "var(--font-poppins)", borderRadius: 14 } }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
