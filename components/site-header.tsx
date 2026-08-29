"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Overview" },
  { href: "/console", label: "Console" },
];

export function SiteHeader({ chainId }: { chainId: number }) {
  // usePathname is typed as string, the fallback only guards a null at runtime
  // during the very first client render on some Next versions.
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-contain"
            priority
          />
          <Image
            src="/logo.svg"
            alt="Perennis"
            width={162}
            height={24}
            className="h-6 w-auto"
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="hidden gap-2 font-normal sm:inline-flex"
          >
            <span className="size-1.5 rounded-full bg-primary pulse-dot" />
            Somnia Shannon · chain {chainId}
          </Badge>

          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              {links.map((link) => {
                const current =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-sm transition-colors",
                        current
                          ? "bg-secondary font-medium text-primary"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
