// Skeleton for the console: plan card on the left, vault card and ledger on the
// right, in the same grid the real screen uses so nothing jumps when it lands.
// Token colors only, no hex. The pulse block itself is Skeleton in
// components/ui/skeleton.tsx, so this file only holds the shape of the grid.

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The loading half of the /console state triad, named and exported so it is
 * greppable next to ConsoleErrorState in app/console/error.tsx and the two empty
 * states in components/standing-plan-console.tsx. Next needs a default export
 * from this file, so the default below is a one line wrapper around it.
 */
export function ConsoleSkeleton() {
  return (
    <section
      className="mx-auto max-w-6xl px-6 py-12 sm:py-16"
      aria-busy="true"
      aria-label="Loading the console"
    >
      <div className="mb-10 max-w-[68ch] space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-6 w-40" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="space-y-6 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-8">
              <Skeleton className="size-[104px] shrink-0 rounded-full" />
              {/* Same breakpoints as the real stat row, so nothing jumps when
                  the console lands. */}
              <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
            {/* The queue strip, DEMO.md step 7. */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ConsoleLoading() {
  return <ConsoleSkeleton />;
}
