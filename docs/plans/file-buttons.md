# The buttons of another file in their tabs

The plan of a small piece, 16 October 2026, as the `building` skill
describes it, for the subagents that build and review it and for a
session that continues it.

## What the user can do when it is done

The owner asked on 16 October 2026, after the look of
`docs/designs/visual-design.md`:

- Once a variants file is open, "Open another variants file…" is no
  longer in the box Variants but at the bottom of the Variants tab,
  after "Download filtered variants…".
- Once an individuals file is open, "Open another individuals file…" is
  no longer in the box Individuals but at the bottom of the Individuals
  tab, beside "Remove panel_pops.csv", which moves there from the top of
  the tab: the two actions on the file together, at the bottom.
- Before a file is open, its box keeps its "Open variants file…" or
  "Open individuals file…", so that the first opening is found without
  looking in a tab.
- The two boxes side by side are of the same height and their buttons,
  while they have them, at the same height, at the bottom of each box.
- With a file open, its box takes no dropped or pasted file: a file is
  dropped on the zone at the end of its tab, beside its button, and a
  drop on the box is stopped as a drop anywhere outside a zone is
  (`src/ui/strayDrops.ts`). Before any file, the box keeps its zone with
  "Open … file…". The owner decided so on 16 October 2026, after phase
  1, which had made the whole box of a file open take a drop.

Use cases: `docs/use-cases.md`, cases 3 and 4, the step that opens the
files; the boxes then become the summary of each file the owner asked
for on 16 October 2026.

## What it stands on

Found by reading the code on main at 2da6b3f9:

- `src/ui/variants/VariantsPage.tsx` (the two boxes, `.boxes`, `.box` of
  `VariantsPage.module.css`; the refs `openButton` and
  `individualsOpenButton` passed to the boxes and to `PageTabs`).
- `src/ui/variants/OpenVariants.tsx` (the zone of the variants file,
  `OPEN_LABEL`, `OPEN_ANOTHER_LABEL` of `words.ts`), wrapped in
  `.section` of `Variants.module.css`; `VariantsSummary.tsx` (progress,
  Stop, Start again, the refusal, all outside the zone).
- `src/ui/variants/IndividualsBox.tsx` (its `FileZone`, its `waiting`
  while the diversity runs, its refusal `Problem` above the zone).
- `src/ui/widgets/FileZone.tsx` (React Aria's `DropZone`, its picker, its
  hidden paste button, `waiting`).
- `src/ui/variants/PageTabs.tsx`, `StatsSection.tsx`, `FileStats.tsx`
  (the Variants tab ends with `<DownloadVariants/>`),
  `IndividualsTab.tsx` (`Remove` first, the rows table `FileTable` last).
- `src/ui/strayDrops.ts`: a file dropped outside a zone is stopped,
  `docs/specs/entry.md`, "A file dropped outside a zone";
  `e2e/strayDrops.spec.ts` EN30 checks that a drop on the heading of the
  box Individuals is stopped, which holds for a box with a file open
  too since the owner's decision of 16 October 2026.

No function of popnei is called; no interface between the layers
changes.

## The design

- `OpenVariants` and the zone of `IndividualsBox` render in the box only
  while no file of their kind is open (`project.variants` or
  `project.individuals` null). With a file open, the box has no zone and
  takes no drop (the owner's decision of 16 October 2026, which replaced
  the drop zone with no button and no frame around the box that phase 1
  had built). The box's lines, with Stop, Start again or the list of the
  column, are in a boundary of errors keyed by the file, and the zone,
  before a file, in one of its own.
- A file refused by the zone of a tab has its words under that zone too,
  where the user is, as well as in the box and, once, in the status
  region; they are brought into the window when they come below it.
- The Variants tab ends with a `FileZone` whose button is "Open another
  variants file…", after `DownloadVariants`. The Individuals tab ends
  with Remove and a `FileZone` whose button is "Open another individuals
  file…", side by side and wrapping on a narrow window, with the zone's
  `waiting` while the diversity runs, as in the box now.
- The box keeps its zone at its bottom, `margin-block-start: auto` or the
  rows of its grid, so that the two "Open … file…" buttons line up; the
  boxes already stretch to the same height in their row.
- Focus: an opening by the box's button leaves no button to keep the
  focus on, since the box's zone goes; the focus goes to the box's
  heading, made focusable with `tabIndex={-1}`, so that a user of the
  keyboard stays where they were. Remove, at the bottom of the tab now,
  puts the focus on the box's "Open individuals file…", as it does now.
  The refs `openButton` and `individualsOpenButton`, which other parts
  focus (Stop, errors), point at whichever button exists: the box's
  before a file, the tab's after; each use is read and kept right.
