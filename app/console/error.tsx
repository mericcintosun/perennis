"use client";

// The failure half of the /console state triad.
//
// app/error.tsx already catches anything that escapes a route, but /console is
// the only route that serves data, so it gets its own boundary with copy that
// names the likely cause. A visitor who sees "the Shannon RPC did not answer"
// knows to press retry; "something went wrong" tells them nothing.
//
// Nothing from the error object is printed, the same rule app/error.tsx holds
// to: a provider message carries the RPC URL and sometimes the request body.

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConsoleErrorState({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto max-w-6xl space-y-4 px-6 py-32 text-center">
      <h2 className="text-xl font-semibold">The console could not load</h2>
      <p className="mx-auto max-w-[54ch] text-sm text-muted-foreground">
        The most likely cause is that the Shannon RPC did not answer in time.
        Nothing in the vault changed, because loading this page only reads. Press
        retry and the server component runs the reads again.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* reset() re-runs the failed segment, so retry is a real retry and not
            a full page reload that loses the wallet connection. */}
        <Button onClick={() => reset()}>Retry the reads</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to the landing page</Link>
        </Button>
      </div>
    </section>
  );
}

export default function ConsoleError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ConsoleErrorState reset={reset} />;
}
