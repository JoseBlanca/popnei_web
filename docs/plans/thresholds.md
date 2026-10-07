# Thresholds on the statistics of the open file

The fourth piece of the new screens, asked for by the owner on 6 October
2026 for the night of that day: on each of the six histograms of
`popgen2.html`, a threshold the user drags or types, with the bins
beyond it shaded as removed and how many variants or individuals it
keeps and removes. The thresholds are state of the page: they change no
statistic, are no filter of the project, and are lost when another file
is opened or the page is reloaded, as the owner chose. Applying them as
filters is the design `docs/designs/stats-filters.md` (branch
`design-stats-filters`), waiting for the owner. Built as the `building`
skill says, on the branch `thresholds`, made from `live-stats`
(`docs/plans/live-stats.md`), neither merged yet.

## What the user can do when it is done

Case 1 of `docs/use-cases.md`, the part it takes from case 2: "see the
distributions with the thresholds marked on them; and, for each
threshold, how many variants it keeps". On each histogram the user
drags a vertical line, or types its number in a box beside the plot, or
moves the line with the arrow keys; the line and the box follow each
other; the bins beyond the line are shaded as removed; and a line under
the plot says, for example, "At most 0.1: keeps 1,050 variants and
removes 150". A user of a screen reader hears the value of the line and
what it keeps as they move it.

## What it stands on

- The histogram of `src/charts/histogram.ts`, which already draws a
  threshold that keeps the values at most it: `HistogramData.threshold
  {value, label, keptLabel, removedLabel}`, bins `kept`, `partlyKept`
  (split at the line) and `removed`, a dashed line and a legend, and
  `histogramScales`, whose horizontal axis widens to take a threshold
  outside the edges. The old page uses it with its filters.
- The plots of the page: `variantPlot` and `individualPlot` of
  `src/ui/variants/statsPlots.ts` (today `threshold: null`), drawn by
  `StatsHistogram.tsx` through `HistogramPlot`/`usePlot`, inside
  `FileStats.tsx`; the variants' bins summed from popnei's 1,280 fine
  bins over [0, 1] (`variantBinsRounded`), the individuals' bins made in
  the page from popnei's value of each individual (`binValuesRounded`).
  With `live-stats` they are drawn from the result so far while the pass
  runs.
- The number field of the old page, `src/ui/widgets/NumberField.tsx`
  (commits on Enter, blur, arrows; `onTyped` at each keystroke), and
  React Aria's `Slider` (react-aria-components 1.21.1, already a
  dependency), not used yet in the applications.

## The design

**Where the thresholds live.** A React state of the statistics' section,
one number per histogram, reset when the load of the file changes. Not
in the project: the owner chose page state for tonight, and the design
of the filters moves them there. The state is the threshold as the user
set it (typed or dragged); what is drawn and counted is derived from it.

**The starting values.** The missing rate of the variants starts at 0.1,
the default of its filter in `docs/functionality.md`; the five others
start at the top of their axis, where they keep everything. A
threshold at or above the top keeps everything and says so.

