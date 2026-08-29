import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perennis · Standing order plans for Event Contracts",
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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
