# A visual design for popgen2.html

The plan of a small piece, 16 October 2026, as the `building` skill
describes it. The owner asked for a look that tells the user the page is
modern but not flashy, sober as an academic site, saw three proposals
and two variants on real screens, and chose "Instrument, blue" (2b).

## What the user sees when it is done

The same page, words and behaviour, with another look: a pale blue-grey
page and a soft blue band; the two boxes of the files and the content of
the open tab on white panels; the selected tab of the row of the page
joined to its panel, white like it, its bar at its top; one blue accent
for the selected tab, the links and the focus; text in near-black. No
use case changes; it serves every step of `docs/use-cases.md` that
popgen2.html shows.

## What it stands on

- `src/ui/tokens.css`: every colour, length and radius of the look.
- Tokens the page had no token for, added by this branch with today's
  values as defaults (commits c85d41fc, 55038f7f, b90dcecf and the joined
  tab): `--color-rule`, `--color-box`, `--color-band`, `--color-zone`,
  `--color-heading`, `--color-tab-selected`, `--color-panel`,
  `--font-heading`, `--weight-heading`, `--shadow-box`,
  `--zone-border-style`, `--tab-bar`, `--page-margin-inline`,
  `--panel-padding`, `--panel-border`, `--panel-join`,
  `--color-tab-under`, `--shadow-tab-selected`; used in `base.css`,
  `Band.module.css`, `VariantsPage.module.css`, `FileZone.module.css`,
  `Tabs.module.css`, `Table.module.css` and `SortableTable.module.css`.
- `src/ui/tokens.test.ts`: the contrast of the pairs, and the two dark
  blocks equal.

No interface between the layers, no invariant of `docs/architecture.md`
and no dependency changes.

## The design

The look is a set of token values only. The values of 2b replace the
defaults in `tokens.css`, both themes, the dark one written twice as
`css.md` asks. The shadows and the borders of the tab and the panel name
other tokens, `var(--color-accent)`, `var(--color-rule)`, so they follow
the theme with no dark copy. The panel's padding at the sides shrinks to
none at 320 px, `clamp(0rem, 6vw - 1.25rem, 1.5rem)`, since with 24 px
taken there the heatmap of the distances lost the values in its cells.

The font stays the system's: whether to serve one is the owner's to
decide, after the look.

## Phases

1. The values in `tokens.css`; the new pairs in `tokens.test.ts` (text,
   muted text and accent on the box, the band, the panel and the zone;
   the border on the box and the panel); the recorded ratios of
   `--chart-threshold-keeps-all` on the new background. Checks: type
   check, lint, format, Vitest, the Playwright flows of popgen2.html in
   Chromium, Firefox and WebKit, one browser run at a time.
2. The screens of popgen2.html in both themes at 1280 and 320 px, looked
   at; the review: ux, accessibility, browser.
3. A short note under `docs/designs/`, once the owner accepts the look in
   the running page.

## Left out

- The two ratios of `--chart-threshold-keeps-all` that
  `docs/specs/charts/histogram.md` records: the specs are not edited
  until the piece of the other session (the Individuals box reduced, the
  Parameters section) is merged into main; then they are updated here.
- popgen.html, the old page, which will be deleted: it takes the same
  tokens and is not looked at beyond its flows passing.
- A served font: a decision for the owner.

## What was done

- Proposals 1 to 3, round 1, and 2b and 3b, round 2, as token sets over
  the real page, compared on a private artifact page on 16 October 2026.
  The owner chose 2b.
