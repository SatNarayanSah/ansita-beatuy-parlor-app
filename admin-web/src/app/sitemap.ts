import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/offers", priority: 0.8, changeFrequency: "daily" },
  { path: "/academy", priority: 0.8, changeFrequency: "weekly" },
  { path: "/team", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority, changeFrequency }) => ({ url: `${SITE_URL}${path}`, priority, changeFrequency }));
}
