import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Our Beauty Experts",
  "Meet the experienced stylists, makeup artists and beauticians at Ansita Beauty Parlour, Janakpur, and read reviews from our clients.",
  "/team",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
