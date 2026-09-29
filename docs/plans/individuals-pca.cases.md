# The map of the cases of stage 4

Deliverable 3 of work package 10 of `docs/plans/individuals-pca.md`:
every item of "The cases" and of "How it is verified", or "How it is
checked", of the specs of stage 4, with the test that reaches it. A test
reaches an item when it gives the input the item names and checks the
outcome the item gives; each was read for that, not matched by its name.
Made on 29 September 2026, on the branch `plan/individuals-pca`, in
three parts, each by a session of its own: core and the analyses at
commit c6bfc01, the workers at cfe1300 and e8122ac, and the screens and
the plots at 5328bbf. They are joined here, at the commit that adds this
file.

Each item is named in the spec's words, shortened, with the line of the
spec where it starts, at the commit of its part; the corrections of the
specs listed below moved a few of those lines by up to eight. A test is
named by a short name of its file, the line where the test starts, the
line of its `test(` or `test.each(`, and the start of its title as it
stands in the source. Each section names its short names before its
table. The lines are those of this commit: the parts were written at
four commits, and the tests added after them moved some lines, so every
line cited was worked out again from the title of its test, at the commit
of its part and then at this one. Of the 2,438 lines of tests the parts
cite, 182 had moved and are given here as they are now; three cited by
their titles alone are given their lines; and 11 more pointed inside a
test, or at a test beside the one meant, and were set by hand to the
test meant. A line of a file that is not a test is written as
"line 549 of `src/charts/scatter.ts`".

The tests of Vitest, which run in node, are under `src/`; the flows of
Playwright, which drive a browser through the built site, are under
`e2e/`. A test marked "added" was written for this map: each was seen to
fail with the code it guards broken on purpose, on a scratch copy, and
to pass once the code was put back. The flows run in Chromium and WebKit
here, since Playwright 1.63.0 cannot start Firefox on this Mac; Firefox
runs them on GitHub once `main` is pushed. The tests of
`e2e/measure.spec.ts` are measurements, run by hand for the report of the
plan and by no other command, and `e2e/screens.spec.ts` writes pictures
for a person to look at and asserts nothing about them.

An item counts as reached when a test reaches all of it. The 37 that are
not are in "Left without a test", near the end, each with its reason;
the points where a spec and the code disagree, for the owner to decide,
are in "Specs that differ from the code", at the end. `analyses/pca.md`
has two rows: its module is mapped with core, its panel and its flow
with the screens.

| spec | items | reached |
|---|---|---|
| the project, `docs/specs/core/project.md` | 31 | 31 |
| the project file, `docs/specs/core/projectFile.md` | 23 | 23 |
| the store, `docs/specs/core/store.md` | 34 | 34 |
| the keys, `docs/specs/core/keys.md` | 11 | 11 |
| the cache, `docs/specs/core/cache.md` | 7 | 7 |
| the individuals kept, `docs/specs/core/individualsKept.md` | 8 | 8 |
| the diversity, `docs/specs/analyses/diversity.md` | 32 | 32 |
| the statistics of each individual, `docs/specs/analyses/individualChecks.md` | 13 | 13 |
| the histograms of the variants, `docs/specs/analyses/variantChecks.md` | 14 | 14 |
| the counts of the filters, `docs/specs/analyses/filterCounts.md` | 14 | 13 |
| the written file, `docs/specs/analyses/writeVariants.md` | 18 | 18 |
| the module of the PCA, `docs/specs/analyses/pca.md` | 49 | 48 |
| the protocol, `docs/specs/worker/protocol.md` | 10 | 9 |
| the messages, `docs/specs/worker/messages.md` | 14 | 14 |
| the runner, `docs/specs/worker/runner.md` | 45 | 45 |
| the client, `docs/specs/worker/client.md` | 25 | 25 |
| the reader of the metadata file, `docs/specs/worker/individuals.md` | 97 | 94 |
| the Individuals step, `docs/specs/steps/individuals.md` | 74 | 70 |
| the Variants step, `docs/specs/steps/variants.md` | 55 | 53 |
| the shell, `docs/specs/shell.md` | 60 | 60 |
| the entry, `docs/specs/entry.md` | 76 | 75 |
| the site and its probe, `docs/specs/site.md` | 45 | 36 |
| the base of the 2D plots, `docs/specs/charts/plot2d.md` | 26 | 26 |
| the scatter plot, `docs/specs/charts/scatter.md` | 70 | 67 |
| the 3D view, `docs/specs/charts/pca3d.md` | 56 | 50 |
| the panel of the PCA and its flow, `docs/specs/analyses/pca.md` | 108 | 102 |
| all | 1,015 | 978 |

The map added 53 tests of Vitest and 55 flows of Playwright, in commits
534d705, cfe1300, c6bfc01, e8122ac and 5328bbf, and assertions to tests
that were there; a flow run for each of several inputs counts once. Two
defects of the code were found. A comma typed first in an emptied number
field was kept, in Chromium and WebKit, and turned the field to
Arabic-Indic digits; commit f6ff2d5 fixes it, with two flows, under the
Variants step below. And the scatter wrote ticks "−Infinity" and
"Infinity" beside the finite ones on an axis that ran past the largest
number; commits dcb4a5f and faa0995 leave them out, with a test of
Vitest. Stale facts of twelve specs, where the code was right, are
corrected by commit fb783ac; commit 589787f adds the picture of the 2D
plot with a group highlighted that `charts/scatter.md` asks for, and
commit 5771037 gives the two tests of the probe that shared a title a
title each. One added flow, at line 385 of `e2e/onePopulation.spec.ts`,
failed 3 times in 20 in WebKit, when an Undo was said in the status
region with the end of the run before it; since commit 8e38f1f it waits
for that end first, and passes 20 times in each engine.

## Core and the analyses

The modules of core, the analyses of stages 2 and 3, and the module of
the PCA with the functions of core its panel reads. Mapped at commit
c6bfc01, which adds the tests marked "added", and at e8122ac, which adds
the runner's tests of four of their items.

### The project

`docs/specs/core/project.md`, "The cases" and "How it is verified": 31
items, 31 with a test that reaches all of it.

The tests are named by these short names of their files: `prj:` for
`src/core/project.test.ts`; `pf:` for `src/core/projectFile.test.ts`;
`st:` for `src/core/store.test.ts`; `one:` for
`e2e/onePopulation.spec.ts`; `div:` for
`src/core/analyses/diversity.test.ts`; `keys:` for
`src/core/keys.test.ts`; and `variantSwitches:` for
`e2e/variantSwitches.spec.ts`.

The opening paragraph of "How it is verified", that every test gives a
project frozen deeply, names no case and is not counted, as in the map
of stage 3.

| item | test | note |
|---|---|---|
| An empty project: "Load a variants file in the Variants step." (1658) | `prj:1498` "an empty project: load a variants file" | |
| Two picks of files before the first read comes back: the first read changes nothing (1660) | `prj:1266` "two picks of files before the first read comes back: the first read changes nothing" | |
| A worker that could not start, or crashed: the read failed, every analysis locked with its reason, a read after the restart replaces it (1663) | `prj:1286` "a worker that could not start: the read is recorded as failed …"; `prj:1302` "a read after a failure of the worker"; `prj:1546` "a worker that could not start: the reason says so, not that the file is being read"; `prj:6149` "say to save the project, reload the page, open the project and give the file again …" | |
| An opened project file: `variants` null and the reference, a pending read valid, the variants file written pending, the individuals file with its table or `notGiven`, so no pending read of the individuals file (1668) | `prj:2611` "an opened project file with a read pending is accepted"; `pf:228` "a variants file loaded and pending, of the reference's identity …"; `pf:334` "a variants file whose read failed is written with its read pending"; `pf:391` "an individuals file pending, failed or notGiven is written as notGiven …"; `pf:3200` "a read of the individuals file pending or failed is refused as header, with its text, and one notGiven opens" | |
| An opened project whose individuals file was `notGiven`: the two reasons whatever the grouping; `populationsOf`, `populationsNeeds`, `individualsCheck` `null`; a new load pending with its `typesSet`, the column found by its name; `removeIndividuals` runs on one population (1676) | `prj:5985` "individualsNeeds and individualsStepNeeds give their words, whatever the grouping, %o"; `prj:6016` "populationsOf, populationsToRun, populationsNeeds, individualsCheck and typesLost give what they give for a file not read"; `prj:6059` "loadIndividuals after it gives a pending read with its typesSet, and the grouping finds its column"; `prj:6080` "removeIndividuals removes it, and the analyses per population run on one population"; `pf:3060` "v1-metadata-not-read.popnei.json, pops.csv notGiven, opens into its project …" | |
| An opened project with a threshold on the individuals waits for the statistics of the new load (1684) | `st:3654` "with a threshold of 0.2, the Run calculates the statistics first, waits for them …" | as in stage 3: the project is given by `store.open`, not read from a project file |
| No metadata file: `individualsNeeds` and `populationsNeeds` `null`, `populationsOf` `"all"`, `populationsToRun` the 200 of `panel.nei`; the grouping `column: null` of an empty project not looked at (1687) | `prj:4852` "without a metadata file, whatever the grouping, the one population of every individual of the variants file"; `prj:5079` "individualsNeeds with no metadata file is null in population genetics, whatever the grouping"; `one:210` "IP5 D3 panel.nei with no metadata file runs the diversity on All individuals: 200 …" | the Vitest tests draw `i1` to `i4`; the 200 of `panel.nei` are in the flow |
| A column chosen, then the file removed: one population, the column kept; loaded again, found by its name, the populations back, with their results while the cache holds them (1692) | `prj:5115` "a column chosen, then the file removed: one population, the column kept, and found again by its name when the file is loaded again"; `div:942` "the same table from another file, or with other options of the CSV, leaves the key the same" | the populations back are those of before, and the same table from a new load gives the diversity the same key, so the cache gives its result |
| The one population chosen, with a file that lacks individuals of the variants: locked by `individualsNeeds`; removing the file runs it (1696) | `prj:5100` "the one population chosen, with a file that lacks individuals of the variants, is locked by individualsNeeds, and runs once the file is removed" | |
| A type set for a column a new read no longer has: in `typesSet`, in `typesLost`, applied again by a later read that has it; the wrong separator then the right one; `forgetTypesLost` (1701) | `prj:5714` "a type set on a column the new table does not have is not applied, and is gone"; `prj:5774` "a file read as one column applies no type set, and the same file read with the right separator applies them all"; `prj:5826` "forgetTypesLost keeps in typesSet the pairs applied alone …" | |
| A column with a type set that a new file has first: the identifier, the type in `typesSet` and `typesLost`, `"firstColumn"`; a file that puts it back among the others applies it again (1706) | `prj:5723` "a type set on status, which the new table has first, is not applied …"; `prj:5739` "a type set on status, first in one read, is applied again by a read of a file that puts it back among the others" | `prj:5739` added |
| A project of association with no traits file: "Load a traits file in the Individuals step." (1711) | `prj:5088` "individualsNeeds with no traits file gives its reason in association"; `prj:3779` "the reasons of the association application name \"a traits file\"" | |
| The LD filter turned on, then its distance typed: the reason with or without a variants file, the r² changed while the distance is `null`, `null` once typed; an undo the lock back, a second the filter off; a project file saved in between opens with the lock (1713) | `prj:4123` "variantFilterNeeds gives its reason with no variants file"; `prj:4132` "… with a variants file read"; `prj:4207` "the LD filter turned on, its r² changed, then its distance typed: two commands, the reason until the second"; `st:6006` "a result done before the filter was turned on … undos give back the lock, then the result"; `pf:2613` "${FILE} opens into its project, the LD filter with no distance and its lock", of `v1-ld-no-distance.popnei.json` | |
| The LD filter turned off and on again: in `filtersOff` with its values, the keys of the project without it, and those of before once on again, results from the cache; turned off with no distance, kept with `null`, locks nothing, locks again on; the same for every switch, a threshold of the individuals among them (1721) | `st:6052` "a filter turned off and on again: the LD filter at r² 0.2 within 50000 …"; `keys:1128` "any filters turned off keep the key … a filter turned off gives the keys of the project without it"; `prj:4433` "the LD filter turned off before its distance was typed is kept with no distance, locks nothing, and turned on again locks again"; `prj:4350` "the worked case of the individuals: the threshold of observed heterozygosity at 0.38 turned off is kept …"; `variantSwitches:367` "IP3 D3 the LD pruning at 50000 turned off and on again …"; `variantSwitches:426` "IP3 D3 the threshold of the individuals by observed heterozygosity at 0.38, turned off and on, is at 0.38" | |
| Each command: the part changed and `toBe` on the rest; the worked case of the order of the filters; the filters turned off and on, with undo by `toBe`; the threshold of the individuals off and on; each row of the table of the commands (1762) | `prj:170` "each command changes its part and keeps the others"; `prj:3898` "the worked case: each filter goes to the place of its kind …"; `prj:4291` "the worked case of the filters of the variants: two turned off with their values …, and an undo of each the project before it"; `prj:4350`; `prj:478` "the rows of the table of the commands"; `prj:342` "%s given the value already there gives the project itself"; `prj:405` "a value parseProject would refuse is a defect" | |
| Each record: into the source of its id; the project itself for another id, a read already recorded, other `csv` options (1781) | `prj:1139` "recordVariantsRead"; `prj:1197` "recordIndividualsRead", with `prj:1239` "gives the project itself for a read of other options" | |
| The needs, a case for each row; `individualListNeeds` keep and remove, `null` while not read; `projectNeeds` `null` with a bad list; the words of the reader's refusals; "a traits file" (1784) | `prj:1497` projectNeeds; `prj:3968` individualListNeeds, `prj:4011`, `prj:4027`; `prj:3672` variantsStepNeeds; `prj:1905` individualsNeeds; `prj:3517` individualsStepNeeds; `prj:3299` "individualsNeeds gives the words of %o"; `prj:6450` "individualsNeeds gives the words of %o, and the end of a refusal" (the xlsx); `prj:3779` | |
| `variantFilterNeeds` and `jobFilters`: the reason with and without a file; `null` with a distance, no LD filter, one off, an empty project; `setVariantFilter` of `null` accepted, 0 and 2.5 defects; `jobFilters` the same array, a defect with `null`; `parseProject` of `null`, 0 and `"1000"` (1791) | `prj:4123`, `prj:4132`; `prj:4138` "variantFilterNeeds gives null with a distance, with no LD filter, and for an empty project"; `prj:4433` (one off); `prj:4151`; `prj:4164`; `prj:4176`; `prj:4181`; `prj:4193`; `prj:4201` | |
| `individualsCheck`: `null` when a file is not read; found, missing in order, rows ignored; `individualsNeeds` naming the same (1802) | `prj:3230` "is null when the variants file is not read", `prj:3236`; `prj:3241` "gives the individuals found, all those missing …"; `prj:3284` "individualsNeeds names the individuals it gives as missing" | |
| `escaped` escapes and does not cut, `shown` cuts after 40 (1806) | `prj:3293` "escaped escapes a name and does not cut it, where shown cuts it after 40 characters" | |
| The populations: the worked example moved here; no file, `"all"`, the four, `populationsKept`, `populationsNeeds` `null` whatever the grouping; the same with `onePopulation`; a getter of `p.variants` that throws; `noColumn`; the xlsx of 1, "1" and 2; `populationsBeforeRun`; `null` in association (1808) | `prj:4852`; `prj:4868` "with a metadata file and the grouping onePopulation, the same one population"; `prj:4881` "populationsOf of the one population does not read the variants file …" (and A, B, C of the worked example); `prj:4897` "… populationsNeeds of the kind noColumn with its words"; `prj:4914` "the column of an xlsx whose cells are the number 1, the text 1 and the number 2 …"; `prj:4942`, `prj:4960`, `prj:5256` populationsBeforeRun; `prj:5018` "every function of the populations is null for a project of association"; `prj:5171` and `prj:5239` (moved from the diversity) | |
| `columnAllows` on the worked table: the first column, `pop`, `h` with the comma and the point, `st`, the xlsx column, the same array (1825) | `prj:5395` "the first column allows neither continuous nor binary …" to `prj:5497` "the same array for the same read …" | |
| `columnWarningsOf` and `firstValues` (1836) | `prj:6304` "columnWarningsOf gives the warnings columnWarnings of the reader gives … with each mark"; `prj:6339` "the same array for the same read"; `prj:6344` "a column set categorical loses its warning and set continuous again has it back, with no walk of the table again"; `prj:6361` "firstValues gives the first three distinct values …" | the walk is shown by counting the reads of the rows, not by rows that throw |
| The column of the populations first: `null`, `noSuchColumn` with its words (1847) | `prj:6233` "a new file whose first column is the column chosen gives no populations and populationsNeeds of the kind noSuchColumn, with its words" | |
| The types: `setColumnType` of each type and its defects; `typesSet` replaced in place, also while not applied; the record of the example; the read without `n.d.`; continuous not applied; binary in another order; gone; first column; one column then three; a failed read; the three reasons; `typesLost` the same array; `forgetTypesLost`; identifier on the first column; `loadIndividuals` carries `typesSet` (1850) | `prj:5507`, `prj:5529`, `prj:5549`; `prj:5583`, `prj:5603`; `prj:5626`; `prj:5652`; `prj:5672`; `prj:5689`; `prj:5714`; `prj:5723`; `prj:5774`; `prj:5807`; `prj:5817`; `prj:5826`; `prj:5567`; `prj:5845` "loadIndividuals after setColumnType carries typesSet; removeIndividuals then loadIndividuals does not" | |
| `parseProject` of a read with a type set not applied: opens, `typesLost` gives it; a pair allowed with another type in `columns` refused (1873) | `prj:5866` "a source whose typesSet holds sex binary with values its table does not have opens, and typesLost gives it"; `prj:5873` "a pair the read allows whose column has another type is refused" | |
| A source `notGiven`: the two reasons with each grouping; `populationsOf` `null`; `setCsvOptions` a defect; `recordIndividualsRead` the project itself; `loadIndividuals` pending with `typesSet` (1877) | `prj:5985`; `prj:6016`; `prj:6027` "setCsvOptions is a defect, since the page holds no copy of the file"; `prj:6045` "recordIndividualsRead of its load id gives the project itself …"; `prj:6059` | |
| `populationsNeeds` gives `inStep` for each of its three kinds (1882) | `prj:5040`, `prj:5048`, `prj:5062` "populationsNeeds gives inStep, the words of reason without the Individuals step, for …" | |
| `individualsNeeds` with no file: `null` in population genetics, the traits file in association (1884) | `prj:5079`; `prj:5088` | |
| `parseProject`: each check with its kind and path; the text of the second filter; `[maf, missing_data]` `filterOutOfOrder`; no `typesSet`; neither list off; `twoFiltersOfAKind` at `["filtersOff", 0]`; a list to keep off; `onePopulation`; a continuous type refused (1886) | `prj:2213` "each check, with its kind and its path"; `prj:2584` "of the threshold of the second filter of the variants"; `prj:4057` "[maf, missing_data] is filterOutOfOrder at the second filter, with its text"; `prj:5894` "an individuals file with no typesSet, of stages 2 and 3, opens with none set"; `prj:4449`; `prj:4461` "parseProject of the missing data filter both on and off refuses it at the one off, with its text"; `prj:4518`; `prj:5155` "parseProject opens the grouping onePopulation in population genetics and refuses it in association"; `prj:5936` "a continuous type on a column of which one value is not a number is refused, with its text" | |
| Properties: read back from JSON equal, with the fields of stage 4 and the LD filter with no distance; `variantFilterNeeds` and `jobFilters` exactly then; the four lists in order, no kind on and off, off then on gives the filters of before; a command twice gives the project it was given (1899) | `prj:2619` "every project reads back from its JSON equal to itself"; `prj:6182` "every project drawn, with types set applied and not, onePopulation and a read notGiven among them …"; `prj:4231` "for every project, variantFilterNeeds gives a reason exactly when the LD filter has no distance …"; `prj:4614` "for every project, an LD filter with no distance in filtersOff locks nothing …"; `prj:4647` "for every sequence of commands, each of the four lists of filters …"; `prj:649`, `prj:3942` "any sequence of commands keeps …"; `prj:676` "a command applied twice gives, the second time, the project it was given" | |

### The project file

`docs/specs/core/projectFile.md`, "The cases" and "How it is verified":
23 items, 23 with a test that reaches all of it.

The tests are named by these short names of their files: `pf:` for
`src/core/projectFile.test.ts`; `prj:` for `src/core/project.test.ts`;
`saving:` for `e2e/saving.spec.ts`; `div:` for
`src/core/analyses/diversity.test.ts`; and `skeleton:` for
`e2e/skeleton.spec.ts`.

One item more than in stage 3: the case of a project with no metadata
file (935).

| item | test | note |
|---|---|---|
| Saved and opened again before its variants file is given (910) | `pf:311` "no variants file loaded and a reference: the reference's is written"; `pf:473` "an analysis removed, with a reference whose fingerprint matches, carries the reference's check …"; `pf:2404` "written, opened, and written again with no result, a project gives the same text" | |
| Opened, given another variants file, saved before a run (914) | `pf:624` "a file loaded, pending, of another identity than the reference's is written, not the reference's"; `pf:494`, `pf:538`, no check for another identity | |
| Saved while the variants file is being read; the reopened project compares only name, size, format and read options (917) | `pf:624`; `pf:228` "a variants file loaded and pending, of the reference's identity …"; `pf:3233` "a project saved while its VCF was read, opened, is compared with the file given by its name, its size, its format and the choice of the passed variants alone" | `pf:3233` added; see "Specs that differ from the code" |
| Its VCF read again with another ploidy, saved before that read ends (920) | `pf:247` "a VCF of the reference's identity read again with ploidy 4, pending, is written with ploidy 4 and no check, and opens so" | |
| Saved while the individuals file is being read, or refused: `notGiven`, the lock with its words, no count checked at the opening (925) | `pf:391` "an individuals file pending, failed or notGiven is written as notGiven …"; `pf:3060` "v1-metadata-not-read.popnei.json … locked until the file is loaded again …"; `prj:5985` "individualsNeeds and individualsStepNeeds give their words, whatever the grouping"; `pf:3282` "a project saved while its metadata file was read opens with a check of the diversity of any count …" | `pf:3282` added |
| A project with no metadata file: `individuals` null, the 4 check numbers of "All individuals" (935) | `pf:3102` "v1-one-population.popnei.json, no metadata file, opens with the 4 check numbers …"; `pf:3149` "the diversity of a project with no metadata file, done over All individuals, is saved with its 4 check numbers …" | new in stage 4 |
| An opened individuals file whose CSV options change: the screen offers to load it again; its types can be set (941) | `prj:255` "setCsvOptions sets the options and puts the read to pending"; `prj:269` "setColumnType sets the type of one column"; `saving:727` "WS10 after an opening, the Individuals step offers to load the metadata file again …" | |
| An analysis done under other settings saves its own numbers (948) | `pf:575` "a result done on a file of another identity, or under other settings, is saved" | |
| Save before the calculation worker started (951) | `pf:2766` "$file, saved before the filters off were kept, is written back …", on `v1-vcf-pending.popnei.json`, whose `popneiVersion` is null and whose check keeps its own versions; `pf:1086` "… opens into its project" | |
| The same project file opened twice (954) | `pf:1086` "… opens into its project"; `div:942` "the same table from another file, or with other options of the CSV, leaves the key the same" | the case asks nothing of the code; these show why it is harmless |
| The fixtures of version 1, the nine of them, each opened and written back (986) | `pf:1086`, `pf:1693`, `pf:2613`, `pf:2725`, `pf:3040`, `pf:3060`, `pf:3102` open them; `pf:2766`, `pf:3077`, `pf:2621`, `pf:2732`, `pf:3040`, `pf:3060`, `pf:3102` write them back | |
| What is written (1022) | `pf:211` to `pf:659` | |
| The writing (1032) | `pf:666`, `pf:682`, `pf:702` | |
| Each refusal, `filterOutOfOrder` and the read of the individuals file pending or failed among them (1036) | `pf:1126` to `pf:1273`; `pf:1376`, `pf:1391`; `pf:1700` "… maf then missing_data is refused as filterOutOfOrder, with its text"; `pf:3200` "a read of the individuals file pending or failed is refused as header, with its text …"; the texts `pf:1407`, `pf:1413`, `pf:1432` | |
| A byte order mark (1049) | `pf:1476` | |
| The fingerprints (1051) | `pf:1486` | |
| The count with the diversity's own definition (1054) | `pf:1282`, `pf:1306`; `pf:1721` "… not checked with a threshold on the individuals, and is with the lists alone" | |
| The numbers not compared (1063) | `pf:1882`, `pf:1911`, `pf:1953` | |
| The identity, a case for each row, and the warning of `docs/functionality.md` (1068) | `pf:1752` to `pf:2042`; `pf:2013` "the warning of docs/functionality.md, whole" | |
| Property: written and opened gives the project of the table (1079) | `pf:2362` | |
| Property: written, opened and written again gives the same text (1085) | `pf:2404` | |
| Property: valid JSON with no field the spec does not name (1088) | `pf:2425` | |
| In the browser: saved, opened in a new page, the same numbers, then the warning of the identity (1090) | `skeleton:302` "WS9 D4 the project saved after a run and opened in a new page gives the same numbers …" | |

### The store

`docs/specs/core/store.md`, "The cases" and "How it is verified": 34
items, 34 with a test that reaches all of it.

The tests are named by these short names of their files: `st:` for
`src/core/store.test.ts`; and `ichk:` for
`src/core/analyses/individualChecks.test.ts`.

The tests of `src/core/history.test.ts` test the history the store
keeps, and reach no item of this spec that a test of the store does not.

| item | test | note |
|---|---|---|
| A result that arrives after a change of a setting: ready, cached with its warnings, not shown, an undo shows it (1123) | `st:1870` "a late result: after a command, the result of the old key goes into the cache …"; `st:1421` "the warnings of a result are made from the project its request was made from" | |
| Run asked twice for one key: the second `startRun` returns `null` (1130) | `st:1038` "run asked twice for one key: the second startRun returns null …" | |
| A cancel by the user, a crash, a restart (1132) | `st:1200` "a cancel by the user stops the request, and the analysis is ready at once …"; `st:1225` "a crash of the worker shows the failure …"; `st:1091` "another failure is kept until the next change …" | |
| A progress after the end of its request (1135) | `st:1237` "a progress after the end of its request, or before send returns, is passed over …" | |
| A second `popneiReady`: the same version changes nothing; another changes every key, stops every calculation, drops the notice, makes none, the analyses done `ready` (1138) | `st:352` "popneiReady twice with the same version gives the same state object …"; `st:362` "popneiReady with another version makes every key again with it"; `st:1904` "a second popneiReady of another version stops every calculation at once and drops the notice, making none" | |
| A command that returns the project it was given: nothing changes, the notice neither (1146) | `st:441` "a command that returns the project it was given changes nothing …" | |
| A result under another key, an unknown `runEnded`, a key that is not a key, a `warnings`, `checkNumbers`, `countsOf` or `statistics.of` that throws: the failure kept under its key, nothing kept (1148) | `st:1296` "a result under another key than its request's is a defect …" (with "not a key"); `st:1333` "a runEnded of a request the store did not start …"; `st:1533` "a %s that throws while a result is taken in …"; `st:4352` "statistics of other individuals than the file's are a defect kept under their key …"; `st:4378` "a statistics.of that throws while the statistics are taken in …" | |
| An analysis's `run` that throws, before and after sending (1158) | `st:1342` "an analysis's run that throws leaves the state as it was, and what it sent is stopped"; `st:1581` "… one that throws after sending leaves stopped what it stopped" | |
| A new variants file picked while calculations run; an undo of the pick (1164) | `st:2290` "a new variants file stops every calculation in flight at once …"; `st:2320` "a new variants file stops at once the calculation the notice before left behind …" | |
| One analysis both removed and stopped (1171) | `st:2454` "one analysis can be both among the results removed and in stopped …" | |
| An opened project whose settings are changed and set back (1177) | `st:2750` "an opened project whose settings are changed and set back by another command has its comparison again" | |
| An undo to filters whose statistics the cache dropped: the diversity `done`, the list not known, only a new Run waits (1180) | `st:4021` "an undo back to a load whose statistics the cache dropped …"; `st:3654` "with a threshold of 0.2, the Run calculates the statistics first, waits for them …" | since 28 September the statistics read no filter, so only a change of the load gives them another key; the test undoes a load |
| A threshold moved while a Run waits for the statistics (1184) | `st:3772` "a threshold moved while the Run waits leaves the wait behind in the notice …" | |
| The statistics refused by popnei: in `error` until a change gives them another key, a new load (1191) | `st:3802` "a refusal of the statistics by popnei shows in the analysis as the error of the statistics …"; `st:3833` "the refusal of the statistics by popnei lasts until a change gives them another key …" | |
| A write that ends after a change of the filters: file dropped, `dropped` until the next change, its counts shown by an undo, no Save (1196) | `st:5322` "a result that arrives after the command is dropped: ready with dropped …" | |
| A diversity that ends while a Count of the same filters runs (1200) | `st:4995` "a Count in flight for the same key goes on when the counts are filled, and its result replaces them" | |
| A worked sequence (1270) | `st:1716` "a worked sequence: locked, ready, running, done, removed by a command, and done again by its undo …"; `st:960` "from startRun to done …" | |
| Stopping, each case (1282) | `st:1774`, `st:1793`, `st:1805`, `st:1816`, `st:1825`, `st:1839` "stopping, …"; `st:2290` and `st:2337` "an undo and a redo that change the load of the variants file stop every calculation …"; `st:2423` "a startRun of an analysis in stopped takes it out …" | "no test waits for a time" holds for every test of the file: none has a timer |
| A late result (1299) | `st:1870`; `st:1421` | |
| A refusal: `refused`, `failed`, `reopenFailed` (1304) | `st:1066` "popnei's refusal is kept under its key …"; `st:1091` "another failure is kept until the next change …"; `st:1119` "a variants file that could not be read again is kept under its load …" | |
| The check numbers (1313) | `st:2684`, `st:2697`, `st:2712`, `st:2721`, `st:2730`, `st:2739`, `st:2750` | |
| The individuals kept and a Run that waits (1323) | `st:3640`, `st:3654`, `st:3707`, `st:3725`, `st:3748`, `st:3772`, `st:3802`; `st:3985` "with keep a, remove a and a threshold of 0.2, and no statistics in the cache, the analysis is locked with keptNoneReason at once …" | `st:3985` added |
| A list of individuals popnei would refuse: the analysis and the write locked, the statistics ready, `individualsKept` null (1347) | `st:4008` "a list to keep that names z, not in the file, locks the analysis …"; `st:5555` "the write is locked by the reason of individualListNeeds …" | |
| An LD filter with no distance (1352) | `st:5923` "the reason is the spec's"; `st:5929` "what reads the filters of the variants, the counts and the write are locked with its reason …"; `st:5947` "an analysis that reads only the filters of individuals is ready, %s …"; `st:5971` "with a list popnei would refuse as well …"; `st:6006` "a result done before the filter was turned on is in the notice …"; `st:6033` "turned off, it is kept with no distance …"; `st:6110` "for every sequence of commands, some of the LD filter with no distance …" | an analysis that reads no filter, other than the statistics, is reached by the property `st:6110`, whose definitions draw any `filtersRead` |
| A filter turned off and on again (1365) | `st:6052` "a filter turned off and on again: the LD filter at r² 0.2 within 50000 …" | |
| The key whatever the lock, and the lock from the cache (1370) | `st:4021`; `st:4048` "the lock is worked out again from the cache …"; `st:4089` "a put of a result larger than the bound keeps the statistics …" | |
| The counts filled (1384) | `st:4894` "runEnded of a result of the analysis of the variants puts the counts …"; `st:4924` "a command that changes the filter of the variants does not name the counts …"; `st:5070` "counts filled under a threshold of the individuals are not named among the results removed …"; `st:4978` "with a cache whose bound holds one result …" | `st:5070` added |
| The write, each step (1392) | `st:5197`, `st:5232`, `st:5254`, `st:5270`, `st:5281`, `st:5297`, `st:5322`, `st:5365`, `st:5389`, `st:5419`, `st:5450`, `st:5473`, `st:5483` | |
| `popneiReady` twice, `dismissNotice` with no notice (1416) | `st:352`; `st:1894` "dismissNotice with no notice gives the same state object …" | |
| `getState` the same object; the state of an analysis unchanged (1418) | `st:380`; `st:401` | |
| A read recorded, shared by two projects of the history (1421) | `st:610` "two projects of the history that shared the source of a file share the new one after its read" | |
| A result given back by a read (1423) | `st:6485` "a metadata file loaded with the one population removes the result while it is read …"; `st:6502` "a result the cache dropped while the file was read stays among the results removed …"; `st:6515` "a calculation left behind by the load whose key the read gives back goes on …"; `st:6565` "the diversity of one population is removed while a metadata file is read …" | |
| A result kept to its definition; two definitions of one id (1440) | `st:1436` "each result reaches only the warnings and the checkNumbers of its own analysis"; `st:2776`; `st:746` "two definitions of one id are a defect" | |
| Properties (1444) | `st:3344`, `st:3383`, `st:3412`, `st:3473`, `st:3494`; `st:4108` "… whatever the lock by the individuals kept"; `st:4136` "the list given to a request is individualsKept …"; `st:5818` "a write whose result arrives when the project gives another key leaves no file in the state"; `st:6110` (the LD filter with no distance and the filters off); no request of the statistics carries a list: `st:4136`, nor a filter: `st:4474` "createStore throws on a definition of the statistics that reads the filters …" and `ichk:208` "run sends the job with no filter, whatever the filters …" | the clause on the regions of a BED file names a filter the application does not have yet; its test belongs to the plan that adds it, as for `filterCounts.md` in stage 3 |

### The keys

`docs/specs/core/keys.md`, "The cases" and "How it is verified": 11
items, 11 with a test that reaches all of it.

The tests are named by these short names of their files: `keys:` for
`src/core/keys.test.ts`; `st:` for `src/core/store.test.ts`; `div:` for
`src/core/analyses/diversity.test.ts`; `sk:` for
`src/core/analyses/stepKeys.test.ts`; and `pca:` for
`src/core/analyses/pca.test.ts`.

| item | test | note |
|---|---|---|
| The individuals file by its contents, the variants file by its load (334) | `keys:582` "finds the key again when the individuals file is loaded again"; `keys:601` "gives another key when the variants file is loaded again" | |
| No version of popnei yet: the store never asks for a key without one (339) | `st:302` "while the variants file is read both are locked …"; `st:771` "an analysis that can run before the version of popnei is known is a defect" | |
| A `keyInputs` that returns a new object each time (343) | `keys:617` "gives the same key for a keyInputs that returns a new object each time" | |
| `sha256Hex`: the NIST vectors, 55 to 64 bytes, any Unicode against node, `é中𝄞`, `"\ud800"` a defect (371) | `keys:272` "gives the NIST hash of %s"; `keys:297` "… where the padding goes from one block to two"; `keys:305` "hashes é中𝄞 …"; `keys:331`, `keys:339` "gives node's hash of any text …"; `keys:316` "throws a defect on %s of a pair"; `keys:325` "gives the position in the text of a broken character" | |
| `canonical`: the example and its hash, −0, the escape, `__proto__`, a defect with its path, the same with a memo (388) | `keys:104` "writes the fields sorted by name …"; `keys:353` "hashes the canonical form of the example of the keys spec"; `keys:110`, `keys:114`, `keys:118`; `keys:123` "throws a defect with its path on %s", `keys:143`, `keys:151`, `keys:157`; `keys:172` "gives the same text with a memo, empty or filled, as without" | |
| `keyOf`, the literal key and the literal fingerprint (394) | `keys:411` "gives the literal key of the keys spec"; `keys:421` "gives the literal fingerprint of the keys spec" | |
| `filtersRead`: a key that does not change with a filter not read (417) | `keys:474` "keeps the key with a threshold of the %s the analysis does not read" | |
| `writeKeyOf`, the literal, what changes it and what does not (419) | `keys:984` "gives the literal key of the keys spec, the hash of its canonical form"; `keys:989`, `keys:998`, `keys:1023`, `keys:1033`, `keys:1047`, `keys:1069`, `keys:1083` | |
| `keyFromWire`: 64 digits a key; 63, an upper case digit, a `g` a defect (433) | `keys:508` "keyFromWire gives a key of 64 lower case hexadecimal digits"; `keys:512` "keyFromWire throws a defect on %s" | |
| Properties: the order of fields, `JSON.parse` back; a part of the table changes the key; one outside it, the name or read of the variants file or the filters turned off, keeps it, of `writeKeyOf` too; the fingerprint (435) | `keys:215` "does not depend on the order in which the fields were set"; `keys:229` "reads back with JSON.parse as the value, every −0 made 0"; `keys:828` "a change of %s changes the key"; `keys:852` "a change of the name, the size or the read of the variants file keeps the key"; `keys:1083` the same for the key of a write; `keys:1128` "any filters turned off keep the key, the key of an intermediate result, the fingerprint and the key of a write …"; `keys:874` "the fingerprint keeps with the load id …"; `keys:897` "a change of %s changes the fingerprint" | |
| Every analysis has its table, and its `keyInputs` gives a value for `emptyProject` and for pending reads without reading `p.variants` (447) | the tables: `div:785` "WS5 D2 the key"; `sk:234`, `sk:284`, `sk:331`, of the statistics, the histograms and the counts; `pca:1485` "IP6 D5 the key, the rows of 'What goes into its key'". The `keyInputs`: `keys:1186` "keyInputs of %s gives a value for the empty project and for a project whose reads are pending, without reading p.variants", over the five analyses of `POPGEN_ANALYSES`; beside it `div:1009`, `div:1024`, `sk:274`, `sk:323`, `sk:365`, `pca:1734` | `keys:1186` added: the PCA had no test with pending reads |

### The cache

`docs/specs/core/cache.md`, "The cases" and "How it is verified": 7
items, 7 with a test that reaches all of it.

The tests are named by these short names of their files: `cache:` for
`src/core/cache.test.ts`; and `st:` for `src/core/store.test.ts`.

| item | test | note |
|---|---|---|
| A result larger than the bound: kept while shown, dropped by the first put after (177) | `cache:204` (`e` of 200 kept, then dropped by the put of `f`); `st:1453` "above its bound, the cache drops a result the project no longer gives, never one it gives" | |
| A result dropped, then asked for again by an undo: ready, made again (181) | `st:1661` "a result dropped by the bound, then asked for again by an undo, is removed, then ready, and is made again by a new run, never an error" | |
| The same result put twice (184) | `cache:264` "the same result put twice is held once, the second in place of the first" | |
| `resultBytes`: 8044; the same array twice; two views; a `Map` of views (203) | `cache:140`, `cache:150`, `cache:155`, `cache:165` | |
| The worked case with a bound of 100 bytes (208) | `cache:204` "with a bound of 100 bytes, a put drops the result used longest ago, but those kept and the one put" | |
| `get` does not change the cache (214) | `cache:244` "get gives the value under a key, or null, and is not a use" | |
| Properties (216) | `cache:305`, `cache:324`, `cache:339` | |