- A tab hidden or greyed keeps its controls out of the Tab key, as it
  does now.

Where there was a choice: a plain button in the tab, with no zone, was
the other option; the zone is kept so that a file can be dropped in the
tab too, where the user's eyes are when they decide to change it.

## Phases

1. The code and its flows: the zones moved, the box's drop, the focus;
   the flows that drop on or find these buttons kept passing (their
   helpers scope to the region "Variants" or "Individuals" and find the
   button by name, so many need the tab instead after a file is open);
   EN30 of `strayDrops.spec.ts` changed to a drop on a box with no file,
   and a new one for a box with a file. New flows: the buttons at the
   bottom of each box before a file, at the same height at 1280 px; the
   boxes' heights equal; after a file, no zone in the box, the button at
   the end of its tab; a drop on the tab's zone opens a file; Remove and
   "Open another individuals file…" together at the bottom, wrapping at
   320 px; the focus after an opening and after Remove; axe light and
   dark. Checks: type check, lint, format, Vitest, the whole Playwright
   suite in Chromium and WebKit, the page's flows also with
   `POPNEI_WIDE_FONT=1`.
2. The screens: the empty page, both files open, each tab's bottom, at
   1280 and 320 px, light and dark; the review (spec, tests, stale,
   errors, react, accessibility, ux, browser).
3. The documents: `docs/specs/steps/popgen2-input.md` (the boxes, the
   tabs, the tab order, the focus, the checks), `docs/designs/input-page.md`
   where it says what the boxes hold, `docs/use-cases.md` and
   `docs/functionality.md` where they place Remove at the top,
   `docs/specs/entry.md` for the drop on a box of a file open, stopped.

## Left out

- popgen.html, the old page, which will be deleted.
- A served font, a decision of the owner still open.

## What was done

Phase 1, 16 October 2026, in three commits on file-buttons:

- `FileZone` takes `buttonLabel: null` for a zone with no button, no
  picker and no dashed frame, around what it holds; `useFocusOnGone`
  (`src/ui/variants/focusOnGone.ts`) hands the focus on when a part that
  holds it leaves the page, with a test in jsdom under StrictMode.
- The boxes: before a file, the zone at the bottom of each box, a column
  of flex whose end takes the room left, so that the two buttons stand
  at the same height; with a file, the whole box is a zone with no frame
  around its heading and lines. The ends of the tabs: "Open another
  variants file…" after `StatsSection`; "Open another individuals
  file…" with Remove as its `actions`, both outside the boundaries made
  for each file. The individuals file has one opening,
  `useIndividualsOpening` of `OpenIndividuals.tsx`, made by the page and
  shared by the box and the tab; Remove is `RemoveIndividuals.tsx`.
- The focus: an opening by a box's button goes to the box's heading
  (`tabIndex={-1}`); Remove, when it had the focus, gives it to the box's
  "Open individuals file…"; the lines of a variants file that go with the
  focus give it to the box's heading, and the statistics to "Open another
  variants file…", each ref read when the part goes.
- The words that sent the user to open a file again "in the box
  Variants" or "in the box Individuals", with a file of that kind open,
  name its tab now (a commit of its own). "Start again in the box
  Variants" stays.
- The flows find the buttons through `e2e/openFiles.ts`; those that open
  a second file while another tab is shown drop it on the box
  (`dropOnBox`). New flows in `e2e/popgen2FileButtons.spec.ts`, 9, which
  all failed on the code before the change in Chromium; EN30 of
  `e2e/strayDrops.spec.ts` changed, and a flow added for a drop on a box
  with a file.
- Checks: type check, lint, format, Vitest 5,716 tests; Playwright on the
  built site, Chromium 921 passed, WebKit 919 passed and 2 skipped; the
  flows `e2e/popgen2*` in Chromium with `POPNEI_WIDE_FONT=1`, 287 passed.
  Firefox not run, as it does not launch on this Mac.

Choices the plan did not settle, made in phase 1:

- "Open another individuals file…" comes first and Remove after it, in
  the zone, as the zone's actions: Remove is inside the dashed zone.
- The words of a file not opened, dropped or picked in a tab, are shown
  in the box, as before, and said in the status region; the tab shows
  none. Changed in phase 2: the tab shows them too.
