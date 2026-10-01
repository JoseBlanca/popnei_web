# The map of the cases of stage 5

Deliverable 3 of work package 9 of `docs/plans/population-analyses.md`:
every item of "The cases" and of "How it is verified" of the specs of
stage 5, with the test that reaches it. A test reaches an item when it
gives the input the item names and checks the outcome the item gives;
each was read for that, not matched by its name. For a spec written
before stage 5, the items are those its revision of 30 September 2026
for stage 5, and the owner's decisions of 1 October 2026, added or
changed; `docs/specs/charts/heatmap.md`, `line.md`,
`docs/specs/analyses/popDists.md`, `sfs.md` and `ldDecay.md`, written
for stage 5, are mapped whole. The items the earlier stages wrote are in
`docs/plans/individuals-pca.cases.md`.

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
would write. Its opening comment says what a part holds. The parts were
started on 1 October 2026 with the specs that have no screen; those of
the three panels, `docs/specs/analyses/popDists.md`, `diversity.md`,
`sfs.md` and `ldDecay.md`, and of `docs/specs/shell.md`, were added the
same day, after the owner's decisions on the panels.

Each item is named in the spec's words, shortened, with the line of the
spec where it starts. A test is named by a short name of its file, the
line where it starts, and its title, or the start of it, as it stands in
the source: `prj:120` would be the test that starts at line 120 of the
file the section gives for `prj`. Each section names its short names
before its table. A test
marked "added" was written for this map: each test of Vitest was seen to
fail with the code it guards broken on purpose, on a copy of the sources
outside the repository, and to pass with the code as it is. The one flow
added, of the link of the LD decay in `e2e/ldDecay.spec.ts`, was written
by a session that runs no browser, and is run by the browser check of
the plan.

The tests of Vitest, which run in node, are under `src/`; those of the
plots run under jsdom, a library that gives node the document of a page
and lays nothing out. The flows of Playwright, which drive a browser
through the built site, are under `e2e/`; some run axe, a checker of the
rules of accessibility, on the page. The flows run in Chromium and WebKit here, since Playwright
1.63.0 cannot start Firefox on this Mac; Firefox runs them on GitHub
once `main` is pushed.

An item counts as reached when a test reaches all of it. The items that
are not are in "Left without a test", at the end, each with its reason.
Of the 277 items, 272 are reached and 5 not; the
tests cited are 392, 17 of them added for the map. A spec
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
| the distances between populations, `docs/specs/analyses/popDists.md` | 56 | 56 |
| the diversity, `docs/specs/analyses/diversity.md` | 48 | 48 |
| the site frequency spectrum, `docs/specs/analyses/sfs.md` | 26 | 24 |
| the LD decay, `docs/specs/analyses/ldDecay.md` | 40 | 38 |
| the protocol, `docs/specs/worker/protocol.md` | 0 | 0 |
| the messages, `docs/specs/worker/messages.md` | 13 | 13 |
| the runner, `docs/specs/worker/runner.md` | 16 | 16 |
| the client, `docs/specs/worker/client.md` | 6 | 6 |
| the base of the 2D plots, `docs/specs/charts/plot2d.md` | 6 | 6 |
| the histogram, `docs/specs/charts/histogram.md` | 6 | 6 |
| the heatmap, `docs/specs/charts/heatmap.md` | 22 | 22 |
| the line plot, `docs/specs/charts/line.md` | 23 | 22 |
| the entry, `docs/specs/entry.md` | 2 | 2 |
| the shell, `docs/specs/shell.md` | 3 | 3 |
| all | 277 | 272 |

## Where a spec and the code differ

Two points, each a sentence of a spec that the code does not do:

- `docs/specs/analyses/sfs.md`, "The cases", says of a population under
  the minimum of individuals, which has no spectrum, "It is not in the
  table nor in the CSV." The CSV leaves it out, but the table of the
  block keeps its two columns, with "no value" in every cell: the review
  of work package 7 made it so, since the table had dropped such a
  population without a word (`docs/plans/population-analyses.report.md`,
  work package 7, "The review"), and the spec was not changed with it.
  "What it shows" of the same spec gives the table "for each population,
  two columns", which agrees with the code. The recommendation is to
  correct the case to "Its columns in the table read "no value", and it
  is not in the CSV."
- `docs/specs/analyses/ldDecay.md`, "How it is verified", gives the line
  under the plot of 17 populations as "…in the order of the table. The
  two tables hold all 17.", where "Its words" of the same spec, the code
  and its tests have "…in the order of the table of the populations. The
  two tables hold all 17." The recommendation is to correct the sentence
  of "How it is verified".

The point the map of 1 October found first, the vertical axis of the
spectrum in `docs/specs/charts/histogram.md`, 0 to 0.07 where the code
gives 0 to 0.065, was settled the same day: the spec now gives 0.065.

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
| `populationsWithMinimum` of A of 2, B of 1 and C of 3 individuals at a minimum of 2 gives A and C, and B with 1, in that order (2003) | `prj:5459` "populationsWithMinimum of A of 2, B of 1, C of 3 and D of 1 individuals at a minimum of 2 gives A and C, and B and D with 1, each in that order" | the test has a fourth population, D of 1, so that the order of those under the minimum is checked too |
| and at 0 every population (2005) | `prj:5473` "populationsWithMinimum at a minimum of 0 gives every population, and none under it" | |
| `underMinimumText` of one population, the text as a literal (2006) | `prj:5479` "underMinimumText of one population gives its count and the consequence of one" | with the consequence of the distances and with that of the diversity |
| `underMinimumText` of two and of three populations | `prj:5496` "underMinimumText of two and of three populations gives their counts in their order and the consequence of several" | |
| `underMinimumText` of four populations, with no counts | `prj:5524` "underMinimumText of four populations names two and how many more, with no counts" | |
| `populationListsNeeds`, each case of the diversity's tests of stage 3, moved here with them (2007) | `prj:5338` "populationListsNeeds of a list to keep i4, who has no population, gives the reason of the lists, …"; `prj:5405` "the reason of the lists names the file escaped, and a list popnei would refuse is left to the store"; `prj:5425` "lists that remove every individual leave populationListsNeeds null for the one population, …"; `div:1693` "needs gives the reason of the lists, that of populationListsNeeds, and keptNeeds that of populationsKeptNeeds" | the last is the diversity, which gives the reasons of the two functions as its own |
| `populationsKeptNeeds`, each case of the diversity's tests of stage 3 | `prj:5382` "populationsKeptNeeds locks when the individuals kept leave no population, with the words of all left empty"; `prj:5425` "lists that remove every individual leave populationListsNeeds null for the one population, …" | |

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
`run:3285` "with the missing data filter at 0.05, F, the alleles and the private alleles of the table of stage 5, beside the three numbers of stage 2",
whose result holds the counts of stage 2 beside the numbers of the
second pass. Those of the LD decay are not, since its filters leave out
the LD pruning:
`apps:196` "countsOf of a result of the LD decay with the passStats of the diversity gives the variants of the file, 1,200, and no counts, …".
The function is `countsOf` of `src/core/apps.ts`, whose items are under
the entry below.

## The distances between populations

`docs/specs/analyses/popDists.md`, "The cases" and "How it is verified": 56 items, 56 with a test that reaches all of it.

The tests are named by these short names of their files: `pd:` for `src/core/analyses/popDists.test.ts`; `pdp:` for `src/core/analyses/popDistsPanel.test.ts`; `pdw:` for `src/ui/analyses/popDists/words.test.ts`; `pdui:` for `src/ui/analyses/popDists/panel.test.ts`; `run:` for `src/worker/runner.test.ts`; `ord:` for `src/worker/runnerPopDistsOrder.test.ts`; `hm:` for `src/charts/heatmap.test.ts`; `st:` for `src/core/store.test.ts`; `apps:` for `src/core/apps.test.ts`; `e2e:` for `e2e/popDists.spec.ts`.

The spec was written for stage 5 and is mapped whole. The tests of the
module are at its functions; those of the panel draw it with React
under jsdom; the runner's run in node with the popnei of the release.

### The cases

| item | test | note |
|---|---|---|
| One population, with or without a metadata file: locked with the words of `needs`, the panel in the Analyses step telling how to get two populations (641) | `pd:432` "without a metadata file, every individual in one population, needs two populations"; `pd:438` "with the grouping onePopulation, needs two populations"; `pd:444` "a column that gives the individuals of panel.nei one population names it"; `apps:111` "the distances between populations are an analysis of population genetics, in the Analyses step, just after the diversity" | |
| A population under the minimum: left out, named before the Run and in `tooFewIndividuals` after it; lowering the minimum brings it in, under a new key (644) | `pdw:53` "the populations it will run on are those with the minimum, and one under it is named after them"; `pd:589` "tooFewIndividuals of one population left out whole"; `pdw:69` "a minimum lowered brings a small population in, and a minimum of 0 takes every one"; `pd:1607` "the minimum of individuals changes it" | |
| Every population but one under the minimum: locked by `minimumNeeds`, or, after the thresholds, by `keptNeeds` (647) | `pd:455` "at a minimum of 70, only p2 of 84 has it; at 100, none"; `pd:484` "a list that leaves one population with the minimum locks, with the words of the filters" | |
| The lists or the filters of individuals leave one population: locked with the words of the one population left, which name the lists or the filters and not the minimum (649) | `pd:1117` "the lists of individuals leaving one population lock with words of their own, at any minimum"; `pd:1133` "the lists leaving p0 alone of panel.nei name it, and not the minimum"; `pd:1144` "the individuals kept leaving one population lock with the words of the filters, at any minimum" | |
| A pair with variants and no Fst: "no value" beside its count of variants; `fstWithoutValue`; the heatmap of Fst in the order of the file, by `noDistance` (652) | `pdw:107` "a row reads the pair, both distances to four decimals, a negative one with its minus sign, no value, and its variants"; `pd:1242` "fstWithoutValue of one pair with variants and no Fst"; `ord:178` "a pair with no distance keeps the order of the file for that measure alone, noDistance, and the result holds its NaN" | |
| Two populations: one pair; a grid of two in the order of the file, with no line of order (655) | `run:3146` "panel_split.csv at a minimum of 25, p0a and p0b left out, gives p2 and p1 their pair in the order of the file"; `pdui:648` "two populations have no line of order" | |
| A pair with no variant in common: "no value"; the heatmap in the order of the file, saying why; `pairWithoutDistance` (657) | `ord:178` "a pair with no distance keeps the order of the file for that measure alone, noDistance, and the result holds its NaN"; `pdp:261` "noDistance with two pairs names both, and with four the first two and how many more"; `pd:683` "pairWithoutDistance of one pair" | |
| A negative distance: shown as popnei gave it in the table, the tooltip and the cell; taken as 0 for the order; `negativeDistance` (659) | `pdw:107` "a row reads the pair, both distances to four decimals, …"; `hm:754` "a negative value is written with the minus sign in the tooltip, "Hudson's Fst −0.0113""; `hm:461` "a negative value is of step 0 and writes "−0.0113" in white"; `ord:198` "a negative distance is taken as 0 for the order alone: …"; `pd:787` "negativeDistance of the pair p0a and p0b of panel_split.csv names both measures" | the plot's tests give it the value; `pdp:99` "the heatmap of Fst is in the order of Fst, p2, p0, p1, …" checks that the panel hands the values on as the result holds them |
| Jost's D at ploidy 1: every D with no value; the heatmap of D a grid of cells with no value, in the order of the file; `jostHaploid`; the heatmap of Fst ordered as usual (661) | `run:3179` "a haploid VCF read with ploidy 1 gives every Jost's D as no value, in the order of the file by noDistance, and Hudson's Fst its values, ordered by the PCoA", added; `hm:444` "every value NaN: every cell crossed, no bar, and the legend the name of the value and "no value""; `pd:845` "jostHaploid for a load of ploidy 1, whatever the values of D" | |
| The measure changed while the analysis runs, or after it: nothing calculated, the heatmap of the other measure drawn from the same result; an undo gives the measure back (664) | `e2e:727` "PA5 D2 the measure changed while the distances run: …"; `e2e:241` "PA5 D2 panel.nei and popcat: the row of p0 and p2, …"; `pd:1612` "the measure the heatmap draws keeps it, so that a change of it calculates nothing" | |
| The minimum changed while the analysis runs: the key changes, and the running calculation is for the old key, as for any option (667) | `pd:1607` "the minimum of individuals changes it"; `st:1879` "a late result: after a command, the result of the old key goes into the cache with the warnings of its request's project, and an undo shows it" | the store's case, which holds for any option of the key |
| Populations named by whole numbers, 3, 1, 2: shown in the order of the file; the runner undoes popnei's order (670) | `run:3092` "p0, p2 and p1 named "3", "1" and "2", which popnei gives back as "1", "2", "3", …"; `ord:274` "the counts of variants of each pair follow popnei's order of the names 3, 1 and 2, and are put back in the job's" | |
| The filters keep no variant: popnei refuses the call, and the error state says the diversity's row for the distances (673) | `pd:1025` "of popnei's message of an empty pass" | |

