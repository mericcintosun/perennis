"use client";

// The masthead.
//
// ONE MARK. public/brand/logo.png exists, so it is the mark: one raster at 28px
// and the word Perennis as text in the display face. The wordmark SVG that used
// to sit beside it was a second drawing of the same idea, which is why the
// header showed the logo twice. The wordmark vector under public/ is still on
// disk for OG reuse and is imported by nothing.
//
// Opaque, per IDENTITY.md. No translucency and nothing blurred behind it: a
// broadsheet masthead sits on the paper, it does not float over it.

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
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      {/* The row wraps instead of pushing the page sideways. min-h rather than a
          fixed h, so a wrapped header grows down and the sticky bar keeps its
          16 units of height at every width above that. */}
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-2 sm:py-0">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/logo.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
          />
          <span className="font-serif text-[15px] tracking-wide">Perennis</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Words only. The dot that used to breathe here said nothing a
              sentence does not say, and it was the loudest thing on the page. */}
          <Badge
            variant="outline"
            className="hidden font-normal sm:inline-flex"
          >
            Somnia Shannon · chain {chainId}
          </Badge>

          <nav aria-label="Main">
            <ul className="flex items-center gap-4">
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
                      // Two links fit at 360px, so both stay visible. A
                      // disclosure menu behind a hamburger would be one extra
                      // tap to reach half a nav, which is worse on a phone than
                      // the nav itself. The explicit min height is what makes
                      // each one a real target. The current one is marked with a
                      // rule under it rather than with a filled pill.
                      className={cn(
                        "inline-flex min-h-11 items-center text-sm transition-colors sm:min-h-0",
                        current
                          ? "text-primary underline underline-offset-8 decoration-2"
                          : "text-muted-foreground hover:text-foreground"
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
