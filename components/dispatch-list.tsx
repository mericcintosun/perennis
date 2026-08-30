// A dispatch list: the broadsheet form this site uses instead of cards, tiles
// and tabs.
//
// One ordered list. Each entry is a serif numeral sitting in a narrow left
// margin column from lg up, a serif title, and one or two sentences. Numbers
// live inside those sentences, which is the whole point of ARCHETYPE L3 in
// IDENTITY.md: "eleven tests" belongs in a clause, not on a tile on its own.
//
// Server safe. No state, no handlers, no "use client". The numeral is hidden
// from assistive technology because the <ol> already carries the ordering.

import { cn } from "@/lib/utils";

export type DispatchEntry = {
  /** One line. It is a headline, so it goes in the display face. */
  title: string;
  /** One or two sentences. Every figure in them is checkable in this repo. */
  body: string;
};

export function DispatchList({
  entries,
  className,
}: {
  entries: DispatchEntry[];
  className?: string;
}) {
  return (
    <ol className={cn("space-y-9", className)}>
      {entries.map((entry, index) => (
        <li
          key={entry.title}
          className="grid gap-x-6 gap-y-2 lg:grid-cols-[3rem_minmax(0,68ch)]"
        >
          <span
            aria-hidden
            className="tabular font-serif text-2xl leading-none text-primary lg:pt-1"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-serif text-lg leading-snug">{entry.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              {entry.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
