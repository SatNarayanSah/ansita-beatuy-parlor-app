import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Contact & Location",
  "Contact Ansita Beauty Parlour at Ramanand Chowk, Janakpur-8, Dhanusha. Call +977 9854028392, WhatsApp us or email support@ansitabeautyparlor.com.",
  "/contact",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
