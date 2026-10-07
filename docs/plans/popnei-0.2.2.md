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
right, for the summary and for the old page's `variantChecks`, which
share the constant. A threshold of up to three decimals is then an edge,
and the count of the variants at most it is the sum of the bins below
it, exactly popnei's filter's count. The plots are drawn from the fine
bins summed into the bins of the axis, as today; those sums must fall on
whole fine bins. The key versions of both analyses change, so a result
of the old bins is never shown under the new ones. `variantsAtMost`
gives one number; the range, its words and the comment that explains it
go. A threshold with more than three decimals, which the box can hold
when typed, is a case the implementer settles and the plan records: the
count of the nearest edge below, said as exact, would be wrong, so either
the box rounds to three decimals or the line says the range of the two
edges around it. The individuals' counts do not change: they come from
popnei's value of each individual.

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
`messages.ts`; `PROTOCOL_VERSION` goes up by one. The job does not
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
   popnei's filter of that statistic under node. Screens: the six plots
   of `panel.vcf.gz` with thresholds that used to give a range.
3. **The FILTER failures.** The runner, the protocol, the messages, the
   box, with tests: `low_qual.vcf.gz` gives 300 failed of 1,200 (popnei
   under node), `panel.vcf.gz` 0, `panel.nei` as popnei 0.2.2 answers
   for it. Screens: the box of `low_qual.vcf.gz` while read, done,
   stopped and failed, and of `panel.nei`.

## What is left out

- The download of the filtered file (#13): a piece of its own after the
  filters.
- The FILTER filter of the filters' design for a `.nei` file that
  records its FILTER: the design leaves it out for every `.nei` file,
  since popnei 0.2.1 could not say which ones record it; `keepsPassed`
  now does. A revision of that design, said to the owner.

## What was done
