# Plan: the Distances tab of popgen2.html, calculated again by itself

12 October 2026. Piece 3 of use case 4 (`docs/use-cases.md`, case 4,
step 5), after the Populations tab (`docs/plans/population-tab.md`,
merged on 12 October 2026). The owner decided on 12 October 2026 that
this piece and the LD decay are built in parallel without stopping for
the approval of their specs, and that they check the result (memory
"pieces like existing ones"). The LD decay is built at the same time on
the branch `ld-decay-tab`.

## What the user can do when it is done

In the Distances tab, which today says it is not built yet: press Run
and see the distance between every two populations, Hudson's Fst by
default or Jost's D, as a heatmap ordered by the first axis of a PCoA of
the distances, and a table of the pairs with both measures and the
variants of each pair; each with its "Download…". After that Run the
distances are calculated again by themselves after each change of what
they read, like the PCA and the diversity.

## Decisions already made

- **Live, like the others** (the owner, 11 October 2026, for every
  population analysis): after its first Run it is calculated again by
  itself after each change, last in the order of the page (PCA,
  diversity, LD decay, distances). While it runs, what it reads is
  greyed with the reason. It takes 118 ms on 20,000 variants of 1,000
  individuals (`docs/architecture.md`, section 11).
- **No tree** (the owner; `docs/functionality.md`, section 10, and the
  memory "exclude misleading analyses"): the order of the heatmap comes
  from the first axis of a PCoA of the distances, after Lingoes, a
  negative distance counted as 0 for the order alone.
- Everything else as on `popgen.html` (`docs/functionality.md`, section
  7; `docs/specs/analyses/popDists.md`; `docs/specs/charts/heatmap.md`):
  Hudson's Fst by default and Jost's D as the other measure, no standard
  errors; a minimum of 20 individuals with a call, the populations under
  it left out and named; the measure out of the key, since one
  calculation gives both; at least two populations, the tab greyed
  otherwise as it already is (`src/core/popgen2Tabs.ts`); above 200
  populations neither heatmap nor table is drawn (`popgen2.html` takes
  20 populations at most, so this does not happen there).

## What it stands on

- `src/core/analyses/popDists.ts`, the definition of `popgen.html`
  (`app: ["popgen"]`): it gets a definition for `popgen2.html`, in the
  words of the tabs, as `diversity.ts` does with `definitionOf(page)`
  and `pca.ts` with `pcaOnPopgen2`.
- `src/core/apps.ts`: `POPGEN2_ANALYSES` and `POPGEN2_LIVE`; every table
  keyed by `Popgen2LiveId` then asks for the distances' entry:
  `ENDS_LIVE` of `src/ui/popgen2Store.ts`, `LIVE_TABS` of
  `src/ui/band/bandLine.ts` ("distances"), `LIVE_NAMES` of
  `src/ui/analyses/status.ts`, `LIVE_SAID` of
  `src/ui/variants/announceChanges.ts`, the band's words
  (`bandWords.ts`).
- The tab: `src/ui/variants/analysisTabsWords.ts` (`DISTANCES_NOT_BUILT`)
  and `PageTabs.tsx`, where the Distances tab shows that line today; the
  tab's code loaded apart, as the Populations tab's
  (`PopulationsTab.tsx`, `CodeSplit.tsx`, the manifest of the build).
- The lock of what a running analysis reads (`filtersLock.ts`), the
  automatic runs (`src/ui/autoRuns.ts`), the band with Stop all, the
  downloads (`DownloadMenu`), all built by the Populations tab.
- The panel of `popgen.html`, `src/ui/analyses/popDists/`, and the
  heatmap, `src/charts/heatmap.ts`.
- popnei's `calcPopDists` (`pop_dists.d.ts`), as `src/worker/runner.ts`
  calls it (`jackknifeGroup: null`).

## The phases

1. **The Distances tab, live.** The definition for `popgen2.html`; its
   entry in `POPGEN2_ANALYSES` and `POPGEN2_LIVE`, at the end; every
   table keyed by the live analyses; the tab with its options (the
   measure, the minimum of individuals), Run, Stop, Stop recalculating,
   the states of a screen spec, the heatmap, the table and their
   downloads; what it reads greyed while it runs; the band and the status
   region naming it. Spec first: a new screen spec
   `docs/specs/steps/popgen2-distances.md`, in the form of
   `popgen2-populations.md`; `popDists.md` "On popgen2.html";
   `popgen2-pca.md` "Several analyses calculated again by themselves"
   and `popgen2-band.md` for a further live analysis. Tests first. Flows
   of Chromium and WebKit in a new `e2e/popgen2Distances.spec.ts`;
   screens of each state at 1280 and 320 px, light and dark.