**Snapping and counting, the variants.** The line of a histogram of the
variants moves in steps of one fine bin, 1/1280 of [0, 1], and a typed
number is snapped to the nearest edge of a fine bin when it is
committed, the box then showing the snapped value. What it keeps is
the sum of popnei's fine bins below that edge, and what it removes the
sum of those from it on; the two add up to the variants with a value.
popnei's bins hold their left edge and its filters keep the values at
most their threshold, and popnei makes its edges as k · (1/1280), so
this count equals what popnei's filter at the threshold keeps on 464 of
the 1,281 edges and, on the other 817, leaves out the variants whose
value is exactly on the edge (`docs/designs/stats-filters.md`, "Exact
counts need popnei", with the popnei issue drafted there). The words say
"at most", as the filters of the old page and `docs/use-cases.md` do.
The counting is one function of `src/core/` (`variantsAtMost` of
`src/core/thresholds.ts`), so that the popnei fix changes one place.

Measured in phase 1 against popnei's filters under node: on
`panel.vcf.gz`, "missing rate at most 0.05" keeps 1,152 variants by
popnei's filter and 1,113 by the bins below the edge, 39 left out; at
0.5 the bins leave out 3 variants for the MAF and 8 for the observed
heterozygosity; on `tetraploid.vcf.gz`, 3 for the MAF at 0.5. The round
numbers a user types, 0.05, 0.1 and 0.5, all fall on edges equal to
k/1280, where the bins undercount. So a single number would mislead.
Decided by the session on 7 October 2026, until the owner chooses: on
an edge one double above k/1280 the count is exact and the plot gives
one number; on an edge equal to k/1280 the variants on the edge are
somewhere in the bin that starts at it, and the plot gives the range
the bins allow, from the bins below the edge to those plus that bin,
"At most 0.05: keeps 1,113 to 1,152 variants", one number again when
that bin is empty. The range is computed from popnei's bins, as the
counts are, and says no more than they know. The owner chooses between
it, "below" with one number, and the popnei issue.

**Counting, the individuals.** From popnei's value of each individual:
those with a value at most the threshold are kept, the others with a
value removed; an individual with no value (no called genotype, for the
observed heterozygosity) is in neither, as the plot already says. Exact.
The line moves in steps of 0.0001, the box takes four decimals, as the
thresholds of the individuals of the old page do.

**What each plot shows.** The histogram with its threshold: the dashed
line, the bins kept and removed, a bin split at the line drawn in two;
the legend of the old page's histograms is replaced by the line under
the plot ("At most 0.1: keeps 1,050 variants and removes 150"), since
these are not filters yet ("Kept by this filter" would not be true).
While the pass runs, the counts are of the result so far and say so.

**The line the user drags.** A React Aria `Slider` with one thumb,
laid over the plot so that its thumb is the threshold's vertical line
over the bars, its track spanning the horizontal axis and its values
mapped through the same scale as the chart's (`histogramScales`): the
same domain, widened as the chart widens it. The thumb is the line
itself, tall and thin with a wider area to grab, and visible on focus
with the focus ring of the applications. Keyboard: arrows one step,
Page Up and Page Down ten steps (React Aria's default page step is
checked and set to this), Home and End the ends of the axis. Its
accessible name is the statistic ("Maximum proportion of missing
genotypes"), and its value text says the number and what it keeps
("0.1, keeps 1,050 of 1,200 variants"). Beside the plot, a number box
(the old page's `NumberField`) with the same name; the line follows the
typing, and the box follows the line as it moves.

The option not taken: a line drawn by D3 in the chart with its own
pointer and key handling. React Aria's slider gives the keyboard, the
screen reader's value and the touch handling that a hand-made one would
have to repeat; the chart stays a function of `src/charts` that draws a
threshold it is given.

## The phases

**1. The counts.** Done in 533a95c (see "What was done"). The core functions: snapping a number to a fine edge,
the variants kept and removed at an edge from the fine bins, the
individuals kept and removed at a threshold; tests with numbers from
popnei under node on `panel.vcf.gz`, `panel.nei` and
`tetraploid.vcf.gz`, and a measurement, as a test that pins it, of the
difference from popnei's filter at 0.1, 0.05 and 0.5 on those files.

**2. The thresholds on the plots.** The state, the slider over each
plot, the number box, the shading, the line under each plot, the value
text; during the pass and after. Tests: Vitest of the derived plots;
Playwright on `panel.vcf.gz`: drag a line with the mouse and see the box
and the counts follow; type a number and see the line move; arrows,
Page Up/Down, Home/End; the counts equal to the core functions' on
popnei's numbers; a new file resets them; axe on the page. Screens: the
six plots with thresholds, a line dragged into the middle, focus on a
line, light and dark, 1280 and 320 px.

## What is left out

- The thresholds as filters of the project, with Undo, the
  recalculation of the variants' histograms over the individuals kept,
  the counts of all the filters together and the FILTER filter: the
  design `docs/designs/stats-filters.md`, for the owner to approve.
- Exact counts of the variants on every edge: the popnei issue drafted
  with that design.
- The threshold of the expected heterozygosity as a filter: popnei has
  none (same design).

## What was done

### Phase 1, the counts

Commit 533a95c: `snapToFineEdge`, `variantsAtMost` and
`individualsAtMost` of `src/core/thresholds.ts`, tested on hand-made
inputs and on popnei's numbers, which `e2e/fixtures/make_fixtures.mjs`
writes to `e2e/fixtures/threshold_counts.json` under node (the tests of
core may not call popnei). On 533a95c Vitest "4010 passed". A line at 0
keeps nothing by the bins, since the values of 0 are in the bin to the
right of the edge 0: on `panel.vcf.gz` 2 variants have a missing rate
of 0; the range covers it.

The review of phase 1 sent tests, spec, api and architecture. Fixed in
0899b6d to 6424107: the range is given by core, `variantsAtMost` →
`{ keptLow, keptHigh, withValue }`, one number on an edge one double
above k/1280 for the statistics popnei computes as one division (the
missing rate, the MAF, the observed heterozygosity), a range on an edge
equal to k/1280 whose bin holds variants, and a range on every such
edge for the expected heterozygosity, which popnei computes as
1 − Σ pᵏ and which can land on an edge above k/1280; the individuals
with no value are counted apart, `{ kept, removed, noValue }`, with the
note that the filters of the project remove them; each edge carries the
number shown, k/1280; popnei's filter count lies inside the range, and
equals it where one number is given, at 0.05, 0.1, 0.3 and 0.5 on the
three files (36 cases); the fixture records popnei's version. On
6424107 Vitest "4015 passed". Over every edge of `panel.vcf.gz` and
`tetraploid.vcf.gz`, the tests reviewer found the bins equal to popnei's
filter on all 464 edges above k/1280, and popnei's count inside the
range on all 817 others.

### Phase 2, the thresholds on the plots

Commits f716142, 2f34cc9, 747a926, a1bdcba and b839d33; the fixes of
its review in a142d12 to da37ce7. Each histogram has a React Aria
slider whose thumb is the threshold's line over the plot, aligned with
the chart through a frame the chart tells the page (its margins change
at 320 px); under the plot one row, "Maximum", the box, and the counts.
The builder's choices: clicks on the bars do not move the line, so a
phone scrolls over the plots; the slider's value text is written after
each render, since React Aria gives no way to set it; Page Up and Down,
with or without Shift, move ten steps.

The review sent accessibility, ux, react, api, architecture, tests and
stale, then spec and browser over the fixed screen. Fixed: the bar
that starts at the line is hatched while the count is a range, where it
was drawn as removed, against the words; the range says once why ("the
bins cannot tell which of the 39 from 0.05 to 0.0508 are at 0.05"); the
numbers show four decimals, which name every edge apart, and a typed
number moved to an edge says so; one row under the plot instead of the
title, a label and a box; "(no limit)" for a line the user has not set;
a number being typed is no longer replaced when a result so far widens
the axis; the counts describe the box for a screen reader; Shift with
Page Up/Down moves ten steps; names and comments say threshold, not
filter; tests of the boxes' bounds, step and words. Not taken: a drift
of a few pixels of the line during a drag when the labels of the
vertical axis grow, which no fix pays for. The page at 320 px is
2,828 px tall, from 3,116.

For the owner: the line moves in steps of 1/1280, so round numbers
such as 0.01, 0.02 and 0.07 cannot be set (0.07 is counted at 0.0703);
bins of 1/1000 or popnei's edges as lo + (hi − lo) · k / n with another
number of bins would give them, which is the owner's choice with the
popnei issue.

The spec and browser review of the fixed screen, in Chromium and WebKit
(Firefox cannot be started on this Mac), found that four decimals had
made the counts wrong: the box showed the edge rounded, "Maximum
0.5203", while the count was of the edge 0.5203125, 51 variants where
popnei's filter at 0.5203 keeps 49; on `panel.vcf.gz` 19 edges gave such
a wrong single number. Fixed in 729a9bd: each edge of the variants is
shown in full, k/1280 up to 8 decimals (0.33984375), so the number
shown is the number counted, and a test checks, on the 464 edges above
k/1280 of the three filters on the three files (4,176 cases), that
popnei's count at the number shown lies within the counts shown; the
individuals keep four decimals. Also fixed: the note of a number moved
to an edge goes when an entry is refused (175e03e); each stripe of the
hatch drawn whole, 5.2:1 on the light background and 7.7:1 on the dark
(e936489). On e936489: Vitest "4039 passed", Playwright "1224 passed"
in Chromium and WebKit, the 92 screens of popgen2.

### Round 1 with the owner, 7 October 2026

The owner, trying the page: "1. the numbers in the boxes should have
less decimals, for instance 2 when we're in a range from 0 to 1. 2.
'keeps 564 to 566 variants; the bins cannot tell which of the 2 from
0.69921875 to 0.7 are at 0.69921875' I don't think we need that much
information, it is already quite clear in the plots and moreover, it
makes the page change the position of the chart in a bad way. 3. maybe
we would put the max. and the number widget with the plot title like:
'Obs. het. max: 0.04' 4. The titles could be shorter: 'Proportion of
missing genotypes' -> 'Missing genotypes', 'Observed heterozygosity' ->
'Obs. het.', 'Expected heterozygosity (unbiased)' -> 'Exp. het.
(unbiased)', 'Proportion of missing genotypes of each individual' ->
'Missing GTs', 'Observed heterozygosity of each individual' -> 'Obs.
het.'"

So, decided by the session within those words:

- The step of a threshold, and its decimals, follow its axis: the power
  of ten that gives at most about 100 positions over the axis,
  10^ceil(log10(span / 100)): 0.01, two decimals, on an axis of 0 to 1;
  0.001 on 0 to 0.1 or 0.32 to 0.40. The same for the individuals.
- The number shown is the number counted: a number that is not one of
  popnei's edges is counted as the range between the edges around it,
  from the bins below the edge under it to the bins below the edge over
  it (plus that edge's bin when the number is on it and its values may
  be kept, as now); one number when the two agree. The hatched bar
  marks the bins it cannot tell. The words give no explanation.
- The head of each plot is one row: the short title, "max:" and the
  box, "Obs. het. max: [0.04]"; under it one line, of a fixed height,
  "Keeps 1,050 of 1,200 variants", "Keeps 564–566 of 1,200 variants",
  "Keeps all 1,200 variants", with "so far" while the pass runs; it
  replaces "Over 1,200 variants" and the line under the plot. The axis
  labels and the descriptions for a screen reader keep the full names;
  the box's accessible name contains its visible words (WCAG 2.5.3).
- The titles are the owner's five; the major allele frequency, which
  the owner did not name, keeps "Major allele frequency". Variants: "Missing genotypes", "Major allele frequency",
  "Obs. het.", "Exp. het. (unbiased)"; individuals: "Missing GTs",
  "Obs. het.".
