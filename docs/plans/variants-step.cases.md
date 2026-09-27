# The map of the cases of stage 3

Deliverable 3 of work package 8 of `docs/plans/variants-step.md`: every
item of "The cases" and of "How it is verified", or "How it is
checked", of the twenty specs of stage 3, with the test that reaches it.
A test reaches an item when it gives the input the item names and checks
the outcome the item gives; each was read for that, not matched by its
name. Made on 27 September 2026, on the branch `plan/variants-step`.

Each item is named in the spec's words, shortened, with the line of the
spec where it starts. A test is named by its file, its line, and the
start of its title; the lines are those of the tree at the commit that
adds this map. The tests of Vitest, which run in node, are under `src/`;
the flows of Playwright, which drive a browser through the built site,
are under `e2e/`. A test marked "added" was written for this map: each
was seen to fail with the code it guards broken on purpose, and to pass
once the code was put back. The flows run in Chromium and WebKit here,
since Playwright cannot start Firefox on this Mac; Firefox runs them on
GitHub once `main` is pushed. The tests of `e2e/measure.spec.ts` are
measurements, run by hand for the report of the plan and by no other
command.

An item counts as having a test when a test reaches all of it. The five
that do not are in the list at the end, "Left without a test", each with
its reason; one of them, of the protocol, is reached in part.

Three sessions mapped the specs, a third each, and two of their counts
are corrected here. The store's spec has 31 items, not 32. The spec of
the base of the 2D plots has 20: two more paragraphs of its "How it is
verified", on its dependencies and on the page of the tests, say what
the build holds and ask for no test, so they are not counted; the
section of the plots below says what the build holds.

Some notes name labels of the plan. Stops A and B are the two points of
the plan where the owner tried the screens in a browser; point R is the
question of stage 2 whether an engine reads a variants file changed on
the disk after it was picked, measured by `e2e/measure.spec.ts` and
answered in the report of that stage. `WRITE_RESTART_BYTES` is the size
of a written file above which the page starts the calculation worker
again, to give back the memory the write took.

| spec | items | with a test |
|---|---|---|
| the project, `docs/specs/core/project.md` | 12 | 12 |
| the individuals kept, `docs/specs/core/individualsKept.md` | 8 | 8 |
| the keys, `docs/specs/core/keys.md` | 11 | 11 |
| the store, `docs/specs/core/store.md` | 31 | 31 |
| the cache, `docs/specs/core/cache.md` | 7 | 7 |
| the project file, `docs/specs/core/projectFile.md` | 22 | 22 |
| the statistics of each individual, `docs/specs/analyses/individualChecks.md` | 13 | 13 |
| the histograms of the variants, `docs/specs/analyses/variantChecks.md` | 11 | 11 |
| the counts of the filters, `docs/specs/analyses/filterCounts.md` | 13 | 12 |
| the written file, `docs/specs/analyses/writeVariants.md` | 17 | 17 |
| the diversity, `docs/specs/analyses/diversity.md` | 24 | 24 |
| the protocol, `docs/specs/worker/protocol.md` | 10 | 9 |
| the messages, `docs/specs/worker/messages.md` | 12 | 12 |
| the runner, `docs/specs/worker/runner.md` | 38 | 38 |
| the client, `docs/specs/worker/client.md` | 24 | 24 |
| the base of the 2D plots, `docs/specs/charts/plot2d.md` | 20 | 20 |
| the histogram, `docs/specs/charts/histogram.md` | 16 | 16 |
| the Variants step, `docs/specs/steps/variants.md` | 39 | 37 |
| the shell, `docs/specs/shell.md` | 16 | 16 |
| the entry, `docs/specs/entry.md` | 31 | 30 |
| all | 375 | 370 |

The map added 21 tests of Vitest, in ten files, and three flows of
Playwright, with a check added to a fourth. Before them, 25 of the 375
items had no test that reached all of them; they reach 20 of those.
None of the tests added found a defect of the code. One number of a spec was stale, and is corrected in
commit 9775603 of this branch: `docs/specs/worker/client.md`, "How it is
verified", gave the restart after a large write at 100,000,001 bytes,
where the code and its tests have `WRITE_RESTART_BYTES`, 25,000,000
bytes, set by the measurement of 27 September 2026.

## The project

`docs/specs/core/project.md`, "The cases" and "How it is verified".
The tests are in `src/core/project.test.ts`, written `prj:` below.

| item | test | note |
|---|---|---|
| An empty project: "Load a variants file in the Variants step." (947) | `prj:1425` "an empty project: load a variants file" | |
| Two picks before the first read comes back: the first read changes nothing (949) | `prj:1193` "two picks of files before the first read comes back: the first read changes nothing" | |
| A worker that could not start, or crashed: the read failed, every analysis locked, a read after the restart replaces it (952) | `prj:1213` "a worker that could not start: the read is recorded as failed …"; `prj:1229` "a read after a failure of the worker"; `prj:1473` "a worker that could not start: the reason says so, not that the file is being read" | |
| An opened project file: `variants` null, a pending read valid, no pending read of the individuals file (958) | `prj:2524` "an opened project file with a read pending is accepted"; `src/core/projectFile.test.ts:377` "an individuals file pending or failed is written as null …"; `src/core/projectFile.test.ts:1054` "… opens into its project" | |
| An opened project with a threshold on the individuals waits for the statistics of the new load (966) | `src/core/store.test.ts:3615` "with a threshold of 0.2, the Run calculates the statistics first, waits for them …" | the project is given by `store.open`, the list is `needsStatistics` and the first Run calculates them first; no test opens it from a project file |
| Each command, the worked case of the order of the filters, each row of the table of the commands (974) | `prj:136` "each command changes its part and keeps the others"; `prj:3791` "the worked case: each filter goes to the place of its kind …"; `prj:438` "the rows of the table of the commands"; `prj:365` "a value parseProject would refuse is a defect" | |
| Each record: into the source of its id, the project itself for another id, a read already recorded, other `csv` options (989) | `prj:1066` "recordVariantsRead"; `prj:1079`, `prj:1154` "gives the project itself for a read already recorded"; `prj:1124` "recordIndividualsRead", with "gives the project itself for a read of other options" | |
| The needs, a case for each row; `individualListNeeds` keep and remove, null while not read, `projectNeeds` null with a bad list; the words of the reader's refusals; "a traits file" (992) | `prj:1424` projectNeeds; `prj:3857` individualListNeeds, `prj:3900`, `prj:3916`; `prj:3565` variantsStepNeeds; `prj:1827` individualsNeeds; `prj:3410` individualsStepNeeds; `prj:3192` "individualsNeeds gives the words of %o"; `prj:3672` "the reasons of the association application name \"a traits file\"" | |
| `individualsCheck`: null when a file is not read; found, missing in order, rows ignored; `individualsNeeds` naming the same (1000) | `prj:3122` "individualsCheck", `prj:3134` "gives the individuals found, all those missing …"; `prj:3177` "individualsNeeds names the individuals it gives as missing" | |
| `escaped` escapes and does not cut, `shown` cuts after 40 (1004) | `prj:3186` "escaped escapes a name and does not cut it, where shown cuts it after 40 characters" | |
| `parseProject`, each check with its kind and path; the text of the second filter; `[maf, missing_data]` refused as `filterOutOfOrder` (1006) | `prj:2137` "each check, with its kind and its path"; `prj:2497` "of the threshold of the second filter of the variants"; `prj:3946` "[maf, missing_data] is filterOutOfOrder at the second filter, with its text" | |
| Properties: read back from JSON equal; one filter of each kind in the fixed order; a command twice gives the project it was given (1013) | `prj:2532` "every project reads back from its JSON equal to itself"; `prj:590` and `prj:3835` "any sequence of commands keeps …"; `prj:611` "a command applied twice gives, the second time, the project it was given" | |

## The individuals kept

`docs/specs/core/individualsKept.md`, "The cases" and "How it is
verified". The tests are in `src/core/individualsKept.test.ts`, written
`ik:` below.

| item | test | note |
|---|---|---|
| An opened project with a threshold: `needsStatistics` until they are calculated, the first Run calculates them first (173) | `src/core/store.test.ts:3615` "with a threshold of 0.2, the Run calculates the statistics first …" | as in the project above: opened with `store.open`, not from a file |
| Filters that remove no individual: the list `null`, each filter given and kept the same number (178) | `ik:217` "filters that remove no individual give the list null …" | |
| Every individual without a called genotype, with a heterozygosity filter: none kept, the lock; without it, kept (182) | `ik:229` "individuals that call no genotype are all removed by any heterozygosity threshold, and kept without it" | |
| Lists that keep none, with a threshold and no statistics: known and empty, the lock at once (186) | `ik:134` "lists that keep none, with a threshold and no statistics …"; `e2e/individualThresholds.spec.ts:534` "a list to remove of every individual, then a threshold turned on: the reason at once …" | |
| A filter of the variants changed: `needsStatistics` again, the lists' counts known (193) | `e2e/individualThresholds.spec.ts:397` "the missing data filter of the variants moved: … the counts of the thresholds Known once …"; `ik:114` "a threshold with no statistics needs them, the lists' counts given …"; `src/core/store.test.ts:3952` "an undo back to a threshold whose statistics the cache dropped … the list needs the statistics" | |
| The worked case of five individuals, each of its steps (209) | `ik:64`, `:71`, `:86`, `:93`, `:102`, `:114`, `:134`, `:158` | |
| popnei's numbers on `panel.nei`: 125, 48 and 119, from `panel_individual_stats.json` (226) | `ik:341` "popnei's statistics at 0.05 give 125 individuals …" | |
| Property: the order of the file, exactly those every filter keeps, each `kept` the next `given` (241) | `ik:418` "the list is in the order of the file and holds exactly the individuals every filter keeps …" | |

## The keys

`docs/specs/core/keys.md`, "The cases" and "How it is verified". The
tests are in `src/core/keys.test.ts`, written `keys:` below.

| item | test | note |
|---|---|---|
| The individuals file by its contents, the variants file by its load (292) | `keys:575` "finds the key again when the individuals file is loaded again"; `keys:594` "gives another key when the variants file is loaded again" | |
| No version of popnei yet: the store never asks for a key without one (297) | `src/core/store.test.ts:292` "while the variants file is read both are locked …"; `src/core/store.test.ts:761` "an analysis that can run before the version of popnei is known is a defect" | |
| A `keyInputs` that returns a new object each time (301) | `keys:610` "gives the same key for a keyInputs that returns a new object each time" | |
| `sha256Hex`: the NIST vectors, 55 to 64 bytes, any Unicode against node, `é中𝄞`, `"\ud800"` a defect (329) | `keys:265` "gives the NIST hash of %s"; `keys:290` "… where the padding goes from one block to two"; `keys:298` "hashes é中𝄞 …"; `keys:324`, `keys:332` "gives node's hash of any text …"; `keys:318` "gives the position in the text of a broken character" | |
| `canonical`: the example and its hash, −0, the escape, `__proto__`, a defect with its path, the same with a memo (346) | `keys:97` "writes the fields sorted by name …"; `keys:346` "hashes the canonical form of the example of the keys spec"; `keys:103`, `:107`, `:111`; `keys:116` "throws a defect with its path on %s", `:136`, `:144`, `:150`; `keys:165` "gives the same text with a memo …" | |
| `keyOf`, the literal key and the literal fingerprint (352) | `keys:404` "gives the literal key of the keys spec"; `keys:414` "gives the literal fingerprint of the keys spec" | |
| `filtersRead`: a key that does not change with a filter not read (375) | `keys:467` "keeps the key with a threshold of the %s the analysis does not read" | |
| `writeKeyOf`, the literal, what changes it and what does not (377) | `keys:977` "gives the literal key …"; `keys:982`, `:1016`, `:1026`, `:1040`, `:1062`, `:1076` | |
| `keyFromWire`: 64 digits a key; 63, an upper case digit, a `g` a defect (391) | `keys:501` "keyFromWire gives a key of 64 lower case hexadecimal digits"; `keys:505` "keyFromWire throws a defect on %s" | |
| Properties: the order of fields, `JSON.parse` back; a part of the table changes the key, one outside keeps it; the fingerprint (393) | `keys:208` "does not depend on the order in which the fields were set"; `keys:222` "reads back with JSON.parse as the value …"; `keys:821` "a change of %s changes the key"; `keys:845` "a change of the name, the size or the read of the variants file keeps the key"; `keys:867` "the fingerprint keeps with the load id …"; `keys:890` "a change of %s changes the fingerprint" | |
| Every analysis has its table, and `keyInputs` of `emptyProject` and of pending reads without reading `p.variants` (404) | `src/core/analyses/diversity.test.ts:987`, `:995` "keyInputs of … without reading p.variants"; `src/core/analyses/stepKeys.test.ts:228`, `:280`, `:318`, the tables of the statistics, the histograms and the counts, and `:270`, `:310`, `:344` "keyInputs gives null for the empty project and for pending reads …" | |

## The store

`docs/specs/core/store.md`, "The cases" and "How it is verified". The
tests are in `src/core/store.test.ts`, written `st:` below.