### How it is verified

| item | test | note |
|---|---|---|
| The worked example at a minimum of 1: `run` sends A and B and `leftOut` `[]` (709) | `pd:362` "with the minimum at 1, run sends A and B, C being outside the variants file, and leaves out none" | |
| at a minimum of 2, `needs` gives "Only A has 2 individuals or more, …" (713) | `pd:381` "with the minimum at 2, needs gives that only A has 2 individuals or more" | |
| with a list to remove that names i2, "The lists of individuals leave one population, A, …", at the minimum of 1 and at 0 (715) | `pd:1117` "the lists of individuals leaving one population lock with words of their own, at any minimum" | at 0, 1, 2 and 20 |
| a fake result of A and B with an Fst of −0.01 and a D of 0.02: `negativeDistance` naming Fst alone, `checkNumbers` `[numVars, −0.01, 0.02]`, `numCheckNumbers` 3 (719) | `pd:387` "a result of A and B with an Fst of −0.01 and a D of 0.02 gives negativeDistance naming Fst alone, …" | |
| The locks, a case for each row of `needs` (722) | `pd:406` "gives the reason of individualsNeeds first: …"; `pd:413` "gives the reason of the column of the populations: none chosen"; `pd:419` "gives the reason of the lists of individuals leaving no individual with a population"; `pd:432` "without a metadata file, every individual in one population, needs two populations"; `pd:438` "with the grouping onePopulation, needs two populations"; `pd:444` "a column that gives the individuals of panel.nei one population names it"; `pd:1133` "the lists leaving p0 alone of panel.nei name it, and not the minimum"; `pd:455` "at a minimum of 70, only p2 of 84 has it; at 100, none"; `pd:464` "with the lists taking p2 and p1 below the minimum, the reason names the lists" | |
| `keptNeeds` with a list that leaves one population with the minimum among two, and with a list that leaves one population alone (722) | `pd:484` "a list that leaves one population with the minimum locks, with the words of the filters"; `pd:1144` "the individuals kept leaving one population lock with the words of the filters, at any minimum"; `pd:495` "a list that leaves no population gives populationsKeptNeeds, the diversity's reason" | |
| the key, a pair of projects for each row of its table (724) | `pd:1430` "a new load of the variants file, the same file included, changes it"; `pd:1439` "the ploidy or onlyPassed of a VCF changes it"; `pd:1460` "the name of the variants file, or its read recorded, keeps it"; `pd:1474` "a filter of the variants added or removed, or its threshold, changes it"; `pd:1490` "a filter of individuals, a list, a name of it or a threshold, changes it"; `pd:1504` "another column of the populations that groups the individuals otherwise changes it"; `pd:1508` "another column that makes the same populations with the same names keeps it"; `pd:1516` "the metadata file removed with a column chosen, or the grouping onePopulation, changes it, to all"; `pd:1524` "the metadata file removed with onePopulation, or loaded with onePopulation, keeps it: all with the file and without it"; `pd:1530` "a cell of the column of the populations changes it, one of an individual not in the variants file included"; `pd:1548` "a cell of another column keeps it"; `pd:1560` "the rows of the file in another order change it"; `pd:1567` "the type of a column keeps it"; `pd:1588` "the same table from another file, or with other options of the CSV, keeps it"; `pd:1607` "the minimum of individuals changes it"; `pd:1612` "the measure the heatmap draws keeps it, so that a change of it calculates nothing"; `pd:1619` "the options of another analysis and the reference keep it"; `pd:1635` "the key version, 1, or the version of popnei, changes it" | |
| The warnings: the texts of the table for one, two and four populations or pairs (726) | `pd:589` "tooFewIndividuals of one population left out whole"; `pd:609` "tooFewIndividuals of two populations gives their counts"; `pd:652` "tooFewIndividuals of four populations names two and counts none"; `pd:599` "tooFewIndividuals of one population the filters of individuals took individuals from offers to loosen them"; `pd:672` "populationNotInResult names a population the filters emptied, and not one left out for its size"; `pd:683` "pairWithoutDistance of one pair"; `pd:696` "pairWithoutDistance of two pairs"; `pd:726` "pairWithoutDistance of four pairs names two"; `pd:1255` "fstWithoutValue of two pairs, and of four, which names two"; `pd:738` "pairsOnFewerVariants of one pair over 641 of 1,152 variants"; `pd:754` "pairsOnFewerVariants of three of six pairs names the one over the fewest"; `pd:814` "negativeDistance of two pairs names them, and of four names two"; `pd:856` "the warnings come in the order of the spec's table" | |
| `pairsOnFewerVariants` with 1,151 of 1,152 as "99%" (727) | `pd:778` "pairsOnFewerVariants of 1,151 of 1,152 variants writes 99%, never 100%" | |
| and with every pair of three as "All 3 pairs are over fewer than …" ending at the pair named (728) | `pd:1206` "pairsOnFewerVariants of every pair of three says All, with no clause of the others" | |
| `pairWithoutDistance` and `pairsOnFewerVariants` at a minimum of 0 and of 1, with no count of individuals (730) | `pd:1159` "pairWithoutDistance at a minimum of 0 or 1 counts no individuals"; `pd:1191` "pairsOnFewerVariants at a minimum of 0 or 1 says a population has no called genotype" | |
| `fstWithoutValue` for a pair of 12 variants whose Fst is NaN, and none for a pair of 0 variants (731) | `pd:1242` "fstWithoutValue of one pair with variants and no Fst"; `pd:1277` "fstWithoutValue is not raised for a pair with no variant, nor for a Jost's D with no value" | |
| `negativeDistance` with an order `pcoa` (732) | `pd:787` "negativeDistance of the pair p0a and p0b of panel_split.csv names both measures" | |
| with each order of the file, "The heatmap shows the value." (733) | `pd:1285` "negativeDistance says the heatmap shows the value when it keeps the order of the file, for each reason"; `pd:1308` "negativeDistance of several pairs in the order of the file says the heatmap shows the values" | |
| with Fst negative and ordered by the file while D is not negative and ordered `pcoa`, the same (734) | `pd:1325` "negativeDistance reads the order of the measures it names: …"; `pd:1347` "the review of PA10: the mirror case, …" | |
| and with 201 populations, the text ending "…apart." (735) | `pd:1358` "negativeDistance of 201 populations, whose heatmap is not drawn, says nothing of the heatmap; of 200 it does" | |
| `jostHaploid` for a load of ploidy 1 (736) | `pd:845` "jostHaploid for a load of ploidy 1, whatever the values of D" | |
| `popDistsHeatmap` of a fake result whose order of Fst is `[1, 0, 2]` and of D `[2, 1, 0]`: p2, p0, p1 for Fst and p1, p2, p0 for D (737) | `pdp:99` "the heatmap of Fst is in the order of Fst, p2, p0, p1, …"; `pdp:115` "the heatmap of D is in the order of D, p1, p2, p0, and not in that of Fst" | |
| with the order of the file, the names of the result (740) | `pdp:131` "with the order of the file, the names of the result in its order" | |
| `orderText` of each row of its table, for each measure (742) | `pdp:257` "%s, the heatmap of %s"; `pdp:261` "noDistance with two pairs names both, …" | the rows twoPopulations, noDistance of one pair and of none, allZero, notPlaced and pcoa, each for both measures |
| `popDistsDescription` of the flow's result, of a result with a pair of no value and of one with none (743) | `pdp:295` "the flow's result: the measure, the populations in their order, …"; `pdp:301` "a result with pairs of no value: …"; `pdp:313` "a result with no value"; `pdp:319` "one pair with a value, of two populations, and one pair of no value among three" | |
| `popDistsRows` and `popDistsCsv` of the flow's result, as literals (745) | `pdp:335` "the flow's result: the rows in its order, and the CSV of the spec" | |
| a population named `a,"b"` quoted, and one named `=p1` written `'=p1` (746) | `pdp:369` "a population named a,"b" is quoted, …"; `pdp:381` "populations named =p1 and -p2 are written with a quote before them, and a negative Fst stays a number" | |
| `refusalText` of popnei's message of an empty pass and of one population, as literals (747) | `pd:1025` "of popnei's message of an empty pass"; `pd:1036` "of popnei's message of one population" | |
| `numCheckNumbers` 7 for the flow's project (749) | `pd:934` "numCheckNumbers is 7 for the flow's project, 1 + 3 × 2" | |
| and `null` with a threshold on the individuals, with no column of the populations, with the variants file pending, and with one population (749) | `pd:938` "numCheckNumbers is null with a threshold on the individuals"; `pd:945` "numCheckNumbers is null with no column of the populations"; `pd:949` "numCheckNumbers is null with the variants file pending"; `pd:953` "numCheckNumbers is null with one population, and with one that has the minimum" | |
| `parseOptions`: the defaults back (752) | `pd:964` "gives the defaults back, an object of exactly the two fields" | |
| a minimum of 0 and of 4,294,967,295 taken (752) | `pd:971` "takes a minimum of 0 and of 4,294,967,295, and the measure dest" | |
| a minimum of −1, 2.5 or 4,294,967,296, a `measure` `"gst"`, a field missing or more, refused (754) | `pd:980` "refuses a minimum of −1"; `pd:986` "refuses a minimum of 2.5"; `pd:992` "refuses a minimum of 4,294,967,296"; `pd:998` "refuses the measure gst"; `pd:1004` "refuses a field missing and a field more" | |
| `script` of the flow's project gives the lines, as a literal (756) | `pd:1049` "of the flow's project gives the lines of the spec" | |
| at a minimum of 0, `len(names) >= 1` and `min_num_individuals=0` (757) | `pd:1095` "PA10 at a minimum of 0 keeps a population only when it holds an individual, and gives popnei the 0" | |
| `tooManyPopulationsText` of 201, of 1,000 and of 200 populations (759) | `pdp:390` "201 populations"; `pdp:396` "1,000 populations, with a comma between thousands"; `pdp:402` "200 populations: none" | |
| `POP_DISTS_MAX_SHOWN` is `MAX_HEATMAP_NAMES` (763) | `pdw:23` "the most populations the panel shows is the most names the heatmap draws" | |
| The runner's numbers, `popcat` at the missing data filter at 0.1: the Fst, the D and the variants of the three pairs (773) | `run:3048` "the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, …" | |
| at the filter at 0.05, 1,152 kept (776) | `run:3075` "at the missing data filter at 0.05, which keeps 1,152 variants, …" | |
| the names "3", "1" and "2" for p0, p2 and p1, held as "3", "1", "2" pair by pair, and the order "1", "3", "2" (780) | `run:3092` "p0, p2 and p1 named "3", "1" and "2", which popnei gives back as "1", "2", "3", …" | |
| the order of both measures, with either filter, p2, p0, p1 (786) | `run:3048` "the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, …"; `run:3075` "at the missing data filter at 0.05, which keeps 1,152 variants, …" | the first components and Lingoes' constant of 0 that follow are not in the result, which holds the order they give |
| the check numbers at 0.1 (789) | `pd:922` "checkNumbers of the flow's result gives the variants kept, then the Fst and the D of each pair" | of a fake result holding the runner's numbers |
| `panel_split.csv`: the six pairs over the 1,200 variants, the order p0b, p0a, p2, p1 of both (793) | `run:3126` "panel_split.csv gives the negative pair of p0a and p0b of popDists.md and the order p0b, p0a, p2, p1 of both measures" | Lingoes' constants are not in the result, as above |
| at the minimum of 25, p2 and p1 keep their pair, Fst 0.10962148955018115, in the order of the file (813) | `run:3146` "panel_split.csv at a minimum of 25, p0a and p0b left out, …" | |
| The flow of `panel.nei` and `popcat`: the row of p0 and p2, the heatmap's rows p2, p0, p1, Jost's D with "0.0613" and no running state, an undo gives Fst back (885) | `e2e:241` "PA5 D2 panel.nei and popcat: the row of p0 and p2, …" | in Chromium and WebKit |
| then `panel_split.csv`: `negativeDistance` with −0.0113 and the rows p0b, p0a, p2, p1; the minimum at 25: the notice, the ready state naming p0a and p0b, Run, the heatmap of two with no line of order; axe in each state (891) | `e2e:317` "PA5 D2 panel_split.csv: the negative distance and the order p0b, p0a, p2, p1; …" | in Chromium and WebKit |
| The flow above 200 populations: 402 individuals in 201 populations of two, the minimum at 2, Run: the text of `tooManyPopulationsText`, no heatmap nor table, a CSV of 20,100 rows and its header, axe (898) | `e2e:378` "PA5 D2 201 populations of two: …" | in Chromium and WebKit |

