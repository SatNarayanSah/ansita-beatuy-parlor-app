import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Beauty Services & Prices in Janakpur",
  "Explore hair, skin, makeup, bridal, threading, waxing, nail and spa services at Ansita Beauty Parlour, Janakpur — with prices and online booking.",
  "/services",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
