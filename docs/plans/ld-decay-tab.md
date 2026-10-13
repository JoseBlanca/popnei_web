# Plan: the LD decay in the Populations tab of popgen2.html, calculated again by itself

12 October 2026. Piece 2 of use case 4 (`docs/use-cases.md`, case 4,
step 4), after the Populations tab (`docs/plans/population-tab.md`,
merged on 12 October 2026). The owner decided on 12 October 2026 that
this piece and the Distances tab are built in parallel without stopping
for the approval of their specs, and that they check the result
(memory "pieces like existing ones"). The Distances tab is built at the
same time on the branch `distances-tab`.

## What the user can do when it is done

In the Populations tab, below the spectrum, under its own `<h2>` "LD
decay": type the largest distance, press Run, and see for each population
the r² of Rogers and Huff against the distance between two variants, the
means of its bins and popnei's fitted curve, with a mark at the distance
at which r² falls to half; a table of each population's half distance;
each plot and table with its "Download…". After that Run it is
calculated again by itself after each change of what it reads, like the
PCA and the diversity.

## Decisions already made

- **Live, like the others** (the owner, 12 October 2026, option (a) of
  three): after its first Run the LD decay is calculated again by itself
  after each change, last in the order of the page (PCA, diversity, LD
  decay, distances), so the others never wait for it. While it runs, what
  it reads is greyed with the reason, as for the diversity. With a long
  distance a change of a filter greys the filters for minutes, until it
  ends or the user presses Stop; that cost was put to the owner with the
  measurements below and accepted.
- **The time of its last run beside its Stop** (the session's
  recommendation, accepted with (a)): while it runs, and after it ends,
  the tab says how long the last run took, so the user knows what a
  change will cost them.