## The diversity

`docs/specs/analyses/diversity.md`, "The cases" and "How it is verified", the items of stage 5: 48 items, 48 with a test that reaches all of it.

The tests are named by these short names of their files: `div:` for `src/core/analyses/diversity.test.ts`; `dw:` for `src/ui/analyses/diversity/words.test.ts`; `dc:` for `src/ui/analyses/diversity/commands.test.ts`; `dui:` for `src/ui/analyses/diversity/panel.test.ts`; `sw:` for `src/ui/analyses/diversity/spectrumWords.test.ts`; `run:` for `src/worker/runner.test.ts`; `e2e:` for `e2e/diversity.spec.ts`; `kept:` for `e2e/diversityKept.spec.ts`.

The items are those the revision of 30 September 2026 for stage 5, and
the owner's decisions of 1 October 2026, added to the two sections or
changed in them: the second call of popnei, `calcPopDiversity`, with F,
the alleles, the private alleles and the spectrum, over the populations
with the minimum of individuals, `popDiversityPops`, at a draw of
chromosomes, `numCalledAlleles`. The spectrum's own items are in its
section below.

### The cases

| item | test | note |
|---|---|---|
| A population smaller than 20, from stage 5: left out of `popDiversityPops`, its six new cells "no value" too (1321) | `div:2117` "with the default of 20, no population, at a draw of 40"; `run:3380` "p0 cut to 12 individuals and left out of calcPopDiversity has NaN in its six numbers and no spectrum, …"; `div:2891` "diversityRows of a result with NaN in privateAllelesTotal gives null in the three cells of the private alleles, and not 0" | |
| No population with the minimum of individuals: `calcPopDiversity` not called, one pass, "no value" in every number, `tooFewIndividuals` (1324) | `div:2117` "with the default of 20, no population, at a draw of 40"; `run:3452` "with popDiversityPops empty there is one pass, told as pass 1 of 1, calcPopDiversity is not called, and its numbers are NaN"; `div:497` "warnings of four populations of fewer than 20 names two and how many more, with no counts" | |
| The minimum lowered: the default draw follows it, 20 at a minimum of 10, `popDiversityPops` those with 10 or more; a draw typed stays (1327) | `div:2325` "drawOf of the default follows the minimum, 20 at a minimum of 10 for diploids, and a draw typed does not"; `div:2109` "with minNumIndividuals 2, A of 2 individuals is given and B of 1 is not, at a draw of 4 for ploidy 2"; `dc:60` "a draw typed stays when the minimum changes, and Use the default gives the draw back to the ploidy times the minimum"; `dui:327` "a minimum typed is one command, and the default draw follows it" | |
| A draw typed above a population's chromosomes, at most those of the largest: no rarefied value and a spectrum of zeros; named in the ready state; `variantsNotInDraw` after the Run; above the largest population, locked (1331) | `run:3747` "a draw of 130 gives p0, whose 96 chromosomes never reach it, no rarefied value and a spectrum of zeros, and p2 a spectrum that is not", added; `dw:358` "PA10 the ready state names the populations of the minimum that hold fewer chromosomes than the draw, one, two or three, and more"; `div:2785` "a population in the draw at none of its variants has no rarefied values, …"; `div:2369` "on populations of 48, 84 and 68 individuals, as panel.nei's, a draw of 168 does not lock and one of 169 names p2, its 168 and its 84 individuals" | |
| A haploid VCF: the default draw the minimum, 20; F NaN for every population, and `noFInHaploid` (1337) | `div:2565` "a haploid VCF at the minimum of 20 has the default draw of 20, the minimum", added; `run:3761` "a haploid VCF read with ploidy 1 gives F no value in every population, and the alleles their values", added; `div:2825` "a variants file of ploidy 1 gives noFInHaploid, …" | |
| One haploid individual, at a minimum of 0 or 1: not locked, one pass, the six numbers "no value", no spectrum drawn, `tooFewChromosomesForDraw` and `noFInHaploid` (1339) | `div:2518` "one haploid individual does not lock, at the default draw of 2 and at a draw typed of 5"; `div:2558` "at a minimum of 0, one haploid individual does not lock either, …", added; `div:2523` "run sends it with no population for calcPopDiversity, the first pass alone, and the draw of 2"; `run:3452` "with popDiversityPops empty there is one pass, …"; `div:2527` "its result gives tooFewChromosomesForDraw and noFInHaploid, …"; `sw:80` "the lines in place of a histogram: …" | |
| No metadata file, from stage 5: the one row with no private alleles and `privateAllelesNeedTwoPopulations` (1380) | `run:3344` "All individuals, one population, gives F and the alleles, and no private alleles, which are not asked for"; `div:2664` "All individuals in the call gives privateAllelesNeedTwoPopulations with the words of the one population" | |

### How it is verified

