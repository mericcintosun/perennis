import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-6 py-32 text-center">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="mx-auto max-w-[52ch] text-sm text-muted-foreground">
        Perennis has two screens: the overview and the console where the vaults
        run.
      </p>
      <Button asChild variant="outline">
        <Link href="/console">Open the console</Link>
      </Button>
    </div>
  );
}
