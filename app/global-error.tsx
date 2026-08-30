"use client";

// The App Router's replacement for the Pages Router 500 page. Without this file
// Next falls back to the internal pages/_error for /500 at build time, which
// renders <Html> outside a document context and fails the export.
//
// A global error replaces the root layout, so it renders its own <html> and
// <body> and imports the tokens itself: the layout that normally pulls
// globals.css in is the thing this boundary is standing in for. Colors stay in
// app/globals.css, this file only names the variables.
import { Button } from "@/components/ui/button";
import "./globals.css";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "var(--background)",
          color: "var(--foreground)",
          fontFamily:
            'var(--font-text), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display), ui-serif, Georgia, serif",
            fontSize: "1.5rem",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Perennis hit a problem
        </h2>
        {/* Through the same primitive every other control on the site uses, so
            this boundary cannot drift into a browser default button. */}
        <Button onClick={() => reset()}>Try again</Button>
      </body>
    </html>
  );
}
