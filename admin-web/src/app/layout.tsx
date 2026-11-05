import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { themeScript } from "@/lib/theme";
import { BUSINESS_JSON_LD, KEYWORDS, SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from "@/lib/seo";
import { Providers } from "./providers";
import "./globals.css";

// Poppins throughout, like the mobile app (src/theme/fonts.ts): 400 regular, 500 medium,
// 600 semibold (h2/h3, buttons), 700 bold (display/h1).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const HOME_TITLE = "Ansita Beauty Parlour Janakpur | Bridal Makeup, Hair & Beauty Courses";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s · ${SITE_SHORT_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_SHORT_NAME,
  keywords: KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Beauty & Personal Care",
  alternates: { canonical: "/" },
  formatDetection: { telephone: true, email: true, address: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/brand/logo.png", alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: SITE_DESCRIPTION, images: ["/brand/logo.png"] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Paste the codes from Google Search Console / Bing Webmaster Tools here (or via env) once the site is verified.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1216" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BUSINESS_JSON_LD) }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
