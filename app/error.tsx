"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-32 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
