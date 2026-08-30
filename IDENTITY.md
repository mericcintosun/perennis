# Perennis visual identity

This file is law for every colour, font, radius, layout and motion decision in
this repository. It outranks taste, it outranks the scaffold defaults, and a
later phase that wants to move away from it amends this file first and edits the
code second.

```
DIRECTION: Broadsheet ink. A warm brown-black almanac page, editorial serif
  headlines, hairline rules, square corners, one clay accent. Deliberately not a
  dark dashboard.
GROUND: warm brown-black (red is the largest RGB channel, blue the smallest)
ACCENT BAND: clay / burnt orange, hue 15-25. Exactly one accent.
DISPLAY FONT: Fraunces (next/font/google)
TEXT FONT: IBM Plex Sans (next/font/google)
DATA FONT: IBM Plex Mono (next/font/google), permitted ONLY for addresses,
  transaction hashes, market ids and block numbers. Never for stats, headings,
  step labels, nav, buttons or body copy.
ARCHETYPE: L3, editorial broadsheet. Numbers live inside sentences.
RADIUS: sharp. --radius: 0.125rem. rounded-full only on genuinely circular
  geometry (the countdown ring, an outcome dot).
HEADER: solid sticky masthead. Opaque --background, 1px bottom hairline, no
  translucency, no backdrop-blur.
MOTION: ink-in. Never translateY, never a pulse, never a float. One masthead
  entrance on load (opacity), hairline section rules that draw with scaleX, and
  one figure stroke that draws with stroke-dashoffset. Three keyframes, no
  fourth. Nothing below the fold ever starts at opacity 0 and no
  IntersectionObserver exists in the repo.
KEYFRAME PREFIX: pns-
TOKENS (the only colors in this product, all in app/globals.css):
  --background        #16110D
  --foreground        #F3EAE0
  --card              #1E1813
  --card-foreground   #F3EAE0
  --popover           #1E1813
  --popover-foreground #F3EAE0
  --primary           #D2622F
  --primary-foreground #1A0E06
  --secondary         #271F18
  --secondary-foreground #F3EAE0
  --muted             #271F18
  --muted-foreground  #A8998B
  --accent            #2F251C
  --accent-foreground #F3EAE0
  --positive          #8FA75B   (WON rows, gains)
  --negative          #CB5F4F   (LOST rows, losses)
  --destructive       #CB5F4F
  --destructive-foreground #F3EAE0
  --warning           #CB5F4F   (there is no amber in this product)
  --border            #33291F
  --input             #33291F
  --ring              #D2622F
  --radius            0.125rem
```

## Colour usage

`--primary` fills the one primary button, draws the section hairlines' label,
marks the current nav link and the focus ring, and colours links (always with an
underline as well). Body text is `--foreground` or `--muted-foreground`, never
`--primary`. Outcome colour is `--positive` / `--negative` and every coloured
figure is accompanied by the word WON or LOST so the hue is never the only
carrier.

There is no second accent. Amber is banned outright, including as a warning
token, because this direction's accent is already warm and a second warm hue
beside it reads as an accident rather than a decision.

## Amendments

- **2026-08-30.** The identity was authored in Phase 8. The scaffold shipped with
  no identity file at all, so every visual decision through Phase 7 was taken by
  taste against a teal-on-navy palette that the judge panel read as a template.
  This file replaces that palette wholesale and is the first entry in its own
  history rather than a revision of an earlier one.
- **2026-08-30.** Phase 8 was granted a narrow, now spent lift of the `Never
  touch` fence in `CLAUDE.md` for exactly four vector files that carried dead
  palette hexes: `app/icon.svg`, `public/logo.svg`,
  `public/illustrations/roll-loop.svg` and
  `public/illustrations/window-grid.svg`. Everything else under `public/` stayed
  untouched, and no `app/opengraph-image.tsx` was added.
- **2026-08-30.** `public/brand/logo.png` is retained as the one mark under the
  ONE MARK rule even though its raster was drawn against the pre-identity
  palette. It is a binary outside the fence lift above, and the alternative (no
  raster at all) would leave the masthead with a wordmark and nothing else. The
  repaint of that raster is Phase 9 work.
- **2026-08-30, Phase 9.** A narrow, now spent lift of the `Never touch` fence in
  `CLAUDE.md` for exactly one new file, `public/brand/mark.svg`. The masthead
  raster `public/brand/logo.png` was drawn against the pre-identity teal palette
  and reads cool grey-green beside the clay accent at 28px, and a raster is a
  binary no shell-less session can repaint. The replacement is a vector drawn
  from the same family rules as `components/brand/marks.tsx` (48 by 48 box,
  stroke width 2, round caps and joins, `rx="1"`), in three token colours written
  out as hex because a file served from `public/` cannot read a CSS variable:
  `#16110D` ground, `#D2622F` and `#F3EAE0` strokes. `public/brand/logo.png` and
  `public/brand/og.png` stay on disk untouched, `app/opengraph-image.png` was not
  touched and no `app/opengraph-image.tsx` was added. The ONE MARK rule still
  holds: the header is one `<Image` plus the word Perennis.
- **2026-08-30, Phase 9.** The motion system gains a third keyframe,
  `pns-draw-in`, which animates `stroke-dashoffset` on one decorative figure
  stroke (the balance sparkline) and nothing else. It is the same idea as
  `pns-rule-draw`: a line arriving, never the visibility of a value. The base
  style is the finished line, so animations off, `prefers-reduced-motion:
  reduce` and a screenshot taken before the animation starts all show the whole
  path. Three keyframes is the ceiling; a fourth amends this file first.
- **2026-08-30, Phase 9.** `public/brand/og.png` and `app/opengraph-image.png`
  are still in the pre-identity palette and are still not repaintable from a
  shell-less session. They are the last two pre-identity surfaces in the
  repository. Neither appears on a page: the OG card only renders inside a link
  preview.
- **2026-08-30.** `--warning` is kept in the token block as an alias of
  `--negative` so the token table stays complete, but no class name derived from
  it is used anywhere in `app/` or `components/`. Loss and alert surfaces name
  `--negative` directly.
