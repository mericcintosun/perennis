import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A one pixel rule on the --border token. Decorative by default, so it carries
 * aria-hidden alongside role="separator": a divider between two blocks of text
 * says nothing a screen reader needs to hear.
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-hidden
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
