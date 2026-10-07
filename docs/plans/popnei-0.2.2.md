# popnei 0.2.2: exact counts under the thresholds, and the FILTER failures in one pass

A small piece, asked for by the owner on 7 October 2026, when popnei
published the release `js-v0.2.2` with three requests of this project:
popnei issues #11 (bins that hold their right edge, with decimal edges),
#12 (the summary counts the variants that passed and failed their
FILTER, in its one pass) and #13 (the writers hand the file over in
pieces). This piece moves the applications to that release and uses #11
and #12 on `popgen2.html`. #13 is for the download of the filtered file,
a piece of its own after the filters (`docs/designs/stats-filters.md`).
Built as the `building` skill says, on the branch `popnei-0.2.2` from
`main` at fd3babd.

## What the user can do when it is done

Case 1 of `docs/use-cases.md`, "open a file and see what it holds", and
the part of case 2 that the thresholds serve:

- Under each threshold of the variants, the count is one number for any
  threshold of up to three decimals, "Keeps 1,050 of 1,200 variants",
  never the range "Keeps 1,113 to 1,152 of 1,200 variants" that popnei
  0.2.1's bins forced.
- The box of a VCF says "FILTER failures: 300" (for `low_qual.vcf.gz`)
  from the same single reading of the file, as the owner wanted on 7
  October 2026: no second pass.

## What it stands on

- popnei 0.2.2, `node_modules/popnei/dist/stats.d.ts`: `HistKwargs`
  gains `closed: "left" | "right"`; with `"right"` the bins below an
  edge t count the variants whose value is at most t, which is what
  `filterByMissingData(t)`, `filterByMaf(t)` and `filterByObsHet(t)`
  keep; the k-th of n + 1 edges of equal width over [0, 1] is the
  decimal k/n. `calcVariantsSummary` takes `filterColumn: {}` and gives
  `filterColumn: {passed, failed} | null`, also in its result so far;
  it throws before reading a block when the source did not record the
  FILTER of its variants, which `keepsPassed` of the `Variants` says
  beforehand (false for a `.nei` file written before format 1.2).
- The summary of `popgen2.html`: `src/core/analyses/variantsSummary.ts`
  (its fine bins, `VARIANT_FINE_BINS` 1,280 over `VARIANT_RANGE`, shared
  with `variantChecks.ts` of the old page), the runner's job of the
  summary in `src/worker/runner.ts`, its job and result in
  `src/worker/protocol.ts` and their checks in `messages.ts`.
- The counts of a threshold, `src/core/thresholds.ts`
  (`variantsAtMost`, which gives a range today, and the comment on why),
  and the words of the line under each plot in `src/ui/variants/`.
- The line "FILTER failures" that the piece `one-pass` removed (main
  before fd3babd, `git show 86ee7e3:src/ui/variants/words.ts`): its
  words in each state can be taken back where they still fit.

## The design

**The bins.** The fine bins become 1,000 over [0, 1], closed on the
right. (The session asked for 10,000 after a review found that
`thresholdStep` gives a step of 0.0001 on an axis narrower than 0.01;
the implementer showed that the axes of the variants are rounded to
steps of 0.05 at least, `SMALLEST_STEP` of `variantChecks.ts`, so their
step is never below 0.001, and only the individuals' axes, counted from
each individual's value, go finer. So 1,000.) for the summary and for the old page's `variantChecks`, which
share the constant. A threshold of up to three decimals is then an edge,
and the count of the variants at most it is the sum of the bins below
it, exactly popnei's filter's count. The plots are drawn from the fine
bins summed into the bins of the axis, as today; those sums must fall on
whole fine bins. The key versions of both analyses change, so a result
of the old bins is never shown under the new ones. `variantsAtMost`
gives one number; the range, its words and the comment that explains it
go. A threshold typed with more than three decimals is rounded to three
by the box, so that the count shown and the filter applied are of the
same number; on the branch `filters` the threshold becomes the value
popnei filters at. The individuals' counts do not change: they come from
popnei's value of each individual.

**Both pages, and both kinds of plot, count an edge the same way.** The
old page's histograms of the variants (`variantChecks`) share the fine
bins, so they become right-closed too: a value on an edge falls in the
bin that ends there. So:
- its Python scripts, and those of `variantsSummary`, ask for the same
  bins as the page, `"closed": "right"` added to `hist_kwargs` (Python
  popnei takes it, `python/popnei/stats.py:424` of popnei); measured
  under node by the review of this plan, the left- and right-closed 40
  bins differ in 24 of 120 bins on the fixtures, so without it the
  script, the CSV and the bars would disagree;
- the line above the old page's table of bins (`BINS_LINE` of
  `src/ui/steps/variants/histogramWords.ts`), "Each bin runs from its
  lower edge up to its upper edge, not included", says the new rule;