| item | test | note |
|---|---|---|
| A result that arrives after a change of a setting: ready, cached with its warnings, an undo shows it (1001) | `st:1860` "a late result: after a command, the result of the old key goes into the cache …" | |
| Run asked twice for one key (1008) | `st:1028` "run asked twice for one key: the second startRun returns null …" | |
| A cancel by the user, a crash, a restart (1010) | `st:1190` "a cancel by the user stops the request, and the analysis is ready at once …"; `st:1215` "a crash of the worker shows the failure, and the analysis can run again" | |
| A progress after the end of its request (1013) | `st:1227` "a progress after the end of its request, or before send returns, is passed over …" | |
| A second `popneiReady`: the same version changes nothing; another stops every calculation, drops the notice, makes none (1016) | `st:342` "popneiReady twice with the same version gives the same state object …"; `st:1894` "a second popneiReady of another version stops every calculation at once and drops the notice, making none"; `st:352` | |
| A command that returns the project it was given (1024) | `st:431` "a command that returns the project it was given changes nothing …" | |
| A result under another key, an unknown `runEnded`, a defect while a result is taken in: the failure kept under its key (1026) | `st:1286` "a result under another key than its request's is a defect …" (with "not a key" from the worker); `st:1323` "a runEnded of a request the store did not start …"; `st:1523` "a %s that throws while a result is taken in …" for `warnings`, `checkNumbers` and `countsOf`; `st:4284` "statistics of other individuals than the file's are a defect kept under their key …"; `st:4310` "a statistics.of that throws while the statistics are taken in is a defect kept under their key, and nothing of them is kept" | `st:4310` added |
| An analysis's `run` that throws, before and after sending (1036) | `st:1332` "an analysis's run that throws leaves the state as it was, and what it sent is stopped"; `st:1571` "… one that throws after sending leaves stopped what it stopped" | |
| A new variants file picked while calculations run; an undo of the pick (1042) | `st:2280` "a new variants file stops every calculation in flight at once …, and an undo brings back the results of the old file"; `st:2310` "… stops at once the calculation the notice before left behind …" | |
| One analysis both removed and stopped (1049) | `st:2444` "one analysis can be both among the results removed and in stopped …" | |
| An opened project whose settings are changed and set back (1055) | `st:2740` "an opened project whose settings are changed and set back by another command has its comparison again" | |
| An undo to filters whose statistics the cache dropped (1058) | `st:3952` "an undo back to a threshold whose statistics the cache dropped …"; `st:3615` (a new Run waits for them) | |
| A threshold moved while a Run waits for the statistics (1062) | `st:3733` "a threshold moved while the Run waits leaves the wait behind in the notice; the statistics end and it sends nothing, and a new Run sends at once" | |
| The statistics refused by popnei: every analysis that reads the filters of individuals in `error`, until a change gives the statistics another key (1069) | `st:3763` "a refusal of the statistics by popnei shows in the analysis as the error of the statistics …"; `st:3794` "the refusal of the statistics by popnei lasts until a change gives them another key …, and an undo shows the refusal again"; `e2e/diversityKept.spec.ts:412` "the statistics a Run waited for, refused by popnei, are told in their words …" | `st:3794` added |
| A write that ends after a change of the filters (1073) | `st:5041` "a result that arrives after the command is dropped: ready with dropped …" | |
| A diversity that ends while a Count of the same filters runs (1077) | `st:4729` "a Count in flight for the same key goes on when the counts are filled, and its result replaces them" | |
| A worked sequence (1147) | `st:1706` "a worked sequence: locked, ready, running, done, removed by a command, and done again by its undo with no calculation"; `st:950` "from startRun to done …" | |
| Stopping, each case (1159) | `st:1764`, `:1783`, `:1795`, `:1806`, `:1815` "stopping, …"; `st:2280` and `st:2327` "an undo and a redo that change the load of the variants file stop every calculation …"; `st:2413` "a startRun of an analysis in stopped takes it out …" | |
| A late result (1176) | `st:1860` | |
| A refusal: `refused`, `failed`, `reopenFailed` (1181) | `st:1056` "popnei's refusal is kept under its key …"; `st:1081` "another failure is kept until the next change …"; `st:1109` "a variants file that could not be read again is kept under its load …" | |
| The check numbers (1190) | `st:2674`, `:2687`, `:2702`, `:2711`, `:2720`, `:2729`, `:2740` | |
| The individuals kept and a Run that waits (1200) | `st:3601`, `:3615`, `:3668`, `:3686`, `:3709`, `:3733`, `:3763` | |
| A list of individuals popnei would refuse (1220) | `st:3939` "a list to keep that names z, not in the file, locks the analysis …"; `st:5274` "the write is locked by the reason of individualListNeeds …" | |
| The key whatever the lock, and the lock from the cache (1225) | `st:3952`; `st:3979` "the lock is worked out again from the cache …"; `st:4023` "a put of a result larger than the bound keeps the statistics …" | |
| The counts filled (1239) | `st:4628` "runEnded of a result of the analysis of the variants puts the counts …"; `st:4658`; `st:4712` "with a cache whose bound holds one result …" | |
| The write, each step (1247) | `st:4916`, `:4951`, `:4973`, `:4989`, `:5000`, `:5016`, `:5041`, `:5084`, `:5108`, `:5138`, `:5169`, `:5192`, `:5202` | |
| `popneiReady` twice, `dismissNotice` with no notice (1271) | `st:342`; `st:1884` "dismissNotice with no notice gives the same state object …" | |
| `getState` the same object; the state of an analysis unchanged (1273) | `st:370`; `st:391` | |
| A read recorded, shared by two projects of the history (1276) | `st:600` "two projects of the history that shared the source of a file share the new one after its read" | |
| A result kept to its definition; two definitions of one id (1278) | `st:1426` "each result reaches only the warnings and the checkNumbers of its own analysis"; `st:2766`; `st:736` "two definitions of one id are a defect" | |
| Properties (1282) | `st:3329`, `:3366`, `:3395`, `:3456`, `:3477`; `st:4042` "… whatever the lock by the individuals kept"; `st:4070` "the list given to a request is individualsKept …"; `st:5537` "a write whose result arrives when the project gives another key leaves no file in the state" | |

## The cache

`docs/specs/core/cache.md`, "The cases" and "How it is verified". The
tests are in `src/core/cache.test.ts`, written `cache:` below.

| item | test | note |
|---|---|---|
| A result larger than the bound: kept while shown, dropped by the first put after (174) | `cache:204` (e of 200 kept, then dropped by the put of f); `src/core/store.test.ts:1443` "above its bound, the cache drops a result the project no longer gives, never one it gives" | |
| A result dropped, then asked for again by an undo: ready, made again (178) | `src/core/store.test.ts:1651` "a result dropped by the bound, then asked for again by an undo, is removed, then ready, and is made again by a new run, never an error" | |
| The same result put twice (181) | `cache:264` "the same result put twice is held once …" | |
| `resultBytes`: 8044; the same array twice; two views; a `Map` of views (198) | `cache:140`, `:150`, `:155`, `:165` | |
| The worked case with a bound of 100 bytes (203) | `cache:204` "with a bound of 100 bytes, a put drops the result used longest ago …" | |
| `get` does not change the cache (209) | `cache:244` "get gives the value under a key, or null, and is not a use" | |
| Properties (211) | `cache:305`, `:324`, `:339` | |

## The project file

`docs/specs/core/projectFile.md`, "The cases" and "How it is verified".
The tests are in `src/core/projectFile.test.ts`, written `pf:` below.

| item | test | note |
|---|---|---|
| Saved and opened again before its variants file is given (817) | `pf:298` "no variants file loaded and a reference: the reference's is written"; `pf:439` "an analysis removed, with a reference whose fingerprint matches, carries the reference's check …"; `pf:2378` "written, opened, and written again with no result …" | |
| Opened, given another variants file, saved before a run (821) | `pf:590` "a file loaded, pending, of another identity than the reference's is written …"; `pf:504` | |
| Saved while the variants file is being read (824) | `pf:215` "a variants file loaded and pending, of the reference's identity …"; `pf:1803` "a choice of the passed variants that differs, before the file is read and after …" | |
| Its VCF read again with another ploidy, saved before that read ends (827) | `pf:234` "a VCF of the reference's identity read again with ploidy 4, pending …" | |
| Saved while the individuals file is being read, or refused (832) | `pf:377` "an individuals file pending or failed is written as null …" | |
| An opened individuals file whose CSV options change: the screen offers to load it again (835) | `src/core/project.test.ts:219` "setCsvOptions sets the options and puts the read to pending"; `e2e/saving.spec.ts:720` "after an opening, the Individuals step offers to load the metadata file again …" | |
| An analysis done under other settings saves its own numbers (841) | `pf:541` "a result done on a file of another identity, or under other settings, is saved" | |
| Save before the calculation worker started (844) | `pf:1037` "… is written back byte for byte from its project", on `v1-vcf-pending.popnei.json`, whose `popneiVersion` is null | |
| The same project file opened twice (847) | `pf:1054` "… opens into its project"; `src/core/analyses/diversity.test.ts:915` "the same table from another file … leaves the key the same" | the case asks nothing of the code; these show why it is harmless |
| The fixtures of version 1, `v1-every-filter.popnei.json` among them (875) | `pf:1037`, `pf:1054`; `pf:1657` "… opens into its project, every filter in its order"; `pf:1664` "… is written back byte for byte" | |
| What is written (894) | `pf:198` to `pf:625` | |
| The writing (904) | `pf:632`, `pf:648`, `pf:668` | |
| Each refusal, `filterOutOfOrder` among them (908) | `pf:1094` to `pf:1358`; `pf:1679` "… maf then missing_data is refused as filterOutOfOrder, with its text"; the texts `pf:1374`, `pf:1380`, `pf:1399` | |
| A byte order mark (921) | `pf:1443` | |
| The fingerprints (923) | `pf:1453` | |
| The count with the diversity's own definition (926) | `pf:1250`, `pf:1274`; `pf:1700` "… not checked with a threshold on the individuals, and is with the lists alone" | |
| The numbers not compared (935) | `pf:1861`, `pf:1890`, `pf:1932` | |
| The identity, and the warning of `docs/functionality.md` (940) | `pf:1731` to `pf:2021`; `pf:1992` "the warning of docs/functionality.md, whole" | |
| Property: written and opened gives the project of the table (951) | `pf:2338` | |
| Property: written, opened and written again gives the same text (955) | `pf:2378` | |
| Property: valid JSON with no field the spec does not name (958) | `pf:2399` | |
| In the browser: saved, opened in a new page, the same numbers, then the warning of the identity (960) | `e2e/skeleton.spec.ts:302` "the project saved after a run and opened in a new page gives the same numbers …" | |

## The statistics of each individual

`docs/specs/analyses/individualChecks.md`, "The cases" and "How it is
verified" of the module. The tests of the module are in
`src/core/analyses/individualChecks.test.ts`, written `ind:` below.

