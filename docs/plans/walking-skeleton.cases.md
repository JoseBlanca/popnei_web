# The map of the cases of stage 2

Deliverable 3 of work package 10 of `docs/plans/walking-skeleton.md`:
every item of "The cases" and of "How it is verified", or "How it is
checked", of the ten specs of stage 2, with the test that reaches it.
A test reaches an item when it gives the input the item names and checks
the outcome the item gives; each was read for that, not matched by its
name. Made on 26 September 2026, on the branch `plan/walking-skeleton`.

Each item is named in the spec's words, shortened, with the line of the
spec where it starts. A test is named by its file, its line, and the
start of its title. The tests of Vitest, which run in node, are under
`src/`; the flows of Playwright, which drive a browser through the built
site, are under `e2e/`. A test marked "added" was written for this map:
each was seen to fail with the code it guards broken, and to pass once
the code was put back. The flows run in Chromium and WebKit here, since
Playwright cannot start Firefox on this Mac; the tests of
`e2e/measure.spec.ts` are measurements, run by hand for the report and
by no other command.

The spec of the Individuals step, `docs/specs/steps/individuals.md`,
has no section of cases and none of checks, so it has no items here; its
flows are `e2e/individuals.spec.ts`.

| spec | items | with a test |
|---|---|---|
| the messages, `docs/specs/worker/messages.md` | 10 | 10 |
| the client, `docs/specs/worker/client.md` | 17 | 17 |
| the runner, `docs/specs/worker/runner.md` | 26 | 26 |
| the reader, `docs/specs/worker/individuals.md` | 57 | 55 |
| the project file, `docs/specs/core/projectFile.md` | 22 | 22 |
| the diversity, `docs/specs/analyses/diversity.md` | 17 | 17 |
| the entry, `docs/specs/entry.md` | 27 | 26 |
| the shell, `docs/specs/shell.md` | 13 | 13 |
| the Variants step, `docs/specs/steps/variants.md` | 18 | 18 |
| the Individuals step, `docs/specs/steps/individuals.md` | 0 | 0 |
| all | 207 | 204 |

## The messages

