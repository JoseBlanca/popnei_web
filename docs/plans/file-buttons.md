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
- A file dropped on a box still opens it, as it did on the zone in the
  box: with a file open, the whole box takes a dropped or pasted file,
  with no dashed zone drawn; the button in the tab opens the picker and
  its zone takes a drop too.

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
  box Individuals is stopped, which this piece changes for a box with a
  file open.

No function of popnei is called; no interface between the layers
changes.

## The design

- `OpenVariants` and the zone of `IndividualsBox` render in the box only
  while no file of their kind is open (`project.variants` or
  `project.individuals` null). With a file open, the box's content is
  wrapped in a drop zone with no button and no dashed border, which
  takes a dropped or pasted file through the same `onFiles` as the
  zone, so that the drop, the paste and the picker share one path;
  `FileZone` gains what that needs (a form with no button and no frame)
  rather than a second widget.
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
   the end of its tab; a drop on the box with a file opens it; Remove and
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
   `docs/specs/entry.md` for the drop on a box.

## Left out

- popgen.html, the old page, which will be deleted.
- A served font, a decision of the owner still open.

## What was done