### The individuals kept

`docs/specs/core/individualsKept.md`, "The cases" and "How it is
verified": 8 items, 8 with a test that reaches all of it.

The tests are named by these short names of their files: `st:` for
`src/core/store.test.ts`; `ik:` for `src/core/individualsKept.test.ts`;
`individualThresholds:` for `e2e/individualThresholds.spec.ts`; and
`sk:` for `src/core/analyses/stepKeys.test.ts`.

| item | test | note |
|---|---|---|
| An opened project with a threshold: `needsStatistics` until they are calculated for the new load, the first Run calculates them first (189) | `st:3654` "with a threshold of 0.2, the Run calculates the statistics first, waits for them, and then sends its request with a, b and d" | the project is given by `store.open`, and the list is `needsStatistics` before the Run; no test opens it from a project file |
| Filters that remove no individual: the list `null`, each filter given and kept the same number (194) | `ik:236` "filters that remove no individual give the list null, each filter given and kept the same number" | |
| Every individual without a called genotype, with a heterozygosity filter: none kept, the lock; without it, kept (198) | `ik:248` "individuals that call no genotype are all removed by any heterozygosity threshold, and kept without it" | |
| Lists that keep none, with a threshold and no statistics: known and empty, the lock at once (202) | `ik:134` "lists that keep none, with a threshold and no statistics, give the list known and empty, and the lock"; `individualThresholds:544` "a list to remove of every individual, then a threshold turned on: the reason at once …" | |
| A filter of the variants changed: the statistics under the same key, the list stays known; only a new load, an opening or the cache make it `needsStatistics` again (209) | `st:4581` "a change of a filter of the variants leaves the statistics done and the list known …"; `st:4069` "statistics that arrive after a change of the filters of the variants are done under the key the project still gives them …"; `sk:249` "a filter of the variants added or removed, or its threshold, leaves the key the same", of the statistics; `st:4021` "an undo back to a load whose statistics the cache dropped … the list needs the statistics"; `st:3654` for an opening | |
| The worked case of five individuals, each of its steps (226) | `ik:64`, `ik:71`, `ik:86`, `ik:93`, `ik:102`, `ik:114`, `ik:134`; `ik:151` "keep a, remove a and missing data 0.2, with no statistics, give the list known and empty, each count known, and the lock"; `ik:177` "statistics of the individuals in another order are a defect" | `ik:151` added |
| popnei's numbers on `panel.nei` with no filter: 116, 42 and 111, from `panel_individual_stats.json` (246) | `ik:360` "popnei's statistics with no filter give 116 individuals at a missing rate of 0.03, and 42 or 111 of them …" | |
| Property: the order of the file, exactly those every filter keeps, each `kept` the next `given` (261) | `ik:437` "the list is in the order of the file and holds exactly the individuals every filter keeps …" | |

### The diversity

`docs/specs/analyses/diversity.md`, "The cases" and "How it is
verified": 32 items, 32 with a test that reaches all of it.

The tests are named by these short names of their files: `div:` for
`src/core/analyses/diversity.test.ts`; `run:` for
`src/worker/runner.test.ts`; `diversity:` for `e2e/diversity.spec.ts`;
`st:` for `src/core/store.test.ts`; `types:` for
`e2e/individualTypes.spec.ts`; `keys:` for `src/core/keys.test.ts`;
`diversityKept:` for `e2e/diversityKept.spec.ts`; `one:` for
`e2e/onePopulation.spec.ts`; `pca:` for `src/core/analyses/pca.test.ts`;
and `skeleton:` for `e2e/skeleton.spec.ts`.

The panel of the diversity has no section of its own on how it is
checked.

| item | test | note |
|---|---|---|
| A population smaller than 20: its row with "no value", and why (785) | `div:222` "the worked example gives the populations, the request, the warnings…" (`tooFewIndividuals`); `run:525` "a population of fewer than 20 individuals is not refused, and its values are NaN"; `diversity:682` "WS8 D2 tetraploid.vcf.gz read with ploidy 2 is refused… read again with ploidy 4 runs with its warning" (the row A, 12 and "no value" three times) | |
| A population of 20 to a few more, with missing data: `variantsWithoutValue` with the counts (790) | `div:502` "warnings of a population with a value at 641 of 1,152 variants gives variantsWithoutValue with 56%"; `div:1060` | |
| The filters keep no variant: the refusal kept under its key, shown again by an undo with no calculation (794) | `run:833`; `st:1066` "popnei's refusal is kept under its key: error refused, again after a command and its undo, and startRun returns null" | the store's test is of any refusal, with another message |
| The column chosen is the first, the identifiers: `noSuchColumn` (798) | `div:1446` "the first column, the identifiers, chosen as the populations is no column of the populations, and locks the diversity with the reason of a column not in the file"; `types:1049` "IP5 D2 a column of the populations that a new file puts first is no column of the populations…" | |
| The individuals file loaded again, with the same table: the same key (806) | `div:942` "the same table from another file, or with other options of the CSV, leaves the key the same"; `keys:582` "finds the key again when the individuals file is loaded again" | |
| A result that arrives after the populations changed: into the cache with the warnings of the request's project, not shown (808) | `st:1870` "a late result: after a command, the result of the old key goes into the cache with the warnings of its request's project, and an undo shows it" | the command of the test is a change of the MAF filter, not of the populations; the store does not tell them apart |
| A threshold on the individuals and no statistics: a Run calculates them first, running with their progress (812) | `st:3654` "with a threshold of 0.2, the Run calculates the statistics first, waits for them, and then sends its request with a, b and d"; `diversityKept:228` "IP2 D3, VS7 D2 a Run with the thresholds at 0.03 and 0.38 and no statistics says it waits for them, then gives p0 with 29 individuals…" | |
| A threshold moved to one that keeps the same individuals: the table goes, a Run gives the same numbers (817) | `st:3878` "a threshold moved to one that keeps the same individuals removes the result, and the next Run sends at once with the same individuals under another key"; `div:856` "a filter of individuals removed, a name of its list changed, or its threshold moved to one that keeps the same individuals, changes the key" | the same numbers follow from the same individuals and filters |
| A population whose individuals the filters all remove: left out, named in the ready state and by `populationNotInResult` (821) | `div:1487` "with the individuals kept i1 and i3, run sends A alone, and populationsKept gives B as emptied"; `div:1514`; `diversityKept:287` "IP2 D3, VS7 D2 the ready state lists the populations the filters keep…, and names those a list leaves empty" | |
| No metadata file: the diversity runs on "All individuals", one row; a metadata file under way locks it with "Reading pops.csv."; once read, with a column chosen before, the table of the one population goes; the file removed brings it back from the cache with no calculation (824) | `div:1985` "with no metadata file the diversity of All individuals is done, and stays when a column is chosen; a metadata file read with that column takes it off, and the file removed brings it back from the cache with no calculation"; `div:1790` "with no metadata file and the grouping pop kept, needs is null, keyInputs the one population, run sends All individuals…"; `one:210` "IP5 D3 panel.nei with no metadata file runs the diversity on All individuals: 200, 0.3755, 0.3543, 0.9792" | `div:` test added |
| A column chosen, and the file removed: one population, whatever the grouping holds (831) | `div:1810` "the key of the one population is the same with the file and onePopulation, and with neither the file nor a column; it differs from that of the column pop"; `div:1790`; `div:1985` | |
| The one population chosen, and a metadata file loaded: locked while it is read, the notice names it; once read with every individual, the result back from the cache, out of the notice (833) | `st:6565` "the diversity of one population is removed while a metadata file is read, whose key it has none of, and comes back from the cache when the read gives its key again, the notice gone"; `div:1926`; `one:361` "IP5 D2 with the one population, the metadata file picked again gives the table of All individuals back with no Run" | |
| An opened project whose metadata file was not read when it was saved, `notGiven`: locked with the reason of `individualsNeeds`, whatever the grouping (841) | `div:1963` "an opened project whose metadata file was not read when it was saved is locked with the reason of individualsNeeds, with the column chosen, with none, and with the one population"; `one:455` "IP5 D2 a project file whose metadata file was not read when it was saved shows its reason with no options and no table…" | `div:` test added |
| Every individual with no population in the column, then the one population chosen: the lock of `noPopulation` goes (847) | `div:1945` "every individual with no population in the column, then the one population chosen: the lock of noPopulation goes" | |
| A worked example (869) | `div:222`; `div:1396` "1 + 3 x the populations run…" (`numCheckNumbers` 7); `div:1413` "null with a threshold on the individuals, with no column of the populations, and with the variants file not read; 4 with no individuals file" | |
| The individuals kept (887) | `div:1473`, `div:1487`, `div:1500`, `div:1514`, `div:1536`, `div:1559`, `div:1588` | |
| `needs` and `populationsNeeds` (898) | `div:298` "needs gives each reason of individualsNeeds in its words" to `div:382` "populationsNeeds is null for a project whose individuals file is not read"; `div:1279` | |
| The one population (902) | `div:1790`, `div:1810`, `div:1829`, `div:1840`, `div:1888`, `div:1919` | |
| The key, row by row, and `keyInputs` of an empty and of a pending project (915) | `div:789` "a new load of the variants file, the same file included, changes the key" to `div:1024` "keyInputs of a project whose reads are pending gives no populations and the defaults…"; `div:1230`; `div:1305`; `div:1810` (the rows of the metadata file removed and of `onePopulation`) | `keyInputs` of `emptyProject` gives `"all"`, not the spec's `null`: see "Specs that differ from the code" |
| `parseOptions` (920) | `div:399` "parseOptions gives the defaults back" to `div:466`; `div:1379` | |
| `warnings` (923) | `div:502`, `div:512`, `div:522`, `div:532`, `div:537` | |
| `script` (929) | `div:557` "script of the project of the flow gives the lines of the spec" | |
| `diversityCsv` (931) | `div:591` "diversityCsv of the result of the flow gives the text of the spec"; `div:601` | |
| The words of the statistics that failed (933) | `div:1646` "the words of the statistics that failed, refused for the empty pass of the missing data filter at 0.05 and the MAF filter at 0.4, are the statistics' words of any other refusal and not the diversity's"; `diversityKept:413` "VS7 D2 the statistics a Run waited for, refused by popnei, are told in their words and not the diversity's…" | |
| `refusalText`, each row of its table (938) | `div:614` "WS8 D2 refusalText of a pass over a file with no variant says the file has none" to `div:704`; `div:1202`; `div:1658`; `pca:1249` "a variant of a chromosome that had already ended, and the diversity's refusal with the LD filter of the Variants step" (the LD filter: the diversity's `refusalText` of the message of a VCF not sorted, and `ldOrderText`, which it calls, of one of a chromosome that had ended); `run:899` and `run:920` (popnei's messages) | |
| The numbers of the flow's files, both sets, asserted as literals by the runner (959) | `run:209` "the diversity of ${name} with no filter gives the numbers of the table, in the order of the job", `run:214` "the diversity of ${name} with the missing data filter at 1 gives the numbers with no filter, and keeps 1200 of its 1200 variants", `run:225` "the diversity of ${name} with the missing data filter at 0.05 keeps 1152 of its 1200 variants" (each for `panel.nei` and `panel.vcf.gz`) | |
| The check numbers of the first set (988) | `div:1438` "the check numbers of the flow's result at 0.05 are those of the spec" | |
| The numbers with the filters of individuals, 111 before the filter at 0.05, 1,117 of 1,200, asserted by the runner (997) | `run:1335` "with the list of 111 before the filter at 0.05, the numbers of the table of diversity.md, and the filter keeps 1,117 of 1,200"; `run:1315` | |
| The one population of stage 4, its first row asserted by the runner (1022) | `run:2609` "the 200 individuals of panel.nei as "All individuals", with the missing data filter at 0.05, give the first row of the table of diversity.md" | |
| The flow of stage 4 with no metadata file at 0.1: 200, 0.3755, 0.3543, 0.9792 (1039) | `one:210` | |
| The flow: 0.05, then 1 with its notice, Run, Undo, axe in each state (1045) | `skeleton:161` "WS9 D4 panel.nei, filtered at 0.05…", `skeleton:193` "WS9 D4 the threshold set to 1 removes the diversity…", `skeleton:218` "WS9 D4 Undo of the notice brings back the threshold of 0.05…"; `diversity:363` "WS8 D2 the filter moved to 1 removes the table…, and Run at 1 gives p0 0.3519, 0.3564, 0.9267" | |
| The flow of stage 3: the two thresholds, a Run that calculates the statistics first, p0 29, 0.3537, 0.3587, 0.9311; the runner with the 111 (1058) | `diversityKept:228`; `run:1335` | |

### The statistics of each individual

`docs/specs/analyses/individualChecks.md`, "The cases" and "How it is
verified": 13 items, 13 with a test that reaches all of it.

The tests are named by these short names of their files: `run:` for
`src/worker/runner.test.ts`; `st:` for `src/core/store.test.ts`; `ichk:`
for `src/core/analyses/individualChecks.test.ts`; `sk:` for
`src/core/analyses/stepKeys.test.ts`; `individualStats:` for
`e2e/individualStats.spec.ts`; and `individualThresholds:` for
`e2e/individualThresholds.spec.ts`.

