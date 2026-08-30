import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CHAIN_ID } from "@/lib/config";
import "./globals.css";

// Three faces, one job each, per IDENTITY.md. The display face carries the
// headlines and the dispatch titles, the text face carries everything a person
// reads as a sentence, and the data face is permitted only on addresses, hashes,
// market ids and block numbers. Each one is written onto <html> as a CSS
// variable that app/globals.css maps onto font-serif, font-sans and font-mono,
// so no component ever names a font family.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const text = IBM_Plex_Sans({
  variable: "--font-text",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const data = IBM_Plex_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Perennis · Standing order plans for Event Contracts",
    template: "%s | Perennis",
  },
  description:
    "Stop renewing your Event Contracts position every 15 minutes. Write the plan once and the vault redeems and re-enters itself at every settlement, with your stop rules enforced as contract terms.",
  metadataBase: new URL("https://perennis.vercel.app"),
  openGraph: {
    title: "Perennis · Standing order plans for Event Contracts",
    description:
      "Write the plan once. The vault rolls itself at every settlement, no keeper and no bot process.",
    type: "website",
  },
  // The image itself is app/opengraph-image.png and Next serves it from the file
  // convention, absolute URL and all, off metadataBase above. Nothing sets
  // openGraph.images by hand and there is no opengraph-image.tsx beside the png.
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${data.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader chainId={CHAIN_ID} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