| item | test | note |
|---|---|---|
| The worked example, from stage 5: `run` sends `numCalledAlleles` 40, for ploidy 2, and `popDiversityPops` `[]` (1446) | `div:256` "the worked example gives the populations, the request, the warnings, the key inputs and the check numbers of the spec" | |
| `keyInputs` with the options without the default draw (1456) | `div:256` "the worked example gives the populations, the request, …"; `div:3008` "keyInputs with the default draw gives no numCalledAlleles, not even null, and with a draw typed gives it" | |
| `parseOptions`, from stage 5: `minNumIndividuals` 4,294,967,295, `numCalledAlleles` 2 and 4,294,967,295 taken (1501) | `div:2182` "takes a minNumIndividuals of 0 and of 4,294,967,295"; `div:2196` "takes a numCalledAlleles of 2 and of 4,294,967,295" | |
| `numCalledAlleles` 1, 2.5 or a text refused; the two fields of stage 2 alone refused (1504) | `div:2262` "refuses a numCalledAlleles of 1, 0, 2.5, 4,294,967,296, a text, and undefined"; `div:2280` "refuses the two fields of stage 2 alone" | |
| The populations of `calcPopDiversity`: at a minimum of 2, `["A"]` and 4; at 1, `["A", "B"]` and 2; at 20, `[]` (1506) | `div:2109` "with minNumIndividuals 2, A of 2 individuals is given and B of 1 is not, …"; `div:2113` "with minNumIndividuals 1, A and B in their order, at a draw of 2"; `div:2117` "with the default of 20, no population, at a draw of 40" | |
| a draw typed, 7, sent whatever the minimum (1510) | `div:2312` "a draw typed, 7, is sent as typed whatever the minimum" | |
| `drawOf` of ploidy 4 and the minimum 20, 80, and of ploidy 1 and the minimum 0, 2 (1511) | `div:2320` "drawOf of ploidy 4 and the minimum 20 gives 80, and of ploidy 1 and the minimum 0 gives 2" | |
| The lock of the draw: a draw of 5 over A, the largest, of 4 chromosomes, the reason with no list, which names A (1513) | `div:2345` "a draw of 5 over A, the largest population, of 2 individuals and 4 chromosomes, locks in needs with the words of no list, which name A" | |
| a draw of 4, `null`, and of 8, the reason again (1516) | `div:2351` "a draw of 4, which A holds, does not lock, and one of 8, …" | |
| a list to remove `["i3"]`, A and B of one each, a minimum of 1 and a draw of 3: the reason of a list, naming A and "its one individual" (1518) | `div:2358` "with a list to remove i3, A and B of one individual each, and a draw of 3, needs locks with the words of the lists, which name A, the first of the two" | |
| the default draw at a minimum of 20, `null` (1521) | `div:2393` "with no population of the minimum there is no lock: the default draw at 20, and a draw of 9 at 20" | |
| `keptNeeds` with a threshold, the individuals kept `["i1", "i2"]`, a minimum of 1 and a draw of 3: the reason of the filters (1522) | `div:2425` "keptNeeds with the individuals kept i1 and i2, A and B of one each, and a draw of 3, names A and its one individual"; `div:2409` "keptNeeds with a threshold, the individuals kept i1 and i3 and a draw of 5, locks with the words of the filters" | |
| with the individuals kept `null` and a draw of 9, `null` (1525) | `div:2464` "keptNeeds leaves to needs the list null, a list as long as the lists keep, and a list not known" | |
| on `panel.nei`, a draw of 168 `null`, and of 169 the reason naming p2, 168 and its 84 individuals (1526) | `div:2369` "on populations of 48, 84 and 68 individuals, as panel.nei's, …" | |
| with no metadata file, at a minimum of 2, a draw of 9 over the four individuals, the reason of the individuals, and of 8 `null` (1528) | `div:2398` "the one population locks too, with no metadata file, at its individuals: a draw of 9 over the 4, and not one of 8" | |
| Fewer than 2 chromosomes: one haploid individual with no metadata file at a minimum of 1, `needs` `null` at the draw of 2 and of 5 (1531) | `div:2518` "one haploid individual does not lock, at the default draw of 2 and at a draw typed of 5" | |
| `run` sends `popDiversityPops` `[]` and 2 (1534) | `div:2523` "run sends it with no population for calcPopDiversity, …" | |
| its result: `tooFewChromosomesForDraw` and `noFInHaploid`, neither `privateAllelesNeedTwoPopulations` nor `variantsNotInDraw` (1536) | `div:2527` "its result gives tooFewChromosomesForDraw and noFInHaploid, …" | |
| two haploid individuals in two populations: the default draw, 2, runs with both; a draw of 3, the reason that counts the individuals (1538) | `div:2547` "two haploid individuals in two populations run at the default draw, …"; `div:2570` "a result of two haploid individuals in two populations gives no tooFewChromosomesForDraw" | |
| The warnings of stage 5: a population of 12 among others gives `privateAllelesWithoutSmall` naming it, after `tooFewIndividuals` (1543) | `div:2612` "a population of 12 among others of 20 or more gives privateAllelesWithoutSmall naming it, after tooFewIndividuals" | |
| one population in the call: `privateAllelesNeedTwoPopulations` in the words of the column, and of "All individuals" in those of the one population (1546) | `div:2652` "one population of the column in the call gives privateAllelesNeedTwoPopulations with the words of the column, …"; `div:2664` "All individuals in the call gives privateAllelesNeedTwoPopulations with the words of the one population" | |
| `numVarsEveryPop` 641 of 1,152: `privateAllelesOverFewerVariants` with "(56%)", and 0 in its words of none (1549) | `div:2675` "numVarsEveryPop 641 of 1,152 gives privateAllelesOverFewerVariants with 56%, and 0 its words of none" | |
| p0 in a draw of 96 at 277 of 1,152: `variantsNotInDraw` with "(24%)", and its last sentence at 277 of `numVarsEveryPop` 1,152 (1551) | `div:2717` "p0 in a draw of 96 at 277 of its 1,152 variants gives variantsNotInDraw with 24%, …" | |
| the last sentence of one variant and of none, in their words (1554) | `div:2754` "the last sentence of variantsNotInDraw over the one variant at which every population reaches the draw, and over none", added | |
| two populations with a value at 1,152 and 1,100 variants, "at which each has a value" (1555) | `div:2808` "two populations short of the draw are listed with their counts and shares" | |
| two populations left out of the private alleles, "some of those populations" (1556) | `div:2635` "more than three populations counted are counted by their number, and those left out named" | |
| a variants file of ploidy 1, `noFInHaploid`; no result gives the warning of the spectrum, with a MAF filter that removed variants (1557) | `div:2825` "a variants file of ploidy 1 gives noFInHaploid, the last warning, the spectrum's being said in its block and not here" | |
| `diversityRows` of a result with NaN in `privateAllelesTotal`: `null` in the three cells, not 0 (1560) | `div:2891` "diversityRows of a result with NaN in privateAllelesTotal gives null in the three cells of the private alleles, and not 0" | |
| The numbers of stage 5 with the missing data filter at 0.05: F, the alleles and the private alleles of p0, p2 and p1 (1699) | `run:3285` "with the missing data filter at 0.05, F, the alleles and the private alleles of the table of stage 5, …" | |
| with the filter at 1, 1,200 kept (1709) | `run:3293` "with the missing data filter at 1, the table of stage 5 of 1,200 variants" | |
| a draw of 96: the rarefied alleles, p0 in the draw at 277, `numVarsEveryPopInDraw` 277 (1722) | `run:3631` "the draw of 96 of diversity.md: …" | |
| p0 cut to its first 12 individuals and left out: the private alleles of p2 and p1, 22 and 16 (1726) | `run:3380` "p0 cut to 12 individuals and left out of calcPopDiversity has NaN in its six numbers and no spectrum, …" | |
| left in: `numVarsEveryPop` 0, the private alleles of all three 0, NaN per variant (1731) | `run:3777` "p0 cut to 12 individuals and left in calcPopDiversity: …", added | |
| "All individuals", F 0.055317745614243075, alleles per variant 2, rarefied 1.992568885944447; the job asks for F and the alleles alone (1733) | `run:3344` "All individuals, one population, gives F and the alleles, …" | at the filter at 0.05; the 2,304 private alleles are of a call the job does not make |
| the list of 111 before the filter, 1,117 variants: F, the alleles and the private alleles (1738) | `run:3318` "with the list of 111 before the filter at 0.05, F, the alleles and the private alleles of diversity.md over 1,117 variants" | |
| the refusals of the draw: 401 over the 200 individuals, "…is 400…" (1746) | `run:3550` "a draw above the chromosomes of the individuals is popnei's refusal of the second call" | |
| and 40 over a list of 15, "…is 30…" (1749) | `run:3792` "a draw of 40 over a list of 15 individuals is popnei's refusal, whose largest draw is 30", added | |
| the progress of a job of two calls, `pass` 1 then 2 of 2, `bytesRead` 0 and 259,376, and of a job with `popDiversityPops` empty, 1 of 1 (1783) | `run:3438` "told is given the calls of the two passes as passes 1 and 2 of 2"; `run:3452` "with popDiversityPops empty there is one pass, …" | |
| The flow with the filter at 0.05: the row p0 to its end, 48, 0.3527, 0.3567, 0.9288, −0.0113, 1.9792, 1.9646, 0, 0.0000, 0.0028, and p2's private alleles, 1 (1785) | `e2e:1189` "PA7 D1 at 0.05 the row p0 reads to its end …" | in Chromium and WebKit |
| the flow of stage 3: p0 of 29 individuals with F −0.0141 (1788) | `kept:516` "PA7 D1 with the thresholds at 0.03 and 0.38, p0 of 29 individuals has F −0.0141, and axe" | in Chromium and WebKit |
| a draw of 96 typed: `variantsNotInDraw` of p0, "277 of the 1,152 variants", and the column headed with 96 (1788) | `e2e:1217` "PA7 D1 a draw of 96 typed: …" | in Chromium and WebKit |

## The site frequency spectrum

`docs/specs/analyses/sfs.md`, "The cases" and "How it is verified": 26 items, 24 with a test that reaches all of it.

The tests are named by these short names of their files: `sfs:` for `src/core/analyses/sfs.test.ts`; `sw:` for `src/ui/analyses/diversity/spectrumWords.test.ts`; `dui:` for `src/ui/analyses/diversity/panel.test.ts`; `div:` for `src/core/analyses/diversity.test.ts`; `run:` for `src/worker/runner.test.ts`; `e2e:` for `e2e/diversity.spec.ts`.

The spec was written for stage 5 and is mapped whole. The spectrum is
calculated in the diversity's call and drawn as a block of its panel,
so its tests are among the diversity's.

### The cases

| item | test | note |
|---|---|---|
| A population under the minimum: not in popnei's call, `calculated` false; in the block a line with the words of the minimum, from the diversity's options, and no histogram (340) | `run:3380` "p0 cut to 12 individuals and left out of calcPopDiversity has NaN in its six numbers and no spectrum, …"; `sfs:63` "a population not given to popnei is not calculated and not in the CSV"; `sw:80` "the lines in place of a histogram: …"; `dui:647` "its caption, a group per population named by its heading, one histogram for the population with shares, …" | |
| It is not in the table nor in the CSV (344) | in part: `sfs:63` "a population not given to popnei is not calculated and not in the CSV" | the CSV leaves it out; the table keeps its two columns with "no value", as `dui:738` "the tab of the table shows a row per count and two columns per population, no value in those of a population not calculated, …" checks: "Where a spec and the code differ", above |
| Populations that hold fewer than 2 chromosomes between them, one haploid individual: no call, the minimum and `calculated` false; its line says it holds fewer than 2 chromosomes (346) | `div:2523` "run sends it with no population for calcPopDiversity, the first pass alone, and the draw of 2"; `sw:80` "the lines in place of a histogram: …" | |
| A population that no variant counted for, or that reached the draw at none: `variantsInDraw` 0, a spectrum of zeros, no shares, a line, no histogram; its rows in the table and the CSV, zeros with empty shares (352) | `sfs:149` "a population calculated that reached the draw at no variant has a spectrum of zeros and no shares, and its rows of zeros with empty shares in the CSV", added; `sw:80` "the lines in place of a histogram: …"; `sw:119` "the columns and cells of the table, and the name of the download"; `run:3747` "a draw of 130 gives p0, whose 96 chromosomes never reach it, …", added | |
| A size of the draw above the ploidy times the minimum: on `panel.nei` at n = 96, p0 reached it at 278 of its 1,200 variants, a spectrum of whole numbers; the line of each population gives its variants in the draw, and the diversity's warning names it (356) | `run:3701` "a draw of 96 with no filter: p0, of 48 individuals, reaches it at 278 of its 1,200 variants, …", added; `sw:56` "the line under a heading, and the description of the histogram with its largest share"; `div:2717` "p0 in a draw of 96 at 277 of its 1,152 variants gives variantsNotInDraw with 24%, …" | |
| An odd size of the draw: `floor(n / 2) + 1` bins, 21 for 41; the line about the half height of the last bin left out (363) | `run:3619` "an odd draw, 41, gives spectra of 21 values, floor(41 / 2) + 1"; `sfs:134` "an odd draw gives floor(n / 2) + 1 bins, the last with its share"; `sw:104` "the axis, the line under the histograms of an even and an odd draw, and too many bars" | |
| More than 1,000 bins drawn, a draw above 2,001: no histograms, the block says why, the table and the CSV hold every bin (366) | `dui:781` "a draw of more bars than a histogram draws gives the line in their place, and the table stays"; `dui:1018` "the bar limit: a draw of 2,000 draws its 1,000 bars, and one of 2,002 does not"; `sw:104` "the axis, the line under the histograms of an even and an odd draw, and too many bars" | |
| The filters keep no variant: popnei refuses the diversity's call, the panel shows the diversity's error, and the block is not shown (370) | `div:665` "refusalText of an empty pass tells to loosen the filters"; `run:853` "filters that keep no variant are refused with popnei's counts of the pass" | the block is part of the result, which a refusal does not have |
| Every variant of a population the same allele in the draw: no shares, a line (372) | `sfs:90` "the worked example: the shares, the variants in the draw and the largest share"; `sw:80` "the lines in place of a histogram: …" | |
| One population, "All individuals": one histogram, the same words; `panel.nei` as one population, a spectrum of 21 bins over its 1,200 variants at n = 41 (374) | `run:3713` "All individuals at a draw of 41 with no filter: one spectrum of 21 values over the 1,200 variants", added; `run:3344` "All individuals, one population, gives F and the alleles, …" | |

