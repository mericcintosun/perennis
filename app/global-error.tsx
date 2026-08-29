"use client";

// The App Router's replacement for the Pages Router 500 page. Without this file
// Next falls back to the internal pages/_error for /500 at build time, which
// renders <Html> outside a document context and fails the export.
//
// A global error replaces the root layout, so it has to render its own
// <html> and <body>. It cannot use the design tokens either: globals.css is
// imported by the layout this boundary is standing in for.
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
          background: "#0b0f14",
          color: "#e6edf3",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h2>
        <button
          onClick={() => reset()}
          style={{
            border: 0,
            borderRadius: "0.5rem",
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            background: "#2dd4bf",
            color: "#04231f",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
