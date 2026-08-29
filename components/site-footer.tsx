import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Perennis"
            width={135}
            height={20}
            className="h-5 w-auto opacity-80"
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a
            className="hover:text-foreground"
            href="https://docs.dreamdex.io/developers/event-contracts"
            target="_blank"
            rel="noreferrer"
          >
            DreamDEX docs
          </a>
          <a
            className="hover:text-foreground"
            href="https://docs.somnia.network/developer/reactivity"
            target="_blank"
            rel="noreferrer"
          >
            Somnia reactivity
          </a>
          <a
            className="hover:text-foreground"
            href="https://shannon-explorer.somnia.network"
            target="_blank"
            rel="noreferrer"
          >
            Shannon explorer
          </a>
          <a
            className="hover:text-foreground"
            href="https://dorahacks.io/hackathon/event-contracts"
            target="_blank"
            rel="noreferrer"
          >
            Event Contracts Hackathon
          </a>
        </div>
      </div>
    </footer>
  );
}