`docs/specs/worker/messages.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| A VCF not of the ploidy given opens with the ploidy given, its first run refused and kept under its key (385) | `src/worker/runner.test.ts:756` "a VCF of tetraploids read with ploidy 2 opens with its 12 individuals and its diversity is refused"; `src/core/store.test.ts:1175` "popnei's refusal is kept under its key" | |
| A ploidy above 255 refused by popnei at the open (392) | `src/worker/runner.test.ts:801` "a ploidy above 255 is refused by popnei at the open" | added |
| A `ready` of another version with other fields gives `otherProtocol` (394) | `src/worker/messages.test.ts:580` "a ready of protocol 2 with fields of its own … is otherProtocol"; `:560` "a ready of protocol \"1\"" | added |
| An answer with a well formed id of no request passes the check, and the client refuses it (397) | `src/worker/client.test.ts:1936` "an answer of the light worker of another id is a defect"; `:651` "a progress of an id that is not running is a defect" | |
| An empty individuals file is an answer, not a failure of the worker (400) | `src/worker/messages.test.ts:166` "parseFromFilesRunner accepts … an individuals file refused" | |
| Every kind accepted, and the structured clone of any message (421) | `src/worker/messages.test.ts:111`, `:126`, `:159`, `:166` "… accepts %s"; `:199`, `:210` "… accepts the structured clone of any message" | |
| Each refusal, with its kind and its path (430) | `src/worker/messages.test.ts:223` to `:529`, one test per refusal named in the item; `:959` "a message with one leaf deleted, one field added beside it, or one leaf of the wrong type" | |
| The version: `protocol: 2` gives `otherProtocol`, `"1"` gives `wrongType` (444) | `src/worker/messages.test.ts:546`, `:553` "a ready of protocol 2 with no other field"; `:560` "a ready of protocol \"1\"" | |
| `describeMessageError` names the path and the kind (447) | `src/worker/messages.test.ts:598` "names the path and the kind of the message" | |
| A `File` and the typed arrays arrive through a real worker (450) | `e2e/skeleton.spec.ts:161` "panel.nei, filtered at 0.05 … gives the diversity of p0" | |

## The client

`docs/specs/worker/client.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| Two picks before the first file is open: the second cancels the first (427) | `src/worker/client.test.ts:347` "a read of a third load cancels the open of the second at once"; `src/ui/reads.test.ts:326` "a variants file replaced while it is read cancels its read"; `:483` "a cancelled read records nothing" | |
| A function of the page that cancels or throws while the client answers (431) | `src/worker/client.test.ts:495` "a cancel made inside onPopneiReady is seen"; `:713` "an onPopneiReady that throws"; `:629` "an onProgress that throws: the throw reaches the caller, and the run and the queue go on" | `:629` added |
| An undo to a load already read, then Run (441) | `src/worker/client.test.ts:376` "a run on a load read before, while the worker holds another, ends the worker, opens that load's File on a new one, then runs" | added |
| The variants file changed on the disk since the pick (444) | `src/worker/client.test.ts:527`, `:545`, `:564`, `:582` (the reopen that fails); `:1648` "a read waiting on an open sent for a run gets reopenFailed" | what an engine does is point R, under the runner |
| A tab left open across a deploy: two failed starts give `couldNotStart` (456) | `src/worker/client.test.ts:1615` "a calculation worker whose script does not load … twice: couldNotStart"; `:1632` the same for the light worker | |
| A request of a load whose `File` the client does not hold; the two defects of the client's own calls thrown (462) | `src/worker/client.test.ts:671`, `:680`, `:690` "… fails at once as a defect"; `:365` "a read of a known load with other read options is a defect, thrown"; `:400` "addFile of a load id the client already holds is a defect, thrown" | `:400` added |
| A worker given up answers every request at once, and the other goes on (473) | `src/worker/client.test.ts:864` "no ready twice gives the worker up: every request fails, and the light worker still reads" | |
| A worked sequence (496) | `src/worker/client.test.ts:266` "a read, two runs, a cancel and the worker started again" | |
| The load (511) | `src/worker/client.test.ts:333`, `:347`, `:365`, `:407`; `:1571` "no worker is sent a second open, nor a request of another load than its open's" | |
| Cancelling (517) | `src/worker/client.test.ts:420`, `:429`, `:447`, `:459`, `:481`, `:495` | |
| The reopen that fails (524) | `src/worker/client.test.ts:527`, `:545`, `:564`, `:582` | |
| Progress (531) | `src/worker/client.test.ts:604` "each progress of a run reaches its onProgress as it came"; `:651` "a progress of an id that is not running is a defect" | |
| A defect of the page (535) | `src/worker/client.test.ts:671`, `:680`, `:690`, `:713` | |
| Failures, one test per row of the table (539) | `src/worker/client.test.ts:729` to `:846`; `:1699` to `:1758` for the light worker | |
| Starting (543) | `src/worker/client.test.ts:864`, `:898`, `:910`, `:925`, `:944`; `:1835` "the ready stops the timer" | |
| The properties, with fast-check (551) | `src/worker/client.test.ts:1539`, `:1547`, `:1555`, `:1563`, `:1571` | |
| In the browser: the real workers, a `File` read, a Cancel in the middle, the time of a restart (559) | `e2e/variants.spec.ts:145` "panel.nei picked with the button shows 200 individuals"; `e2e/diversity.spec.ts:994` "a Stop in the middle of a pass leaves the panel ready"; `e2e/skeleton.spec.ts:233` "a calculation stopped in the middle of a pass"; `e2e/measure.spec.ts:606` "the restart on the large …" | the restart is a measurement |

## The runner

