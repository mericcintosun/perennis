import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One loading block. app/console/loading.tsx builds the whole console skeleton
 * out of these, so the shape of that grid lives in one file and the block itself
 * lives here. bg-secondary is a token, never a hex.
 *
 * It does not pulse. MOTION in IDENTITY.md allows two keyframes and neither of
 * them is a breathing placeholder, and a screen full of throbbing grey boxes is
 * the single most dashboard-like thing a loading state can do.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[2px] border border-border bg-secondary", className)}
      {...props}
    />
  );
}

export { Skeleton };
