import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One loading block. app/console/loading.tsx builds the whole console skeleton
 * out of these, so the shape of that grid lives in one file and the pulse lives
 * here. bg-secondary is a token, never a hex.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-secondary", className)}
      {...props}
    />
  );
}

export { Skeleton };