| item | test | note |
|---|---|---|
| The filters of the variants keep no variant: popnei refuses, the refusal kept under the key, and an analysis that waited for the statistics ends with it (289) | `src/worker/runner.test.ts:1196` "filters that keep no variant are refused with popnei's message"; `src/core/store.test.ts:3763` "a refusal of the statistics by popnei shows in the analysis as the error of the statistics, and its startRun gives null…"; `e2e/diversityKept.spec.ts:412` "VS7 D2 the statistics a Run waited for, refused by popnei…" | |
| A filter of the variants changed: the key changes, the result goes with its notice, the thresholds keep their values, and the step says the individuals kept are not known (294) | `src/core/analyses/stepKeys.test.ts:243` "a filter of the variants added or removed, or its threshold, changes the key"; `e2e/individualThresholds.spec.ts:397` "VS7 D1 the missing data filter of the variants moved: the statistics removed with their notice, the counts of the thresholds Known once …"; `e2e/individualStats.spec.ts:558` "VS7 D1 the missing data filter of the variants moved…" | |
| A threshold of the filters of individuals moved: the key the same, the table and histograms stay, only the rows marked kept change, with no pass (299) | `src/core/analyses/stepKeys.test.ts:251` "a filter of individuals, a list or a threshold, leaves the key the same"; `e2e/individualThresholds.spec.ts:169` "VS7 D1 the thresholds at 0.03 and 0.38: Kept 125 of the 200, then 119 of 125…, the column Kept…"; `e2e/individualStats.spec.ts:655` "VS7 D1 the column Kept: a list to remove applied marks s000 removed … with no calculation" | |
| An undo to filters of the variants already calculated: the result and the list from the cache, never dropped while the project gives its key (302) | `e2e/individualThresholds.spec.ts:397` (its undo: Kept 119 back, no "Known once"); `e2e/individualStats.spec.ts:558` (the statistics back with no calculation); `src/core/store.test.ts:4023` "a put of a result larger than the bound keeps the statistics under the key the project gives them, and the list stays known" | |
| A result that arrives after the filters changed: into the cache under its key, and used for the table and the list after an undo (306) | `src/core/store.test.ts:4000` "statistics that arrive after a change of the filters of the variants go into the cache under their key, and an undo shows them done with the list known from them"; `src/core/store.test.ts:1860` "a late result: after a command, the result of the old key goes into the cache…, and an undo shows it" | `store.test.ts:4000` added |
| A worked example, three individuals and four variants: `individualRows`, `warnings`, `checkNumbers` (322) | `ind:202` "individualRows gives i3 with no observed heterozygosity"; `ind:211` "warnings gives individualsWithoutCalls naming i3"; `ind:220` "checkNumbers gives the variants kept and the two means"; `src/worker/runner.test.ts:1174` "a VCF of two individuals, the second missing at both variants…" (popnei's rates of such an individual) | |
| The key, row by row (340) | `src/core/analyses/stepKeys.test.ts:232`, `:243`, `:251`, `:257`, `:263`, `:270` | |
| `run` with a fake client: the job, the filters of the project in their order (342) | `ind:233` "run sends the job with the filters of the project in their order" | |
| `individualChecksCsv` of the worked example (344) | `ind:249` "individualChecksCsv gives the header and three rows, i3's heterozygosity empty" | |
| `refusalText` of each row of "Its words", popnei's messages as literals (346) | `ind:384` "the empty pass of the missing data filter at 0.05 and the MAF filter at 0.4…"; `ind:390`, `:403`, `:414`, `:425`, `:436`, `:442` | |
| The description of the histogram of the missing genotypes at 0.03, the bin from 0.0299… split (354) | `ind:450` "the proportion of missing genotypes of panel.nei at 0.05, with the threshold 0.03" | |
| The numbers of the flow and of the runner on `panel.nei`: 1,152 variants, `s000`, the ranges, no NaN, the check numbers, and those with no filter (359) | `src/worker/runner.test.ts:1128` "at 0.05 panel.nei gives its 200 individuals, popnei's numbers of the first three, no NaN…"; `:1144` "with no filter, s000 has the missing rate 0.028333333333333332 and the observed heterozygosity 0.3653516295025729, over 1,200 variants"; `:1155` "the statistics that the tests of core read from panel_individual_stats.json are those popnei gives the runner at 0.05"; `ind:225` "checkNumbers of the statistics of panel.nei at 0.05 gives the check numbers of the spec"; `e2e/individualStats.spec.ts:153` "VS7 D1 the statistics at 0.05: s000 0.0260 and 0.3672…"; `:558` (the same after an undo, no calculation) | `runner.test.ts:1144` and `ind:225` added |
| The flow in the browser: the table sorted with the keyboard alone, `s082` first at 0.0434; the CSV of the table; the CSVs of the bins (372) | `e2e/individualStats.spec.ts:329` "VS7 D1 the table sorted with the keyboard alone…, s082 first at 0.0434…"; `:462` "VS7 D1 the CSV of the table: panel.individual_stats.csv, its header, 200 rows, and s000 with every digit"; `:479` "VS7 D1 the CSVs of the bins of the two histograms…" | the flows run in Chromium and WebKit here; Firefox on GitHub only |

## The histograms of the variants

`docs/specs/analyses/variantChecks.md`, "The cases" and "How it is
verified" of the module. The tests of the module are in
`src/core/analyses/variantChecks.test.ts`, written `var:` below.

| item | test | note |
|---|---|---|
| A filter moved: nothing, the key does not hold the filters (199) | `src/core/analyses/stepKeys.test.ts:284` "no filter, of the variants or of the individuals, and no individuals file changes the key"; `e2e/variantHistograms.spec.ts:124` "VS6 D2 the histograms calculated: … the mean of the MAF still there after the missing data filter moved" | |
| A VCF read again with another ploidy: a new key, a new pass (200) | `src/core/analyses/stepKeys.test.ts:295` "a new load, the read options of a VCF, the key version, 1, and the version of popnei change the key" | |
| A variant of three alleles is in the MAF histogram below 0.5; a variant with one allele called has a MAF of 1 (201) | `src/worker/runner.test.ts:1483` "a variant of three alleles is in a bin of the MAF below 0.5, and a variant with one allele called has a MAF of 1, in the last bin" | added; a VCF of 21 individuals written in the test, the first variant at a MAF of 15/42, the second with every call 0/0 |
| The key does not change with any filter (211) | `src/core/analyses/stepKeys.test.ts:284` | |
| The key changes with a new load (211) | `src/core/analyses/stepKeys.test.ts:295` | |
| `run` sends the job, with no filter (212) | `var:185` "run sends the job of the spec, with no filter whatever the project's" | |
| `warnings` of MAF counts that sum to 5 of 6 variants: `variantsWithoutCalls`, "1 of the 6 variants" (212) | `var:204` "warnings of MAF counts that sum to 5 of 6 variants gives variantsWithoutCalls" | |
| `checkNumbers` of the result of `panel.nei`, its four numbers (214) | `var:222` "checkNumbers of panel.nei gives the variants and the three means" | |
| The numbers of the runner and of the flow on `panel.nei` and `panel.vcf.gz`: the means, the counts of each histogram (217) | `src/worker/runner.test.ts:1375` "the histograms of panel.nei with no filter, 40 bins from 0 to 1: popnei's edges, means and counts"; `:1470` "the histograms of panel.vcf.gz are those of panel.nei: the same edges, means and counts"; `e2e/variantHistograms.spec.ts:124` (the mean of the MAF, 0.7163, on `panel.nei`) | `runner.test.ts:1470` added |
| The descriptions of the MAF at 0.95 and of the observed heterozygosity at 0.5, asserted whole (227) | `var:229` "the description of the MAF of panel.nei at 0.95"; `var:237` "the description of the observed heterozygosity of panel.nei at 0.5, whose bin from 0.5 is split" | |
| The flow reads the mean of the MAF, 0.7163, and sees it stay when the missing data filter changes (230) | `e2e/variantHistograms.spec.ts:124` | |

## The counts of the filters

`docs/specs/analyses/filterCounts.md`, "The cases" and "How it is
verified" of the module. The tests of the module are in
`src/core/analyses/filterCounts.test.ts`, written `fc:` below.

| item | test | note |
|---|---|---|
| The filters keep no variant: the counts with `filterKeptNone`; the analyses that read the filters refused; the histograms still run; a write gives a file of no variant, 3,594 bytes (196) | `src/worker/runner.test.ts:1591` "the counts of filters that keep no variant are a result, not a refusal"; `fc:132` "warnings of the empty pass gives filterKeptNone naming the MAF filter"; `e2e/filterCounts.spec.ts:474` "VS6 D2 a filter that kept none: its count, the line of the total, and the warning that names it"; `src/worker/runner.test.ts:829`, `:1196` (the diversity and the statistics refused); `src/core/analyses/variantChecks.test.ts:185` (the histograms' job holds no filter); `src/worker/runner.test.ts:1856` "at 0.05 with a MAF filter at 0, a file of no variant, 3,594 bytes…" | the runner's write is with the MAF filter at 0, which gives the same 3,594 bytes as at 0.4 |
| The file holds no variant: counts of zero with `noVariant`, not refused; the warning alone, with no count and no line of the total; the status region gives the warning (204) | `e2e/filterCounts.spec.ts:530` "VS6 D2 a file of no variant counted: the warning of a file with no variant alone, with the focus on it, and Write refused"; `fc:228` "warnings of a file that gave no variant, with no filter, gives noVariant"; `fc:243` "warnings of a VCF read with only the passed variants, whose first filter was given none…"; `src/worker/runner.test.ts:1876` "a Count and a write of a VCF of a header alone give the same counts, with no filter and with the missing data filter at 0.1" | `runner.test.ts:1876` added |
| A threshold moved: the counts of every filter go, and come back with an undo or the next pass (219) | `src/core/analyses/stepKeys.test.ts:331` "any filter of the variants … changes the key"; `e2e/filterCounts.spec.ts:205` "VS6 D2 the three filters counted…; the counts gone at each change and in no notice" | |
| A threshold moved back: the counts from the cache with no pass (221) | `e2e/filterCounts.spec.ts:334` "VS6 D2 an undo brings back the counts of the filters before, with no calculation"; `src/core/store.test.ts:4658` "a command that changes the filter of the variants does not name the counts among the results removed, and its undo shows them done again" | |
| The filter of regions of a BED file, with popnei's release that has it (223) | none | left without a test: the filter comes with a later release of popnei |
| The key: the same when a filter of individuals changes, different when any filter of the variants does (228) | `src/core/analyses/stepKeys.test.ts:322`, `:331` | |
| `filterCountRows` of the counts (229) | `fc:125` "filterCountRows of the empty pass gives each filter's counts in the order of the project"; `fc:161` "filterCountRows of the three filters, and a defect for a filter with no count" | |
| `warnings` of the empty pass: `filterKeptNone` naming the MAF filter (230) | `fc:132` | |
| `checkNumbers` (231) | `fc:141` "checkNumbers of the three filters gives the variants of the file and what each kept"; `fc:264` | |
| `refusalText` of a genotype of another ploidy, and of any other refusal, as literals (232) | `fc:313` "a genotype of another ploidy tells to set the ploidy"; `fc:326` "another message gives popnei's message without its full stop, and to count again"; `fc:332`, `fc:343` | |
| The runner on `panel.nei`: the counts of the empty pass, and of the three filters, 1,128 with 1,200 to 1,152, 1,152 to 1,152, 1,152 to 1,128 (233) | `src/worker/runner.test.ts:1563` "the counts of the three filters, in their order, from a pass that keeps nothing of the blocks"; `:1591` | |
| The store's test that a diversity fills the counts (237) | `src/core/store.test.ts:4628` "runEnded of a result of the analysis of the variants puts the counts countsOf gave under the key of the counts…" | |
| The counts filled from a diversity are those of a Count with the same filters (238) | `src/worker/runner.test.ts:1583` "a diversity with the same three filters and the list of 125 gives the same counts, the list put after the filters" | |

## The written file

`docs/specs/analyses/writeVariants.md`, "The cases" and "How it is
verified". The tests of the store are in `src/core/store.test.ts`,
written `store:` below.

| item | test | note |
|---|---|---|
| A list of individuals popnei would refuse: the write locked with the reason of `individualListNeeds`, the three checks not locked (380) | `store:5274` "the write is locked by the reason of individualListNeeds, and by keptNoneReason once the statistics keep no individual"; `store:3939` "a list to keep that names z … the statistics are ready"; `e2e/individualLists.spec.ts:131` "VS7 D1 a list to keep with ind_900 applied: its reason under the list, … beside the disabled Write…" | |
| The filters keep no variant: `writeVars` does not refuse, 3,594 bytes; the write `noVariant`, no Save, its counts in the counts of the filters; Write then disabled with that reason (386) | `src/worker/runner.test.ts:1856`; `store:5108` "a result with no variant makes the write noVariant, with no file"; `src/ui/steps/variants/writeParts.test.ts:210` "no variant: its line, and no button"; `:373` "the Count says the filters keep no variant: Write disabled with the words of a file of no variant" | |
| The variants file holds no variant, or a VCF none of whose variants passed: `noVariant`, told apart by its counts, with the words of an empty source (397) | `src/ui/steps/variants/writeParts.test.ts:238` "no variant of an empty source: the words of a file of no variant, and no button"; `:388`; `src/ui/steps/variants/writeWords.test.ts:122` "the variants file holds no variant, or a VCF read with only the passed variants none that passed"; `e2e/writing.spec.ts:576` "VS5 D3 a VCF with no variant that passed, read with only those, written: the words of a file with none that passed, and no Save…" | |
| The filters keep no individual: the write locked (407) | `store:5274`; `e2e/writing.spec.ts:414` "VS5 D3 with the focus on Stop of a write that waits for the statistics, a threshold of individuals that keeps none locks Write…" | |
| A file written and not saved: Save, no second write; a change of the filters discards it, and the notice says Undo does not bring it back (409) | `store:5300` "startWrite gives null while the file is written and while it is done, and writes again once it is saved"; `store:5084` "the write done, then a command that changes a filter: ready with no file, the notice has writeDiscarded, and its undo does not give the file back"; `e2e/writing.spec.ts:451` "VS5 D3 a change of the threshold with the file not saved discards it…" | |
| The statistics the write waited for fail: `error`; Write does nothing after popnei's refusal, starts them again after another failure (415) | `store:5138` "with a threshold and no statistics, startWrite waits for them; their refusal by popnei puts the write in error with ofStatistics, and startWrite then gives null…"; `store:5169` "after a workerFailed of the statistics, startWrite starts them again"; `src/ui/steps/variants/writeWords.test.ts:276` "the statistics it waited for, refused and failed" | |
| A write stopped, or left behind and stopped, gives no file; the button to write again (422) | `store:5318` "cancelWrite stops the write in flight, and the write is ready…"; `store:5333` "a write left behind is stopped when the notice is closed, and by a startRun and a startWrite that send"; `e2e/writing.spec.ts:280` "VS5 D3 Stop of a write under way gives Write back…" | |
| A new load of the variants file stops the write at once (424) | `store:5202` "a new variants file loaded cancels the write at once, and the notice has writeStopped"; `src/worker/client.test.ts:2356` "a new load while a file is written cancels the write…" | |
| A project file saved and opened: nothing of a write in it (426) | `store:5409` "an opening and another version of popnei forget the file, with no notice…" | the project the writer is given has no field of a write, so the saved file cannot hold one; the test checks the opening |
| The memory of the tab does not take the file: popnei's plain `Error` a refusal, a trap `workerFailed`; the words of both say what to do and do not blame the variants file (427) | `src/worker/runner.test.ts:965` "a plain Error is refused, with its message", `:979` "a trap of the wasm is crashed"; `src/ui/steps/variants/writeWords.test.ts:250` "the worker stopped with no answer, with the size and without"; `:263` "popnei refused the write, with the size and without"; `e2e/writing.spec.ts:786` "VS5 D3 a write whose worker stopped shows its error and offers Write again" | |
| The runner in node: at 0.05 a `Blob` of 250,994 bytes and 1,152 of 1,200; with the 119, 170,042 bytes; read back with those individuals in their order (545) | `src/worker/runner.test.ts:1819` "at 0.05, 250,994 bytes and the counts 1,152 of 1,200…"; `:1845` "at 0.05 with the list of 119, 170,042 bytes that open again with those 119 individuals" | |
| The store: a change during a write leaves it behind; a calculation asked for stops it; a late write dropped; the counts of a write fill the counts; `noVariant` holds no file; a change while `done` discards the file; the statistics refused put it in `error`, `startWrite` then `null` (551) | `store:5016` "a command that changes a filter while it is written leaves it behind…"; `store:5333`; `store:5041` "a result that arrives after the command is dropped…"; `store:4951` "runEnded done: … the counts"; `store:5108`; `store:5084`; `store:5138` | |
| The words: each row of "Its words" whole; 1.0 GB and 2.0 GB; the parts of the section in each state; no text with "Variants step" (559) | `src/ui/steps/variants/writeWords.test.ts:83` to `:349`; `src/ui/steps/variants/writeParts.test.ts:49` to `:432`; `writeParts.test.ts:488` "no text of any state, for any failure, count or project, says Variants step" | |
| `writeEstimate`: the bytes of a variant, the variants and individuals it counts, `bound`, `warn`, `tooLarge` (567) | `src/core/writeEstimate.test.ts:59` "a variant is one byte per individual and 40 bytes more…"; `:72` to `:129`; `:137` "the warning comes at WRITE_WARN_BYTES and not 100 bytes below it"; `:148` "tooLarge at WRITE_MAX_BYTES from exact counts…" | |
| `sizeText` of 1, 812, 250,994, 999,600, 19,161,178 and 4,300,000,000 bytes (575) | `src/core/writeEstimate.test.ts:177` to `:200` | |
| `writtenName` (577) | `src/core/fileNames.test.ts:44` "panel.vcf.gz with a filter of the variants gives panel.filtered.nei", `:52`, `:68` "PANEL.NEI with a filter gives PANEL.filtered.nei", and the case of no filter before `:68` | |
| Playwright: `panel.nei` at 0.05 written and saved, 250,994 bytes; a VCF with LowQual everywhere written; the measurement (580) | `e2e/writing.spec.ts:174` "VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 250,994 bytes…"; `:576`; `e2e/measure.spec.ts:1935`, `:1949`, `:1963` "VS5 D5 the write of …" | the flows run in Chromium and WebKit here; Firefox on GitHub only |

## The diversity

`docs/specs/analyses/diversity.md`, "The cases" and "How it is
verified" of the module; the panel has no section of its own on how it
is checked. The tests of the module are in
`src/core/analyses/diversity.test.ts`, written `div:` below; those of the
runner in `src/worker/runner.test.ts`, written `run:`; those of the store
in `src/core/store.test.ts`, written `store:`.

| item | test | note |
|---|---|---|
| A population smaller than 20: its row with "no value", and why (695) | `div:210` "the worked example gives the populations, the request, the warnings…" (`tooFewIndividuals`); `e2e/diversity.spec.ts:682` "WS8 D2 tetraploid.vcf.gz read with ploidy 2 is refused…" (the row A, 12 and "no value" three times, and its warning) | |
| A population of 20 to a few more, with missing data (700) | `div:486` "warnings of a population with a value at 641 of 1,152 variants…", `div:1031` "warnings of two populations with a value at fewer variants…" | |
| The filters keep no variant: the refusal kept under its key (704) | `run:829` "filters that keep no variant are refused with popnei's counts of the pass"; `store:1056` "popnei's refusal is kept under its key…" | the store's test is of any refusal, with another message |
| The column chosen is the first, the identifiers (708) | `div:1476` "the first column, the identifiers, chosen as the populations…" | |
| The individuals file loaded again, with the same table: the same key (712) | `div:915` "the same table from another file, or with other options of the CSV, leaves the key the same"; `src/core/keys.test.ts:575` "finds the key again when the individuals file is loaded again" | |
| A result that arrives after the populations changed (714) | `store:1860` "a late result: after a command, the result of the old key goes into the cache…" | the command of the test is a change of the MAF filter, not of the populations; the store does not tell them apart |
| A threshold on the individuals and no statistics: a Run calculates them first (718) | `store:3615` "with a threshold of 0.2, the Run calculates the statistics first, waits for them, and then sends its request…"; `e2e/diversityKept.spec.ts:227` "VS7 D2 a Run with the thresholds at 0.03 and 0.38 and no statistics says it waits for them…" | |
| A threshold moved to one that keeps the same individuals: the table goes, a Run gives the same numbers (723) | `store:3829` "a threshold moved to one that keeps the same individuals removes the result, and the next Run sends at once with the same individuals under another key"; `div:829` "a filter of individuals removed, a name of its list changed, or its threshold moved to one that keeps the same individuals, changes the key" | both added; the same numbers follow from the same individuals and the same filters, which `run:1276` shows with the list of 119 |
| A population whose individuals the filters all remove: left out, named in the ready state and by `populationNotInResult` (727) | `div:1538` "with the individuals kept i1 and i3, run sends A alone, and populationsKept gives B as emptied"; `e2e/diversityKept.spec.ts:286` "VS7 D2 the ready state lists the populations the filters keep…"; `div:1565` "a result of A alone adds populationNotInResult naming B" | |
| A worked example (749) | `div:210` "the worked example gives the populations, the request, the warnings, the key inputs and the check numbers of the spec"; `div:1426` "1 + 3 x the populations run…" (`numCheckNumbers` 7); `div:1443` "null with a threshold on the individuals, with no column…" | |
| The individuals kept (767) | `div:1524`, `div:1538`, `div:1551`, `div:1565`, `div:1587` "a result of A with 1 individual, where populationsToRun gives it 2…", `div:1610` "numCheckNumbers with a list to remove i2 is 4…", `div:1639` "needs of a list to keep i4…" | |
| `needs` and `populationsNeeds` (778) | `div:286` "needs gives each reason of individualsNeeds in its words" to `div:366` "populationsNeeds is null for a project whose individuals file is not read"; `div:1286`, `div:1639`, `div:1219` | |
| The key, row by row, and `keyInputs` of an empty and a pending project (782) | `div:762` "a new load of the variants file…" to `div:995` "keyInputs of a project whose reads are pending…", among them `div:821` "a filter of individuals changes the key" and `div:829` "a filter of individuals removed, a name of its list changed, or its threshold moved …"; `div:1237`, `div:1312`; `src/core/keys.test.ts:456` | `div:829` added |
| `parseOptions` (787) | `div:383` "parseOptions gives the defaults back" to `div:450`, `div:1386` | |
| `warnings` (790) | `div:486`, `div:496` "…writes 99%, not 100%", `div:506` "…writes 1%, not 0%", `div:516` "…at every variant kept is none", `div:521` "warnings of four populations of fewer than 20…" | |
| `script` (796) | `div:541` "script of the project of the flow gives the lines of the spec" | |
| `diversityCsv` (798) | `div:575` "diversityCsv of the result of the flow gives the text of the spec", `div:585` "diversityCsv quotes a population with a comma and quotes…" | |
| The words of the statistics that failed (800) | `div:1697` "the words of the statistics that failed, refused for the empty pass of the missing data filter at 0.05 and the MAF filter at 0.4…"; `store:3763` "a refusal of the statistics by popnei shows in the analysis as the error of the statistics…"; `e2e/diversityKept.spec.ts:412` "VS7 D2 the statistics a Run waited for, refused by popnei, are told in their words…" | |
| `refusalText`, each row of its table (805) | `div:598` "WS8 D2 refusalText of a pass over a file with no variant…", `div:609`, `div:620`, `div:631`, `div:649` "…an empty pass tells to loosen the filters", `div:660` "…a genotype of another ploidy…", `div:671` "…a line of the VCF popnei cannot read…", `div:682` "…another message…", `div:1209` "…a gzipped VCF cut short…", `div:1709` "popnei's refusal with no population tells to loosen the thresholds"; `run:863` "WS8 D2 a VCF of a header alone opens, and its diversity is refused as a file with no variant, with the missing data filter and without it" | |
| The numbers of the flow's files, both sets, asserted as literals by the runner (821, 878) | `run:205` "the diversity of ${name} with no filter gives the numbers of the table…", `run:210` "…with the missing data filter at 1 gives the numbers with no filter, and keeps 1200 of its 1200 variants", `run:221` "…with the missing data filter at 0.05 keeps 1152 of its 1200 variants" (each for `panel.nei` and `panel.vcf.gz`) | `run:210` added |
| The check numbers of the first set (850) | `div:1468` "the check numbers of the flow's result at 0.05 are those of the spec" | |
| The numbers with the filters of individuals of stage 3, 119 kept, asserted by the runner (859, 878) | `run:1276` "with the list of 119, the numbers of the table of diversity.md"; `run:1255` "with the list of 125 after the filter at 0.05…" | |
| The flow: 0.05, then 1 with its notice, Run, Undo, axe in each state (879) | `e2e/skeleton.spec.ts:161` "WS9 D4 panel.nei, filtered at 0.05…", `:193` "WS9 D4 the threshold set to 1 removes the diversity…", `:218` "WS9 D4 Undo of the notice brings back the threshold of 0.05…"; `e2e/diversity.spec.ts:363` "WS8 D2 the filter moved to 1 removes the table…" | |
| The flow of stage 3: the two thresholds, a Run that calculates the statistics first, p0 32, 0.3524, 0.3566, 0.9089 (892) | `e2e/diversityKept.spec.ts:227` "VS7 D2 a Run with the thresholds at 0.03 and 0.38 and no statistics…"; `run:1276` | |

## The protocol

`docs/specs/worker/protocol.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| Only popnei's refusal of its input, a plain `Error`, is of kind `popnei`; a file the browser could not read is `reopenFailed`; a `RangeError` or a trap is `workerFailed`, the worker started again, and the store does not keep it (494) | `src/worker/runner.test.ts:965` "a plain Error is refused, with its message"; `:972` "a RangeError, of a memory that cannot grow, is crashed"; `:979` "a trap of the wasm is crashed"; `:696` "a file the browser refuses to read at a run with the same filters is reopenFailed, with popnei's message"; `src/worker/client.test.ts:785` "refused: the run fails with popnei's message, and the worker goes on"; `:816` "crashed: the run fails as workerFailed, and the worker is started again"; `src/core/store.test.ts:1056` "popnei's refusal is kept under its key"; `:1081` "another failure is kept until the next change" | |
| One refusal of popnei depends on more than the data: a block the memory could not hold, a plain `Error`, kept as a refusal, and a new load gives it another key (510) | `src/worker/runner.test.ts:965` "a plain Error is refused, with its message"; `src/core/store.test.ts:1056` "popnei's refusal is kept under its key"; `src/core/keys.test.ts:594` "gives another key when the variants file is loaded again" | in part: no test gives popnei a block its memory cannot hold; see the end |
| A mistake of our runner outside a call to popnei, a `TypeError` of ours, reaches the worker's error handler and is `workerFailed` (519) | `src/worker/runnerWorker.test.ts:100` "a TypeError of the runner inside a request is posted as crashed with its message, and the worker closes"; `:117` "a TypeError outside a request reaches the listener of errors: crashed with its message, the worker closed, and the error kept from the page"; `src/worker/runner.test.ts:764` "what told throws is thrown by run, that very value, and not answered refused"; `src/worker/client.test.ts:826` "an error event: the run fails as workerFailed, the event is stopped, and the worker is started again"; `:816` "crashed: the run fails as workerFailed" | `runnerWorker.test.ts` added: the script of the worker in node, over a fake global scope and a runner of the test |
| A threshold outside its range is refused by the validation of a project file; a command is never given one (522) | `src/core/project.test.ts:2144` "a threshold of %d" (-0.1 and 1.5); `:2152` "a threshold of a filter of the individuals above 1"; `:366` "a threshold above 1" (a command given one is a defect) | |
| Filters that keep no variant: the diversity and the statistics of each individual end `popnei`; the counts of the filters and a write do not, the write a file of 3,594 bytes with `numVars` 0 (525) | `src/worker/runner.test.ts:829` "filters that keep no variant are refused with popnei's counts of the pass"; `:1196` "filters that keep no variant are refused with popnei's message"; `:1591` "the counts of filters that keep no variant are a result, not a refusal"; `:1856` "at 0.05 with a MAF filter at 0, a file of no variant, 3,594 bytes, written and not refused"; `src/worker/client.test.ts:785` (refused becomes `popnei`) | |
| A variant with no called genotype is in no bin of the histograms, whose counts can add up to fewer than `numVars` (537) | `e2e/variantHistograms.spec.ts:1045` "VS6 D2 a variant with no called genotype gives the warning above the caption, and is in no bin" | of 3 variants, one missing in both individuals, the MAF histogram is of 2 |
| Types have no test of their own: the compiler checks them where they are used, and `tsc -b` with `tsconfig.core.json` checks that `protocol.ts` names nothing of the browser (546) | the check `npm run typecheck` (`tsc -b`), whose `tsconfig.core.json` includes `src/worker/protocol.ts` with the libraries `ES2022` and `ES2023.Array` and no DOM | a check, not a test, as the spec says |
| The fields of the filters are popnei's arguments, and the boundary at 0.05 (549) | `src/worker/runner.test.ts:274` "the missing data filter at 0.05 keeps the 39 variants whose missing rate is exactly 0.05, which 0.045 drops"; `:221` "… with the missing data filter at 0.05 keeps 1152 of its 1200 variants"; `:435` "the observed heterozygosity filter at 0.5 keeps 1098 …"; `:447` "the LD filter at an r² of 0.1 within 1000 base pairs keeps 562 …" | |
| The counts of a pass in the order of the job (552) | `src/worker/runner.test.ts:1563` "the counts of the three filters, in their order, from a pass that keeps nothing of the blocks"; `:323` "the same filters in another order open the file again, and are counted in their order" | |
| The list of individuals put after the filters of the variants, which leaves their counts as with every individual (553) | `src/worker/runner.test.ts:1583` "a diversity with the same three filters and the list of 125 gives the same counts, the list put after the filters"; `:1255` "with the list of 125 after the filter at 0.05, popnei's numbers … and the counts of the filter alone" | |

## The messages

`docs/specs/worker/messages.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| A VCF not of the ploidy given opens with the ploidy given, its first run refused with popnei's message, kept under its key (442) | `src/worker/runner.test.ts:796` "a VCF of tetraploids read with ploidy 2 opens with its 12 individuals and its diversity is refused"; `src/core/store.test.ts:1056` "popnei's refusal is kept under its key" | |
| A ploidy above 255 refused by popnei at the open; a project never holds one (449) | `src/worker/runner.test.ts:841` "a ploidy above 255 is refused by popnei at the open"; `src/core/project.test.ts:2189` "a ploidy of %d in the read options" (0 and 256) | |
| A `ready` of another version with other fields gives `otherProtocol`; a `protocol` not a number is refused as any other message (451) | `src/worker/messages.test.ts:569` "a ready of protocol 3 with fields of its own, from the %s worker, is otherProtocol and not a refusal of its fields"; `:589` 'a ready of protocol "1"'; `:1086` 'a ready of protocol "2", from the %s worker' | |
| An answer with a well formed id of no request passes the check; the client refuses it (454) | `src/worker/client.test.ts:2117` "an answer of the light worker of another id is a defect, not the answer of the read"; `:707` "a progress of an id that is not running is a defect, and the worker is ended" | |
| An empty individuals file is an answer, `individuals` with `failed` and `empty`, not a failure of the worker (457) | `src/worker/messages.test.ts:175` "parseFromFilesRunner accepts %s" (an individuals file refused, `empty`); `src/worker/individualsFile.test.ts:267` "a refusal of the reader of the text is the failed read" | |
| A `written` of no variant, `numVars` 0, passes the check (460) | `src/worker/messages.test.ts:748` "parseFromRunner accepts a written of no variant, and keeps its Blob" | |
| A `run` or a `write` with an empty `individuals` passes the check; the runner answers it `badRequest` (463) | `src/worker/messages.test.ts:763` "parseToRunner accepts a run and a write whose list of individuals is empty, which the runner refuses"; `src/worker/runner.test.ts:1305` "an empty list of individuals is badRequest, before any filter is put"; `:1969` "a write of another load, … or with an empty list of individuals is badRequest" | |
| Every kind is accepted, and the structured clone of any message of the two answers (484) | `src/worker/messages.test.ts:120` "parseToRunner accepts %s"; `:135` "parseFromRunner accepts %s"; `:168`, `:175`; `:718` "parseToRunner accepts a run of %s" (the four jobs); `:728`, `:733`, `:743` "… accepts a write"; `:748` written; `:758` "the progress of a write"; `:208`, `:219` "… accepts the structured clone of any message …"; `:775` "… the structured clone of any result and any written of stage 3"; `:800` "parseToRunner accepts any run and any write of stage 3" | |
| Each refusal, with its kind and its path (495) | `src/worker/messages.test.ts:232` to `:538`, one test per refusal of stage 2 named in the item (the inherited `id` at `:335`); `:810` to `:1044`, one per refusal of stage 3 (`individualFilters` `:810`, no `individuals` `:823`, no `passStats` `:846`, `numVars` at the top `:861`, `regions` `:874`, 199 of `obsHetRate` `:896`, `individuals` of 199 `:910`, `binEdges` `:927`, a `variantChecks` with a filter `:999`, `wrongSize` `:1013`, an `ArrayBuffer` `:1044`); `:1527` "a message with one leaf deleted, one field added beside it, or one leaf of the wrong type is refused at that leaf" | |
| The version: `protocol: 1` gives `otherProtocol` with 1 from both checks, `3` with 3, `"2"` `wrongType` (519) | `src/worker/messages.test.ts:1063` "a ready of protocol 1, the walking skeleton's, with no other field, from the %s worker"; `:1076` "a ready of protocol 3, from the %s worker"; `:1086` 'a ready of protocol "2", from the %s worker' | |
| `describeMessageError` names the path and the kind; of the `wrongSize`, the sentence of 3593 and 3,594 bytes (523) | `src/worker/messages.test.ts:607` "names the path and the kind of the message"; `:1030` "a wrongSize is described as a size in bytes, not as a list" | |
| A `File`, the typed arrays and a `Blob` arrive through a real worker, seen by the flow of the walking skeleton and that of the Variants step (529) | `e2e/skeleton.spec.ts:161` "WS9 D4 panel.nei, filtered at 0.05 … gives the diversity of p0"; `e2e/writing.spec.ts:174` "VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 250,994 bytes"; `e2e/individualStats.spec.ts:153` "VS7 D1 the statistics at 0.05 …"; `e2e/variantHistograms.spec.ts:124` "VS6 D2 the histograms calculated …" | |

## The runner

`docs/specs/worker/runner.md`, "The cases" and "How it is verified".
The tests of the runner are in `src/worker/runner.test.ts`, written
`run:` below.

| item | test | note |
|---|---|---|
| A VCF of another ploidy: opened with 12, its diversity refused, kept under its key (804) | `run:796` "a VCF of tetraploids read with ploidy 2 opens with its 12 individuals and its diversity is refused"; `src/core/store.test.ts:1056` "popnei's refusal is kept under its key…" | |
| A file not of its format, `bad.vcf`, refused at the open; a run on it `badRequest` (813) | `run:813`, `run:821` "bad.vcf is refused at the open as …"; `run:918` "a run after an open that popnei refused is badRequest" | |
| Filters that keep no variant: popnei's message with the counts (821) | `run:829` "filters that keep no variant are refused with popnei's counts of the pass" | |
| A VCF with no variant, with no filter and at 0.1 (829) | `run:863` "WS8 D2 a VCF of a header alone opens, and its diversity is refused as a file with no variant…" | |
| A VCF none of whose variants passed, read with only the passed ones, and with all (836) | `run:884` "a VCF whose every variant fails FILTER is refused as a source that holds none…" | |
| A population of fewer than 20 is not refused, its values NaN (847) | `run:521` "a population of fewer than 20 individuals is not refused, and its values are NaN" | |
| A population naming an individual the file does not have (851) | `run:854` "a population that names an individual the file does not have is refused with popnei's message" | |
| The file changed on the disk after the pick (857) | `run:617` to `run:740` (a file that no longer reads); `run:1675`, `:1686`, `:2030` (the same in the passes of stage 3); `e2e/measure.spec.ts:417`, `:454` (point R) | point R is a measurement |
| The filters keep no variant: the diversity and the statistics refused, the counts a result, the write a file of no variant (869) | `run:829`; `run:1196` "filters that keep no variant are refused with popnei's message"; `run:1591` "the counts of filters that keep no variant are a result, not a refusal"; `run:1856` "at 0.05 with a MAF filter at 0, a file of no variant, 3,594 bytes…" | |
| The filters keep no individual: core sends no job; an empty list `badRequest` before any step (874) | `run:1305` "an empty list of individuals is badRequest, before any filter is put"; `run:958`; `run:1969` (the write); `src/core/store.test.ts:3709` "with a threshold of 0.01, the statistics keep no individual: … nothing is sent for it…" | |
| A list after a threshold of the variants: the counts those of every individual, 1,200 to 1,152 (877) | `run:1255` "with the list of 125 after the filter at 0.05, popnei's numbers of the three populations and the counts of the filter alone"; `run:1583` | |
| An individual with no called genotype: 1 and NaN, in the list only with no threshold of heterozygosity (882) | `run:1174` "a VCF of two individuals, the second missing at both variants…"; `src/core/individualsKept.test.ts:229` "individuals that call no genotype are all removed by any heterozygosity threshold, and kept without it" | |
| A variant with nothing called: no value in the histograms, in no bin (885) | `e2e/variantHistograms.spec.ts:1045` "VS6 D2 a variant with no called genotype gives the warning above the caption, and is in no bin" | the flow goes through the runner in the worker; no test in node |
| A cancel ends the worker, inside a pass and a write; the runner does nothing (887) | `src/worker/client.test.ts:481` "the read of a variants file that runs ends its worker"; `src/worker/client.test.ts:2348` "a cancel of a write that runs ends the worker…"; `e2e/diversity.spec.ts:1003` "WS8 D3 a Stop in the middle of a pass…"; `e2e/writing.spec.ts:280` "VS5 D3 Stop of a write under way…" | |
| Progress at the start of each pass, every 4 MiB, at the end, never before the first `run` or `write` (891) | `run:230`, `run:242` (the start and the end); `run:1911` "the progress of each of the five writes…"; `run:256` "a file of 0 bytes is refused at the open, so no run tells a progress…"; `e2e/diversity.spec.ts:1003` (the bar below 100% on a VCF of several MB) | the open takes no function for the progress, so it cannot tell one |
| The open (1060) | `run:182`, `run:193` | |
| The diversity, with no filter and at 0.05 (1062) | `run:205`, `run:221` (each for `panel.nei` and `panel.vcf.gz`) | |
| The progress (1067) | `run:230` "told is given popnei's two calls of a diversity over panel.nei, as they came" | |
| The boundary at 0.05 (1069) | `run:274` "the missing data filter at 0.05 keeps the 39 variants whose missing rate is exactly 0.05, which 0.045 drops" | |
| A change of the filters (1075) | `run:287` "a change of the filters opens the file again, and each run gives the numbers of its own filters" | |
| A filter refused midway (1079) | `run:305` "a filter popnei refuses midway is refused, and the next run opens the file again" | |
| An open again that popnei refuses (1082) | `run:652` "an open again that popnei refuses is reopenFailed, and so is the next run, which opens again" | |
| A file that no longer reads: reading, throwing, short, and `panel.vcf.gz` cut short (1090) | `run:688`, `:696`, `:707`, `:718`, `:731`, `:740`, `:751`; `run:617` | |
| What `told` throws (1109) | `run:764` "what told throws is thrown by run, that very value, and not answered refused"; `run:777` | |
| The order of the populations (1112) | `run:351` "populations named 10, 2 and p1 come back in the order of the job, not in popnei's" | |
| popnei's refusals, as literals (1114) | `run:796`, `:813`, `:821`, `:829`, `:863`, `:884` | |
| The defects are `badRequest`, a `write` before the `open` among them (1124) | `run:908`, `:913`, `:918`, `:935`, `:943`, `:949`, `:958`; `run:1962` "a write before the open is badRequest"; `run:1969` | |
| `answerOfThrown` (1128) | `run:965`, `:972`, `:979`, `:987`, `:994` | |
| `transferablesOf` of each of the four analyses; a view of part of a buffer throws (1132) | `run:491`, `run:511`; `run:1698`, `:1705`, `:1713`, `:1733`, `:1741` | |
| The statistics of each individual at 0.05, the fixture of core, and the VCF of two individuals (1195) | `run:1128`, `run:1155`, `run:1174` | |
| The diversity with the list of 125 (1209) | `run:1255` | |
| The diversity with the list of 119, and its file of 170,042 bytes (1216) | `run:1276` "with the list of 119, the numbers of the table of diversity.md"; `run:1845` | |
| The steps with the list: opened again or not (1225) | `run:1328`, `run:1346`, `run:1360` | |
| The histograms of the variants (1230) | `run:1375` "the histograms of panel.nei with no filter, 40 bins from 0 to 1…" | |
| The counts of the filters (1237) | `run:1563`, `run:1583`, `run:1591` | |
| The written file: the five files, the progress, what `told` throws (1245) | `run:1804`, `:1819`, `:1831`, `:1845`, `:1856`; `run:1911`; `run:1930`, `:1943` | |
| In the browser: panel.nei opens; the diversity at 0.05 and at 1; the bar; typed arrays; `tetraploid.vcf.gz`; a file written at 0.05 with the bytes of node; a `Blob` that outlives its worker (1256) | `e2e/variants.spec.ts:150` "WS7 D3 panel.nei picked with the button shows 200 individuals and ploidy 2…"; `e2e/diversity.spec.ts:363` "WS8 D2 the filter moved to 1 … Run at 1 gives p0 0.3519…"; `:742` "WS8 D2 a calculation under way shows its bar…"; `:682` "WS8 D2 tetraploid.vcf.gz read with ploidy 2 is refused in the panel's words…"; `e2e/writing.spec.ts:174` "VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 250,994 bytes…", whose bytes it compares with those of `writeVars` in node; `e2e/writing.spec.ts:867` "VS5 D4 a file written from the big VCF is saved after the worker that made it was ended…" | the comparison of the bytes added to `writing.spec.ts:174` |
| A file changed on the disk, each engine and each way of rewriting (1275) | `e2e/measure.spec.ts:417` "the File of a pick is on the disk: the copy deleted is not read"; `:454` "rewrite …" | a measurement, in the report of stage 2, "Point R" |

## The client

`docs/specs/worker/client.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| Two picks before the first file is open: the second cancels the first, and the entry records nothing for it (533) | `src/worker/client.test.ts:381` "a read of a third load cancels the open of the second at once"; `src/ui/reads.test.ts:340` "a variants file replaced while it is read cancels its read…"; `src/ui/reads.test.ts:498` "a cancelled read records nothing" | the client test cancels the open of a second load by a third, the same path |
| A function of the page that cancels or throws while the client answers (537) | `src/worker/client.test.ts:529` "a cancel made inside onPopneiReady is seen…"; `:769` "an onPopneiReady that throws…"; `:685` "an onProgress that throws: the throw reaches the caller…" | that the throw then reaches the error bar is the entry's: `e2e/entry.spec.ts:136` "WS7 D2 an error thrown from a handler shows the error bar…" |
| An undo to a load already read, then Run (547) | `src/worker/client.test.ts:410` "a run on a load read before, while the worker holds another, ends the worker…" | |
| The variants file changed on the disk since the pick: `reopenFailed` for a run, an open for a run, a first open (550) | `src/worker/client.test.ts:561`, `:579`, `:598`, `:616` (the reopen that fails); `:636` "a first open that ends reopenFailed fails the read with it, the name of the file and the browser's message"; `:1829` "a read waiting on an open sent for a run gets reopenFailed…"; `:2562` "a write waiting on an open sent for it fails with reopenFailed…"; `src/ui/reads.test.ts:530` "a reopenFailed of the first open is recorded as a failure of the worker, with the name and the browser's message"; `src/core/project.test.ts:3389` "projectNeeds gives the words of a variants file the browser can no longer read" | `client.test.ts:636` and `reads.test.ts:530` added; what an engine does is point R, `e2e/measure.spec.ts:454` |
| A tab left open across a deploy: two failed starts give `couldNotStart` (562) | `src/worker/client.test.ts:1796` "a calculation worker whose script does not load… twice: couldNotStart…"; `:1813` the same for the light worker; `:1022` "a new Worker that throws is a failed start…" | |
| A request of a load whose `File` the client does not hold; the two defects of the client's own calls thrown (568) | `src/worker/client.test.ts:727`, `:736`, `:746` "… fails at once as a defect"; `:2496` "a write of a load with no File, or whose first open was refused…"; `:2169` "a crash during the first open of a load fails its read, and a run on it is then a defect"; `:598` "the next run on that load is not a defect…"; `:399` "a read of a known load with other read options is a defect, thrown"; `:434` "addFile of a load id the client already holds is a defect, thrown" | |
| A worker given up answers every request at once, and the other goes on (579) | `src/worker/client.test.ts:942` "no ready twice gives the worker up: every request fails, and the light worker still reads" | |
| A new load while a file is written (581) | `src/worker/client.test.ts:2356` "a new load while a file is written cancels the write and every request on the old load…" | |
| A large write with runs waiting behind it (585) | `src/worker/client.test.ts:2371` "a written of 25,000,001 bytes…"; `:2380` "a run given between the answer of a large write and the new worker's open waits in the queue, and is sent after k5"; `:2427` "the outcome of a large write is given before the restart…" | `:2380` added |
| A large write whose load is no longer the next one (590) | `src/worker/client.test.ts:2457` "a large write whose load is no longer the next one: the new worker opens the other load, not A" | |
| A write that ends while its `Run` was cancelled is never seen (594) | `src/worker/client.test.ts:2348` "a cancel of a write that runs ends the worker, and the written it posted after goes to no one" | |
| A worked sequence (620) | `src/worker/client.test.ts:300` "a read, two runs, a cancel and the worker started again" | |
| The load (635) | `src/worker/client.test.ts:367` "a read of another load ends the worker…"; `:381`; `:399`; `:1733` "no worker is sent a second open, nor a request of another load than its open's" | |
| Cancelling (641) | `src/worker/client.test.ts:454`, `:463`, `:481`, `:493`, `:515`, `:529` | |
| The reopen that fails (648) | `src/worker/client.test.ts:561`, `:579`, `:598`, `:616` | |
| A write (655) | `src/worker/client.test.ts:2233` "a write is sent with its key and job; its progress reaches onProgress…"; `:2287` (test.each) "… fails the write as a defect, written to the console, and ends the worker…"; `:2319` "a written to a run fails the run as a defect…"; `:2337` "a cancel of a write that waits…"; `:2348` "a cancel of a write that runs ends the worker…" | |
| The restart after a large write (664) | `src/worker/client.test.ts:2371` "a written of 25,000,001 bytes…"; `:2403` "a written of exactly WRITE_RESTART_BYTES, 25,000,000 bytes, ends no worker…"; `:2413` "a write that popnei refused fails with its message, and the worker is started again…" | the tests give the sizes as `WRITE_RESTART_BYTES`, 25,000,000 (`src/worker/client.ts:61`), and a byte above it; the spec's paragraph gave 100,000,001 bytes until commit 9775603 of this branch |
| Progress (678) | `src/worker/client.test.ts:660` "each progress of a run reaches its onProgress as it came…"; `:707` "a progress of an id that is not running is a defect, and the worker is ended" | |
| A defect of the page (682) | `src/worker/client.test.ts:727`, `:736`, `:746`, `:769` | |
| Failures, one test per row of the table (686) | `src/worker/client.test.ts:785`, `:800`, `:816`, `:826`, `:841`, `:851`, `:867` (test.each, its case "a result of another analysis than its job's" among them), `:912`, `:924`; `:2287`, `:2319` for the write; `:1880` (test.each), `:1939` for the light worker; the old worker's late messages in the helper `:293`–`:296` | the case of a result of another analysis added to the `test.each` of `:867` |
| Starting (690) | `src/worker/client.test.ts:942`, `:976`, `:988`, `:1003` "a ready of protocol 3 fails every request with protocolMismatch…"; `:2016` "the ready stops the timer…" | the test of protocol 2 is now protocol 3, as the spec asks |
| Properties, with fast-check, writes and large writes among them (701) | `src/worker/client.test.ts:1701`, `:1709`, `:1717`, `:1725`, `:1733`, `:1741`; `:1760` "the worker is ended after a write larger than WRITE_RESTART_BYTES or refused…" | the steps draw `write` with `large` (`:1064`) |
| In the browser, stage 2: the real workers, a `File` read, a Cancel in the middle and the next run, the time of a restart (711) | `e2e/variants.spec.ts:150` "WS7 D3 panel.nei picked with the button shows 200 individuals…"; `e2e/diversity.spec.ts:1003` "WS8 D3 a Stop in the middle of a pass leaves the panel ready…, and panel.nei then runs at 0.05"; `e2e/skeleton.spec.ts:236` "WS9 D4 a calculation stopped in the middle of a pass…"; `e2e/measure.spec.ts:625` "the restart on the large …" | the restart is a measurement |
| In the browser, stage 3: a file written and saved with the runner's bytes, and one saved after its worker was ended by a Stop (716) | `e2e/writing.spec.ts:174` "VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 250,994 bytes…", whose bytes it compares with those of `writeVars` in node, which `src/worker/runner.test.ts:1819` also has; `e2e/writing.spec.ts:867` "VS5 D4 a file written from the big VCF is saved after the worker that made it was ended…" | the comparison of the bytes added; both run in Chromium and WebKit for this map |

## The base of the 2D plots

`docs/specs/charts/plot2d.md`, "The cases" and "How it is verified".
The tests of Vitest are in `src/charts/plot2d.test.ts`, written `p2:`
below, and the flows of Playwright in `e2e/plots.spec.ts`, written
`plots:`. Its paragraph of the dependencies (471) and that of the page
of the tests (435) are facts of the build and not items: `package.json`
holds `d3-selection` 3.0.0, `d3-scale` 4.0.2, `d3-axis` 3.0.0, their
types 3.0.12, 4.0.9 and 3.0.6, and `jsdom` 30.1.1; `vite.config.ts`
has the project `charts` and builds `e2e/plots.html` only when
`POPNEI_TEST_PAGES` is set, which `test:e2e` sets.

| item | test | note |
|---|---|---|
| Data the plot cannot draw: `check` throws before anything is added; in `update` the previous data stay drawn (355) | `p2:234` "a check that throws when the plot is made leaves the element with no child"; `p2:243` "an update whose check throws leaves the SVG of the data before" | |
| An element with no size when made: the SVG with its title and description, nothing drawn until the observer gives a size (358) | `p2:261` "an element of size 0 gets the SVG with its texts and nothing drawn"; `p2:367` "the first call of the observer with a size draws once" | |
| An element whose size becomes 0 after a draw: the last drawing stays, and `toSVG` and `toPNG` export it (361) | `p2:317` "an element whose size becomes 0 after a draw keeps its last drawing"; `p2:328` "… width or height alone becomes 0 …"; `plots:659` "VS4 D3 a plot whose element becomes 0 by 0 after a draw keeps its last drawing, which toSVG and toPNG export" | `plots:659` added |
| An element with no room for the frame: nothing in the marks, annotations, legend and axes, an SVG of 0 by 0 and no `viewBox`, `toSVG` throws and `toPNG` rejects saying the frame has no area; the next draw with room draws again (364) | `p2:274` "an element not larger than the margins gets an SVG of 0 by 0 …"; `p2:307` "toPNG of an element not larger than the margins throws nothing, and its promise rejects saying the frame has no area"; `src/charts/histogram.test.ts:525` "an update to a threshold in an element 80 pixels high …" | `p2:307` added |
| `update`, `toSVG` or `toPNG` after `destroy`, and `toSVG` or `toPNG` of a plot never drawn: an `Error`, thrown or rejected (378) | `p2:441` "destroy empties the element …" (the `update`); `p2:565` "toSVG of a plot never drawn, and after destroy, throws, and toPNG rejects" | |
| A title or a label with markup, `<b>P1</b>`, written as text (382) | `p2:429` "a title with markup in it is text in the title, and no b element is made" | |
| A change of theme: nothing drawn again; a later `toSVG` light (384) | `plots:569` "a change of theme while the plot is on the screen draws nothing again, and a later toSVG is light" | |
| `tableNumber` of 0.07500000000000001 and 0.9500000000000001; ticks 0 to 3 (399) | `p2:164` "tableNumber shows an edge of popnei to 12 significant digits"; `p2:174` "the ticks of a vertical axis of whole numbers for 0 to 3 …" | |
| The skeleton, `role="img"`, the classes, `<title>` and `<desc>`, ids that differ between two plots (408) | `p2:181` "the skeleton has its classes, role img, …"; `p2:220` "two plots made in one element each have ids that differ" | |
| A `check` that throws leaves no child; an `update` whose `check` throws leaves the SVG before (411) | `p2:234`; `p2:243` | |
| A size of 0 draws nothing; the first call of the observer draws once at the next frame; three calls in a frame draw once at the last size (413) | `p2:261`; `p2:367`; `p2:378` "three calls of the observer within one frame draw once, at the last size" | |
| 420 by 320 with a padding of 10 drawn at 400 by 300, and not again (416) | `p2:351` "an element with a padding is drawn at its content box …" | |
| Not larger than the margins, when made and after an `update` to larger margins: 0 by 0, empty, `toSVG` throws; a resize draws it again (419) | `p2:274` (made, and the resize); `src/charts/histogram.test.ts:525` (the `update`) | |
| `width`, `height`, `viewBox` at the last draw; the frame that size less the margins (424) | `p2:394` "the SVG takes the size of the last draw and the frame that size less the margins" | |
| An `update` redraws in the same `<svg>` (427) | `p2:416` "an update redraws in the same svg element …" | |
| A title `<b>P1</b>` is text, and no `b` element (428) | `p2:429` | |
| `destroy`: no child, the observer disconnected, a waiting draw cancelled, a second `destroy` throws nothing; `update` and `toSVG` after it throw; `toPNG` after it or never drawn rejects and throws nothing (430) | `p2:441`; `p2:565` | |
| `toSVG`: no `var(`, no `chart-overlay`, a first background rectangle, the light colours when the page is dark (457) | `plots:174` "the SVG of toSVG holds no var( and no overlay, has a first background rectangle, the light colours in the dark theme …" | |
| `toPNG`: 3 of 600 by 375 is 1,800 by 1,125; 1,400 wide `tooLarge` at 3 and 2,800 at 2; above 2,048 a side `tooLarge` without drawing; the five stubbed failures `notMade`; the canvas left 0 by 0 (460) | `plots:352` "toPNG(3) of a plot of 600 by 375 pixels …"; `plots:366` "a plot 1,400 pixels wide …"; `plots:394` "toPNG(2) of a plot above 2,048 pixels a side …"; `plots:438` "an image not decoded, a canvas that gives no PNG or throws, or no context, rejects with notMade" | |
| A resize draws again at the new size; after `destroy` the element is empty (468) | `plots:622` "a resize draws the plot again at its new size, and after destroy the element is empty" | |

## The histogram

`docs/specs/charts/histogram.md`, "The cases" and "How it is verified".
The tests of Vitest are in `src/charts/histogram.test.ts`, written `h:`
below. Its paragraph of the dependencies (446) is a fact of the build:
`src/charts/histogram.ts` imports `d3-scale` and `d3-selection` alone.

| item | test | note |
|---|---|---|
| The threshold changes as the user types: `update` redraws the line, the bars and the legend; "0." keeps the threshold of the project (359) | `h:497` "an update from 0.95 to 0.9 writes Maximum 0.9 …"; `e2e/variantHistograms.spec.ts:256` "in a browser in ${locale} the threshold line of the MAF moves as 0.9 is typed, before Enter …" | |
| Every count 0: the axes, the vertical one 0 to 1, and no bar; the screen says why (364) | `h:362` "counts all 0, with a threshold and without, draw the two axes, the vertical one from 0 to 1, and no bar"; `h:288` "the vertical domain is 0 to 1 when every count is 0 …"; `e2e/variantHistograms.spec.ts:1097` "VS6 D2 a file none of whose variants has a called genotype: the histograms have no mean and no bar, and the warning says why"; `src/ui/steps/variants/histogramWords.test.ts:54` "the title with the mean to four decimals, and with no mean" | `h:362` and `variantHistograms.spec.ts:1097` added |
| Values in no bin: the screen says how many (369) | `e2e/variantHistograms.spec.ts:1045` "a variant with no called genotype gives the warning above the caption, and is in no bin"; `e2e/individualStats.spec.ts:253` "an individual with no called genotype: the warning, …, the line under the histogram …" | |
| A threshold outside the range widens the axis; every bar kept or every bar removed (373) | `h:276` "the horizontal domain is widened to take a threshold of 1.2"; `h:446` "a threshold of 1.2, right of the bins, keeps every bar, and one of -0.1 … removes every bar" | |
| Other bins after an `update`, in the same SVG (375) | `h:550` "an update to 20 bins of a count of 1 each gives 20 rects, in the same svg" | |
| `destroy`, a size of 0, a title with markup: the base's cases (377) | the rows of `plot2d.md` above: `src/charts/plot2d.test.ts:441`, `:261`, `:429` | |
| `histogramRows` on the bins of `panel.nei`: the edges, the three thresholds with 1,175, 1,198, and 1,090 and 1,152 around 1,098, the last bin, no threshold (395) | `h:93` "the edges are popnei's …"; `h:100` "the MAF at 0.95 keeps bins 0 to 37, 1,175 …"; `h:107` "the observed heterozygosity at 0.6 …"; `h:114` "… at 0.5 keeps bins 0 to 19, splits bin 20 …"; `h:125` "the last bin holds its upper edge …"; `h:171` "with no threshold every state is null …" | |
| Each defect of the interface throws (414) | `h:198` to `h:262`, one test per defect | |
| The domains: widened for 1.2, 0 to 1 for counts all 0; whole ticks for 0 to 3 (415) | `h:276`; `h:288`; `h:302` "the vertical ticks of counts of 0 to 3 are the whole numbers 0, 1, 2 and 3" | |
| The class `chart chart-histogram` and no overlay (423) | `h:354` "its SVG has the classes chart chart-histogram and no overlay" | |
| MAF at 0.95: 18 kept, 2 removed, no rect for empty bins; bin 20 at 0.5 one outlined rect; 0.51 two rects meeting at the line (424) | `h:378` "the MAF at 0.95 draws 18 kept bars, 2 removed …"; `h:407` "the observed heterozygosity at 0.5 draws bin 20 as one outlined rect at the line"; `h:425` "a threshold of 0.51, inside bin 20, splits it …" | |
| An `update` from 0.95 to `null`: no line, no legend, every bar filled, same `<svg>` (429) | `h:511` "an update from 0.95 to no threshold removes the line and the legend …" | |
| An `update` to 20 bins of 1 each: 20 rects, same `<svg>` (431) | `h:550` | |
| The top margin 56 with a threshold and 12 without, after an `update` each way (432) | `h:563` "the top margin is 56 with a threshold and 12 without …" | |
| At 320 pixels wide the three rows of the legend inside the SVG, by `getBBox` (438) | `e2e/plots.spec.ts:700` "at 320 pixels wide the three rows of the legend lie inside the SVG"; `e2e/variantHistograms.spec.ts:767` "at 320 pixels wide the legend of each histogram with a threshold lies inside its plot" | run here in Chromium and WebKit; Firefox runs them on GitHub after the merge |
| The Variants step with its histograms in both themes in the screenshots of `e2e/screens.spec.ts`, looked at, and axe on each (442) | `e2e/screens.spec.ts:479` "the Variants step, the histograms of the variants running", `:498` "… the histograms done with the thresholds of their filters" (with the table and at 320 px), `:533` "… the histograms in error …", `:650` "… the histograms removed by a new load …", each in light and dark; axe in `e2e/variantHistograms.spec.ts:124`, `:889`, `:915`, `:959` | the screenshots do not run axe; the flows run it in the same states. The screenshots are taken in Chromium only |

## The Variants step

`docs/specs/steps/variants.md`, "How it is checked": the paragraph of
stage 2 (1081), whose checks are listed one by one, the list of stage 3
(1104), and the paragraph of axe, VoiceOver and the screen seen (1146).
The files of the flows are under `e2e/`.

| item | test | note |
|---|---|---|
| `panel.nei` picked with the button, the focus on the button (1081) | `variants.spec.ts:150` "panel.nei picked with the button shows 200 individuals …" | |
| A file dropped, the focus still on the button (1081) | `variants.spec.ts:175` "a file dropped on the card replaces the one there …" | |
| `tetraploid.vcf.gz` with ploidy 2: 12 individuals and "Read with ploidy 2, …" (1083) | `variants.spec.ts:229` "tetraploid.vcf.gz read with ploidy 2 shows 12 individuals and ploidy 2" | |
| The diversity panel's words for the wrong ploidy (1084) | `diversity.spec.ts:682` "tetraploid.vcf.gz read with ploidy 2 is refused in the panel's words …" | |
| The ploidy set to 4, the button to read again, "Read with ploidy 4, …" and no line "Ploidy 4", the diversity run (1085) | `variants.spec.ts:251` "the ploidy set to 4 and the VCF read again …"; `diversity.spec.ts:682` | |
| The button's words with both options changed (1088) | `variants.spec.ts:680` "the button to read a VCF again names both options when both differ" | |
| `bad.vcf` and its reason, ending "Choose another file." (1088) | `variants.spec.ts:290` "bad.vcf shows the reason popnei refused it" | |
| `panel.txt` and its message (1089) | `variants.spec.ts:306` "panel.txt is not loaded, and the step says why and announces it" | |
| A piece of text dropped, and its message (1090) | `variants.spec.ts:760` "a piece of text dropped on the zone loads nothing …" | |
| A piece of text pasted into the zone's button, the same message (1090) | `variants.spec.ts:776` "a piece of text pasted into the zone's button loads nothing …" | |
| 10 and 0.125 in the threshold: the line, the value kept, announced (1091) | `variants.spec.ts:374` "the threshold takes a number of two decimals from 0 to 1, and refuses 10 and 0.125 …" | |
| 300, 0 and 2.5 in the ploidy (1092) | `variants.spec.ts:635` "the ploidy refuses 0, 300 and 2.5 …" | |
| 0,1 and 0,2 typed key by key in the threshold, 2,0 in the ploidy (1093) | `variants.spec.ts:457` "a comma typed key by key in the threshold is thrown away …"; `:557` "a comma or a minus sign typed in the ploidy …" | |
| The value kept typed back, and an arrow key at a bound, take the line away (1095) | `variants.spec.ts:508` "the line of a number refused goes at the next commit …" | |
| `tetraploid.vcf.gz` dropped with 300 typed and not committed (1096) | `variants.spec.ts:823` "a file dropped while the ploidy holds a number it refuses is read with the ploidy kept …" | |
| The status region after each read (1098) | `shell.spec.ts:343` "the status region says the end of each read of the Variants step and of the metadata file" | |
| A folder dropped, and the function that tells what a drop held, in node (1099) | `variants.spec.ts:705` "a folder dropped on the zone loads nothing …"; `src/ui/widgets/dropped.test.ts:11` "one folder, and one piece of text" | |
| Before a file, the line in place of the checks, the filters settable (1108) | `variantFilters.spec.ts:128` "before a file the line stands in place of the checks, the four filters are there …" | |
| The histograms calculated, the mean of the MAF 0.7163, still there after the missing data filter at 0.05 (1108) | `variantHistograms.spec.ts:124` "the histograms calculated: … the mean of the MAF still there after the missing data filter moved" | |
| The threshold line of the MAF moving as 0.9 is typed, before Enter (1111) | `variantHistograms.spec.ts:256` "in a browser in ${locale} the threshold line of the MAF moves as 0.9 is typed, before Enter …" | in en-US and es-ES |
| Count at 0.05: "Kept 1,152 of the 1,200 variants it was given." and the field described by it (1113) | `filterCounts.spec.ts:162` "the Count at 0.05: the count beside the filter and in the description of its field …" | |
| Heterozygosity at 0.9 and MAF at 0.95: the counts gone; after Count 1,152 of 1,152, 1,128 of 1,152, and the line of the total (1115) | `filterCounts.spec.ts:205` "the three filters counted, 1,152 of 1,152 and 1,128 of 1,152, and the line of the total …" | |
| An undo brings back the counts of the filter before, with no calculation (1118) | `filterCounts.spec.ts:334` "an undo brings back the counts of the filters before, with no calculation" | its change is 0.05 to 0.1 of the missing data filter, with the worker holding every result |
| The statistics of each individual, `s000` 0.0260 and 0.3672 (1120) | `individualStats.spec.ts:153` "the statistics at 0.05: s000 0.0260 and 0.3672 …" | |
| The thresholds at 0.03 and 0.38: Kept 125 of the 200, then 119 of 125, the line of the total, the column Kept (1122) | `individualThresholds.spec.ts:169` "the thresholds at 0.03 and 0.38: Kept 125 of the 200, then 119 of 125 …" | |
| 0.12345 refused with its line (1125) | `individualThresholds.spec.ts:284` "0.12345 refused: the line under the field, announced and describing it …" | |
| The missing data filter moved: the statistics removed with the notice, the thresholds "Known once …"; an undo, and the statistics back (1125) | `individualThresholds.spec.ts:397` "the missing data filter of the variants moved: … Known once …, and an undo brings them back"; `individualStats.spec.ts:558` | |
| A list to keep with `ind_900` applied: the reason under the lists, describing the text area, announced, beside the disabled button, no "Variants step" under the list (1128) | `individualLists.spec.ts:131` "a list to keep with ind_900 applied: its reason under the list, describing it and announced, beside the disabled Write and in the stepper" | Write is the one button of the step the list locks |
| The list cleared, the reason gone (1131) | `individualLists.spec.ts:172` "the list cleared: the text emptied, the reason gone and Write given back …" | |
| A list typed and not applied, its line, an Undo putting the text back to the list applied (1132) | `individualLists.spec.ts:276` "a list typed and not applied has its line, and an Undo of another change puts the text back …" | |
| With the thresholds at 0.03 and 0.38, Write, Save, `panel.filtered.nei` of 170,042 bytes (1134) | `individualThresholds.spec.ts:603` "the write of the individuals kept: … panel.filtered.nei of 170,042 bytes" | |
| No button that downloads a histogram as SVG or PNG (1136) | `variantHistograms.spec.ts:748` "no button on the step downloads a histogram as SVG or PNG …" | |
| The CSV of the bins of the MAF: its name, header, 40 rows, the 39th (1136) | `variantHistograms.spec.ts:709` "the CSV of the bins of the MAF: panel.variant_maf_bins.csv, its header, its 40 rows and its 39th …" | |
| The table of the bins reached with the keyboard, its tab selected with the arrow keys (1139) | `variantHistograms.spec.ts:624` "the table of the bins reached with the keyboard: the tabs one stop, the arrow keys between them …" | |
| The table of the individuals sorted with the keyboard alone, and its CSV (1141) | `individualStats.spec.ts:329` "the table sorted with the keyboard alone …"; `:462` "the CSV of the table: panel.individual_stats.csv …" | |
| At 320 pixels wide the legend of each histogram inside its plot, in the three engines (1143) | `variantHistograms.spec.ts:767` "at 320 pixels wide the legend of each histogram with a threshold lies inside its plot" | run here in Chromium and WebKit; Firefox on GitHub after the merge |
| axe in each state of the table of the states (1146) | ready: `variants.spec.ts:150`, `variantHistograms.spec.ts:124`; running: `variants.spec.ts:585`, `variantHistograms.spec.ts:889`, `filterCounts.spec.ts:365`, `individualStats.spec.ts:606`, `writing.spec.ts:228`; done: `filterCounts.spec.ts:162`, `individualStats.spec.ts:153`; results removed: `variantHistograms.spec.ts:915`, `individualThresholds.spec.ts:397`; error: `variants.spec.ts:290`, `variantHistograms.spec.ts:959`, `individualStats.spec.ts:633`, `writing.spec.ts:786`; the writing locked: `individualLists.spec.ts:131`, `individualThresholds.spec.ts:493` | each runs axe in the state it reaches |
| VoiceOver with Safari on a field of a filter with its count, a histogram and its table, the table of the individuals, and a list (1148) | a person | not tried (report, stop B, deliverable D6 not met); the review drove the keyboard and read the accessibility tree in Chromium and WebKit instead |
| The screen seen in the three engines, at 320 px and wide (1152) | a person, and the screenshots of `e2e/screens.spec.ts` | the owner tried the filters of the variants and the writing (stop A) and the filters of the individuals (stop B) in Firefox on 27 September 2026; the screenshots are in Chromium, at 320 px and wide; WebKit ran the flows and was not looked at |

## The shell

`docs/specs/shell.md`, "How it is checked". The tests of its words are
in `src/ui/shell/words.test.ts`, written `words:` below.

| item | test | note |
|---|---|---|
| `stepStates`: a state per row and the order of the rows; running while removed gives Running; from stage 3, a check running gives Variants Running and leaves Analyses; a write in `error` "The file could not be written."; a list naming one not in the file, and thresholds that keep none, Problem before a check running (869) | `words:339` to `words:524`; `words:1454` "a check running, the writing running, or a Run that waits …"; `:1476` "a check running leaves the Analyses step as it was"; `:1518` "a check in error gives Failed …, the writing in error its own words …"; `:1541` "a list of individuals that names one not in the file gives Problem …"; `:1558` "thresholds that keep no individual give Problem with the words of keptNoneReason …" | |
| `summaryLine`: the empty first project, the example, 119 of 200 and 1,152 of 1,200, "how many kept not yet known", a file of no variant, the thresholds alone "1,200 variants · 2 filters", "2 of 3 populations by pop", a case for each row (878) | `words:545` to `words:658`; `words:1629` "the thresholds of the individuals with their statistics, and the counts"; `:1635` "… with no statistics and no counts"; `:1698` "a file of no variant gives no variant …"; `:1727` "no counts and no filter of the variants …"; `:1667` "filters of individuals that leave populations with no individual …"; `:1623` to `:1738` | the file of no variant is named `panel.nei` in the test, not `nopass.vcf` |
| `openQuestion`: with calculations, the writing, both, and a file written and not saved, whole (895) | `src/ui/shell/saveOpen.test.ts:59` "the question before an opening, and its sentence of the calculations in flight"; `:82` "… names the file written and not saved …"; `:118` "… names the writing under way, alone and with the calculations" | |
| `noticeText`: each row whole; three removed and two stopped; the writing left behind alone and with a calculation, stopped with a result removed; the written file discarded, alone and with a result removed (897) | `words:692` to `words:791`; `words:1760` to `words:1888`, among them `:1775`, `:1785`, `:1812`, `:1848`, `:1858` | |
| `announcementsOf`: a pair of states per row of the first table, the writing and the Counts among them; a Run that waits for the statistics in one change; each line of the comparison; none in the eight cases named (902) | `words:818` to `words:1132`, `words:1911` to `words:2121`, `words:2251` to `words:2434`; `words:912` (the comparison); none: `words:1144`, `:1158`, `:1170`, `:1198`, `:2151`, `:2164`, `:1300`, `:1265` | |
| `writtenDiscarded`: `done` to `ready`, `locked` and none, not to `saved` or `done` (912) | `words:2184` "a file written and not saved is discarded when the writing goes to ready, to locked or to none …" | |
| The announcer: the same text twice, two texts within 100 ms, `clear()`, the order of a change's text (915) | `src/ui/shell/status.test.ts:18`, `:127`, `:173`, `:148` | |
| `undoOrRedo`: "Undone: …" before the warning of a reopened project (920) | `src/ui/shell/undoRedo.test.ts:125` "an undo that brings the warning of a reopened project back says what it undid before the warning" | |
| The links of the stepper, the back button, the focus on the `<h1>` (926) | `e2e/entry.spec.ts:78` "the links of the stepper change the step and the title …" | |
| No question on a page just opened; the question after a pick (929) | `e2e/saving.spec.ts:190` "a page just opened is left with no question …" | |
| Save project: its dialog and description, the download, the status region, the focus, "run1" and "run1.json", Cancel, the question after the Save (932) | `e2e/saving.spec.ts:203` "Save project opens its dialog with panel.popnei.json selected …"; `:238` "a name typed as run1 downloads run1.popnei.json, and run2.json run2.popnei.json, Cancel and Escape download nothing …"; `:383` "leaving the page just after a Save raises no question …" | |
| Open project…: `notes.txt`, above 64 MB, the saved file after a change (940) | `e2e/saving.spec.ts:450`, `:625`, `:649` | |
| Undo with the mouse until nothing is left puts the focus on Redo (945) | `e2e/shell.spec.ts:242` | |
| F6 reaches the notice, and not while the dialog of Save is open (947) | `e2e/shell.spec.ts:572`, `:698` | |
| An error shows the bar; Copy the details in Chromium shows the box (950) | `e2e/entry.spec.ts:136`, `:222` | |
| axe in each state of the table of the states (953) | `e2e/shell.spec.ts:139` (empty), `:173` (ready), `:198` (running), `:215` (done), `:527` (results removed); `e2e/entry.spec.ts:136` and `e2e/saving.spec.ts:450` (error) | |

## The entry

`docs/specs/entry.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| A file picked before popnei has loaded says "Reading panel.nei." (732) | `e2e/variants.spec.ts:585` "a file picked before popnei has loaded is shown as being read" | |
| popnei's wasm does not load: `couldNotStart`, the read failed, the analyses locked with their words; nothing shown before a pick (735) | `src/ui/reads.test.ts:568` "a couldNotStart is recorded as a failure of the worker …"; `src/core/project.test.ts:1473` "a worker that could not start: the reason says so …"; `e2e/variants.spec.ts:721` "the calculations that could not start are told in the words of the step"; `e2e/variants.spec.ts:735` "WS7 D3 popnei's wasm not served: once the calculation worker is given up, nothing is shown before a file is picked" | `variants.spec.ts:735` added: it waits for the two requests of the wasm and for no calculation worker left |
| The calculation worker crashes while it opens the file: not asked again (742) | `src/ui/reads.test.ts:548` "a workerFailed is recorded as a failure of the worker, and the file is not asked again" | |
| An undo back to a load already read asks for nothing (747) | `src/ui/reads.test.ts:279` | |
| An opened project: nothing read until the user gives the file (750) | `src/ui/reads.test.ts:297` "an opened project, with no variants file and its metadata file read, asks for no read"; `src/worker/client.test.ts:727` "a read of a load with no File fails at once as a defect"; `src/core/projectFile.test.ts:1344` "an individuals file whose read is pending is refused as header" | |
| A record, a `runEnded` or a listener that throws reaches the error bar; the store as it was (758) | `src/ui/runs.test.ts:153` "a runEnded that throws rejects the promise"; `e2e/entry.spec.ts:152` "a promise rejected with nothing to handle it shows the error bar"; `src/core/store.test.ts:820`, `:1332` | |
| A defect while the entry starts (762) | `e2e/entry.spec.ts:349` | |
| A browser below the floor (770) | `e2e/entry.spec.ts:329` | |
| The page reloaded or closed asks first when the project changed (771) | `e2e/saving.spec.ts:190`, `:383` | |
| The rule of the reads (782) | `src/ui/reads.test.ts:219`, `:234`, `:245`, `:262` | |
| Cancelled (788) | `src/ui/reads.test.ts:325` to `:498` | |
| Each row of the table of the outcomes; after a `workerFailed`, no second request (797) | `src/ui/reads.test.ts:514`, `:548`, `:568`, `:607`, `:623` | |
| `wantedReads` with `csv` null throws (801) | `src/ui/reads.test.ts:645` | |
| `startAnalysis`, and from stage 3 a Run that waits for the statistics: one handle, then the diversity's, the promise after it; a `runEnded` that throws for it; two that throw; statistics already in flight (803) | `src/ui/runs.test.ts:116`, `:123`, `:135`, `:153`; `:235` "a Run that waits for the statistics gives their handle …"; `:296` "a runEnded that throws for a handle another runEnded gave back rejects the promise"; `:323` "two runEnded that throw …"; `:254` "a Run that waits for statistics already in flight …" | |
| `startWriting` in the same way, with `startWrite("nei")` and a fake `write.send` (817) | `src/ui/runs.test.ts:460` "a write that waits for the statistics gives their handle; … null when the store starts none"; `:402` "a runEnded that throws for the write's own handle, which the statistics' runEnded gave back, rejects the promise"; `:425` "two runEnded that throw for the handles of one write …" | `:402` and `:425` added |
| `createSaving`: the names, `run1.JSON`, `proposedName`, `changed` in each case, a result that ends after the save, `saveFailed`, `read` and `otherApp` (819) | `src/ui/saving.test.ts:97`, `:112`, `:130`, `:139`, `:150`, `:163`, `:174`, `:211`, `:299`, `:312`, `:334` | |
| `addFile` (833) | `src/ui/files.test.ts:6` | |
| `createDefects` and `isResizeObserverNoise` (835) | `src/ui/defects.test.ts:6`, `:18`, `:31`, `:45`, `:93`, `:104` | |
| `apps.ts`: the first project, the ids and steps, `countsOf` of the three results, `writeCountsOf`, `individualStatsOf` (841) | `src/core/apps.test.ts:84`, `:91`, `:102`, `:151`, `:161`, `:173`, `:195`, `:200` | |
| `saveWritten`: in `done` the name and the very `Blob`, then `saved`; in `ready` a defect (853) | `src/ui/saving.test.ts:428` "with the file written, downloadFile is given the name and the very Blob …"; `:444` "with the writing ready, no file written, it is a defect …" | |
| The page opens at the Variants step, no error bar, axe (863) | `e2e/entry.spec.ts:45` | |
| The flow of the walking skeleton (866) | `e2e/skeleton.spec.ts:161`, `:236` | |
| An error from a handler and a promise rejected show the bar; a second adds its count (870) | `e2e/entry.spec.ts:136`, `:152`, `:164` | |
| A throw in the calculation worker outside a request starts it again, no bar (877) | `e2e/entry.spec.ts:414` | |
| The entry's file answered 404, and of bad syntax (880) | `e2e/entry.spec.ts:273`, `:289` | |
| A throw while React draws the Variants step (884) | `e2e/entry.spec.ts:377` | |
| A defect while the entry starts, by an `Object.freeze` that throws (887) | `e2e/entry.spec.ts:349` | |
| A browser without `Array.prototype.toSorted` (891) | `e2e/entry.spec.ts:329` | |
| The Save of a file written at 0.05: `panel.filtered.nei` of 250,994 bytes, then handed to the browser, no second Save (893) | `e2e/writing.spec.ts:174` "panel.nei at 0.05 written and saved: the download panel.filtered.nei of 250,994 bytes …" | |
| With the project saved and a file written, a reload raises the question, and none once the file is saved (897) | `e2e/writing.spec.ts:556` "with the project saved, leaving the page while a written file is not saved raises the browser's question, and after its Save none" | |
| A throw while React draws the shell outside every boundary (901) | none | not tested, by the spec: checked by review |

## Left without a test

- **The filter of regions of a BED file** (`filterCounts.md`, 223). The
  filter comes with a release of popnei that this stage does not have,
  and the application has no filter of the kind `regions`. Its tests
  belong to the later plan that adds it: `filterCountRows` with
  `regions` first, in `src/core/analyses/filterCounts.test.ts`, and its
  counts on `panel.nei` with a BED file, in `src/worker/runner.test.ts`.
- **One refusal of popnei depends on more than the data**
  (`protocol.md`, 510), reached in part. What the application does with
  it is tested: a plain `Error` of popnei is answered as a refusal
  (`src/worker/runner.test.ts:965`), kept under its key
  (`src/core/store.test.ts:1056`), and a new load gives another key
  (`src/core/keys.test.ts:594`). That popnei refuses a block of variants
  its memory cannot hold with a plain `Error`, and not with a trap, is
  not seen: only a file of gigabytes gives popnei such a block. The
  measurement of the largest write, in `e2e/measure.spec.ts`, did not
  meet it either: at 2,000,000 variants the worker stopped with no
  answer in Chromium, and WebKit closed the tab. A test of it would be a
  measurement in that file, beside the largest write.
- **VoiceOver with Safari** (`steps/variants.md`, 1148) asks a person.
  It was not tried: the report of the plan records it at stop B, and the
  review drove the keyboard and read the tree of accessibility in
  Chromium and WebKit instead.
- **The screen seen in the three engines, at 320 pixels and wide**
  (`steps/variants.md`, 1152) asks a person. The owner tried the filters
  of the variants and the writing at stop A, and the filters of the
  individuals at stop B, in Firefox on 27 September 2026; the
  screenshots of `e2e/screens.spec.ts` are of Chromium; WebKit ran the
  flows and was not looked at.
- **A throw while React draws the shell outside every boundary**
  (`entry.md`, 901). Only code put into the built site for the test
  alone could make React throw there, so the spec leaves the case to the
  review of the code.
