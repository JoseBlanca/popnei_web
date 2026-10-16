# Plan: four small changes to popgen2.html, agreed with the owner on 16 October 2026

16 October 2026. A small piece on the branch `popgen2-tidy`, from `main`
at fe6c64ff. It serves use case 1 (`docs/use-cases.md`, the PCA, step 2:
the LD pruning) and use case 4 (the analyses of the populations), and
the first step of both, opening the two files. The owner agreed the four
changes in chat on 16 October 2026; nothing of them waits for a decision.

## What the user can do when it is done

1. **The box Individuals at the top is a summary.** It shows the file's
   name, the list "Column of the populations", and one line such as
   "180 individuals classified in 3 populations, 20 unclassified". The
   table of the individuals per population and the button
   "Remove panel_pops.csv" are in the Individuals tab, where the user
   goes for the detail of the file.
2. **The options of each analysis are folded away.** In the PCA,
   Populations and Distances tabs, the options are in a section that
   opens and closes, "Parameters", closed when the page opens. The tab
   shows Run near its top, so a user who keeps the defaults runs the
   analysis with one press.
3. **The PCA and the LD decay run with no option typed**: the PCA's LD
   pruning starts at a window of 100,000 base pairs (r² 0.1, as now),
   and the LD decay's largest distance at 100,000 base pairs.
4. **The PCA tab says nothing of the individuals when it uses all of
   them**; the boxes already say how many there are. When the filters
   of individuals remove some, the line stays: "111 of the 200
   individuals of panel.nei, those the filters of individuals keep".

## Decisions already made

- The owner, 16 October 2026: the four changes as above. For item 2,
  the owner refused to show the values in force in the closed header of
  the section (too long); the header is the word alone. It must be a
  real disclosure, a button that the keyboard reaches and opens with
  Enter or Space and that tells a screen reader whether it is open
  (`aria-expanded`). A reason that greys Run because of an option stays
  beside Run, visible with the section closed.
- The owner, 16 October 2026, for item 3: the defaults reverse the rule
  of "no default that depends on the genome" for these two distances
  only. The LD filter of the Variants tab keeps no default distance. The
  LD decay's warning of a half distance close to the largest distance
  stays, and is now also the sign of a default too short for the
  user's genome.

## Decisions of the session, said in the report

- **The list "Column of the populations" stays in the box.** It is the
  one choice of the individuals file that every analysis of the
  populations reads, and the summary line counts by it. The zone that
  opens an individuals file stays in the box too. The warnings of the
  box (a column of more than 20 values, no individual of the variants
  file in the individuals file, no column to choose) stay in the box,
  because they say the summary cannot be trusted. The lines of the
  counts that wait for the one pass stay in the box, with "…" in place
  of the numbers of the summary line.
- **The words of the summary line**, of the individuals kept by the
  filters of individuals, as the counts are now:
  - some classified, some unclassified: "180 individuals classified in
    3 populations, 20 unclassified";
  - all classified: "200 individuals classified in 3 populations";
  - none classified, with no individuals file, "None" chosen, or a
    column that classifies none: "200 individuals, all unclassified";
  - one population, one individual: "1 individual classified in 1
    population".
  The builder may adjust the words where a case shows they read badly,
  and says so.
- **The Individuals tab**, from the top: "Remove panel_pops.csv"; the
  table of the individuals per population, now with a visible heading,
  "Individuals per population, after the filters of individuals", and
  the line of the unclassified under it (the line that names the
  individuals not in the file); then what the tab holds today. Remove
  greys while the diversity, the LD decay or the distances run, with
  the same reason as now. After Remove, the focus goes to the zone's
  button in the box, "Open individuals file…", as now.
- **The section "Parameters"** uses the widget `Disclosure` of
  `src/ui/widgets/Disclosure.tsx` (React Aria's disclosure, used today
  by `popgen.html`), its header "Parameters" with the chevron "›" that
  turns when open. One section per analysis: the PCA tab one; the
  Populations tab two, one for the diversity and one for the LD decay;
  the Distances tab one. It holds every option of that analysis, the
  method and the filters of the PCA among them; the components on the
  axes and the colour of the points are of the result and stay out.
  Whether it is open belongs to the screen and is not saved; it stays
  as the user left it while they move between tabs, since the tabs stay
  drawn.
