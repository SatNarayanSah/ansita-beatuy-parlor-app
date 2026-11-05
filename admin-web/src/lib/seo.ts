import type { Metadata } from "next";

/** Public address of the website. Set NEXT_PUBLIC_SITE_URL in production if it ever changes. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://anitabeautyparlor.com").replace(/\/+$/, "");

export const SITE_NAME = "Ansita Beauty Parlour & Training Centre";
export const SITE_SHORT_NAME = "Ansita Beauty Parlour";
export const SUPPORT_EMAIL = "support@anitabeautyparlor.com";
export const PHONE = "+9779854028392";
export const ADDRESS = {
  street: "Ramanand Chowk, Janakpur-8",
  city: "Janakpur",
  region: "Dhanusha",
  postalCode: "45600",
  country: "NP",
};

export const SITE_DESCRIPTION =
  "Ansita Beauty Parlour & Training Centre in Ramanand Chowk, Janakpur — bridal makeup, hair, facials, " +
  "threading, waxing, nail art and professional beautician courses. Book your appointment online today.";

export const KEYWORDS = [
  "Ansita Beauty Parlour",
  "beauty parlour Janakpur",
  "best beauty parlour in Janakpur",
  "bridal makeup Janakpur",
  "beauty salon Janakpur",
  "ladies parlour Dhanusha",
  "beautician course Janakpur",
  "makeup training centre Nepal",
  "hair cut and hair colour Janakpur",
  "facial Janakpur",
  "threading and waxing",
  "nail art Janakpur",
  "party makeup",
  "beauty parlour near me",
];

const OG_IMAGE = { url: "/brand/logo.png", alt: SITE_NAME };

/** Title, description, canonical link and social cards for one public page. */
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: `${title} · ${SITE_SHORT_NAME}`,
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: `${title} · ${SITE_SHORT_NAME}`, description, images: [OG_IMAGE.url] },
  };
}

/** For sign-in and signed-in pages: keep them out of search results. */
export const PRIVATE_METADATA: Metadata = { robots: { index: false, follow: false } };

/** schema.org data so Google can show the parlour as a local business (map, hours, phone). */
export const BUSINESS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  "@id": `${SITE_URL}/#business`,
  name: SITE_NAME,
  alternateName: SITE_SHORT_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo.png`,
  image: `${SITE_URL}/brand/logo.png`,
  telephone: PHONE,
  email: SUPPORT_EMAIL,
  priceRange: "Rs",
  currenciesAccepted: "NPR",
  address: {
    "@type": "PostalAddress",
    streetAddress: ADDRESS.street,
    addressLocality: ADDRESS.city,
    addressRegion: ADDRESS.region,
    postalCode: ADDRESS.postalCode,
    addressCountry: ADDRESS.country,
  },
  areaServed: ["Janakpur", "Dhanusha", "Madhesh Province"],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "10:00",
      closes: "19:00",
    },
  ],
};