### How it is verified

| item | test | note |
|---|---|---|
| `spectraOf` of a population not calculated: `calculated` false, `expected` empty, `shares` `null`, left out of the CSV (390) | `sfs:63` "a population not given to popnei is not calculated and not in the CSV" | |
| `spectraOf` on the worked example: the shares `[0.5, 0.5]` and 5, no shares and 3, `largestShare` 0.5 (394) | `sfs:90` "the worked example: the shares, the variants in the draw and the largest share" | |
| the same object for the same result (398) | `sfs:106` "the same object for the same result" | |
| a `foldedSfs` of 2 values for n = 4 throws the defect (399) | `sfs:111` "a spectrum of 2 values for a draw of 4 is a defect" | |
| `noSpectrumLine` of a population not calculated: the words of the minimum, and of fewer than 2 chromosomes (401) | `sw:80` "the lines in place of a histogram: …" | |
| `spectrumWarnings`: none without a MAF filter (405) | `sfs:233` "no warning without a MAF filter" | |
| none with one that kept every variant it was given (405) | `sfs:240` "no warning for a MAF filter that kept every variant it was given" | |
| the MAF filter at 0.95, 1,152 given and 1,128 kept: the text to the letter (406) | `sfs:264` "the text of the flow's MAF filter at 0.95, to the letter" | |
| `spectraCsv` on the worked example, to the letter (410) | `sfs:189` "the worked example, to the letter" | |
| The numbers of popnei at n = 40 with no filter: the shares of p0 at bins 1 and 20, of p2 at bin 1, and `largestShare` 0.05618145165329451 (411) | `sfs:325` "panel.nei at a draw of 40 with no filter" | |
| The runner: `foldedSfs` in the request's order, 21 values each, p0's first two values, and equal to a call that asks `folded_sfs` alone (416) | `run:3408` "the spectra with no filter are in the order of the job, of 21 values each, …" | |
| The flow of the diversity goes on to the block: three histograms, each titled with its population, 20 bars each, and the table of 21 rows (423) | `e2e:1372` "PA7 D2 three histograms, each headed by its population, of 20 bars, and the table of 21 rows, and axe" | in Chromium and WebKit |
| with the MAF filter at 0.95 after the missing data filter at 0.05, the warning "…it removed 24 of the 1,152 it was given. …" in the block, after its caption, and not among the warnings above the table (426) | `e2e:1435` "PA7 D2 the MAF filter at 0.95 after the missing data filter at 0.05 gives the warning of the spectrum, …" | in Chromium and WebKit |
| the heading "Site frequency spectrum" at level 3 and those of the populations at level 4 (429) | `e2e:1372` "PA7 D2 three histograms, each headed by its population, …" | in Chromium and WebKit |
| the description of p0's histogram starting "1,152 variants in the draw" (430) | in part: `e2e:1372` "PA7 D2 three histograms, each headed by its population, …" | the flow runs at the default missing data filter, 0.1, and reads each description whole from "1,200 variants in the draw"; no flow reads it at the filter at 0.05 |
| the block at 320 pixels wide, and axe (432) | `e2e:1467` "PA7 D2 at 320 px the block of the spectrum is one histogram to a row and the page does not scroll sideways, and axe" | both themes are the pictures of `npm run screens`, which the owner looked at, at stop B |

## The LD decay

`docs/specs/analyses/ldDecay.md`, "The cases" and "How it is verified": 40 items, 38 with a test that reaches all of it.

The tests are named by these short names of their files: `ld:` for `src/core/analyses/ldDecay.test.ts`; `ldp:` for `src/core/analyses/ldDecayPanel.test.ts`; `lw:` for `src/ui/analyses/ldDecay/words.test.ts`; `lpd:` for `src/ui/analyses/ldDecay/plotData.test.ts`; `lui:` for `src/ui/analyses/ldDecay/panel.test.ts`; `run:` for `src/worker/runner.test.ts`; `st:` for `src/core/store.test.ts`; `e2e:` for `e2e/ldDecay.spec.ts`.

The spec was written for stage 5 and is mapped whole.

### The cases

| item | test | note |
|---|---|---|
| The LD pruning of the Variants step on, or turned on while the plot is shown: the key the same, the plot stays, and the panel says the pruning is not applied (651) | `ld:1389` "the LD pruning turned off keeps it"; `ld:1393` "the LD pruning changed, its r², its distance or no distance, keeps it"; `e2e:928` "PA8 D3 the LD pruning of the Variants step turned on and its distance changed remove no result and send no request; …"; `lui:535` "the line of the LD pruning stands under the options while the pruning of the Variants step is on, with or without its distance, and not otherwise" | |
| The LD pruning with no distance: the diversity and the PCA locked, the LD decay runs (654) | `ld:475` "the LD pruning of the Variants step with no distance locks nothing"; `ld:482` "in the store, the LD pruning with no distance leaves the LD decay ready, where the store locks what reads the filters of the variants" | |
| A population of 1 or 2 individuals: one gives no pair, `noPairs` in the words of one individual; two give every pair an r² of 1 and no curve, `noCurve`; both `fewIndividuals` (656) | `ld:861` "PA10 one individual and no pair gives noPairs with the words of one individual, …"; `run:3811` "a population of two individuals gives every pair an r² of 1 and no curve", added; `ld:924` "pairs and no curve give noCurve"; `ld:783` "a population of 12 individuals gives fewIndividuals with its words" | |
| A population whose variants all fail its MAF: its bins empty, `numVars` 0, `noPairs` says why; the others not affected (659) | in part: `ld:843` "one variant counted and no pair gives noPairs with the words of the MAF"; `ld:1587` "noPairs: 1 variant is below 2, …" | the words, from results written as literals; no fixture has a population all of whose variants fail its MAF, so popnei's empty bins of it are not run |
| A largest distance below the spacing of the variants: no pair in any population, `noPairs` for each, the plot empty with its axes, the words to type a larger distance (662) | `run:3832` "a largest distance of 500 bp, below the 1,000 bp between the variants of ld.nei, gives no pair in any population", added; `ld:881` "PA10 three populations with no pair give three noPairs, …"; `ld:906` "1,152 variants and no pair gives noPairs with the words of the distance"; `lpd:214` "with no pair and no curve anywhere the vertical axis runs from 0 to 1" | |
| A file not sorted by position: fewer pairs, no word, until a release of popnei refuses it (665) | none | what the release of popnei does with such a file, which popnei issue #5 asks to change; the application adds nothing to test, and no unsorted fixture is committed |
| The filters keep no variant: popnei refuses, and the refusal stays under the key (668) | `ld:1115` "popnei's refusal of a pass with no variant gives the words of the filters"; `e2e:630` "PA8 D2 a distance above what the memory allows locks the panel, …"; `st:1067` "popnei's refusal is kept under its key: error refused, again after a command and its undo, and startRun returns null" | the store's case, for any analysis |
| A result after the options changed: into the cache under its own key, not shown (671) | `st:1879` "a late result: after a command, the result of the old key goes into the cache with the warnings of its request's project, and an undo shows it" | the store's case, for any analysis |
| A threshold on the individuals: a Run calculates their statistics first (673) | `st:4638` "with a threshold of 0.2, a Run of an analysis that reads the filters of individuals alone, …"; `lw:64` "without the LD pruning there is no line of it, and the ready state gives the individuals, …" | the store's case, for an analysis that reads the filters of individuals and not those of the variants, as the LD decay |
| A population named `__proto__` runs as any other (675) | `run:2924` "a population named __proto__, the %s of the job, has its name in the result and the numbers of the same individuals under another name, every array value by value" | |

### How it is verified

