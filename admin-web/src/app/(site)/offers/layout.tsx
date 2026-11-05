import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Beauty Offers & Discounts",
  "Latest beauty offers, festive packages and discount codes at Ansita Beauty Parlour, Janakpur. Save on bridal, facial, hair and makeup services.",
  "/offers",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
