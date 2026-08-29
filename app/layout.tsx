import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { somniaShannon } from "@/lib/dreamdex";
import "./globals.css";

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader chainId={somniaShannon.id} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
