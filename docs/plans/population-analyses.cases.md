# The map of the cases of stage 5

Deliverable 3 of work package 9 of `docs/plans/population-analyses.md`:
every item of "The cases" and of "How it is verified" of the specs of
stage 5, with the test that reaches it. A test reaches an item when it
gives the input the item names and checks the outcome the item gives;
each was read for that, not matched by its name. For a spec written
before stage 5, the items are those its revision of 30 September 2026
for stage 5 added or changed; `docs/specs/charts/heatmap.md` and
`line.md`, written for stage 5, are mapped whole. The items the earlier
stages wrote are in `docs/plans/individuals-pca.cases.md`.

This file is written by a script and is not edited by hand. The map is
kept in parts, one per spec, in `docs/plans/population-analyses.cases/`,
where a test is named by its file and its title, and
`node docs/plans/population-analyses.cases.mjs`, run from the root of
the repository, finds the line of each test as the files stand and
writes this file. It is run again after any commit that moves a test.
The map of stage 4 was written with the line numbers themselves, and 182
of its 2,438 line numbers had moved before it was committed. When a
title a part gives is in no test of its file, or in two, the script
stops, prints that title with its part and its line, and writes nothing.
With `--check` it writes nothing and says whether this file is what it
would write. Its opening comment says what a part holds. The parts were started on 1 October 2026 with the specs that have
no screen; those of the three panels, `docs/specs/analyses/popDists.md`,
`diversity.md`, `sfs.md` and `ldDecay.md`, and of `docs/specs/shell.md`,
are added when the owner has accepted the panels.

Each item is named in the spec's words, shortened, with the line of the
spec where it starts. A test is named by a short name of its file, the
line where it starts, and its title, or the start of it, as it stands in
the source: `prj:120` would be the test that starts at line 120 of the
file the section gives for `prj`. Each section names its short names
before its table. A test
marked "added" was written for this map: each was seen to fail with the
code it guards broken on purpose, on a copy of the sources outside the
repository, and to pass with the code as it is.

The tests of Vitest, which run in node, are under `src/`; those of the
plots run under jsdom, a library that gives node the document of a page
and lays nothing out. The flows of Playwright, which drive a browser
through the built site, are under `e2e/`; some run axe, a checker of the
rules of accessibility, on the page. The flows run in Chromium and WebKit here, since Playwright
1.63.0 cannot start Firefox on this Mac; Firefox runs them on GitHub
once `main` is pushed.

An item counts as reached when a test reaches all of it. The items that
are not are in "Left without a test", at the end, each with its reason.
Of the 104 items, 103 are reached and 1 not; the
tests cited are 130, 3 of them added for the map. A spec
whose revision changed no item of the two sections has 0 items in the
table below; its section says what the revision changed and which tests
check it.

| spec | items | reached |
|---|---|---|
| the project, what the analyses per population share, `docs/specs/core/project.md` | 7 | 7 |
| the keys, `docs/specs/core/keys.md` | 0 | 0 |
| the store, `docs/specs/core/store.md` | 0 | 0 |
| the project file, `docs/specs/core/projectFile.md` | 3 | 3 |
| the counts of the filters, `docs/specs/analyses/filterCounts.md` | 0 | 0 |
| the protocol, `docs/specs/worker/protocol.md` | 0 | 0 |
| the messages, `docs/specs/worker/messages.md` | 13 | 13 |
| the runner, `docs/specs/worker/runner.md` | 16 | 16 |
| the client, `docs/specs/worker/client.md` | 6 | 6 |
| the base of the 2D plots, `docs/specs/charts/plot2d.md` | 6 | 6 |
| the histogram, `docs/specs/charts/histogram.md` | 6 | 6 |
| the heatmap, `docs/specs/charts/heatmap.md` | 22 | 22 |
| the line plot, `docs/specs/charts/line.md` | 23 | 22 |
| the entry, `docs/specs/entry.md` | 2 | 2 |
| all | 104 | 103 |

## Where a spec and the code differ

