import { AdminFrame } from "@/components/layout/area-frames";
import { PRIVATE_METADATA } from "@/lib/seo";

export const metadata = PRIVATE_METADATA;

// Signed-in areas: the session is checked in the browser (token in localStorage), so the
// page under this layout only renders after that check and can't be part of the static
// shell. Opt out of Next's instant-navigation validation for this subtree.
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminFrame>{children}</AdminFrame>;
}
