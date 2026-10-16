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
  `--zone-border-style`, `--tab-bar`, `--tab-bar-page`,
  `--page-margin-inline`, `--page-padding`, `--panel-padding`,
  `--panel-border`, `--color-tab-under`, `--shadow-tab-selected` and
  `--shadow-tab-greyed`; used in `base.css`, `Band.module.css`,
  `VariantsPage.module.css`, `FileZone.module.css`, `Tabs.module.css`,
  `Table.module.css`, `SortableTable.module.css`, `Slider.module.css`,
  `ThresholdSlider.module.css`, `PcaResults.module.css` and
  `src/charts/charts.css`. `Tabs.tsx` gives the tabs and the panel of
  the page's row classes of their own, `pageTabs` and `pagePanel`, by
  which the panel joins the row.
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
   check, lint, format, Vitest, and the whole Playwright suite, every
   spec file and not only the flows of popgen2.html, since the flows of
   the plots on their test page and of the old page take the same
   tokens, in Chromium, Firefox and WebKit, one browser run at a time.
2. The screens of popgen2.html in both themes at 1280 and 320 px, looked
   at; the review: ux, accessibility, browser.
3. A short note under `docs/designs/`, once the owner accepts the look in
   the running page.

## Left out

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
- The second review of the look, 16 October 2026; each finding fixed in
  its own commit:
  - The flows of the plots and of the 3D view on their test page still
    held the colours before the look, and 10 of their 68 failed in
    Chromium, unseen while only the flows of popgen2.html were run. They
    hold the look's now, and the contrast of the four lines with no
    casing is measured on the panel, where the plots stand (07e89cf1).
  - A tab of the page's row greyed while shown had a dark line of 1 px
    under it at 1280 px, the greyed colour of the 3 px bar of the rows
    inside a result; it has the row's line, and a flow checks it
    (0d0dbd89).
  - The panel joins the row by classes of its own, `pageTabs` and
    `pagePanel`, rather than by a negative margin, `--panel-join`, that
    cancelled a gap set elsewhere, and a sibling selector (459bb4cd).
  - The shadows of the tabs take the bar's 3 px from `--tab-bar`; the
    panel's room above and below, a clamp of 3vw, is 24 px from 40em and
    12 px under it, as it was at 1280 and 320 px (92c7b1d8); the
    comments of the tabs' styles say where each row's bar is, and the
    ratios of the look, 3.13:1 and 3.03:1 between the text and the
    greyed text (e978c916).
  - The flows: the bar of the joined tab in the accent and the tab and
    the line under it in the panel's colour, at 320, 639, 640 and 1280
    px, where a bar in the panel's white passed before (f3cd55ef); forced
    colours at 639 and 640 px too (d02c7a58); the words over the place
    of the 3D view while it loads, on the panel's colour (821c7582); the
    plots of the FILTER box compared after its first click too
    (4483ca2b); the border, the focus and the danger on the band, the
    boxes and the zone in the test of the tokens (6a17b4d7).
  - The documents the look made false: the excerpt of the tokens and
    the ratios in `.claude/skills/coding/css.md` (1ed2d1ec); the ratios
    of the bars in `docs/specs/charts/histogram.md`, of the tabs in
    `docs/specs/steps/popgen2-pca.md`, the grey of a threshold that
    keeps every value in `docs/specs/steps/popgen2-filters.md`, and the
    legend's background in `docs/specs/charts/scatter.md` (df110a8e),
    edited once the piece of the other session was merged into this
    branch; and the plan cited by `tokens.css` (b9590a0f).
  - After the fixes, the whole Playwright suite, every spec file of the
    projects chromium and webkit: in Chromium 910 passed of 911; the
    one failure, a download of a histogram's menu that timed out
    waiting for the file under the load of the whole run, passed 5 of
    5 times run alone. In WebKit 909 passed, and the 2 of forced
    colours skipped. Firefox was not run. The tab greyed while shown
    was seen at 1280 px in Chromium, light and dark, with its grey bar
    at its top and the row's line under it.