- The box of a file open and the zone of its tab each have a hidden
  button "Paste a variants file" (or "an individuals file"), so the page
  has two of each name, in two regions. Undone in phase 2, the box of a
  file open having no zone.

For phase 3, the documents also need: `docs/specs/entry.md` and the
input spec on the two paste buttons; the specs of the analyses whose
words now name the tab (`pca.md`, `diversity.md`, `ldDecay.md`,
`popDists.md`, the PCA lock); and `individualsBoxWords` of
`src/core/project.ts`, decided in phase 2.

Phase 2, 16 October 2026, after the owner's decision that the box of a
file open takes no drop, and the reviews of phase 1, in six commits:

- The box of a file open takes no drop (94bf799e): the zone with no
  button and no frame goes, from `FileZone`, `OpenVariants` and
  `OpenIndividuals`; each box is one section again, its lines in a
  boundary keyed by the file and its zone, before a file, in its own.
  The flows drop on the tab's zone (`dropInTab` of `e2e/openFiles.ts`);
  EN30 drops on the headings and lines of both boxes with their files
  open and expects the drop stopped and nothing opened, which failed on
  phase 1. A PCA tab can no longer be greyed while shown, since another
  variants file is opened from the Variants tab: the flows of a tab
  greyed while shown use Distances, greyed by "None" in the list of the
  column. One "Paste a variants file" and one "Paste an individuals
  file" at a time again.
- The words of an individuals file that is a variants file name "Open
  another variants file… in the Variants tab" while a variants file is
  open, and "Open variants file… in the box Variants" while none is;
  the diversity's line of one population for a refused individuals file
  sends the user to the Individuals tab (506c1719). The other words that
  name a box or a button were read in the state they are shown in, and
  are right.
- A file refused by a tab's zone has its words under it, 33 px under the
  button, scrolled into the window when they come below it (55532e47);
  before, they were at page y 217 with the button at y 1725, at 1280 by
  900. Said once in the status region, as before.
- No empty row in the Variants tab of a file not read, 41 px from its
  line to the button where it was 65; and the reason the box keeps its
  height corrected (82e6b3cf).
- The opening of the individuals file is made by a provider around the
  page and read by the zones and the words of a refusal, so that the
  start and end of a run that locks the populations no longer draw the
  page and its five tabs again: 0 drawings of the row of tabs where
  there were 4, in jsdom under StrictMode (e9c2df04).
- Checks: type check, lint, format, Vitest 5,719 tests; Playwright on the
  built site at e9c2df04, Chromium 925 passed, WebKit 923 passed and 2
  skipped; the flows `e2e/popgen2*` in Chromium with `POPNEI_WIDE_FONT=1`,
  290 passed and 1 failed, AP5 D4 of `popgen2Downloads.spec.ts`, which
  fails on main with that font too. Then a scroll margin under the words
  of a refusal in a tab (a commit of its own), with
  `e2e/popgen2FileButtons.spec.ts` run again in Chromium and WebKit, 12
  passed in each. Firefox not run, as it does not launch on this Mac.
  Screens seen in Chromium at 1280 and 320 px, light and dark.

Not settled in phase 2:

- The words of a variants file popnei could not read, in the box, end
  with "Open another file." or "open it again." and name no place; the
  button is at the end of the Variants tab, under the tab's line "…
  could not be read; the box Variants says why.". Left as they are,
  since they name no wrong place. Settled by the review of phase 2,
  below: they name the button and its tab.

The review of phase 2, 16 October 2026, in nine commits:

- The words of a failure in the boxes name the button and its tab once
  a file is open, read or refused, since the box then has no button and
  the page never changes the tab shown: "Open another file with Open
  another variants file… in the Variants tab.", "Open a corrected file
  with Open another individuals file… in the Individuals tab.", and so
  for "Open it again", "Then open it again", "Open the file again", the
  reader of tables not loaded, a row of the wrong length ("… or open a
  corrected file with Open another individuals file… in the same
  tab."), the box's line of a file with no column to choose, the
  greyed Distances' reasons and the diversity's line of one population
  (d216c249). Two constants of `src/core/project.ts`,
  `WITH_ANOTHER_VARIANTS` and `WITH_ANOTHER_INDIVIDUALS`, hold the
  words, and a test ties them to the labels of the buttons and the
  tabs. The refusals of the variants file shared with the analyses say
  "Open another file" where they said "Open another variants file", so
  that the analyses now say "Open another file in the Variants tab.".
  The words of a reload are unchanged, since after it no file is open
  and the boxes hold their buttons.
- Remove is beside the zone of the Individuals tab, outside its
  boundary of errors, in one of its own with no heading; the zone is as
  wide as its button, so the two buttons stand together, side by side at
  1280 px and Remove under the zone at 320 px, Remove now outside the
  dashed frame (c44ed25b).
- The row of tabs is drawn again after a defect when either file's id
  changes (61300104). With both files open and the row down, no button
  opens a file until a reload, which the error bar asks for.
- The words of a file refused in a tab are inside a boundary: the
  Variants tab's in the zone's, the Individuals tab's, which stand
  under the zone and Remove, in one of their own; and they scroll into
  the window at each refusal, the same words twice included (029b8adc).
- The tests: "said once" checked again after its poll and after axe,
  with one status region holding the words (5fb6ea20); the flow of the
  Individuals tab starts with the zone's bottom at the window's bottom,
  so its words start below the window (77cb576f); the band's Tab key
  counted from "Open another variants file…", each control once, 21 to
  the band with a PCA running and 22 round the page with nothing
  running, in Chromium and WebKit (8afceaae); three cases of
  `focusOnGone.test.ts`, each failing without its guard (b953a015); the
  forced colours of a greyed tab not shown checked again at 1280, 640,
  639 and 320 px, with Distances greyed by the column None (d687f3c6).
  Each new test or check was seen to fail on the code or a mutation
  that it guards against, in jsdom or in Chromium, but the band's
  counts, which were measured and not seen to fail.
- Checks: type check, lint, format, Vitest 5,729 tests; Playwright on
  the built site at d687f3c6, Chromium 925 passed, WebKit 923 passed and
  2 skipped; the flows `e2e/popgen2*` in Chromium with
  `POPNEI_WIDE_FONT=1`, 291 passed, AP5 D4 of
  `popgen2Downloads.spec.ts` among them this time. Firefox not run, as
  it does not launch on this Mac. Screens of a variants file and an
  individuals file refused with a file open seen in Chromium at 1280 px
  light and 320 px dark.

Not settled after the review of phase 2:

- With both files open, a defect in the row of tabs leaves no button
  that opens a file until a reload. The boxes could show their zones
  again while the row is down; not done, since it changes what the
  owner decided the box of a file open holds.
- The tabs' lines "… could not be read; the box Individuals says why."
  and "… the box Variants says why." send the user to the box, whose
  words now name the button at the end of the same tab.
- The words of the tabs of the analyses that send the user to open a
  variants file name the Variants tab and not the button, "Open another
  file in the Variants tab.", "open it again in the Variants tab";
  they name a place where the button is.

Phase 3, the documents, 16 October 2026, in one commit:

- `docs/specs/steps/popgen2-input.md`: the zone, one of each kind of
  file at a time, in its box before a file and at the end of its tab
  after; the boxes, with no zone and no drop once their file is open;
  the end of each tab, Remove beside the zone; the words of a file not
  opened, in the box and under the tab's zone, said once; the endings
  that name the button and its tab; the order of the Tab key and where
  the focus goes; the flows FB1 to FB3, EN30 and those of a tab greyed
  while shown; the heights of the boxes no longer left open. The row of
  the tab of a text file refused now says the line it shows, "… could not
  be read; the box Individuals says why.", which the table had left out.
- `docs/specs/entry.md`, "A file dropped outside a zone": a box of a file
  open is outside any zone, and one paste button of each kind of file.
- `docs/designs/input-page.md`: a dated note of the change, the design
  kept as approved. `docs/use-cases.md`, case 4 step 2, and
  `docs/functionality.md`: where the buttons and Remove are.
- The specs whose quoted words name a place, matched to the code:
  `popgen2-pca.md` (the lock of Run, the reasons of Distances, the
  refusals of the variants file and the failures, the tab greyed while
  shown, now Distances), `popgen2-populations.md`,
  `popgen2-distances.md`, `popgen2-download.md`, `analyses/diversity.md`
  (with the case of a refused individuals file, which it lacked),
  `analyses/ldDecay.md`, `analyses/popDists.md`,
  `analyses/writeVariants.md` and `core/project.md`.
- The first reader answered the five questions as meant; fixed from its
  report: the stops of the Tab key in the box Variants with a file open,
  what the user sees of a drop stopped on a box, a sentence of the lock
  that did not parse, and the old "Remove putting the focus on the zone".

Left as found: the words of a write popnei refused, in the dialog of
the download, end "… and open it again." and name no place;
`docs/designs/analyses-pca.md` keeps the words of its day.
