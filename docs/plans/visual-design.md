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
  `--color-tab-under`, `--shadow-tab-selected`, `--page-padding`; used in `base.css`,
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
the theme with no dark copy. Under 40em, 640 px, the width under which
the row of the page's tabs may wrap, the panel runs to the window's
edges with the page's 16 px inside, and the tab shown is not joined to
it, its bar under it (`Tabs.module.css`); above, the panel has 24 px
inside at its sides. A first form, the panel's side padding shrinking
to none at 320 px, left its words touching its border.

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
- The flows of popgen2.html on the look, 16 October 2026: 6 failed of
  263 in Chromium and 7 in WebKit; after the fixes below, 263 passed of
  263 in each. Firefox does not start on this machine and was not run.
  - At 1280 px the band's flow saw a sideways scroll of 8 px for one
    frame, the plot drawn at 720 px still in the centred column before
    it was drawn again: the check polled (d5384ce5).
  - axe: the greyed options of the PCA at 4.37:1 on the dark panel. The
    dark disabled text #7d8997, 4.55:1 on the panel, and the dark text
    #e8edf3, to keep 3.03:1 between them; the pairs on the panel and
    the box in the test of the tokens (dab276b4).
  - The exported bar plot's flow recorded the tokens before the look:
    updated (0097ee9a).
  - The plot of the spectrum at 320 px is 286 px, the column less the
    panel's border (ba5a2ad4).
  - A tab greyed while shown had lost its bar; it has it at its top in
    the greyed colour, and the flows read the bar from the shadow
    (0a7e235b).
  - WebKit: the flow of the error over the download dialog read the
    scroll before Playwright's click moved it 1 px (f1082182); the flow
    of the FILTER box read the plots between their first draw, at a
    rounded height, and their second, at 209.375 px (434e0efb). Both
    passed on main, whose plots at 1280 px have whole heights.
- The review of the look, 16 October 2026, ux, accessibility and
  browser; each finding fixed in its own commit:
  - The comment of a panel kept drawn and hidden, cut off from its rule
    by the panel's rule, back above it (7cb0a7d1).
  - ux F1: under 40em the panel runs to the window's edges, no border
    nor corners at its sides, the page's 16 px inside, a token now,
    `--page-padding`; from 40em 24 px inside. The plot of the spectrum
    at 320 px is again 288 px (9c97345d).
  - ux F2: under 40em the tab shown is not joined to its panel, its bar
    3 px under it. The five labels take 477 px in the Mac's font and
    541 px in DejaVu Sans, in Chromium and WebKit; the row has 608 px
    at 640, 591 with a scrollbar of 17 px (68750ca0).
  - ux F3: the tables, their headers and fades, the PCA's legend and the
    words over its 3D view, and the ring of a slider's handle in the
    panel's colour; the fields, buttons and controls keep the page's,
    tinted on purpose. A new flow reads every element of the panels at
    320 px, light and dark (9680256b).
  - accessibility F1: in forced colours the bars are borders in
    Highlight and GrayText, a tab not shown has none, and a flow checks
    them in Chromium (c260a691).
  - After the fixes the flows of popgen2.html, 268 with the five new
    ones, passed in Chromium, 268 of 268, and in WebKit, 266 with the
    two of forced colours skipped, which Playwright emulates in Chromium
    alone. Firefox was not run.
  - After the merge of main, with the sections "Parameters" closed by
    default and the individuals per population in the Individuals tab,
    the flow of the panels' colours opens the sections, reads their
    header under the pointer and the table of the counts; it found
    nothing in the page's colour there. 276 of 276 passed in Chromium,
    274 in WebKit with the two of forced colours skipped.