| item | test | note |
|---|---|---|
| The file holds no variant, or none passed for a VCF read with only those: popnei refuses, the refusal kept under the key, and an analysis that waited for the statistics ends with it; filters that keep no variant do not touch it (319) | `run:882` "IP10 D3 the statistics of each individual of a VCF of a header alone are refused as a file with no variant"; `run:920` (popnei's refusal of a VCF none of whose variants passed, read with only those, is that of a source that holds none); `st:3802` "a refusal of the statistics by popnei shows in the analysis as the error of the statistics, and its startRun gives null…"; `st:3833` "the refusal of the statistics by popnei lasts until a change gives them another key: a change of a filter of the variants keeps it…"; `ichk:441` "a file with no variant says so"; `ichk:452` "a VCF read with only the passed variants, none of which passed, tells to untick the box"; `ichk:208` "run sends the job with no filter, whatever the filters of the variants and of individuals…" | the runner's test was added in commit 534d705; the VCF none of whose variants passed is run through the diversity's pass, whose reader is the same |
| A filter of the variants changed: the key the same, the table, the histograms and the individuals kept stay with no pass; what the filters of the variants keep depends on the individuals kept (326) | `sk:249` "a filter of the variants added or removed, or its threshold, leaves the key the same"; `st:4581` "a change of a filter of the variants leaves the statistics done and the list known, and takes off the counts, whose key holds it…"; `sk:343` "any filter of individuals, a list or a threshold, changes the key" (of the counts); `individualStats:573` "IP2 D3, VS7 D1 the missing data filter of the variants moved: the statistics stay, with no notice and no calculation, and axe"; `individualThresholds:411` "IP2 D3, VS7 D1 the missing data filter of the variants moved: the statistics and the counts of the thresholds stay…" | |
| A threshold of the filters of individuals moved: the key the same, the table and the histograms stay, only the rows marked kept change, with no pass (330) | `sk:255` "a filter of individuals, a list or a threshold, leaves the key the same"; `individualThresholds:183` "IP2 D3, VS7 D1 the thresholds at 0.03 and 0.38: Kept 116 of the 200, then 111 of 116, … the column Kept…"; `individualStats:655` "IP2 D3, VS7 D1 the column Kept: a list to remove applied marks s000 removed and s001 kept with no calculation…" | |
| An undo to an earlier load finds its result in the cache, and the list of individuals kept with it; the cache does not drop the result while the project gives its key, and can drop one of an earlier load (333) | `ichk:674` "an undo to an earlier load finds the statistics in the cache, done with the same result, and the list of the individuals kept with them, with no calculation"; `st:4089` "a put of a result larger than the bound keeps the statistics under the key the project gives them, and the list stays known"; `st:4021` "an undo back to a load whose statistics the cache dropped shows the analysis done again with the same result, under keyOf, and the list needs the statistics" | `ind:` test added |
| A result that arrives after a new load goes into the cache under its key, and is used for the table and the list after an undo; a change of the filters while it runs does not leave it behind (337) | `ichk:706` "statistics that arrive after a new load go into the cache under the key they were asked for, and an undo shows them, with the list of the individuals kept, with no calculation"; `st:4069` "statistics that arrive after a change of the filters of the variants are done under the key the project still gives them…" | `ind:` test added |
| A worked example, three individuals and four variants: `individualRows`, `warnings`, `checkNumbers` (354) | `ichk:256` "individualRows gives i3 with no observed heterozygosity"; `ichk:265` "warnings gives individualsWithoutCalls naming i3"; `ichk:274` "checkNumbers gives the variants kept and the two means"; `run:1231` "a VCF of two individuals, the second missing at both variants, gives the rates 0 and 1 and the heterozygosities 0.5 and NaN" (popnei's rates of such an individual) | |
| The key, row by row (372) | `sk:238`, `sk:249`, `sk:255`, `sk:261`, `sk:267`, `sk:274`, of "IP2 D2 the key of the statistics of each individual" | |
| `run` with a fake client: the job with no filter whatever the project's, the client's `individuals` not read (374) | `ichk:208` "run sends the job with no filter, whatever the filters of the variants and of individuals, and does not read the individuals kept" | the fake client's `individuals` throws when read |
| `individualChecksCsv` of the worked example (377) | `ichk:287` "individualChecksCsv gives the header and three rows, i3's heterozygosity empty" | |
| `refusalText` of each row of "Its words", popnei's messages as literals; an empty pass has the words of any other refusal (379) | `ichk:422` "an empty pass, which a pass with no filter cannot give, has the words of any other refusal"; `ichk:248`; `ichk:428`; `ichk:441`; `ichk:452`; `ichk:463`; `ichk:737` "a gzipped VCF cut short tells to correct the file or fetch it again"; `ichk:480` | the gzipped VCF added; the rows of the LD filter and of no population cannot reach a pass with no filter and no population |
| The description of the histogram of the missing genotypes at 0.03, the bin from 0.0295… split (383) | `ichk:488` "the proportion of missing genotypes of panel.nei, with the threshold 0.03" | |
| The numbers of the flow and of the runner on `panel.nei` with no filter: 1,200 variants, `s000`, the ranges, no NaN, the check numbers; the flow's 0.0283 and 0.3654, the same whatever the filters and after an undo (388) | `run:1196` "with no filter panel.nei gives its 200 individuals, popnei's numbers of the first three, no NaN, and the counts of the 1,200 variants"; `run:1212` "the statistics that the tests of core read from panel_individual_stats.json are those popnei gives the runner with no filter"; `src/core/histogram.test.ts:63` and `src/core/histogram.test.ts:83` (the ranges, as the first and last edges); `ichk:279` "checkNumbers of the statistics of panel.nei gives the check numbers of the spec"; `individualStats:154` "IP2 D3, VS7 D1 the statistics of panel.nei: s000 0.0283 and 0.3654…"; `individualStats:573` (the same after the filter moved and after the undo, no calculation) | |
| The flow in the browser: the table sorted with the keyboard alone, `s082` first at 0.0442; the CSV of the table; the CSVs of the bins (402) | `individualStats:330` "IP2 D3, VS7 D1 the table sorted with the keyboard alone: …, s082 first at 0.0442…"; `individualStats:463` "IP2 D3, VS7 D1 the CSV of the table: panel.individual_stats.csv, its header, 200 rows, and s000 with every digit"; `individualStats:480` "IP2 D3, VS7 D1 the CSVs of the bins of the two histograms…" | the flows run in Chromium and WebKit here; Firefox on GitHub only |

### The histograms of the variants

`docs/specs/analyses/variantChecks.md`, "The cases" and "How it is
verified": 14 items, 14 with a test that reaches all of it.

The tests are named by these short names of their files: `sk:` for
`src/core/analyses/stepKeys.test.ts`; `variantHistograms:` for
`e2e/variantHistograms.spec.ts`; `variantsOrder:` for
`e2e/variantsOrder.spec.ts`; `run:` for `src/worker/runner.test.ts`; and
`var:` for `src/core/analyses/variantChecks.test.ts`.

| item | test | note |
|---|---|---|
| A filter of the variants moved: nothing, the key does not hold the filters of the variants (242) | `sk:288` "a filter of the variants added or removed, or its threshold, leaves the key the same" (of the histograms); `variantHistograms:124` "VS6 D2 the histograms calculated: … the mean of the MAF still there after the missing data filter moved" | |
| A filter of individuals changed: the key changes, the histograms go with the notice, a Calculate makes them over the individuals kept, an undo brings them back with no calculation (244) | `sk:294` "a filter of individuals, a list or a threshold, changes the key"; `variantsOrder:231` "IP2 D3 the histograms of the variants removed by the thresholds of the individuals, with the notice, and calculated again over the 111 individuals kept: the mean of the MAF 0.7173, and axe" | |
| A VCF read again with another ploidy: a new key, a new pass (248) | `sk:308` "a new load, the read options of a VCF, the key version, 2, and the version of popnei change the key" | |
| A variant of three alleles is in the MAF histogram below 0.5; a variant with one allele called has a MAF of 1 (249) | `run:1656` "a variant of three alleles is in a bin of the MAF below 0.5, and a variant with one allele called has a MAF of 1, in the last bin" | |
| The key does not change with a filter of the variants (259) | `sk:288` | |
| The key changes with a filter of individuals and with a new load (259) | `sk:294`; `sk:308` | |
| `run` sends the job, with the `individuals` of a fake client that gives a list, and with `null` (260) | `var:195` "run sends the job of the spec with the individuals kept that the client gives, and no filter of the variants whatever the project's"; `var:216` "run sends individuals null when the client gives null, the filters removing nobody" | |
| `warnings` of MAF counts that sum to 5 of 6 variants: `variantsWithoutCalls`, "1 of the 6 variants" (262) | `var:262` "warnings of MAF counts that sum to 5 of 6 variants gives variantsWithoutCalls" | |
| `checkNumbers` of the result of `panel.nei`, its four numbers (264) | `var:280` "checkNumbers of panel.nei gives the variants and the three means" | |
| The numbers of the runner and of the flow on `panel.nei` and `panel.vcf.gz`: the means, the counts of each histogram, no warning (267) | `run:1548` "the histograms of panel.nei with no filter, 40 bins from 0 to 1: popnei's edges, means and counts"; `run:1643` "the histograms of panel.vcf.gz are those of panel.nei: the same edges, means and counts"; `var:327` "warnings of panel.nei, whose MAF counts sum to its 1,200 variants, is none" | |
| The descriptions of the MAF at 0.95 and of the observed heterozygosity at 0.5, asserted whole (277) | `var:287` "the description of the MAF of panel.nei at 0.95"; `var:295` "the description of the observed heterozygosity of panel.nei at 0.5, whose bin from 0.5 is split" | |
| The flow reads the mean of the MAF, 0.7163, and sees it stay when the missing data filter changes (280) | `variantHistograms:124` | |
| With the list of 111: `numVars` 1,200, the three means, the MAF counts summing to 1,200, and the check numbers, asserted by the runner (284) | `run:1489` "the histograms with the list of 111 and no filter of the variants: popnei's means over those individuals, and counts that add up to 1,200" | the test asserts the forty counts of the MAF one by one since commit e8122ac; broken, the counts given in reverse order, which keeps their sum and the means, it failed |
| The flow after the two thresholds: the histograms go and, calculated again, the mean of the MAF 0.7173 (294) | `variantsOrder:231` | |

### The counts of the filters

`docs/specs/analyses/filterCounts.md`, "The cases" and "How it is
verified": 14 items, 13 with a test that reaches all of it.

The tests are named by these short names of their files: `run:` for
`src/worker/runner.test.ts`; `fc:` for
`src/core/analyses/filterCounts.test.ts`; `filterCounts:` for
`e2e/filterCounts.spec.ts`; `div:` for
`src/core/analyses/diversity.test.ts`; `pca:` for
`src/core/analyses/pca.test.ts`; `ichk:` for
`src/core/analyses/individualChecks.test.ts`; `var:` for
`src/core/analyses/variantChecks.test.ts`; `sk:` for
`src/core/analyses/stepKeys.test.ts`; `variantsOrder:` for
`e2e/variantsOrder.spec.ts`; and `st:` for `src/core/store.test.ts`.

| item | test | note |
|---|---|---|
| The filters keep no variant: the counts with `filterKeptNone`; the analyses that read the filters of the variants refused, each with its own words; the statistics and the histograms still run; a write gives a file of no variant, 3,682 bytes with `js-v0.1.0-dev.3` (248) | `run:1756` "the counts of filters that keep no variant are a result, not a refusal"; `fc:167` "warnings of the empty pass gives filterKeptNone naming the MAF filter"; `filterCounts:478` "VS6 D2 a filter that kept none: its count, the line of the total, and the warning that names it"; `run:833` "filters that keep no variant are refused with popnei's counts of the pass" (the diversity) and `div:665` "refusalText of an empty pass tells to loosen the filters"; `run:2394` "filters that keep no variant are refused with popnei's words of the PCA", `run:2517` and `pca:1102` "no variant, with a source not counted or of more than 0: the words of the filters of the PCA"; `ichk:208` and `var:195` (the two jobs hold no filter of the variants); `run:1996` "at 0.05 with a MAF filter at 0, a file of no variant, 3,682 bytes, written and not refused" | the runner's write is with the MAF filter at 0, which gives the same file as at 0.4 |
| The file holds no variant: counts of zero with `noVariant`, not refused; a write gives the same counts; the warning alone, with no count and no line of the total; the status region gives the warning (256) | `filterCounts:534` "VS6 D2 a file of no variant counted: the warning of a file with no variant alone, with the focus on it, and Write refused"; `fc:252` "warnings of a file that gave no variant, with no filter, gives noVariant"; `fc:267` "warnings of a VCF read with only the passed variants, whose first filter was given none, tells to untick the box"; `run:2046` "a Count and a write of a VCF of a header alone give the same counts, with no filter and with the missing data filter at 0.1" | |
| A threshold moved, of the variants or of the individuals, or a list applied: the counts of every filter go, and come back with an undo or the next pass (271) | `sk:335` "any filter of the variants changes the key"; `sk:343` "any filter of individuals, a list or a threshold, changes the key"; `filterCounts:205` "VS6 D2 the three filters counted…; the counts gone at each change and in no notice"; `variantsOrder:315` "IP2 D3 the Count with the thresholds at 0.03 and 0.38: Kept 1,117 of the 1,200 …; a change of a threshold takes the counts off, and axe"; `st:4581` (the counts off at a filter of the variants and at a threshold) | |
| A threshold moved back: the counts from the cache with no pass (275) | `filterCounts:338` "VS6 D2 an undo brings back the counts of the filters before, with no calculation"; `st:4924` "a command that changes the filter of the variants does not name the counts among the results removed, and its undo shows them done again"; `st:5070` "counts filled under a threshold of the individuals are not named among the results removed when the threshold changes, and its undo shows them done again" | |
| The filter of regions of a BED file, with popnei's release that has it (277) | none | left without a test: the filter comes with a later release of popnei |
| The key different when any filter of the variants or of the individuals changes (282) | `sk:335`; `sk:343` | |
| `run` sends the `individuals` the fake client gives (283) | `fc:125` "run sends the filters of the project in their order and the individuals kept that the client gives"; `fc:137` "run sends individuals null when the client gives null, the filters removing nobody" | |
| `filterCountRows` of the counts (284) | `fc:160` "filterCountRows of the empty pass gives each filter's counts in the order of the project"; `fc:185` "filterCountRows of the three filters, and a defect for a filter with no count" | |
| `warnings` of the empty pass: `filterKeptNone` naming the MAF filter (285) | `fc:167` | |
| `checkNumbers` (286) | `fc:176` "checkNumbers of the three filters gives the variants of the file and what each kept"; `fc:288` | |
| `refusalText` of a genotype of another ploidy, and of any other refusal, as literals (287) | `fc:337` "a genotype of another ploidy tells to set the ploidy"; `fc:350` "another message gives popnei's message without its full stop, and to count again"; `fc:356`, `fc:367`, `fc:378` | |
| The runner on `panel.nei`: the counts of the empty pass; of the three filters, 1,128 with 1,200 to 1,152, 1,152 to 1,152, 1,152 to 1,128; with the list of 111 before them, 1,096 with 1,200 to 1,117, 1,117 to 1,117, 1,117 to 1,096 (288) | `run:1736` "the counts of the three filters, in their order, from a pass that keeps nothing of the blocks"; `run:1756`; `run:1527` "the counts with the list of 111 before the three filters count over those individuals, and a diversity with the same filters and list gives the same counts" | |
| The store's test that a diversity fills the counts (293) | `st:4894` "runEnded of a result of the analysis of the variants puts the counts countsOf gave under the key of the counts for its request's project, and the counts are done with no Count" | |
| The counts filled from a diversity are those of a Count with the same filters (295) | `run:1527` | |

### The written file

`docs/specs/analyses/writeVariants.md`, "The cases" and "How it is
verified": 18 items, 18 with a test that reaches all of it.

The tests are named by these short names of their files: `st:` for
`src/core/store.test.ts`; `parts:` for
`src/ui/steps/variants/writeParts.test.ts`; `variantSwitches:` for
`e2e/variantSwitches.spec.ts`; `individualLists:` for
`e2e/individualLists.spec.ts`; `variantsOrder:` for
`e2e/variantsOrder.spec.ts`; `run:` for `src/worker/runner.test.ts`;
`ww:` for `src/ui/steps/variants/writeWords.test.ts`; `writing:` for
`e2e/writing.spec.ts`; `individualThresholds:` for
`e2e/individualThresholds.spec.ts`; `cli:` for
`src/worker/client.test.ts`; and `measure:` for `e2e/measure.spec.ts`.

| item | test | note |
|---|---|---|
| The LD filter with no distance: the write locked with the reason of `variantFilterNeeds`, shown without "in the Variants step" beside the button and the field; the Count locked with it, the statistics and the histograms not (394) | `st:5929` "what reads the filters of the variants, the counts and the write are locked with its reason, the statistics ready, and nothing is sent"; `parts:432` "the store's reason of a lock, shown in the Variants step, without the name of the step"; `variantSwitches:167` "IP3 D3 the LD pruning turned on: the distance empty with its reason beside it…; the Count and the Write disabled with the reason; …the histograms and the statistics still calculated" | |
| A list of individuals popnei would refuse: the write locked with the reason of `individualListNeeds`, shown under the list and beside the button; the three checks not locked by it (401) | `st:5555` "the write is locked by the reason of individualListNeeds, and by keptNoneReason once the statistics keep no individual"; `st:4008` "a list to keep that names z, not in the file, locks the analysis that reads the filters of individuals with its reason; the statistics are ready…"; `individualLists:131` "VS7 D1 a list to keep with ind_900 applied: its reason under the list, … beside the disabled Write…"; `variantsOrder:369` "IP2 D3 a list to keep that names ind_900 locks the Count and the histograms of the variants…, and not the statistics of each individual" | the spec's "the three checks of the step are not locked by it" is stale: the Count and the histograms are locked by such a list since stage 4, as the tests check; see "Specs that differ from the code" |
| The filters keep no variant: `writeVars` does not refuse, 3,682 bytes; the write `noVariant`, no Save, its counts in the counts of the filters; Write then disabled with that reason (407) | `run:1996`; `st:5389` "a result with no variant makes the write noVariant, with no file"; `parts:210` "no variant: its line, and no button"; `parts:373` "the Count says the filters keep no variant: Write disabled with the words of a file of no variant" | |
| The variants file holds no variant, or a VCF none of whose variants passed: `noVariant`, told apart by its counts, with the words of an empty source (418) | `parts:238` "no variant of an empty source: the words of a file of no variant, and no button"; `parts:388`; `ww:122` "the variants file holds no variant, or a VCF read with only the passed variants none that passed"; `run:2046`; `writing:575` "VS5 D3 a VCF with no variant that passed, read with only those, written: the words of a file with none that passed, and no Save, and axe" | |
| The filters keep no individual: the write locked (428) | `st:5555`; `writing:413` "VS5 D3 with the focus on Stop of a write that waits for the statistics, a threshold of individuals that keeps none locks Write…"; `individualThresholds:503` "IP2 D3, VS7 D1 thresholds that keep none: …, Write disabled…" | |
| A file written and not saved: Save, no second write; a change of the filters discards it, and the notice says Undo does not bring it back (430) | `st:5581` "startWrite gives null while the file is written and while it is done, and writes again once it is saved"; `st:5365` "the write done, then a command that changes a filter: ready with no file, the notice has writeDiscarded, and its undo does not give the file back"; `writing:450` "VS5 D3 a change of the threshold with the file not saved discards it…" | |
| The statistics the write waited for fail: `error`; Write does nothing after popnei's refusal, starts them again after another failure (436) | `st:5419` "with a threshold and no statistics, startWrite waits for them; their refusal by popnei puts the write in error with ofStatistics, and startWrite then gives null and sends nothing"; `st:5450` "after a workerFailed of the statistics, startWrite starts them again"; `ww:276` "the statistics it waited for, refused and failed" | |
| A write stopped, or left behind and stopped, gives no file; the button to write again (443) | `st:5599` "cancelWrite stops the write in flight, and the write is ready…"; `st:5614` "a write left behind is stopped when the notice is closed, and by a startRun and a startWrite that send"; `writing:279` "VS5 D3 Stop of a write under way gives Write back with the focus on it and no Save…" | |
| A new load of the variants file stops the write at once (445) | `st:5483` "a new variants file loaded cancels the write at once, and the notice has writeStopped"; `cli:2362` "a new load while a file is written cancels the write and every request on the old load, and ends the worker" | |
| A project file saved and opened: nothing of a write in it (447) | `st:5690` "an opening and another version of popnei forget the file, with no notice, and the command after them discards none" | the project the writer is given has no field of a write, so the saved file cannot hold one; the test checks the opening |
| The memory of the tab does not take the file: popnei's plain `Error` a refusal, a trap `workerFailed`; the words of both say what to do and do not blame the variants file (448) | `run:1001` "a plain Error is refused, with its message"; `run:1015` "a trap of the wasm is crashed"; `ww:250`; `ww:263`; `writing:785` "VS5 D3 a write whose worker stopped shows its error and offers Write again, and axe" | |
| The runner in node: at 0.05 a `Blob` of 251,074 bytes and 1,152 of 1,200; with the 111, 156,818 bytes and 1,117 of 1,200; read back with 1,152 variants and 200 individuals, and 1,117 and those 111 in their order (566) | `run:1984` "at 0.05, 251,074 bytes and the counts 1,152 of 1,200, that open again with 200 individuals and 1,152 variants"; `run:2030` "with the list of 111 before the filter at 0.05, 156,818 bytes and the counts 1,117 of 1,200, that open again with those 111 individuals" | the sizes of `js-v0.1.0-dev.3`; those of dev.2, 250,994 and 156,802, are no longer installed |
| The store: a change during a write leaves it behind; a calculation asked for stops it; a late write dropped; the counts of a write fill the counts; `noVariant` holds no file; a change while `done` discards the file; the statistics refused put it in `error`, `startWrite` then `null` (577) | `st:5297` "a command that changes a filter while it is written leaves it behind, with no cancel…"; `st:5614`; `st:5322` "a result that arrives after the command is dropped: ready with dropped, no file…"; `st:5232` "runEnded done: the write is done with what the worker gave, and the cache does not hold it" (the counts done); `st:5389`; `st:5365`; `st:5419` | |
| The words: each row of "Its words" whole; 1.0 GB and 2.0 GB; the parts of the section in each state; no text with "Variants step" (585) | `ww:83` to `ww:349`; `parts:49` to `parts:432`; `parts:488` "no text of any state, for any failure, count or project, says Variants step" | |
| `writeEstimate`: the bytes of a variant; the variants of `variantsKept`, of the read with and without a filter, and none; the individuals of a known list, of `null`, of `byLists`; `bound` and its words; `warn` at `WRITE_WARN_BYTES` and one byte below it; `tooLarge` at `WRITE_MAX_BYTES` from exact counts and not from a bound (593) | `src/core/writeEstimate.test.ts:59` "a variant is one byte per individual and 40 bytes more…"; `src/core/writeEstimate.test.ts:72` to `src/core/writeEstimate.test.ts:129`; `src/core/writeEstimate.test.ts:137` "the warning comes at WRITE_WARN_BYTES and not 100 bytes below it"; `src/core/writeEstimate.test.ts:207` "723,589 variants of 651 individuals, 499,999,999 bytes, one byte below WRITE_WARN_BYTES, give no warning"; `src/core/writeEstimate.test.ts:148` "tooLarge at WRITE_MAX_BYTES from exact counts, and not 100 bytes below nor from a bound"; the words "about" and "at most about" in `ww:83` | the test of one byte below added: the test before was 100 bytes below |
| `sizeText` of 1, 812, 250,994, 999,600, 19,161,178 and 4,300,000,000 bytes (601) | `src/core/writeEstimate.test.ts:177` to `src/core/writeEstimate.test.ts:200` | |
| `writtenName`: with a filter, with a threshold on the individuals alone, with none, and `PANEL.NEI` (603) | `src/core/fileNames.test.ts:44` "panel.vcf.gz with a filter of the variants gives panel.filtered.nei"; `src/core/fileNames.test.ts:52`; `src/core/fileNames.test.ts:60`; `src/core/fileNames.test.ts:68` | |
| Playwright: `panel.nei` at 0.05 written and saved, 251,074 bytes; a VCF with LowQual everywhere written; the measurement (606) | `writing:175` "IP1 D2 the written files of dev.3 on the screen, VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 251,074 bytes…"; `writing:575`; `measure:1968`, `measure:1982`, `measure:1996`, the three measurements "VS5 D5" of the write | the flows run in Chromium and WebKit here; Firefox on GitHub only; the measurements are run by hand |

### The module of the PCA

`docs/specs/analyses/pca.md`, "The colours", "The note of the missing
genotypes", "The cases" and "How it is verified" of the module: 49
items, 48 with a test that reaches all of it.

The tests are named by these short names of their files: `pcap:` for
`src/core/analyses/pcaPanel.test.ts`; `panel:` for
`src/ui/analyses/pca/panel.test.ts`; `mk:` for
`src/charts/marks.test.ts`; `pnl:` for `e2e/pcaPanel.spec.ts`; `pca:`
for `src/core/analyses/pca.test.ts`; `run:` for
`src/worker/runner.test.ts`; `res:` for `e2e/pcaResults.spec.ts`; `st:`
for `src/core/store.test.ts`; `cli:` for `src/worker/client.test.ts`;
`epca:` for `e2e/pca.spec.ts`; and `ik:` for
`src/core/individualsKept.test.ts`.

The flow of Playwright of "How it is verified" is mapped with the panel,
under the screens and the plots below.

| item | test | note |
|---|---|---|
| `colourBy` null: the populations of the grouping, titled "Population"; one group "All individuals" with one population or no file; the reason of `populationsNeeds` and "Meanwhile …" as the note for `noColumn`, `noSuchColumn` and `noPopulation` (1216) | `pcap:199` "the populations of the worked table …"; `pcap:414` "with no metadata file, the one group All individuals …"; `pcap:462` "with the grouping of one population …"; `pcap:437` "… the note made of the reason of noColumn"; `pcap:449` "… the note of noSuchColumn"; `pcap:473` "… the note of noPopulation" | the ring and the legend's "No population (200)" are the scatter's |
| `colourBy` a categorical or binary column: groups by the text of each cell, a number or boolean of an xlsx written with `String` (1236) | `pcap:255` "a categorical or binary column colours by the text of each cell …"; `pcap:284` "the numbers and booleans of an xlsx in a categorical or binary column are groups by their text …" | `pcap:284` added |
| `colourBy` a continuous column: values read with the decimal mark of the read, the point for an xlsx; no highlight (1240) | `pcap:227` "a continuous column of 1,5, 2, 3 and a missing cell, read with the comma …"; `pcap:348` "a continuous column of an xlsx is read with the point …"; `panel:312` "a colouring by values has no highlight" | `pcap:348` added |
| `colourBy` a column the table does not have: the populations and the note; the option stays (1246) | `pcap:400` "colourBy a column the table does not have: the populations, and the note"; `pcap:552` "a new metadata file, or another column of the populations, colours the same result anew" | `pcaColours` gives colours and changes no option |
| `colourBy` a column and no metadata file: "All individuals" and the note (1253) | `pcap:424` "with no metadata file and colourBy country …" | |
| The type decides groups or values, a score of 1 to 5 set as categorical five groups; a missing cell in no group or NaN, "No population" or "No value"; every group of the table in the order of first appearance, a group left with no individual counted 0 (1258) | `pcap:199`; `pcap:211` "a result of i1, i2 and i4 alone … so B keeps its index"; `pcap:219` "… counts 2 and 0"; `pcap:227`; `pcap:255`; `pcap:284` | the legend that leaves a group of 0 out is the scatter's `legendOf` |
| Not offered: the identifiers, a categorical or binary column of more than 1,000 values; a continuous one is (1270) | `pcap:586` "every column but the first, and not a categorical column of 1,001 values …" | |
| A colouring of more than 1,000 groups, of a column or of the populations: one group, the note, the option unchanged (1276) | `pcap:486` "colourBy a categorical column of 1,001 values …"; `pcap:375` "more populations than 1,000, with colourBy null …" | `pcap:375` added |
| The marks `i % 7` and `(i + ⌊i / 7⌋) % 7`, 49 marks, and the line of the marks that repeat past 49 groups (1281) | `mk:30` "group 7 is colour 0 and symbol 1 …", `mk:35` "the 49 groups 0 to 48 have 49 different marks", `mk:48` "group 49 has the mark of group 0"; `panel:406` "the marks that repeat past 49 groups …"; `pnl:310` "… a colouring of 60 groups says its marks repeat …" | |
| `manyMissingNote`: the PCA, not the PCoA, names the individuals above 0.2 (1290) | `pcap:901` "statistics of 0.25 and 0.1 for two individuals name the first"; `pcap:909` "a PCoA, or no statistics, give null; a rate of exactly 0.2 is not above it …" | |
| More than three: the first two and how many more (1301) | `pcap:909` "… more than three are the first two and how many more" | |
| The note is not a warning, and comes and goes with the statistics (1306) | `pca:959`, `pca:991` (the warnings of a result, exactly, none of them the note); `pcap:909` (no statistics, no note) | the panel takes the statistics from the store, `src/ui/analyses/pca/notes.ts` |
| Two individuals: PC1 100%, `s000` at 18.841443681416774 from 355 of 613 variants; the line of one component; three individuals two components; the PCoA of the same two, 100%, 0.1597938144329897, a constant of 0 (1313) | `run:2372` "two individuals, the list before the MAF filter at 0.95 …"; `pcap:655` "one component: PC1 and the line that there is no plot"; `run:2416` (three individuals, two components); `pcap:635` "[2, 1, 3] on two …"; `pnl:1283` "a result of two components: 3D disabled …"; `res:369` "IP10 D3 one component: no plot, the line of the cases, the explained variance and the table"; `run:2631` "the PCoA of two individuals, the list before the MAF filter at 0.95 …" (added) | reached in part: the PCA's `s001`, the opposite of `s000`, is not asserted; in "Left without a test" |
| The filters keep no variant, or the file holds none: popnei's refusals of the PCA and of the PCoA, kept under the key (1326) | `run:2394` "filters that keep no variant are refused with popnei's words of the PCA"; `run:2517` "the PCoA of filters that keep no variant is refused …"; `pca:1091`, `pca:1102`, `pca:1195` (refusalText of both messages); `st:1066` "popnei's refusal is kept under its key …"; `run:2650` "the PCA and the PCoA of a VCF of a header alone are refused, each with its words" (added) | the test of a file with no variant added in e8122ac |
| No variant varies, as with one individual: refused (1331) | `run:2401` "one individual is refused, since no variant varies"; `pca:1116` "no variant with variance" | |
| More than 9,381 individuals: the PCA locked by the file, the PCoA by the list kept; a Run that waits for the statistics ends locked with nothing sent (1333) | `pca:409` "a variants file of 9,382 individuals locks the PCA …"; `pca:671`, `pca:698` (keptNeeds of the PCoA); `pca:730` "the store locks the PCoA of 9,382 individuals … and sends nothing on a Run"; `st:3615` "keptNeeds of the analysis locks it for the individuals kept, and a Run that waited for them ends with nothing sent" | the Run that waits is the store's, as the spec says |
| Kosman distances that no space holds: corrected, `lingoesCorrection`; distances that a space holds, not changed, no warning, the line that they needed no correction (1338) | `run:2440` (the PCoA of `panel.nei`, its constant and share); `pca:1012` "the worked example of popnei's PCoA, corrected, gives lingoesCorrection …"; `pca:1026` "the same result with a constant and a share of 0 gives no warning"; `panel:331` (the line of 39 components not corrected) | the numbers of `four_alleles.vcf.gz` are popnei's, from its release |
| Two individuals with no variant called in both, for the PCoA: refused with the words that name the individual; the PCA places them (1344) | `run:2530` "the PCoA of five individuals, the fifth called only where the others are missing, is refused …"; `pca:1155` "the PCoA's pairs with no distance, four pairs and one"; `run:2665` "the PCA places the five individuals whose pairs with the fifth have no distance" (added): 2 components, 71.32% and 28.68%, `e` at the centre, 2 variants used of 3 | the PCA's test added in e8122ac |
| A cancel ends the worker, the store keeps no result; a restart loses nothing of the PCA's (1347) | `st:1200` "a cancel by the user stops the request, and the analysis is ready at once …"; `cli:306` "a read, two runs, a cancel and the worker started again" | the store's and the client's tests are of any analysis |
| A result that arrives after a change: cached, not shown; `colourBy`, `axes` or `view` changed while it runs keep the key, and the result is drawn (1351) | `st:1870` "a late result: after a command, the result of the old key goes into the cache …"; `pca:1650` "colourBy, the axes and the view leave the key the same"; `pca:2004` "a change of colourBy, the axes or the view while the PCA runs keeps its key …" | `pca:2004` added |
| The method changed: the PCA removed with the notice, the PCoA needs a Run, both cached, undo or the method set back shows the other (1357) | `pca:1562` "the method changes the key"; `pca:2031` "the method changed: the PCA leaves the screen with the notice …" | `pca:2031` added |
| A new metadata file over a PCA that is done: locked, "Reading pops.csv.", in the notice; the read gives the plot back with no calculation and the notice goes; a colour column not in the new file; a read that lacks individuals locks it, and an undo brings the plot back (1360) | `pca:1936` "a new metadata file over a PCA that is done …"; `pca:1953` "a new metadata file that lacks individuals, over a PCA that is done …"; `pca:1662` "the individuals file, its types and the grouping leave the key the same"; `pcap:400`, `pcap:552` (the colours of the new file) | `pca:1936` and `pca:1953` added |
| A new metadata file while the PCA runs: left behind by the notice; a read that gives its key again lets it go on; one that lacks individuals leaves it behind until the notice closes or the load is undone (1373) | `pca:1965` "a new metadata file loaded while the PCA runs …"; `st:6515` "a calculation left behind by the load whose key the read gives back goes on …" | `pca:1965` added |
| The axes chosen beyond the result, `[4, 5, 6]` on three: PC1 to PC3 and the note; the option stays (1384) | `pcap:627` "[4, 5, 6] on three components: the first three, and the note"; `panel:406` (the note of the axes in the panel) | |
| The LD filter of the Variants step turned off while the PCA follows it: removed with the notice; a Run with no LD filter and `pruningOff`; an undo brings the plot back (1389) | `pca:2056` "the LD filter of the Variants step turned off while the PCA follows it …"; `pca:959` "a job with no LD filter gives pruningOff …" | `pca:2056` added |
| A filter of the Variants step of a kind the PCA has of its own: the key, the plot stays, no notice names it (1394) | `pca:1612` "a filter of the Variants step of a kind the PCA has of its own leaves the key the same"; `pca:2075` "… the plot stays and the notice does not name it" | `pca:2075` added |
| A filter of the PCA's own set at the value of the dataset's: the same key, the plot stays, a step of Undo (1397) | `pca:1637` "a filter of the PCA's own set to the value the dataset's already has leaves the key the same"; `pca:1797`; `pca:2086` "the PCA's own missing data filter set at the 0.1 of the step …"; `epca:559` (set for the PCA at 0.1, the result stays) | `pca:2086` added |
| An LD filter over a file not sorted: refused, the words say to sort the file or turn the filter off where it was set (1402) | `run:2416` "a VCF whose second variant comes before the first is refused under an LD filter …"; `run:2545` (the PCoA); `pca:1127` "… the PCA's own: ldOrderText with the LD filter of the PCA"; `pca:1133` "the same, the dataset's LD filter …" | |
| The filters of individuals leave fewer than two: one refused by popnei, none cannot start (1405) | `run:2401`; `run:2504` "the PCoA of one individual is refused before the pass"; `pca:1116`, `pca:1175` (their words); `pca:2106` "filters of individuals that keep none: the PCA cannot start …"; `ik:134` "lists that keep none …" | `pca:2106` added |
| `pcaFilters`, the twelve rows in order as literals; the same frozen value twice; the dataset's LD with no distance (1560) | `pca:214` to `pca:302`, one test a row; `pca:311` "the same frozen value twice for the same inputs"; `pca:280`, `pca:287` (the two rows of the LD with no distance) | |
| `run`, with a fake client: the filters, the method, 10 components, the list `null` and a list (1571) | `pca:369` "the job of a new project with the PCA's own LD filter …"; `pca:384` "the PCoA with the list of the individuals the client gives" | |
| The key, row by row; `keyInputs` of an empty project without reading `p.variants` (1574) | `pca:1489` to `pca:1725`, a test a row; `pca:1734` "keyInputs of an empty project …, without reading p.variants" | |
| `needs`: the limit at 9,382 and 9,381; the PCoA not locked; each reason of `individualsNeeds`; the LD filter with no distance, the PCA's and the step's, and their order; `pruningDistanceReason`; the store asks no `variantFilterNeeds`; the list naming one not in the file; no file, no column (1578) | `pca:409`, `pca:427`, `pca:435`, `pca:453`, `pca:476`, `pca:491`, `pca:495`, `pca:507`, `pca:518`, `pca:534`, `pca:547`, `pca:565`; `pca:613` "the store asks no variantFilterNeeds of the PCA …"; `pca:625` "… the PCA and the diversity have the same reason, that of the list" | |
| `keptNeeds`: 9,382 with no filter, a list of 9,381, a threshold keeping 9,390 and 100; the PCA null; the store's Run (1599) | `pca:671`, `pca:686`, `pca:698`, `pca:719`; `st:3615` | |
| The key beside its table: the LD filter with no distance, following and own; the values kept while it follows; set again with 50000; the step's missing data under the PCA's own; own 0.1 over 0.1 (1611) | `pca:1758`, `pca:1764`, `pca:1773`, `pca:1785`, `pca:1797` | |
| `parseOptions`: the defaults back, each accepted, each refused (1622) | `pca:760` "the defaults come back whole …"; `pca:768` "accepts %s"; `pca:794` "refuses %s" | |
| `warnings`: `pruningOff` of the PCA and of the PCoA, none with an LD filter; `fewVariants` at 150, none at 200; `lingoesCorrection` of popnei's worked example, none with 0 (1634) | `pca:959`, `pca:968`, `pca:983`, `pca:991`, `pca:1012`, `pca:1026` | the mean of the squares and the share are reached through the words, "32%" and "0.36" |
| `checkNumbers`: the PCA of the flow, and one component (1650) | `pca:1046`, `pca:1059` | |
| `pcaColours` on the worked table, each case of the list (1654) | `pcap:199`, `pcap:211`, `pcap:219`, `pcap:227`, `pcap:400`, `pcap:414`, `pcap:424`, `pcap:437`, `pcap:473`, `pcap:486` | |
| `colourColumns` (1671) | `pcap:586` | |
| `axesShown`, `[4, 5, 6]` on three and `[2, 1, 3]` on two (1673) | `pcap:627`, `pcap:635` | |
| `pcaCsv` and `varianceCsv` of the flow as literals; a group named `a,"b"` (1675) | `pcap:754` "the CSV of the table and of the explained variance of the flow …"; `pcap:791` "a group named a,\"b\" is quoted …" | |
| `pcaDescription` of the flow by `popcat` with p1 highlighted, and by `altitude` (1677) | `pcap:834` "the 2D plot of the flow, coloured by popcat, with p1 highlighted …"; `pcap:848` "coloured by altitude of panel_meta.csv …" | |
| `manyMissingNote`: 0.25 and 0.1 name the first; a PCoA or no statistics `null` (1681) | `pcap:901`, `pcap:909` | |
| `refusalText`, each row of "Its words" (1683) | `pca:1091`, `pca:1102`, `pca:1116`, `pca:1127`, `pca:1133`, `pca:1144`, `pca:1155`, `pca:1175`, `pca:1195` | |
| `crashText`: 4,000, 2,264 and 2,263, the PCA and the PCoA (1693) | `pca:1293`, `pca:1299`, `pca:1308` | |
| `script` of the project of the flow (1697) | `pca:1340` "the project of the flow, panel.nei with the PCA's own LD filter, gives the lines of the spec" | |
| The numbers of the flow's runs, asserted as literals by the runner: the PCA and the PCoA with the LD filter, cut to 10, a second run of the PCoA the same, and the refusals of "The request" (1700, 1811) | `run:2292` "the PCA with its own LD filter: popnei's numbers cut to 10 components …"; `run:2329` "the PCA with the filters of a new project …"; `run:2440` "the PCoA with the PCA's own LD filter … a second run the same to the last bit"; `run:2486` "the PCoA of the filters of a new project …"; `run:2394`, `run:2401`, `run:2416`, `run:2504`, `run:2517`, `run:2530`, `run:2545` | |
| The fixture `panel_meta.csv`: `IID`, `popcat` and `altitude`, 100 + 10 × i, `NA` for the last three (1822) | `pcap:754` (`s000,100` and `s199` with no value); `pcap:834` (p0, p2 and p1 of 48, 84 and 68); `pcap:848` "coloured by altitude of panel_meta.csv …": from 100 to 2060, 3 individuals with no value | |

## The workers

The specs of the two workers and the messages between them and the page.
`docs/specs/worker/files.md` is left out: it is the spec of xlsx_rs, and
its cases are mapped in the repository of xlsx_rs. Mapped at commit
cfe1300; the tests marked "added" are in commits 534d705 and cfe1300.

### The protocol

`docs/specs/worker/protocol.md`, "The cases" and "How it is verified":
10 items, 9 with a test that reaches all of it.

The tests are named by these short names of their files: `run:` for
`src/worker/runner.test.ts`; `cli:` for `src/worker/client.test.ts`;
`st:` for `src/core/store.test.ts`; `keys:` for `src/core/keys.test.ts`;
`prj:` for `src/core/project.test.ts`; and `variantHistograms:` for
`e2e/variantHistograms.spec.ts`.

| item | test | note |
|---|---|---|
| Only popnei's refusal of its input, a plain `Error`, is of kind `popnei`; a file the browser could not read is `reopenFailed`; a `RangeError` or a trap is `workerFailed`, the worker started again, and the store does not keep it (596) | `run:1001` "a plain Error is refused, with its message"; `run:1008` "a RangeError, of a memory that cannot grow, is crashed"; `run:1015` "a trap of the wasm is crashed"; `run:700` "a file the browser refuses to read at a run with the same filters is reopenFailed, with popnei's message"; `cli:791` "refused: the run fails with popnei's message, and the worker goes on"; `cli:822` "crashed: the run fails as workerFailed, and the worker is started again"; `st:1066` "popnei's refusal is kept under its key …"; `st:1091` "another failure is kept until the next change …" | |
| One refusal of popnei depends on more than the data: a block the memory could not hold, a plain `Error`, kept as a refusal, and a new load gives it another key (612) | `run:1001`; `st:1066`; `keys:601` "gives another key when the variants file is loaded again" | in part: no test gives popnei a block its memory cannot hold; see "Left without a test" |
| A mistake of our runner outside a call to popnei, a `TypeError` of ours, reaches the worker's error handler and is `workerFailed` (621) | `src/worker/runnerWorker.test.ts:100` "a TypeError of the runner inside a request is posted as crashed …"; `src/worker/runnerWorker.test.ts:117` "a TypeError outside a request reaches the listener of errors …"; `run:768` "what told throws is thrown by run, that very value …"; `cli:832` "an error event: the run fails as workerFailed, the event is stopped, and the worker is started again" | |
| A threshold outside its range is refused by the validation of a project file; a command is never given one (624) | `prj:2220` "a threshold of %d" (-0.1 and 1.5); `prj:2228` "a threshold of a filter of the individuals above 1"; `prj:406` "a threshold above 1" (a command given one is a defect) | |
| Filters that keep no variant: the diversity and the statistics of each individual end `popnei`; the PCA "there are no variants to do a PCA with"; the counts and a write do not, the write a file of 3,682 bytes with `numVars` 0 (627) | `run:833` "filters that keep no variant are refused with popnei's counts of the pass"; `run:882` "IP10 D3 the statistics of each individual of a VCF of a header alone are refused as a file with no variant" (added); `run:2394` "filters that keep no variant are refused with popnei's words of the PCA"; `run:1756` "the counts of filters that keep no variant are a result, not a refusal"; `run:1996` "at 0.05 with a MAF filter at 0, a file of no variant, 3,682 bytes, written and not refused"; `cli:791` | since 28 September the statistics take no filter, so they meet no variant only in a file that holds none, which the added test gives, as the spec says since commit fb783ac |
| A variant with no called genotype is in no bin of the histograms, whose counts can add up to fewer than `numVars` (643) | `variantHistograms:1053` "VS6 D2 a variant with no called genotype gives the warning above the caption, and is in no bin" | |
| Types have no test of their own: the compiler checks them, and `tsc -b` with `tsconfig.core.json` that `protocol.ts` names nothing of the browser (652) | the check `npm run typecheck` | a check, not a test, as the spec says |
| The fields of the filters are popnei's arguments, and the boundary at 0.05 (655) | `run:278` "the missing data filter at 0.05 keeps the 39 variants whose missing rate is exactly 0.05, which 0.045 drops"; `run:225` "… with the missing data filter at 0.05 keeps 1152 of its 1200 variants"; `run:439` "the observed heterozygosity filter at 0.5 keeps 1098 …"; `run:451` "the LD filter at an r² of 0.1 within 1000 base pairs keeps 562 …" | |
| The counts of a pass in the order of the job (658) | `run:1736` "the counts of the three filters, in their order …"; `run:327` "the same filters in another order open the file again, and are counted in their order" | |
| The list of individuals put before the filters of the variants, which then count over the individuals it keeps (659) | `run:1466` "popnei holds the list as the first step and the filter after it"; `run:1315` "with the list of 116 before the filter at 0.05 … the filter keeps 1,103 of 1,200"; `run:1527` "the counts with the list of 111 before the three filters count over those individuals …" | |

### The messages

`docs/specs/worker/messages.md`, "The cases" and "How it is verified":
14 items, 14 with a test that reaches all of it.

The tests are named by these short names of their files: `run:` for
`src/worker/runner.test.ts`; `st:` for `src/core/store.test.ts`; `prj:`
for `src/core/project.test.ts`; `msg:` for
`src/worker/messages.test.ts`; `cli:` for `src/worker/client.test.ts`;
`ifile:` for `src/worker/individualsFile.test.ts`; `skeleton:` for
`e2e/skeleton.spec.ts`; `writing:` for `e2e/writing.spec.ts`;
`individualStats:` for `e2e/individualStats.spec.ts`; and
`variantHistograms:` for `e2e/variantHistograms.spec.ts`.

| item | test | note |
|---|---|---|
| A VCF not of the ploidy given opens with the ploidy given, its first run refused with popnei's message, kept under its key (492) | `run:800` "a VCF of tetraploids read with ploidy 2 opens with its 12 individuals and its diversity is refused"; `st:1066` | |
| A ploidy above 255 refused by popnei at the open; a project never holds one (499) | `run:845` "a ploidy above 255 is refused by popnei at the open"; `prj:2265` "a ploidy of %d in the read options" (0 and 256) | |
| A `ready` of another version with other fields gives `otherProtocol`; a `protocol` not a number is refused (501) | `msg:572` "a ready of protocol 4 with fields of its own … is otherProtocol and not a refusal of its fields"; `msg:592` 'a ready of protocol "1"'; `msg:1081` 'a ready of protocol "3"' | |
| An answer with a well formed id of no request passes the check; the client refuses it (504) | `msg:138` "parseFromRunner accepts %s" (the check takes any id); `cli:2123` "an answer of the light worker of another id is a defect, not the answer of the read"; `cli:873` (test.each), its case of an answer of another request's id; `cli:713` "a progress of an id that is not running is a defect, and the worker is ended" | |
| An empty individuals file, an xlsx refused `encrypted`, and a files wasm not downloaded, `xlsxReaderNotLoaded`, are answers, not failures of the worker (507) | `msg:178` "parseFromFilesRunner accepts %s" (an individuals file refused, `empty`); `msg:1797` "parseFromFilesRunner accepts the refusal %o" (the seven of the xlsx); `ifile:278` "a refusal of the reader of the text is the failed read"; `ifile:496` (test.each) "the refusal %o of the files wasm is the failed read" | |
| A read of an xlsx whose answer has a `found`, or of a CSV with none, passes the check; core records the read under the options it was asked with (511) | `msg:178` (a read with a `found`); `msg:1790` "parseFromFilesRunner accepts a read of an xlsx, whose found is null …"; `prj:1208` "records the read of an xlsx, read with no options"; `prj:1239` "gives the project itself for a read of other options" | the check is given no request, so the two messages pass whatever was asked |
| A `written` of no variant, `numVars` 0, passes the check (516) | `msg:753` "parseFromRunner accepts a written of no variant, and keeps its Blob" | |
| A `run` or a `write` with an empty `individuals` passes the check; the runner answers it `badRequest` (519) | `msg:768` "parseToRunner accepts a run and a write whose list of individuals is empty, which the runner refuses"; `run:1373` "an empty list of individuals is badRequest, before any filter is put"; `run:2139` "a write of another load, … or with an empty list of individuals is badRequest"; `run:2580` "a PCA with an empty list of individuals is a badRequest" | |
| Every kind is accepted: each message, the five jobs, the PCA and the PCoA with and without a list, the progress, the result, a write and its written, `reopenFailed`, the two `readIndividuals`, a read with and without `found`, a refusal of each kind; the structured clone of any message of the two answers (540) | `msg:123`, `msg:131`, `msg:138`, `msg:171`, `msg:178` (the messages of stage 2); `msg:723`, `msg:733`, `msg:738`, `msg:748`, `msg:753`, `msg:763` (stage 3); `msg:1982` "parseToRunner accepts a run of %s" (the PCA and the PCoA, with `individuals` null and a list), `msg:1998` (their results), `msg:2017` "the progress of a PCA"; `msg:1783` "… a readIndividuals of an xlsx, whose csv is null", `msg:1790`, `msg:1797`; the properties `msg:211`, `msg:222` (every kind of refusal of the reader drawn), `msg:780`, `msg:805`, `msg:2182` | |
| Each refusal, with its kind and its path (555) | `msg:235` to `msg:525`, one test per refusal of stage 2 named in the item (the inherited `id` at `msg:338`, the progress with `done` and `total` at `msg:400` and `msg:412`); `msg:815` to `msg:1049`, one per refusal of stage 3 (`individualFilters` `msg:815`, no `individuals` `msg:828`, no `passStats` `msg:851`, `numVars` at the top `msg:866`, `regions` `msg:879`, 199 of `obsHetRate` `msg:901`, `individuals` of 199 `msg:915`, `binEdges` `msg:932`, a `variantChecks` with a filter `msg:1004`, `wrongSize` `msg:1018`, an `ArrayBuffer` `msg:1049`); of the PCA, `"tsne"` `msg:2022`, `numCompsKept` 1.5 `msg:2036`, `projections` a list `msg:2074`, 1,999 numbers `msg:2087`, 9 percentages `msg:2104`, `numVarsUsed` null `msg:2121`, `lingoesConstant` null `msg:2129`; `msg:1672` "a message with one leaf deleted, one field added beside it, or one leaf of the wrong type is refused at that leaf" | |
| The version: protocol 2 gives `otherProtocol` with 2 from both checks, 4 with 4, `"3"` `wrongType` (586) | `msg:1163` (test.each) "a ready of protocol 2, stage 3's, with no other field, from the %s worker"; `msg:558`, `msg:565` "a ready of protocol 4 with no other field"; `msg:1081` 'a ready of protocol "3", from the %s worker' | |
| The xlsx: `csv` `{}` `missingFields`; a binary `one` the number 1 `wrongType`; a `found` of a CSV without `undecodedLine` `missingFields`; an `emptySheet` without its sheet `missingFields` (589) | `msg:1825`, `msg:1837`, `msg:1855`, `msg:1874` | |
| `describeMessageError` names the path and the kind; of the `wrongSize`, the sentence of 3593 and 3,594 bytes (594) | `msg:610` "names the path and the kind of the message"; `msg:1035` "a wrongSize is described as a size in bytes, not as a list" | |
| A `File`, the typed arrays and a `Blob` arrive through a real worker, seen by the flow of the walking skeleton and that of the Variants step (600) | `skeleton:161` "WS9 D4 panel.nei, filtered at 0.05 …"; `writing:175` "IP1 D2 …, VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 251,074 bytes …"; `individualStats:154` "IP2 D3, VS7 D1 the statistics of panel.nei …"; `variantHistograms:124` "VS6 D2 the histograms calculated …" | |

### The runner

`docs/specs/worker/runner.md`, "The cases" and "How it is verified": 45
items, 45 with a test that reaches all of it.

The tests are named by these short names of their files: `run:` for
`src/worker/runner.test.ts`; `st:` for `src/core/store.test.ts`;
`measure:` for `e2e/measure.spec.ts`; `ik:` for
`src/core/individualsKept.test.ts`; `variantHistograms:` for
`e2e/variantHistograms.spec.ts`; `cli:` for `src/worker/client.test.ts`;
`diversity:` for `e2e/diversity.spec.ts`; `writing:` for
`e2e/writing.spec.ts`; and `variants:` for `e2e/variants.spec.ts`.

| item | test | note |
|---|---|---|
| A VCF of another ploidy: opened with 12, its diversity refused, kept under its key (961) | `run:800`; `st:1066` | |
| A file not of its format, `bad.vcf`, refused at the open; a run on it `badRequest` (970) | `run:817`, `run:825` "bad.vcf is refused at the open as …"; `run:954` "a run after an open that popnei refused is badRequest" | |
| Filters that keep no variant: popnei's message with the counts (978) | `run:833` | |
| A VCF with no variant, with no filter and at 0.1 (986) | `run:899` "WS8 D2 a VCF of a header alone opens, and its diversity is refused as a file with no variant …" | |
| A VCF none of whose variants passed, read with only the passed ones, and with all (993) | `run:920` "a VCF whose every variant fails FILTER is refused …" | |
| A population of fewer than 20 is not refused, its values NaN (1004) | `run:525` "a population of fewer than 20 individuals is not refused, and its values are NaN" | |
| A population naming an individual the file does not have, or with no individual, refused by popnei (1008) | `run:858` "a population that names an individual the file does not have is refused with popnei's message"; `run:867` "IP10 D3 a population with no individual is refused with popnei's message" (added) | |
| The file changed on the disk after the pick (1014) | `run:621` to `run:755` (a file that no longer reads); `run:1840`, `run:1851`, `run:2200` (the same in the passes of stage 3); `measure:448`, `measure:485` (point R) | point R is a measurement |
| The filters keep no variant: the diversity and the statistics refused, the counts a result, the write a file of no variant (1026) | `run:833`; `run:882` (added); `run:1756`; `run:1996` | the statistics as in the protocol, above |
| The filters keep no individual: core sends no job; an empty list `badRequest` before any step (1031) | `run:1373`; `run:1394` "a job of the histograms or of the counts with an empty list …"; `run:994`; `run:2139`; `st:3748` "with a threshold of 0.01, the statistics keep no individual: … nothing is sent for it …" | |
| A list before a threshold of the variants: the counts over the individuals kept, 1,200 to 1,103 with the list of 116, 1,152 without (1034) | `run:1315`; `run:225` | |
| An individual with no called genotype: 1 and NaN, in the list only with no threshold of heterozygosity (1040) | `run:1231` "a VCF of two individuals, the second missing at both variants …"; `ik:248` "individuals that call no genotype are all removed by any heterozygosity threshold, and kept without it" | |
| A variant with nothing called: in no bin (1043) | `variantHistograms:1053` | the flow goes through the runner in the worker |
| A cancel ends the worker, inside a pass and a write; the runner does nothing (1045) | `cli:487` "the read of a variants file that runs ends its worker"; `cli:2354` "a cancel of a write that runs ends the worker …"; `diversity:1003` "WS8 D3 a Stop in the middle of a pass …"; `writing:279` "VS5 D3 Stop of a write under way …" | |
| Progress at the start of each pass, every 4 MiB, at the end, never before the first `run` or `write` (1049) | `run:234`, `run:246`; `run:2081` "the progress of each of the five writes …"; `run:260` "a file of 0 bytes is refused at the open, so no run tells a progress …"; `run:621` (a second range after 4 MiB); `diversity:742` | the open takes no function for the progress |
| The open (1232) | `run:186`, `run:197` | |
| The diversity, with no filter and at 0.05 (1234) | `run:209`, `run:225` (each for `panel.nei` and `panel.vcf.gz`) | |
| The progress (1239) | `run:234` "told is given popnei's two calls of a diversity over panel.nei, as they came" | |
| The boundary at 0.05 (1241) | `run:278` | |
| A change of the filters (1247) | `run:291` | |
| A filter refused midway (1251) | `run:309` | |
| An open again that popnei refuses (1254) | `run:656` | |
| A file that no longer reads: reading, throwing, short, and `panel.vcf.gz` cut short (1262) | `run:692`, `run:700`, `run:711`, `run:722`, `run:735`, `run:744`, `run:755`; `run:621` | |
| What `told` throws (1281) | `run:768`; `run:781` | |
| The order of the populations (1284) | `run:355` | |
| popnei's refusals, as literals (1286) | `run:800`, `run:817`, `run:825`, `run:833`, `run:899`, `run:920` | |
| The defects are `badRequest`, a `write` before the `open` among them (1296) | `run:944`, `run:949`, `run:954`, `run:971`, `run:979`, `run:985`, `run:994`; `run:2132` "a write before the open is badRequest" | |
| `answerOfThrown` (1300) | `run:1001`, `run:1008`, `run:1015`, `run:1023`, `run:1030` | |
| `transferablesOf` of each of the five analyses; a view of part of a buffer throws (1304) | `run:495`, `run:515`; `run:1863`, `run:1870`, `run:1878`, `run:1898`, `run:1906`; `run:2586` (the PCA) | |
| The statistics of each individual with no filter, the fixture of core, and the VCF of two individuals (1416) | `run:1196`, `run:1212`, `run:1231` | |
| The diversity with the list of 116 (1432) | `run:1315` | |
| The diversity with the list of 111, and its written file (1439) | `run:1335`; `run:2030` "with the list of 111 before the filter at 0.05, 156,818 bytes …" | the size of `js-v0.1.0-dev.3` |
| The steps with the list: opened again or not (1446) | `run:1414`, `run:1432`, `run:1447` | |
| The histograms of the variants, with no list and with the list of 111 (1451) | `run:1548`; `run:1489` | |
| The counts of the filters, with no list, with the list of 111, and filters that keep none (1460) | `run:1736`; `run:1527`; `run:1756` | |
| The written file: the five files, the progress, what `told` throws (1470) | `run:1969`, `run:1984`, `run:1996`, `run:2016`, `run:2030`; `run:2081`; `run:2100`, `run:2113` | the sizes of `js-v0.1.0-dev.3`, as the item gives them |
| The PCA with its own LD filter (1494) | `run:2292` | |
| The PCA with the filters of a new project (1505) | `run:2329` | |
| A job with `numCompsKept` 3 (1509) | `run:2352` | |
| Two individuals, the list before the MAF filter at 0.95 (1511) | `run:2372` | |
| The refusals of the PCA: no variant kept, one individual, a VCF not sorted with and without the LD filter (1518) | `run:2394`, `run:2401`, `run:2416` | |
| The PCoA, a second run the same to the last bit, and its three refusals (1526) | `run:2440`; `run:2504`, `run:2517`, `run:2530` | |
| The steps of a PCA (1541) | `run:2554` | |
| In the browser: panel.nei opens; the diversity at 0.05 and at 1; the bar; typed arrays; `tetraploid.vcf.gz`; a file written at 0.05 with the bytes of node; a `Blob` that outlives its worker (1547) | `variants:150` "WS7 D3 panel.nei picked with the button shows 200 individuals and ploidy 2 …"; `diversity:363` "WS8 D2 the filter moved to 1 … Run at 1 gives p0 0.3519 …"; `diversity:742` "WS8 D2 a calculation under way shows its bar …"; `diversity:682` "WS8 D2 tetraploid.vcf.gz read with ploidy 2 is refused in the panel's words …"; `writing:175` (251,074 bytes, compared with those of `writeVars` in node); `writing:866` "VS5 D4 a file written from the big VCF is saved after the worker that made it was ended …" | |
| A file changed on the disk, each engine and each way of rewriting (1567) | `measure:448` "the File of a pick is on the disk: the copy deleted is not read"; `measure:485` "rewrite …" | a measurement, in the report of stage 2, "Point R" |

### The client

`docs/specs/worker/client.md`, "The cases" and "How it is verified": 25
items, 25 with a test that reaches all of it.

The tests are named by these short names of their files: `cli:` for
`src/worker/client.test.ts`; `reads:` for `src/ui/reads.test.ts`;
`entry:` for `e2e/entry.spec.ts`; `prj:` for `src/core/project.test.ts`;
`measure:` for `e2e/measure.spec.ts`; `variants:` for
`e2e/variants.spec.ts`; `diversity:` for `e2e/diversity.spec.ts`;
`skeleton:` for `e2e/skeleton.spec.ts`; and `writing:` for
`e2e/writing.spec.ts`.

| item | test | note |
|---|---|---|
| Two picks before the first file is open: the second cancels the first, and the entry records nothing for it (602) | `cli:387` "a read of a third load cancels the open of the second at once"; `reads:367` "a variants file replaced while it is read cancels its read …"; `reads:525` "a cancelled read records nothing" | |
| A function of the page that cancels or throws while the client answers (606) | `cli:535` "a cancel made inside onPopneiReady is seen …"; `cli:775` "an onPopneiReady that throws …"; `cli:691` "an onProgress that throws: the throw reaches the caller …"; `entry:138` "WS7 D2 an error thrown from a handler shows the error bar as an alert" | |
| An undo to a load already read, then Run (616) | `cli:416` "a run on a load read before, while the worker holds another, ends the worker …" | |
| The variants file changed on the disk since the pick: `reopenFailed` for a run, an open for a run, a first open (619) | `cli:567`, `cli:585`, `cli:604`, `cli:622`; `cli:642` "a first open that ends reopenFailed fails the read with it …"; `cli:1835` "a read waiting on an open sent for a run gets reopenFailed …"; `cli:2568` "a write waiting on an open sent for it fails with reopenFailed …"; `reads:557` "a reopenFailed of the first open is recorded as a failure of the worker …"; `prj:3496` "projectNeeds gives the words of a variants file the browser can no longer read" | what an engine does is point R, `measure:485` |
| A tab left open across a deploy: two failed starts give `couldNotStart` (631) | `cli:1802` "a calculation worker whose script does not load … twice: couldNotStart …"; `cli:1819` the same for the light worker; `cli:1028` "a new Worker that throws is a failed start, and twice gives the worker up" | |
| A request of a load whose `File` the client does not hold; the two defects of the client's own calls thrown (637) | `cli:733`, `cli:742`, `cli:752` "… fails at once as a defect"; `cli:2502` "a write of a load with no File, or whose first open was refused …"; `cli:2175` "a crash during the first open of a load fails its read, and a run on it is then a defect"; `cli:604` "the next run on that load is not a defect …"; `cli:405` "a read of a known load with other read options is a defect, thrown"; `cli:440` "addFile of a load id the client already holds is a defect, thrown" | |
| A worker given up answers every request at once, and the other goes on (648) | `cli:948` "no ready twice gives the worker up: every request fails, and the light worker still reads" | |
| A new load while a file is written (650) | `cli:2362` "a new load while a file is written cancels the write and every request on the old load …" | |
| A large write with runs waiting behind it (654) | `cli:2377` "a written of 25,000,001 bytes …"; `cli:2386` "a run given between the answer of a large write and the new worker's open waits in the queue …"; `cli:2433` "the outcome of a large write is given before the restart …" | |
| A large write whose load is no longer the next one (659) | `cli:2463` | |
| A write that ends while its `Run` was cancelled is never seen (663) | `cli:2354` "a cancel of a write that runs ends the worker, and the written it posted after goes to no one" | |
| A worked sequence (689) | `cli:306` "a read, two runs, a cancel and the worker started again" | |
| The load (704) | `cli:373` "a read of another load ends the worker …"; `cli:387`; `cli:405`; `cli:1739` "no worker is sent a second open, nor a request of another load than its open's" | |
| Cancelling (710) | `cli:460`, `cli:469`, `cli:487`, `cli:499`, `cli:521`, `cli:535` | |
| The reopen that fails (717) | `cli:567`, `cli:585`, `cli:604`, `cli:622` | |
| A write (724) | `cli:2239` "a write is sent with its key and job …"; `cli:2293` (test.each) "… fails the write as a defect …"; `cli:2325` "a written to a run fails the run as a defect …"; `cli:2343`; `cli:2354` | |
| The restart after a large write (733) | `cli:2377`; `cli:2409` "a written of exactly WRITE_RESTART_BYTES, 25,000,000 bytes, ends no worker …"; `cli:2419` "a write that popnei refused fails with its message, and the worker is started again …" | |
| The restart after a large PCA (747) | `cli:2702` "a result of a PCA of 701 individuals of its list …"; `cli:2718` "a PCA of 700 … ends no worker"; `cli:2733` "a PCoA with individuals null over a load whose opened gave 701 ends the worker"; `cli:2763` "… 701 that popnei refused … started again"; `cli:2788` "a PCA of 701 that ends reopenFailed … not ended"; `cli:2748`, `cli:2777`, `cli:2807`, `cli:2829` | |
| Progress (753) | `cli:666` "each progress of a run reaches its onProgress as it came …"; `cli:713` | |
| A defect of the page (757) | `cli:733`, `cli:742`, `cli:752`, `cli:775` | |
| Failures, one test per row of the table (761) | `cli:791`, `cli:806`, `cli:822`, `cli:832`, `cli:847`, `cli:857`, `cli:873` (test.each, a result of another analysis among its cases), `cli:918`, `cli:930`; `cli:2293`, `cli:2325` for the write; `cli:1886` (test.each), `cli:1945` for the light worker | |
| Starting (765) | `cli:948`, `cli:982`, `cli:994`; `cli:1009` "a ready of protocol 2, stage 3's, fails every request with protocolMismatch, and no other worker is made"; `cli:2022` "the ready stops the timer …" | the test sends protocol 2, another than `PROTOCOL_VERSION`, 3, as the spec says since commit fb783ac |
| Properties, with fast-check, writes and large writes among them (776) | `cli:1707`, `cli:1715`, `cli:1723`, `cli:1731`, `cli:1739`, `cli:1747`; `cli:1766` "the worker is ended after a write larger than WRITE_RESTART_BYTES or refused …" | |
| In the browser, stage 2: the real workers, a `File` read, a Cancel in the middle and the next run, the time of a restart (786) | `variants:150`; `diversity:1003` "WS8 D3 a Stop in the middle of a pass leaves the panel ready …"; `skeleton:236` "WS9 D4 a calculation stopped in the middle of a pass …"; `measure:656` "the restart on the large …" | the restart is a measurement |
| In the browser, stage 3: a file written and saved with the runner's bytes, and one saved after its worker was ended by a Stop (791) | `writing:175`, whose bytes it compares with those of `writeVars` in node; `writing:866` | |

### The reader of the metadata file

`docs/specs/worker/individuals.md`, "The cases" and "How it is
verified": 97 items, 94 with a test that reaches all of it. Each row of
the three tables of cases of the spec is an item, and so is each case of
the lists of "How it is verified".

The tests are named by these short names of their files: `csv:` for
`src/worker/individuals/csv.test.ts`; `prj:` for
`src/core/project.test.ts`; `ind:` for `e2e/individuals.spec.ts`;
`ifile:` for `src/worker/individualsFile.test.ts`; `typ:` for
`src/worker/individuals/columnTypes.test.ts`; `sht:` for
`src/worker/individuals/sheet.test.ts`; `cells:` for
`src/worker/xlsxCells.test.ts`; `prop:` for
`src/worker/individuals/properties.test.ts`; `measure:` for
`e2e/measure.spec.ts`; and `xlsx:` for `e2e/xlsx.spec.ts`.

#### The cases

| item | test | note |
|---|---|---|
| A file with no header: its first individual becomes the names of the columns, and the check against the variants names it as missing (933) | `csv:689` "a file with no header: its first individual is taken for the names of the columns, and is not a row" (added); `prj:3241` "gives the individuals found, all those missing in the order of the variants file …" | |
| A VCF of less than 20 MB picked by mistake is `variantsFile`; a VCF cut at a line of genotypes is read as a table and refused (937) | `csv:648` "a text whose first line starts with ##fileformat=VCF or #CHROM is a variantsFile"; `csv:450` "a VCF whose first lines were cut away … is read as a table and refused"; `ind:1256` "WS8 D1 a VCF picked as the metadata file is refused as a variants file" | |
| A title line above the header: `Tabla 1;;` an `unnamedColumn` 2; `Tabla 1` read with `,`, refused at the first comma or read as one column (942) | `csv:417` "a title line of three cells over the header is an unnamedColumn"; `csv:424` "a title line of one cell over the header is read with , and refused at the first row with a comma, or read as one column" | |
| The separator `,` set on a file of `;`: a decimal comma a ragged row; no comma, one column (950) | `csv:342` "a set separator is used, and a Spanish file of ; is found"; `csv:438` "the separator , set on a file of ; with no comma reads each line as the name of one column" | |
| A decimal comma set with the separator `,`: the numbers in quotes (956) | `csv:359` "a decimal comma with the separator , needs quotes, and is read" | |
| The encoding set to UTF-8 on a Windows-1252 file: `Espa�a` (958) | `ifile:116` "the Windows-1252 file with the encoding set to UTF-8 has the replacement character" | |
| A file saved by Excel for Mac in Mac Roman: an accented name read as other characters by both encodings, the populations still grouped (961) | `ifile:320` "an accented name of Mac Roman is read as other characters by both encodings offered, and the populations are still grouped" (added) | what Excel for Mac writes is still not checked; the test gives Mac Roman, the case the item names |
| An individual named `NA` or `-` is a name (966) | `csv:313` "NA and - in the first column are names, and NA in the header a name"; `csv:265` | |
| A binary column of `1` and `01`: `1` coded 1 by the code units (968) | `typ:192` "two numbers of one value, 1 and 01, fall to the code units" | |
| A column all missing is categorical with no value; as the column of the populations, every individual in none (971) | `typ:123` "one value, and no value at all, are categorical"; `ind:1163` "WS8 D1 a column empty for every individual of the variants file gives its reason at the select" | |
| A read that comes back after the options changed or another file was picked is dropped by `recordIndividualsRead` (974) | `prj:1239` "gives the project itself for a read of other options"; `prj:1222` "gives the project itself for another load" | |
| An xlsx column of `0` and `1`, numbers and texts: binary, one `"1"` (978) | `sht:61` "the number 1 and the text 1 are one value: g is binary, one 1, zero 0"; `typ:405` | |
| An xlsx column of heights with `n.d.`: categorical; with `#N/A` or `#DIV/0!` in its place, typed or an error: continuous, no height (981) | `sht:388` "a column of heights with one text n.d. is categorical …" (added); `sht:402` "a column of heights with #N/A in the place of n.d. … is continuous, that individual with no height" (added); `sht:270` "#DIV/0! is missing, and h stays continuous" | the files wasm gives an error of Excel as its text, so typed and error are one input here |
| An xlsx column of dates: text, categorical; a year typed as a number is a number (985) | `sht:329` "a date of the files wasm is text, and a column of dates categorical"; `sht:416` "a column of years typed as numbers is continuous, each year a number" (added) | |
| An xlsx column of `TRUE` and `FALSE`: binary, one `"true"` (987) | `sht:85` "booleans are binary, one true, zero false"; `typ:204` | |
| An xlsx whose header holds the number 2024: the column `2024` (989) | `sht:96` "a header of the number 2024 names its column 2024" | that it is chosen by that name is the screen's |
| An xlsx that is a CSV renamed: `notXlsx`, its words, and not tried as a CSV (991) | `cells:93` (test.each), its case of the refusal notXlsx; `ifile:496` (test.each) "the refusal %o of the files wasm is the failed read"; `prj:6450` "individualsNeeds gives the words of %o, and the end of a refusal" | |
| The files wasm downloaded, then the light worker restarted: imported again, and a failed `import()` mended (994) | none | see "Left without a test" |

#### How it is verified: `readCsv`, `cellNumber` and `cellText`

| item | test | note |
|---|---|---|
| `id,pop\nA,P1\nB,P2\nC,P1\n` (1043) | `csv:34` | |
| `id\tpop\nA\tP1\n` (1044) | `csv:53` | |
| `id;h\nA;1,5\nB;1,7\nC;1,9\n` (1045) | `csv:62` | |
| `id;h\nA;1.5\nB;1,7\nC;1,9\n` (1046) | `csv:78` | |
| `id,x\n001,1\n002,2\n003,3\n` (1047) | `csv:88` | |
| `id,st\nA,case\nB,control\nC,\nD,NA\n` (1048) | `csv:101` | |
| `id,g\nA,1\nB,2\n` (1049) | `csv:116` | |
| `id,s\nA,1\nB,2\nC,3\nD,5\n`: continuous, 4 levels, 4 texts, 1 to 5 (1050) | `csv:124`; `typ:217` "a continuous column of 4 whole numbers from 1 to 5 is warned of" | the warning at `columnWarnings`, over the same cells |
| `id,s\nA,1\nB,01\nC,001\n`: continuous, 1 level, 3 texts, the sentence of different ways (1051) | `typ:231` "1, 01 and 001 are one level …"; `typ:450` "1, 01 and 001 give one level of three texts, and the sentence of different ways" | at `inferColumnTypes` and `columnWarnings` |
| `id,s\nA,1\nB,1\n`: categorical; set continuous, 1 level, 1 text, no "written in different ways" (1052) | `typ:425` | |
| `id,n\nA,"x, y"\nB,"say ""hi"""\n` (1053) | `csv:130` | |
| `\r\n` and `\r`, the blank line skipped (1054) | `csv:137` | |
| `id;pop;;\nA;P1;;\n` (1055) | `csv:158` | |
| `id;pop;;\nA;P1\nB;P2;NA\n` (1056) | `csv:571` | |
| `id,x;pop;;\nA,1;P1\nB,2;P2;NA\n` (1057) | `csv:583` | |
| `id;pop;;\nA;P1\nB;P2;;x\n` (1058) | `csv:599` | |
| `id;pop;;\na;1\nb;2;3\n` (1059) | `csv:606` | |
| `id;pop;;x\nA;P1;;1\nB;P2\n` (1060) | `csv:613` | |
| `id,,pop\nA,NA,P1\nB,-,P2\n` (1061) | `csv:631` | |
| `##fileformat=VCFv4.2…` and `#CHROM\tPOS\tID…` (1062) | `csv:648` | |
| The blank first line passed over before a VCF (1063) | `csv:663` | |
| `id,pop\nA,P1\nB\n` (1064) | `csv:168` | |
| `id,pop\n,P1\n` (1065) | `csv:178` | |
| `id,pop\nA,P1\nA,P2\n` (1066) | `csv:185` | |
| `id,pop,pop\nA,1,2\n` (1067) | `csv:192` | |
| `id,,pop\nA,1,P1\n` (1068) | `csv:199` | |
| `id,pop\nA,"P1\nB,P2\n` with `,` (1069) | `csv:206` | |
| `id,pop\n` and the empty text (1070) | `csv:212` | |
| `﻿id,pop\nA,P1\n` (1071) | `csv:217` | |
| `id;n\tx\nA;1\t2\n`: the tab (1072) | `csv:224` | |
| `id,pop\nA,P1\nB,P2,P3\n` (1073) | `csv:234` | |
| `id,n\nA,"x\ny"\nB,1,2\n` (1074) | `csv:244` | |
| `only\nA\nB\n` (1075) | `csv:254` | |
| `cellNumber`, with a comma and with a point (1077) | `typ:32` to `typ:71`, one test per case; `typ:472` "with a point, the number cell 1.75 is 1.75" (added) | the number with a point was given only with the comma before |
| `cellText` (1080) | `typ:397` "cellText: a number and a boolean as String writes them, a text as it is, a missing cell null" | |

#### How it is verified: `readSheet`

| item | test | note |
|---|---|---|
| `[1,"P1"]`…: first cells `"1"`, `pop` binary (1090) | `sht:32` | |
| `["A",1.75]`, `["B","1.8"]`…: continuous, the cells as they were (1091) | `sht:48` | |
| `1`, `"1"`, `0`: binary, one `"1"` (1092) | `sht:61` | |
| `"1,75"` among numbers: categorical (1093) | `sht:73` | |
| `true`, `false`: binary (1094) | `sht:85` | |
| the header `2024` (1095) | `sht:96` | |
| `" P1 "`, `"NA"`, `"  "` (1096) | `sht:106` | |
| a blank row skipped (1097) | `sht:138` | |
| an empty cell at the end of the header (1098) | `sht:160` | |
| `unnamedColumn` 4, the column D of the sheet (1099) | `sht:171` | |
| `emptyIndividual` 6, the row of the sheet (1100) | `sht:199` | |
| `duplicateIndividual` `1` (1101) | `sht:226` | |
| a header alone, `empty` (1102) | `sht:252` | |
| `#N/A` in the header and below it (1103) | `sht:259` | |
| `#DIV/0!` missing, `h` continuous (1104) | `sht:270` | |
| `#NAME?`, `#NULL!`, `#NUM!`, `#REF!`, `#VALUE!` missing (1105) | `sht:284` | |
| the individuals `#N/A` and `#REF!` (1106) | `sht:318` | |

#### How it is verified: `readIndividualsFile`, the properties and `readXlsxCells`

| item | test | note |
|---|---|---|
| An xlsx at `readIndividualsFile`: its bytes to `readXlsx`, the table of `readSheet` with `found` null, each refusal the failed read, 20,000,001 bytes `tooLarge`, options of a CSV never call `readXlsx` (1108) | `ifile:456`, `ifile:479`, `ifile:496` (test.each, the seven of the xlsx and `files`), `ifile:526`, `ifile:544` | |
| The Spanish file in Windows-1252 (1118) | `ifile:101` | |
| The same file as UTF-8 with its BOM (1122) | `ifile:109` | |
| The same file with the encoding set to UTF-8 (1123) | `ifile:116` | |
| UTF-16 little and big endian, also with Windows-1252 set; `PK\x03\x04` and a byte 0 `notText` (1124) | `ifile:128`, `ifile:135`, `ifile:142`, `ifile:152`, `ifile:162` | |
| `undecodedLine` 3 with the byte `FF`; `null` without it, and in Windows-1252 (1128) | `ifile:353` "with auto, the BOM of UTF-8 decides UTF-8: a bad byte on line 3 …"; `ifile:109` and `ifile:101` (`undecodedLine` null in `SPANISH_READ`) | |
| UTF-16 with one byte more, and with half a character written in four: `cutShort` (1132) | `ifile:405`, `ifile:416` | |
| A size of 20,000,001: `tooLarge`, `arrayBuffer` never called (1135) | `ifile:178` | |
| `arrayBuffer` rejects with `NotReadableError`: `unreadable` (1137) | `ifile:195` | |
| A table written as CSV reads back as itself, and `"auto"` finds the separator written (1142) | `prop:92`, `prop:109` | |
| The types do not depend on the order of the rows (1154) | `prop:167`; `typ:421` | |
| The types of an xlsx are those of its text (1157) | `prop:235` | |
| The first type is identifier and no other is; a binary type's two values (1161) | `prop:192` | |
| Playwright, stage 2: a CSV loaded, the table and the options shown, no wasm fetched by the light worker (1165) | `ind:137` "WS8 D1 panel_pops.csv is read with the three options found, its columns and their types are shown, and the light worker fetches no wasm" | |
| Playwright, stage 2: the measurement of the file of 10,000 rows (1165) | `measure:727` "the metadata file of 10,000 rows, from the pick to its columns" | a measurement, in the report of stage 2 |
| `readXlsxCells`: the cells, the same numbers, `free()` once (1176) | `cells:51`; `cells:77` | |
| `encrypted`, `emptySheet`, `cellError` with `#GETTING_DATA` (1177) | `cells:93` (test.each) | |
| `sheetTooLarge`, 123 rows of 16,384 columns, `XFD` (1178) | `cells:115`; `cells:137` | |
| `Error("Zip error")`, the refusal `files` (1179) | `cells:151` | |
| `refusal` "other" and cells 3 long: a throw each, `free()` once (1180) | `cells:176`, `cells:184` | |
| Playwright, stage 4: `excel_en.xlsx` read, the date, one request for the JavaScript and one for the `.wasm`, none before the pick, none for a second xlsx, none for a CSV (1187) | `xlsx:126` "IP9 D2 excel_en.xlsx is read from its first sheet … downloaded once, on the first xlsx"; `xlsx:156` "IP9 D2 a CSV read downloads nothing of the reader of xlsx files …" | |
| The `.wasm` answered with an error: the words; the file loaded again, the table (1192) | `xlsx:170` | |
| The JavaScript answered with an error: the words; loaded again, the table or the same words (1196) | `xlsx:194` | the flow asserts the table in both engines, since the code asks again at another address, as the spec says since commit fb783ac |
| `encrypted.xlsx`: its words (1203) | `xlsx:254` | |
| `individuals_10000.xlsx`: the time from the pick to the table, with and without the download (1204) | `xlsx:363` | the times are written in the report of the plan, work package 9 |
| The size of the package in the built site, raw and gzipped (1208) | none | a measurement of the build; see "Left without a test" |
| A file changed on the disk gives `unreadable`, by hand in three browsers (1211) | none | see "Left without a test" |

## The screens and the plots

The two steps, the shell, the entry, the site and its probe, the three
plots and the panel of the PCA. Mapped at commit 5328bbf, which adds the
tests marked "added", each with a title that starts "IP10 D3". The tests
of `e2e/screens.spec.ts` write the pictures for a person to look at and
assert nothing beyond reaching each state.

### The Individuals step

`docs/specs/steps/individuals.md`, "How it is checked" (763 to 914): 74
items, 70 with a test that reaches all of it.

The tests are named by these short names of their files: `iw:` for
`src/ui/steps/individuals/words.test.ts`; `ind:` for
`e2e/individuals.spec.ts`; `ic:` for
`src/ui/steps/individuals/commands.test.ts`; `types:` for
`e2e/individualTypes.spec.ts`; `one:` for `e2e/onePopulation.spec.ts`;
`sw:` for `src/ui/shell/words.test.ts`; `diversity:` for
`e2e/diversity.spec.ts`; `shell:` for `e2e/shell.spec.ts`; `xlsx:` for
`e2e/xlsx.spec.ts`; `prj:` for `src/core/project.test.ts`; and `scr:`
for `e2e/screens.spec.ts`.

Its list "In node" (780) and its list "In the flows" (817), each bullet
split into its checks, and the paragraph of axe, VoiceOver, the screen
seen and the pictures (902). The opening paragraph (765) names the
fixtures and the engines and asks for no test of its own. The states of
the step in the pictures are inside the loop over the light and the dark
theme, at line 465 of `e2e/screens.spec.ts`. The added `xlsx:333` reads
three files of the tests of xlsx_rs, at its commit 4a29ee7, copied into
`e2e/fixtures/`: `excel97.xls`, `empty_first_sheet.xlsx` and
`getting_data.xlsx`.

| item | test | note |
|---|---|---|
| What the end of a name tells, for each ending of the table of "The file", in capitals as well, and `panel.vcf.gz` a variants file (782) | `iw:66` "the kind of a file is told by the end of its name, without regard to case"; `iw:78` "WS8 D1 a variants file is told by its name, .vcf, .vcf.gz, .bcf or .nei" | the capitals are tested on `POPS.TSV`, `POPS.XLSX`, `POPS.XLS` and `PANEL.VCF.GZ`, not on `pops.CSV` itself. `kindOfName` lowers the whole name before any comparison (`words.ts:61`), so this counts as reached |
| The six texts of a file not loaded (784) | `iw:89` "a file not loaded is named in its message"; `iw:78`; `iw:101` "IP9 the words of an xlsx: the line of the first sheet, the picker"; `ind:797` "WS8 D1 several files dropped at once load none, and the step says why and announces it" | node asserts five of the six (.xls, another name, a variants file, a folder, a piece of text). "Load one metadata file at a time." (`SEVERAL_DROPPED`) is asserted whole only in the flow |
| The line of no file, "No metadata file: every individual is in one population." (785) | `iw:193` "the line of no file says what the analyses run on" | |
| The words of a type, a binary one with its coding (786) | `iw:286` "a type in words, a binary one with its coding, escaped" | |
| The warning of the types set and not applied, for each of the three reasons of `typeLostReason` (787) | `iw:354` "the warning of one type not applied, by each of the three reasons, names the file" | `typesLostWords` gives the text without "Warning: ", which the screen adds |
| For more than one, in the order of `typesLost`, with the file named as the source names it (788) | `iw:383` "the warning of several types not applied is a sentence and a line for each"; `iw:354` | `new.csv` in `iw:354` is the file named by the source |
| The line of a population, "P1 · 48" and "P1, 48 individuals" (790) | `iw:180` "a population is shown with its number and read with its individuals" | on 1,203, with its thousands comma |
| The line of the one population, "All individuals · 342" and "All individuals, 342 individuals" (791) | `iw:248` "the line of the one population" | |
| The button of the copy, "Copy the 12 names" and "Copy the name", and its three announcements (792) | `iw:408` "the button of the copy of the names missing, and its three announcements" | |
| The items of the select: the one population first, key `one`, then each column but the first, key `column:` and its name (794) | `iw:199` "the items of the select of the populations: the one population first" | |
| The item shown as chosen for `onePopulation`, for a column of the table, and none for no column or one the table does not have (796) | `iw:228` "the item shown as chosen: the one population, a column of the table, or none" | "none" is `null`; the flows show it as "Choose a column" (`ind:229`, `ind:470`) |
| A column named `one`, or "All individuals in one population", chosen and shown as that column (798) | `iw:210` "a column named one, or as the item of the one population, is a column"; `ic:144` "IP5 D2 the item of a column chooses that column, a column named one among them" | |
| Each row of the table of "What it sends and reads" applied to the store of core with its description (801) | `ic:47` "a pick loads the file pending, with every option found by the reader"; `ic:60` "IP9 an xlsx picked is a new load with no options of a CSV"; `ic:73` "an option chosen sets it, keeps the other two, and names the file"; `ic:106` "a column chosen sets the grouping, and Remove takes the file away and keeps it"; `ic:126` "IP5 D2 All individuals in one population chosen puts every individual in one population"; `ic:204` "a type chosen sets it, one step of undo with no notice, and an undo is said"; `ic:228` "the value coded 1 chosen sets the binary type with the other value coded 0"; `ic:248` "the types forgotten drop those not applied and keep the others" | all nine rows |
| A type, a coding and the types forgotten each make one step of undo and no notice (802) | `ic:204`; `ic:228`; `ic:248` | |
| An undo of each is said "Undone: the type of score changed." and so on (803) | `ic:204`; `types:381` "IP5 D2 a type changed and the value coded 1 chosen are each one step of Undo with no notice"; `types:453` "IP5 D2 the separator set to the semicolon names the types that wait with Forget these types" | node asserts `undoneOrRedone` for the type only, without the full stop. The flows assert the whole sentence with its full stop for the coding and the type (`types:381`) and for the types forgotten (`types:453`, whose check matches the end of the text only) |
| "All individuals in one population" chosen while the diversity by a column is done removes it, with the notice "Diversity removed because every individual was put in one population" (805) | `one:265` "IP5 D2 All individuals in one population chosen removes the diversity by popcat with its notice" | reached in the flow only. `ic:126` has no diversity done, and no test of the store or of the shell's words applies this command with a result |
| `stepStates`: Individuals Optional with no metadata file whatever the grouping (809) | `sw:2671` "with no metadata file Individuals is Optional whatever the grouping, with its reason" | |
| `stepStates`: To do with a file read and no column (810) | `sw:2685` "a file read and no column chosen is To do, with the words of the one population" | |
| `stepStates`: To do with a file `notGiven` (811) | `sw:2698` "a file notGiven is To do, with the reason of individualsNeeds" | |
| `stepStates`: Done with a file read and `onePopulation` (811) | `sw:2711` "a file read that holds every individual, with the one population, is Done" | |
| `summaryLine` with no metadata file, a file read and no column, `onePopulation` and `notGiven` (812) | `sw:2725` "the first project: no metadata file, one population"; `sw:2731` "a file read and no column chosen: populations not chosen"; `sw:2742` "a file read with the one population: one population"; `sw:2753` "a file notGiven: pops.csv not loaded" | |
| `announcementsOf` at the end of a read, each of its four sentences after the check (813) | `sw:2770` "a character not decoded"; `sw:2781` "a column of few whole numbers, and two of them"; `sw:2802` "the column of the populations not in the file"; `sw:2810` "the types set and not applied, one column and two" | |
| All four in their order (815) | `sw:2822` "all four, in their order" | |
| None (815) | `sw:2766` "a read that brings nothing up says the read and the check alone" | |
| Ready, no file: the zone with "Choose a metadata file…" and the line of no file, no check and no part of the populations (820) | `one:233` "IP5 D2 with no metadata file the step offers the pick and says what the analyses run on"; `ind:137` "WS8 D1 panel_pops.csv is read with the three options found, its columns and their types are shown" | `one:233` has `panel.nei` loaded and asserts that the only heading is "Metadata file" and that there is no select of the populations |
| The stepper's Individuals at Optional, "Without it, every individual is in one population." as the description of its link (822) | `one:233`; `e2e/stepper.spec.ts:8` "WS7 D2 the links of the stepper do not move when the step changes" | |
| The diversity with the missing data filter at 0.1, beside Run "1 population, All individuals: 200 individuals" and the line of no file, its row 200, 0.3755, 0.3543, 0.9792 (824) | `one:210` "IP5 D3 panel.nei with no metadata file runs the diversity on All individuals: 200, 0.3755, 0.3543, 0.9792" | |
| Running: the read held back, "Reading panel_pops.csv.", the three options with "Detected", no table (831) | `ind:453` "WS8 D1 a file being read shows its name, the options of the reader, and no columns" | the script of the light worker is held back, with no `panel.nei` loaded ("unless the item says otherwise") |
| Done: "200 rows, 2 columns", the focus still on "Replace panel_pops.csv…", the three options detected, the table of the columns (834) | `ind:137`; `types:339` "IP5 D2 panel_pops.csv read shows a select of the type in every row but the first" | `ind:137` asserts the options without `panel.nei` loaded; `types:339` asserts the focus and the table with it loaded |
| "All 200 individuals of panel.nei found", and the select at "Choose a column" with the reason read with it (836) | `ind:229` "WS8 D1 the column popcat chosen lists the populations p0, p2 and p1 with their individuals"; `ind:137`; `one:265` | the description is asserted in `ind:137` and `one:265` |
| The diversity locked with the reason that names the step (839) | `diversity:121` "WS8 D2 the diversity is locked until the column of the populations is chosen" | |
| `popcat` chosen: the list "p0 · 48", "p2 · 84", "p1 · 68", read "p0, 48 individuals", copied as the lines shown (840) | `ind:229` | |
| And Individuals at Done (842) | `shell:176` "WS9 D3 the shell ready: every step with its state, the summary with the file" | asserted in its helper `loadPanel` (line 102 of `e2e/shell.spec.ts`), right after `popcat` is chosen |
| The one population chosen with the diversity by `popcat` done: the table gone and the notice (843) | `one:265` | the notice is asserted by the name of its dialog, and its Undo is not asserted there; the table's absence is asserted at Analyses |
| The list "All individuals · 200" (846) | `one:265` | with its words read, "All individuals, 200 individuals" |
| The diversity run, and its row "All individuals" as with no file (846) | `one:265` | |
| Undo: the column `popcat` chosen again and its table back with no calculation (847) | `one:265`; `one:385` "IP10 D3 Undo of All individuals in one population brings the table by popcat back from the cache, with no calculation" | added: with the results of the calculation worker held back, the table can come back only from the cache |
| With the one population, `panel_pops.csv` picked again: the table leaves the panel while the file is read (849) | `one:361` "IP5 D2 with the one population, the metadata file picked again gives the table of All individuals back"; `one:428` "IP10 D3 with the one population, the metadata file picked again takes the table away while it is read, and Run waits for the read" | added: the read is held back, and the table is seen gone and Run disabled until it ends |
| It comes back with no Run once read, the notice no longer naming it (850) | `one:361` | the notice is asserted gone |
| The types: the type of a column changed and the value coded 1 chosen, each one step of Undo with no notice (852) | `types:381` | |
| The warning of the few whole numbers gone once that column is set categorical (855) | `types:381` | |
| The separator set to the semicolon: one column, the warning naming the types set and not applied, "Forget these types" (856) | `types:453` | |
| The separator set back: every type applied again, the warning gone (858) | `types:453` | the warning is asserted gone through its button |
| The semicolon again, "Forget these types" pressed: the warning gone, the focus on the file button (859) | `types:453` | |
| With a table that has other columns, the focus on the first select of a type (861) | `types:542` "IP5 D2 Forget this type, pressed with the keyboard on a table with other columns" | |
| A row one cell short refused in the words that name the separator, the options still there, a separator chosen reading it again (863) | `ind:363` "WS8 D1 a file with a row one cell short gives the reason that names the separator" | |
| The copy without 12: "188 rows, 2 columns", the reason of `individualsStepMissing`, the disclosure opening the 12 names (865) | `ind:330` "WS8 D1 a metadata file without 12 individuals of panel.nei gives the reason, and a disclosure opens" | |
| "Copy the 12 names" puts them on the clipboard one a line, and the status region says "12 names copied." (867) | `types:651` "IP5 D2 the names missing copied by Copy the 12 names, one a line, and announced" | the file has a third column, `sex` ("188 rows, 3 columns") |
| In a page without the clipboard, "The names could not be copied. Select them in the list." (869) | `types:701` "IP5 D2 in a page without the clipboard the copy says the names could not be copied" | one missing individual, "Copy the name" |
| No list of the populations while individuals are missing (870) | `types:651`; `ind:330` "WS8 D1 a metadata file without 12 individuals of panel.nei gives the reason" | with a column and with the one population chosen. `ind:330` said so in a comment and did not check it; the check was added for this map |
| A new file without the column chosen: the select at "Choose a column" with the reason of kind `noSuchColumn` (871) | `ind:470` "WS8 D1 a column of the populations not in a new file is named at the select, which asks for a column" | |
| The same for a copy of `panel_pops.csv` whose header is `popcat,IID` (873) | `types:1049` "IP5 D2 a column of the populations that a new file puts first is no column of the populations" | |
| A column empty for every individual of `panel.nei`, with the reason of kind `noPopulation` (874) | `ind:1163` "WS8 D1 a column empty for every individual of the variants file gives its reason at the select" | |
| A project file whose metadata file was not read, `notGiven`: the card with the name, Replace, Remove and its reason, no options, no table, Individuals at To do (875) | `one:455` "IP5 D2 a project file whose metadata file was not read when it was saved shows its reason" | |
| An `.xls` file: its words, announced, the focus still on the file button (879) | `ind:392` "WS8 D1 pops.xls, of the older Excel, is not loaded, and the step says why and announces it" | |
| Several files dropped at once: their words, announced, the focus still on the file button (879) | `ind:797`; `ind:1027` "IP10 D3 ${what} is not loaded, is said and announced, and the focus stays on the file button" | added: one flow for each of the five cases of 879 to 881, the words, the status region and the focus |
| A folder: its words, announced, the focus (880) | `ind:845` "WS8 D1 a folder dropped on the zone loads nothing, and the step says what to give"; `ind:1027` "IP10 D3 ${what} is not loaded, is said and announced, and the focus stays on the file button" | added, as the row above |
| A piece of text dropped: its words, announced, the focus (880) | `ind:878` "WS8 D1 a piece of text dropped on the zone, or pasted into its button, loads nothing"; `ind:1027` "IP10 D3 ${what} is not loaded, is said and announced, and the focus stays on the file button" | added, as the row above |
| A piece of text pasted into the zone's button: its words, announced, the focus (880) | `ind:878`; `ind:1046` "IP10 D3 a piece of text pasted into the zone's button is not loaded, is said and announced, and the focus stays on the paste button" | added, in part: the words and the announcement as the spec has them; the focus is checked on the paste button, where the code keeps it, and not on the file button, where the spec puts it (see "Specs that differ from the code"). Not counted |
| A variants file told by its name: its words, announced, the focus (881) | `ind:1304` "WS8 D1 a variants file told by its name is not loaded, and is named a variants file"; `ind:1027` "IP10 D3 ${what} is not loaded, is said and announced, and the focus stays on the file button" | added, as the rows above |
| A file of another name: its words, announced, the focus (881) | `ind:392`; `ind:1027` "IP10 D3 ${what} is not loaded, is said and announced, and the focus stays on the file button" | added: `pops.dat`, with its announcement and the focus |
| A VCF picked under the name of a CSV refused as a variants file by the reader (882) | `ind:1256` "WS8 D1 a VCF picked as the metadata file is refused as a variants file" | |
| Remove: the card, the options and the table gone, the line of no file back, Individuals at Optional, the focus on "Choose a metadata file…" (885) | `ind:426` "WS8 D1 Remove takes the step back to no file, with the focus on the file button"; `types:828` "IP5 D2 Remove takes the types set with the file, puts the focus on the file button" | Optional is asserted in `types:828` (and in `one:455`) |
| The status region after a read, with the check once `panel.nei` is read (888) | `shell:351` "WS9 D3 the status region says the end of each read of the Variants step and of the metadata file" | |
| The status region after a read again for a change of an option (889) | `types:453`; `types:525` "IP10 D3 a read again for a change of the separator is said whole in the status region" | added: the whole text, "types.csv read: 4 rows, 1 column. 2 columns do not have the type you set." |
| The keyboard: the Tab order of "Accessibility" with a binary column, the types that wait and individuals missing, the disclosure open (891) | `types:725` "IP5 D2 the Tab key goes through the table in the order of the spec" | `ind:582` checks the order without a binary column or types that wait |
| Each select of a type named "Type of score", each select of the coding "Coded 1, the case, in status" (893) | `types:725`; `types:339`; `types:381` | the names are asserted whole, the value first, as "Accessibility" (719) has them: "binary Type of sex", "M Coded 1, the case, in sex" |
| At 320 px wide, in the three engines: the table fits, no word of the table, a warning or a problem cut, no sideways scroll (895) | `types:888` "IP5 D2 at 320 px wide, in ${font}, the table of the columns with its selects"; `ind:1112` "WS8 D1 at ${String(width)} px wide no word of the table of the columns, of a warning"; `types:1093` "IP5 D2 at 320 px wide, in ${font}, a column of a long name and long values with no space" | Chromium and WebKit here; Firefox on GitHub |
| An xlsx of the tests of xlsx_rs read from its first sheet, with its line and no options of the reader (898) | `xlsx:126` "IP9 D2 excel_en.xlsx is read from its first sheet, with no options of a CSV" | |
| Each refusal of "Its words" given in its words (899) | `xlsx:254` "IP9 D2 encrypted.xlsx is refused with its words"; `xlsx:170` "IP9 D2 the wasm of the reader answered with an error: the words of a reader not downloaded"; `xlsx:194` "IP9 D2 the JavaScript of the reader answered with an error: the words of a reader not downloaded"; `xlsx:333` "IP10 D3 ${what} is refused with its words, those of ${kind}" | added for `notXlsx`, `oldExcel`, `emptySheet`, `cellError` and `files`, with three files of the tests of xlsx_rs copied into `e2e/fixtures/`; 7 of the 8 kinds reach the screen. `sheetTooLarge` is reached in node only (`prj:6459` "individualsStepNeeds gives the words of %o, and Load a corrected file."): no fixture has a sheet above 2,000,000 cells. Not counted |
| axe in each state of the table of the states that the flows reach (902) | ready: `one:233`, `ind:137`; running: `ind:453`; done: `ind:229`, `types:339`; error: `ind:363`, `ind:330`, `ind:1163`, `one:455`, `xlsx:254` | |
| A screen reader, VoiceOver with Safari at least, tried on the table, the coding, the warning of the types that wait, the disclosure and its copy (904) | none | a person with a screen reader |
| The screen seen in the three engines, at 320 px and on a wide screen (908) | none | a person looking at the screen |
| The script of the pictures takes each state, the types that wait and the check with individuals missing, wide in light and dark, and the table at 320 px (909) | `scr:1116` "the Individuals step with no file"; `scr:1121` "the Individuals step reading a file"; `scr:1132` "the Individuals step, a file read and a column chosen"; `scr:1222` "the Individuals step, a file refused"; `scr:1276` "the Individuals step, individuals missing"; `scr:1355` "the Individuals step, the types that wait${width"; `scr:1448` "the Individuals step, the types at 320 px" | inside the loop over both themes. The pictures are for a person to look at; the script asserts nothing about them |

### The Variants step

`docs/specs/steps/variants.md`, "How it is checked" (1260 to 1372): 55
items, 53 with a test that reaches all of it.

The tests are named by these short names of their files: `variants:` for
`e2e/variants.spec.ts`; `diversity:` for `e2e/diversity.spec.ts`;
`shell:` for `e2e/shell.spec.ts`; `variantFilters:` for
`e2e/variantFilters.spec.ts`; `variantHistograms:` for
`e2e/variantHistograms.spec.ts`; `filterCounts:` for
`e2e/filterCounts.spec.ts`; `individualStats:` for
`e2e/individualStats.spec.ts`; `individualThresholds:` for
`e2e/individualThresholds.spec.ts`; `variantsOrder:` for
`e2e/variantsOrder.spec.ts`; `individualLists:` for
`e2e/individualLists.spec.ts`; `variantSwitches:` for
`e2e/variantSwitches.spec.ts`; `run:` for `src/worker/runner.test.ts`;
and `writing:` for `e2e/writing.spec.ts`.

As it stands after the revision of stage 4 of 28 September 2026: the
paragraph of stage 2 (1267), the list of stages 3 and 4 (1290), whose
numbers are those with the filters of the individuals first, and the
paragraph of axe, VoiceOver and the screen seen (1364). Two sentences
ask for no test and are not counted: that the flows run in Playwright
(1262), and "the constant of 10000 goes" (1344), a fact of the code: no
constant of a default distance is left under `src/`, and
`turnedOnFilter` gives `maxDist: null`.

A defect was found while the tests of the number fields of the PCA were
written, and fixed in commit f6ff2d5. In Chromium and WebKit, a comma
typed first in an emptied number field was kept: the digits typed after
it were refused with the line of a wrong digit, and Enter showed the
threshold kept in Arabic-Indic digits, 0.1 as ٠٫١. The widgets of the
fields read the comma in another system of digits, since their locale
named none; it now names the Latin digits, `en-US-u-nu-latn`
(`src/ui/popgen.tsx`). Two flows, which fail without the fix in both
engines, guard it:

- `variants:537` "IP10 D3 a comma typed first in the emptied threshold is thrown away with the line of the comma, and Enter shows the threshold kept in digits"
- `variantSwitches:307` "IP10 D3 a comma typed first in the empty distance is thrown away with the line of the comma, and Enter leaves the field empty"

They reach the rule of "A character the fields do not take" (481), that
a comma anywhere gives the line of the comma; that rule is outside "How
it is checked", so the two flows are not rows of the table below.

| item | test | note |
|---|---|---|
| `panel.nei` picked with the button, the focus still on the button (1267) | `variants:150` "WS7 D3 panel.nei picked with the button shows 200 individuals and ploidy 2" | |
| A file dropped, the focus still on the button (1268) | `variants:175` "WS7 D3 a file dropped on the card replaces the one there, and the focus stays on the button" | |
| `tetraploid.vcf.gz` with ploidy 2: 12 individuals and "Read with ploidy 2, …" (1269) | `variants:229` "WS7 D3 tetraploid.vcf.gz read with ploidy 2 shows 12 individuals and ploidy 2" | also no line "Ploidy …" |
| The diversity panel showing its words for the wrong ploidy (1270) | `diversity:682` "WS8 D2 tetraploid.vcf.gz read with ploidy 2 is refused in the panel's words" | |
| The ploidy set to 4, "Read tetraploid.vcf.gz again with ploidy 4" pressed, "Read with ploidy 4, …", no line "Ploidy 4", and the diversity run (1271) | `variants:251` "WS7 D3 the ploidy set to 4 and the VCF read again show ploidy 4, and the focus goes to the file button"; `diversity:682` "WS8 D2 tetraploid.vcf.gz read with ploidy 2 is refused in the panel's words"; `variants:290` "IP10 D3 a VCF read again with ploidy 4 gives its ploidy in the line of how it was read, and the card has no line of the ploidy" | added: the line "Ploidy 4" is checked absent after the read with ploidy 4 |
| The button's words with both options changed (1274) | `variants:727` "WS7 D3 the button to read a VCF again names both options when both differ" | |
| `bad.vcf` and its reason, ending "Choose another file." (1274) | `variants:316` "WS7 D3 bad.vcf shows the reason popnei refused it" | |
| A file named `panel.txt` and its message (1275) | `variants:332` "WS7 D3 panel.txt is not loaded, and the step says why and announces it" | |
| A piece of text dropped, and its message (1276) | `variants:807` "WS7 D3 a piece of text dropped on the zone loads nothing, and the step says what to drop" | |
| A piece of text pasted into the zone's button, the same message (1276) | `variants:823` "WS7 D3 a piece of text pasted into the zone's button loads nothing" | |
| 10 and 0.125 in the threshold: the line, the value kept, the line announced (1277) | `variants:402` "WS7 D3 the threshold takes a number of two decimals from 0 to 1, and refuses 10 and 0.125" | |
| 300, 0 and 2.5 in the ploidy, each with its line, kept, announced (1278) | `variants:682` "WS7 D3 the ploidy refuses 0, 300 and 2.5 with a line that says it stays" | |
| 0,1 and 0,2 key by key in the threshold, 2,0 in the ploidy, each with the line of the comma and the value kept (1279) | `variants:486` "WS7 D3 a comma typed key by key in the threshold is thrown away, and the field says so"; `variants:606` "WS7 D3 a comma or a minus sign typed in the ploidy is thrown away" | |
| The value kept typed back, and an arrow key at a bound, each taking the line away (1281) | `variants:557` "WS7 D3 the line of a number refused goes at the next commit, the value kept typed back" | |
| `tetraploid.vcf.gz` dropped with 300 typed and not committed: read with ploidy 2, the line of 300 shown and announced (1282) | `variants:874` "WS7 D3 a file dropped while the ploidy holds a number it refuses is read with the ploidy kept" | |
| The text of the status region after each read (1284) | `shell:351` "WS9 D3 the status region says the end of each read of the Variants step and of the metadata file" | |
| A folder dropped, and the function that tells what a drop held, in node (1285) | `variants:752` "WS7 D3 a folder dropped on the zone loads nothing, and the step says what to drop"; `src/ui/widgets/dropped.test.ts:11` "one folder, and one piece of text" | |
| Before a file, the line in place of the checks, and the filters settable (1296) | `variantFilters:134` "VS6 D2 before a file the line stands in place of the checks, the four filters are there in their order" | the LD pruning set before a file with the distance 500 |
| The histograms calculated, the mean of the MAF 0.7163, still there after the missing data filter at 0.05 (1297) | `variantHistograms:124` "VS6 D2 the histograms calculated: the button, the caption, the versions, the focus on the heading" | 0.7163 is in the accessible name of the group, `MAF_TITLE` |
| The threshold line of the MAF moving as 0.9 is typed, before Enter (1299) | `variantHistograms:256` "VS6 D2 in a browser in ${locale} the threshold line of the MAF moves as 0.9 is typed, before Enter" | in en-US and es-ES |
| Count at 0.05: "Kept 1,152 of the 1,200 variants it was given." and the field described by it (1301) | `filterCounts:162` "VS6 D2 the Count at 0.05: the count beside the filter and in the description of its field" | |
| Heterozygosity at 0.9 and MAF at 0.95: the counts gone; after Count 1,152 of 1,152, 1,128 of 1,152, and "1,128 of the 1,200 variants of panel.nei pass the filters." (1303) | `filterCounts:205` "VS6 D2 the three filters counted, 1,152 of 1,152 and 1,128 of 1,152, and the line of the total" | |
| An undo bringing back the counts of the filter before, with no calculation (1307) | `filterCounts:338` "VS6 D2 an undo brings back the counts of the filters before, with no calculation" | its change is 0.05 to 0.1, with the worker holding every result |
| The missing data filter at 0.05 alone, the statistics of each individual, `s000` 0.0283 and 0.3654 (1308) | `individualStats:154` "IP2 D3, VS7 D1 the statistics of panel.nei: s000 0.0283 and 0.3654, the caption, the versions" | |
| The thresholds at 0.03 and 0.38: "Kept 116 of the 200 individuals it was given.", then 111 of 116, "111 of the 200 individuals of panel.nei pass the filters.", the column Kept (1310) | `individualThresholds:183` "IP2 D3, VS7 D1 the thresholds at 0.03 and 0.38: Kept 116 of the 200, then 111 of 116" | |
| 0.12345 refused with its line (1313) | `individualThresholds:298` "IP2 D3, VS7 D1 0.12345 refused: the line under the field, announced and describing it" | |
| The histograms of the variants removed by the thresholds, with the notice, and calculated again, the mean of the MAF 0.7173 (1313) | `variantsOrder:231` "IP2 D3 the histograms of the variants removed by the thresholds of the individuals, with the notice" | |
| Count: "Kept 1,117 of the 1,200 variants it was given." (1315) | `variantsOrder:315` "IP2 D3 the Count with the thresholds at 0.03 and 0.38: Kept 1,117 of the 1,200 variants"; `variantsOrder:354` "IP2 D3 with the thresholds set and no statistics, the Count calculates the statistics first" | |
| The missing data filter of the variants moved: the statistics, their table and the counts of the thresholds staying, no notice, no calculation (1316) | `individualThresholds:411` "IP2 D3, VS7 D1 the missing data filter of the variants moved: the statistics and the counts of the thresholds stay"; `individualStats:573` "IP2 D3, VS7 D1 the missing data filter of the variants moved: the statistics stay, with no notice" | the first checks the counts, the caption and no notice; the second the rows of the table |
| A list to keep with `ind_900` applied: the reason under the lists, describing the text area, announced (1319) | `individualLists:131` "VS7 D1 a list to keep with ind_900 applied: its reason under the list, describing it and announced" | |
| … and beside each disabled button, with no text under a list that names the Variants step (1321) | `individualLists:131` "VS7 D1 a list to keep with ind_900 applied: its reason under the list, describing it and announced"; `variantsOrder:369` "IP2 D3 a list to keep that names ind_900 locks the Count and the histograms of the variants" | the first has Write, the second the Count and Calculate of the histograms |
| The list cleared, and the reason gone (1322) | `individualLists:172` "VS7 D1 the list cleared: the text emptied, the reason gone and Write given back" | |
| A list typed and not applied, with its line, and an Undo putting the text back to the list applied (1323) | `individualLists:276` "VS7 D1 a list typed and not applied has its line, and an Undo of another change puts the text back" | |
| The LD pruning on with the missing data filter at 0.05: the distance empty, the reason beside it, announced and describing the field (1325) | `variantSwitches:167` "IP3 D3 the LD pruning turned on: the distance empty with its reason beside it, announced and describing it" | |
| The Count and the writing disabled, the reason beside each; the histograms of the variants and the statistics of each individual still calculated (1327) | `variantSwitches:167` "IP3 D3 the LD pruning turned on: the distance empty with its reason beside it, announced and describing it" | the reason beside each button is checked as its accessible description, which `RunButton` takes from the text it shows |
| An arrow key, Home, End, then Tab in the empty field sending nothing (1330) | `variantSwitches:242` "IP3 D3 in the empty distance the arrow keys, Page Up, Page Down, Home and End send nothing" | |
| 0 typed: "0 is less than 1; the distance is still to be typed." (1331) | `variantSwitches:271` "IP3 D3 0 typed in the empty distance is refused, and so is a comma typed key by key" | |
| 50000 typed: the reason gone and the Count giving a count beside the LD pruning (1333) | `variantSwitches:326` "IP3 D3 50000 typed: the reason goes and the Count gives a count beside the LD pruning" | the count as a pattern, the spec gives no number |
| An Undo giving back the empty field and the lock, a Redo 50000 (1334) | `variantSwitches:326` "IP3 D3 50000 typed: the reason goes and the Count gives a count beside the LD pruning" | |
| Turned off and on: the field 50000, the count back beside the filter, no calculation (1335) | `variantSwitches:367` "IP3 D3 the LD pruning at 50000 turned off and on again: the field holds 50000" | |
| In a new project, on, off and on before a distance: the field empty and the lock back (1336) | `variantSwitches:396` "IP3 D3 in a new project the LD pruning turned on, off and on again before a distance is typed" | |
| The threshold of the individuals by observed heterozygosity at 0.38, off and on, at 0.38 (1338) | `variantSwitches:426` "IP3 D3 the threshold of the individuals by observed heterozygosity at 0.38, turned off and on" | |
| In node, `turnedOnFilter(p, "ld")` of a project that never had the filter: `{ kind: "ld", maxAllowedR2: 0.3, maxDist: null }` (1340) | `src/ui/steps/variants/commands.test.ts:208` 'turnedOnFilter(p, "ld") of a project that has never had the LD pruning gives r² 0.3 and no distance' | |
| … of a project that keeps it: the filter of `filtersOff` (1343) | `src/ui/steps/variants/commands.test.ts:216` 'turnedOnFilter(p, "ld") of a project that keeps the LD pruning in filtersOff gives that filter' | |
| Missing data 0.05, LD off, thresholds 0.03 and 0.38: Write, Save, `panel.filtered.nei`, 156,818 bytes, 1,117 variants (1345) | `individualThresholds:613` "IP2 D3, IP1 D2 the written files of dev.3 on the screen, VS7 D3 the write of the individuals kept"; `run:2030` "with the list of 111 before the filter at 0.05, 156,818 bytes and the counts 1,117 of 1,200" | the flow checks the name and the size of the download; the node test writes the same job and reads 1,117 variants and the 111 individuals back |
| With the LD filter on as well, r² 0.3 within 50,000: 150,290 bytes and 1,067 variants (1350) | `individualThresholds:631` "IP10 D3 the write of the individuals kept with the LD pruning on as well, r² 0.3 within 50,000" | added: the Count gives 1,067 of the 1,200 variants, the download is 150,290 bytes, and 156,818 once the pruning is turned off. No test of the runner in node writes this job |
| No button that downloads a histogram as SVG or PNG (1354) | `variantHistograms:756` "VS6 D2 no button on the step downloads a histogram as SVG or PNG" | |
| The CSV of the bins of the MAF: its name, header, 40 rows, the 39th (1355) | `variantHistograms:717` "VS6 D2 the CSV of the bins of the MAF: panel.variant_maf_bins.csv, its header, its 40 rows" | |
| The table of the bins reached with the keyboard, its tab selected with the arrow keys (1357) | `variantHistograms:632` "VS6 D2 the table of the bins reached with the keyboard: the tabs one stop, the arrow keys between them" | |
| The table of the individuals sorted with the keyboard alone (1359) | `individualStats:330` "IP2 D3, VS7 D1 the table sorted with the keyboard alone: into the table, up to the headers" | |
| … and its CSV downloaded (1360) | `individualStats:463` "IP2 D3, VS7 D1 the CSV of the table: panel.individual_stats.csv, its header, 200 rows" | |
| At 320 pixels wide, the legend of each histogram inside its plot, in the three engines (1361) | `variantHistograms:775` "VS6 D2 at 320 pixels wide the legend of each histogram with a threshold lies inside its plot" | run here in Chromium and WebKit; Firefox on GitHub after the merge |
| axe in each state of the table of the states (1364) | ready: `variants:150` "WS7 D3 panel.nei picked with the button shows 200 individuals and ploidy 2"; `variantsOrder:145` "IP2 D3 the section of the individuals comes before that of the variants"; locked: `variantSwitches:167` "IP3 D3 the LD pruning turned on: the distance empty with its reason beside it"; `variantsOrder:369` "IP2 D3 a list to keep that names ind_900 locks the Count and the histograms"; `variantsOrder:405` "IP2 D3 thresholds that keep nobody lock the Count and the histograms of the variants"; `individualThresholds:503` "IP2 D3, VS7 D1 thresholds that keep none: the reason under the filters"; running: `variants:634` "WS7 D3 a file picked before popnei has loaded is shown as being read"; `variantHistograms:897` "VS6 D2 running: Stop, the bar and its line; stopped, the button back"; `filterCounts:369` "VS6 D2 the Count running: Stop, the bar and its line, and no line of no counts"; `individualStats:606` "VS7 D1 running: Stop, the bar and its line; stopped, the button back and no table"; `writing:229` "VS5 D3 with the focus on Write, the write ends with the focus on Save"; done: `filterCounts:162` "VS6 D2 the Count at 0.05: the count beside the filter and in the description"; `individualStats:154` "IP2 D3, VS7 D1 the statistics of panel.nei: s000 0.0283 and 0.3654"; `writing:175` "IP1 D2 the written files of dev.3 on the screen, VS5 D3 panel.nei at 0.05 written"; results removed: `variantHistograms:923` "VS6 D2 removed by a new load, with the words of the change"; `variantsOrder:231` "IP2 D3 the histograms of the variants removed by the thresholds of the individuals"; error: `variants:316` "WS7 D3 bad.vcf shows the reason popnei refused it"; `variantHistograms:967` "VS6 D2 in error: the ploidy of tetraploid.vcf.gz refused"; `filterCounts:420` "VS6 D2 the Count refused: the ploidy of tetraploid.vcf.gz"; `individualStats:633` "VS7 D1 in error: the ploidy of tetraploid.vcf.gz refused"; `writing:785` "VS5 D3 a write whose worker stopped shows its error and offers Write again" | each runs axe in the state it reaches; the empty state cannot happen (spec, 950) |
| VoiceOver with Safari on a field of a filter with its count, a histogram and its table, the table of the individuals, and a list (1366) | a person | a person with a screen reader; not tried |
| The screen seen in the three engines, at 320 px and wide (1370) | a person, and the screenshots of `e2e/screens.spec.ts` | a person; stop A of `docs/plans/individuals-pca.report.md` waits for the owner |

### The shell

`docs/specs/shell.md`, "How it is checked" (942 to 1050): 60 items, 60
with a test that reaches all of it.

The tests are named by these short names of their files: `sw:` for
`src/ui/shell/words.test.ts`; `saveOpen:` for
`src/ui/shell/saveOpen.test.ts`; `writing:` for `e2e/writing.spec.ts`;
`saving:` for `e2e/saving.spec.ts`; `status:` for
`src/ui/shell/status.test.ts`; `undoRedo:` for
`src/ui/shell/undoRedo.test.ts`; `entry:` for `e2e/entry.spec.ts`; and
`shell:` for `e2e/shell.spec.ts`.

The row `locked` of the table of the states of the shell (753) "cannot
happen for the shell as a whole", so the item of axe asks for no flow of
it.

| item | test | note |
|---|---|---|
| `stepStates`: a state for each row of the table of the stepper, and the order of its rows (948) | `sw:344` "the steps come in their order, each with its state"; `sw:356` "Variants with no variants file is To do, with the file an opened project asks for"; `sw:368` "Variants whose read is pending is Reading"; `sw:376` "Variants whose read failed, or with a list of individuals that is wrong, is Problem"; `sw:394` "Variants read with nothing wrong is Done, with no reason"; `sw:1534` "a check among the results removed gives Variants Results removed, and not the Analyses step"; `sw:1612` "Variants read with nothing running, removed or failed is Done, the Counts done and a file written among it"; `sw:402` "Individuals with no metadata file is Optional"; `sw:410` "Individuals whose read is pending is Reading"; `sw:418` "Individuals whose read failed, or with individuals of the variants file missing, is Problem"; `sw:437` "Individuals read with no column of the populations chosen is To do"; `sw:449` "Individuals whose column is not in the table, or gives no individual a population, is Problem"; `sw:481` "Individuals read with its populations is Done, with no reason"; `sw:488` "Analyses with every analysis locked is Locked, with the reason of the first"; `sw:498` "Analyses with an analysis running is Running"; `sw:503` "Analyses whose notice lists a result removed is Results removed"; `sw:511` "Analyses with an analysis in error is Failed, with the title of that analysis"; `sw:519` "Analyses with every analysis that is not locked done is Done"; `sw:524` "Analyses otherwise is Ready"; `sw:2536` "a list of individuals popnei would refuse is said before the LD filter with no distance"; `sw:2549` "the LD filter with no distance is said before thresholds that keep no individual" | the rows of stage 3 and 4 are in the items below |
| an analysis running while another is removed gives Running (949) | `sw:529` "the first row that holds wins: an analysis running while another is removed gives Running" | |
| from stage 3, a check running gives Variants Running and leaves the Analyses step as it was (950) | `sw:1495` "a check running, the writing running, or a Run that waits for the statistics gives Variants Running"; `sw:1517` "a check running leaves the Analyses step as it was" | |
| a write in `error` gives Variants Failed with "The file could not be written." (951) | `sw:1559` "a check in error gives Failed with its title, the writing in error its own words, the first in the order of the step" | |
| a list of individuals naming one not in the file: Problem before a check running (952) | `sw:1582` "a list of individuals that names one not in the file gives Problem before a check running" | |
| thresholds that keep none: Problem, with the words of `keptNoneReason` (955) | `sw:1599` "thresholds that keep no individual give Problem with the words of keptNoneReason, before a check running" | |
| from stage 4, an LD filter with no distance: Problem before a check running, with the words of `variantFilterNeeds` (956) | `sw:2521` "an LD filter with no distance gives Variants Problem with the words of variantFilterNeeds, before a check running" | `sw:2558` "the LD filter with no distance turned off locks nothing" as well |
| Individuals Optional with no metadata file, whatever the grouping (958) | `sw:2671` "with no metadata file Individuals is Optional whatever the grouping, with its reason" | |
| Individuals To do with a file read and no column, with the words of the one population (959) | `sw:2685` "a file read and no column chosen is To do, with the words of the one population" | |
| Individuals To do with a file `notGiven`, with its words (960) | `sw:2698` "a file notGiven is To do, with the reason of individualsNeeds" | |
| Individuals Done with a file read and `onePopulation` (961) | `sw:2711` "a file read that holds every individual, with the one population, is Done" | |
| `summaryLine`: the empty first project, "No variants file · 1 filter · no metadata file: one population" (962) | `sw:550` "the empty first project"; `sw:2725` "the first project: no metadata file, one population" | |
| a file read and no column, "… · populations not chosen" (964) | `sw:653` "a metadata file read with no column chosen is populations not chosen"; `sw:2731` "a file read and no column chosen: populations not chosen" | |
| a file read with `onePopulation`, "… · one population" (965) | `sw:2742` "a file read with the one population: one population" | |
| a file `notGiven`, "… · pops.csv not loaded" (965) | `sw:2753` "a file notGiven: pops.csv not loaded" | |
| the example, 1,200 variants counted, the missing data filter not counted: "panel.nei · 200 individuals · 1,200 variants before the filters · 1 filter · 3 populations by pop" (966) | `sw:556` "the example of the spec, with 1,200 variants counted" | |
| the thresholds at 0.03 and 0.38 and missing data at 0.05: "111 of 200 individuals kept · 1,117 of 1,200 variants kept · 3 filters" (969) | `sw:1670` "the thresholds of the individuals with their statistics, and the counts" | |
| no counts and no statistics: "200 individuals, how many kept not yet known · 1,200 variants before the filters · 3 filters" (973) | `sw:1676` "the thresholds of the individuals with no statistics and no counts" | |
| a file of no variant, "nopass.vcf · 200 individuals · no variant · 1 filter · …" (976) | `sw:1739` "a file of no variant gives no variant, with or without counts" | the file is named `panel.nei` in the test, not `nopass.vcf` |
| from stage 4, missing data and an LD filter with no distance, 1,200 counted: "… · 1,200 variants before the filters · 2 filters · …" (977) | `sw:2568` "the missing data filter and an LD filter with no distance are 2 filters, over the variants before the filters" | |
| the thresholds alone, no filter of the variants: "… · 1,200 variants · 2 filters · …" (981) | `sw:1768` "no counts and no filter of the variants give the variants of the file alone, which no filter changes" | |
| missing data on, the LD filter and a threshold turned off: "… · 1 filter · …" (982) | `sw:2574` "the LD filter and a threshold turned off are not counted among the filters" | |
| the thresholds and a list to remove holding every individual of p1: "… · 2 of 3 populations by pop" (983) | `sw:1708` "VS7 D2 filters of individuals that leave populations with no individual give how many populations are kept" | the test gives `summaryLine` the individuals kept without p1 as a literal, not a project with a list to remove; `summaryLine` reads the individuals kept, so the input is the same |
| a case for each row of the table of the summary line (985) | `sw:567` "no variants file, and for an opened project the file it was made with"; `sw:573` "a variants file being read"; `sw:579` "a variants file whose read failed"; `sw:585` "a variants file read, its variants once a calculation has counted them"; `sw:596` "the filters of the variants and of the individuals, counted"; `sw:611` "no metadata file"; `sw:617` "a metadata file being read"; `sw:623` "a metadata file whose read failed, with individuals missing, or without the column of the populations"; `sw:663` "a column chosen counts the populations to run, or those of the table while the variants file is not read"; `sw:1664` "the example of the spec, with the individuals and the variants the filters keep"; `sw:1688` "filters of individuals that remove none, or none known, give the individuals of the file"; `sw:1702` "filters that keep no individual give none of them kept"; `sw:1752` "variants not counted yet give no part of the variants, whatever the counts"; `sw:1762` "variants counted with no counts of the filters as they are give the variants of the file"; `sw:1779` "counts with no filter of the variants give the variants of the file" | with the items above, every row of the table |
| `openQuestion`: with calculations, the writing, both, and a file written and not saved, words whole (986) | `saveOpen:59` "the question before an opening, and its sentence of the calculations in flight"; `saveOpen:82` "the question before an opening names the file written and not saved, after the calculations"; `saveOpen:118` "the question before an opening names the writing under way, alone and with the calculations" | |
| `noticeText`: each row of the table of the notice, text whole (988) | `sw:697` "a command"; `sw:705` "a command that changes the load, with a calculation running and no result to remove"; `sw:717` "a command, with calculations stopped"; `sw:730` "a command, with a calculation left behind and nothing removed"; `sw:738` "an undo"; `sw:768` "an undo that changes the load"; `sw:780` "a redo, with a calculation left behind"; `sw:1801` "the statistics of each individual removed, alone and with the diversity"; `sw:1816` "the writing left behind alone"; `sw:1853` "the writing stopped with a calculation and a result removed, with the comma of its row"; `sw:1889` "the written file discarded, alone"; `sw:1899` "the written file discarded with a result removed" | the row of two results removed (spec line 395) is tested with the statistics and the diversity under "the MAF filter changed", not with the histograms under the filter of individuals, and asserts `.text` alone; `noticeText` is the same function over any titles and cause |
| three removed and two stopped, counted (990) | `sw:796` "three removed and two stopped are counted, and two left behind after an undo name Redo" | |
| the writing left behind alone and with a calculation (990) | `sw:1816` "the writing left behind alone"; `sw:1826` "the writing left behind with one calculation, and with two" | |
| stopped with a result removed, with the comma of that row (991) | `sw:1853` "the writing stopped with a calculation and a result removed, with the comma of its row"; `sw:1869` "the writing stopped alone, and after an undo with a result removed and no because" | |
| the written file discarded, alone and with a result removed (992) | `sw:1889` "the written file discarded, alone"; `sw:1899` "the written file discarded with a result removed"; `sw:1914` "the written file discarded comes after the calculations left behind"; `sw:1929` "the written file discarded by an undo names Redo, the action" | |
| `announcementsOf`, from stage 4: the end of a read of the metadata file with each of the four sentences, alone (993) | `sw:2770` "a character not decoded"; `sw:2781` "a column of few whole numbers, and two of them"; `sw:2802` "the column of the populations not in the file"; `sw:2810` "the types set and not applied, one column and two" | |
| all four in their order (995) | `sw:2822` "all four, in their order" | |
| with one column and with two where the words count them (995) | `sw:2781` "a column of few whole numbers, and two of them"; `sw:2810` "the types set and not applied, one column and two" | |
| none of them for a read that brings none up (996) | `sw:2766` "a read that brings nothing up says the read and the check alone" | |
| a pair of states for each row of the first table of the status region, the writing and the Counts among them (997) | `sw:823` "a request new in runs is calculating"; `sw:851` "calculations left behind that went to being stopped in the same change are added to it"; `sw:1002` "a current request that ended done under its key is done, with its warnings counted"; `sw:1039` "a current request that ended in error under its key could not be calculated"; `sw:1057` "a current request being stopped that left runs is stopped"; `sw:1069` "the variants file of the same load read, with the check of the metadata file once it is read"; `sw:1095` "the variants file of the same load read while the metadata file is being read, or failed, has no check"; `sw:1115` "the variants file of the same load failed gives the reason of the project"; `sw:1127` "the metadata file of the same load and options read, with the check once the variants file is read"; `sw:1173` "the metadata file of the same load and options failed gives the reason of the individuals"; `sw:1252` "the warning of a reopened project is announced when it appears, and when it comes with another load"; `sw:1282` "the warning of a reopened project that appears at the read of its load is announced after the read"; `sw:1952` "a check is named by its title as it starts and ends"; `sw:1967` "a check that ends in error names the Variants step, which says why"; `sw:1978` "the end of a Count says the line of the total"; `sw:1993` "the end of a Count where a filter kept none says its warning in place of the total"; `sw:2008` "the end of a Count with no filter of the variants says the variants of the file"; `sw:2060` "the end of a Count over a file with no variant says its warning in place of the total"; `sw:2024` "a calculation new in runs that stopped the writing left behind says so, alone and with calculations"; `sw:2079` "a request of the writing new in runs is Writing, with the name of the file"; `sw:2090` "a request of the writing new in runs that stopped a calculation left behind says so"; `sw:2108` "the writing that ends done says the file, its size and where to save it"; `sw:2123` "the writing that ends with no variant, or in error, says so"; `sw:2449` "the end of a write of a variants file with no variant says so in the step's words"; `sw:2395` "VS7 D2 a Run of the diversity whose statistics end with the filters of individuals keeping no one says it was not run, and why"; `sw:2362` "a Run of the diversity whose statistics fail says, after their failure, that it was not run and where why is"; `sw:2335` "a write whose statistics end with the filters of individuals keeping no one says the file was not written, and why"; `sw:2150` "the writing stopped says so"; `writing:450` "VS5 D3 a change of the threshold with the file not saved discards it: the notice says so, and its Undo brings the threshold back and no Save, and axe" | the last row, a file discarded, empties the region: `writing:450` asserts the region empty in the page. The row of a Run whose statistics keep no one is tested with `keptNoneReason`, not with the lock of no population or of the 9,381 individuals of the PCoA, which are other words of the same row |
| a Run that waits for the statistics: their end and the start of its own request in one change (999) | `sw:2162` "a Run that waits for the statistics: their end and the start of its own request in one change" | |
| the end of a calculation with each of the lines of the comparison with the project file (1000) | `sw:917` "the end of a calculation of an opened project says the comparison with the project file"; `saving:1289` "WS9 D3 under the diversity's table, a VCF read with every variant is told why its numbers are not compared"; `sw:966` "IP10 D3 the end of a calculation of an opened project whose numbers differ from the project file says so" | `differs` added: "Not the same numbers as in the project file. …" with the versions of popnei and of the application |
| none for: a result from the cache after an undo, a calculation left behind that ends, an undo back to a load read, an opening, counts filled by a diversity, a write dropped, a read recorded for other options, the warning of a reopened project while its load is read (1001) | `sw:1185` "a result back from the cache after an undo announces nothing"; `sw:1199` "a calculation left behind that ends, by itself or stopped, announces nothing"; `sw:1211` "an undo back to a load already read announces nothing"; `sw:1239` "an opening announces nothing, the calculations it stops among it"; `sw:2192` "counts filled by the pass of a diversity are not announced"; `sw:2205` "a write dropped because it ended after a change is not announced"; `sw:1341` "a read of the metadata file recorded for options other than those of the present project announces nothing"; `sw:1306` "the warning of a reopened project waits while its load is being read, and is said once, after the read" | |
| `writtenDiscarded`: `done` to `ready`, `locked` and none, not `done` to `saved` or `done` (1007) | `sw:2225` "a file written and not saved is discarded when the writing goes to ready, to locked or to none, and not when it is saved or stays" | |
| the announcer: the same text twice empties the region and writes it each time (1010) | `status:18` "the same text announced twice empties the region and writes it each time" | |
| two texts within 100 ms written together (1011) | `status:127` "two texts announced within 100 ms are written together, joined by a space" | |
| `clear()` empties the region and drops a text waiting (1012) | `status:173` "clear empties the region at once and drops a text waiting" | |
| the text of a change before what it announced and after what came before; two changes keep their order (1013) | `status:148` "the text of a change goes before what was announced while it ran and after what was announced before it" | |
| `undoOrRedo`: an undo that brings the warning back says "Undone: …" before it (1015) | `undoRedo:125` "an undo that brings the warning of a reopened project back says what it undid before the warning" | |
| the links of the stepper change the step and the title; back button; focus on the `<h1>` (1021) | `entry:80` "WS7 D2 the links of the stepper change the step and the title, the back button goes to the step before" | Chromium and WebKit |
| no question on a page just opened; the question after a pick (1024) | `saving:197` "WS9 D3 a page just opened is left with no question, and after a pick of a file leaving it raises the browser's question" | |
| Save project: the dialog with "panel.popnei.json" and the line under its heading as its description (1027) | `saving:210` "WS9 D3 Save project opens its dialog with panel.popnei.json selected and the line of the question before leaving" | |
| Save downloads `panel.popnei.json`, the status region says so, the focus on Save project (1029) | `saving:210` "WS9 D3 Save project opens its dialog with panel.popnei.json selected and the line of the question before leaving" | |
| "run1" downloads `run1.popnei.json`, "run1.json" too (1031) | `saving:245` "WS9 D3 a name typed as run1 downloads run1.popnei.json, and run2.json run2.popnei.json" | the name ending in .json is `run2.json` in the flow |
| Cancel downloads nothing (1033) | `saving:245` "WS9 D3 a name typed as run1 downloads run1.popnei.json, and run2.json run2.popnei.json" | the downloads counted are `run1.popnei.json` alone after Cancel and Escape |
| leaving just after the Save raises no question, after a change the question (1033) | `saving:390` "WS9 D3 leaving the page just after a Save raises no question, and after a change that follows it, the question" | |
| Open project… with `notes.txt`: `notJson` in a dialog, focus back on Open project… (1035) | `saving:457` "WS9 D3 Open project… with notes.txt shows the text of notJson in a dialog whose OK takes the focus" | |
| a file above 64 MB: the text of `tooLarge` (1037) | `saving:632` "WS9 D3 Open project… with a file above 64 MB shows the text of tooLarge" | |
| the saved file after a change: the question, then the Variants step with the focus on its `<h1>` (1038) | `saving:656` "WS9 D3 Open project… with the saved file after a change asks first, Keep leaves the project as it is" | |
| Undo pressed with the mouse until nothing is left: focus on Redo (1040) | `shell:247` "WS9 D3 Undo pressed with the mouse until nothing is left puts the focus on Redo" | |
| F6 reaches the notice after a change that removed the diversity (1042) | `shell:586` "WS9 D3 F6 reaches the notice after a change that removed the diversity, and its Undo gives the table back" | |
| not while the dialog of Save is open, where the keys that would press its Undo leave the project (1043) | `shell:712` "WS9 D3 while the dialog of Save is open, F6 does not reach the notice under it and nothing pressed changes the project" | |
| an error posted into the page shows the bar (1045) | `entry:138` "WS7 D2 an error thrown from a handler shows the error bar as an alert"; `entry:154` "WS7 D2 a promise rejected with nothing to handle it shows the error bar as an alert" | |
| Copy the details in Chromium without the permission of the clipboard shows the box (1046) | `entry:224` "WS9 D3 Copy the details puts the details on the clipboard in WebKit and Firefox, and in Chromium"; `entry:200` "WS7 D2 Copy the details with no clipboard shows the details in a box" | |
| axe finds no violation in each state of the table of the states (1048) | `shell:139` "WS9 D3 the shell empty: Undo and Redo disabled, each step To do or Locked with its reason" (empty); `shell:176` "WS9 D3 the shell ready: every step with its state, the summary with the file" (ready); `shell:201` "WS9 D3 the shell running: Analyses at Running, the start in the status region, and axe" (running); `shell:218` "WS9 D3 the shell with the diversity done: Analyses at Ready while the principal components wait for a Run" (done); `shell:537` "WS9 D3 the shell with results removed: the notice with its words, Undo and Close" (results removed); `entry:138` "WS7 D2 an error thrown from a handler shows the error bar as an alert" and `saving:457` "WS9 D3 Open project… with notes.txt shows the text of notJson in a dialog whose OK takes the focus" (error) | `locked` cannot happen (spec, line 761). The state done is a result on screen with Analyses at Ready while the principal components wait for their Run, as `shell.md` says since commit fb783ac |

### The entry

`docs/specs/entry.md`, "The cases" (758 to 806) and "How it is verified"
(808 to 946): 76 items, 75 with a test that reaches all of it.

The tests are named by these short names of their files: `variants:` for
`e2e/variants.spec.ts`; `cli:` for `src/worker/client.test.ts`; `reads:`
for `src/ui/reads.test.ts`; `prj:` for `src/core/project.test.ts`; `pf:`
for `src/core/projectFile.test.ts`; `runs:` for `src/ui/runs.test.ts`;
`entry:` for `e2e/entry.spec.ts`; `st:` for `src/core/store.test.ts`;
`saving:` for `e2e/saving.spec.ts`; `savingUnit:` for
`src/ui/saving.test.ts`; `files:` for `src/ui/files.test.ts`; `defects:`
for `src/ui/defects.test.ts`; `apps:` for `src/core/apps.test.ts`;
`skeleton:` for `e2e/skeleton.spec.ts`; and `writing:` for
`e2e/writing.spec.ts`.

The size of the written file, 251,074 bytes since stage 4, is
`WRITTEN_AT_005` of `e2e/writing.spec.ts`, and that flow also compares
its bytes with those popnei writes in node.

| item | test | note |
|---|---|---|
| A file picked before popnei has loaded waits, and the step says "Reading panel.nei." (760) | `variants:634` "WS7 D3 a file picked before popnei has loaded is shown as being read" | |
| popnei's wasm does not load: the client gives up after its second start, and every request fails with `couldNotStart` (763) | `cli:948` "no ready twice gives the worker up: every request fails, and the light worker still reads"; `cli:1802` "a calculation worker whose script does not load, a plain error Event, twice: couldNotStart with the client's words"; `variants:782` "WS7 D3 popnei's wasm not served: once the calculation worker is given up, nothing is shown before a file is picked" | `variants:782` asserts two requests of the wasm and no calculation worker left |
| the read recorded as failed, the analyses locked with "panel.nei could not be read: the application could not start its calculations. … load panel.nei again." (765) | `reads:595` "a couldNotStart is recorded as a failure of the worker, as the client gives it"; `prj:1546` "a worker that could not start: the reason says so, not that the file is being read"; `prj:1560` "the worker failed with %o: what happened, and what to do"; `variants:768` "WS7 D3 the calculations that could not start are told in the words of the step" | `variants:768` checks the step's words ("choose panel.nei again"), the lock's words ("load") are checked in `prj:` |
| nothing shown before a file is picked (770) | `variants:782` "WS7 D3 popnei's wasm not served: once the calculation worker is given up, nothing is shown before a file is picked" | |
| the calculation worker crashes while it opens the file: recorded as failed, not asked again (771) | `reads:575` "a workerFailed is recorded as a failure of the worker, and the file is not asked again" | |
| an undo back to a load already read asks for nothing (776) | `reads:280` "an undo back to a load already read asks for nothing" | |
| an opened project: nothing read until the user gives it; `wantedReads` asks for neither a read nor a `notGiven` individuals source (779) | `reads:298` "an opened project, with no variants file and its metadata file read, asks for no read"; `reads:324` "IP10 D3 an opened project whose individuals file is notGiven asks for no read, until the user gives the files" | added: the fixture `v1-metadata-not-read`, a source `notGiven` |
| a project file with a source whose read is pending: none is given, and if one were, the read would fail as a defect (784) | `pf:1376` "an individuals file whose read is pending is refused as header"; `cli:733` "a read of a load with no File fails at once as a defect"; `prj:1560` "the worker failed with %o: what happened, and what to do" | `prj:1560` gives the words of a failure of kind `defect`, "the calculation stopped unexpectedly. Load it again in the Variants step." |
| a record, a `runEnded` or a listener of the store that throws reaches the error bar through `unhandledrejection`; the store as it was (791) | `runs:154` "a runEnded that throws rejects the promise"; `entry:154` "WS7 D2 a promise rejected with nothing to handle it shows the error bar as an alert"; `st:830` "a listener that throws does not keep the others from being called, and the first error is thrown once all were"; `st:1342` "an analysis's run that throws leaves the state as it was, and what it sent is stopped"; `entry:383` "IP10 D3 a record of a read that throws reaches the error bar, and the store stays as it was" | added: the record of a read, inside the `then` of the reads, is made to throw in the built site; the error bar shows it and the step still says the file is being read |
| a defect while the entry starts: the bar with its words for no store, the root not drawn, no "Loading…" (795) | `entry:355` "WS7 D2 a defect while the entry starts shows the bar with its words for the start, and no Loading" | |
| a browser below the floor: the start guard's message (803) | `entry:335` "WS7 D2 a browser without Array.prototype.toSorted is told it is too old, with no error bar" | |
| the page reloaded or closed: the page asks first when the project changed (804) | `saving:197` "WS9 D3 a page just opened is left with no question, and after a pick of a file leaving it raises the browser's question"; `saving:390` "WS9 D3 leaving the page just after a Save raises no question, and after a change that follows it, the question" | |
| the rule of the reads: a pick gives one `openVariants` with its load id, format and read options (815) | `reads:220` "a pick of a variants file asks one openVariants with its load id, format and read options" | |
| a progress, the listener called with the same project: no second request (817) | `reads:235` "a change of the store that keeps the project, as a progress does, asks no second read" | |
| the outcome `opened`: the source read, with the individuals and the ploidy (818) | `reads:246` "the outcome opened makes the source read, with the individuals and the ploidy" | |
| the same file picked again, a new load id: a second `openVariants` (819) | `reads:263` "the same file picked again, a new load id, asks a second openVariants" | |
| a pick then an undo before the outcome: cancelled; a redo: a second `openVariants` of the same load (821) | `reads:352` "a pick undone before its outcome is cancelled, and a redo asks for the same load again" | |
| the options of a CSV set to A then B: A cancelled, B asked; an undo: A asked (822) | `reads:381` "the options of a CSV set to A then B cancel the read of A and ask B, and an undo asks A" | |
| A chosen again as a new object while B is under way, then A again: no second request of A (824) | `reads:395` "A chosen again as a new object while B is read asks A once, and options of the same values in another object ask nothing more" | |
| a read the fake ends `cancelled` without a cancel, its source pending: asked again (825) | `reads:424` "a read the client ends cancelled with no cancel of the entry is asked again while its source is pending"; `reads:491` "an individuals read the client ends cancelled with no cancel of the entry is asked again" | |
| a late `cancelled` of the first read of A after a second was asked: the second stays, its outcome recorded (827) | `reads:438` "a late cancelled of the first read of A leaves the second under way, whose outcome is recorded"; `reads:502` "pick, undo, redo, then a late cancelled of the first read leaves the second under way and asks nothing more" | |
| a cancelled read records nothing (829) | `reads:525` "a cancelled read records nothing" | |
| each row of the table of the outcomes: popnei's refusal, `workerFailed`, `couldNotStart`, the reader's refusal, a failure of the light worker (830) | `reads:246` "the outcome opened makes the source read, with the individuals and the ploidy"; `reads:541` "a refusal of popnei is recorded as failed with popnei's message"; `reads:557` "a reopenFailed of the first open is recorded as a failure of the worker"; `reads:575` "a workerFailed is recorded as a failure of the worker, and the file is not asked again"; `reads:595` "a couldNotStart is recorded as a failure of the worker, as the client gives it"; `reads:614` "the individuals file read is recorded with its table, its columns and what auto found"; `reads:634` "a refusal of the reader is recorded as failed with the way the file is wrong"; `reads:650` "a failure of the light worker is recorded as a failure of the worker"; `reads:525` "a cancelled read records nothing" | |
| after a `workerFailed`, no second request (833) | `reads:575` "a workerFailed is recorded as a failure of the worker, and the file is not asked again"; `reads:650` "a failure of the light worker is recorded as a failure of the worker" | |
| `wantedReads` of an individuals source pending with `csv` null: a read with `csv` null, asked with null, recorded with `individualsRead(fileId, null, …)` (834) | `reads:672` "an individuals source pending with no options of a CSV, an xlsx, is asked for with csv null"; `reads:722` "an xlsx picked is read with csv null, its read recorded under null with found null, and asked once" | |
| an individuals source `notGiven`, and one read, give no read (837) | `reads:298` "an opened project, with no variants file and its metadata file read, asks for no read"; `reads:689` "IP10 D3 an individuals source notGiven, and one read, give no read" | added |
| `startAnalysis`: `null` when `startRun` gives `null` (839) | `runs:117` "gives null when the store starts no calculation" | |
| the outcome given to `runEnded` with the id of its request (840) | `runs:124` "gives the outcome to runEnded with the id of its request" | |
| `startedAt` a number in flight and `null` after (841) | `runs:136` "startedAt of the request is the time of its start while it is in flight, and null after"; `runs:275` "startedAt gives the time of the statistics while the Run waits" | |
| a `runEnded` that throws rejects the promise (842) | `runs:154` "a runEnded that throws rejects the promise" | |
| from stage 3, a Run with a threshold and no statistics: one handle, of the statistics; their outcome gives the diversity's handle, awaited, the promise after it (842) | `runs:236` "a Run that waits for the statistics gives their handle; their outcome gives the analysis's own handle" | |
| a `runEnded` that throws for that handle rejects the promise (847) | `runs:297` "a runEnded that throws for a handle another runEnded gave back rejects the promise" | |
| two `runEnded` that throw: the first rejects, the second thrown outside (848) | `runs:324` "two runEnded that throw for the handles of one press: the first rejects the promise" | |
| a Run that waits for statistics already in flight: no handle, settles at once, its request awaited by the Calculate (849) | `runs:255` "a Run that waits for statistics already in flight gets no handle and settles at once" | |
| `startWriting` in the same way, with `startWrite("nei")` and a fake `write.send` (853) | `runs:461` "a write that waits for the statistics gives their handle; their outcome gives the write's own handle"; `runs:403` "a runEnded that throws for the write's own handle, which the statistics' runEnded gave back, rejects the promise"; `runs:426` "two runEnded that throw for the handles of one write: the first rejects the promise"; `runs:518` "IP10 D3 a write that waits for statistics already in flight gets no handle and settles at once" | added: the last case "in the same way" |
| `createSaving`: `save("panel.popnei.json")` downloads the text of `writeProjectFile` under that name and returns it (855) | `savingUnit:97` "save downloads the text of writeProjectFile under the name given, and returns it" | |
| `save("panel")`, `save("run1.json")`, `save("run1.JSON")` (857) | `savingUnit:112` "a name that does not end in .popnei.json gets it, in place of a .json it ends in, in any case" | |
| `proposedName` is `projectFileName` of the present project (858) | `savingUnit:130` "proposedName is projectFileName of the present project" | |
| `changed`: false first, true after a command, false after an undo back (859) | `savingUnit:139` "changed: false on the first project, true after a command, false after an undo back to it" | |
| false after `opened(p)`, true after a command that follows (861) | `savingUnit:150` "changed: false after opened with the present project, and true after a command that follows" | |
| false after a save, true after a command that follows it (861) | `savingUnit:163` "changed: false after a save, and true after a command that follows it" | |
| true after a result that ends after the save; false after a save made once it ended (862) | `savingUnit:299` "a result that ends after a save, with no command, is a change; a save after it is not"; `savingUnit:312` "a result that comes back after an undo to the saved project, and a result done when it was saved, are no change" | |
| `saveFailed` false, true after a download that throws with the listener called, false after a success (864) | `savingUnit:334` "saveFailed is false at first, true after a save whose download throws" | |
| `read` of the text a save downloaded gives its project (866) | `savingUnit:174` "read of the text a save downloaded gives its project" | |
| `read` of a project file of association refuses it as `otherApp` (867) | `savingUnit:211` "read of a project file of association refuses it as otherApp" | |
| `addFile`: 32 hexadecimal digits, new at each call, the client holds the `File` (869) | `files:6` "gives 32 hexadecimal digits, new at every call, and the client holds the File under it when it returns" | |
| `createDefects`: the first kept, the second in `more`, the 21st counted and not kept (871) | `defects:6` "the first error is kept and the second is counted in more"; `defects:18` "the 21st error is counted and its details are not kept" | |
| `dismiss` empties it (873) | `defects:31` "dismiss empties the log, and a later error is first again" | |
| `details` holds every message; a thrown text kept as its text (873) | `defects:45` "details hold every message kept, where each came from, and a thrown text as its text" | |
| `isResizeObserverNoise` true of the two messages, false of any other (874) | `defects:93` "the two messages of the ResizeObserver loop are noise"; `defects:104` "any other message is not noise" | |
| `apps.ts`: the first project has the missing data filter at 0.1 and nothing else (877) | `apps:102` "the first project of population genetics has the missing data filter at 0.1 and nothing else" | |
| the analyses have distinct ids, each with its step in `POPGEN_ANALYSIS_STEPS` (878) | `apps:109` "the analyses of population genetics have distinct ids: the three checks of the Variants step"; `apps:121` "each analysis has its step in POPGEN_ANALYSIS_STEPS, the checks in the Variants step" | |
| `countsOf` of a diversity result, 1,152 of 1,200: `numVarsRead` 1,200 and the counts of the same `passStats` (879) | `apps:171` "countsOf of a diversity result gives the variants its missing data filter was given, 1,200" | |
| of the histograms, `{ numVars: 1200, filtering: {} }`: 1,200 and no counts (883) | `apps:181` "countsOf of a result of the histograms of the variants gives the variants of its pass and no counts" | |
| of the statistics of each individual, no filter: 1,200 and no counts (885) | `apps:234` "countsOf of a result of the statistics of each individual, whose pass has no filter" | |
| of `filterCounts`: both (887) | `apps:193` "countsOf of a result of filterCounts gives both the variants of the file and the counts" | |
| of the PCA, `missing_data` 1,200 to 1,200 and `ld` 1,200 to 548: 1,200 and no counts (887) | `apps:261` "a PCA with its own LD filter, missing data 1,200 to 1,200 and LD 1,200 to 548" | |
| of the PCA with `missing_data` 1,200 to 1,200 alone: 1,200 and no counts (889) | `apps:275` "a PCA that follows the filters of a new project, missing data 1,200 to 1,200 alone" | |
| `writeCountsOf` of those counts gives the same result of `filterCounts` (891) | `apps:211` "writeCountsOf of the counts of a pass gives the same result of filterCounts as countsOf" | |
| `individualStatsOf`: three fields, and a diversity result throws (892) | `apps:216` "individualStatsOf of a result of individualChecks gives its three fields, and of a diversity result throws" | |
| `saveWritten` in `done`: the name and the very `Blob`, then `saved` with no file (894) | `savingUnit:428` "with the file written, downloadFile is given the name and the very Blob of the state" | |
| `saveWritten` in `ready`: a defect (896) | `savingUnit:444` "with the writing ready, no file written, it is a defect and nothing is downloaded" | |
| `/popnei_web/popgen.html` shows the shell at Variants, no error bar, axe (904) | `entry:47` "WS7 D2 the page opens with the frame at Variants and no error bar, and axe finds no violation" | |
| the walking skeleton: a file read, a result shown, a cancel leaves the application working (907) | `skeleton:161` "WS9 D4 panel.nei, filtered at 0.05 and grouped by the populations of panel_pops.csv"; `skeleton:236` "WS9 D4 a calculation stopped in the middle of a pass leaves the panel ready, and Run after it gives the table" | |
| an error thrown from a handler shows the bar with the message, as an alert (911) | `entry:138` "WS7 D2 an error thrown from a handler shows the error bar as an alert" | |
| a promise rejected with nothing to handle it shows the bar (912) | `entry:154` "WS7 D2 a promise rejected with nothing to handle it shows the error bar as an alert" | |
| a second error adds "1 more error followed it." (915) | `entry:166` "WS7 D2 a second error adds its count after the first, which stays" | |
| a throw in the calculation worker outside a request starts it again, no error bar (918) | `entry:456` "WS7 D2 a throw inside the calculation worker, outside a request, starts it again and shows no error bar" | |
| the entry's file answered 404: "The application could not be loaded. Reload the page." (921) | `entry:279` "WS7 D2 the entry's file answered 404 says the application could not be loaded" | |
| the entry's file of bad syntax: "The application could not start: …" (922) | `entry:295` "WS7 D2 the entry's file of bad syntax says the application could not start" | |
| a throw while React draws the Variants step: the bar, the header, the stepper and the `<h1>` kept (925) | `entry:419` "WS7 D2 a throw while a step is drawn shows the bar and keeps the frame and the step's heading" | |
| a defect while the entry starts, by `Object.freeze`: the bar with its words, no "Loading…" (928) | `entry:355` "WS7 D2 a defect while the entry starts shows the bar with its words for the start, and no Loading" | |
| no `Array.prototype.toSorted`: the guard's words, no error bar (932) | `entry:335` "WS7 D2 a browser without Array.prototype.toSorted is told it is too old, with no error bar" | |
| the Save of a file written at 0.05: `panel.filtered.nei` of 251,074 bytes, then handed to the browser, no second Save (934) | `writing:175` "IP1 D2 the written files of dev.3 on the screen, VS5 D3 panel.nei at 0.05 written and saved" | |
| the project saved, then a file written: a reload raises the question, none once the file is saved (939) | `writing:555` "VS5 D3 with the project saved, leaving the page while a written file is not saved raises the browser's question" | |
| a throw while React draws the shell outside every boundary (943) | none | checked by review, as the spec says |

### The site and its probe

`docs/specs/site.md`, "The cases" (315 to 404) and "How it is verified"
(405 to 469): 45 items, 36 with a test that reaches all of it.

The tests are named by these short names of their files: `probe:` for
`e2e/probe.spec.ts`; `wasm:` for `src/probe/wasmAddress.test.ts`; and
`pmsg:` for `src/probe/messages.test.ts`.

On GitHub the workflow runs the flows in one job per engine, Chromium,
Firefox and WebKit (`.github/workflows/site.yml`, line 59). Eight items
are facts of the build, of the workflow or of the deployed site, checked
on 29 September 2026 by a command or by reading a file, not by a test;
their row names the command or the file in the column of the test, and
they are counted as not reached. The site is served at
`https://jblanca.net/popnei_web/`, to which
`https://joseblanca.github.io/popnei_web/` answers with a redirect,
`301`; `vite.config.ts` has `base: "/popnei_web/"`. The fixtures
`panel.nei`, 261,490 bytes, and `tetraploid.nei`, 16,194 bytes, have the
sizes `e2e/fixtures/make_fixtures.mjs` pins, and
`public/probe/panel.nei` is the same file. The package of popnei is the
release `js-v0.1.0-dev.3`, version 0.1.0, which line 17 of
`e2e/probe.spec.ts` expects. The job `deploy` builds without
`POPNEI_TEST_PAGES`, so the page of the tests of the plots is not on the
site (`404`).

| item | test | note |
|---|---|---|
| The wasm not found or does not compile: `failed` with stage `init`; "popnei could not be loaded.", the message under "Message:", and "Reload the page. If popnei still does not load, report it at …" (317) | `probe:310` "the page says popnei could not be loaded when its wasm is not found" | the 404 case; the input disabled with its text and axe too |
| The address from the list of what the worker fetched, the entry ending in `.wasm`; with none, the worker waits up to one second and sends null (327) | `wasm:46` "a wasm already in the list is given at once, with no wait"; `wasm:53` "a wasm added to the list after the call, as Firefox adds it, is given, and the wait ends"; `wasm:63` "no wasm by the end of the wait gives null, and the list is no longer watched" | the tests pass 1000 as a literal; the worker passes `WASM_ADDRESS_WAIT_MS` |
| The wasm arrives and does not compile: "Address tried:" with the address, in both engines (342) | `probe:373` "the page names the address of a wasm that arrives and does not compile" | |
| The server answers 404: "Address tried:" with the address, and the address inside popnei's message too (344) | `probe:310` "the page says popnei could not be loaded when its wasm is not found"; `probe:336` "IP10 D3 a wasm the server answers 404 for shows the address tried" | added: "Address tried:" with the address, in Chromium and WebKit |
| The network fails: Chromium shows "Address tried:"; WebKit no address, only "Load failed", after the second of the wait (349) | `probe:348` "IP10 D3 a wasm whose request fails is told with the address in Chromium and without it in WebKit" | added: WebKit shows "Load failed" and no address |
| The served file not found: `failed` with stage `open`, source `served`, the address and "the server answered 404 Not Found" (356) | `probe:423` "the page names the address of the served file when it is not found" | |
| The worker does not start: "The probe's worker did not start.", the browser's message only when there is one, and the advice to reload and report (360) | `probe:391` "the page says the probe's worker did not start when its script is not found"; `probe:409` "IP10 D3 a worker that does not start is told with the advice to reload and report" | added: the advice |
| Every request of a file is answered: a throw of the worker's code while it opens a file is sent as `failed` with stage `open`, so no section waits on "Opening …" (367) | `probe:471` "a throw in the worker while it opens a file is answered as a failure of that file"; `probe:490` "a file the browser could not read is not said to have been read as a .nei" | |
| popnei traps: "A defect of the probe: its worker stopped.", with the browser's message, and the advice; the file being opened "the probe's worker stopped before it answered"; the input disabled with its text; the focus moved to the heading of the defects (372) | `probe:547` "a trap of popnei's wasm stops the worker and is shown as a defect"; `probe:580` "IP10 D3 a trap of popnei's wasm is shown with the browser's message" | added: the browser's message in the alert |
| A file popnei refuses, the text in `bad.vcf`: `failed`, stage `open`, source `file`, popnei's message "the source is not a VCF: it starts with …", beside the file input; the served result stays (385) | `probe:146` "a file popnei refuses shows popnei's message and the reader its name chose, and the served result stays" | |
| A file popnei refuses: a VCF gzipped and cut inside its header, a vars file of another version (385) | `probe:166` "IP10 D3 a gzip cut short and a vars file of another version are refused with popnei's message and the reader their name chose" | added: `panel.vcf.gz` cut at 100 bytes, inside the gzip header ("incomplete deflate stream"), and `panel.nei` with its `format_version` changed to 2.0. A gzip cut after the VCF header opens, as the spec says since commit fb783ac |
| After a refusal, the page stays usable for another file (389) | `probe:166` "IP10 D3 a gzip cut short and a vars file of another version are refused with popnei's message and the reader their name chose" | added: the page opens another file after the two refusals |
| A request the worker does not recognise: `failed` with stage `message`; "A defect of the probe: the worker received a request it does not know", with the details (391) | `probe:439` "a request the worker does not know is shown as a defect of the probe"; `probe:514` "a request the worker did not recognise leaves the next file free to be shown" | |
| A message the page does not recognise: "A defect of the probe: the page received a message it does not know", with what was wrong (397) | `probe:456` "a message the page does not know is shown as a defect of the probe" | |
| A VCF of another ploidy opens, as above (400) | `probe:127` "IP10 D3 a tetraploid VCF opens as diploid, since the probe makes no first pass" | added: "12 individuals, ploidy 2", as popnei 0.1.0 opens it in node |
| A file of a gigabyte is read whole; the probe does not guard against it (402) | none | left without a test: a measurement of memory |
| The checks of the coding skill pass locally and in the workflow: format, types, lint, `npm test` (407) | `.github/workflows/site.yml:38` to `:42`; `npm run format:check && npm run typecheck && npm run lint && npm test` | a fact of the build: the workflow runs the four, and at 5328bbf they pass here |
| The validator of `FromProbe` accepts each of its messages, `failed` in each of its three stages (409) | `pmsg:41` "accepts %s" | `test.each` over `ready`, `opened`, `failed` of `open` (served and file), `init` (with and without address) and `message`; the title is shorter than 40 characters |
| It refuses a message of another kind, one with a missing field, one with a field of the wrong type (411) | `pmsg:168` "refuses a message of the page's side, which the page sends"; `pmsg:121` "refuses %s without the field %s"; `pmsg:59` "refuses the field %s of the wrong type" | the two tests that refuse the message of the other side had one title until commit 5771037 |
| It refuses a `failed` with the fields of another stage: an `open` without its `source`, an `init` with one (412) | `pmsg:121` "refuses %s without the field %s" (the row `failed of stage open` without `source`); `pmsg:140` "refuses %s with the field %s of another stage" | |
| The validator of `ToProbe` accepts its two, and refuses the same three wrong ones (414) | `pmsg:196` "accepts openServed"; `pmsg:203` "accepts openFile with the same File it was given"; `pmsg:211` "refuses a message of the worker's side, which the worker sends"; `pmsg:222` "refuses openFile without its file"; `pmsg:233` "refuses openFile whose file is the name of a file" | |
| The text of each way a message can be wrong (415) | `pmsg:330` "writes %j"; `pmsg:369` "names a missing kind without the word undefined"; `pmsg:375` "names a kind that is not text by its type"; `pmsg:381` "names the field, the message, what it holds and what it should" | all eight kinds of `MessageError` in lines 189 to 239 of `src/probe/messages.ts` |
| The lint fails on a file of the probe's page that imports a function of popnei, statically or with `import()` (415) | `eslint.config.js:542` to `:556`: `probePopneiValues` (`group: ["popnei"]`, `allowTypeImports: true`, line 162) and `popneiImportCall` (`ImportExpression[source.value='popnei']`, line 112), for `src/probe/**` but `probeWorker.ts` | fact of the build: holds, read from the configuration. No file breaks the rule to show the lint failing |
| The page shows the version `0.1.0` and, for the served file, "200 individuals, ploidy 2" (420) | `probe:71` "the page shows popnei's version and what popnei read from the served file" | |
| The file input given `panel.nei` shows the same (422) | `probe:88` "a .nei file of the user shows the same as the served one" | |
| Given `panel.vcf.gz`, "200 individuals, ploidy 2 (given: a VCF is opened as diploid)" (423) | `probe:114` "a VCF of the user is opened as diploid and the page says the ploidy was given" | |
| Given `bad.vcf`, popnei's message and the reader its name chose, and the served result stays (425) | `probe:146` "a file popnei refuses shows popnei's message and the reader its name chose, and the served result stays" | |
| A file that failed before popnei read it: no sentence on the reader (426) | `probe:471` "a throw in the worker while it opens a file is answered as a failure of that file"; `probe:490` "a file the browser could not read is not said to have been read as a .nei" | |
| Given `tetraploid.nei`, "12 individuals, ploidy 4" (428) | `probe:103` "a .nei file of another ploidy and size shows its own numbers" | |
| Two files picked one after the other: only the second is shown (429) | `probe:244` "only the last of two files picked in a row is shown" | |
| The answers in either order: the served file held back until `bad.vcf` is refused, then released; each result in its section (430) | `probe:221` "the answers of the two files may come in either order" | |
| popnei's wasm answered 404: "popnei could not be loaded." and popnei's message with the address (433) | `probe:310` "the page says popnei could not be loaded when its wasm is not found" | |
| Answered 200 with bytes that are not wasm: "Address tried:" with the address (434) | `probe:373` "the page names the address of a wasm that arrives and does not compile" | |
| The worker's script answered 404: "The probe's worker did not start." and no empty line after it (436) | `probe:391` "the page says the probe's worker did not start when its script is not found" | |
| A request the worker does not know, and a message the page does not know: each shows its defect, in an alert (438) | `probe:439` "a request the worker does not know is shown as a defect of the probe"; `probe:456` "a message the page does not know is shown as a defect of the probe" | |
| A throw in the worker while it opens a file: the file's section shows the failure (441) | `probe:471` "a throw in the worker while it opens a file is answered as a failure of that file" | |
| A `WebAssembly.RuntimeError` there: the defect of a stopped worker, and the file input disabled (442) | `probe:547` "a trap of popnei's wasm stops the worker and is shown as a defect" | |
| axe finds no violation of WCAG 2.2 at level AA (444) | `probe:71`; `probe:88`; `probe:114`; `probe:146`; `probe:310`; `probe:391`; `probe:423`; `probe:439` (titles above) | `e2e/axe.ts` tags `wcag2a` to `wcag22aa`; not run in the states of `probe:373`, `probe:336`, `probe:348` and `probe:423` |
| Every request is to the origin of the site (447) | `probe:285` "every request of the page and its worker is to the site's origin" | |
| The deployed site: the same test with `BASE_URL`, in the three engines (449) | `BASE_URL=https://jblanca.net/popnei_web/ npx playwright test e2e/probe.spec.ts` | fact of the deployed site. Held on 24 September 2026, "40 passed" in Chromium and WebKit, Firefox opened by hand (`docs/plans/site.report.md:304`); not run again for this map. The address is `jblanca.net`, which the spec names since commit fb783ac |
| `curl -sI` on the `.wasm` shows `Content-Type: application/wasm` (451) | `curl -sI https://jblanca.net/popnei_web/assets/popnei_bg-BOC33uxe.wasm` | fact: holds on 29 September 2026, `HTTP/2 200`, `content-type: application/wasm`; the name found through `probe.html` and `probeWorker-Cc1OnO0L.js` |
| The measurements, `initMs` and `openMs` of each engine on the deployed site, in the work report (455) | `docs/plans/site.report.md:316` to `:340` | fact: holds, Chromium and WebKit five loads each, Firefox one by hand |
| `npm pkg get dependencies.xlsx_rs` gives a URL of `https://github.com/JoseBlanca/xlsx_rs/releases/download/`, not `file:` (458) | `npm pkg get dependencies.xlsx_rs` | fact: holds on this branch, `js-v0.1.0-dev.1/xlsx_rs-0.1.0.tgz` |
| After the first deploy of stage 4, the wasm of xlsx_rs is on the site, as `application/wasm` (460) | `curl -sI https://jblanca.net/popnei_web/assets/xlsx_rs_bg-….wasm` | fact: does not hold yet. Stage 4 is not on `main` nor deployed; the deployed `filesRunner-DHVORp8D.js` names no `.wasm`. The local build has `dist/assets/xlsx_rs_bg-CSXGszP3.wasm` |
| The oldest engines, Firefox 115 and Safari 16.4, held by Vite's `build.target` (464) | `vite.config.ts:104` `target: ["chrome111", "edge111", "firefox115", "safari16.4"]` | fact: holds; by the spec, no test (Playwright runs only the current engines) |

### The base of the 2D plots

`docs/specs/charts/plot2d.md`, "The cases" (462 to 497) and "How it is
verified" (505 to 608): 26 items, 26 with a test that reaches all of it.

The tests are named by these short names of their files: `p2:` for
`src/charts/plot2d.test.ts`; `pl:` for `e2e/plots.spec.ts`; and `hist:`
for `src/charts/histogram.test.ts`.

The flows of `pl:` run on the page of the tests of the plots,
`e2e/plots.html`. Stage 4 added five items to the 20 of the map of stage
3: an overlay with no area (495), the overlay (546), what `drawExport`
draws (550), the colour `exportSvg` writes on what `drawBeside` drew
(579), and the pointer and the PNG of the scatter (593). Two paragraphs
are facts of the build and not items: the dependencies (601),
`d3-selection` 3.0.0, `d3-scale` 4.0.2, `d3-axis` 3.0.0, their types
3.0.12, 4.0.9 and 3.0.6, and `jsdom` 30.1.1, are in `package.json`; and
the page of the tests (555 to 575), which `vite.config.ts` builds in a
second build only when `POPNEI_TEST_PAGES` is set, as the flows and the
job `e2e` of the workflow set it and the job `deploy` does not.

| item | test | note |
|---|---|---|
| Data the plot cannot draw: `check` throws before anything is added; in `update`, the previous data stay drawn (464) | `p2:236` "a check that throws when the plot is made leaves the element with no child"; `p2:245` "an update whose check throws leaves the SVG of the data before" | |
| An element with no size when made: the SVG with its title and description, nothing drawn until the observer gives a size (467) | `p2:263` "an element of size 0 gets the SVG with its texts and nothing drawn"; `p2:369` "the first call of the observer with a size draws once, at the next frame" | |
| An element whose size becomes 0 after a draw: the last drawing stays, and `toSVG` and `toPNG` export it (470) | `p2:319` "an element whose size becomes 0 after a draw keeps its last drawing"; `p2:330` "an element whose width or height alone becomes 0 after a draw keeps its last drawing"; `pl:660` "VS4 D3 a plot whose element becomes 0 by 0 after a draw keeps its last drawing, which toSVG and toPNG export" | |
| No room for the frame: `draw` not called; marks, annotations, legend and axes emptied; SVG 0 by 0, no `viewBox`; `toSVG` throws and `toPNG` rejects saying the frame has no area; the next draw with room, after a resize or an `update` to smaller margins, draws again (473) | `p2:276` "an element not larger than the margins gets an SVG of 0 by 0, and toSVG says the frame has no area"; `p2:309` "toPNG of an element not larger than the margins throws nothing, and its promise rejects saying the frame has no area"; `hist:525` "an update to a threshold in an element 80 pixels high, not larger than the margins of 56 and 44, empties the frame" | `hist:525` checks the threshold (annotations) and the legend emptied, and the `update` back to smaller margins drawing again |
| `update`, `toSVG` or `toPNG` after `destroy`, and `toSVG` or `toPNG` of a plot never drawn: an `Error`, thrown or rejected (487) | `p2:443` "destroy empties the element, disconnects the observer and cancels a waiting draw; a second destroy does nothing"; `p2:594` "toSVG of a plot never drawn, and after destroy, throws, and toPNG rejects"; `pl:623` "VS4 D3 a resize draws the plot again at its new size, and after destroy the element is empty" | |
| A title or a label with markup, `<b>P1</b>`: written as text; no `b` element (491) | `p2:431` "a title with markup in it is text in the title, and no b element is made" | the label of the x axis too |
| A change of theme: nothing drawn again; a later `toSVG` light (493) | `pl:570` "VS4 D3 a change of theme while the plot is on the screen draws nothing again, and a later toSVG is light" | |
| A frame with no area, for a plot with an overlay: the overlay 0 by 0 and `pointer.leave(null)` (495) | `p2:686` "a frame with no area gives the overlay a size of 0 and calls leave with null" | |
| `tableNumber` of 0.07500000000000001 is 0.075 and of 0.9500000000000001 is 0.95; the ticks for 0 to 3 are 0, 1, 2, 3 (511) | `p2:166` "tableNumber shows an edge of popnei to 12 significant digits"; `p2:176` "the ticks of a vertical axis of whole numbers for 0 to 3 are 0, 1, 2 and 3" | |
| The skeleton, `role="img"`, the classes `chart chart-‹kind›`, `<title>` and `<desc>`, ids that differ between two plots (520) | `p2:183` "the skeleton has its classes, role img, and the title and description of the data"; `p2:222` "two plots made in one element each have ids that differ" | |
| A `check` that throws leaves no child; an `update` whose `check` throws leaves the SVG before (523) | `p2:236`; `p2:245` (titles above) | |
| A size of 0 draws nothing; the first call of the observer draws once at the next frame; three calls in a frame draw once at the last size (525) | `p2:263`; `p2:369`; `p2:380` "three calls of the observer within one frame draw once, at the last size" | |
| 420 by 320 with a padding of 10 drawn at 400 by 300, and not again (528) | `p2:353` "an element with a padding is drawn at its content box when made, and not again when the observer gives that box" | |
| Not larger than the margins, when made and after an `update` to larger margins: 0 by 0, nothing in marks, annotations, legend, axes, `toSVG` throws; a resize with room draws it again (531) | `p2:276` (made, and the resize); `hist:525` (the `update`) | |
| `width`, `height`, `viewBox` at the last draw; the frame that size less the margins (536) | `p2:396` "the SVG takes the size of the last draw and the frame that size less the margins" | |
| An `update` redraws in the same `<svg>` (539) | `p2:418` "an update redraws in the same svg element, at the size of the last draw" | |
| A title `<b>P1</b>` is text in the `<title>`, no `b` element (540) | `p2:431` | |
| `destroy`: no child, the observer disconnected, a waiting draw cancelled, a second `destroy` throws nothing; `update` and `toSVG` after it throw; `toPNG` after it, or never drawn, rejects and throws nothing (542) | `p2:443`; `p2:594` | |
| A definition with `pointer` gives `rect.chart-overlay`, the last child of `chart-frame`, of the size of the frame after a draw and a resize, and 0 by 0 with `leave` called when the frame has no area; one without gives none (546) | `p2:664` "a definition with pointer gets the overlay, the last child of the frame, of the size of the frame after a draw and a resize; one without gets none"; `p2:686` | |
| `toSVG` of a definition with `drawExport` holds in `chart-legend` what it drew, with the frame of the last draw; the `chart-legend` on the screen stays empty; a `path.chart-hover` is not in the file (550) | `p2:770` "toSVG holds in chart-legend what drawExport drew, with the frame and the data of the last draw, and the plot on the screen is not changed"; `p2:791` "the file has no overlay and no mark of the point under the pointer" | |
| In Playwright, the SVG of `toSVG`: no `var(`, no `chart-overlay`, a first background rectangle, the light colours when the page is dark, a kept bar `rgb(0, 114, 178)` (577) | `pl:175` "VS4 D3 the SVG of toSVG holds no var( and no overlay, has a first background rectangle, the light colours in the dark theme, and the outlines, dashes and sizes of text of charts.css, and leaves the page as it was" | the dark theme of the system and the one chosen |
| `exportSvg` with a `drawBeside` that adds a mark of `chart-points chart-colour-0` gives it a fill of `rgb(230, 159, 0)` written on it (579) | `p2:868` "exportSvg calls drawBeside once the overlay and the mark of the point under the pointer are removed, and writes the styles on what it drew, stroke-linejoin among them"; `pl:1076` "IP7 D3 toSVG of the scatter has no overlay, no mark of the hover and no var(, holds the legend as text with round joins, and its PNG at 3 times has the colour of the first group at the centre of its mark" | `p2:868` under jsdom, on a `path.chart-points` with a stylesheet planted by the test; in the browser, `pl:1076` now also checks that the `style` of the legend mark `chart-colour-0` in the file holds `fill: rgb(230, 159, 0)`, an assertion added for this map, beside the pixel of its PNG |
| `toPNG(3)` of 600 by 375 is 1,800 by 1,125; 1,400 wide `tooLarge` at 3 and 2,800 at 2; above 2,048 a side `tooLarge` without drawing; the five stubbed failures `notMade`; the canvas left 0 by 0 when made and when refused with `notMade` (583) | `pl:353` "VS4 D3 toPNG(3) of a plot of 600 by 375 pixels is a PNG of 1,800 by 1,125 pixels"; `pl:367` "VS4 D3 a plot 1,400 pixels wide: toPNG(3) rejects with tooLarge, and toPNG(2) gives 2,800 pixels"; `pl:395` "VS4 D3 toPNG(2) of a plot above 2,048 pixels a side rejects with tooLarge without drawing"; `pl:439` "VS4 D3 an image not decoded, a canvas that gives no PNG or throws, or no context, rejects with notMade" | also `pl:409` (the height alone above) and `pl:425` (4,096 exactly, made) |
| A resize draws the plot again at its new size; after `destroy` the element is empty (591) | `pl:623` "VS4 D3 a resize draws the plot again at its new size, and after destroy the element is empty" | |
| On the scatter, a move of the mouse over the overlay calls `pointer.move` with the position in the pixels of the frame, a tap calls it too, and a mouse that leaves calls `pointer.leave` with the element it went onto (593) | `pl:848` "IP7 D3 the pointer at the pixel of point 0 shows its tooltip 6 pixels right of and below it, its name of markup as text, and calls onHover with 0; 30 pixels from every point the tooltip is hidden and onHover called with null"; `pl:1057` "IP7 D3 a tap on point 0 shows its tooltip, and a tap on the plot away from every point hides it"; `pl:914` "IP7 D3 the pointer moved from point 0 onto its tooltip in 10 steps keeps it, off it away from every point or out of the plot hides it, and Escape with the focus in a text field hides it and leaves the field its focus and text"; `p2:701` "a move of the pointer and a touch call move with the position in the pixels of the overlay"; `p2:720` "a mouse or a pen that leaves calls leave with the element it went onto; a finger lifted does not" | in the browser the calls are seen through what the scatter does with them: the point under the pointer found at its pixel (`pl:848`), a tap (`pl:1057`), and a leave onto the tooltip that keeps it (`pl:914`, line 549 of `src/charts/scatter.ts`); the calls themselves under jsdom |
| Its PNG holds the legend that `drawExport` draws, as its SVG does, read from the pixels of the PNG (598) | `pl:1076` (title above) | |

### The scatter plot

`docs/specs/charts/scatter.md`, "The cases" (823 to 862) and "How it is
verified" (871 to 1016): 70 items, 67 with a test that reaches all of
it.

The tests are named by these short names of their files: `sc:` for
`src/charts/scatter.test.ts`; `lg:` for `src/charts/legend.test.ts`;
`pl:` for `e2e/plots.spec.ts`; `hv:` for `src/charts/hover.test.ts`; and
`mk:` for `src/charts/marks.test.ts`.

The cases that are the base's, `destroy`, a size of 0, a frame with no
area and data the plot refuses (846), are mapped under the base of the
2D plots, but for what the scatter adds: the refused data, and what
`destroy` does to the tooltip and to `onHover`. Facts of the build that
are not items: the page of the tests draws 9,381 points in P1 to P4 and
no population, point 0 named `<img src=x onerror="window.plotsInjected =
true">` and P4 `<b>P4</b>`; the dependencies of 1003 to 1015 are in
`package.json` at the versions the spec names (`d3-shape` 3.2.0,
`d3-path` 3.1.0, `d3-scale-chromatic` 3.1.0 and their types), and
`d3-delaunay`, `d3-format`, `d3-array` and `d3-zoom` are not.

| item | test | note |
|---|---|---|
| No point with finite coordinates: the axes drawn as for one point at (0, 0), no mark drawn (825) | `sc:548` "no point with finite coordinates: no mark, and the axes of a point at (0, 0)"; `sc:243` "no finite point: the same scale, around (0, 0); a point not finite leaves the scale alone" | ticks −1, 0, 1 across, no path |
| No point with finite coordinates: the legend counts none (826) | `sc:558` "IP10 D3 no point with finite coordinates: the legend counts none, in the file and in legendOf" | added |
| No point with finite coordinates: the screen says why (827) | none | left without a test: pca.md gives the screen no words for it (see pca3d.md, 693) |
| One point: drawn at the centre of the frame (828) | `sc:234` "one point at (2, 3): 140 pixels per unit, the point at the centre of the frame"; `sc:476` "the path of a group is its marks drawn at the pixels of its points; a group with no point drawn has no path and keeps its colour" | `sc:476` draws the one finite point of P4 as the square at the centre, 162 by 122, of a frame of 324 by 244 |
| Every point at one place: drawn at the centre of the frame (828) | `sc:270` "IP10 D3 every point at one place, three at (2, 3): 140 pixels per unit, drawn at the centre of the frame" | added |
| A group with no point drawn has no path and no entry in the legend, and keeps its mark (830) | `sc:476` "the path of a group is its marks drawn at the pixels of its points; a group with no point drawn has no path and keeps its colour"; `lg:42` "the groups with a point drawn, in the order of the names, then no population" | P4 keeps chart-colour-3 with P1 to P3 undrawn; P3 and P4 have no entry |
| An `update` to another colouring: drawn in the same SVG, no path of the other colouring left (832) | `sc:529` "an update from groups to values and back draws in the same svg, with no path of the other colouring left" | |
| An `update`: the paths are joined by their keys, of the groups or the steps (833) | `sc:574` "IP10 D3 an update joins the paths by their keys" | added: the path of group 2 is the same element after the update |
| An `update` to another colouring hides the tooltip (834) | `sc:1108` "IP10 D3 an update to another colouring, from groups to values, hides the tooltip and calls onHover with null" | added |
| An `update` that only changes the highlight redraws the paths with their classes and order (835) | `sc:452` "group 2 highlighted is drawn last and the four others faded; an update to none, or to 4, beyond the names, fades none" | |
| The highlight of 9,381 points drawn within the next frame, 17 ms in WebKit and Chromium (836) |  | left without a test: a measurement; `pl:1330` prints the times and asserts no bound, by design (969 to 973) |
| A resize draws again at the new size, with new scales and new pixel positions (839) | `sc:588` "IP10 D3 a resize draws again at the new size, with new scales and new pixel positions" | added |
| A resize hides the tooltip (840) | `sc:1092` "an update and a resize hide the tooltip and call onHover with null" | |
| A name with markup of an individual: shown as text in the tooltip, no element made (841) | `sc:868` "a pointer at a point shows its tooltip and its mark and calls onHover once; away from every point hides them and calls it with null"; `hv:186` "made at the first show, hidden from a screen reader, its lines as text"; `hv:142` "a name with markup is kept as it is, for textContent"; `pl:848` "IP7 D3 the pointer at the pixel of point 0 shows its tooltip 6 pixels right of and below it" | |
| A name with markup of a population or a column: shown as text in the tooltip (841) | `sc:919` "IP10 D3 a population or a column name with markup is shown as text in the tooltip" | added |
| A population name with markup: text in the legend of the file, no `b` element (842) | `sc:693` "the background is reckoned from the longest row and is no wider than the frame; a name with markup is text"; `pl:1076` "IP7 D3 toSVG of the scatter has no overlay, no mark of the hover and no var(, holds the legend as text" | `pl:1076` has the row "<b>P4</b> (1,876)" and no `b` or `img` in the file |
| A column name with markup: text in the legend of the file (842) | `sc:721` "IP10 D3 a column name with markup is text in the legend of the file, and no b element is made" | added |
| A change of theme: nothing drawn again; a later `toSVG` in the light theme (844) | `pl:1265` "IP10 D3 a change of theme while the scatter is on the screen draws nothing again, and a later toSVG is in the light theme" | added: the file is checked by the outline, `--chart-axis`, since the first colour of the groups is the same in both themes |
| `destroy` removes the tooltip, calls `onHover(null)` when a point was under the pointer; a second call does nothing (847) | `sc:1131` "destroy after a hover leaves the element with no child, the tooltip gone, calls onHover with null, and a second destroy does nothing" | |
| Data the plot refuses throws, nothing drawn (846) | `sc:292` "names, coordinates and colours not all of one length, and more than 50,000 points, throw" | element has no child after each throw |
| Numbers near ±1.7e308: the step of viridis computed with halves, no infinity (852) | `mk:130` "values near the largest number, whose difference would overflow, take their steps"; `sc:363` "points and values near the largest number are drawn at their places, coloured at the two ends of viridis" | |
| Coordinates near ±1.7e308: the scales over the coordinates times a power of two, every point where it would be, drawn and coloured as others (854) | `sc:363` "points and values near the largest number are drawn at their places, coloured at the two ends of viridis" | both paths at their pixels, fills of steps 0 and 255, no NaN, more than 2 ticks |
| Near ±1.7e308: the labels of the ticks at the size of the coordinates (860) | `sc:396` "IP10 D3 near the largest number, the labels of the ticks are at the size of the coordinates, and a tick past the largest number is left out" | added; since commit faa0995 a tick past the largest number, which read "Infinity", is left out, and the test checks every label; `p2:557` "IP10 D3 tickShown leaves out the ticks…" checks the option of the base that does it |
| `scatterScales` gives the scales at 1 (861) | `sc:279` "IP10 D3 scatterScales gives the scales at 1" | added |
| `groupMark`: group 0 is colour 0 and symbol 0 (880) | `mk:26` "group 0 is colour 0 and symbol 0" | |
| `groupMark`: group 7 colour 0 and symbol 1, group 8 colour 1 and symbol 2 (880) | `mk:30` "group 7 is colour 0 and symbol 1, and group 8 colour 1 and symbol 2" | |
| `groupMark`: the 49 groups 0 to 48 have 49 different pairs (881) | `mk:35` "the 49 groups 0 to 48 have 49 different marks" | |
| `groupMark`: group 49 the pair of group 0 (882) | `mk:48` "group 49 has the mark of group 0" | |
| `scatterScales` for x −1 to 1, y 0 to 1, 400 by 300: 190 px per unit, the domains, y = 1 at 55 px (883) | `sc:222` "x from −1 to 1 and y from 0 to 1 in a frame of 400 by 300: 190 pixels per unit on both axes" | |
| `scatterScales` for one point at (2, 3): 140 px per unit, the point at (200, 150) (887) | `sc:234` "one point at (2, 3): 140 pixels per unit, the point at the centre of the frame" | |
| `scatterScales` for no finite point: the same scale around (0, 0) (889) | `sc:243` "no finite point: the same scale, around (0, 0); a point not finite leaves the scale alone" | |
| `legendOf` of groups: P1 2, P2 1, "No population" 1, no P3, no P4 (891) | `lg:42` "the groups with a point drawn, in the order of the names, then no population" | |
| `legendOf` with P2 highlighted: P1 and "No population" faded (894) | `lg:54` "with P2 highlighted, P1 and no population are faded" | |
| `legendOf` of values [1.5, NaN, 2.5]: min 1.5, max 2.5, 1 with no value (894) | `lg:84` "the values: the smallest and largest drawn, and how many have none" | |
| `viridisStep` of the smallest 0, of the largest 255 (896) | `mk:125` "the smallest value is step 0 and the largest step 255" | |
| `viridisStep` when min and max are equal 128 (897) | `mk:136` "a value when the smallest and the largest are equal is step 128" | |
| `viridisColour` of 0 "#440154" and of 255 "#fde725" (897) | `mk:147` "step 0 is #440154 and step 255 #fde725" | |
| `nearestPoint`: the nearer of two points within 10 px (899) | `hv:21` "the nearer of two points within 10 pixels" | |
| `nearestPoint`: none beyond 10 (900) | `hv:27` "none beyond 10 pixels, and a point at 10 is taken" | |
| `nearestPoint`: a NaN position never (900) | `hv:34` "a NaN position never" | |
| `nearestPoint`: with a depth, the nearer the camera among two at the same pixel (900) | `hv:49` "with a depth, the point nearer the camera among two at the same pixel" | |
| `nearestPoint`: a point at the pointer of depth 0.5 rather than one 8 px away of depth −0.5 (901) | `hv:59` "a point at the pointer, of depth 0.5, rather than one 8 pixels away and nearer the camera" | |
| `nearestPoint`: of two at 6 and 8 px, not covering the pointer, the one at 6 whatever the depths (904) | `hv:65` "of two points 6 and 8 pixels away, neither covering the pointer, the one at 6 whatever their depths" | |
| `tooltipLines` of P2 at (−0.02314, 0.01041): "Population: P2", "PC1 −0.0231, PC2 0.0104", U+2212 (906) | `hv:113` "a point of P2: its name, its population and its coordinates with the minus sign" | |
| `tooltipLines` of a point of no group: "No population" (908) | `hv:125` "a point of no group: No population" | |
| `tooltipLines` of 2019 of Year: "Year: 2019" (909) | `hv:129` "a value 2019 of the column Year is Year: 2019" | |
| `tooltipLines` of −1.5: "Year: −1.5" (909) | `hv:133` "a value of −1.5 is Year: −1.5, with the minus sign" | |
| Each defect of "The TypeScript interface" throws, from `createScatter`, `update` and `legendOf` (910) | `sc:292` "names, coordinates and colours not all of one length, and more than 50,000 points, throw"; `lg:117` "coordinates of different lengths are a defect"; `lg:127` "groups of another length than the points are a defect"; `lg:133` "values of another length than the points are a defect"; `lg:137` "a group index neither below the number of names nor NO_GROUP is a defect"; `lg:149` "a highlight that is neither null nor a whole number from 0 is a defect"; `lg:161` "1,000 names are taken and 1,001 are a defect"; `sc:331` "IP10 D3 a group index beyond the names, more than 1,000 names and values of another length throw from createScatter and from update" | added: what `createScatter` and `update` lacked |
| 50,000 points accepted and 50,001 refused (911) | `sc:292` "names, coordinates and colours not all of one length, and more than 50,000 points, throw"; `lg:172` "50,000 points are taken"; `lg:184` "50,001 points are a defect" | |
| The path of one group of two points is the literal of `symbol` and `pathRound(1)` (912) | `mk:84` "the path of one group of two points is the star drawn at each with one decimal" | |
| The class `chart chart-scatter`, `rect.chart-overlay` last child of `chart-frame`, of the size of the frame (920) | `sc:420` "the class chart chart-scatter, and the overlay the last child of the frame, of the size of the frame" | |
| Four groups and a no-group: five `path.chart-points`, `chart-points-none` first, the class of its colour (922) | `sc:440` "four groups and a no-group: five paths, the no-group first, each group with the class of its colour" | |
| Group 2 highlighted last, the four others faded; `update` to no highlight and to 4 removes the class, no throw (924) | `sc:452` "group 2 highlighted is drawn last and the four others faded; an update to none, or to 4, beyond the names, fades none" | |
| Values: one path per step used, `fill` of viridis, the ring path of no value (928) | `sc:502` "values: one path per step used, filled with its colour of viridis, and the ring of the points with no value first" | |
| An `update` from groups to values and back in the same `<svg>`, no path of the other left (930) | `sc:529` "an update from groups to values and back draws in the same svg, with no path of the other colouring left" | |
| `toSVG` legend in `chart-legend`: the background first, a row per entry, "No population (1)" last (932) | `sc:613` "toSVG holds the legend: its background first, then a row per entry, No population last; the legend on the screen stays empty" | |
| "and ‹n› more" when the frame holds fewer rows than the entries, the case of 20 groups giving "and 17 more" (934) | `sc:670` "when the frame holds fewer rows than the entries, the last row that fits says how many more there are" | |
| With P2 highlighted, `chart-legend-faded` on the other marks and on no text (935) | `sc:649` "with P2 highlighted, the marks of the other entries have chart-legend-faded, and no text has it" | |
| `chart-legend` of the plot on the screen stays empty after `toSVG` (937) | `sc:613` "toSVG holds the legend: its background first, then a row per entry, No population last; the legend on the screen stays empty"; `sc:649` "with P2 highlighted, the marks of the other entries have chart-legend-faded, and no text has it"; `pl:1076` "IP7 D3 toSVG of the scatter has no overlay, no mark of the hover and no var(, holds the legend as text" | |
| `destroy` after a hover leaves the element with no child, the tooltip gone (938) | `sc:1131` "destroy after a hover leaves the element with no child, the tooltip gone, calls onHover with null, and a second destroy does nothing" | |
| Pointer at the pixel of point 0 (from `scatterScales`): a tooltip with its name, `onHover` 0 (950) | `pl:848` "IP7 D3 the pointer at the pixel of point 0 shows its tooltip 6 pixels right of and below it" | Chromium and WebKit here; Firefox on GitHub |
| Moved 30 px from every point: tooltip hidden, `onHover(null)` (952) | `pl:848` "IP7 D3 the pointer at the pixel of point 0 shows its tooltip 6 pixels right of and below it" | the flow checks the 30 px with `nearestDistance` |
| A name `<img src=x onerror=…>` shows as text and runs nothing (953) | `pl:848` "IP7 D3 the pointer at the pixel of point 0 shows its tooltip 6 pixels right of and below it" | `markupRan()` false, no `img` |
| Pointer from point 0 onto its tooltip in 10 steps keeps it; moved off, away from every point, hides it (955) | `pl:914` "IP7 D3 the pointer moved from point 0 onto its tooltip in 10 steps keeps it, off it away from every point" | also `pl:1017` "IP7 D3 in the clusters, the pointer reaches the tooltip of each of 20 points in 10 steps" |
| Escape with the focus in a text field hides the tooltip; the field keeps the focus and its text (958) | `pl:914` "IP7 D3 the pointer moved from point 0 onto its tooltip in 10 steps keeps it, off it away from every point" | |
| A tap, in a context with touch, shows the tooltip of the point tapped (961) | `pl:1057` "IP7 D3 a tap on point 0 shows its tooltip, and a tap on the plot away from every point hides it" | in `test.describe("on a screen of touch")` with `hasTouch` |
| `toSVG`: no `chart-overlay`, no `chart-hover`, no `var(`, the legend, `stroke-linejoin: round` on each `path.chart-points` (962) | `pl:1076` "IP7 D3 toSVG of the scatter has no overlay, no mark of the hover and no var(, holds the legend as text" | |
| PNG at 3 times of 600 by 450 is 1,800 by 1,350, the mark of the first entry `rgb(230, 159, 0)` within 8 (964) | `pl:1076` "IP7 D3 toSVG of the scatter has no overlay, no mark of the hover and no var(, holds the legend as text" | |
| The times of `createScatter` and of an `update` of the highlight, five each, printed with engine and machine, no bound (969) | `pl:1330` "IP7 D3 the times of the scatter of 9,381 points: from createScatter to the next frame" | a measurement; asserts five positive times each |
| The PCA panel in both themes, legend over the plot and a group highlighted, in the screens, looked at; axe on it (999) | none | left without a test: a person looks at the pictures, among them `scr:3174` "the principal components in 2D, p1 highlighted", added by commit 589787f; axe on the panel is pca.md's |

### The 3D view

`docs/specs/charts/pca3d.md`, "The cases" (690 to 710) and "How it is
verified" (731 to 868): 56 items, 50 with a test that reaches all of it.

The tests are named by these short names of their files: `p3t:` for
`src/charts/pca3d.test.ts`; `p3e:` for `e2e/pca3d.spec.ts`; `pnl:` for
`e2e/pcaPanel.spec.ts`; `p3v:` for
`src/ui/analyses/pca/Pca3dView.test.ts`; `proj:` for
`src/charts/project.test.ts`; `wgl:` for `e2e/webgl.spec.ts`; `epca:`
for `e2e/pca.spec.ts`; and `scr:` for `e2e/screens.spec.ts`.

The tests of `proj:` and `p3t:` run in node with three.js used for its
arithmetic, and jsdom for the two tests of no WebGL; those of `p3v:` in
jsdom, with React in StrictMode and a stand-in for the module of the
plot. The flows of `p3e:` run on the page of the tests of the plots, and
`wgl:` prints what the engine gives and asserts only that its page ran.
Each test of `p3e:` skips itself, with its reason, where the engine
gives no WebGL 2 (`openPlots`, line 31 of `e2e/pca3d.spec.ts`), and so
does `epca:464`; both engines here give it. Facts of the build that are
not items: `package.json` has `three` 0.186.1 and `@types/three`
0.186.0, and the lockfile the six packages the spec names, at its
versions, all marked for development.

| item | test | note |
|---|---|---|
| No point with three finite coordinates: the three lines drawn from −1 to 1 and no point (692) | `p3t:109` "no point with three finite coordinates gives no position and the scale 1"; `p3e:686` "IP10 D3 with no point of three finite coordinates, the three lines are drawn from −1 to 1, and no point" | added: the plot drawn with no point |
| No point: the screen says why (693) | none | left without a test: pca.md has no words for it, and the panel counts no point left out (see "Specs that differ from the code") |
| An `update` while the view is turned, to a highlight: the view stays (694) | `p3e:328` "IP8 D2 after viewAlong(2) the order of the points across and up in toSVG" | After `viewAlong(2)`, a highlight by `update` leaves the exported centres equal (line 332). |
| An `update` while the view is turned, to another colouring or other components: the view stays (694) | `p3e:375` "IP10 D3 an update while the view is turned, to another colouring or to other components, keeps the view" | added |
| The labels of the lines change with the components (695) | `pnl:681` "drawn again after a highlight, a colour and other components: its picture" | After PC4 is chosen as the first axis, the first `.chart-pca3d-label` reads "PC4 (1.85%)". `p3v:218` "new data is drawn by the plot's update, once, and the same data again is not" shows the panel gives new data by `update`. |
| An element with no size: nothing rendered, and the next size renders (697) | `p3e:1181` "IP10 D3 an element with no size renders nothing and toSVG exports the last view; the next size renders" | added |
| An element with no size: `toSVG` exports the last view (698) | `p3e:1181` "IP10 D3 an element with no size renders nothing and toSVG exports the last view" | added |
| The context lost while the user exports: `toSVG` and `toPNG` work (699) | `p3e:1133` "IP10 D3 with the context lost, toSVG and toPNG still export the plot" | added |
| Double mount: the first `destroy` loses its context with `forceContextLoss` (701) | `p3e:766` "IP8 D2 after destroy no canvas is left in the element, and the context"; `p3v:206` "IP10 D3 with the module downloaded before, StrictMode's double mount destroys the first plot and makes a second" | added: the double mount with the module in hand destroys the first plot; `p3e:766` shows that a `destroy` loses the context |
| Double mount: the second mount makes a new one, two within the browser's limit (703) | `p3v:206` "IP10 D3 with the module downloaded before, StrictMode's double mount destroys the first plot and makes a second" | added: one canvas left, and the panel given the handle of the second |
| A name with markup: shown as text in the tooltip (705) | `p3e:408` "IP8 D2 the pointer at the projected place of point 0 shows its tooltip" | The name of point 0 is `<img …onerror…>`: the first row reads it as text, no `img` is in the tooltip, and `markupRan()` is false. |
| A name with markup: as text in the hidden title and description, the labels and the legend of the file (705) | `p3e:486` "IP10 D3 a name with markup shows as text in the hidden title and description, the labels of the lines" | added |
| Many groups: each group a `Points` object, a thousand at most (707) | `p3e:720` "IP10 D3 a thousand groups are each drawn, and share at most 50 textures of their marks" | added: 1,000 paths in the export stand for the 1,000 groups, since a `Points` object is not seen from outside |
| Many groups: the groups share the textures of their marks, 50 at most (708) | `p3e:720` "IP10 D3 a thousand groups are each drawn, and share at most 50 textures of their marks" | added: 53 textures counted for 1,000 groups in Chromium, 4 of them the renderer's own; 9 for five groups |
| `projectToScreen`, `OrthographicCamera(−2, 2, 1, −1, 0.1, 10)` at (0, 0, 5): (0,0,0) at (200,100), (2,1,0) at (400,0), (−1,−0.5,0) at (100,150), (0,0,1) nearer than (0,0,−1) (740) | `proj:44` "an orthographic camera of −2 to 2 by −1 to 1 at (0, 0, 5) puts the origin" | |
| 100 points drawn by fast-check: the pixels of `Vector3.project`, within 0.001 pixel (744) | `proj:63` "for 100 points drawn by fast-check, the pixels are those of Vector3.project" | One run of 100 points (`numRuns: 1`), with the view turned. |
| `scenePositions` of x `[1, −4, NaN]`, y `[2, 0, 1]`, z `[0, 2, 3]`: scale 1/4, two positions, index `[0, 1]` (746) | `p3t:87` "for x [1, −4, NaN], y [2, 0, 1] and z [0, 2, 3], the scale is 1/4" | |
| After `lookAlong(controls, 2)`: first to the right, second above, third within 0.0001 of the centre, polar angle 0.000001 (749) | `p3t:122` "along component 2 the first component runs to the right and the second up" | 0.0001 of the width is taken as 0.0002 in the units from −1 to 1. |
| After `lookAlong(…, 0)`: second to the right, third above (754) | `p3t:136` "along component 0 the second component runs to the right and the third up" | |
| After `lookAlong(…, 1)`: first to the right, third above (755) | `p3t:148` "along component 1 the first component runs to the right and the third up" | |
| After `lookAlong(…, "start")`: polar angle 70°, azimuth 30° (756) | `p3t:160` "the starting view, which createView gives and lookAlong(…, 'start') gives back" | |
| From the view along 2, `turnView(…, "horizontal", −15)` leaves the polar angle at 0.000001, and 15 makes it 15° (759) | `p3t:172` "from the view along component 2, a turn of −15° about the horizontal leaves" | The test expects 15° plus 0.000001 radians, to 9 decimals. |
| From the start, five of `turnView(…, "horizontal", −15)`: polar angle 0.000001, azimuth still 30° (762) | `p3t:182` "from the starting view, five turns of −15° about the horizontal stop at the top" | |
| From the view along 1, `turnView(…, "vertical", 15)`: the first end at 0.966 of its length to the right, the second left of the centre (764) | `p3t:191` "from the view along component 1, a turn of 15° about the vertical moves" | |
| `zoomView(controls, 1.25)` from the start: zoom 1.25, the first end 1.25 times as far (768) | `p3t:204` "a zoom of 1.25 from the start makes the camera's zoom 1.25" | |
| 20 calls of 1.25 stop at 20, and 10 of 0.8 at 0.25 (770) | `p3t:216` "20 zooms of 1.25 stop at ZOOM_MAX, 20, and 10 of 0.8 from the start stop at ZOOM_MIN" | |
| `exportRuns`: groups A, B, A from far to near give three runs A, B, A (772) | `p3t:236` "three points of groups A, B and A, from far to near, give three runs" | |
| `exportRuns` with B highlighted: one run of A's two points, then B's (773) | `p3t:251` "with B highlighted, one run of A's two points from far to near, then B's" | |
| Defects: `createPca3d`, the scatter's check with `z` among the arrays of one length (775, 595) | `p3t:288` "createPca3d throws for x, y, z or names of different lengths, more than MAX_SVG_POINTS"; `p3t:306` "IP10 D3 createPca3d throws for values of another length than the points, a highlight that is not a whole number from 0, and more than 1,000 names" | added: what `createPca3d` lacked |
| Defects: `update` with the same data defects (775, 595) | `p3e:789` "IP10 D3 the handle throws for data of another length, a turn not finite and a zoom of 0; after destroy every call but destroy throws" | added |
| Defects: `rotate` of an angle not finite, `zoom` of a factor not finite or 0 or less (775, 598) | `p3t:266` "a turn by an angle that is not finite throws"; `p3t:278` "a zoom by a factor that is not finite, or is 0 or less, throws"; `p3e:789` "IP10 D3 the handle throws for data of another length, a turn not finite and a zoom of 0; after destroy every call but destroy throws" | added: the handle's `rotate` and `zoom` themselves |
| Defects: every function of the handle but `destroy` after `destroy` (775, 600) | `p3e:789` "IP10 D3 the handle throws for data of another length, a turn not finite and a zoom of 0; after destroy every call but destroy throws" | added |
| Defects: `toSVG`, and `toPNG` by rejecting, for a plot never drawn (775, 602) | `p3e:789` "IP10 D3 the handle throws for data of another length, a turn not finite and a zoom of 0; after destroy every call but destroy throws" | added: a plot never drawn exports nothing |
| Under jsdom, `createPca3d` throws a `Pca3dError` of kind `noWebGl` and leaves the element with no child (776) | `p3t:364` "with no WebGL, createPca3d throws a Pca3dError of kind noWebGl" | |
| So does a canvas whose `getContext` gives a context already lost (778) | `p3t:382` "with a context already lost, createPca3d throws a Pca3dError of kind noWebGl" | |
| The plot draws: pixels other than the background at the projected place of three points, from a screenshot (784) | `p3e:267` "IP8 D2 the 3D plot draws: its canvas holds pixels other than the background" | Points 0, 1 and 5 at the start, against white at a corner. Chromium and WebKit here. |
| A drag across it and `rotate("vertical", 15)` each move the points of `toSVG` (787) | `p3e:303` "IP8 D2 a drag across the plot and rotate('vertical', 15) each move the points of toSVG" | |
| After `viewAlong(2)`, the order across and up in `toSVG` is that of the first and second coordinates (788) | `p3e:328` "IP8 D2 after viewAlong(2) the order of the points across and up in toSVG" | |
| The pointer over point 0 shows its tooltip and calls `onHover(0)`; Escape hides it (790) | `p3e:408` "IP8 D2 the pointer at the projected place of point 0 shows its tooltip" | Also `onHover(null)` after Escape. |
| Of two points at one pixel, the tooltip is the one nearer the camera (791) | `p3e:571` "IP8 D2 of two points at one pixel in the view along the third component" | |
| A loss forced with `WEBGL_lose_context`, then its restore: `onContextChange(true)` then `(false)`, and the plot draws again (793) | `p3e:590` "IP8 D2 a loss of the context forced with WEBGL_lose_context, then its restore" | |
| A change of `data-theme` on `<html>` draws the lines in the colour of the new theme, from a screenshot (796) | `p3e:623` "IP8 D2 a change of data-theme on <html> draws the lines in the colour" | |
| `toSVG` has no `var(` and holds the legend; with 40 groups in 600 by 450 its last row says how many more (798) | `p3e:647` "IP8 D2 toSVG has no var( and holds the legend, whose last row with 40 groups" | "and 18 more", 24 rows. |
| `toPNG(3)` of 600 by 450 is 1,800 by 1,350 (800) | `p3e:647` "IP8 D2 toSVG has no var( and holds the legend, whose last row with 40 groups" | |
| After `destroy`, no canvas left, and the old context reports itself lost (802) | `p3e:766` "IP8 D2 after destroy no canvas is left in the element, and the context" | |
| The wheel without Ctrl scrolls the page, `scrollY` grows, and leaves the points of `toSVG` (804) | `p3e:872` "IP8 D2 the wheel over the plot scrolls the page and leaves the points where" | |
| The wheel with Ctrl held moves the points apart and the page does not scroll (806) | `p3e:872` "IP8 D2 the wheel over the plot scrolls the page and leaves the points where" | |
| A pinch on a trackpad, tried by hand (807) | none | left without a test: Playwright cannot send a pinch; the spec has it tried by hand |
| Which headless engines give WebGL: Chromium 153 WebGL 2 by SwiftShader, points 1 to 1,023; WebKit 26.6 by the Apple GPU, 1 to 511; Firefox and GitHub not seen (811) | `wgl:15` "what the engine gives for WebGL 2" | left without a test: a record of what the engines of this Mac give, printed, not a check |
| In an engine that gives none, those tests are reported as not run for that reason, not as passed (835) | none | left without a test: both engines here give WebGL 2, so the skip of `openPlots` and of `epca:464` is never seen |
| And the test of the words of "When the browser has no WebGL" runs there (836) | `pnl:194` "a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words" | It takes WebGL 2 away itself, so it runs in every engine. |
| No file of `pca3d` requested before the first result, with the panel shown before its run, and one after (839) | `epca:464` "IP8 D5 no file of pca3d is asked for before the first result is drawn, and one after" | Skipped where the engine gives no WebGL 2. |
| The first script of `popgen.html` in `dist/` holds no text of three.js, such as "WebGLRenderer" (844) | `epca:513` "IP8 D5 the first script of popgen.html holds nothing of three.js" | Reads `dist/`; also checks the file of pca3d holds it, and records its gzipped size. |
| A download held back, "Loading the 3D view…" shown, 2D pressed, then the file let through: no canvas left (845) | `epca:483` "IP8 D5 a download that arrives after 2D was pressed draws no 3D view"; `p3v:192` "a download that arrives after StrictMode mounted the effect twice draws one plot" | `p3v:192` is the development server's double effect, which the built site does not run. |
| The 3D view, both themes, a group highlighted, in the screens, looked at as testing.md says (851) | `scr:3142` "the principal components in 3D, p1 highlighted" | left without a test: a screenshot per theme, for a person to look at |
| The dependencies it adds, at their versions, approved (855) | none | left without a test: a fact of the build; `package.json` and the lockfile hold them |

### The panel of the PCA and its flow

`docs/specs/analyses/pca.md`, the paragraph of the fixture
`panel_meta.csv` (1822) and that of the flow of Playwright (1831) of
"How it is verified", split into their checks, F1 to F20, and the whole
of "The panel" (1866 to 2417), "What it shows" (P1 to P43), "The states"
(S1 to S11), "What it sends and reads" (D1 to D3), "Its words" (W1 to
W10) and "Accessibility" (A1 to A21): 108 items, 102 with a test that
reaches all of it.

The tests are named by these short names of their files: `pcap:` for
`src/core/analyses/pcaPanel.test.ts`; `epca:` for `e2e/pca.spec.ts`;
`pnl:` for `e2e/pcaPanel.spec.ts`; `panels:` for
`src/ui/analyses/panels.test.ts`; `titles:` for
`src/ui/analyses/titles.test.ts`; `panel:` for
`src/ui/analyses/pca/panel.test.ts`; `variantSwitches:` for
`e2e/variantSwitches.spec.ts`; `res:` for `e2e/pcaResults.spec.ts`;
`p3t:` for `src/charts/pca3d.test.ts`; `lg:` for
`src/charts/legend.test.ts`; `aw:` for `src/ui/analyses/words.test.ts`;
`hv:` for `src/charts/hover.test.ts`; `pca:` for
`src/core/analyses/pca.test.ts`; `p3v:` for
`src/ui/analyses/pca/Pca3dView.test.ts`; `p3e:` for `e2e/pca3d.spec.ts`;
and `pl:` for `e2e/plots.spec.ts`.

The module's own cases are mapped under core and the analyses. Three
passages ask for no test and are not counted: why the method is two
radio buttons (1928), what the panel reads (2124), and "Left for the
running application" (2410); the seven rows of the descriptions (2145 to
2151) are one item, and the rows of popnei's refusals (2176 to 2188)
another. The words made in core count as reached only where a flow also
checks the screen that shows them; the words of
`src/ui/analyses/pca/words.ts`, which the panel draws as they are, count
as reached by their test of Vitest. The parts of the flows that turn the
3D view skip, and say so, in an engine with no WebGL 2.
`e2e/screens.spec.ts` reaches the states of the panel for its pictures
and is not counted.

| item | test | note |
|---|---|---|
| F1 The fixture panel_meta.csv: the 200 individuals of panel_pops.csv in order, `IID`, `popcat`, `altitude` 100 + 10 × i, `NA` for s197 to s199, written by make_fixtures.mjs (1822) | `pcap:754` "the CSV of the table and of the explained variance of the flow, as literals of their first rows"; `pcap:848` "coloured by altitude of panel_meta.csv: its line of the range, and no highlight"; `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back" | s000 at 100, s199 empty, range 100 to 2060 and 3 with no value on the screen; the script itself (make_fixtures.mjs:162 to 181) is not re-run by a test |
| F2 The flow in Chromium, Firefox and WebKit (1831) | none here | left without a test: Firefox does not start here, and runs the flows on GitHub after the merge |
| F3 The three filters of the PCA at "As in the Variants step", missing data at 0.1, MAF and LD off, Run enabled (1833) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first" | |
| F4 Runs the PCA and sees the 3D view first, or in an engine with no WebGL the 2D plot with its words, which the report says (1835) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first" | the annotation "no WebGL 2" is the report |
| F5 The warning of no LD filter (1838) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first" | matched by its start, "Warning: No LD filter was applied" |
| F6 2D, "PC1 (7.61%)" and "PC2 (5.56%)" on the axes (1838) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first"; `epca:531` "IP8 D6 a change of the colour, of the axes and of the view removes no result" | |
| F7 The LD filter set for the PCA: its reason beside the field of the distance and beside Run, which is disabled (1839) | `epca:234` "IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run" | both descriptions and the two texts |
| F8 50000 typed and run: "PC1 (3.55%)", "PC2 (3.40%)", no warning, s000 at −0.7139, 7.6765 (1841) | `epca:234` "IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run" | |
| F9 p1 highlighted from the legend with the keyboard: its entry a `radio` with `aria-checked="true"`, the description names it (1844) | `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back" | |
| F10 Coloured by altitude: the bar of its scale and "Coloured by altitude, from 100 to 2060; 3 individuals have no value." in the description (1846) | `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it" | |
| F11 Back to the populations; no calculation and one step of Undo for each (1848) | `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back" | counts the "run" messages posted to the worker |
| F12 The LD filter set back to the Variants step: 7.61% at once, no calculation, no notice (1850) | `epca:326` "IP8 D4 the LD filter set back to the Variants step gives 7.61% at once with no notice" | |
| F13 Set for the PCA again: 50000 still in the field and 3.55%, no calculation (1854) | `epca:326` "IP8 D4 the LD filter set back to the Variants step gives 7.61% at once with no notice" | |
| F14 Switches to 3D, turns the view with the buttons, and back to 2D (1855) | `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table" | from a fresh page, which opens in 3D; the switch from 2D to 3D is in `pnl:884`; the turns are skipped with no WebGL |
| F15 Saves the table and reads its header and the row of s000 (1856) | `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table" | |
| F16 axe in each state it reaches (1857) | `epca:185`, `epca:234`, `epca:267`, `epca:326`, `epca:351`, `epca:418` (titles above) | not after the two Undo steps of `epca:267` nor after the filter set again in `epca:326`, states of kinds axe checked earlier in the same tests |
| F17 The PCoA with the PCA's own LD filter at 50000: "PC1 (3.68%)" and "PC2 (3.54%)" in 2D (1858) | `epca:418` "IP8 D4 the PCoA with the PCA's own LD filter: PC1 (3.68%), PC2 (3.54%)" | |
| F18 The warning of the correction with "7.87%", "0.047", "53%" and "0.22" (1860) | `epca:418` "IP8 D4 the PCoA with the PCA's own LD filter: PC1 (3.68%), PC2 (3.54%)" | |
| F19 The line under the explained variance with "0.047" and "198 components" (1861) | `epca:418` "IP8 D4 the PCoA with the PCA's own LD filter: PC1 (3.68%), PC2 (3.54%)" | |
| F20 Whether the 3D view and the plot read well, seen by the owner (1862) | none | left without a test: the owner, in the running application |
| P1 Its heading, an `<h2>`, "Principal components", the title the shell names it by (1868) | `panels:22` "the Analyses step shows Principal components before Diversity, each titled as the shell names it"; `titles:11` "each analysis is named by the title of its panel or of its part of the Variants step"; `pnl:530` "Try again pressed with the keyboard moves the focus to the heading of the panel" | the heading of level 2 by that name in the flow |
| P2 Method: two radio buttons, "PCA of the genotypes" and "PCoA of the Kosman distances, for data with many missing genotypes" (1881) | `epca:418` "IP8 D4 the PCoA with the PCA's own LD filter: PC1 (3.68%), PC2 (3.54%)"; `epca:603` "IP10 D3 a new project: PCA of the genotypes chosen, the heading of level 3 of its filters with its line, the three filters in the order of the Variants step" | added: "PCA of the genotypes" checked by default |
| P3 The heading "Filters of the variants for the PCA", an `<h3>`, and its line, "the PCoA" by the method (1886) | `panel:95` "the heading and its line say the method"; `epca:603` "IP10 D3 a new project: PCA of the genotypes chosen, the heading of level 3 of its filters with its line, the three filters in the order of the Variants step" | added: the heading of level 3 and its line, for the PCA and for the PCoA |
| P4 Its three filters in the order of the Variants step, each a group of two radio buttons named as the switch of its filter there (1889) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first"; `epca:603` "IP10 D3 a new project: PCA of the genotypes chosen, the heading of level 3 of its filters with its line, the three filters in the order of the Variants step" | added: the order |
| P5 "As in the Variants step: 0.1", "…: off", "…: r² at most 0.3 within 10000 base pairs", "…: r² at most 0.3, its distance still to be typed there" (1896) | `panel:102` "a filter that follows the Variants step says what the step has on, off, or an LD filter with no distance"; `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first" | 0.1 and off on the screen |
| P6 "For the PCA alone" shows the number fields of that filter with the labels of the Variants step (1903) | `pnl:964` "missing data 1.5 refused, MAF 0,9 key by key refused and 0.9 taken, the LD reason said" | the four labels |
| P7 Under the fields, the line of the Variants step that says what popnei filters on (1909) | `pnl:1347` "IP10 D3 the MAF set for the PCA shows under its field the line of the Variants step of what popnei filters on" | added |
| P8 "For the PCA alone" sends `follow` false with the values kept: 0.1, 0.95, r² 0.1 and no distance the first time, then the last typed (1915) | `pnl:964` "missing data 1.5 refused, MAF 0,9 key by key refused and 0.9 taken, the LD reason said"; `panel:156` "each option is one command with its description, and the others are kept"; `panel:214` "a missing data filter and a MAF filter set back keep the values typed"; `epca:326` "IP8 D4 the LD filter set back to the Variants step gives 7.61% at once with no notice" | |
| P9 "As in the Variants step" sends `follow` true alone: the fields go, the values are kept (1918) | `epca:326` "IP8 D4 the LD filter set back to the Variants step gives 7.61% at once with no notice"; `panel:156` "each option is one command with its description, and the others are kept"; `panel:214` "a missing data filter and a MAF filter set back keep the values typed" | |
| P10 The reason of the PCA's own LD filter with no distance beside the field of the distance, describing it, and beside the disabled Run (1922) | `epca:234` "IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run" | |
| P11 The four fields refuse a number out of range or with more decimals with the line of the Variants step, "1.5 is more than 1; the maximum r² stays 0.1.", "0 is less than 1; the distance stays 50000.", "… is still to be typed.", and send nothing (1936) | `pnl:964` "missing data 1.5 refused, MAF 0,9 key by key refused and 0.9 taken, the LD reason said"; `pnl:1360` "IP10 D3 an r² of 1.5 or typed 0,5 key by key, a distance of 0 or typed 60,000 key by key while it is 50000, and a MAF of 0.123 are refused" | added: the r², a distance refused while one is set, a third decimal, and nothing sent |
| P12 A field left empty sends nothing and shows its value again, or stays empty while there is no distance (1945) | `pnl:1427` "IP10 D3 a field left empty sends nothing: the MAF shows 0.95 again after Enter, and the empty distance stays empty after Tab" | added |
| P13 The distance given `NaN` for no distance, so an Undo leaves no number in it; no key that steps a number sends anything in the empty field (1947) | `variantSwitches:242` "IP3 D3 in the empty distance the arrow keys, Page Up, Page Down, Home and End send nothing"; `pnl:1458` "IP10 D3 in the PCA's empty distance the arrow keys, Page Up, Page Down, Home and End send nothing, and an Undo of 50000 leaves it empty" | added: the PCA's own field |
| P14 The ready state: the options, the line of what it runs on, "200 individuals of panel.nei", "111 of the 200 …, those the filters of individuals keep", and the diversity's line while a threshold waits; Run (1958, 2116) | `panel:121` "the individuals a run will take: all of them, those the filters keep"; `pnl:258` "a worker that stopped with no answer after a PCA of 2,270 of 2,300 individuals"; `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first" | the line on the screen for 2,270 of 2,300 |
| P15 The bar: "3D" and "2D", buttons of one selection that show `view`; "Colour the points by", "Population" and the columns of `colourColumns` (1966, 1973) | `pnl:194` "a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words"; `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `pnl:310` "a highlight is not given to the colouring of a new metadata file nor of another column" | |
| P16 The selects of the components, PC1 to PC‹numComps›: "Horizontal axis" and "Vertical axis" in 2D; "First axis", "Second axis", "Third axis, kept up" in 3D (1968) | `epca:531` "IP8 D6 a change of the colour, of the axes and of the view removes no result"; `pnl:681` "drawn again after a highlight, a colour and other components"; `res:286` "IP10 D3 the selects of the components are Horizontal axis and Vertical axis in 2D, and First axis, Second axis and Third axis, kept up in 3D" | added: the five names |
| P17 In 3D, "Turn left", "Turn right", "Tilt up", "Tilt down", "View along PC‹n›" named by the components of the axes, "Zoom in", "Zoom out", "Reset view", each moving the view its own way (1975, 1984) | `pnl:739` "each button of the view moves it its own way, Reset view gives back the start"; `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table" | the 15° of a turn is `pca3dUnit`'s (charts spec) |
| P18 Five presses of "Tilt down" look down the third component, still turned 30°; "View along PC3" gives the 2D plot of the other two, the first across and the second up (1981) | `p3t:182` "from the starting view, five turns of −15° about the horizontal stop at the top, the azimuth still 30°"; `p3t:122` "along component 2 the first component runs to the right and the second up"; `pnl:739` "each button of the view moves it its own way, Reset view gives back the start" | the panel's "Tilt down" is `rotate("horizontal", -15)` (PcaResults.tsx:372), whose direction `pnl:739` checks |
| P19 A change of the view, the axes or the colour is a command that removes nothing; a turn or a zoom is not a command and is not saved (1989) | `epca:531` "IP8 D6 a change of the colour, of the axes and of the view removes no result"; `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `res:309` "IP10 D3 a turn or a zoom of the 3D view is not a command" | added: a turn adds no step of Undo |
| P20 Choosing for one axis the component another shows swaps the two, in one command (1991) | `panel:238` "choosing for an axis the component another shows swaps the two, in one command" | |
| P21 The plot: the 3D view of the three components chosen, three.js downloaded the first time; the 2D plot of the first two, each axis labelled "PC1 (3.55%)"; the 3D view first, "Loading the 3D view…" meanwhile (1995, 2000) | `epca:464` "IP8 D5 no file of pca3d is asked for before the first result is drawn, and one after"; `pnl:681` "drawn again after a highlight, a colour and other components"; `epca:234` "IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run"; `pnl:919` "the loading of the 3D view, and the drawing the browser takes away and gives back" | |
| P22 No WebGL 2, or three.js not downloaded: the 2D plot in its place with the bar of the 2D plot and the words above it; the option and the pressed button stay 3D; "2D" pressed, the words go (2002) | `pnl:194` "a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words"; `pnl:235` "three.js not downloaded: the 2D plot with its words and Try again" | |
| P23 One component: no plot; the line of "The cases", the explained variance and the table, whose second column follows "Colour the points by", the one control left (2009) | `pcap:655` "one component: PC1 and the line that there is no plot"; `res:369` "IP10 D3 one component: no plot, the line of the cases, the explained variance and the table" | added: the screen |
| P24 Two components: 3D disabled and "The 3D view needs three components, and this result has 2."; a project in 3D draws the 2D plot with the line, the option kept (2012) | `pnl:1283` "a result of two components: 3D disabled, with the line that says why, and the 2D plot"; `res:412` "IP10 D3 two components draw the 2D plot with the line of the 3D view, and the option stays 3D" | added: the option kept, and the 3D view drawn again for a result of three. The line is drawn as a note, "Note: The 3D view needs …", as the spec says since commit fb783ac |
| P25 One function makes the data of both plots, the colours with the group highlighted, so the two give a group the same mark (2015) | `panel:265` "the 2D and 3D data share the colours, the highlight, the labels and the title"; `panel:296` "the 3D data of other components name them for the tooltip" | |
| P26 The legend over the top right corner of the plot, a vertical group of one selection, an entry per group with its mark, name and count, "p0 (48)", and "No population (5)" last (2021) | `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it"; `lg:42` "the groups with a point drawn, in the order of the names, then no population"; `res:454` "IP10 D3 No population is the last entry, with its count, and the legend stands over the top right corner of the plot" | added |
| P27 A press highlights its group and fades the others, a second press clears it, a press on another moves it; one at a time, no population among them (2027) | `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it"; `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `lg:63` "with no population highlighted, every group is faded but it"; `res:473` "IP10 D3 a press on another entry moves the highlight to it, and the entry of No population highlights the individuals in no population" | added |
| P28 The highlight is state of the screen, kept from the 2D plot to the 3D one and back, and not in the project (2030) | `res:498` "IP10 D3 the highlight is kept from the 2D plot to the 3D view and back, and is not a step of Undo" | added |
| P29 The highlight kept with the colouring it was pressed in; a change of the colouring drops it, so no draw marks the wrong group (2033) | `pnl:310` "a highlight is not given to the colouring of a new metadata file nor of another column"; `pcap:524` "the same object for the same result and project, and for a change of the axes or the view" | |
| P30 A faded entry fades its mark and not its name (2040) | `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it" | opacity 0.25 and 1 |
| P31 The legend at the same place over the plot in 2D and in 3D (2041) | `res:521` "IP10 D3 the legend stands at the same place over the plot in 3D and in 2D" | added |
| P32 A colouring by values has a bar of its scale for a legend, and no highlight (2043) | `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it"; `panel:312` "a colouring by values has no highlight" | |
| P33 The explained variance: a table with its caption, "…, of the 199 components of the PCA."; for the PCoA the line of the distances corrected, or not corrected (2050) | `panel:331` "the captions, the line of the PCoA, the cells and the names of the downloads"; `epca:418` "IP8 D4 the PCoA with the PCA's own LD filter: PC1 (3.68%), PC2 (3.54%)" | |
| P34 "Download the explained variance as CSV", `panel.pca_variance.csv` or `panel.pcoa_variance.csv`, header and rows (2061) | `pnl:1042` "the explained variance downloaded with popnei's numbers, the table sorted by PC1"; `panel:331` "the captions, the line of the PCoA, the cells and the names of the downloads"; `pcap:754` "the CSV of the table and of the explained variance of the flow" | |
| P35 The table of the individuals in the order of the file: Individual, the group or value headed by the title of the colours, "No population" or "No value", PC1 to PC‹numComps›; its caption "The place of each of the 200 individuals …, from 548 variants." (2065, 2074) | `pnl:1042` "the explained variance downloaded with popnei's numbers, the table sorted by PC1"; `pnl:473` "the table of the individuals at 320 px: a header of one line"; `pnl:964` "missing data 1.5 refused, MAF 0,9 key by key refused and 0.9 taken, the LD reason said"; `panel:331` "the captions, the line of the PCoA, the cells and the names of the downloads" | the caption read whole with 950 variants |
| P36 Sortable by any column, a table a screen reader reads and the keyboard moves through cell by cell, in a box that scrolls with its header in view (2071) | `pnl:1042` "the explained variance downloaded with popnei's numbers, the table sorted by PC1"; `panel:384` "the rows sorted by a component, by the colour with none last, and not sorted"; `res:642` "IP10 D3 the keyboard moves through the table cell by cell, and its header stays in view while its box scrolls" | added: the keys and the header |
| P37 "Download the table as CSV", `panel.pca.csv` or `panel.pcoa.csv`, header `individual,population,PC1,…,PC10`, the title in lower case, numbers as `String` writes them, quoted as RFC 4180 has it (2076) | `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table"; `pcap:754` "the CSV of the table and of the explained variance of the flow"; `pcap:791` "a group named a,"b" is quoted with its quotes doubled, as is an individual" | |
| P38 The notes of the colours, the axes, the marks past 49 groups and the missing genotypes, under the plot; not warnings, no count on the heading (2084) | `pnl:310` "a highlight is not given to the colouring of a new metadata file nor of another column"; `panel:406` "the marks that repeat past 49 groups, and the notes a change made appear"; `res:734` "IP10 D3 the note of the marks past 49 groups is drawn under the plot as a note, not a warning, with no count on a heading"; `panel:445` "IP10 D3 an individual that lacks more than 20% of its genotypes is named in a note under the plot" | added: no count on a heading in the flow, the note of the missing genotypes in node |
| P39 The line of the versions (2087) | `pnl:1042` "the explained variance downloaded with popnei's numbers, the table sorted by PC1"; `aw:213` "the line of the versions" | |
| P40 A coordinate to four decimals in the table, "−0.7139"; percentages to two decimals; the minus sign on the screen and the hyphen in the files; the centres to one decimal (2090, 2098) | `epca:234` "IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run"; `panel:331` "the captions, the line of the PCoA, the cells and the names of the downloads"; `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table"; `pnl:681` "drawn again after a highlight, a colour and other components" | |
| P41 A coordinate to three significant digits in the tooltip, "−0.714" (2092) | `hv:113` "a point of P2: its name, its population and its coordinates with the minus sign"; `pnl:681` "drawn again after a highlight, a colour and other components" | the format is the charts'; the panel's tooltip is seen with its three coordinates |
| P42 A value of a column as `tableNumber` gives it, in the table, the tooltip, the ends of the bar and the range of the description (2095) | `panel:331` "the captions, the line of the PCoA, the cells and the names of the downloads"; `hv:137` "a point with no value is No value, and a value is written to 12 significant digits"; `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it"; `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back" | |
| P43 The plot not offered as SVG or PNG in stage 4 (2103) | `res:763` "IP10 D3 the plot is not offered as SVG or PNG, in 3D nor in 2D" | added; seen failing with a button "Download SVG" put in |
| S1 Empty cannot happen: until the variants file is read the analysis is locked with a reason (2114) | `pnl:1497` "IP10 D3 before any variants file the PCA is locked: its Run disabled and described by the reason" | added |
| S2 Locked: the reason beside a disabled Run described by it; the options stay editable (2115) | `epca:234` "IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run"; `pca:409` "a variants file of 9,382 individuals locks the PCA with the words of its limit"; `pca:453` "each reason of individualsNeeds comes through: the file being read, refused"; `pca:671` "the PCoA of 9,382 individuals with no filter, the list null" | the screen with the LD reason, typed into while locked; the other reasons are core's words, drawn by the same frame |
| S3 Running: the bar and the clock, and under them "The bar shows the reading of panel.nei. …" (2117) | `pnl:125` "the running state says the bar stands still while the components are calculated"; `panel:148` "the line under the bar names the variants file"; `aw:57` "the line of a calculation under way" | the bar and clock of the PCA on the screen only in `scr:3127` |
| S4 Running while it waits for the statistics of each individual: their bar and words, not the line of the components (2117) | `pnl:1174` "a Run of the PCA that waits for the statistics of each individual shows no line" | |
| S5 Running: the options editable; a change of the key leaves the calculation behind with the notice, and the panel shows the new settings; the colour, the axes or the view keep it (2117) | `pnl:125` "the running state says the bar stands still while the components are calculated"; `pnl:1516` "IP10 D3 the method changed while the PCA runs leaves the calculation behind with the notice and shows Run for the PCoA" | added, in part: a change of the key while it runs, the notice, and its Undo. A change of the colour, the axes or the view while it runs cannot be made, since those controls are drawn only once the result is done (see "Specs that differ from the code"). Not counted |
| S6 Done: the bar, the plot in 3D first or 2D with the words, the legend, the explained variance, the table and their downloads (2118) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first"; `pnl:1042` "the explained variance downloaded with popnei's numbers, the table sorted by PC1" | |
| S7 Done: the warnings above the plot, their count on the heading, "2 warnings" (2118) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first"; `epca:234` "IP8 D4 the PCA's own LD filter: its reason beside the distance and the disabled Run"; `aw:171` "the count of the warnings"; `epca:667` "IP10 D3 a run of a new project: the heading 1 warning above its warning, and the end of the run announced in the status region with its count" | added: the heading "1 warning" |
| S8 Done: after an opened project file, the comparison with its check numbers under the table (2118) | `pnl:1109` "a project saved after the PCA and opened again with panel.nei: the comparison" | |
| S9 Done: a change of the options removes the result (2118) | `epca:559` "IP8 D6 a change of a filter of the PCA removes its result, with its notice" | |
| S10 Results removed: the words, the options and the line of the individuals as in ready; Run; the Undo of the notice or the header (2119) | `epca:559` "IP8 D6 a change of a filter of the PCA removes its result, with its notice"; `epca:684` "IP10 D3 results removed: the line of the individuals and Run, as in ready, and the Undo of the notice and then that of the header bring the result back with no calculation" | added |
| S11 Error: a refusal of popnei stays and Run is not offered, nor after `reopenFailed`; Run again after another failure (2120) | `pnl:181` "a worker that stopped with no answer: the words of any analysis for 200 individuals"; `pnl:1593` "IP10 D3 popnei's refusal of no variant left after the PCA's MAF of 0 in its words, with no Run; the statistics of each individual failed in theirs, and a crash, each with Run again" | added: no Run after the refusal, Run again after the other failures |
| D1 Run calls `startAnalysis(store, "pca")`, Stop sends `store.cancelRun("pca")` (2134) | every flow that runs, e.g. `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first"; `pnl:1554` "IP10 D3 Stop pressed with the keyboard stops the PCA and not the diversity" | added: Stop |
| D2 The descriptions of the commands: the method, set for them alone, set back, a value changed, the colour, the axes, "drawn in 3D"/"… in 2D" (2145 to 2151) | `panel:156` "each option is one command with its description, and the others are kept"; `panel:238` "choosing for an axis the component another shows swaps the two, in one command"; `pnl:546` "Escape in a number field puts back the number it holds"; `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `epca:559` "IP8 D6 a change of a filter of the PCA removes its result, with its notice" | "set back" for the missing data and MAF filters is the same function as the LD's |
| D3 The panel's own state: the clock, the highlight, the 3D view as turned and zoomed, which a change of the colour, the axes or the highlight does not reset and a switch to 2D does, destroying it (2153) | `p3v:218` "new data is drawn by the plot's update, once, and the same data again is not"; `p3e:328` "IP8 D2 after viewAlong(2) the order of the points across and up in toSVG"; `p3v:242` "taken off the page, the plot is destroyed and the panel is given no handle"; `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table"; `res:333` "IP10 D3 the 3D view keeps its turn through a change of the highlight and of the colour, and a switch to 2D and back starts it again" | added: the turn kept in the panel |
| W1 The results removed, "The principal components were removed because …", and after an undo or a redo (2163) | `epca:559` "IP8 D6 a change of a filter of the PCA removes its result, with its notice"; `aw:110` "IP8 D4 the principal components removed are told in the plural, with the plot and the table" | |
| W2 The words of the error: the statistics that failed, "so the PCA was not run"; each row of popnei's refusals, the words of the lock among them, and ‹its message› without backquotes (2176 to 2188, 2192 to 2206) | `pca:1323` "the statistics refused, with the PCA named and then the PCoA"; `pca:1091` "no variant, with a source counted at 0 variants"; `pca:1102` "no variant, with a source not counted or of more than 0"; `pca:1116` "no variant with variance"; `pca:1127` "the LD filter over a file not sorted, the PCA's own"; `pca:1133` "the same, the dataset's LD filter, which the PCA follows"; `pca:1144` "the ploidy of tetraploid.vcf.gz read with ploidy 2"; `pca:1210` "the PCA's limit, which the lock prevents"; `pca:1195` "the PCoA's empty pass, with variants in the source and without"; `pca:1155` "the PCoA's pairs with no distance, four pairs and one"; `pca:1175` "the PCoA of one individual, and of distances all 0"; `pca:1219` "any other refusal: popnei's sentence without its backquotes"; `pnl:1593` "IP10 D3 popnei's refusal of no variant left after the PCA's MAF of 0 in its words, with no Run; the statistics of each individual failed in theirs, and a crash, each with Run again" | added: a refusal and the statistics failed, on the screen |
| W3 `workerFailed` at 250 MB or more: "… the principal components of 4,000 individuals, which need about 0.8 GB, …", counted on the individuals it ran on (2189) | `pnl:258` "a worker that stopped with no answer after a PCA of 2,270 of 2,300 individuals"; `pca:1293` "a PCA of 4,000 individuals gives the words of memory with about 0.8 GB"; `pca:1299` "2,264 individuals give the words of memory"; `pca:1308` "a PCoA at the same numbers, with the principal coordinates" | |
| W4 `workerFailed` below that, `reopenFailed`, `defect`, `couldNotStart`, `protocolMismatch`, `files`: the diversity's rows (2190) | `pnl:181` "a worker that stopped with no answer: the words of any analysis for 200 individuals"; `aw:176` "each failure that is not popnei's has its words" | |
| W5 250 MB decided here; where each engine refuses the memory is measured by the plan (2208) | none | left without a test: a measurement, `e2e/measure.spec.ts`, run by hand |
| W6 "Loading the 3D view…", announced without moving the focus; a download that ends after 2D draws nothing (2235) | `pnl:919` "the loading of the 3D view, and the drawing the browser takes away and gives back"; `epca:483` "IP8 D5 a download that arrives after 2D was pressed draws no 3D view"; `p3v:192` "a download that arrives after StrictMode mounted the effect twice draws one plot" | |
| W7 Its download failed: the words above the 2D plot and "Try again", which downloads it again and draws the 3D view (2236) | `pnl:235` "three.js not downloaded: the 2D plot with its words and Try again"; `pnl:884` "Try again, and 3D pressed after 2D, each ask the network for the file of the 3D view again"; `panel:461` "the first address of http or https in the message of a failure" | |
| W8 No WebGL 2: the words above the 2D plot, for every result until "2D" is pressed, and for a project saved in 3D opened there; the option not switched (2237) | `pnl:194` "a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words"; `pnl:396` "a WebGL context lost at its creation, while three.js downloads and once it is in hand"; `res:778` "IP10 D3 a project saved in 3D and opened in a browser with no WebGL 2 shows the 2D plot with the words of no WebGL, 3D still pressed" | added |
| W9 The browser took the drawing away: "The browser stopped drawing the 3D view. …" until it gives it back (2238) | `pnl:919` "the loading of the 3D view, and the drawing the browser takes away and gives back"; `p3v:227` "the browser taking the drawing away puts its words over the plot" | |
| W10 The help, for the drawer of stage 8 (2242) | none | left without a test: the help drawer of stage 8 is not built |
| A1 The tooltip stays while the pointer is on the point or on it, does not cover its point, hides on Escape, in 2D and 3D; Escape heard only while a tooltip is shown (2299) | `pl:914` "IP7 D3 the pointer moved from point 0 onto its tooltip in 10 steps keeps it"; `pl:848` "IP7 D3 the pointer at the pixel of point 0 shows its tooltip 6 pixels right of and below it"; `p3e:408` "IP8 D2 the pointer at the projected place of point 0 shows its tooltip with three coordinates"; `p3e:457` "IP10 D3 the pointer moved from point 0 onto its tooltip in 10 steps keeps it, still that point's" | added: in 3D, the pointer moved onto the tooltip |
| A2 The plot an image titled "Principal components, PC1 and PC2", or in 3D "…, PC1, PC2 and PC3", by the axes shown (2306) | `pnl:194` "a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words"; `pnl:681` "drawn again after a highlight, a colour and other components"; `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table" | "PC4, PC2 and PC3" after the axis changed |
| A3 The description of the 2D plot from `pcaDescription`, the centres of the groups and the highlight; coloured by values, the range, "Coloured by altitude, from 100 to 2060; 3 individuals have no value." (2310, 2323) | `pcap:834` "the 2D plot of the flow, coloured by popcat, with p1 highlighted, and the 3D view"; `pcap:848` "coloured by altitude of panel_meta.csv: its line of the range, and no highlight"; `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `pnl:310` "a highlight is not given to the colouring of a new metadata file nor of another column" | the whole text in core; parts of it in the 2D plot's `desc` on the screen |
| A4 The table is the keyboard's way in: the Link "Go to the table of the individuals, which gives the place of each one." moves the focus to it (2328) | `pnl:1042` "the explained variance downloaded with popnei's numbers, the table sorted by PC1" | that the points are no stops of the Tab key is the charts' |
| A5 The legend: one stop of the Tab key, the Up and Down arrows, Space or Enter to press, a press on the pressed entry clears it (2333) | `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it"; `res:537` "IP10 D3 the legend is one stop of the Tab key, Up and Down move along it, Enter presses an entry and Space on the pressed entry clears it" | added |
| A6 A group of radio buttons, each entry a radio button checked when highlighted (2336) | `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it" | what a screen reader says, "3 of 3", is not checked |
| A7 The group named by the title of the colours, "Population" or the column's name (2340) | `epca:267` "IP8 D4 p1 highlighted from the legend with the keyboard, and the colour by altitude and back"; `res:565` "IP10 D3 the legend is named by the title of the colours, the column's name when the points are coloured by a column" | added: the column's name |
| A8 The legend hears keys only while it has the focus, not on the whole page (2341) | `res:582` "IP10 D3 the legend hears keys only while it has the focus" | added |
| A9 The 3D view turned and zoomed by its buttons; its canvas described by `pcaDescription` with the three axes, the text of the example (2345) | `pnl:739` "each button of the view moves it its own way, Reset view gives back the start"; `pnl:681` "drawn again after a highlight, a colour and other components"; `pcap:834` "the 2D plot of the flow, coloured by popcat, with p1 highlighted, and the 3D view" | the 3D description read whole on the screen |
| A10 When the browser cannot draw it or takes it away, the words, the 2D button still there; the 2D plot in its place has the description of the 2D plot (2361) | `pnl:194` "a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words"; `pnl:919` "the loading of the 3D view, and the drawing the browser takes away and gives back"; `res:827` "IP10 D3 in a browser with no WebGL 2 the 2D plot drawn in the place of the 3D view has the description of the 2D plot, and the 2D button stays" | added: the description |
| A11 Not colour alone: each group its shape and colour, in the plots and the legend; the table names the group; faded groups keep their shapes (2365) | `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it"; `p3e:987` "IP8 D2 the five groups of five are drawn with five shapes, as in 2D"; `p3e:1040` "IP8 D2 with a group highlighted, the others are faded on the screen, and in the export"; `panel:331` "the captions, the line of the PCoA, the cells and the names of the downloads" | |
| A12 Coloured by values: the bar writes its smallest and largest value, the tooltip the value, "altitude: 1280", the table the value in its second column, sortable by it (2369) | `pnl:1215` "each entry drawn with the mark of its own group, as the plot draws it"; `pnl:681` "drawn again after a highlight, a colour and other components"; `hv:137` "a point with no value is No value, and a value is written to 12 significant digits"; `res:695` "IP10 D3 coloured by altitude, the second column of the table holds each individual's value and sorts by it, the individuals with no value last" | added: the sort by the values |
| A13 The keyboard order: the method, the three filters (one stop each, fields after while set), Run or Stop, the warnings, the bar, the legend, the link, the explained variance, the table, the downloads (2374) | `pnl:498` "from the keyboard alone, the LD filter set for the PCA, 50000 typed in its distance" | the LD group, its two fields and Run. Left without a test: the order of the spec is not that of the code (see "Specs that differ from the code") |
| A14 A number committed by the Tab key, so the distance typed enables Run and the next stop is the PCA's Run (2378) | `pnl:498` "from the keyboard alone, the LD filter set for the PCA, 50000 typed in its distance" | |
| A15 The switch of 2D and 3D keeps the focus on the button pressed (2384) | `epca:351` "IP8 D4 3D, turned with its buttons, and back to 2D; the CSV of the table" | "2D" only |
| A16 "Try again" goes with its words and the focus moves to the heading of the panel (2385) | `pnl:530` "Try again pressed with the keyboard moves the focus to the heading of the panel" | |
| A17 Run and Stop one button; the focus moves to the heading when it goes (2387) | `pnl:1577` "IP10 D3 Run pressed with the keyboard: once the result is drawn and the button gone, the focus is on the heading of the panel"; `pnl:1554` "IP10 D3 Stop pressed with the keyboard stops the PCA and not the diversity" | added |
| A18 The end of a run and the notice announced by the status region and the toast (2389) | `epca:559` "IP8 D6 a change of a filter of the PCA removes its result, with its notice"; `epca:667` "IP10 D3 a run of a new project: the heading 1 warning above its warning, and the end of the run announced in the status region" | added: "Principal components: done, 1 warning." in the status region |
| A19 The panel announces the words of the 3D view, the notes a change of the colour, the axes or the view made appear, and the reason of the LD filter when "For the PCA alone" makes it appear (2394) | `pnl:919` "the loading of the 3D view, and the drawing the browser takes away and gives back"; `pnl:884` "Try again, and 3D pressed after 2D, each ask the network for the file of the 3D view again"; `pnl:194` "a browser with no WebGL 2: the 2D plot in the place of the 3D view with its words"; `pnl:310` "a highlight is not given to the colouring of a new metadata file nor of another column"; `pnl:964` "missing data 1.5 refused, MAF 0,9 key by key refused and 0.9 taken, the LD reason said"; `panel:406` "the marks that repeat past 49 groups, and the notes a change made appear" | |
| A20 A highlight is said by the checked state of its entry and not announced again (2406) | `res:604` "IP10 D3 a highlight is said by the checked state of its entry and is not announced in the status region" | added |
| A21 A warning says "Warning:" and a note "Note:" (2408) | `epca:185` "IP8 D4 a new project: its filters follow the Variants step, the 3D view first"; `epca:418` "IP8 D4 the PCoA with the PCA's own LD filter: PC1 (3.68%), PC2 (3.54%)"; `pnl:310` "a highlight is not given to the colouring of a new metadata file nor of another column" | |

## Left without a test

The 37 items of the 1,015 that no test reaches whole, each with its
reason: a person who has to look or listen, a measurement, a fact of the
build or of the deployed site checked by a command, a case the engines
here cannot give, a spec that says one thing where the code does
another, or a filter the application does not have yet. Those reached in
part say what their tests reach.

The tests are named by these short names of their files: `run:` for
`src/worker/runner.test.ts`; `res:` for `e2e/pcaResults.spec.ts`; `st:`
for `src/core/store.test.ts`; `keys:` for `src/core/keys.test.ts`;
`xlsx:` for `e2e/xlsx.spec.ts`; `ifile:` for
`src/worker/individualsFile.test.ts`; `ind:` for
`e2e/individuals.spec.ts`; `pl:` for `e2e/plots.spec.ts`; `wgl:` for
`e2e/webgl.spec.ts`; and `pnl:` for `e2e/pcaPanel.spec.ts`.

- **The filter of regions of a BED file** (`filterCounts.md`, 277). The
  filter comes with a release of popnei that this stage does not have,
  and the application has no filter of the kind `regions`. Its tests
  belong to the later plan that adds it.
- **Two individuals, the PCA's `s001`** (`analyses/pca.md`, 1313),
  reached in part. `run:2372` asserts one component of 100% and `s000`
  at 18.841443681416774 from 355 variants, and not that `s001` is its
  opposite; the PCoA of the same two is `run:2631`, and the screen of
  one component `res:369`. Recommended: one more assertion in
  `run:2372`, `s001` at −18.841443681416774, seen to fail with the
  runner broken.
- **One refusal of popnei depends on more than the data**
  (`protocol.md`, 612), reached in part, as in stage 3: a plain `Error`
  of popnei is answered as a refusal (`run:1001`), kept under its key
  (`st:1066`), and a new load gives another key (`keys:601`). That
  popnei refuses a block its memory cannot hold with a plain `Error`,
  and not with a trap, is not seen: only a file of gigabytes gives
  popnei such a block.
- **The files wasm, downloaded, then the light worker restarted**
  (`individuals.md`, 994). No action of the page starts the light worker
  again; only a crash of it does, which a flow cannot cause without code
  put into the built site for the test. What the restart would mend, a
  failed `import()` kept by the engine, is now mended in the same worker
  by the retry at another address (`xlsx:194`).
- **The size of the package of xlsx_rs in the built site**
  (`individuals.md`, 1208) is a measurement of the build, not a test:
  the report of the plan, work package 9, gives 565,045 bytes of
  `.wasm`, 300,655 gzipped, and 4,564 and 1,767 of JavaScript.
- **A metadata file changed on the disk gives `unreadable`**
  (`individuals.md`, 1211) is checked by hand, since a test cannot
  change a file the page has picked; the node test `ifile:195` gives the
  reader a `NotReadableError`. The report of this plan does not record
  the check by hand in Chrome, Firefox and Safari.
- **A piece of text pasted into the zone's button: the focus**
  (`steps/individuals.md`, 880). The added `ind:1046` checks the words,
  the announcement, and the focus on the paste button, where the code
  keeps it; the spec puts the focus on the file button. The item is
  reached once the spec says what the code does (below, "Specs that
  differ from the code").
- **The refusal `sheetTooLarge` of an xlsx on the screen**
  (`steps/individuals.md`, 899). Its words are checked in node only,
  since no fixture has a sheet above 2,000,000 cells. A file with one
  value in A1 and one in XFD2000, which `e2e/fixtures/make_fixtures.mjs`
  could write, would give it; the other seven kinds reach the screen.
- **VoiceOver with Safari on the Individuals step**
  (`steps/individuals.md`, 904). It asks a person with a screen reader:
  Playwright reads the tree of accessibility, not what VoiceOver says.
- **The Individuals step seen in the three engines, at 320 pixels and
  wide** (`steps/individuals.md`, 908). It asks a person. The pictures
  of `e2e/screens.spec.ts` are of Chromium, and Firefox does not start
  here.
- **VoiceOver with Safari on the Variants step** (`steps/variants.md`,
  1366). A person with a screen reader; not tried yet.
- **The Variants step seen in the three engines, at 320 pixels and
  wide** (`steps/variants.md`, 1370). A person; stop A of
  `docs/plans/individuals-pca.report.md` waits for the owner to see the
  step in Firefox and Safari.
- **A throw while React draws the shell outside every boundary**
  (`entry.md`, 943). Only code put into the built site for the test
  alone could make React throw there, so the spec leaves the case to the
  review of the code.
- **A file of a gigabyte given to the probe** (`site.md`, 402). The spec
  says the probe does not guard against it; a test would be a
  measurement of memory, and `e2e/measure.spec.ts` measures the
  application, not the probe.
- **The checks of the coding skill pass locally and in the workflow**
  (`site.md`, 407). A fact of the build: the workflow runs the four, and
  at 5328bbf they pass here.
- **The lint refuses a file of the probe's page that imports popnei**
  (`site.md`, 415). A fact of the build, read from `eslint.config.js`;
  no file breaks the rule to show it failing.
- **The flows of the probe against the deployed site, in the three
  engines** (`site.md`, 449). A fact of the deployed site: they passed
  on 24 September 2026 in Chromium and WebKit, with Firefox opened by
  hand (`docs/plans/site.report.md`), and were not run again.
- **The `.wasm` of popnei served as `application/wasm`** (`site.md`,
  451). A fact of the deployed site, checked with `curl -sI` on 29
  September 2026: it holds.
- **The measurements of the probe on the deployed site in the report**
  (`site.md`, 455). A fact: they are in `docs/plans/site.report.md`.
- **xlsx_rs named by the URL of a release** (`site.md`, 458). A fact of
  the build: `npm pkg get dependencies.xlsx_rs` gives
  `js-v0.1.0-dev.1/xlsx_rs-0.1.0.tgz` on this branch.
- **The wasm of xlsx_rs on the site after the first deploy of stage 4**
  (`site.md`, 460). A fact of the deployed site that does not hold yet:
  stage 4 is neither on `main` nor deployed.
- **The oldest engines, Firefox 115 and Safari 16.4** (`site.md`, 464).
  A fact of the build, held by `build.target` of `vite.config.ts`; the
  spec asks for no test, since Playwright runs only the current engines.
- **The screen says why no point has finite coordinates**
  (`charts/scatter.md`, 827). The words belong to pca.md, which has
  none; see the same point of pca3d.md below, and "Specs that differ
  from the code".
- **The highlight of 9,381 points drawn within the next frame, 17 ms**
  (`charts/scatter.md`, 836). A measurement: `pl:1330` prints the times
  in each engine and asserts no bound, since a bound would fail on a
  loaded machine.
- **The PCA panel in both themes, with a group highlighted, in the
  screens** (`charts/scatter.md`, 999). A person looks at the pictures,
  the 2D plot with p1 highlighted among them since commit 589787f, and
  axe on the panel is pca.md's.
- **A plot of no point: the screen says why** (`charts/pca3d.md`, 693).
  pca.md has no words for it, and the panel counts no point left out;
  see "Specs that differ from the code".
- **A pinch on a trackpad** (`charts/pca3d.md`, 807). Playwright cannot
  send one; the spec has it tried by hand.
- **Which headless engines give WebGL** (`charts/pca3d.md`, 811). A
  record of the engines of this Mac, printed by `wgl:15`, not a check.
- **The tests reported as not run where there is no WebGL**
  (`charts/pca3d.md`, 835). Both engines here give WebGL 2, so the skip
  is never seen.
- **The 3D view in both themes, with a group highlighted, in the
  screens** (`charts/pca3d.md`, 851). A person looks at the pictures.
- **The dependencies of the 3D view** (`charts/pca3d.md`, 855). A fact
  of the build: `package.json` and the lockfile hold them.
- **The flow of the PCA in Firefox** (`analyses/pca.md`, 1831, F2).
  Playwright cannot start Firefox on this Mac; GitHub runs it.
- **Whether the 3D view and the plot read well** (`analyses/pca.md`,
  1862, F20). The owner, in the running application.
- **Where each engine refuses the memory of a PCA** (`analyses/pca.md`,
  2208, W5). A measurement of `e2e/measure.spec.ts`, run by hand.
- **The help of the panel** (`analyses/pca.md`, 2242, W10). It is
  written for the help drawer of stage 8, which is not built.
- **A change of the colour, the axes or the view while the PCA runs**
  (`analyses/pca.md`, 2117, S5), the part of S5 left. Those controls are
  drawn only once the result is done, so a user cannot change them while
  it runs, except by an Undo or a Redo; the added `pnl:1516` reaches the
  rest of S5.
- **The order of the Tab key through the panel** (`analyses/pca.md`,
  2374, A13). The order the spec gives is not the one the code has; a
  test waits for the decision asked in "Specs that differ from the
  code".

## Specs that differ from the code

The points the map found where a spec and the code disagree and the
owner has to choose, each with its recommendation. The facts it found
stale, where the code was right and no rule changed, are corrected in
the specs by commit fb783ac, and the scatter's ticks of "Infinity" by
commits dcb4a5f and faa0995; they are not listed here.

The tests are named by these short names of their files:
`variantsOrder:` for `e2e/variantsOrder.spec.ts`; `div:` for
`src/core/analyses/diversity.test.ts`; and `ind:` for
`e2e/individuals.spec.ts`.

- **The ploidy of a project saved while its VCF was read**
  (`core/projectFile.md`, the case at 917). The case says the reopened
  project "compares only those", the name, the size, the format and the
  read options, with the file given; the table of the identity compares
  the ploidy only when both files are read, and so does the code, so a
  VCF saved while it was read with ploidy 4, given again with ploidy 2,
  gets no warning of the identity for the ploidy. Recommended: the case
  says "the name, the size, the format and the choice of the passed
  variants", which is what the table and the code do.
- **A list of individuals popnei would refuse, and the checks of the
  Variants step** (`analyses/writeVariants.md`, "The cases", 405). "The
  three checks of the step are not locked by it" is stale: since 28
  September 2026 the Count and the histograms of the variants read the
  filters of individuals, and such a list locks them with the same
  reason, as `steps/variants.md` (50) says and `variantsOrder:369`
  checks. Recommended: "the statistics of each individual are not locked
  by it; the Count and the histograms of the variants are, with the same
  reason".
- **The key of the diversity of an empty project**
  (`analyses/diversity.md`, "How it is verified", 917) gives `{ pops:
  null, … }` for `emptyProject("popgen")`. An empty project has no
  metadata file, so it is the one population, and the code gives
  `"all"`, as the spec's own "What goes into its key" has it; `null` is
  for a project whose reads are pending. `div:1016` checks the code.
  Recommended: `"all"` for the empty project and `null` for the pending
  one. The report of the plan, work package 4, lists the same
  contradiction between `diversity.md` and `project.md`.
- **The focus after a paste into the Individuals step**
  (`steps/individuals.md`, 879 to 882). The spec keeps the focus on the
  file button after every file not loaded; after a paste the code leaves
  it on the paste button, the button that took the paste, which a user
  of the keyboard is on. Recommended: "the focus where it was: on the
  file button after a pick or a drop, on the paste button after a
  paste", which the added `ind:1046` checks.
- **A plot of no point: "the screen says why"** (`charts/pca3d.md`, 693;
  `charts/scatter.md`, 827). `analyses/pca.md` has no words for it, and
  the panel counts no point left out; `scatter.md` (175) says popnei's
  PCA gives no coordinate that is not finite. Recommended: the two specs
  say that the panel of the PCA never has such a point and drop "the
  screen says why"; or `pca.md` gets the words and the panel the count.
- **The order of the Tab key through the panel of the PCA**
  (`analyses/pca.md`, 2374). The spec gives "…, the explained variance,
  the table, the downloads". The code puts the download of the explained
  variance right after its table, before the table of the individuals,
  and the words of a failed 3D view, with "Try again", between the bar
  of controls and the plot. Recommended: the spec says "the explained
  variance and its download, the table and its download", with "Try
  again" after the bar, which keeps each download next to what it
  downloads.
- **A change while the PCA runs** (`analyses/pca.md`, 2117). The spec
  says a change of the colour, the axes or the view keeps the
  calculation, but those controls are drawn only once the result is
  done. Recommended: the sentence says that only an Undo or a Redo can
  change them while it runs, or it is dropped.
- **The pressed button with two components** (`analyses/pca.md`, 2012).
  With two components "2D" looks pressed, since the switch shows the
  plot drawn, while the option stays 3D; with no WebGL, "3D" stays
  pressed, as the spec asks. The spec says nothing of the first case.
  Recommended: look at it in the running application, and the spec then
  says which button is pressed.
- **"For the PCA alone" under the PCoA** (`analyses/pca.md`, 1903). The
  label stays "For the PCA alone" whatever the method, while the heading
  above it says "Filters of the variants for the PCoA". This is decision
  5 of stop C in the report of the plan, where it waits for the owner
  with the recommendation that the label follow the method.
