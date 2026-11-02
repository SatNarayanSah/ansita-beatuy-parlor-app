import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { themeScript } from "@/lib/theme";
import { Providers } from "./providers";
import "./globals.css";

// Poppins throughout, like the mobile app (src/theme/fonts.ts): 400 regular, 500 medium,
// 600 semibold (h2/h3, buttons), 700 bold (display/h1).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Ansita Beauty Parlour & Training Centre", template: "%s · Ansita" },
  description:
    "Ansita Beauty Parlour & Training Centre, Janakpur: book beauty services online, explore offers and join our academy courses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