| item | test | note |
|---|---|---|
| `ldDecayFilters`: of missing data 0.1, MAF 0.9 and LD r² 0.3 within 10,000, the first two in their order; of an LD pruning with no distance alone, none (785) | `ld:308` "of the missing data filter at 0.1, the MAF filter at 0.9 and the LD pruning at r² 0.3 within 10,000 bp, …"; `ld:321` "of the LD pruning with no distance alone gives none" | |
| The key: for each row of its table, two projects; the LD pruning turned on keeps it (788) | `ld:1351` "a new load of the variants file, and the ploidy or onlyPassed of a VCF, change it"; `ld:1377` "the missing data, observed heterozygosity and MAF filters, …"; `ld:1389` "the LD pruning turned off keeps it"; `ld:1393` "the LD pruning changed, its r², its distance or no distance, keeps it"; `ld:1404` "a filter of individuals, a list or a threshold, changes it"; `ld:1417` "the populations change it as for the diversity: …"; `ld:1436` "the largest distance, typed or changed, and the maximum MAF change it"; `ld:1445` "the options of another analysis and the reference keep it"; `ld:1464` "the key version, 1, or the version of popnei, changes it" | |
| `needs`: each row of its table (791) | `ld:383` "gives the reason of individualsNeeds first: …"; `ld:390` "gives the three reasons of the column of the populations, before the largest distance"; `ld:413` "gives the reason of the lists of individuals leaving no individual with a population, before the largest distance"; `ld:427` "gives the reason of the largest distance not typed, with a metadata file and without"; `ld:446` "with one population, 25,000,000 bp gives null and 25,000,001 the reason of the memory, …" | |
| `maxDist` 8,333,333 with three populations `null`, and 8,333,334 the reason (791) | `ld:437` "with three populations, 8,333,333 bp gives null and 8,333,334 the reason of the memory" | |
| the LD pruning with no distance, `null` (793) | `ld:475` "the LD pruning of the Variants step with no distance locks nothing" | |
| `maxDistReason`: no distance, the words of the field; 8,333,334 with three populations, the reason of `needs`; 8,333,333, `null` (793) | `ld:1498` "gives the reason of the largest distance not typed, whatever else locks, and null once it is typed"; `ld:1506` "review of PA8: gives the reason of the memory for a distance typed above what the populations allow, …" | |
| `parseOptions`: the defaults back; `maxDist` 50 and 9,007,199,254,740,991 taken; 49, 50.5, 9,007,199,254,740,992, a field missing or one more, refused (797) | `ld:520` "gives the defaults back, an object of exactly the two fields"; `ld:527` "takes a largest distance of 50 and of 9,007,199,254,740,991"; `ld:536` "refuses a largest distance of 49"; `ld:540` "refuses a largest distance of 50.5"; `ld:546` "refuses a largest distance of 9,007,199,254,740,992"; `ld:552` "refuses a field missing"; `ld:557` "refuses a field more" | |
| `run` in the project of the flow: the job, with the missing data filter and without the LD pruning (800) | `ld:609` "sends the job of the flow, with the missing data filter and without the LD pruning the project has on" | |
| `fittedR2` at 0 with n 50, 0.46942148760330576 exactly, for the ρ of both populations (803) | `ld:657` "at 0 with n 50 gives popnei's r² at 0 exactly, for the ρ per base pair of pop_a"; `ld:661` "at 0 with n 50 gives the same for the ρ per base pair of pop_b" | |
| with n 100, 0.46198347107438015 exactly (805) | `ld:665` "at 0 with n 100 gives 0.46198347107438015 exactly" | |
| at the half distance of `pop_a`, half of the r² at 0 within 1e-12 (806) | `ld:669` "at the half distance of pop_a gives half of its r² at 0, within 1e-12" | |
| `ldDecayCurve` of a population with NaN, `null`, and otherwise 200 points from 0 to `maxDist` (808) | `ld:676` "ldDecayCurve of a population with no curve gives null"; `ld:741` "ldDecayCurve gives 200 points evenly spaced from 0 to the largest distance, and the curve at each" | |
| The warnings: a population of 12 beside one of 50, `fewIndividuals`; alone, without the last sentence (810) | `ld:783` "a population of 12 individuals gives fewIndividuals with its words"; `ld:796` "PA10 when every population of the result has fewer than 20 individuals, …" | |
| `numVars` 1 and no pair, `noPairs` in the words of the MAF (812) | `ld:843` "one variant counted and no pair gives noPairs with the words of the MAF" | |
| one individual and no pair, `noPairs` in the words of one individual (813) | `ld:861` "PA10 one individual and no pair gives noPairs with the words of one individual, …" | |
| three populations with no pair, three `noPairs` (814) | `ld:881` "PA10 three populations with no pair give three noPairs, …" | |
| pairs and NaN, `noCurve` (815) | `ld:924` "pairs and no curve give noCurve" | |
| a half distance of 1,599,810.0655818006 at `maxDist` 100,000, `halfDistBeyondPairs` (816) | `ld:937` "a half distance of 1,599,810.0655818006 bp at a largest distance of 100,000 gives halfDistBeyondPairs, …" | |
| the literals of the panel, `halfDistBelowPairs` for each population, "at 0.247 bp" for p0 (817) | `ld:971` "the half distances of panel.nei, below 1 bp, give halfDistBelowPairs for each population, …" | |
| a half distance of 3.4 bp below pairs from 8,001 bp, "at 3.40 bp" (819) | `ld:1001` "PA10 a half distance of 3.4 bp below pairs that start at 8,001 bp is written as the table writes it, …" | |
| `checkNumbers` of the result of the flow (821) | `ld:1077` "of the result of the flow gives the variants kept, then the variants, the pairs and the half distance of each population" | |
| `refusalText` of each row of "Its words" (823) | `ld:1104` "popnei's refusal for memory gives the words of the memory"; `ld:1115` "popnei's refusal of a pass with no variant gives the words of the filters"; `ld:1126` "a source that holds no variant, and any other refusal, …" | |
| `crashText` of the project of the flow (824) | `ld:1484` "names the memory, a smaller distance and fewer individuals, and the variants file to load again" | |
| `script` of the project of the flow, as a literal (825) | `ld:1142` "of the project of the flow gives the lines of the spec" | |
| `ldPlotOmittedText` of 17 populations, and of 16 `null` (827) | `ld:1201` "of 17 populations says the plot draws the first 16"; `ld:1207` "of 16 populations gives null" | |
| The runner over `ld.nei`: the numbers of the table to the last digit (833) | `run:2806` "the job of the flow over ld.nei gives the numbers of ldDecay.md to the last digit: …" | |
| the populations in the order of the job when named "10", "2" (836) | `run:2851` "populations named "10" and "2", which popnei gives back as "2", "10", are held in the order of the job" | |
| the same numbers for a population named `__proto__` (837) | `run:2924` "a population named __proto__, the %s of the job, …" | |
| The flow over `ld.nei` and `ld_pops.csv`: why the distance has to be typed, 100000 typed, Run, the table above the tabs, the plot, "7,548" and "7,340", no warning, axe in every state, the keyboard path (840) | `e2e:358` "PA8 D2 ld.nei with its two populations: …" | in Chromium and WebKit |
| The flow of 17 populations of 5 or 6: 16 rows in the legend, the line of the populations left out, 17 rows in the table, the 850 bins in a frame whose header stays in view (848) | `e2e:585` "PA8 D2 17 populations of 5 or 6 individuals: …" | in Chromium and WebKit; the line reads "…in the order of the table of the populations…", as "Its words" and `ldPlotOmittedText` have it, where this paragraph of the spec says "in the order of the table": "Where a spec and the code differ", above |