`docs/specs/worker/runner.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| A VCF of another ploidy (614) | `src/worker/runner.test.ts:756` "a VCF of tetraploids read with ploidy 2 opens with its 12 individuals and its diversity is refused"; `src/core/store.test.ts:1175` | |
| A file not of its format, `bad.vcf`; a run on it `badRequest` (623) | `src/worker/runner.test.ts:773`, `:781` "bad.vcf is refused at the open …"; `:878` "a run after an open that popnei refused is badRequest" | |
| Filters that keep no variant (631) | `src/worker/runner.test.ts:789` "filters that keep no variant are refused with popnei's counts of the pass" | |
| A VCF with no variant (639) | `src/worker/runner.test.ts:823` "a VCF of a header alone opens, and its diversity is refused as a file with no variant" | |
| A VCF none of whose variants passed, read with only the passed ones (646) | `src/worker/runner.test.ts:844` "a VCF whose every variant fails FILTER …" | |
| A population of fewer than 20 is not refused, its values NaN (657) | `src/worker/runner.test.ts:481` "a population of fewer than 20 individuals is not refused, and its values are NaN" | |
| A population naming an individual the file does not have (661) | `src/worker/runner.test.ts:814` "a population that names an individual the file does not have is refused with popnei's message" | added |
| The file changed on the disk after the pick (667) | `src/worker/runner.test.ts:577` to `:711` (a file that no longer reads); `e2e/measure.spec.ts:398`, `:435` (point R) | point R is a measurement, in the report under 8 |
| A cancel ends the worker; the runner does nothing (675) | `src/worker/client.test.ts:447` "the read of a variants file that runs ends its worker"; `e2e/diversity.spec.ts:994` | |
| Progress at the start of each pass, every 4 MiB, at the end, never before the first run (677) | `src/worker/runner.test.ts:200`, `:212` (start and end); `e2e/diversity.spec.ts:994` (the bar seen below 100% on a VCF of several MB) | the open takes no function for the progress, so it cannot tell one |
| The open (829) | `src/worker/runner.test.ts:163`, `:174` | |
| The diversity, with no filter and at 0.05 (831) | `src/worker/runner.test.ts:186`, `:191` | |
| The progress (835) | `src/worker/runner.test.ts:200` "told is given popnei's two calls of a diversity over panel.nei" | |
| The boundary at 0.05 (837) | `src/worker/runner.test.ts:244` "the missing data filter at 0.05 keeps the 39 variants whose missing rate is exactly 0.05" | |
| A change of the filters (843) | `src/worker/runner.test.ts:257` "a change of the filters opens the file again" | |
| A filter refused midway (847) | `src/worker/runner.test.ts:273` "a filter popnei refuses midway is refused" | |
| An open again that popnei refuses (850) | `src/worker/runner.test.ts:612` "an open again that popnei refuses is reopenFailed, and so is the next run" | |
| A file that no longer reads (858) | `src/worker/runner.test.ts:648`, `:656`, `:667`, `:678`, `:691`, `:700`, `:711` | |
| What `told` throws (877) | `src/worker/runner.test.ts:724` "what told throws is thrown by run, that very value" | |
| The order of the populations (880) | `src/worker/runner.test.ts:317` "populations named 10, 2 and p1 come back in the order of the job" | |
| popnei's refusals, as literals (882) | `src/worker/runner.test.ts:756`, `:773`, `:781`, `:789`, `:823`, `:844` | |
| The defects are `badRequest` (892) | `src/worker/runner.test.ts:868`, `:873`, `:878`, `:903`, `:909`, `:918` | |
| `answerOfThrown` (896) | `src/worker/runner.test.ts:928`, `:935`, `:942`, `:950`, `:957` | |
| `transferablesOf` (900) | `src/worker/runner.test.ts:451`, `:471` | |
| In the browser: panel.nei opens; the diversity at 0.05 and at 1; the bar; typed arrays; tetraploid.vcf.gz (906) | `e2e/variants.spec.ts:145`; `e2e/diversity.spec.ts:360` "the filter moved to 1 … Run at 1 gives p0 0.3519"; `:733` "a calculation under way shows its bar"; `:673` "tetraploid.vcf.gz read with ploidy 2 is refused in the panel's words" | |
| A file changed on the disk, each engine and each rewrite (920) | `e2e/measure.spec.ts:398` "the File of a pick is on the disk"; `:435` "rewrite …" | a measurement; its results are in the report, "Point R, measured on 25 September 2026" |

## The reader of the metadata file

`docs/specs/worker/individuals.md`, "The cases" and "How it is
verified". All the tests of `readCsv` are in
`src/worker/individuals/csv.test.ts`, written `csv:` below.

| item | test | note |
|---|---|---|
| A file with no header: its first individual becomes the names, and the check names it missing (571) | `csv:254` "a file of one column is read with , as one column" (nothing refuses it); `src/core/project.test.ts:1999` "12 individuals missing, named in the order of the variants file" | the reader does nothing for this case |
| A VCF picked by mistake is `variantsFile`; one cut at the top is read as a table (575) | `csv:641` "a text whose first line starts with ##fileformat=VCF or #CHROM is a variantsFile"; `csv:443` "a VCF whose first lines were cut away … is read as a table and refused" | `csv:443` added |
| A title line above the header, of three cells and of one (580) | `csv:410` "a title line of three cells over the header is an unnamedColumn"; `csv:417` "a title line of one cell over the header is read with , and refused …, or read as one column" | `csv:417` added |
| The separator `,` set on a file of `;` (588) | `csv:335` "a set separator is used" (a decimal comma refused as a row of the wrong length); `csv:431` "the separator , set on a file of ; with no comma reads each line as the name of one column" | `csv:431` added |
| A decimal comma with the separator `,` needs quotes (594) | `csv:352` "a decimal comma with the separator , needs quotes, and is read" | |
| UTF-8 set on a Windows-1252 file gives `Espa�a` (596) | `src/worker/individualsFile.test.ts:102` "the Windows-1252 file with the encoding set to UTF-8 has the replacement character" | |
| A file saved by Excel for Mac (599) | none | not tested: what Excel for Mac writes has not been checked, and no such file is among the fixtures |
| An individual named `NA` or `-` (604) | `csv:306` "NA and - in the first column are names" | |
| A binary column of `1` and `01` (606) | `src/worker/individuals/columnTypes.test.ts:191` "two numbers of one value, 1 and 01, fall to the code units" | |
| A column all missing is categorical, and as the populations puts everyone in none (609) | `columnTypes.test.ts:122` "one value, and no value at all, are categorical"; `e2e/individuals.spec.ts:932` "a column empty for every individual of the variants file gives its reason at the select" | |
| A read that comes back after the options changed, or another pick, is dropped (612) | `src/core/project.test.ts:1185` "gives the project itself for another load"; `:1202` "gives the project itself for a read of other options" | |
| `id,pop\nA,P1\nB,P2\nC,P1\n` (652) | `csv:34` | |
| `id\tpop\nA\tP1\n` (653) | `csv:53` | |
| `id;h\nA;1,5…` (654) | `csv:62` | |
| `id;h\nA;1.5\nB;1,7…` (655) | `csv:78` | |
| `id,x\n001,1…` (656) | `csv:88` | |
| `id,st\nA,case…` (657) | `csv:101` | |
| `id,g\nA,1\nB,2\n` (658) | `csv:116` | |
| `id,s\nA,1\nB,2\nC,3\nD,5\n` (659) | `csv:124`; `columnTypes.test.ts:220` "a continuous column of 4 whole numbers from 1 to 5 is warned of" | |
| quoted cells `x, y` and `say "hi"` (660) | `csv:130` | |
| `\r\n` and `\r` alone, the blank line skipped (661) | `csv:137` | |
| `id;pop;;\nA;P1;;\n` (662) | `csv:158` | |
| `id;pop;;\nA;P1\nB;P2;NA\n` (663) | `csv:564` | |
| `id,x;pop;;\nA,1;P1…` (664) | `csv:576` | |
| `id;pop;;\nA;P1\nB;P2;;x\n`, `unnamedColumn` 4 (665) | `csv:592` | |
| `id;pop;;\na;1\nb;2;3\n`, `unnamedColumn` 3 (666) | `csv:599` | |
| `id;pop;;x\nA;P1;;1\nB;P2\n`, `raggedRow` (667) | `csv:606` | |
| `id,,pop\nA,NA,P1\nB,-,P2\n` (668) | `csv:624` | |
| the starts of a VCF, `variantsFile` (669) | `csv:641` | |
| the same after a blank first line (670) | `csv:656` | |
| `id,pop\nA,P1\nB\n`, `raggedRow` (671) | `csv:168` | |
| `id,pop\n,P1\n`, `emptyIndividual` (672) | `csv:178` | |
| `id,pop\nA,P1\nA,P2\n`, `duplicateIndividual` (673) | `csv:185` | |
| `id,pop,pop\nA,1,2\n`, `duplicateColumn` (674) | `csv:192` | |
| `id,,pop\nA,1,P1\n`, `unnamedColumn` 2 (675) | `csv:199` | |
| an unclosed quote, with `,` set (676) | `csv:206` | |
| a header alone, and the empty text, `empty` (677) | `csv:212` | |
| the BOM before the first name (678) | `csv:217` | |
| the tab and `;` in a tie, the tab (679) | `csv:224` | |
| no separator fits, `,` and `raggedRow` (680) | `csv:234` | |
| a quoted cell over two lines counted in the line of the next row (681) | `csv:244` | |
| `only\nA\nB\n`, one column (682) | `csv:254` | |
| `cellNumber` with a comma, and its refusals (684) | `columnTypes.test.ts:31` to `:70`, one test per value of the item | |
| a Spanish Excel file in Windows-1252 (692) | `src/worker/individualsFile.test.ts:85` | |
| the same as UTF-8 with its BOM (696) | `individualsFile.test.ts:95` | |
| the same with the encoding set to UTF-8 (697) | `individualsFile.test.ts:102` | |
| UTF-16 little and big endian, also set to Windows-1252; a zip is `notText` (698) | `individualsFile.test.ts:114`, `:121`, `:128`, `:138`, `:148` | |
| UTF-8 with its BOM and a bad byte on line 3, `undecodedLine` (702) | `individualsFile.test.ts:299`; `:232`, `:85` for `null` | |
| UTF-16 cut short, `cutShort` (706) | `individualsFile.test.ts:351`, `:362` | |
| 20,000,001 bytes, `tooLarge`, its bytes never asked for (709) | `individualsFile.test.ts:164` | |
| a `NotReadableError`, `unreadable` (711) | `individualsFile.test.ts:181` | |
| A table written as CSV reads back as itself; with auto the separator written is found (716) | `src/worker/individuals/properties.test.ts:92`, `:109` | |
| The types do not depend on the order of the rows (728) | `properties.test.ts:167` | |
| The first type is identifier and no other is (731) | `properties.test.ts:192` | |
| In the flow: a CSV loaded, its table and "Read as", no wasm fetched by the light worker (735) | `e2e/individuals.spec.ts:137` "panel_pops.csv is read with the three options found, … and the light worker fetches no wasm" | |
| The measurement of the file of 10,000 rows (737) | `e2e/measure.spec.ts:677` "the metadata file of 10,000 rows, from the pick to its columns" | a measurement, in Chromium alone; in the report under 8 |
| A metadata file changed on the disk gives `unreadable`, checked by hand in Chrome, Firefox and Safari (739) | none | not done: the report of the plan records no such check by hand. The reader's side is `individualsFile.test.ts:181` |

## The project file

`docs/specs/core/projectFile.md`, "The cases" and "How it is verified".
The tests are in `src/core/projectFile.test.ts`, written `pf:` below.

| item | test | note |
|---|---|---|
| Saved and opened again before its variants file is given: the reference's file and checks carried (762) | `pf:295` "no variants file loaded and a reference: the reference's is written"; `pf:436` "an analysis removed, with a reference whose fingerprint matches, carries the reference's check"; `pf:2211` "written, opened, and written again with no result, a project gives the same text" | |
| Opened, given another variants file, saved before a run (766) | `pf:587` "a file loaded, pending, of another identity than the reference's is written, not the reference's"; `pf:501` | |
| Saved while the variants file is being read (769) | `pf:212` "a variants file loaded and pending, of the reference's identity, is written as the reference's"; `pf:1639` "a choice of the passed variants that differs, before the file is read and after" | |
| Its VCF read again with another ploidy, saved before that read ends (772) | `pf:231` "a VCF of the reference's identity read again with ploidy 4, pending, is written with ploidy 4 and no check, and opens so" | |
| Saved while the metadata file is being read, or refused (777) | `pf:374` "an individuals file pending or failed is written as null" | |
| An opened metadata file whose options the user changes: the screen offers to load the file again (780) | `src/core/project.test.ts:246` "setCsvOptions sets the options and puts the read to pending"; `e2e/saving.spec.ts:720` "after an opening, the Individuals step offers to load the metadata file again in place of the options of how it is read" | `saving.spec.ts:720` added |
| An analysis done under other settings saves its own numbers (786) | `pf:538` "a result done on a file of another identity, or under other settings, is saved" | |
| Save before the calculation worker started: `popneiVersion` null, every check carried (789) | `pf:1034` "… is written back byte for byte from its project", on `v1-vcf-pending.popnei.json`, whose `popneiVersion` is null and whose one check is carried | |
| The same project file opened twice (792) | `pf:1051` "… opens into its project" (an opening gives the same project each time); `src/core/analyses/diversity.test.ts:889` "the same table from another file … leaves the key the same" | the case asks nothing of the code; these show why it is harmless |
| The fixtures of version 1 (824) | `pf:1034`, `pf:1051` | |
| What is written (837) | `pf:195` to `pf:622` | |
| The writing: fields in another order, options sorted, a row on one line (847) | `pf:629`, `pf:645`, `pf:665` | |
| Each refusal (851) | `pf:1091` to `pf:1348`; the texts `pf:1364`, `pf:1370`, `pf:1389` | |
| A byte order mark (862) | `pf:1433` | |
| The fingerprints (864) | `pf:1443` | |
| The count with the diversity's own definition (867) | `pf:1247`, `pf:1271` | |
| The numbers not compared (876) | `pf:1697`, `pf:1726`, `pf:1768` | |
| The identity, and the warning of `docs/functionality.md` (881) | `pf:1567` to `pf:1633`, `pf:1828` "the warning of docs/functionality.md, whole" | |
| Property: written and opened gives the project of the table (892) | `pf:2171` | |
| Property: written, opened and written again gives the same text (896) | `pf:2211` | |
| Property: valid JSON with no field the spec does not name (899) | `pf:2232` | |
| In the browser: saved, opened in a new page, the same numbers, then the warning of the identity (901) | `e2e/skeleton.spec.ts:299` "the project saved after a run and opened in a new page gives the same numbers with panel.nei, and panel.vcf.gz then gets the warning of the identity" | |

## The diversity

`docs/specs/analyses/diversity.md`, "The cases" and "How it is
verified" of the module. The tests of the module are in
`src/core/analyses/diversity.test.ts`, written `div:` below.

| item | test | note |
|---|---|---|
| A population smaller than 20: its row with "no value", and why (586) | `div:195` (the worked example, `tooFewIndividuals`); `e2e/diversity.spec.ts:673` (the row A, 12 and "no value" three times, and its warning) | |
| A population of 20 to a few more, with missing data (591) | `div:494`, `div:1005` | |
| The filters keep no variant: the refusal kept under its key (595) | `src/worker/runner.test.ts:789`; `src/core/store.test.ts:1175` | |
| The column chosen is the first, the identifiers (599) | `div:1448` "the first column, the identifiers, chosen as the populations gives a population of one to each individual, a table with no values and one warning" | added |
| The metadata file loaded again with the same table: the same key (603) | `div:889` "the same table from another file, or with other options of the CSV, leaves the key the same" | |
| A result that arrives after the populations changed (605) | `src/core/store.test.ts:1942` "a late result: after a command, the result of the old key goes into the cache with the warnings of its request's project" | |
| A worked example (628) | `div:195` | |
| `needs` and `populationsNeeds` (648) | `div:271` to `div:374`, `div:1260` | |
| The key (652) | `div:770` to `div:969`, `div:1211`, `div:1286` | |
| `parseOptions` (657) | `div:391` to `div:458`, `div:1360` | |
| `warnings` (660) | `div:494`, `div:504`, `div:514`, `div:524`, `div:529` | |
| `script` (666) | `div:549` | |
| `diversityCsv` (668) | `div:583`, `div:593` | |
| `refusalText` (670) | `div:606` to `div:690`, `div:1183` | |
| The numbers of the flow's files, asserted as literals by the runner's test (686, 724) | `src/worker/runner.test.ts:186`, `:191` | |
| The check numbers of the first set (711) | `div:1440` "the check numbers of the flow's result at 0.05 are those of the spec" | added |
| The flow: 0.05, then 1 with its notice, Run, Undo, axe in each state (728) | `e2e/skeleton.spec.ts:161`, `:190`, `:215`; `e2e/diversity.spec.ts:360` | |

## The entry

`docs/specs/entry.md`, "The cases" and "How it is verified".

| item | test | note |
|---|---|---|
| A file picked before popnei has loaded says "Reading panel.nei." (542) | `e2e/variants.spec.ts:575` "a file picked before popnei has loaded is shown as being read" | |
| popnei's wasm does not load: `couldNotStart`, the read failed, the analyses locked with their words (545) | `src/ui/reads.test.ts:535` "a couldNotStart is recorded as a failure of the worker"; `src/core/project.test.ts:1519`; `e2e/variants.spec.ts:708` "the calculations that could not start are told in the words of the step" | its last sentence, nothing shown before a file is picked, is not asserted: a flow cannot tell when the worker has given up with no file picked |
| The calculation worker crashes while it opens the file: not asked again (552) | `src/ui/reads.test.ts:515` "a workerFailed is recorded as a failure of the worker, and the file is not asked again" | |
| An undo back to a load already read asks for nothing (557) | `src/ui/reads.test.ts:266` "an undo back to a load already read asks for nothing" | added |
| An opened project: nothing read until the user gives the file (560) | `src/ui/reads.test.ts:283` "an opened project, with no variants file and its metadata file read, asks for no read"; `src/worker/client.test.ts:671` (a load with no `File` is a defect); `src/core/projectFile.test.ts:1334` (no project file gives a pending read) | `reads.test.ts:283` added |
| A record, a `runEnded` or a listener that throws reaches the error bar (568) | `src/ui/runs.test.ts:133` "a runEnded that throws rejects the promise"; `e2e/entry.spec.ts:152` "a promise rejected with nothing to handle it shows the error bar"; `src/core/store.test.ts:947` | |
| A defect while the entry starts (572) | `e2e/entry.spec.ts:349` "a defect while the entry starts shows the bar with its words for the start, and no Loading" | |
| A browser below the floor (580) | `e2e/entry.spec.ts:329` "a browser without Array.prototype.toSorted is told it is too old" | |
| The page reloaded or closed asks first when the project changed (581) | `e2e/saving.spec.ts:190`, `:383` | |
| The rule of the reads (592) | `src/ui/reads.test.ts:208`, `:223`, `:234`, `:250` | |
| Cancelled (598) | `src/ui/reads.test.ts:311` to `:483` | |
| Each row of the table of the outcomes (607) | `src/ui/reads.test.ts:499`, `:515`, `:535`, `:574`, `:590` | |
| `wantedReads` with `csv` null throws (611) | `src/ui/reads.test.ts:612` | |
| `startAnalysis` (613) | `src/ui/runs.test.ts:96`, `:103`, `:115`, `:133` | |
| `createSaving` (617) | `src/ui/saving.test.ts:84` to `:197`, `:281`, `:314` | |
| `addFile` (631) | `src/ui/files.test.ts:6` | |
| `createDefects` and `isResizeObserverNoise` (633) | `src/ui/defects.test.ts:6`, `:18`, `:31`, `:45`, `:93`, `:104` | |
| `apps.ts` (639) | `src/core/apps.test.ts:11`, `:18`, `:24` | |
| The page opens at the Variants step, no error bar, axe (649) | `e2e/entry.spec.ts:45` | |
| The flow of the walking skeleton (652) | `e2e/skeleton.spec.ts:161`, `:233` | |
| An error from a handler and a promise rejected show the bar; a second adds its count (656) | `e2e/entry.spec.ts:136`, `:152`, `:164` | |
| A throw in the calculation worker outside a request starts it again, no bar (663) | `e2e/entry.spec.ts:406` | |
| The entry's file answered 404, and of bad syntax (666) | `e2e/entry.spec.ts:273`, `:289` | |
| A throw while React draws the Variants step (670) | `e2e/entry.spec.ts:377` | |
| A defect while the entry starts, by an `Object.freeze` that throws (673) | `e2e/entry.spec.ts:349` | |
| A browser without `Array.prototype.toSorted` (677) | `e2e/entry.spec.ts:329` | |
| A throw while React draws the shell outside every boundary (680) | none | not tested, by the spec: it cannot be made without code that exists only for a test, and is checked by review |

## The shell

`docs/specs/shell.md`, "How it is checked". The tests of its words are
in `src/ui/shell/words.test.ts`, written `words:` below.

| item | test | note |
|---|---|---|
| `stepStates`, a state per row and the order of the rows (672) | `words:290` to `words:475` | |
| `summaryLine` (675) | `words:496` to `words:609` | |
| `noticeText` (679) | `words:643` to `words:733` | |
| `announcementsOf`, and none in the six cases named (682) | `words:757` to `words:1070`; `words:1082`, `:1096`, `:1108`, `:1136`, `:1203`, `:1238` | |
| The announcer, and `undoOrRedo` (690) | `src/ui/shell/status.test.ts:18`, `:39`, `:60`; `src/ui/shell/undoRedo.test.ts:118` | |
| The links of the stepper, the back button, the focus on the heading (700) | `e2e/entry.spec.ts:78` | |
| No question on a page just opened; the question after a pick (703) | `e2e/saving.spec.ts:190` | |
| Save project: its dialog, the download, the status region, the names, Cancel, the question after Save (706) | `e2e/saving.spec.ts:203`, `:238`, `:383` | |
| Open project…: `notes.txt`, above 64 MB, the saved file after a change (714) | `e2e/saving.spec.ts:450`, `:625`, `:649` | |
| Undo with the mouse until nothing is left puts the focus on Redo (719) | `e2e/shell.spec.ts:232` | |
| F6 reaches the notice, and not while the dialog of Save is open (721) | `e2e/shell.spec.ts:518`, `:644` | |
| An error shows the bar; Copy the details in Chromium shows the box (724) | `e2e/entry.spec.ts:136`, `:222` | |
| axe in each state of the table of the states (727) | `e2e/shell.spec.ts:131` (empty), `:165` (ready), `:190` (running), `:207` (done), `:473` (results removed); `e2e/entry.spec.ts:136` and `e2e/saving.spec.ts:450` (error) | |

## The Variants step

`docs/specs/steps/variants.md`, "How it is checked", a paragraph whose
checks are listed here one by one; all start at its line 450.

| item | test | note |
|---|---|---|
| `panel.nei` picked with the button, the focus on the button | `e2e/variants.spec.ts:145` | |
| a file dropped, the focus still on the button | `e2e/variants.spec.ts:170` | |
| `tetraploid.vcf.gz` with ploidy 2: 12 individuals and "Read with ploidy 2, …" | `e2e/variants.spec.ts:224` | |
| the diversity panel's words for the wrong ploidy | `e2e/diversity.spec.ts:673` | |
| the ploidy set to 4, the button to read again, "Read with ploidy 4, …" and no line "Ploidy 4", the diversity run | `e2e/variants.spec.ts:246`; `e2e/diversity.spec.ts:673` | |
| the button's words with both options changed | `e2e/variants.spec.ts:667` | |
| `bad.vcf` and its reason, ending "Choose another file." | `e2e/variants.spec.ts:285` | |
| `panel.txt` and its message | `e2e/variants.spec.ts:301` | |
| a piece of text dropped, and its message | `e2e/variants.spec.ts:722` | |
| a piece of text pasted into the zone's button, the same message | `e2e/variants.spec.ts:738` | |
| 10 and 0.125 in the threshold, the line, the value kept, announced | `e2e/variants.spec.ts:369` | |
| 300, 0 and 2.5 in the ploidy | `e2e/variants.spec.ts:622` | |
| 0,1 and 0,2 typed key by key in the threshold, 2,0 in the ploidy | `e2e/variants.spec.ts:449`, `:547` | |
| the value kept typed back, and an arrow key at a bound, take the line away | `e2e/variants.spec.ts:498` | |
| `tetraploid.vcf.gz` dropped with 300 typed and not committed | `e2e/variants.spec.ts:785` | |
| the status region after each read | `e2e/shell.spec.ts:317` "the status region says the end of each read of the Variants step and of the metadata file" | |
| a folder dropped, and the function that tells what a drop held, in node | `e2e/variants.spec.ts:692`; `src/ui/widgets/dropped.test.ts:11` | |
| axe in each state | `e2e/variants.spec.ts:145`, `:170`, `:188`, `:207`, `:224`, `:246`, `:285`, `:301`, `:349`, `:369`, `:449`, `:575`, `:622`, `:667`, `:692`, `:722`, each of which runs axe in the state it reaches | |
