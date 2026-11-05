import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "About Ansita Beauty Parlour",
  "Ansita Beauty Parlour & Training Centre in Janakpur offers warm, hygienic, affordable beauty care and professional beauty training.",
  "/about",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
