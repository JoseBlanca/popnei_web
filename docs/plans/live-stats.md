# The statistics of the open file, as it is read

The third piece of the new screens, asked for by the owner on 6 October
2026 for the night of that day: on `popgen2.html`, the count of the
variants and the statistics of the open file come from one pass over it,
and their plots fill in while it is read, instead of each appearing when
its pass ends; the file's box says how many variants of a VCF failed
their FILTER; and the open widget, at the bottom of the page, moves down
as the plots arrive instead of keeping room for them. Built as the
`building` skill says, on the branch `live-stats`, made from
`file-stats` (whose plan, `docs/plans/file-stats.md`, says what the
statistics are), neither merged yet.

The piece changes the messages of the calculation worker. The owner
ordered it built tonight, with this plan sent to the
`architecture-reviewer` before the code, in place of a spec.

## What the user can do when it is done

Steps 2 to 4 of case 2 of `docs/use-cases.md`, and what case 1 chooses
its thresholds from. The user opens a VCF or a `.nei` file. Within about
two seconds of the start of the pass, the box shows the variants counted
so far and the six histograms appear, each saying it is over the
variants or individuals read so far; every two seconds they grow, and at
the end of the pass they are the final ones. For a VCF, a second, faster
pass then counts the variants that failed their FILTER, and the box
says how many: on `low_qual.vcf.gz`, 300 of 1,200. Every variant is in
the statistics, failed or not: the FILTER filter, as a filter the user
sets, comes with the piece of the filters. One Stop stops the reading,
and one button starts it again.

## What it stands on

- popnei js-v0.2.1, installed in d2abc0b (package.json and the lockfile;
  `INSTALLED_POPNEI_VERSION` of `src/worker/testSupport.ts`). From its
  `dist/stats.d.ts`: `calcVariantsSummary(variants, {perVar,
  perIndividual, density, onSoFar, soFarEvery})`, which gives
  `VariantsSummary {perVar, perIndividual, density, passStats}`, each
  part the same to the bit as `calcPerVarDistribs`,
  `calcPerIndividualStats` and `calcVarDensity` give it alone, and calls
  `onSoFar` at most every `soFarEvery` seconds, 2 by default, with the
  result over the variants read so far. A value `onSoFar` throws ends
  the pass and is what the call throws. From `dist/variant.d.ts`:
  `Variants.filterPassed()`, a step of every pass that keeps the variants
  whose FILTER is `PASS` or a dot, with its counts under `"passed"` in
  `passStats.filtering` (`FilteringStats {varsProcessed, varsKept}`).
  On a vars file written before format 1.2 it refuses at the first
  block with an `Error`.
- popnei gives no FILTER flag in the blocks of variants: the failures
  can be counted only by the `filterPassed` step, which also takes them
  out of every result of its pass.
- The summary of the variants file, `src/core/analyses/variantsSummary.ts`
  (`calcVarDensity` with one window per chromosome, `runVariantsSummary`
  of `src/worker/runner.ts`), and the two statistics
  `variantChecks.ts` and `individualChecks.ts`, which the old page,
  `popgen.html`, also uses and keeps as they are.
- The worker's messages, `src/worker/messages.ts` (`PROTOCOL_VERSION`
  7, `ToRunner`, `FromRunner`, the checks of each job and result,
  `checkFiltering`, which refuses a kind of filter other than
  `VARIANT_FILTER_KINDS`), `protocol.ts` (`Run`, `Outcome`, `Progress`,
  `PassStats`), `client.ts` (`Client.run(key, job, onProgress)`),
  `runnerWorker.ts` (`answerRun`, `progressOf`), `runner.ts`
  (`passOf`, `passStatsOf`, which calls it a defect when popnei's
  counts hold a filter the job does not, `stepsOf`, `transferablesOf`).
- The store, `src/core/store.ts`: `AnalysisStatus` `running {key, runId,
  progress, waitsForStatistics}`, `StoreConfig.send(key, job,
  onProgress)`, `progressed`.
- The chain, `src/ui/autoRuns.ts`, with `POPGEN2_AUTO_GROUPS` of
  `src/ui/popgen2Store.ts` and `startByThemselves` of `src/ui/popgen2.tsx`.
