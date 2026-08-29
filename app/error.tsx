"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Nothing from the error object is printed. A stack or an RPC message on screen
// tells a visitor nothing useful and can leak an endpoint or an address.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-32 text-center">
      <h2 className="text-xl font-semibold">Perennis hit a problem</h2>
      <p className="mx-auto max-w-[52ch] text-sm text-muted-foreground">
        The screen failed to load. Nothing in the vault changed, because reading
        this page never writes anything. Try again, or go back to the console.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/console">Back to the console</Link>
        </Button>
      </div>
    </div>
  );
}
