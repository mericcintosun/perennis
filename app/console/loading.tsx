// Skeleton for the console: plan card on the left, vault card and ledger on the
// right, in the same grid the real screen uses so nothing jumps when it lands.
// Token colors only, no hex.

import { cn } from "@/lib/utils";

function Block({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-secondary", className)} />
  );
}

export default function ConsoleLoading() {
  return (
    <section
      className="mx-auto max-w-6xl px-6 py-12 sm:py-16"
      aria-busy="true"
      aria-label="Loading the console"
    >
      <div className="mb-10 max-w-[68ch] space-y-3">
        <Block className="h-8 w-56" />
        <Block className="h-4 w-full" />
        <Block className="h-4 w-4/5" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Block className="h-8 w-24" />
          <Block className="h-8 w-24" />
          <Block className="h-8 w-24" />
        </div>
        <Block className="h-6 w-40" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <Block className="h-5 w-32" />
          <Block className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Block className="h-10" />
            <Block className="h-10" />
            <Block className="h-10" />
            <Block className="h-10" />
          </div>
          <Block className="h-28 w-full" />
          <Block className="h-11 w-full" />
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="space-y-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-8">
              <Block className="size-[104px] shrink-0 rounded-full" />
              <div className="grid flex-1 grid-cols-3 gap-6">
                <Block className="h-14" />
                <Block className="h-14" />
                <Block className="h-14" />
              </div>
            </div>
            <Block className="h-24 w-full" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Block className="h-12" />
              <Block className="h-12" />
              <Block className="h-12" />
              <Block className="h-12" />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <Block className="h-5 w-28" />
            <Block className="h-12 w-full" />
            <Block className="h-12 w-full" />
            <Block className="h-12 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
