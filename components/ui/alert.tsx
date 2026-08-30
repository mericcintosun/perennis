import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Two variants and no more. "default" is a neutral notice on the card surface,
// "warning" is the one that names a stop rule, a loss state or a degraded data
// path. There is no amber in this product, so that variant is painted with
// --negative. Every color here is a token from app/globals.css: --border,
// --card, --card-foreground, --negative.
const alertVariants = cva("rounded-[2px] border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      warning: "border-negative/40 bg-negative/10 text-negative",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("leading-relaxed", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
