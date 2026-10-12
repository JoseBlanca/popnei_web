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
