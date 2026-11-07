import { ChevronDown, Clock, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { time12 } from "@/lib/format";
import { ADDRESS_LINE, OPENING_HOURS, PHONE, PHONE_DISPLAY, SITE_NAME } from "@/lib/seo";
import { Container } from "./section";

const HOURS = `${time12(OPENING_HOURS.opens)} – ${time12(OPENING_HOURS.closes)}`;

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Where is Ansita Beauty Parlor located?",
    a: (
      <>
        Ansita Beauty Parlour is at {ADDRESS_LINE}, in the heart of Janakpur. See the{" "}
        <Link href="/contact" className="font-medium text-primary hover:underline">contact page</Link> for directions.
      </>
    ),
  },
  {
    q: "What are the opening hours?",
    a: <>We are open every day from {HOURS}, except on public holidays we announce.</>,
  },
  {
    q: "Do you do bridal makeup in Janakpur?",
    a: (
      <>
        Yes. We do bridal and party makeup, along with the hair treatments and facials that get you ready for the big
        day. See every treatment and price on the{" "}
        <Link href="/services" className="font-medium text-primary hover:underline">services page</Link>.
      </>
    ),
  },
  {
    q: "Can I learn to become a beautician at Ansita?",
    a: (
      <>
        Yes. The Ansita Academy runs hands-on beautician, makeup and hair courses in small batches, taught by our senior
        artists, with a certificate at the end. See the{" "}
        <Link href="/academy" className="font-medium text-primary hover:underline">academy courses</Link>.
      </>
    ),
  },
  {
    q: "How do I book an appointment?",
    a: (
      <>
        <Link href="/account/book" className="font-medium text-primary hover:underline">Book online</Link> in under a
        minute, use the Ansita app, or call us on{" "}
        <a href={`tel:${PHONE}`} className="font-medium text-primary hover:underline">{PHONE_DISPLAY}</a>. Walk-ins are
        welcome too.
      </>
    ),
  },
];

/**
 * Plain written content about the parlour and where it is. It doesn't depend on any data loaded in
 * the browser, so it's in the page's HTML from the start: this is what search engines read.
 */
export function LocalSeo() {
  return (
    <section className="py-10" aria-labelledby="about-ansita">
      <Container className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-gold-text uppercase">About us</p>
          <h2 id="about-ansita" className="font-display text-3xl leading-tight font-bold text-ink sm:text-4xl">
            Your beauty parlour in <span className="text-gradient">Janakpur</span>
          </h2>
          <div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-ink-2 sm:text-base">
            <p>
              <strong className="text-ink">{SITE_NAME}</strong> is a ladies&apos; beauty parlour at Ramanand Chowk,
              Janakpur-8, Dhanusha. We look after hair, skin, nails and bridal beauty for women across Janakpur and the
              Madhesh Province, in a clean, friendly and affordable salon.
            </p>
            <p>
              Our services include bridal and party makeup, hair straightening, smoothing, nanoplastia, protein and hair
              botox treatments, hair colour and highlights, facials, bleaching, waxing and pedicure. Every price and
              treatment time is listed online, and you can book your appointment in a minute.
            </p>
            <p>
              Through the Ansita Academy we also train new beauticians and makeup artists with practical, certified
              courses, so you can turn your passion for beauty into a profession.
            </p>
          </div>
          <ul className="mt-5 flex flex-col gap-3 text-sm text-ink-2">
            <li className="flex gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              {ADDRESS_LINE}
            </li>
            <li className="flex gap-3">
              <Clock className="h-5 w-5 shrink-0 text-primary" />
              Open every day, {HOURS}
            </li>
            <li>
              <a href={`tel:${PHONE}`} className="flex gap-3 hover:text-primary">
                <Phone className="h-5 w-5 shrink-0 text-primary" />
                {PHONE_DISPLAY}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-2xl leading-tight font-bold text-ink sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-4 flex flex-col gap-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-line bg-surface p-4 shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  <h3 className="text-sm sm:text-base">{faq.q}</h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