- The page, `src/ui/variants/`: `VariantsPage.tsx` (the box, the
  statistics, the open widget), `VariantsSummary.tsx` (the box, with the
  count's progress, Stop and Count again), `FileStats.tsx` and
  `StatsSection.tsx` (the statistics, with their own Stop and Start
  again), `StatsLayout.tsx` (the room kept for the plots),
  `StatsHistogram.tsx`, `statsPlots.ts`, `words.ts`, `statsWords.ts`.

## The design

**One pass for the count and the statistics.** On `popgen2.html` the
summary of the variants file becomes the one pass: its job calls
`calcVariantsSummary` with `density` (one window per chromosome, as
today), `perVar` (the four statistics, 1,280 bins over [0, 1],
`minNumIndividuals` 0, every individual, as `variantChecks` asks on this
page) and `perIndividual`. Its result keeps `chroms`, `numVarsPerChrom`
and `passStats`, and gains `variants: VariantStatsPart` and
`individuals: IndividualStatsPart`, the fields of `VariantChecksResult`
and `IndividualChecksResult` without `analysis`, so that the plots of
`FileStats.tsx` draw them as they draw those today. Its `keyVersion`
goes to 2. `POPGEN2_ANALYSES` becomes the summary and the count of the
FILTER failures (below); `variantChecks` and `individualChecks` leave
it and stay on the old page unchanged. The summary reads no filter, as
before. On a VCF of 403 MB popnei measured the one pass 44% faster than
three (natively, one thread).

What the one pass costs: the old count read only the chromosome and
the position, and popnei gives none of the three parts when one fails,
so on a file whose genotypes popnei refuses (a haploid genotype in a
diploid VCF, a genotype that is not an allele number) the box shows
popnei's message instead of the variants and the chromosomes, and the
count of the FILTER failures is held back with it. The statistics fail
on such a file anyway, and so would every analysis. Accepted, and told
to the owner in the report.

The option not taken was to keep three analyses and stream each: three
passes over the file, the plots of the individuals appearing only after
those of the variants, and two Stops.

**The result so far** is a new message of the worker, `soFar {id, key,
result: JobResult}`, sent from the `onSoFar` of the job, with
`soFarEvery` left at popnei's 2 seconds. Its arrays are copied before
they are transferred, since popnei may reuse them, and it is checked by
`messages.ts` as the final result is. `Client.run` gains a callback
`onSoFar(result: JobResult)` beside `onProgress`; a `soFar` of a
request that is no longer the running one is dropped, as a `progress`
is not: the client handles a `soFar` as it handles a `result`
(`client.ts` ~516): of the running id, its key and its job's analysis,
or a defect of ours that ends the worker; messages of a worker already
ended reach nobody, which is what keeps a Stop safe. A `soFar` that
comes before `send` returns is passed over, as `progressed` does. In
the runner, what `onSoFar` throws (the check, the copy, `postMessage`)
is recorded as what `told` throws is (`passOf`, `thrownByTold`) and
thrown on as ours, never shown as popnei's refusal of the file. In the
store, `running` gains `soFar: R | null`, null until the
first and again at every new run, and null whenever
`waitsForStatistics` is true, since that form takes its run from the
request of the statistics; `sameStatus` and `sameRun` compare it, or
the screen would keep the old object and never redraw. It is never
cached, has no check numbers and no warnings, and a `done`, a failure
or a Stop drops it. An
analysis whose runner gives no `onSoFar` has `soFar` null throughout,
so nothing changes for the old page. `PROTOCOL_VERSION` goes to 9 (phase 1 took 8).

The option not taken was to put the result so far inside `progress`:
the progress bar would then carry statistics, and every analysis's
progress would grow a field only one uses.

**The count of the FILTER failures** is a second analysis of the page,
`filterFailures` (`src/core/analyses/filterFailures.ts`), for a VCF:
`calcVarDensity` with one window per chromosome under the step
`filterPassed`, a pass that reads no genotype. Its result is `passStats`
with `filtering.passed`; the failures are `varsProcessed − varsKept`,
its one check number. A new kind of the counts alone,
`PassFilterKind = VariantFilterKind | "passed"` of `protocol.ts`, types
`PassStats.filtering` and `checkFiltering`, and `passStatsOf` accepts
`"passed"` for this job. `VariantFilterKind`, and with it the filters a
project and its file can hold, does not change. `variantsOfFile` of
`filterCounts.ts` learns that `"passed"` comes first, so that a
`filterFailures` result never gives the variants that passed as the
variants of the file. Under node on a VCF of 20,000 variants and 500
individuals (40.5 MB), the summary took 134 ms and this pass 7 ms, 18 ms
gzipped (architecture review, 6 October 2026). The page
opens every VCF with `onlyPassed: false`, as now, so the summary sees
every variant. For a `.nei` file it is not run (`needs` says so): a
vars file written before format 1.2 refuses `filterPassed`, and telling
that refusal from another would rest on the words of popnei's error. It
starts after the summary, in the chain; it can wait, since the plots
matter more and the box says "counting" until it is done. The option
not taken was the `filterPassed` step in the one pass, which would take
the failed variants out of the statistics the owner wants over every
variant.

**One Stop.** The box keeps the one progress bar, of the pass running,
and one button: Stop while a pass of the chain runs or is about to, and
after a Stop or a crash of the worker, Start again, which starts again
the first not done and lets the rest follow. The statistics' section
loses its own bar and buttons, and says of each part, as now, whether
it is calculated, stopped, or failed. `POPGEN2_AUTO_GROUPS` becomes
`[[variantsSummary, filterFailures]]`, one group (`POPGEN2_CHAIN`): the
box's Stop is `stop` of that group and Start again its `resume`, which
starts the first not done and lets the rest follow; the focus rules of
the count's Stop hold.

**The plots so far.** `FileStats.tsx` draws from the summary's result
when `done`, and from `soFar` when `running`; each plot's line of how
many variants or individuals it is over says "so far" while running.
The box shows the variants counted so far beside the progress bar.
The status region says, as now, the start, the first result and the
end, once each, not each result so far. The axes are fitted, as now, to
the data of what is drawn, so they can widen as the pass runs.

**The open widget moves with the plots.** The room kept for the plots,
`PlotsRoom`, `PlotSpace` and `StatsRoom` of `StatsLayout.tsx` and the
hidden room of the download, goes; the widget sits below whatever is
drawn. The Playwright flow FS3 of `e2e/fileStats.spec.ts`, a press on
the open button held across the end of a pass, tested the room kept and
is removed: once the button moves, a press that starts on it and ends
after the plots have pushed it down is released elsewhere, and the
owner chose the move knowing it. A flow that the button opens the
picker once the statistics are drawn stays or is added.

## The phases

**1. The one pass.** `variantsSummary` with `calcVariantsSummary`
(core, protocol, messages, runner, the transfers), keyVersion 2;
`POPGEN2_ANALYSES` without `variantChecks` and `individualChecks`; the
page draws the statistics from the summary's result; one Stop and Start
again in the box, the statistics' own bar removed. The old page behaves
as before and its tests pass. Tests: Vitest with popnei's numbers under
node on the installed package for `panel.vcf.gz`, `panel.nei` and
`tetraploid.vcf.gz` (each part equal to what the three calls gave
before; the existing literals of `variantChecks` and `individualChecks`
on popgen2 are the check); Playwright: the flows of
`e2e/fileStats.spec.ts` and `e2e/openVariants.spec.ts` brought to one
pass and one Stop. Screens: running, done, stopped, a failure, light and
dark, 1280 and 320 px.

**2. The result so far.** The `soFar` message, the client's callback,
the store's `running.soFar`, the summary's `onSoFar`; the plots and the
box's count drawn from it, with "so far"; the room for the plots
removed, FS3 removed. Tests: Vitest of the message's check, of a
`soFar` of a stopped or superseded request dropped, of `soFar` cleared
at `done`, Stop and a new key; a runner test that a pass of a file of
more blocks than one gives at least one result so far with `soFarEvery`
0 (the 200,000-variant VCF is too large for a fixture; a fixture of a
few thousand variants, or `soFarEvery: 0` passed through a test hook,
whichever needs no change of the job's shape); Playwright: on
`panel.vcf.gz` the plots appear and end equal to popnei's. Screens:
while running, with plots so far (take it on the large VCF of the
scratchpad if a fixture passes too fast), done; 1280 and 320 px.

**3. The FILTER failures.** `filterFailures` (core, protocol, messages,
runner, `PassStats` with `"passed"`); the chain; the box's line,
counting while it runs, the number when done, absent for a `.nei`;
Stop and Start again over it. Tests: on `low_qual.vcf.gz` 300 failures
of 1,200 and 0 on `panel.vcf.gz`, the numbers from popnei under node;
Playwright: the line on both files and its absence on `panel.nei`.
Screens: the box counting the failures, done with failures, done with
none.

`docs/architecture.md`, section 5 (the chain, the result so far as a
kind of message beside progress, the one Stop), and section 9's list of
modules, are brought up to date in the phase that changes each, and so
are the specs that would say otherwise: `docs/specs/worker/messages.md`,
`client.md`, `runner.md` and `protocol.md` (the `soFar` message and
`PROTOCOL_VERSION` 9 in phase 2, `"passed"` and 10 in phase 3), `docs/specs/core/store.md` ("The
state of an analysis"), and a line in `docs/plans/file-stats.md` that
this piece replaced its two analyses and their Stop. The summary's
`script()` gives the three calls of popnei's Python, which has no
`calc_variants_summary`.

## What is left out

- The FILTER filter as a filter the user sets: the piece of the filters.
- The count of the FILTER failures of a `.nei` file of format 1.2: when
  popnei tells its old formats apart in a way the page can read.
- The result so far on the old page: it has no use for it yet.
- The individuals kept: `variantChecks` read the filters of individuals,
  and the one pass reads none. The piece of the filters chooses between
  giving the pass the individuals kept, so that the count is read again
  at every change of them, and splitting it back into a count and the
  statistics.
- The thresholds on the plots: the next piece, `thresholds`.

## What was done

(Filled in as the work goes.)

Before the work: popnei js-v0.2.1 installed and committed in d2abc0b;
on it Vitest "3870 passed", the typecheck and the lint clean. The
worktree's `node_modules` held popnei 0.1.0 before, which failed five
test files on the version; the release changed no number the tests
compare.

### Phase 1, the one pass

Commits b9dde13, 659d192, c4768a8 and 4065742; the fixes of its review
in 80de47a to db033bb (eleven commits). On db033bb: Vitest "3878
passed", Playwright "1214 passed" in Chromium and WebKit, the 64 screens
of popgen2. The parts of the summary equal popnei's separate calls under
node on `panel.vcf.gz`, `panel.nei` and `tetraploid.vcf.gz` (density,
the 1,280 bins and their means, each individual's values), and the same
numbers come from popnei's Python.

The builder's choices: after a failure each part says "Not calculated."
and the box gives the failure's words, so they are not said twice; the
error bar of a crash says "…as it counted the variants and calculated
the statistics"; the button of the box is Stop, and Start again after a
Stop or a crash of the worker.

The review sent spec, tests, stale, errors, api and architecture; stale
found nothing. The categories of the screen, react, accessibility, ux
and browser, are sent after phase 2 over the range of both phases,
since phase 2 rewrites the same screen. Fixed: the chain is one group,
`POPGEN2_CHAIN`, with the box's Stop and Start again as its `stop` and
`resume`, and the methods nothing called removed (`stopAll`, `again`,
`pending`, `canResume`), so that phase 3 adds `filterFailures` to that
group; the parts are named `perVar` and `perIndividual`, popnei's names;
`docs/specs/worker/protocol.md` has the summary in its unions; three
passages of the architecture brought to the one pass; the shared bins
say that a change raises the key version of both analyses; a damaged
`.nei` file gets "could not be read to its end … Fetch or copy it
again", and a genotype of another ploidy says that the application
reads one ploidy per file, instead of advice that cannot help; popnei's
refusal of an option of ours is a defect, not a refusal of the file;
tests of the box's Stop before the pass starts, of the focus moving to
popnei's words at a refusal while on Stop, and of a refused genotype
failing the one pass. Not taken: the title of the click flow, which
phase 2 removes; the pandas import of the scripts, since no code joins
them into one script yet.

### Phase 2, the result so far

Commits be989fc, d1338fd, 326a046, 7769306 and b8187a7; the fixes of
its review in c4327c8 to 0c2ea51. popnei sends a result so far at most
every 2 seconds of its pass; on this Mac a pass over the VCF of 200,000
variants and 1,000 individuals (127.6 MB) takes about 2.5 s, so it
shows one result so far; a file of minutes shows one every 2 s. The
builder's choices: `createRunner` takes `{soFarEvery}` for the tests;
the CSV download comes with the final result only; the status region
says once per pass that the plots are drawn from the variants read so
far.

The review sent spec, tests, stale, errors, api and architecture over
phase 2, and react, accessibility and ux over the screen of phases 1
and 2; stale found nothing; browser is sent after phase 3. Fixed:
`onSoFar` is required on `Client.run`, so that dropping it in the page
does not typecheck, and a test goes through the page's `connectStore`;
the copy of a result so far is tested against arrays that share a
buffer, and the first result so far of a test file whose halves differ
equals popnei's result over its first block; what the browser cannot
post, a result so far or a progress, is our defect and not a crash the
user is told to start again; the words while the file is read say what
holds so far ("…with no called genotype so far", "Over 200
individuals, from the variants read so far", the plots' descriptions
for a screen reader, the status region); the box says "Variants:
155,000 so far" and "Chromosomes: 1 so far" with no percentage, one
row each at 320 px, so that Stop does not move when the first result
arrives; after a Stop each part says "Stopped. Start again reads the
file from the start."; the failure words name the count and the
statistics; while the code of the plots downloads, the parts say they
are calculated; the box's error boundary is made again for each file,
so that one error does not leave it empty for the next files; the
Playwright flow of the plots so far no longer races the pass (it
failed on a pass 22% shorter): in the test, the worker's clock runs
fast and its final result is held until the test releases it, with no
change to the site's code; the results so far across a new file and an
undo are tested; specs and section 9 of the architecture. Not taken:
`copiedSummary` stays exported, for its direct test.

For the owner, asked in the report: at a Stop or a failure the plots so
far go away, and the ux and accessibility reviews both raise it (a user
who stops a long file to look at the plots loses them; and the plots
change every 2 s with no way to pause them but Stop, WCAG 2.2.2).

### Phase 3, the FILTER failures

Commits 84d2034, db331fe, 9cf1949, bfdd858 and c8a4a84; the fixes of
its review in d63f7e2 to 77d409b, cb51972 and 681db8e. On popnei
0.2.1 under node, `low_qual.vcf.gz` has 300 of its 1,200 variants that
failed their FILTER and `panel.vcf.gz` none; the box says "FILTER
failures: 300" ("Failed FILTER" named no thing, and "Variants failing
FILTER: not counted" wraps at 320 px). The count is popnei's
`calcVarDensity` under `filterPassed`, and, when popnei refuses it
because no variant passed, a pass of `iterBlocks` read to its end,
whose counts it gives anyway: under node on the VCF of 127.6 MB the
first takes 0.9 s and the second 2.4 s, since it reads the genotypes.
Its Python script was checked name by name against popnei's Python
source and not run: popnei's Python on this Mac is older than its
source and has no `filter_passed`.

The review sent spec, tests, stale, errors, api, architecture, react,
accessibility and ux; spec and stale found nothing, and accessibility
and react nothing. Fixed: a VCF whose variants all failed gets its
count; the words of a Stop name the pass that was running and promise
Start again only when the box offers it; when both passes fail the box
shows both failures, and a refusal of the count gets the remedies of
the count's words; a locked member of the chain (the count on a `.nei`
file, or on a file read without its failed variants) starts nothing
and holds back nothing; the rule of the box's button at the end of the
chain is written once (`src/ui/variants/chain.ts`); "passed" is
accepted in the counts of the count's result alone; screens of a Stop
and of a crash during the count; the error bar after a crash of the
count says Start again, as the box does, where it said to reload;
tests that nothing guarded (the bar's origin of the count, its
refusal, a `.nei` showing no FILTER line).

### The browser review of the piece

Over 857368e..681db8e, in Chromium and WebKit (Firefox cannot be
started on this Mac): no findings. Nothing added to the site's code
needs more than the floor of `docs/technology.md`; every state was gone
through on `panel.vcf.gz`, `low_qual.vcf.gz`, `panel.nei` and the VCF of
200,000 variants, Stop and Start again in each pass, a crash in each
pass, 320 px. For the owner: after Start again mends a crash, the error
bar keeps its words until it is closed, as it does elsewhere; after a
crash of the first pass the count of the FILTER failures still runs, so
the box can show "Variants: not counted" beside "FILTER failures: 300".