- the histograms of the individuals, which the page bins itself
  (`src/core/histogram.ts`, left-closed as `numpy.histogram`), become
  right-closed too, on both pages, so that the two kinds of plot of
  `popgen2.html` count an edge the same way and a bar ends at "at
  most", what a threshold keeps;
- the comment of `variantChecks.ts` that explains why 1,000 bins failed
  under popnei 0.2.1 goes.

The documents: `docs/architecture.md` section 7, which gives the rule of
the bins as numpy's, and `docs/functionality.md`, which describes the
range and the hatched bar, change with the code.

**The FILTER failures.** The summary's job asks `filterColumn` when the
open variants record their FILTER (`keepsPassed`), which the runner
knows once the file is open, so the request needs no new field: the
runner asks for it whenever it can, and the result carries
`filterColumn` or `null`. The box gives "FILTER failures: N" when the
result has the counts, nothing when it is `null` (an older `.nei`
file), and in the states while read, stopped and failed the words the
line had before `one-pass`, taken back where they fit. The counts are
of every variant of the file, since the summary reads no filter. Whether
the line shows for a `.nei` file that does record its FILTER follows
from the result, and is said in the report.

**What crosses between the layers.** The result of the summary gains
`filterColumn: { passed: number; failed: number } | null`, checked by
`messages.ts`; `PROTOCOL_VERSION` goes from 11 to 12. The branch
`filters` also goes to 12, with another change of the messages, so when
this piece is merged into it the merge raises it to 13. The job does not
change. This is a field added to an existing message, so the plan goes
to the `architecture-reviewer`.

## Phases

1. **The release.** `package.json` names
   `https://github.com/JoseBlanca/popnei/releases/download/js-v0.2.2/popnei-0.2.2.tgz`
   (installed and in the lockfile already, uncommitted, by the session),
   and every check passes on it: typecheck, lint, Vitest, format, the
   whole browser suite in Chromium and WebKit. A test literal that the
   decimal edges change is taken again from popnei 0.2.2 under node, and
   the commit says which and why.
2. **Exact counts.** The bins, the key versions, `variantsAtMost` and
   the words of the line under each plot of the variants, with tests:
   for thresholds 0.05, 0.1, 0.123 and 0.95 on `panel.vcf.gz` and
   `low_qual.vcf.gz`, the count the page gives equals `varsKept` of
   popnei's filter of that statistic under node; the scripts of both
   pages with `"closed": "right"`; the individuals' bins right-closed.
   Screens: the six plots of `popgen2.html` on `panel.vcf.gz` with
   thresholds that used to give a range; the old page's histograms of
   the variants and of the individuals, with the line above its table
   of bins.
3. **The FILTER failures.** The runner, the protocol, the messages, the
   box, with tests: `low_qual.vcf.gz` gives 300 failed of 1,200 (popnei
   under node), `panel.vcf.gz` 0, `panel.nei` as popnei 0.2.2 answers
   for it. Screens: the box of `low_qual.vcf.gz` while read, done,
   stopped and failed, and of `panel.nei`.

## What is left out