The numbers after the table, of the VCF, of the missing data filter at
0.05 and of popnei's own reference against R, are what popnei gave on
those inputs, which the spec records and asks no test of; the flow and
the runner's test run the table's.

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
| `transferablesOf` of a result of each of the seven analyses: the diversity of stage 5 with its spectra, one buffer per array (1553) | `run:1898` "of a diversity result, the fifteen buffers of its twelve arrays and three spectra, each once" | |
| the distances with the `order` of the kind `pcoa`; none twice when two fields hold one array; a view of part of a buffer throws (1554) | `run:3194` "transferablesOf of a result of the distances with orders of the kind pcoa: …"; `run:2958` "transferablesOf of a result of the LD decay: the buffer of each of its ten arrays, each once, and a view of part of a buffer throws" | the LD decay is the seventh analysis |
| The diversity of stage 5, over `panel.nei` and the populations of `panel_pops.csv` with the missing data filter at 0.05 and the default draw of 40: the table of stage 5 of `diversity.md`, F, the alleles and the private alleles of each population (1797) | `run:3285` "with the missing data filter at 0.05, F, the alleles and the private alleles of the table of stage 5, beside the three numbers of stage 2" | |
| the spectra of `sfs.md` from a second job with no filter, p0's first value 44.79323144486922, each of 21 values (1801) | `run:3408` "the spectra with no filter are in the order of the job, of 21 values each, p0's first 44.79323144486922, and equal to those of a call that asks folded_sfs alone" | |
| equal to the last digit to those of a call that asks `folded_sfs` alone (1804) | `run:3408` "the spectra with no filter are in the order of the job, …" | the test makes that call of popnei itself |
| the progress of the two calls, passes 1 and 2 of 2 (1805) | `run:3438` "told is given the calls of the two passes as passes 1 and 2 of 2" | |
| and of a job whose `popDiversityPops` is empty, one pass of 1 (1806) | `run:3452` "with popDiversityPops empty there is one pass, told as pass 1 of 1, calcPopDiversity is not called, and its numbers are NaN" | |
| a job with one population in `popDiversityPops`, with no private alleles asked, NaN in their three arrays and `numVarsEveryPop` `null` (1807) | `run:3480` "one population of a column given to calcPopDiversity has no private alleles asked: NaN in their three arrays and numVarsEveryPop null"; `run:3344` "All individuals, one population, gives F and the alleles, and no private alleles, which are not asked for" | |
| populations named `10`, `9` and `p`, in that order, whose spectra come back in the order of the job (1809) | `run:3506` "populations named 10, 9 and p come back with their numbers and spectra in the order of the job, not in popnei's 9, 10, p" | |
| The distances between populations: the Fst, the D and the variants of each pair of `popDists.md` at the missing data filter at 0.1 and at 0.05, the order p2, p0, p1 of both measures (1812) | `run:3048` "the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, the D and the variants of each pair of popDists.md to the last digit, and the order p2, p0, p1 of both measures"; `run:3075` "at the missing data filter at 0.05, which keeps 1,152 variants, the pairs of popDists.md and the order p2, p0, p1 of both measures" | |
| and the check numbers there (1815) | `run:3048` "the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, …"; `pf:3511` "v1-stage5-options.popnei.json opens into its project, …" | the check numbers are the variants kept and the Fst and the D of each pair: the runner's test gives the seven, and the project file of stage 5 holds the same seven as a literal |
| the populations named "3", "1" and "2" for p0, p2 and p1, given back by popnei as "1", "2", "3", held as "3", "1", "2" pair by pair (1816) | `run:3092` "p0, p2 and p1 named "3", "1" and "2", which popnei gives back as "1", "2", "3", …"; `ord:274` "the counts of variants of each pair follow popnei's order of the names 3, 1 and 2, and are put back in the job's" | |
| the fixture `panel_split.csv`, whose negative pair gives the order p0b, p0a, p2, p1 for both measures (1818) | `run:3126` "panel_split.csv gives the negative pair of p0a and p0b of popDists.md and the order p0b, p0a, p2, p1 of both measures" | |
| The LD decay, over `e2e/fixtures/ld.nei` and `ld_pops.csv` with the missing data filter at 0.1, `maxDist` 100,000: 432 variants and 29,367 pairs in each population, the half distances 7548.08187836982 and 7339.709512618931, and the first and last bins (1822) | `run:2806` "the job of the flow over ld.nei gives the numbers of ldDecay.md to the last digit: …" | |
| populations named "10" and "2", held in the order of the job (1827) | `run:2851` "populations named "10" and "2", which popnei gives back as "2", "10", are held in the order of the job" | |
| and a population named `__proto__`, the first of the job, the second, and the only one, with its name in `pops` and the numbers of the population of the same individuals named `pop_a` or `pop_b`, every array equal value by value (1828) | `run:2924` "a population named __proto__, the %s of the job, has its name in the result and the numbers of the same individuals under another name, every array value by value" | run for the first, the second and the only population of the job |

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
| The restart after an LD decay: a `result` of an `ldDecay` job of 2 individuals, with a run k6 waiting: the outcome is `done` before the worker is ended, then a new worker, the `open` of A, then k6 (829) | `cl:3039` "a result of an LD decay of 2 individuals, a run waiting: the LD decay is done, the worker ended, and a new one opens A again, then runs k6"; `cl:3112` "the outcome of an LD decay after %s is given before the restart: …" | the second shows the outcome comes first: when no new worker can be made, the LD decay is still done |
| a `refused` of such a job restarts it too (832) | `cl:3055` "an LD decay that popnei refused fails with its message, and the worker is started again" | |
| and so does a `crashed` that starts "popnei_web defect: " (832) | `cl:3069` "an LD decay ended by a crashed that starts "popnei_web defect: " fails as a defect, and the worker is started again" | |
| and a `reopenFailed` does not (833) | `cl:3083` "an LD decay that ends reopenFailed fails with it, and the worker is not ended" | |
| a result of a diversity ends no worker (834) | `cl:3102` "a result of a diversity ends no worker, and k6 is sent to it"; `cl:1849` "the worker is ended after a write larger than WRITE_RESTART_BYTES or refused, and after an LD decay done or refused, and not after a smaller write, a diversity or a reopenFailed" | the second is a property, checked over sequences of requests drawn at random |
| A `ready` of protocol 3, another than `PROTOCOL_VERSION`, which is 4 from stage 5: every request fails with `protocolMismatch`, and no other worker is made (856) | `cl:1065` "a ready of protocol 3, stage 4's, fails every request with protocolMismatch, and no other worker is made"; `cl:2062` "a ready of protocol 3, stage 4's, fails every read with protocolMismatch, and no other light worker is made"; `cl:2559` "a ready of protocol 3, stage 4's, of the worker started again after a large write fails every request with protocolMismatch, and no other worker is made" | |

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
| The ticks of a horizontal axis with `xWholeNumbers` for a domain of 0.5 to 2.5 are the whole numbers 1 and 2 alone, where d3's ticks without it are 0.5, 1, 1.5, 2 and 2.5 (614) | `p2d:909` "the whole ticks of a horizontal axis from 0.5 to 2.5 are 1 and 2 alone, where d3 gives the halves too"; `p2d:985` "xWholeNumbers gives the horizontal axis from 0.5 to 2.5 the ticks 1 and 2, and the vertical axis keeps ticks that are not whole" | the first without a DOM, the second on the SVG, with the five ticks of the same plot without the option |
| while the vertical axis of the same plot, from 0 to 0.06, keeps ticks that are not whole (617) | `p2d:985` "xWholeNumbers gives the horizontal axis from 0.5 to 2.5 the ticks 1 and 2, …" | |
| An axis of a band scale of the names p2, p0, p1 draws three labels in that order and no tick line (668) | `p2d:1019` "an axis of a band scale of p2, p0, p1 draws the three names in that order, each in the middle of its band, and no tick line" | |
| with `xLabelAngle` −45 each label of the horizontal axis has the rotation −45 and the anchor `end` (670) | `p2d:1044` "with xLabelAngle -45 each name of the horizontal axis is turned by -45 and anchored at its end, and those of the vertical axis are not turned"; `plots:1662` "PA4 D3 in DejaVu Sans, names of up to 26 characters under the columns and left of the rows, and the legend, lie inside the SVG, each slanted name ending under its column" | the flow lays the slanted names out in a browser, which jsdom cannot |
| a name `<b>P1</b>` is text (670) | `p2d:1070` "a name <b>P1</b> is text on both axes and no b element is made" | |
| an empty `xLabel` leaves no text element of the label (671) | `p2d:1091` "an empty xLabel or yLabel leaves no text element of that label, and a label given later is written under the overlay"; `hm:359` "the names on the vertical axis read p2, p0, p1 from the top, those under the columns slanted at −45°, and no label of the axes is written" | |

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
| The shares of p0 at n = 40, as a `Float64Array` over the edges 0.5 to 20.5, with `yMax` 0.061, give a vertical domain of 0 to 0.065, made round from it, where p0's largest share, 0.05590275165567829, would give 0 to 0.06 (468) | `hist:644` "the shares of p0 with yMax 0.061 give a vertical domain of 0 to 0.065, and without it 0 to 0.06" | |
| the largest share of the three populations, 0.05618145165329451, gives 0 to 0.06 as well, so it cannot tell the two apart (472) | `hist:644` "the shares of p0 with yMax 0.061 give a vertical domain of 0 to 0.065, …" | the test asserts 0 to 0.06 for a `yMax` of that share |
| ticks that are not whole on it (476) | `hist:693` "the shares of p0 with yMax 0.061 have vertical ticks that are not whole, 0.00 to 0.06, and bars that reach 0.0559 of 0.065" | |
| `xWholeNumbers` over the edges 0.5 to 2.5, two bins, the ticks 1 and 2 alone, where d3 would give fractions (477) | `hist:716` "xWholeNumbers over the edges 0.5 to 2.5, two bins, gives the horizontal ticks 1 and 2 alone, and without it d3 gives fractions"; `hist:729` "the spectrum of p0 with xWholeNumbers has whole ticks under the centres of its bars" | |
| a count of −0.1 or NaN throws (478) | `hist:778` "a share of -0.1 is refused"; `hist:785` "a share of NaN or of an infinity is refused" | |
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
| Two names: a grid of two by two, one pair drawn twice, the bar from 0 to its value (338) | `hm:604` "two names: a grid of two by two, the one pair drawn in its two cells, and the bar from 0 to its value", added | failed with the check of the plot made to refuse fewer than three names |
| Every value NaN, Jost's D at ploidy 1: every cell crossed, no bar but the name of the value and "no value" (340) | `hm:444` "every value NaN: every cell crossed, no bar, and the legend the name of the value and "no value"" | |
| No value above 0: every finite cell the colour of 0, the bar one band; `viridisStep` is not called (342) | `hm:379` "a matrix whose values are all 0 or below: one path, of step 0, its values in white, and a bar of one band"; `hm:214` "the Fst of panel.nei are at the steps 239, 245 and 255; a negative value and a matrix with no value above 0 at step 0" | `viridisStep` gives step 128 for two equal ends, so a call of it would fail the step 0 of both tests |
| A negative value: the colour of 0, and its number with the minus sign in the cell and the tooltip (344) | `hm:461` "a negative value is of step 0 and writes "−0.0113" in white"; `hm:754` "a negative value is written with the minus sign in the tooltip, "Hudson's Fst −0.0113"", added | the added test failed with the tooltip given the number of `toFixed`, with a hyphen, which no other test caught |
| An `update` to the other measure, or another order: the paths are joined by their steps and the texts by their row and column, in the same SVG; the tooltip is hidden (346) | `hm:575` "an update to the other measure joins the paths by their steps and the texts by their row and column in the same SVG"; `hm:619` "an update to another order of the same names, p0, p2, p1 for p2, p0, p1: …", added; `hm:773` "Escape hides the tooltip and it stays hidden on that cell; another cell shows its own; an update hides it" | the added test failed with the texts joined by their place in the list and not by the names of their pair, which no other test caught |
| A band below 12 pixels: no names on the axes; below `CELL_TEXT_MIN`, no values in the cells (349) | `hm:499` "a band below 12 pixels writes no name on either axis; at 12 the names are written"; `hm:478` "a band of 55 pixels writes no value, and one of 56 writes them" | |
| A name with markup in it, `<b>P1</b>`: written as text on the axis and in the tooltip; no `b` element is made (354) | `hm:555` "a name with markup is written as text on the axes and in the tooltip, and no b element is made" | |
| `destroy`, a size of 0, a frame with no area, data the plot refuses and a change of theme are the base's cases; `destroy` also removes the tooltip (356) | `hm:840` "destroy removes the tooltip with the SVG, and a second destroy throws nothing"; `hm:658` "two names alike throw"; `p2d:279` "an element not larger than the margins gets an SVG of 0 by 0, and toSVG says the frame has no area"; `p2d:689` "a frame with no area gives the overlay a size of 0 and calls leave with null"; `plots:667` "VS4 D3 a plot whose element becomes 0 by 0 after a draw keeps its last drawing, which toSVG and toPNG export"; `plots:1537` "PA4 D3 toSVG of the heatmap of panel.nei, from a dark page, …" | the cases of the base are tested on the base, with a small plot written for its tests and with the histogram, as in the map of stage 4; on the heatmap itself, its `destroy`, its refusal, which adds nothing to the element, and its file in the light theme from a dark page |
| Without a DOM: `heatmapNumber` of 0.10273588423661377 is "0.1027" and of −0.011276258310056011 "−0.0113" (370) | `hm:207` "heatmapNumber writes four decimals with the minus sign U+2212, and a value that rounds to 0 with no sign" | |
| the step of a value and the class of its text, black at 111 and white at 110 (372) | `hm:214` "the Fst of panel.nei are at the steps 239, 245 and 255; …"; `hm:223` "the text of a cell is black from step 111 and white up to step 110" | |
| Under jsdom: the matrix of Fst of `panel.nei` in the order p2, p0, p1, in an element of 640 by 640 pixels, gives three paths of cells, of the steps 239, 245 and 255, each with the colour of `viridisColour` of its step and two cells, and the six values written, "0.1027" in the cells of p2 and p0 (376) | `hm:286` "the Fst of panel.nei in 640 by 640: three paths of the steps 239, 245 and 255 in their colours, two cells each, and the six values in black" | |
| a matrix whose values are all 0 or below gives one path, of step 0, and a bar of one band (380) | `hm:379` "a matrix whose values are all 0 or below: one path, of step 0, its values in white, and a bar of one band" | |
| the names on the vertical axis read p2, p0, p1 from the top (381) | `hm:359` "the names on the vertical axis read p2, p0, p1 from the top, …" | |
| the diagonal has no cell (382) | `hm:319` "the diagonal has no cell: no path starts a cell at the corner of p2 and p2, p0 and p0, or p1 and p1" | |
| A matrix with a NaN pair gives the path `chart-cell-none` with its two cells crossed (392) | `hm:417` "a pair with no value: the path chart-cell-none with its two cells, each crossed from corner to corner, and no value written in them" | |
| a negative value is of step 0 and writes "−0.0113" (393) | `hm:461` "a negative value is of step 0 and writes "−0.0113" in white" | |
| a band of 55 pixels writes no value (394) | `hm:478` "a band of 55 pixels writes no value, and one of 56 writes them" | |
| two names alike, a matrix not symmetric, one name or 201, throw (395) | `hm:658` "two names alike throw"; `hm:666` "a matrix that is not symmetric throws, and one with NaN in both cells of a pair does not"; `hm:682` "one name throws, and so do 201; 200 are drawn"; `hm:698` "values that are not the square of the number of names throw" | |
| A move of the pointer to the middle of the cell of p2 and p1 shows the tooltip "p2 and p1" and "Hudson's Fst 0.1096"; to the diagonal or to a gap, none (396) | `hm:710` "the middle of the cell of p2 and p1 shows the tooltip "p2 and p1" and "Hudson's Fst 0.1096" and outlines the cell; the diagonal and a gap show none" | |
| In Playwright, on the page of the plots of the tests: the heatmap of the same matrix drawn, its SVG of `toSVG` with the colours of viridis and the colour of the text written on each element, and no `var(` (401) | `plots:1537` "PA4 D3 toSVG of the heatmap of panel.nei, from a dark page, has on each cell and band its colour of viridis, on each value its black or white, no var(, no overlay and no mark of the hover" | |
| a hover shows the tooltip, and Escape hides it (403) | `plots:1608` "PA4 D3 the pointer on the cell of p2 and p1 outlines it and shows its tooltip beside its middle, Escape hides it, and axe finds nothing" | |
| axe finds nothing on the page (404) | `plots:1608` "PA4 D3 the pointer on the cell of p2 and p1 outlines it …" | axe is run with the tooltip shown and with it hidden |

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
| A series with no point and no line, a population with no pair and no curve: it has its row in the legend, with the words the screen gives it, "pop_c · no pair", and nothing in the frame (282) | `ln:483` "a series with no point and no line keeps its row in the legend and draws nothing in the frame; every series empty leaves the axes and the legend" | |
| Every series empty: the axes and the legend, and an empty frame (285) | `ln:483` "a series with no point and no line keeps its row in the legend and draws nothing in the frame; …" | |
| A mark with a NaN is not drawn, as a point is not (286) | `ln:550` "a mark beyond the horizontal range, or with a NaN, draws no line and no mark, and a point outside the ranges is not drawn" | |
| More series than the legend has room for in the frame: the rows run below the frame's bottom, one every 18 pixels; so the screen gives no more series than its frame holds rows (287) | in part: `ln:320` "the legend has a row per series in their order, its label as text, its mark, and its piece of line on a casing for a light colour"; `ln:692` "50 series are refused and 49 drawn" | the tests reach the plot's part, a row every 18 pixels and as many rows as series, 49 of them; no test asserts that the rows past the frame are cut. That the LD decay draws at most 16 populations, and its words for those left out, are the screen's, and are mapped with `docs/specs/analyses/ldDecay.md`, above, in the flow of 17 populations; how the legend holds more is left by the spec for the running application, so nothing is asked of the owner here |
| A label with markup, `<b>p1</b>`: written as text (308) | `ln:320` "the legend has a row per series in their order, its label as text, …" | |
| A change of theme: nothing is drawn again; the file is in the light theme (309) | `plots:577` "VS4 D3 a change of theme while the plot is on the screen draws nothing again, and a later toSVG is light"; `plots:1961` "PA4 D5 toSVG of the LD decay of ld.nei, from a dark page, is in the light theme: …" | that nothing is drawn again is the base's, tested on the histogram; the file of the line plot is checked from a dark page |
| Under jsdom: the skeleton with `chart chart-line` and no `chart-overlay` (326) | `ln:150` "the skeleton has the classes chart chart-line, its title and description, and no overlay" | |
| two series of groups 0 and 1, of three points, a line of four positions and one mark each: two `path.chart-line` and two `path.chart-line-casing`, and none more when a third series of group 2, green, is added (327) | `ln:161` "two series of groups 0 and 1 draw two lines on two casings, orange and sky blue being light; a third of group 2, green, adds a line and no casing" | |
| two `path.chart-points` with the classes `chart-colour-0` and `chart-colour-1`; a series of group 9 has `chart-colour-2` and the shape of index 3 (331) | `ln:190` "the points of each series are one path in the colour of its group, circles for group 0, and a series of group 9 has chart-colour-2 and the shape of index 3" | |
| two `line.chart-mark-line`, from the bottom of the frame to the y of the mark, each over a `line.chart-mark-casing` of the same ends, and none for the mark of a third series of group 2 (333) | `ln:222` "each mark is a dashed line from the bottom of the frame up to its y in the colour of its series, on a casing of the same ends for a light colour, …" | |
| two legend rows with the labels as text (336) | `ln:320` "the legend has a row per series in their order, its label as text, …" | |
| the order in `chart-marks`: every line before every set of points (346) | `ln:469` "in the marks every line comes before every set of points, after an update that adds a series too" | |
| a NaN in `points.y` leaves that point out of the path (347) | `ln:506` "a NaN in points.y leaves that point out of the path" | |
| a NaN in `line.y` breaks the path into two parts, two `M` commands (348) | `ln:536` "a NaN in line.y breaks the line into two parts, two M commands" | |
| a mark at an x beyond `xDomain` draws no line and no mark (349) | `ln:550` "a mark beyond the horizontal range, or with a NaN, draws no line and no mark, …" | |
| `check` throws for a domain `[1, 1]` or `[0, NaN]` (350) | `ln:628` "a domain [1, 1] or [0, NaN], across or up, is refused, by createLine and by update" | |
| for arrays of different lengths (350) | `ln:651` "points or a line whose two arrays differ in length are refused" | |
| for 50 series (351) | `ln:692` "50 series are refused and 49 drawn" | |
| and for 50,001 points and positions (351) | `ln:704` "50,001 points and positions of lines together are refused, and 50,000 drawn" | |
| the ticks of a horizontal axis from 0 to 100,000 with `xWholeNumbers` read "0", "20,000", …, "100,000" at 600 pixels (352) | `ln:572` "the ticks of a horizontal axis from 0 to 100,000 with xWholeNumbers read 0, 20,000, … 100,000 at 600 pixels" | |
| In Playwright, the plot of the LD decay of `ld.nei` with its numbers as literals: the SVG of `toSVG` in the light theme when the page is dark, the line of `chart-line-colour-0` with the stroke `rgb(230, 159, 0)` and a casing, and the legend in the file (358) | `plots:1961` "PA4 D5 toSVG of the LD decay of ld.nei, from a dark page, is in the light theme: …" | |
| `toPNG(2)` of the plot (362) | `plots:2089` "PA4 D5 toPNG(2) of the LD decay in 600 by 375 pixels is a PNG of 1,200 by 750 pixels, orange on the piece of line of the first row of its legend" | |
| A test of the tokens checks the four colours without a casing at 3:1 or more on the background of each theme (366) | `plots:2139` "PA4 D5 the lines of the four colours without a casing, green, blue, vermilion and reddish purple, are 3:1 or more on the background of the light and the dark theme" | |

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