- **The reasons beside Run** that send the user to a field "above" now
  name the section: "Type the LD distance in Parameters, or turn the LD
  pruning off.", "Type the largest distance in Parameters." The full
  reason stays beside its field inside the section.

## What it stands on

- Item 1: `src/ui/variants/IndividualsBox.tsx` (`ColumnAndCounts`,
  `CountsTable`, `NoFileCounts`, the `FileZone` with Remove);
  `src/ui/variants/IndividualsTab.tsx`; `src/ui/variants/individualsWords.ts`
  (`removeLabel`, `countsShown`, `noFileCounts`, `countsCaption`); the
  lock `usePopulationsLock` and `usePopulationsRunning` of
  `src/ui/variants/filtersLock.ts`, which the tab uses already for its
  three lists of the reader; `populationCounts` of core.
- Item 2: `src/ui/analyses/AnalysisPanel.tsx` (draws `ui.Options`, then
  the lines, then `RunButton`); the options of each tab:
  `pca/PcaTabOptions.tsx`, `diversity/DiversityTabOptions.tsx`,
  `ldDecay/LdDecayTabOptions.tsx`, `popDists/DistancesTabOptions.tsx`;
  `RunButton.tsx`, which gives a greyed Run its reason;
  `src/ui/widgets/Disclosure.tsx`.
- Item 3: `PCA2_DEFAULTS` of `src/core/analyses/pca.ts` (`ld.maxDist:
  null`), `pruningDistanceText` and `PRUNING_DISTANCE_SHORT`;
  `LD_DECAY_DEFAULTS` of `src/core/analyses/ldDecay.ts` (`maxDist:
  null`), `NO_DISTANCE`, `NO_DISTANCE_RUN`. The defaults are for
  `popgen2.html`. If `LD_DECAY_DEFAULTS` is shared with `popgen.html`,
  `popgen2.html` gets a default of its own, as `PCA2_DEFAULTS` is beside
  `PCA_DEFAULTS`, and `popgen.html` stays as it is (it is deprecated,
  its flows must keep passing). The value is popnei's `maxDist` in base
  pairs, 100000. A field emptied by the user is still "no distance" and
  greys Run as now.
- Item 4: `readyLines` of `src/ui/analyses/pca/words.ts` and
  `pcaTabReadyLines` of `src/ui/analyses/pca/tabWords.ts`: on
  `popgen2.html`, no line when every individual is used; the old page
  keeps its line.

## The phases

Phases 1 and 2 touch different files and are built at the same time by
two subagents; phase 3 starts when both are committed.