- **No default distance** (the owner, memory "no genome-dependent
  defaults"): until a distance is typed the analysis is locked, with the
  reason, and is never started by itself.
- **Its place**: the Populations tab, after the spectrum, under its own
  `<h2>` (`docs/specs/steps/popgen2-populations.md`, "The states").
- Everything else as on `popgen.html`: its options and their bounds, the
  50 bins from 1 bp, the MAF limit of 0.95 (from 0.5 to 1), the lock
  above 1 GB of counts, the warning below 20 individuals, the 16
  populations drawn at most, what it reads: every filter of the variants
  but the LD pruning, the filters of the individuals and the populations
  (`docs/functionality.md`, section 6, "LD decay";
  `docs/specs/analyses/ldDecay.md`).

## What it stands on

- `src/core/analyses/ldDecay.ts`, the definition of `popgen.html`
  (`app: ["popgen"]`): it gets a definition for `popgen2.html`, in the
  words of the tabs, as `diversity.ts` does with `definitionOf(page)`
  and `pca.ts` with `pcaOnPopgen2`; its `filtersRead`, `keyInputs`,
  `needs` and `run` as they are unless a test shows otherwise.
- `src/core/apps.ts`: `POPGEN2_ANALYSES` and `POPGEN2_LIVE`; every table
  keyed by `Popgen2LiveId` then asks for the LD decay's entry:
  `ENDS_LIVE` of `src/ui/popgen2Store.ts` (which failures end its live
  state: popnei's refusal for memory among them, with the hold of the
  others after a crash as `docs/specs/steps/popgen2-pca.md` says),
  `LIVE_TABS` of `src/ui/band/bandLine.ts` ("populations"), `LIVE_NAMES`
  of `src/ui/analyses/status.ts`, `LIVE_SAID` of
  `src/ui/variants/announceChanges.ts`, the band's words
  (`bandWords.ts`).
- The lock of what a running analysis reads (`filtersLock.ts`), the
  automatic runs (`src/ui/autoRuns.ts`), the band with Stop all, the
  downloads (`DownloadMenu`), a population's colour and mark
  (`src/ui/analyses/populationGroups.ts`), the line plot
  (`src/charts/line.ts`), all built by the Populations tab.
- The panel of `popgen.html`, `src/ui/analyses/ldDecay/`, for what it
  draws.
- popnei's `calcLdAndDistPerPop` (`ld.d.ts`), as `src/worker/runner.ts`
  calls it; the worker is started again after every LD decay
  (`docs/architecture.md`, section 11, point 16).

## Known limits it carries

- Measured on `popgen.html` (`docs/architecture.md`, section 11), 1,000
  individuals and a variant every 100 bp: 222 s at 2 Mb, 594 to 857 s at
  4 Mb, 2.4 to 2.6 GB; popnei refused for memory at 8.3 Mb after 1,127
  to 1,475 s at about 4 GB. No tab closed.
- popnei loses pairs, without an error, of variants not sorted by
  position (popnei issue 5; `docs/functionality.md`, section 10): as on
  `popgen.html`.

## The phases

1. **The LD decay in the Populations tab, live.** The definition for
   `popgen2.html`; its entry in `POPGEN2_ANALYSES` and `POPGEN2_LIVE`,
   at the end; every table keyed by the live analyses; its section in
   the tab with its options, Run, Stop, Stop recalculating, the time of
   the last run, the lock until a distance is typed, the states of the
   screen spec, the plot, the table and their downloads; what it reads
   greyed while it runs; the band and the status region naming it.
   Spec first: `docs/specs/steps/popgen2-populations.md` gains the
   section of the LD decay; `ldDecay.md` "On popgen2.html";
   `popgen2-pca.md` "Several analyses calculated again by themselves" and
   `popgen2-band.md` for a third live analysis. Tests first. Flows of
   Chromium and WebKit in a new `e2e/popgen2LdDecay.spec.ts`; screens of
   each state at 1280 and 320 px, light and dark.
2. **A measurement**, run alone on the machine (`e2e/measure.spec.ts`,
   projects measure-chromium and measure-webkit): the LD decay of the
   dense file of 1,000 individuals at 100 kb and at 1 Mb on
   `popgen2.html`, its time and the tab's peak of memory, in both
   engines, and the PCA, the diversity and the LD decay live together
   after one change of a threshold. The numbers go to section 11 of
   `docs/architecture.md` and to the report.
3. **The documents**: `docs/functionality.md` (the LD decay on
   `popgen2.html`), `docs/architecture.md`, the specs' status lines.

## The review

Every category of the `code-review` skill, as for the Populations tab:
`spec`, `tests`, `stale`, `errors`, `api`, `architecture`, `react`,
`accessibility`, `ux`, `browser` (the band at 320 px with three live
analyses), `bundle` (the LD decay's code loaded with the tab).

## What is left out

The distances (the branch `distances-tab`); the rarefaction curve
(popnei issue 18).

## What was done

Each phase adds its entry here: its commits, the counts of its checks,
its review with the findings not taken, and the decisions made along
the way.

### Phase 1, 12 October 2026

Built in 6c9b1842 to 2d667eef (the specs first; the definition
`ldDecayOnPopgen2` with this page's populations, as the diversity's; the
LD decay the third live analysis; its section in the tab; flows; screens).
Differences from the plan: `keyInputs`, `needs` and `run` take this page's
populations, not the old page's; the lock of no population kept moved to
`src/core/populations.ts`. Checks at 2d667eef: typecheck, lint, format
clean; Vitest at a load average of about 150 from other work, 5,492
passed and 35 timed out, each of their files passing alone; Chromium and
WebKit, `popgen2LdDecay` 10, `popgen2Populations` 92, `popgen2Live` and
`popgen2Band` 70, `popgen2BandLive` 26; screens 124.

The review, all eleven categories, 12 October 2026. The spec reviewer
recomputed every number with popnei under node (pop_a 7,548 bp, pop_b
7,340 bp, r² at distance 0 0.4694 for both, popnei's own since it depends
on the number of individuals alone, 50 in each); no wrong or stale number
was found. 29 findings held, in the session's `scratchpad/fix-ld.md`. The
ones a user would meet: after popnei refused the LD decay, the tab named a
Run it did not show, and after a Stop two of its sentences contradicted
each other (the diversity's too); with the LD decay alone running and its
tab shown, the band offered no Stop and the tab's was 16 Tab presses down
(the band now keeps the Stop of an analysis that is not the first of its
tab); the two fitted curves and half marks differed only by colour; "half
distance" was not defined; the time of the last run named no distance and
counted the wait for the worker; one quantity had two names on the tab;
the legend cut names that start alike to the same words. The bundle: the
first load of `popgen2.html` 0.86 KB more; the LD decay's 3.78 KB come
with the tab.

Found for the merge with `distances-tab` (the session's
`scratchpad/merge-notes.md`): with the order "PCA, diversity, LD decay,
distances" the distances would wait for every LD decay (222 s at 2 Mb)
and then for the worker started again after it, against the owner's
reason for (a); the order of calculation becomes PCA, diversity,
distances, LD decay, the tabs keeping theirs. A change of another
analysis's own options while a long LD decay runs waits for it, which the
owner was not shown with (a): put to them in the report.


The fixes, 12 and 13 October 2026, d2e3c23c to 629a2663, every test seen
failing first or a mutation of the review now killed: the band keeps the
LD decay's Stop while its tab is shown (it drops the Stop only of the
first analysis of the tab shown); after a refusal for memory the tab says
what brings Run back; "then calculated again by itself" only while live,
for the diversity too; the clock of the last run made once with the
page, beside the automatic runs; it counts from the page's request, the
worker's restart included, as the spec now says (counting from the post
would change the interface of the worker); the old page's script no
longer given to popgen2.html; defaults that fell back to the diversity
made required; popnei's refusal for memory recognised in a shared place;
each population's fitted curve and half mark in its own dash (the
spectrum's lines too); the legend's names cut in the middle; "half
distance" defined; "ρ per base pair, 4Nₑr"; "The last run, pairs up to
100,000 base pairs, took 3:42."; the LD decay's own maximum major allele
frequency named once; 40 px before its heading. "LD decay soon" with its
Stop recalculating needs 295 px of 288 at 320 px and takes a second row,
as "Diversity later". Checks at 629a2663: typecheck, lint, format clean;
Vitest 180 files, 5,550 tests; Chromium and WebKit, `popgen2LdDecay`
24, `popgen2BandLive` 26, `popgen2Band` 40, `ldDecay` 24,
`popgen2Populations` 92, `popgen2Live` 30, `plots` and `ldDecay` 96;
screens 136; no flow failed on any run.

### Phase 2, the measurement, 13 October 2026

3dca6bfe, `e2e/measure.spec.ts`, "LD2 the LD decay on popgen2.html", run
with no other agent on the machine (load average over one minute 4.8 to
7.0). The file: 15,000 variants, one every 100 bp (1.5 Mb), of 1,000
diploid individuals; each case once on a new page; the peak the sum of
the engine's processes, sampled every 100 ms; the time from Run to the
table shown.

| case | Chromium 153 | WebKit 26.6 |
|---|---|---|
| 100 kb, one population | 8.6 s; 0.19 → 0.79 GB | 10.7 s; 0.36 → 1.02 GB |
| 1 Mb, one population | 45.3 s; 0.19 → 0.91 GB | 52.1 s; 0.35 → 1.12 GB |
| 100 kb, two populations of 500 | 8.2 s; 0.22 → 0.63 GB | 10.5 s; 0.40 → 0.88 GB |
| 1 Mb, two populations | 46.1 s; 0.22 → 0.83 GB | 49.4 s; 0.43 → 1.09 GB |
| the three live, after the missing data moved to 0.04, the LD decay at 100 kb | PCA 2.1 s, diversity 2.8 s, LD decay 10.3 s; 0.32 → 0.77 GB | PCA 2.1 s, diversity 2.8 s, LD decay 11.8 s; 0.47 → 1.27 GB |

No tab closed and popnei refused nothing. The tab's time of the last run
is about 1 s short of the time from Run to the table and shows whole
seconds rounded down. So decision (a) costs a user under a minute of
greyed filters per change up to 1 Mb on 1,000 individuals, with the PCA
and the diversity answering within 3 s; the minutes of section 11 begin
above 2 Mb.

### The merge with the other piece, 13 October 2026

The branches `ld-decay-tab` and `distances-tab` were merged on the branch
`case4-ld-distances` (6731967c, conflicts in 20 files resolved by the
session's notes). The order of calculation of the live analyses became
PCA, diversity, distances, LD decay, so that the distances never wait for
a long LD decay, the owner's reason for letting it recalculate by itself;
lists said without "then" (Stop all, the link to warnings, "start in a
moment") follow the tabs, `src/ui/analyses/tabOrder.ts`. After the merge,
code the two branches had written twice or three times became one:
`createTabLoader`, `LivePart`, `liveLines.ts` (the band's and the status
region's) and `liveTabLines.ts` (a tab's), `unclassifiedWords.ts`;
`liveStatesOf` maps over the live analyses. The band says "then the
diversity and 2 more" and "The PCA and 3 more start in a moment", the
whole list for a screen reader, so that it keeps one row at 320, 720 and
1280 px with four live analyses. The distances' refusal words name no
Run that is not there.

A review of the merge (`stale`, `browser`): no stale result, time or
word with four live analyses in every order tried on the real store, and
852 lines of words the same before and after the shared code but the
distances' Stop and failure lines, as intended; the four run in order in
both engines and the band keeps one row. Known, not fixed: in WebKit at
720 px with the page's own text at 200% (WebKit has no text size of the
browser) the band's words are cut, as the media query follows the
browser's text size; Chromium with its real text size shows the short
form; for the owner to try in Safari. The documents of both pieces
(13 commits) and the first load: `popgen2.html` 334.22 KB, against
333.16 KB on main at 405e4295 measured the same way, after the code each
tab alone needs was moved into the tab (d3f48f49, ccee97be).

One flow of the 3D PCA in WebKit (AP6 D3 kept drawn) failed once in
three under load and passed 6 of 6 after; neither it nor the 3D code
changed in these pieces.