2. **The documents**: `docs/functionality.md` (the Distances tab of
   `popgen2.html`), `docs/architecture.md`, the specs' status lines.

## The review

Every category of the `code-review` skill, as for the Populations tab:
`spec`, `tests`, `stale`, `errors`, `api`, `architecture`, `react`,
`accessibility`, `ux`, `browser` (the heatmap at 320 px), `bundle` (the
tab's code loaded apart).

## What is left out

The LD decay (the branch `ld-decay-tab`); the standard errors of the
distances.

## What was done

Each phase adds its entry here: its commits, the counts of its checks,
its review with the findings not taken, and the decisions made along
the way.

### Phase 1, 12 October 2026

Built in c6ea1622 to 125ba06d (the specs first, among them the new screen
spec `docs/specs/steps/popgen2-distances.md`; `popDistsOnPopgen2`; the
distances the fourth live analysis, named in the plural; the tab, its
code loaded apart; flows; screens of 14 states). The builder's choices,
in the spec: "the distances" in the plural (`LiveAnalysisName` gains
`plural`); the measure's radios not greyed while they run, since the
measure is out of the key; the heatmap's CSV the square matrix; the
table's CSV with "First population" and "Second population". Checks at
125ba06d: typecheck, lint, format clean; Vitest 182 files, 5,544 tests;
Chromium and WebKit, `popgen2Distances` and `popgen2Tabs` 44,
`popgen2Live`, `popgen2BandLive` and `popgen2Band` 96; screens 56.

The review, all eleven categories, 12 October 2026. The spec reviewer
recomputed every distance and the heatmap's order with popnei under node
(p0 and p2: Hudson's Fst 0.1027, Jost's D 0.0613, 1,200 variants; the
negative pair of panel_split.csv, −0.0113); none differs. The errors,
browser and bundle reviewers found nothing to fix (80 states measured in
both engines; the first load of `popgen2.html` 0.94 KB more, the tab's
code 9.08 KB at its first show after another tab's). 24 findings held,
in the session's `scratchpad/fix-dist.md`. The ones a user would meet:
"The PCA starts once the distances, which is running, ends"; a change of
the measure, which calculates nothing, restarted the quiet second and
lifted the hold after a crash, as did a change of a threshold switched
off (the live analyses now react to a change of what they are calculated
from); at 320 px the heatmap wrote no values in its cells with nothing
saying where they are; a negative distance painted the legend's 0 with
no word; once drawn, the result no longer said each population's
individuals; nothing helped choose between Hudson's Fst and Jost's D;
the minimum had three names. And tests that could not fail: the
populations dropped from the key would have left old distances on
screen after a file of the same name and column.

Found for the merge with `ld-decay-tab` (the session's
`scratchpad/merge-notes.md`): the helper of no population kept moves to
`src/core/populations.ts`, as the other branch does; the order of
calculation becomes PCA, diversity, distances, LD decay, so that the
distances never wait for a long LD decay; the tab's loader and the lines
of a live analysis, written two and three times across both branches,
are shared after the merge.


The fixes, 12 and 13 October 2026, 7a16d585 to the branch's head, every
test seen failing first or a mutation of the review now killed: the
automatic runs count a new project as a change only when it changes, for
an analysis that can be live, its key or the reason it is locked (the
heatmap's measure, the PCA's colours, axes and 3D/2D no longer restart
the quiet second nor lift the hold after a crash); the plural said
everywhere; the legend's title above its bar, so that three populations
write their values at 320 px, and a line pointing to the table when the
cells cannot hold them; "0.0000 or below" when a distance is negative,
with a sentence; each population's individuals in the caption; a
paragraph under the measure, in popnei's words, for the owner to check;
one name for the minimum; "The heatmap now shows Jost's D."; the
populations, the column and the file in the key's tests; the status
region's words tested. Checks at the head: typecheck, lint, format clean;
Vitest 183 files, 5,568 tests; Chromium and WebKit, `popgen2Distances`
with `popDists` and `plots` 120, `popgen2Tabs`, `popgen2Live` and
`popgen2BandLive` 82, `popgen2Band` and `popgen2Populations` 132; no
flow failed on a retry.

The documents (phase 2) are written once for both pieces after their
merge, so that the two branches do not conflict in them.