## The shell

`docs/specs/shell.md`, "How it is checked", the items of stage 5: 3 items, 3 with a test that reaches all of it.

The tests are named by these short names of their files: `pca:` for `e2e/pca.spec.ts`; `pde:` for `e2e/popDists.spec.ts`; `lde:` for `e2e/ldDecay.spec.ts`; `ti:` for `src/ui/analyses/titles.test.ts`; `pdc:` for `src/ui/analyses/popDists/commands.test.ts`; `pdui:` for `src/ui/analyses/popDists/panel.test.ts`.

The spec has no section "The cases"; its section of the checks is "How
it is checked". The revision of 30 September 2026 for stage 5 changed
one item of it, the links to the analyses, which now name the two new
panels.

| item | test | note |
|---|---|---|
| The list "Analyses of this step" with "Principal components", "Diversity", "Distances between populations" and "LD decay", in the order of the panels (1077) | `pca:775` "stop C 3 one link per analysis in the order of the panels; …"; `pde:426` "PA5 D2 the links of the Analyses step name the distances between populations, …" | in Chromium and WebKit |
| each link, pressed with the mouse and with Enter, puts the focus on the `<h2>` of its panel and leaves the step and the address as they were (1080) | `pca:775` "stop C 3 one link per analysis in the order of the panels; …"; `pde:426` "PA5 D2 the links of the Analyses step name the distances between populations, …"; `lde:1036` "the link LD decay of the Analyses step, pressed with Enter, puts the focus on the heading of its panel, with the step and the address kept", added | in Chromium and WebKit; the flow of stop C 3 presses every link with the mouse, and Enter on the principal components and the diversity, that of the distances Enter on its own, and the added flow Enter on the LD decay. The added flow is written and not yet run: the browser check runs it |
| at 320 pixels wide the list fits with no sideways scroll (1082) | `pca:775` "stop C 3 one link per analysis in the order of the panels; …" | in Chromium and WebKit |

The revision also changed sections that are not of the checks: the
titles of the two panels in the notice and the status region, the first
a plural, "Distances between populations were not run", the second a
singular, "LD decay was not run"; and the announcement of the distance
the heatmap draws. They are checked by
`ti:85` "the title is Distances between populations, which names several things, in the Analyses step",
`ti:91` "the status region says the distances are calculating, and, after the statistics they waited for, that they were not run, with the plural verb",
`ti:148` "the title is LD decay, which names one thing, in the Analyses step",
`ti:154` "the status region says the LD decay is calculating, and, after the statistics it waited for, that it was not run, with the singular verb",
`pdc:82` "done with 200 populations or fewer, the heatmap of the measure"
and
`pdui:259` "the measure chosen with an arrow key is one command, announced as the heatmap drawn, with the minimum kept, and the focus stays on the radio buttons".

## Left without a test

Each is in the table of its spec above, where its row says what a test reaches of it.

| spec | item | reason |
|---|---|---|
| the site frequency spectrum | It is not in the table nor in the CSV (344) | the CSV leaves it out; the table keeps its two columns with "no value", as `dui:738` "the tab of the table shows a row per count and two columns per population, no value in those of a population not calculated, …" checks: "Where a spec and the code differ", above |
| the site frequency spectrum | the description of p0's histogram starting "1,152 variants in the draw" (430) | the flow runs at the default missing data filter, 0.1, and reads each description whole from "1,200 variants in the draw"; no flow reads it at the filter at 0.05 |
| the LD decay | A population whose variants all fail its MAF: its bins empty, `numVars` 0, `noPairs` says why; the others not affected (659) | the words, from results written as literals; no fixture has a population all of whose variants fail its MAF, so popnei's empty bins of it are not run |
| the LD decay | A file not sorted by position: fewer pairs, no word, until a release of popnei refuses it (665) | what the release of popnei does with such a file, which popnei issue #5 asks to change; the application adds nothing to test, and no unsorted fixture is committed |
| the line plot | More series than the legend has room for in the frame: the rows run below the frame's bottom, one every 18 pixels; so the screen gives no more series than its frame holds rows (287) | the tests reach the plot's part, a row every 18 pixels and as many rows as series, 49 of them; no test asserts that the rows past the frame are cut. That the LD decay draws at most 16 populations, and its words for those left out, are the screen's, and are mapped with `docs/specs/analyses/ldDecay.md`, above, in the flow of 17 populations; how the legend holds more is left by the spec for the running application, so nothing is asked of the owner here |
