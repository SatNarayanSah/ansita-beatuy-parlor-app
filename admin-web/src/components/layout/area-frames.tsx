"use client";

import { AppShell } from "./app-shell";
import { CUSTOMER_NAV_SECTIONS, NAV_SECTIONS } from "./nav";
import { RoleGate } from "./role-gate";

export function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="admin">
      <AppShell sections={NAV_SECTIONS} homeHref="/" tagline="Admin studio" notificationsHref="/admin/notifications">
        {children}
      </AppShell>
    </RoleGate>
  );
}

export function AccountFrame({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role="customer">
      <AppShell sections={CUSTOMER_NAV_SECTIONS} homeHref="/" tagline="My account" notificationsHref="/account/notifications">
        {children}
      </AppShell>
    </RoleGate>
  );
}
