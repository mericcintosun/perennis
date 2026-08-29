import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SiteHeader({ chainId }: { chainId: number }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
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
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden gap-2 font-normal sm:inline-flex">
            <span className="size-1.5 rounded-full bg-primary pulse-dot" />
            Somnia Shannon · chain {chainId}
          </Badge>
          <Button asChild size="sm" variant="outline">
            <a href="#console">Open the console</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