- The download of the filtered file (#13): a piece of its own after the
  filters.
- On the branch `filters`, the approved spec
  `docs/specs/steps/popgen2-filters.md` and the design
  `docs/designs/stats-filters.md` describe the range "Keeps 1,113 to
  1,152" and cost 1,280 bins; they are brought up to date when this
  piece is merged into that branch.
- The FILTER filter of the filters' design for a `.nei` file that
  records its FILTER: the design leaves it out for every `.nei` file,
  since popnei 0.2.1 could not say which ones record it; `keepsPassed`
  now does. A revision of that design, said to the owner.

## What was done

### Phases 1 and 2, 7 October 2026

Commits f52b969 (the release js-v0.2.2, with the test literals its
decimal edges change: the MAF 40-bin counts of panel.nei, tetraploid.nei
and the 111-individual list; the edges 0.075, 0.475, 0.95, 0.975) and
31bcc42 (exact counts). The fine bins stay 1,000: the session asked for
10,000 after a review, and the implementer showed that the variants'
axes never step below 0.001 (above). Different from the plan: a variants'
threshold below 0.001 is raised to 0.001, since the first bin holds 0
with the values up to 0.001; the owner chose this on 7 October 2026 over
allowing 0 with a popnei issue. It differs from a filter at 0 only on a
file of 1,000 individuals or more. The hatched bar of the chart, used by
nothing any more, was removed with its spec. No protocol change in
these phases. popgen2's axes show 30 to 50 bars, where 1,280 bins gave
32 to 44.

Checks on 31bcc42: typecheck, lint clean; Vitest 4,026 in 117 files;
format clean; Playwright 619 in Chromium and 619 in WebKit; screens
popgen2 76, the old Variants step 6. The count equals popnei's filter at
every k/1000 from 0.001 to 1 on panel.vcf.gz, low_qual.vcf.gz, panel.nei
and tetraploid.vcf.gz.

Review: spec and stale; tests and errors; ux and accessibility. The
tests reviewer recomputed every literal under node and broke the code
seven ways, each caught. Fixed in e8cbc03: the raise to 0.001 said in
words and announced; the CSV columns; a key version in a spec; six
stale comments; the releases of `docs/technology.md`. Not a defect: the
MAF axis at 320 px starts at 0.45 and d3 labels 0.6, 0.8, 1.0.

### Phase 3, 7 October 2026

Commits 7c553d5 (the runner asks `filterColumn` when the open variants'
`keepsPassed` is true; the summary's result carries it; PROTOCOL_VERSION
12; summary key version 4; the box; the Python script prints the count
when `keeps_passed`) and e519b3b (flows and screens). A "300 so far"
state while reading; the status region does not announce the count.

Checks on e519b3b: Vitest 4,051 in 117 files; the rest clean;
Playwright on popgen2 and the old Variants step, 228 in Chromium and 228
in WebKit; screens 176.

Review: spec and api; tests and errors; ux and accessibility. Found: the
raised-threshold words were false for a typed 0.004 that rounds to 0 on
an axis of step 0.01; two blank lines under each variants plot; the CSV
header false for the first bin; no test of the refusals of
`filterColumn` nor of the runner's defect check; a `.nei` that records
its FILTER loses its line after a Stop; a stale example of threshold 0.
Sent as one list of fixes. Noted for the filters' work package 2: once
the opening tells whether a `.nei` records its FILTER, its box can show
the line from the opening and not move. Seen by a reviewer, popnei's
own words: for a VCF opened with only the passed variants, all of which
failed, popnei says "its source holds none" while the source holds 2.

Fixed in ff9fa0e, 354fd66, efdbfe4, 743282f: the words "Counted as
0.001, the smallest threshold.", one line at 1280 px and two at 320 px,
so the band under each variants plot is one line on a computer; the CSV
header `from,to_included,count,state`; four tests of the refusals of
`filterColumn`, and the runner's defect check tested through a mock of
popnei; the condition of a `.nei` file written into
`docs/functionality.md`, since after a Stop the store keeps no result so
far. Not changed: the old Variants step still takes a threshold of 0,
so its example stays. Noted: the check of the messages accepts a
negative count, as `isWhole` does everywhere.

Checks on 743282f: Vitest 4,060 in 118 files, the rest clean;
Playwright on popgen2 and the old steps, 190 in Chromium and 190 in
WebKit; screens of popgen2 100.