1. **The defaults and the PCA's line (items 3 and 4), and the two
   documents.** Core and words: the two defaults, the words under the
   two distance fields rewritten for a field that has a value (what the
   distance is, that 100,000 bp is a start that suits many genomes and
   not all, that the LD decay of the Populations tab shows how far LD
   extends), the line of item 4. `docs/functionality.md` and
   `docs/use-cases.md` for all four items, including item 1's box and
   tab as described above, with the owner's decision dated 16 October
   2026 and the option not taken (no default). Specs:
   `docs/specs/analyses/pca.md`, `docs/specs/analyses/ldDecay.md`,
   `docs/specs/steps/popgen2-pca.md` (the field, the line of item 4),
   `docs/specs/steps/popgen2-populations.md` (the LD decay's field).
   Tests: core tests of the defaults and of a key with them; the PCA and
   the LD decay run on the test file with no option typed; the line of
   item 4 present and absent. Flows of `e2e/popgen2Pca.spec.ts` and
   `e2e/popgen2LdDecay.spec.ts` that typed a distance before Run still
   pass or are changed to the default. Screens: the PCA tab and the LD
   decay at 1280 px with the defaults, before and after Run.
2. **The box and the Individuals tab (item 1).** Spec first:
   `docs/specs/steps/popgen2-input.md` (the box, the tab, the lock, the
   states, the words, accessibility). Tests: the summary line in each
   case above, the waiting counts, the warnings still in the box, the
   table and Remove in the tab, Remove greyed with its reason while the
   diversity runs and not while the PCA runs, the focus after Remove.
   Flows in `e2e/popgen2Input.spec.ts` and those of the lock
   (`e2e/popgen2Populations.spec.ts`, `e2e/popgen2Distances.spec.ts`)
   moved to the tab. Screens: the box and the tab with no file, with a
   file of some unclassified, of all classified, with the warning of too
   many values, while the counts wait, and with Remove greyed; 1280 and
   320 px, light and dark.
3. **The sections "Parameters" (item 2).** Specs first: the three tab
   specs, `popgen2-pca.md`, `popgen2-populations.md` (the diversity and
   the LD decay), `popgen2-distances.md`. Tests: closed when the page
   opens; Enter and Space open and close it; `aria-expanded`; the
   options inside work as before; a greyed option (the lock while an
   analysis runs) still reached once open; the reason that greys Run
   for an emptied distance visible beside Run with the section closed;
   the section's state kept across tabs. Screens of the three tabs,
   closed and open, with Run greyed by an emptied distance, at 1280 and
   320 px, light and dark, and the layout flows also with
   `POPNEI_WIDE_FONT=1`.

## The review

After phase 3, over the whole branch: `spec`, `tests`, `stale`,
`errors`, `api`, `react`, `accessibility`, `ux`, `browser`; not
`architecture` (no layer boundary changes) nor `bundle` (no dependency,
no new entry; the Disclosure widget is already in the bundle of
`popgen.html` and may enlarge that of `popgen2.html`, which the browser
reviewer checks in the build's sizes).

## What is left out

- The values in force in the closed header of "Parameters" (refused by
  the owner).
- A default for the LD filter of the Variants tab.
- The open points of the handoff of 16 October 2026: a change of the
  PCA's or the diversity's options waits while a long LD decay runs; the
  paragraph of the Distances tab on Hudson's Fst and Jost's D; the
  rarefaction curve (popnei issue 18).

## What was done

Each phase adds its entry here: its commits, the counts of its checks,
its review with the findings not taken, and the decisions made along
the way.

Baseline at fe6c64ff, 16 October 2026: typecheck, lint and format
clean; Vitest 190 files, 5,643 tests passed.

### Phases 1 and 2, 16 October 2026

Built at the same time by two subagents. Phase 2 (item 1) in 7058b7fe
(the spec first), 9d521f29 and 890d017a; phase 1 (items 3 and 4) in
2fd86438, with the documents and specs in 04811a57 and 88e81869 (a
first-reader pass on `docs/functionality.md` and `docs/use-cases.md`).
Phase 1's screens of `e2e/screens.spec.ts` went into 890d017a, since the
two shared the file.

Choices of the builders, in the specs: the summary line counts only the
populations with an individual kept; "No individual is kept by the
filters of individuals" when none is; while the counts wait, "…
individuals classified in 3 populations"; the line of the waiting
counts also under the tab's table; with no individuals file the tab
keeps only "No individuals file open."; an emptied distance field on
`popgen2.html` is now no distance and greys Run (before, it showed its
old number again, so the reason could not be reached once a default
existed); the reason under an emptied field says "Type a distance in
base pairs, 100,000 to start with, …". The keys are unchanged: the
default and 100,000 typed give one key. popnei 0.2.2 under node gives
the same PCA of `panel.nei` within 100,000 bp as within 50,000: 548
variants, PC1 3.55%.

Checks at 88e81869, run by the session: typecheck, lint, format clean;
Vitest 190 files, 5,654 tests. The builders' Playwright runs, Chromium
and WebKit: every popgen2 flow passed (popgen2Input with
`POPNEI_WIDE_FONT=1` too); screens of both phases at 1280 and 320 px,
light and dark.
