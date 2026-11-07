import type { Metadata } from "next";

/** Public address of the website. Set NEXT_PUBLIC_SITE_URL in production if it ever changes. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ansitabeautyparlor.com").replace(/\/+$/, "");

export const SITE_NAME = "Ansita Beauty Parlour & Training Centre";
export const SITE_SHORT_NAME = "Ansita Beauty Parlour";
export const SUPPORT_EMAIL = "support@ansitabeautyparlor.com";
export const PHONE = "+9779854028392";
export const ADDRESS = {
  street: "Ramanand Chowk, Janakpur-8",
  city: "Janakpur",
  region: "Dhanusha",
  postalCode: "45600",
  country: "NP",
};
/** Daily opening hours (24-hour clock), used on the page and in the data for Google. */
export const OPENING_HOURS = { opens: "10:00", closes: "19:00" };

export const SITE_DESCRIPTION =
  "Ansita Beauty Parlour & Training Centre in Ramanand Chowk, Janakpur — bridal makeup, hair, facials, " +
  "threading, waxing, nail art and professional beautician courses. Book your appointment online today.";

export const KEYWORDS = [
  "Ansita Beauty Parlour",
  "Ansita Beauty Parlor",
  "Ansita Parlour",
  "Ansita Beauty Parlour Janakpur",
  "Ansita Beauty Parlour and Training Centre",
  "Ansita Academy",
  "beauty parlour Janakpur",
  "beauty parlor Janakpur",
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

/** Other ways people write the name in search, so Google ties them all to this site. */
const ALTERNATE_NAMES = [SITE_SHORT_NAME, "Ansita Beauty Parlor", "Ansita Parlour", "Ansita Beauty Parlour Janakpur", "Ansita"];

/** The phone number written the way people read it: +977 9854028392. */
export const PHONE_DISPLAY = PHONE.replace(/^\+977/, "+977 ");

/** The full address on one line, for pages and the footer. */
export const ADDRESS_LINE = `${ADDRESS.street}, ${ADDRESS.region} ${ADDRESS.postalCode}, Nepal`;

/** schema.org data so Google can show the parlour as a local business (map, hours, phone). */
const BUSINESS = {
  "@type": "BeautySalon",
  "@id": `${SITE_URL}/#business`,
  name: SITE_NAME,
  alternateName: ALTERNATE_NAMES,
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
      opens: OPENING_HOURS.opens,
      closes: OPENING_HOURS.closes,
    },
  ],
};

/** schema.org data for the website itself: Google uses it to pick the site name shown in results. */
const WEBSITE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_SHORT_NAME,
  alternateName: [SITE_NAME, ...ALTERNATE_NAMES.slice(1)],
  url: `${SITE_URL}/`,
  inLanguage: "en",
  publisher: { "@id": `${SITE_URL}/#business` },
};

export const BUSINESS_JSON_LD = { "@context": "https://schema.org", "@graph": [BUSINESS, WEBSITE] };