One point, which the report of the plan already holds for the owner
(`docs/plans/population-analyses.report.md`, "For the owner, as the work
goes", point 1): `docs/specs/charts/histogram.md` gives the vertical axis
of the spectrum of p0 with a shared top of 0.061 as 0 to 0.07, and the
code and its test give 0 to 0.065, which is what the spec's own rule
gives, the top made round by `nice` of `d3-scale`. The recommendation
there is to correct the example of the spec to 0.065.

## The project, what the analyses per population share

`docs/specs/core/project.md`, "How it is verified", the sentences of stage 5 of its item on the populations: 7 items, 7 with a test that reaches all of it.

The tests are named by these short names of their files: `prj:` for `src/core/project.test.ts`; `div:` for `src/core/analyses/diversity.test.ts`.

The revision changed no item of "The cases". The four functions are
those of "What the analyses per population share from stage 5": the two
locks the diversity had alone until stage 4, the split of the
populations by the minimum of individuals, and the words of the
populations under it.

| item | test | note |
|---|---|---|
| `populationsWithMinimum` of A of 2, B of 1 and C of 3 individuals at a minimum of 2 gives A and C, and B with 1, in that order (1946) | `prj:5457` "populationsWithMinimum of A of 2, B of 1, C of 3 and D of 1 individuals at a minimum of 2 gives A and C, and B and D with 1, each in that order" | the test has a fourth population, D of 1, so that the order of those under the minimum is checked too |
| and at 0 every population (1948) | `prj:5471` "populationsWithMinimum at a minimum of 0 gives every population, and none under it" | |
| `underMinimumText` of one population, the text as a literal (1949) | `prj:5477` "underMinimumText of one population gives its count and the consequence of one" | with the consequence of the distances and with that of the diversity |
| `underMinimumText` of two populations | `prj:5494` "underMinimumText of two and of three populations gives their counts in their order and the consequence of several" | |
| `underMinimumText` of four populations, with no counts | `prj:5522` "underMinimumText of four populations names two and how many more, with no counts" | |
| `populationListsNeeds`, each case of the diversity's tests of stage 3, moved here with them (1950) | `prj:5336` "populationListsNeeds of a list to keep i4, who has no population, gives the reason of the lists, …"; `prj:5403` "the reason of the lists names the file escaped, and a list popnei would refuse is left to the store"; `prj:5423` "lists that remove every individual leave populationListsNeeds null for the one population, …"; `div:1683` "needs gives the reason of the lists, that of populationListsNeeds, and keptNeeds that of populationsKeptNeeds" | the last is the diversity, which gives the reasons of the two functions as its own |
| `populationsKeptNeeds`, each case of the diversity's tests of stage 3 | `prj:5380` "populationsKeptNeeds locks when the individuals kept leave no population, with the words of all left empty"; `prj:5423` "lists that remove every individual leave populationListsNeeds null for the one population, …" | |

## The keys

`docs/specs/core/keys.md`, "The cases" and "How it is verified": 0 items, 0 with a test that reaches all of it.

The tests are named by these short names of their files: `keys:` for `src/core/keys.test.ts`.

The revision of stage 5 changed no item of the two sections, and nothing
of `keys.ts`: it says, in "What it does", that the LD decay reads every
filter of the variants but the LD pruning through the inputs of its own
key, and that the measure the heatmap of the distances draws is in no
key. Both are rules of the two analyses, and are mapped with
`docs/specs/analyses/ldDecay.md` and `popDists.md`. What `keys.ts` asks
of every analysis, the two new ones among them, is checked by
`keys:1186` "keyInputs of %s gives a value for the empty project and for a project whose reads are pending, without reading p.variants",
which runs once for each analysis of the application.

## The store

`docs/specs/core/store.md`, "The cases" and "How it is verified": 0 items, 0 with a test that reaches all of it.

The tests are named by these short names of their files: `apps:` for `src/core/apps.test.ts`.

The revision of stage 5 changed no item of the two sections, and no code
of the store. It names the new analyses in two places of "What it
does". The first is the reasons their `keptNeeds` gives when the
individuals kept leave no population, or too few chromosomes or
populations, which are the analyses' and are mapped with
`docs/specs/analyses/diversity.md`, `popDists.md` and `ldDecay.md`. The
second is which results fill the counts of the filters, which is
`countsOf` of `src/core/apps.ts`, mapped under the entry below, by
`apps:217` "countsOf of a result of the distances between populations with the passStats of the diversity gives the variants of the file, 1,200, and the counts of the same passStats, …"
and
`apps:196` "countsOf of a result of the LD decay with the passStats of the diversity gives the variants of the file, 1,200, and no counts, …".

## The project file

`docs/specs/core/projectFile.md`, "How it is verified", the fixture of stage 5: 3 items, 3 with a test that reaches all of it.

The tests are named by these short names of their files: `pf:` for `src/core/projectFile.test.ts`.

The revision changed no item of "The cases". The fixture is a project
file kept in `src/core/fixtures/projectFile/`, which the tests open and
write back.

| item | test | note |
|---|---|---|
| `v1-stage5-options.popnei.json`: `panel.nei` and `panel_pops.csv` with the column `popcat`, the options of the diversity with a draw of 60 typed, of the distances with a minimum of 10 and the measure `"dest"`, and of the LD decay with a largest distance of 100000 and a largest major allele frequency of 0.9; it opens into a project written as a literal in its test (1040) | `pf:3511` "v1-stage5-options.popnei.json opens into its project, with the options of the three analyses and the 7 check numbers of the distances, and is written back byte for byte"; `pf:3348` "a file with a draw of 60 typed, the distances at 10 and dest, and the LD decay at 100000 and 0.9 opens with them" | |
| with the check numbers of the distances, 1 + 3 × 2 = 7, those of `popDists.md` at the missing data filter at 0.1 (1045) | `pf:3511` "v1-stage5-options.popnei.json opens into its project, …"; `pf:3534` "the distances at a minimum of 10 over p0, p1 and p2 are refused with 6 check numbers, as with the 3 of two populations" | the seven numbers are a literal of the test, `DISTANCES_NUMBERS`; that popnei gives them is the runner's test of the distances, under the runner below |
| the project written back from it, with no result and the header's versions and date, is the fixture byte for byte (1056) | `pf:3511` "v1-stage5-options.popnei.json opens into its project, …" | |

## The counts of the filters

`docs/specs/analyses/filterCounts.md`, "The cases" and "How it is verified": 0 items, 0 with a test that reaches all of it.

The tests are named by these short names of their files: `apps:` for `src/core/apps.test.ts`; `run:` for `src/worker/runner.test.ts`.

The revision of stage 5 changed no item of the two sections. It changed
the table of "Which results fill it", which says, for each analysis,
whether the counts of its pass are those shown beside the filters of the
Variants step. Those of the distances between populations are:
`apps:217` "countsOf of a result of the distances between populations with the passStats of the diversity gives the variants of the file, 1,200, and the counts of the same passStats, …".
Those of the diversity are the counts of the first of its two passes:
`run:3258` "with the missing data filter at 0.05, F, the alleles and the private alleles of the table of stage 5, beside the three numbers of stage 2",
whose result holds the counts of stage 2 beside the numbers of the
second pass. Those of the LD decay are not, since its filters leave out
the LD pruning:
`apps:196` "countsOf of a result of the LD decay with the passStats of the diversity gives the variants of the file, 1,200, and no counts, …".
The function is `countsOf` of `src/core/apps.ts`, whose items are under
the entry below.

## The protocol

`docs/specs/worker/protocol.md`, "The cases" and "How it is verified": 0 items, 0 with a test that reaches all of it.

The revision of stage 5 changed no item of the two sections. It adds
types: the fields the diversity gains in its job and its result, and
the jobs and results of the distances between populations and of the LD
decay. "How it is verified" says that types have no test of their own:
the compiler checks them where they are used, and `npm run typecheck`
is that check. What the page and the worker do with a message whose
fields are not of these types is mapped under the messages below, and
what the runner puts in each field under the runner.

## The messages

`docs/specs/worker/messages.md`, "How it is verified", the items of stage 5: 13 items, 13 with a test that reaches all of it.

The tests are named by these short names of their files: `msg:` for `src/worker/messages.test.ts`.

The revision changed no item of "The cases". The messages are those the
page and the calculation worker send each other; `parseToRunner` is the
worker's check of a message of the page, and `parseFromRunner` the
page's check of a message of the worker.

| item | test | note |
|---|---|---|
| Every kind is accepted: a `run` of each of the seven jobs (574) | `msg:2442` "parseToRunner accepts a run of the LD decay %s"; `msg:2670` "parseToRunner accepts a run of the distances %s"; `msg:2999` "parseToRunner accepts a run of the diversity with the draw and the populations of calcPopDiversity"; `msg:2453` "parseFromRunner accepts a result of the LD decay of two populations and 50 bins"; `msg:2685` "parseFromRunner accepts a result of the distances with orders %s"; `msg:3006` "parseFromRunner accepts a result with its spectra, a population not given to calcPopDiversity among them" | the three jobs stage 5 adds or changes, each with its result; the other four are in the map of stage 4 |
| A diversity job with `numCalledAlleles` 1 is refused (618) | `msg:3011` "a diversity job with numCalledAlleles 1, below popnei's smallest draw, is wrongType, and so are 0 and 2.5" | |
| one whose `popDiversityPops` names a population not in `pops` (619) | `msg:3029` "a diversity job whose popDiversityPops names a population not in pops is wrongType" | |
| or two in another order than theirs (620) | `msg:3037` "a diversity job whose popDiversityPops holds two populations in another order than theirs, or one twice, is wrongType" | |
| a diversity result with `numVarsEveryPop` a number and `numVarsEveryPopInDraw` `null` (621) | `msg:3068` "a diversity result with numVarsEveryPop a number and numVarsEveryPopInDraw null, or the other way round, is wrongType" | |
| and one whose `foldedSfs` holds 20 values for a draw of 40 (622) | `msg:3085` "a diversity result whose foldedSfs holds 20 values for a draw of 40 is wrongLength" | |
| a result of the distances of three populations with two values of `fst`, `wrongLength` (624) | `msg:2733` "a result of three populations with two values of fst is wrongLength" | |
| an `order` of the kind `pcoa` of `[0, 0, 2]` (625) | `msg:2776` "an order of the kind pcoa of %s is refused" | run for `[0, 0, 2]` and for `[0, 1, 3]` |
| and a `notPlaced` without its `message` (625) | `msg:2817` "an order notPlaced without its message is missingFields" | |
| a result of the LD decay of two populations and 50 bins with 99 values of `meanR2`, `wrongLength` (626) | `msg:2458` "a result of two populations and 50 bins with 99 values of meanR2 is wrongLength" | |
| The version: a `ready` with `protocol: 3`, stage 4's, and no other field gives `otherProtocol` with 3 from both checks of the page (628) | `msg:2573` "a ready of protocol 3, stage 4's, with no other field, from the %s worker, is otherProtocol"; `msg:2618` "the version of the messages is 4" | |
| and so does `protocol: 5` with 5 (630) | `msg:2586` "a ready of protocol 5 with no other field, from the %s worker, is otherProtocol" | |
| with `protocol: "4"`, `wrongType` (630) | `msg:2599` "a ready of protocol "4", from the %s worker, is wrongType" | |

## The runner

`docs/specs/worker/runner.md`, "How it is verified", the items of stage 5: 16 items, 16 with a test that reaches all of it.

The tests are named by these short names of their files: `run:` for `src/worker/runner.test.ts`; `ord:` for `src/worker/runnerPopDistsOrder.test.ts`; `pf:` for `src/core/projectFile.test.ts`.

The revision changed no item of "The cases". The runner is the code of
the calculation worker that calls popnei; its tests call popnei in node
over the files of `e2e/fixtures/`. The sentence that says the numbers of
stage 5 are those of the four specs of its analyses, got in node on 30
September 2026, and the one that names the scripts `dists.mjs` and
`order.mjs`, say where the literals of the tests come from and name no
case; they are not counted.

| item | test | note |
|---|---|---|
| `transferablesOf` of a result of each of the seven analyses: the diversity of stage 5 with its spectra, one buffer per array (1538) | `run:1898` "of a diversity result, the fifteen buffers of its twelve arrays and three spectra, each once" | |
| the distances with the `order` of the kind `pcoa`; none twice when two fields hold one array; a view of part of a buffer throws (1539) | `run:3167` "transferablesOf of a result of the distances with orders of the kind pcoa: …"; `run:2948` "transferablesOf of a result of the LD decay: the buffer of each of its ten arrays, each once, and a view of part of a buffer throws" | the LD decay is the seventh analysis |
| The diversity of stage 5, over `panel.nei` and the populations of `panel_pops.csv` with the missing data filter at 0.05 and the default draw of 40: the table of stage 5 of `diversity.md`, F, the alleles and the private alleles of each population (1782) | `run:3258` "with the missing data filter at 0.05, F, the alleles and the private alleles of the table of stage 5, beside the three numbers of stage 2" | |
| the spectra of `sfs.md` from a second job with no filter, p0's first value 44.79323144486922, each of 21 values (1786) | `run:3381` "the spectra with no filter are in the order of the job, of 21 values each, p0's first 44.79323144486922, and equal to those of a call that asks folded_sfs alone" | |
| equal to the last digit to those of a call that asks `folded_sfs` alone (1789) | `run:3381` "the spectra with no filter are in the order of the job, …" | the test makes that call of popnei itself |
| the progress of the two calls, passes 1 and 2 of 2 (1790) | `run:3411` "told is given the calls of the two passes as passes 1 and 2 of 2" | |
| and of a job whose `popDiversityPops` is empty, one pass of 1 (1791) | `run:3425` "with popDiversityPops empty there is one pass, told as pass 1 of 1, calcPopDiversity is not called, and its numbers are NaN" | |
| a job with one population in `popDiversityPops`, with no private alleles asked, NaN in their three arrays and `numVarsEveryPop` `null` (1792) | `run:3453` "one population of a column given to calcPopDiversity has no private alleles asked: NaN in their three arrays and numVarsEveryPop null"; `run:3317` "All individuals, one population, gives F and the alleles, and no private alleles, which are not asked for" | |
| populations named `10`, `9` and `p`, in that order, whose spectra come back in the order of the job (1794) | `run:3479` "populations named 10, 9 and p come back with their numbers and spectra in the order of the job, not in popnei's 9, 10, p" | |
| The distances between populations: the Fst, the D and the variants of each pair of `popDists.md` at the missing data filter at 0.1 and at 0.05, the order p2, p0, p1 of both measures (1797) | `run:3038` "the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, the D and the variants of each pair of popDists.md to the last digit, and the order p2, p0, p1 of both measures"; `run:3065` "at the missing data filter at 0.05, which keeps 1,152 variants, the pairs of popDists.md and the order p2, p0, p1 of both measures" | |
| and the check numbers there (1800) | `run:3038` "the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, …"; `pf:3511` "v1-stage5-options.popnei.json opens into its project, …" | the check numbers are the variants kept and the Fst and the D of each pair: the runner's test gives the seven, and the project file of stage 5 holds the same seven as a literal |
| the populations named "3", "1" and "2" for p0, p2 and p1, given back by popnei as "1", "2", "3", held as "3", "1", "2" pair by pair (1801) | `run:3082` "p0, p2 and p1 named "3", "1" and "2", which popnei gives back as "1", "2", "3", …"; `ord:274` "the counts of variants of each pair follow popnei's order of the names 3, 1 and 2, and are put back in the job's" | |
| the fixture `panel_split.csv`, whose negative pair gives the order p0b, p0a, p2, p1 for both measures (1803) | `run:3116` "panel_split.csv gives the negative pair of p0a and p0b of popDists.md and the order p0b, p0a, p2, p1 of both measures" | |
| The LD decay, over `e2e/fixtures/ld.nei` and `ld_pops.csv` with the missing data filter at 0.1, `maxDist` 100,000: 432 variants and 29,367 pairs in each population, the half distances 7548.08187836982 and 7339.709512618931, and the first and last bins (1807) | `run:2806` "the job of the flow over ld.nei gives the numbers of ldDecay.md to the last digit: …" | |
| populations named "10" and "2", given back by popnei as "2", "10", held in the order of the job (1812) | `run:2851` "populations named "10" and "2", which popnei gives back as "2", "10", are held in the order of the job" | |
| and a population named `__proto__`, thrown as a defect (1813) | `run:2925` "a population named __proto__, the %s of the job, which popnei's result does not hold as a field of its own, is thrown as a defect" | run for the first, the second and the only population of the job |

## The client

`docs/specs/worker/client.md`, "How it is verified", the items of stage 5: 6 items, 6 with a test that reaches all of it.

The tests are named by these short names of their files: `cl:` for `src/worker/client.test.ts`.

The revision changed no item of "The cases". The client is the code of
the page that starts the two workers and sends them the requests; from
stage 5 it ends the calculation worker after every LD decay and starts
another, which gives back the memory the LD decay took. Its tests give
it workers made by the test, whose messages the test sends.

| item | test | note |
|---|---|---|
| The restart after an LD decay: a `result` of an `ldDecay` job of 2 individuals, with a run k6 waiting: the outcome is `done` before the worker is ended, then a new worker, the `open` of A, then k6 (816) | `cl:3039` "a result of an LD decay of 2 individuals, a run waiting: the LD decay is done, the worker ended, and a new one opens A again, then runs k6"; `cl:3112` "the outcome of an LD decay after %s is given before the restart: …" | the second shows the outcome comes first: when no new worker can be made, the LD decay is still done |
| a `refused` of such a job restarts it too (819) | `cl:3055` "an LD decay that popnei refused fails with its message, and the worker is started again" | |
| and so does a `crashed` that starts "popnei_web defect: " (819) | `cl:3069` "an LD decay ended by a crashed that starts "popnei_web defect: " fails as a defect, and the worker is started again" | |
| and a `reopenFailed` does not (820) | `cl:3083` "an LD decay that ends reopenFailed fails with it, and the worker is not ended" | |
| a result of a diversity ends no worker (821) | `cl:3102` "a result of a diversity ends no worker, and k6 is sent to it"; `cl:1849` "the worker is ended after a write larger than WRITE_RESTART_BYTES or refused, and after an LD decay done or refused, and not after a smaller write, a diversity or a reopenFailed" | the second is a property, checked over sequences of requests drawn at random |
| A `ready` of protocol 3, another than `PROTOCOL_VERSION`, which is 4 from stage 5: every request fails with `protocolMismatch`, and no other worker is made (840) | `cl:1065` "a ready of protocol 3, stage 4's, fails every request with protocolMismatch, and no other worker is made"; `cl:2062` "a ready of protocol 3, stage 4's, fails every read with protocolMismatch, and no other light worker is made"; `cl:2559` "a ready of protocol 3, stage 4's, of the worker started again after a large write fails every request with protocolMismatch, and no other worker is made" | |

## The base of the 2D plots

`docs/specs/charts/plot2d.md`, "How it is verified", the items of stage 5: 6 items, 6 with a test that reaches all of it.

The tests are named by these short names of their files: `p2d:` for `src/charts/plot2d.test.ts`; `hm:` for `src/charts/heatmap.test.ts`; `plots:` for `e2e/plots.spec.ts`.

The revision changed no item of "The cases". The base is the code every
2D plot is drawn through: it makes the SVG, its frame and its axes. From
stage 5 an axis can show names, one for each band of the heatmap, and
the horizontal axis can keep its ticks at whole numbers. The sentence
that a domain of 0.5 to 20.5 cannot test the whole numbers, since d3
gives whole ticks there by itself, is the reason of the item before it
and is not counted.

| item | test | note |
|---|---|---|
| The ticks of a horizontal axis with `xWholeNumbers` for a domain of 0.5 to 2.5 are the whole numbers 1 and 2 alone, where d3's ticks without it are 0.5, 1, 1.5, 2 and 2.5 (550) | `p2d:908` "the whole ticks of a horizontal axis from 0.5 to 2.5 are 1 and 2 alone, where d3 gives the halves too"; `p2d:984` "xWholeNumbers gives the horizontal axis from 0.5 to 2.5 the ticks 1 and 2, and the vertical axis keeps ticks that are not whole" | the first without a DOM, the second on the SVG, with the five ticks of the same plot without the option |
| while the vertical axis of the same plot, from 0 to 0.06, keeps ticks that are not whole (553) | `p2d:984` "xWholeNumbers gives the horizontal axis from 0.5 to 2.5 the ticks 1 and 2, …" | |
| An axis of a band scale of the names p2, p0, p1 draws three labels in that order and no tick line (587) | `p2d:1018` "an axis of a band scale of p2, p0, p1 draws the three names in that order, each in the middle of its band, and no tick line" | |
| with `xLabelAngle` −45 each label of the horizontal axis has the rotation −45 and the anchor `end` (589) | `p2d:1043` "with xLabelAngle -45 each name of the horizontal axis is turned by -45 and anchored at its end, and those of the vertical axis are not turned"; `plots:1662` "PA4 D3 in DejaVu Sans, names of up to 26 characters under the columns and left of the rows, and the legend, lie inside the SVG, each slanted name ending under its column" | the flow lays the slanted names out in a browser, which jsdom cannot |
| a name `<b>P1</b>` is text (589) | `p2d:1069` "a name <b>P1</b> is text on both axes and no b element is made" | |
| an empty `xLabel` leaves no text element of the label (590) | `p2d:1090` "an empty xLabel or yLabel leaves no text element of that label, and a label given later is written under the overlay"; `hm:285` "the names on the vertical axis read p2, p0, p1 from the top, those under the columns slanted at −45°, and no label of the axes is written" | |

## The histogram

`docs/specs/charts/histogram.md`, "How it is verified", the items of stage 5: 6 items, 6 with a test that reaches all of it.

The tests are named by these short names of their files: `hist:` for `src/charts/histogram.test.ts`.

The revision changed no item of "The cases". From stage 5 the histogram
draws the folded site frequency spectrum of a population: its bars are
shares, numbers that are not whole; the screen gives the top of the
vertical axis, `yMax`, so that the histograms of several populations
share one scale; and the ticks of the horizontal axis are whole numbers.

| item | test | note |
|---|---|---|
| The shares of p0 at n = 40, as a `Float64Array` over the edges 0.5 to 20.5, with `yMax` 0.061, give a vertical domain made round from it, where p0's largest share, 0.05590275165567829, would give 0 to 0.06 (442) | `hist:644` "the shares of p0 with yMax 0.061 give a vertical domain of 0 to 0.065, and without it 0 to 0.06" | the spec has 0 to 0.07 and the code gives 0 to 0.065: "Where a spec and the code differ", above. The test tells the shared top from p0's own either way |
| the largest share of the three populations, 0.05618145165329451, gives 0 to 0.06 as well, so it cannot tell the two apart (446) | `hist:644` "the shares of p0 with yMax 0.061 give a vertical domain of 0 to 0.065, …" | the test asserts 0 to 0.06 for a `yMax` of that share |
| ticks that are not whole on it (447) | `hist:693` "the shares of p0 with yMax 0.061 have vertical ticks that are not whole, 0.00 to 0.06, and bars that reach 0.0559 of 0.065" | |
| `xWholeNumbers` over the edges 0.5 to 2.5, two bins, the ticks 1 and 2 alone, where d3 would give fractions (448) | `hist:716` "xWholeNumbers over the edges 0.5 to 2.5, two bins, gives the horizontal ticks 1 and 2 alone, and without it d3 gives fractions"; `hist:729` "the spectrum of p0 with xWholeNumbers has whole ticks under the centres of its bars" | |
| a count of −0.1 or NaN throws (449) | `hist:778` "a share of -0.1 is refused"; `hist:785` "a share of NaN or of an infinity is refused" | |
| and a `yMax` below the largest count throws | `hist:796` "a yMax below the largest count is refused, and one equal to it is drawn"; `hist:810` "a yMax that is not finite is refused" | |

## The heatmap

`docs/specs/charts/heatmap.md`, "The cases" and "How it is verified": 22 items, 22 with a test that reaches all of it.

The tests are named by these short names of their files: `hm:` for `src/charts/heatmap.test.ts`; `p2d:` for `src/charts/plot2d.test.ts`; `plots:` for `e2e/plots.spec.ts`.

The heatmap draws the distances between populations as a square grid, a
row and a column for each population and a cell for each pair, filled
with the colour of its value on the scale viridis, which runs in 256
steps from dark purple to yellow. The spec is of stage 5 and is mapped
whole. The last sentence of "How it is verified", that the flow of the
panel checks the heatmap in the running application, names no case of
its own: that flow is mapped with `docs/specs/analyses/popDists.md`.

| item | test | note |
|---|---|---|
| Two names: a grid of two by two, one pair drawn twice, the bar from 0 to its value (276) | `hm:488` "two names: a grid of two by two, the one pair drawn in its two cells, and the bar from 0 to its value", added | failed with the check of the plot made to refuse fewer than three names |
| Every value NaN, Jost's D at ploidy 1: every cell crossed, no bar but the name of the value and "no value" (278) | `hm:367` "every value NaN: every cell crossed, no bar, and the legend the name of the value and "no value"" | |
| No value above 0: every finite cell the colour of 0, the bar one band; `viridisStep` is not called (280) | `hm:305` "a matrix whose values are all 0 or below: one path, of step 0, its values in white, and a bar of one band"; `hm:202` "the Fst of panel.nei are at the steps 239, 245 and 255; a negative value and a matrix with no value above 0 at step 0" | `viridisStep` gives step 128 for two equal ends, so a call of it would fail the step 0 of both tests |
| A negative value: the colour of 0, and its number with the minus sign in the cell and the tooltip (282) | `hm:384` "a negative value is of step 0 and writes "−0.0113" in white"; `hm:634` "a negative value is written with the minus sign in the tooltip, "Hudson's Fst −0.0113"", added | the added test failed with the tooltip given the number of `toFixed`, with a hyphen, which no other test caught |
| An `update` to the other measure, or another order: the paths are joined by their steps and the texts by their row and column, in the same SVG; the tooltip is hidden (284) | `hm:459` "an update to the other measure joins the paths by their steps and the texts by their row and column in the same SVG"; `hm:503` "an update to another order of the same names, p0, p2, p1 for p2, p0, p1: …", added; `hm:649` "Escape hides the tooltip and it stays hidden on that cell; another cell shows its own; an update hides it" | the added test failed with the texts joined by their place in the list and not by the names of their pair, which no other test caught |
| A band below 12 pixels: no names on the axes; below `CELL_TEXT_MIN`, no values in the cells (287) | `hm:420` "a band below 12 pixels writes no name on either axis; at 12 the names are written"; `hm:401` "a band of 55 pixels writes no value, and one of 56 writes them" | |
| A name with markup in it, `<b>P1</b>`: written as text on the axis and in the tooltip; no `b` element is made (289) | `hm:439` "a name with markup is written as text on the axes and in the tooltip, and no b element is made" | |
| `destroy`, a size of 0, a frame with no area, data the plot refuses and a change of theme are the base's cases; `destroy` also removes the tooltip (291) | `hm:716` "destroy removes the tooltip with the SVG, and a second destroy throws nothing"; `hm:542` "two names alike throw"; `p2d:278` "an element not larger than the margins gets an SVG of 0 by 0, and toSVG says the frame has no area"; `p2d:688` "a frame with no area gives the overlay a size of 0 and calls leave with null"; `plots:667` "VS4 D3 a plot whose element becomes 0 by 0 after a draw keeps its last drawing, which toSVG and toPNG export"; `plots:1537` "PA4 D3 toSVG of the heatmap of panel.nei, from a dark page, …" | the cases of the base are tested on the base, with a small plot written for its tests and with the histogram, as in the map of stage 4; on the heatmap itself, its `destroy`, its refusal, which adds nothing to the element, and its file in the light theme from a dark page |
| Without a DOM: `heatmapNumber` of 0.10273588423661377 is "0.1027" and of −0.011276258310056011 "−0.0113" (305) | `hm:195` "heatmapNumber writes four decimals with the minus sign U+2212, and a value that rounds to 0 with no sign" | |
| the step of a value and the class of its text, black at 111 and white at 110 (307) | `hm:202` "the Fst of panel.nei are at the steps 239, 245 and 255; …"; `hm:211` "the text of a cell is black from step 111 and white up to step 110" | |
| Under jsdom: the matrix of Fst of `panel.nei` in the order p2, p0, p1, in an element of 640 by 640 pixels, gives three paths of cells, of the steps 239, 245 and 255, each with the colour of `viridisColour` of its step and two cells, and the six values written, "0.1027" in the cells of p2 and p0 (311) | `hm:237` "the Fst of panel.nei in 640 by 640: three paths of the steps 239, 245 and 255 in their colours, two cells each, and the six values in black" | |
| a matrix whose values are all 0 or below gives one path, of step 0, and a bar of one band (315) | `hm:305` "a matrix whose values are all 0 or below: one path, of step 0, its values in white, and a bar of one band" | |
| the names on the vertical axis read p2, p0, p1 from the top (316) | `hm:285` "the names on the vertical axis read p2, p0, p1 from the top, …" | |
| the diagonal has no cell (317) | `hm:270` "the diagonal has no cell: no path starts a cell at the corner of p2 and p2, p0 and p0, or p1 and p1" | |
| A matrix with a NaN pair gives the path `chart-cell-none` with its two cells crossed (317) | `hm:340` "a pair with no value: the path chart-cell-none with its two cells, each crossed from corner to corner, and no value written in them" | |
| a negative value is of step 0 and writes "−0.0113" (318) | `hm:384` "a negative value is of step 0 and writes "−0.0113" in white" | |
| a band of 55 pixels writes no value (319) | `hm:401` "a band of 55 pixels writes no value, and one of 56 writes them" | |
| two names alike, a matrix not symmetric, one name or 201, throw (320) | `hm:542` "two names alike throw"; `hm:550` "a matrix that is not symmetric throws, and one with NaN in both cells of a pair does not"; `hm:566` "one name throws, and so do 201; 200 are drawn"; `hm:582` "values that are not the square of the number of names throw" | |
| A move of the pointer to the middle of the cell of p2 and p1 shows the tooltip "p2 and p1" and "Hudson's Fst 0.1096"; to the diagonal or to a gap, none (321) | `hm:594` "the middle of the cell of p2 and p1 shows the tooltip "p2 and p1" and "Hudson's Fst 0.1096" and outlines the cell; the diagonal and a gap show none" | |
| In Playwright, on the page of the plots of the tests: the heatmap of the same matrix drawn, its SVG of `toSVG` with the colours of viridis and the colour of the text written on each element, and no `var(` (326) | `plots:1537` "PA4 D3 toSVG of the heatmap of panel.nei, from a dark page, has on each cell and band its colour of viridis, on each value its black or white, no var(, no overlay and no mark of the hover" | |
| a hover shows the tooltip, and Escape hides it (328) | `plots:1608` "PA4 D3 the pointer on the cell of p2 and p1 outlines it and shows its tooltip beside its middle, Escape hides it, and axe finds nothing" | |
| axe finds nothing on the page (329) | `plots:1608` "PA4 D3 the pointer on the cell of p2 and p1 outlines it …" | axe is run with the tooltip shown and with it hidden |

## The line plot

`docs/specs/charts/line.md`, "The cases" and "How it is verified": 23 items, 22 with a test that reaches all of it.

The tests are named by these short names of their files: `ln:` for `src/charts/line.test.ts`; `plots:` for `e2e/plots.spec.ts`.

The line plot draws, for each series, its points, a line through other
positions, and marks, each a dashed vertical line with the mark of the
series at its top; the LD decay gives a series for each population, the
mean r² of its bins as the points, its fitted curve as the line, and
its half distance as the mark. A casing is a wider line in the colour
of the axes under a line of one of the three light colours. The spec is
of stage 5 and is mapped whole.

| item | test | note |
|---|---|---|
| A series with no point and no line, a population with no pair and no curve: it has its row in the legend, with the words the screen gives it, "pop_c · no pair", and nothing in the frame (208) | `ln:313` "a series with no point and no line keeps its row in the legend and draws nothing in the frame; every series empty leaves the axes and the legend" | |
| Every series empty: the axes and the legend, and an empty frame (211) | `ln:313` "a series with no point and no line keeps its row in the legend and draws nothing in the frame; …" | |
| A mark with a NaN is not drawn, as a point is not (212) | `ln:380` "a mark beyond the horizontal range, or with a NaN, draws no line and no mark, and a point outside the ranges is not drawn" | |
| More series than the legend has room for in the frame: the rows run below the frame's bottom, one every 18 pixels; so the screen gives no more series than its frame holds rows (213) | in part: `ln:262` "the legend has a row per series in their order, its label as text, its mark, and its piece of line on a casing for a light colour"; `ln:522` "50 series are refused and 49 drawn" | the tests reach the plot's part, a row every 18 pixels and as many rows as series, 49 of them; no test asserts that the rows past the frame are cut. That the LD decay draws at most 16 populations, and its words for those left out, are the screen's, and are mapped with `docs/specs/analyses/ldDecay.md` when its panel is accepted; how the legend holds more is left by the spec for the running application, so nothing is asked of the owner here |
| A label with markup, `<b>p1</b>`: written as text (222) | `ln:262` "the legend has a row per series in their order, its label as text, …" | |
| A change of theme: nothing is drawn again; the file is in the light theme (223) | `plots:577` "VS4 D3 a change of theme while the plot is on the screen draws nothing again, and a later toSVG is light"; `plots:1832` "PA4 D5 toSVG of the LD decay of ld.nei, from a dark page, is in the light theme: …" | that nothing is drawn again is the base's, tested on the histogram; the file of the line plot is checked from a dark page |
| Under jsdom: the skeleton with `chart chart-line` and no `chart-overlay` (240) | `ln:143` "the skeleton has the classes chart chart-line, its title and description, and no overlay" | |
| two series of groups 0 and 1, of three points, a line of four positions and one mark each: two `path.chart-line` and two `path.chart-line-casing`, and none more when a third series of group 2, green, is added (241) | `ln:154` "two series of groups 0 and 1 draw two lines on two casings, orange and sky blue being light; a third of group 2, green, adds a line and no casing" | |
| two `path.chart-points` with the classes `chart-colour-0` and `chart-colour-1`; a series of group 9 has `chart-colour-2` and the shape of index 3 (245) | `ln:183` "the points of each series are one path in the colour of its group, circles for group 0, and a series of group 9 has chart-colour-2 and the shape of index 3" | |
| two `line.chart-mark-line`, from the bottom of the frame to the y of the mark (247) | `ln:215` "each mark is a dashed line from the bottom of the frame up to its y in the colour of its series, and the mark of the series at 1.5 times the area at its top" | |
| two legend rows with the labels as text (248) | `ln:262` "the legend has a row per series in their order, its label as text, …" | |
| the order in `chart-marks`: every line before every set of points (249) | `ln:299` "in the marks every line comes before every set of points, after an update that adds a series too" | |
| a NaN in `points.y` leaves that point out of the path (250) | `ln:336` "a NaN in points.y leaves that point out of the path" | |
| a NaN in `line.y` breaks the path into two parts, two `M` commands (251) | `ln:366` "a NaN in line.y breaks the line into two parts, two M commands" | |
| a mark at an x beyond `xDomain` draws no line and no mark (252) | `ln:380` "a mark beyond the horizontal range, or with a NaN, draws no line and no mark, …" | |
| `check` throws for a domain `[1, 1]` or `[0, NaN]` (253) | `ln:458` "a domain [1, 1] or [0, NaN], across or up, is refused, by createLine and by update" | |
| for arrays of different lengths (253) | `ln:481` "points or a line whose two arrays differ in length are refused" | |
| for 50 series (254) | `ln:522` "50 series are refused and 49 drawn" | |
| and for 50,001 points and positions (254) | `ln:534` "50,001 points and positions of lines together are refused, and 50,000 drawn" | |
| the ticks of a horizontal axis from 0 to 100,000 with `xWholeNumbers` read "0", "20,000", …, "100,000" at 600 pixels (255) | `ln:402` "the ticks of a horizontal axis from 0 to 100,000 with xWholeNumbers read 0, 20,000, … 100,000 at 600 pixels" | |
| In Playwright, the plot of the LD decay of `ld.nei` with its numbers as literals: the SVG of `toSVG` in the light theme when the page is dark, the line of `chart-line-colour-0` with the stroke `rgb(230, 159, 0)` and a casing, and the legend in the file (261) | `plots:1832` "PA4 D5 toSVG of the LD decay of ld.nei, from a dark page, is in the light theme: …" | |
| `toPNG(2)` of the plot (264) | `plots:1944` "PA4 D5 toPNG(2) of the LD decay in 600 by 375 pixels is a PNG of 1,200 by 750 pixels, orange on the piece of line of the first row of its legend" | |
| A test of the tokens checks the four colours without a casing at 3:1 or more on the background of each theme (264) | `plots:1994` "PA4 D5 the lines of the four colours without a casing, green, blue, vermilion and reddish purple, are 3:1 or more on the background of the light and the dark theme" | |

## The entry

`docs/specs/entry.md`, "How it is verified", the items of stage 5: 2 items, 2 with a test that reaches all of it.

The tests are named by these short names of their files: `apps:` for `src/core/apps.test.ts`.

The revision changed no item of "The cases". `src/core/apps.ts` holds
the analyses of the application and `countsOf`, the function that says,
of a result, how many variants the file has and whether the counts of
its pass are those shown beside the filters of the Variants step.

| item | test | note |
|---|---|---|
| `countsOf` of a result of the distances between populations with the `passStats` of the diversity above: the same counts (905) | `apps:217` "countsOf of a result of the distances between populations with the passStats of the diversity gives the variants of the file, 1,200, and the counts of the same passStats, since its pass has the project's list and filters" | |
| and of a result of the LD decay with the same `passStats`, `numVarsRead` 1,200 and no counts (907) | `apps:196` "countsOf of a result of the LD decay with the passStats of the diversity gives the variants of the file, 1,200, and no counts, since its filters are the project's but the LD pruning" | |

The revision also names the two analyses in "The TypeScript interface",
in comments that are no item of the two sections: `popDists` and
`ldDecay` come after the diversity among the analyses of the
application, in the Analyses step. They are checked by
`apps:136` "the analyses of population genetics have distinct ids: …",
`apps:150` "each analysis has its step in POPGEN_ANALYSIS_STEPS, …",
`apps:111` "the distances between populations are an analysis of population genetics, in the Analyses step, just after the diversity"
and
`apps:120` "the LD decay is the last analysis of population genetics, in the Analyses step, just after the distances between populations".

## Left without a test

Each is in the table of its spec above, where its row says what a test reaches of it.

| spec | item | reason |
|---|---|---|
| the line plot | More series than the legend has room for in the frame: the rows run below the frame's bottom, one every 18 pixels; so the screen gives no more series than its frame holds rows (213) | the tests reach the plot's part, a row every 18 pixels and as many rows as series, 49 of them; no test asserts that the rows past the frame are cut. That the LD decay draws at most 16 populations, and its words for those left out, are the screen's, and are mapped with `docs/specs/analyses/ldDecay.md` when its panel is accepted; how the legend holds more is left by the spec for the running application, so nothing is asked of the owner here |
