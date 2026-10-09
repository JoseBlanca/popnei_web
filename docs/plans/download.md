# Plan: the download of the filtered variants on popgen2.html

8 October 2026. Written and to be carried out the same night: the owner
approved the design and ordered on 8 October 2026 that this plan be
written and followed while they are away, and they review the result
on 9 October 2026. So the plan has no stop for the owner before its
last work package, in which they try the page; what would be a stop by
the `building` skill is named below ("The stops"), with what the session
does meanwhile.

It builds the section "The download of the filtered variants" of the
design `docs/designs/stats-filters.md`, approved by the owner on 8
October 2026 with its decisions 7 to 12 ("What the owner decided"):
one button, "Download filtered variants…", after the Variants and
Individuals sections of `popgen2.html`, opens a dialog with the choice
of a VCF compressed with bgzip or a `.nei` file; the calculation worker
writes the file through popnei 0.2.2, which hands it over in pieces of 1
MiB; the browser's download starts by itself when the write ends; and
the button gives way to a text that says what was downloaded and what
each filter removed, with "Save it again". It serves case 1 of
`docs/use-cases.md` to its end, the filtered file in the user's hands.
It is carried out as the `building` skill says, its work packages being
the phases of that skill's loop, on the branch `download` in
`.claude/worktrees/download`.

The specs, called below by their file names, were written or revised on
this branch on 8 October 2026 (`git log --oneline c5c724e..1e4c7ef`):

- the screen: `docs/specs/steps/popgen2-download.md`, called **the
  screen spec**;
- the write: `docs/specs/analyses/writeVariants.md`;
- core: `docs/specs/core/store.md`, `individualsKept.md`;
- the worker: `docs/specs/worker/protocol.md`, `messages.md`,
  `runner.md`.

## Words used below

- **The one pass** is the single reading of the variants file when it is
  opened, the analysis `variantsSummary`, which gives the plots and each
  individual's missing rate and heterozygosity. **The write** is the
  second reading, made when the user presses Download, that carries the
  filters out and gives the file. Both are the screen spec's terms.
- **The pieces** are what popnei 0.2.2's `writeVars` and `writeVcf` give
  their `onBytes`, 1 MiB each; **the parts** are the `Blob`s of 16 MiB of
  pieces the worker makes on the way, `WRITE_PART_BYTES` of the runner,
  64 MiB until work package 8 set it on 9 October 2026.
  A `Blob` is the browser's object for a file made in the page.
- **The automatic download** is the browser's download started by the
  page's code when the write ends, minutes after the user's click on
  Download, with no click of its own. **The Save click** is the other way
  the screen spec gives ("The trial that comes first"): the dialog ends
  with a button that saves the file.
- **The old page** is `popgen.html`, whose write, words and limits of
  size must not change, though it shares the runner and the store.
- **The browser check** is `POPNEI_TEST_PAGES=1 npm run build` and then
  `npx playwright test --project=chromium --project=webkit --workers=4
  --global-timeout=<milliseconds> -g "<tag>"`. Firefox cannot start on
  the owner's Mac under Playwright 1.63.0.
- **The measurement run** is the same build and `npx playwright test
  --project=measure-chromium` and then `--project=measure-webkit`, each
  with `--workers=1`, alone on the machine, with `-g "<tag>"`; the
  measurements live in `e2e/measure.spec.ts`, which only those two
  projects run.
- **The screens run** is `npx playwright test --project=screens -g
  popgen2 --global-timeout=400000` after a build, which writes the PNGs
  of `e2e/screens.spec.ts` (`.claude/skills/coding/testing.md`).
- **The old page's flows of the write** are `e2e/writing.spec.ts` whole
  and the other specs that write a file on the old page,
  `filterCounts`, `individualLists`, `individualThresholds`,
  `variantsOrder`, `variantSwitches`, `saving` and `shell`, all under
  `e2e/`; **the old page's screens of the write** are those of
  `e2e/screens.spec.ts` named `popgen-write-…`, run with `-g
  popgen-write`.
- **A tag** starts the name of a Vitest `describe` or of a Playwright
  test: `DL2 D1` is work package 2, deliverable 1, of this plan (`DL` for
  the download; no test of the repository starts so on 1e4c7ef). A
  Vitest count is read from the summary line of `npx vitest run <path>
  -t "<tag>"`, "Tests N passed", since a tag that selects nothing exits
  0; a Playwright count from the summary of the browser check, half in
  each engine. No test name of 1e4c7ef starts with a tag of this plan,
  so on that commit every check below runs no test, and fails.
- **A command in the foreground** lasts at most 600,000 ms, the limit of
  the session's shell, and nothing runs in the background (the standing
  rules of the subagents). A browser run that would last longer is split
  into runs that each end within it.

## In and out

In: the ten work packages below. Three of them are measurements, each
with what it decides: the automatic download tried in Chromium and
WebKit (work package 1), the cost of the bar (5), and the largest file
written with what a write leaves in the tab (8). The owner's try of the
page is the last, 10, after the session's own look at the screens in 9.

Out, each with where it goes:

- a link to download the other format after a download: not built, the
  owner's decision 12 of the design;
- the VCF on the old page, which writes the `.nei` file alone, and new
  values of its warning and limit (`writeVariants.md`, "Not in this
  spec"); work package 8 records what the pieces change, and changes no
  constant of the old page's estimate;
- a file past Chromium's quota of `Blob`s on the disk, which the design
  asks for: the quota is a tenth of the disk, about 180 GB on the
  owner's disk of 1.8 TiB with 273 GiB free on 8 October 2026, so the file
  would nearly fill the disk; not tried, and the report says so;
- Firefox, which Playwright cannot start on this Mac: the automatic
  download and a write of 2 GB with `about:memory` are the owner's, by
  hand, in work package 10; and Chrome by hand, which is not installed on
  this Mac, is left out unless the owner has it elsewhere;
- VoiceOver, which the session cannot run: the owner, in work package
  10, with the list of the screen spec's "Not yet heard in VoiceOver";
- the help drawer, the saving of the project on `popgen2.html`: later
  pieces (the screen spec, "Not in this spec").

The specs have no open point: the owner answered the design's two on 8
October 2026 (decision 12), and the screen spec and the module specs
list none.

## The stops

The `building` skill stops for the owner on a choice hard to undo,
something popnei lacks, a decision about what the user sees that the
specs do not settle, a phase that failed three times, and anything
outside the worktree. None is expected here. If one comes, the session
does not stop the night's work: it leaves the tree with the checks
passing and everything committed, writes the question under "What was
done" with the options, what each costs and a recommendation, goes on
with every work package that does not stand on the answer, and puts the
question first in the report.

- **popnei does not do what its declarations say**: the pieces of
  `onBytes` are not the bytes of the whole file, `passStats` lacks the
  counts of a filter, `writeVcf` refuses a `.nei` source, or a file read
  back holds other variants than the spec's numbers. Nothing is worked
  around in the page. Meanwhile: work packages 3, 6 and 7 on the format
  that works, the other format's flows marked as failing with the
  reason; the issue for popnei drafted in "What was done", not filed.
- **The choice of the pieces does not hold** (the design, "How it is
  tested, and what would prove it wrong"): work package 8 shows an
  engine holding the file twice even with the parts kept as a list, or
  closing the tab, or failing, at a file under 2 GB, the size the old
  page wrote in both engines on 27 September 2026. That reopens
  `docs/architecture.md` section 6, with the origin private file system
  and a warning before the write as the options. Meanwhile: no limit, as
  the specs have it, and the measurement with the question in the report.
- **An invariant of `docs/architecture.md`**, a new dependency, or a
  change to the project file's format: none is planned. A task that
  finds it needs one stops there and reports, and the session goes on
  with the work packages that do not stand on it.
- **A work package that fails three times**, or a finding of a review
  whose fix is one of the above. Meanwhile the work packages that do not
  stand on it.
- **Outside the worktree.** Nothing is merged, pushed or filed: a review
  finding that does not belong to this piece is written under "What was
  done", for the owner, not as a GitHub issue.

Two outcomes are not stops, since the owner decided them beforehand: a
browser that blocks the automatic download or asks every time gives the
Save click to every browser (decision 12), and a bar that slows the
write is not drawn with its share (decision 8; work package 5 says how).

## Before the first task

- The worktree has its packages: `node_modules` is there on 1e4c7ef, with
  popnei 0.2.2 (`npm pkg get dependencies.popnei` prints
  `js-v0.2.2/popnei-0.2.2.tgz`, and `node_modules/popnei/package.json`
  says 0.2.2). Node is v26.8.2. `npx playwright install` if Chromium or
  WebKit is missing.
- Every number of the specs is popnei 0.2.2's under node, taken on 8
  October 2026; a subagent that needs another takes it the same way, as
  `src/worker/runner*.test.ts` and `e2e/fixtures/make_fixtures.mjs` load
  popnei, never from popnei's Python `.venv`, which is a stale 0.1.0.
- `make_fixtures.mjs` run with no flag writes `ld.nei` and
  `panel_pca.json` again; a new fixture gets a flag of its own that
  writes that file alone, as `--low-qual-nei` does.
- The checks of the `coding` skill pass on 1e4c7ef, `npm run test:e2e`
  replaced by the browser check of the whole suite in Chromium and
  WebKit, run in chunks of spec files that each end within a foreground
  command (below, task 9.2, for the split); the session writes their
  counts under "What was done" before work package 1, so that a later
  failure belongs to the plan. `npx vitest list` and `npx playwright test
  --list` confirm that no test name starts with `DL`.

## The order, and what may run side by side

The measurement whose answer changes the screen comes first: work
package 1 tries the automatic download with no code of the application,
since it decides how the dialog ends. Then the worker and core, since a
mistake there gives a file of other filters than the page shows, or a
key without the format, which no screen shows. Then the cost of the bar,
which decides what the bar of the dialog draws. Then the screen, in two
work packages, then the measurement of the largest file, which needs the
screen's write with no limit of size, then the end and the owner's try.

- Work packages 1, 2 and 3 may start together. 1 runs only browsers; 2
  touches `src/worker/`; 3 touches `src/core/fileNames.ts`,
  `individualsKept.ts`, a new `noVariantKept.ts` and the callers of
  `writtenName` in `src/ui/`. Only one of them runs the build or a
  browser at a time, 1 first, since they share `dist/` and the ports.
- 4 stands on 2, whose `WriteJob` takes `"vcf"`. 5 stands on 2, the write
  by pieces it times, and runs its browsers when no other package does.
- 6 stands on 1, 3, 4 and 5. 7 stands on 6. 8 stands on 7 and runs alone
  on the machine, no other agent building or running a browser, since
  its numbers are of memory and time.
- 9 and 10 run after everything, in order.

Each work package is reviewed as it ends, as the `building` skill and the
`code-review` skill say: one `code-reviewer` subagent per category that
applies, in batches of three, the findings judged by the session, the
fixes sent to a subagent test first, the checks and the screenshots run
again after them. At most three agents run at once, the reviewers among
them. The counts of each work package's checks, its commits and its
review are written under "What was done", one entry per work package.

Every task writes its tests first, sees them fail on the commit before
it, then the code; a task's commit holds both, and passes the typecheck,
the lint, Vitest and the format check.

## Work package 1: the trial of the automatic download

What it decides: whether Chromium and WebKit download a file that a
page hands them long after the click that asked for it, and a second
such file in the same session. If either engine blocks either, or waits
for an answer that never comes, every browser gets the Save click, as
the owner decided (the design, decision 12): work package 6 builds the
end of the dialog as the screen spec's "The trial that comes first"
gives it, and the session revises the screen spec's other sections to
match before that package starts. Otherwise work package 6 builds the
automatic download, and the owner tries it in Safari and Firefox in work
package 10.

It uses no code of the application: the trial is of the browser. The
page's `downloadFile` of `src/ui/download.ts` is a link to a `Blob` with
the `download` attribute, clicked by the code; the trial does the same
from a script the test adds to a built page.

Deliverables:

1. The measurements under `DL1` in `e2e/measure.spec.ts`, run by the
   measurement run in both engines, and once more in Chromium with
   `--headed`, which runs the full browser in place of the headless
   shell. Each case starts from a real click of Playwright on a button
   the test adds, which gives the page the user's activation, and
   records whether the download event comes within 5 s of the code's
   click, and its name and size:
   - the download at once after the click;
   - 10 s after the click, with no input meanwhile, past the few seconds
     the browser keeps the activation (the design, "The download started
     by itself");
   - 70 s after the click, past the minute after which `downloadFile`
     releases the address of an earlier file;
   - a second download 10 s after a second click, in the same page,
     which is the second write of a session;
   - a second download 10 s after the first with no click between. No
     flow of the page makes it; it is there to see whether Chromium's
     limiter, which asks before a page downloads several files, acts at
     all under Playwright, which may switch it off. Its outcome decides
     nothing.
2. The results in "What was done": for each engine and case, the event
   or its absence, with the versions of the engines and the date; and
   the decision, the automatic download or the Save click.

Tasks:

- [ ] 1.1 The trial and its run. Both deliverables.

What could go wrong: Playwright accepts downloads for the page under
test, and its build of Chromium may bypass the question that Chrome asks
a site that downloads several files, and WebKit has no setting "Allow
downloads" of Safari. So a download that comes shows that the engine
starts it with no activation, and not that the user's browser would not
ask; that is what the owner tries by hand in work package 10. A download
that does not come is a block, and decides the Save click.

## Work package 2: the worker writes a VCF, and the file by pieces

What it gives: the calculation worker writes the filtered variants as a
`.nei` file or as a bgzipped VCF, holding at most one part of pieces,
16 MiB since work package 8 (64 MiB when this package was built), and
one block in wasm rather than the whole file, and answers a crash when
the browser could not keep the file. The old page writes its `.nei`
file through it, with the same bytes and words as before.

Deliverables:

1. The write by pieces: the tests of `runner.md`, "How it is verified",
   bullet "The written file, by pieces", under `DL2 D1` in
   `src/worker/runner.test.ts` or a file beside it: each format on
   `panel.nei`, `panel.vcf.gz` and `low_qual.vcf.gz` with the bytes equal
   to popnei's whole file and the same `passStats`, read back by popnei;
   the VCF of 3,000 variants of 1,000 individuals that `e2e/bigVcf.ts`
   writes into the test's folder, in both formats, with
   `writePartBytes` of one piece; the file of no variant in both formats;
   a `readLastByte` that throws, answered `crashed` with the words of the
   spec; a `told` that throws. At least twelve tests.
2. The messages: the cases of `messages.md`, "How it is verified", that
   name the format `"vcf"`, and the refusal of `"bcf"` and `"vcf.gz"`,
   and `PROTOCOL_VERSION` 15, under `DL2 D2` in
   `src/worker/messages.test.ts`.
3. The worker's script makes its runner with `readLastByte`, the read of
   `FileReaderSync`: under `DL2 D3` in `src/worker/runnerWorker.test.ts`.
4. Every test that existed passes, and the old page's flows of the write
   in the browser check, `panel.filtered.nei` of 251,074 bytes among
   them.

Tasks:

- [ ] 2.1 `WriteJob` and `Written` of `src/worker/protocol.ts`, the
  checks of `src/worker/messages.ts` and `PROTOCOL_VERSION` 15
  (`protocol.md`, the interfaces `WriteJob` and `Written`; `messages.md`,
  the bullet of `write` and "The checks"). Deliverable 2.
- [ ] 2.2 The write in `src/worker/runner.ts`, `onBytes`, the parts,
  `writePartBytes` and `readLastByte` of `RunnerOptions`, and the
  runner's options in `src/worker/runnerWorker.ts` (`runner.md`, "The
  written file", "What a write holds", the interface `RunnerOptions`).
  Deliverables 1, 3 and 4. If the type check needs 2.1 and 2.2 together,
  they are one commit.

What could go wrong: `onBytes` must keep the piece and return, with no
promise, or popnei ends the pass with an error (`runner.md`, "The
written file", step 1). When popnei's pass fails after it has given some
pieces, the pieces kept are the first part of a file with no end; the
runner drops them with its answer, and a test that asserts that no
`Blob` reaches the page after a refusal guards it.

## Work package 3: the name, the words of no individual kept, and the check of no variant for certain

What it gives, in the words of work package 6: the name of the file in
either format; the words of a page with no steps when the filters of the
individuals keep none; and the function that tells, from the one pass
alone, that the filters keep no variant, so the page says so in place of
the button and writes nothing.

Deliverables:

1. `writtenName(p, format)`: the cases of `writeVariants.md`, "How it is
   verified", bullet `writtenName`, the VCF keeping `.filtered.vcf.gz`
   with no filter, under `DL3 D1` in `src/core/fileNames.test.ts`; the
   old page's callers pass `"nei"`, and their tests pass untouched.
2. `keptNoneReason(p, kept, step)`: with the default step the words of
   today, "… in the Variants step"; with `null`, "The filters of
   individuals keep none of the 200 individuals of panel.nei. Loosen
   them.", and the words of one individual, as the screen spec's "Its
   words" gives them; under `DL3 D2` in `src/core/individualsKept.test.ts`.
3. `noVariantForCertain` of `src/core/noVariantKept.ts`: every case of
   `writeVariants.md`, "How it is verified", bullet
   `noVariantForCertain`, over the one pass's result of `panel.vcf.gz`
   kept as a fixture written by popnei 0.2.2 under node, by
   `make_fixtures.mjs` with a flag of its own that writes that file
   alone; and a test in node that loads popnei, and for each of the
   three thresholds of the variants at every edge of the fine bins from 0
   up to the first edge where popnei keeps a variant, asserts that a
   certain answer is never given where popnei's filter keeps one. Under
   `DL3 D3`.

Tasks:

- [ ] 3.1 `writtenName` and its callers in `src/ui/shell/words.ts`,
  `src/ui/shell/ProjectButtons.tsx`, `src/ui/steps/variants/writeParts.ts`,
  `WriteSection.tsx` and `writeWords.ts`; `keptNoneReason`
  (`writeVariants.md`, "The functions of core"; `individualsKept.md`, the
  interface). Deliverables 1 and 2.
- [ ] 3.2 `noVariantForCertain`, its fixture and its tests
  (`writeVariants.md`, "The functions of core", the paragraphs of
  `noVariantForCertain`). Deliverable 3. A certain answer where popnei
  keeps a variant would tell the user there is nothing to download when
  there is, with nothing on the screen to show it; so this is a commit of
  its own, guarded by the test against popnei.

What could go wrong: the threshold of 0. The first bin holds 0 and the
values up to 0.001, so at 0 only an empty first bin is certain; on
`panel.vcf.gz` the missing rate at 0 keeps 2 variants. `variantsAllKept`
of `src/core/thresholds.ts` treats 0 apart already, and the new function
reads the bins the same way.

## Work package 4: the store holds the format, keeps the file after its download, and works out the individuals kept on popgen2.html

What it gives: the store writes in the format the user chose, under a
key that holds it; keeps the file after it is handed to the browser,
for "Save it again", until a change gives the write another key; and on
`popgen2.html` has a write and works out the individuals kept from the
one pass finished. Nothing on either page changes yet.

Deliverables:

1. The format: the bullet "The format of the write" of `store.md`, "How
   it is verified", under `DL4 D1` in `src/core/store.test.ts`; the
   existing tests that asserted a `startWrite` of another format than
   `"nei"` a defect are changed to the new rule, each named in the commit
   message.
2. The file kept in `saved`: the sentences of the bullet "The writing"
   of the same section revised on 8 October 2026, `writeSaved()` keeping
   the same file object, and a command and its undo giving `ready` with no
   file and no `writeDiscarded`, under `DL4 D2`.
3. The store of `popgen2.html`: the bullet "The statistics of
   popgen2.html" of the same section, under `DL4 D3` in
   `src/core/store.test.ts`; and `createPopgen2Store` made with its
   `write`, `Client.write` and `writeCountsOf`, and with `variantsSummary`
   as its `statistics`, under `DL4 D3` in `src/ui/popgen2Store.test.ts`.
4. Nothing changes for the user on either page: the flows of
   `popgen2.html`, `e2e/popgen2*.spec.ts`, `fileStats.spec.ts` and
   `openVariants.spec.ts`, pass untouched, the one request per file among
   them; the old page's flows of the write pass, and its screens of the
   write are taken again and are the same.

The work package is done when the `DL4` tags give at least one test for
each case its deliverables name, all passing, with every other test of
Vitest and the flows of deliverable 4 passing, and its review is
handled.

Tasks, in order, since all are in `src/core/store.ts`:

- [ ] 4.1 The format of the write: `STATE_FORMAT` goes, the store holds
  the format `startWrite` sets, the key and every state carry it
  (`store.md`, "The writing of the filtered variants", the paragraph
  "The format", and the interface `WriteStatus`). Deliverable 1. A key of
  the write without the format would give the VCF's state to a `.nei`
  write, silently; so this is a commit of its own, guarded by
  deliverable 1.
- [ ] 4.2 The file kept in `saved` (`store.md`, the bullet "The file is
  kept until the project gives another key"). Deliverable 2.
- [ ] 4.3 `src/ui/popgen2Store.ts`, the function that reads
  `perIndividual` of the one pass's result, and what `src/ui/popgen2.tsx`
  gives it (`store.md`, "The individuals kept"; `writeVariants.md`, "On
  popgen2.html", "What it asks of core"). Deliverables 3 and 4.

What could go wrong: the one pass as the store's statistics. On the old
page the store starts the statistics itself when a write waits for them;
on `popgen2.html` the one pass is started by the page's automatic runs,
and a second request for it would read the file twice. Deliverable 4's
flow of one request per file guards it.

## Work package 5: the cost of the bar

What it decides: whether the dialog's bar shows popnei's share of the
write. The owner asked for a bar "if it does not slow the write"
(decision 8). The bar is popnei's progress, a message to the page at
each 4 MiB of the variants file read.

Deliverables:

1. Under `DL5` in `e2e/measure.spec.ts`, on the old page, whose write is
   the same request of the same runner as work package 2 made it, with
   the machinery of `VS5 D5` there: the VCF of 200,000 variants of 1,000
   individuals that `e2e/bigVcf.ts` writes, 127.6 MB gzipped, written as
   a `.nei` file with no filter, about 220 MB, five times with the bar
   and five times without, in each engine, timed from the press of Write
   to the answer of the write. Without the bar is the worker's script
   served with a few lines in front of it that drop its messages of
   progress before they are posted, as `e2e/holdWorker.ts` serves it, so
   that no code of the application changes.
2. The medians, and the spread of each, the longest of its five writes
   less the shortest, in "What was done", with the engines' versions,
   and the decision, taken in each engine and holding for both: the bar
   shows its share when, in both engines, the median with it is longer
   than the median without it by at most the larger of 2% and the spread
   of the five writes without it; otherwise it is drawn busy, with no
   share, and the line of the write gives the time alone. In that case
   the session revises the screen spec's "While the file is written" and
   `runner.md`, "Progress", so that a write sends no progress, before
   work package 6, and says so in the report.

Tasks:

- [ ] 5.1 The measurement and its run. Both deliverables.

## Work package 6: from the button to the file downloaded

What it gives: on `popgen2.html`, once the one pass is finished, the user
presses "Download filtered variants…", chooses the format, presses
Download, sees the bar and can Stop, and when the write ends the file
is downloaded and the button gives way to the text that says what was
downloaded and what each filter removed, with "Save it again". Before
the one pass is finished, the button is disabled with its reason; a
failure keeps the dialog open with its words and Close. With the Save
click, if work package 1 decided it, the dialog ends with its Save
button instead, as the screen spec gives it.

Deliverables:

1. The dialog that Escape does not close: the prop of
   `src/ui/widgets/Dialog.tsx` that sets React Aria's
   `isKeyboardDismissDisabled`, under `DL6 D1`, in jsdom as
   `src/ui/variants/VariantsPage.test.ts` draws a component; the old
   page's dialogs unchanged, their flows passing.
2. The words, in a module of words beside the page's others in
   `src/ui/variants/`, under `DL6 D2`: the button's two reasons, the line
   of the write with and without popnei's report, the name of the bar,
   the status region after Stop, each failure of `writeVariants.md`,
   "Its words on popgen2.html", asserted whole; and the text after the
   download from the counts of a pass and of `individualsKept`, each
   filter left out when it removed none, each line left out when no
   filter of its kind removed any, and the singular (the screen spec,
   "How it is checked", In Vitest).
3. What takes the place of the button in the states locked, ready,
   running, error and done with the store's `saved`, from a store made
   with a fake worker; the end of a write with a file calling
   `downloadFile` once and then `writeSaved`; Save it again calling
   `downloadFile` with the file of `saved`. Under `DL6 D3`.
4. Flows under `DL6 D4` in a new `e2e/popgen2Download.spec.ts`, each a
   bullet of the screen spec's "How it is checked", In Playwright:
   `low_qual.vcf.gz` downloaded as a VCF, 75,577 bytes, read back by
   popnei in node, the text and the focus on it once the dialog has gone;
   the thresholds of the example as a `.nei` file and as a VCF;
   `panel.nei` with no line of what was removed; Save it again; the
   button disabled while the one pass runs, held by `e2e/holdWorker.ts`,
   and after its Stop, enabled at Start again's end; Stop during a write
   of the VCF of 200,000 variants of `e2e/bigVcf.ts`, and Escape while
   it writes; a crash of the worker during a write, `e2e/crashWorker.ts`,
   then Download writing again; axe on the button with its reason, the
   dialog and the text after the download, light and dark.
5. The old page: its flows of the write and its screens of the write,
   unchanged.
6. The screenshots: `popgen2-download-waits` (the button disabled with
   its reason), `popgen2-download-dialog`, `popgen2-download-writing`
   (the bar at a share), `popgen2-download-failed`, `popgen2-downloaded`,
   each light and dark, at 1280 and 320 pixels.

Tasks:

- [ ] 6.1 `Dialog.tsx`'s prop (the screen spec, "While the file is
  written", the paragraph of Escape). Deliverable 1.
- [ ] 6.2 The words (the screen spec, "Its words"; `writeVariants.md`,
  "Its words on popgen2.html"). Deliverable 2.
- [ ] 6.3 The button, the dialog, the write and its end, in
  `src/ui/variants/` beside `StatsSection.tsx` (the screen spec, "The
  button", "The dialog", "While the file is written", "When the write
  ends", "When the write fails", "Accessibility"; "What it sends and
  reads"). Deliverables 3, 4 and 5.
- [ ] 6.4 The screenshots. Deliverable 6.

What could go wrong:

- The focus after the dialog. React Aria keeps the page out of reach
  while the dialog closes and then gives the focus to the button that
  opened it, which is gone; the focus is moved to the text only once the
  overlay is off the page (the screen spec, "When the write ends", step
  3). The flows read `document.activeElement` in both engines.
- The screenshot of the bar at a share needs a write held after its
  first report: `e2e/holdWorker.ts` keeps back the summary's results
  today, and gains the holding of a write's answer, released by its
  channel, a few lines in front of the worker's script as it adds now.

## Work package 7: when there is nothing to download, and when the text goes

What it gives: when the filters of the individuals keep none, their
words take the place of the button; when the one pass makes it certain
that the filters keep no variant, the sentence that says so does, before
any write, and is said once in the status region; otherwise a write of
no variant ends with that sentence and nothing downloaded. The text
after a download stays until a threshold, the FILTER box or the file
changes, and then the button is back. A run of the arrow keys waiting
on a threshold is made a change before the dialog opens.

Deliverables:

1. What takes the place of the button in the rest of the screen spec's
   table of "The states": locked with the words of `keptNoneReason` with
   `null`, and with the sentence of no variant when certain; done with
   the store's `noVariant`; done with the store's `done`, a file not
   handed to the browser, with "written" and "Save it". Under `DL7 D1`,
   from a store made with a fake worker, with a write of no variant
   calling neither `downloadFile` nor `writeSaved`.
2. Flows under `DL7 D2` in `e2e/popgen2Download.spec.ts`, each a bullet
   of the screen spec's "How it is checked", In Playwright: a run of the
   arrow keys, then Enter on the button within its quiet second, and the
   file written with the threshold the run moved to; the text staying
   through a click elsewhere and Escape, and going at a change of a
   threshold, a click on the FILTER box and another file; the sentence
   before any write for each certain case, with no dialog and no request
   sent, and the button with the missing rate at 0; the sentence after
   the write for each case that is not certain, with no download event,
   and the file of one variant where the plot alone would have said
   none; the individuals' missing rate at 0.01 giving the words of
   `keptNoneReason`; a file dropped or pasted while the dialog is open
   opening nothing; axe on each sentence, light and dark.
3. The screenshots: `popgen2-download-kept-none`,
   `popgen2-download-no-variant` (before the write),
   `popgen2-download-no-variant-after`, `popgen2-download-written` (the
   store's `done`, with Save it), light and dark, 1280 and 320 pixels.

Tasks:

- [ ] 7.1 The sentences, the store's `done` and `noVariant` on the page,
  the status region, the gate of a run before the dialog (the screen
  spec, "The button", "The dialog" first paragraph, "When the write
  ends" the paragraph of a download that throws, "The text stays until a
  filter or the file changes", "When the filters keep no variant").
  Deliverables 1 and 2.
- [ ] 7.2 The screenshots. Deliverable 3.

What could go wrong: the drop and the paste while the dialog is open.
The screen spec expects the modal dialog to keep them out ("The
states", the last paragraph, "to be confirmed in the flows"). If a
browser lets a drop through, the page refuses an opening while the
dialog is open; a file of other filters than the page shows would
otherwise reach the user.

## Work package 8: the largest file, and what a write leaves in the tab

What it decides, on the built site, in Chromium and then WebKit, alone
on the machine: whether a size of file closes the tab or fails, which
would be a stop (above, "The stops"); whether WebKit copies the bytes of
a `Blob` made of `Blob`s, in which case the runner keeps the parts as a
list and makes the `Blob` once of them (`runner.md`, "The written file",
step 2); whether the restart of the worker after a file above
`WRITE_RESTART_BYTES` gives anything back, and is dropped if it does
not; and the value of the parts.

How the files are made. The VCFs are written by `writeBigVcf` of
`e2e/bigVcf.ts`, as `VS5 D5` made them on 27 September 2026: 1,000
diploid individuals, variants 1,000 bp apart, 3 genotypes in 100
missing, gzipped at level 1, about 640 bytes per variant. The file
written is a `.nei` file, the larger format, with the first project of
`popgen2.html`, the FILTER box on and the missing rate of the variants at
0.1, which keeps every variant of these VCFs. At the 1,101 bytes per
variant the old page wrote, the sizes are:

| file written | variants | the VCF read |
|---|---|---|
| about 2 GB | 1,820,000 | about 1.2 GB |
| about 4 GB | 3,640,000 | about 2.3 GB |
| about 8 GB | 7,270,000 | about 4.6 GB |

Each VCF is made once, in a test of its own, outside the repository in
the session's scratchpad directory, used by both engines, and deleted
after its size; the one of 2 GB is kept for the owner's try in Firefox
(work package 10). The series is on one size at a time, from the
smallest, and stops before a size when the free disk would fall below
100 GB counting the VCF, the file saved and Chromium's copy of the
`Blob` on the disk, or when the summed footprint of the engine's
processes passes 32 GB, half the memory of the Mac, which the test
watches and ends by closing the page; or after a size that failed,
which is tried once more in a new page. A size of 4 or 8 GB that fails
or closes the tab is recorded with its outcome and is not a stop: only
a failure under 2 GB is (above, "The stops"); the report gives it. Each
size in each engine is one command in the foreground.

Deliverables:

1. Under `DL8 D1` in `e2e/measure.spec.ts`: for each size and engine,
   the outcome (saved whole, the words of a failure, or the tab closed),
   the bytes of the file saved against the size of the `Blob`, the time
   from Download to the download event, the peak of the engine's
   processes summed above the tab before, and what they hold 3 s after;
   the file read back whole as `VS5 D5` reads it.
2. Under `DL8 D2`, the copy of a `Blob` made of `Blob`s: at the 2 GB
   file, the peak of the engine's processes summed during the write less
   what they held before Download, in each engine. Above 1.5 times the
   file in an engine, the bytes are taken as copied: task 8.2 makes
   the runner keep the parts as a list and make the `Blob` once, its
   tests first, and the size is measured again.
3. Under `DL8 D3`, what a write leaves: the page's process 3 s after a
   write of the `.nei` file of 19,161,178 bytes, under the bound of the
   restart, and before and after the restart of a write of 220 MB, in
   each engine. When the restart gives back less than 50 MB in both
   engines, task 8.3 drops the restart after a file above the bound,
   keeping the restart after a refusal of popnei: `client.md` and
   `writeVariants.md` first, then `src/worker/client.ts` and its tests;
   the old page's flows of the write pass.
4. Under `DL8 D4`, the value of the parts: the 2 GB write in each engine
   with parts of 16, 64 and 256 MiB, from builds with
   `WRITE_PART_BYTES` changed and not committed; the value kept is the
   smallest whose time is within 2% of the best, and 64 MiB unless that
   rule picks another.
5. The results in `writeVariants.md`, "What was measured", as a section
   of 8 October 2026 with the engines' versions, the machine and the
   build, and in "What was done".

Tasks:

- [ ] 8.1 The measurements of deliverables 1 to 4, in that order, run
  one at a time. Deliverables 1 to 5.
- [ ] 8.2 Only if deliverable 2 says so: the parts as a list. Its own
  commit, with the runner's tests of work package 2 passing.
- [ ] 8.3 Only if deliverable 3 says so: the restart dropped.

## Work package 9: the end

- [ ] 9.1 The session's own look: it reads every screenshot of work
  packages 6 and 7 with `Read`, state by state, in both themes and both
  widths, and the old page's screens of the write, and checks that each
  state of the screen spec's table "The states" is there and readable;
  what it finds is a fix sent to a subagent, test first, before 9.2.
- [ ] 9.2 The checks of the `coding` skill on the last commit, and the
  browser check of the whole suite in Chromium and WebKit, in chunks of
  spec files that each end within a foreground command: the old page's
  flows of the write and the shell; the old page's steps of the
  variants and of the individuals; its analyses; and `popgen2*`,
  `fileStats`, `openVariants` with the rest, split again if a chunk
  passes 9 minutes. The counts of each chunk, and the screens run,
  recorded below; a flaky test is run again three times and named.
- [ ] 9.3 The documents: `docs/architecture.md`, sections 5, 6 and 7, as
  the design's "What changes in `docs/architecture.md`" lists for the
  download (the VCF beside the `.nei` file, the pieces gathered in parts
  of 16 MiB, a file of F bytes held as about F, no estimate, warning or
  refusal on `popgen2.html`, the modal dialog that lets no filter change
  while a file is written), with its paragraph "What was revised"; until
  then the specs and the design hold where section 6 still describes the
  whole file; `docs/functionality.md` checked against what was built;
  each spec of this plan says it is built on the branch `download`, with
  what a round changed; "What was done" complete.
- [ ] 9.4 The report to the owner, as the `building` skill says, with the
  stops met first, if any; the three measurements and what each decided;
  what the review found and fixed and what it did not take; the browsers
  the screens were seen in, Chromium in the screenshots and Chromium and
  WebKit in the flows, and those not seen, Safari, Firefox and Chrome;
  and how to try the page: `npm run dev -- --force` in the worktree,
  since popnei is unchanged but a server they left running may hold an
  old build, `popgen2.html`, and the files `e2e/fixtures/low_qual.vcf.gz`,
  `panel.vcf.gz` and `panel.nei`, with the states worth going through.

## Work package 10: the owner tries the page

- [ ] 10.1 The owner tries the page, on 9 October 2026 or later, and
  answers: whether the screen is accepted; the choices the screen spec
  lists under "Choices made by the session"; whether Safari and Firefox
  download the file by themselves, the first and the second download of
  a session, and whether either asks every time; what VoiceOver says, in
  Safari, of the items of the screen spec's "Not yet heard in VoiceOver";
  and, if they wish, a write of the 2 GB file in Firefox with
  `about:memory`, from the VCF work package 8 kept, whose path the
  report gives.
- [ ] 10.2 The rounds. Two are expected. Each change the owner asks for
  goes into the screen spec first, then into the code, with its commit
  and its screenshots taken again; a change that reaches `src/core/`, the
  worker or `docs/functionality.md` is said to the owner as such and
  becomes a task of its own. A browser that asks every time or blocks the
  automatic download makes a round that builds the Save click for every
  browser (decision 12). After a round that changed the markup, the
  `accessibility`, `react` and `ux` reviewers run again.
- [ ] 10.3 The owner accepts the screen, and the screen spec says what
  the screen now is. The branch is merged into `main` when the owner
  says so.

## The categories of each review

The `code-review` skill's four that always run, `spec`, `tests`,
`stale` and `errors`, for every work package that changes code, with:

- 1, 5 and 8, measurements: `spec` and `tests` alone, on the test code;
  8 with `api` and `browser` when 8.2 or 8.3 changes the worker;
- 2: `api`, `architecture`, `browser` (`FileReaderSync`, a `Blob` of
  parts);
- 3: `api`;
- 4: `api`, `architecture`;
- 6 and 7: `api`, `architecture`, `react`, `accessibility`, `ux`,
  `browser`, with their screenshots; 6 with `bundle` too, since the
  dialog and its widgets join the code of `popgen2.html`.

## What was done

### Work packages 1, 2 and 3, 8 October 2026

Run side by side, each by its own subagent.

**1, the trial of the automatic download** (dbaf1c6, `DL1 D1` in
`e2e/measure.spec.ts`; Apple M5 Pro, 64 GB, Playwright 1.63.0). Every
download came, within 1 to 4 ms of the code's click, with its name and
its 1,048,576 bytes, in Chromium 153.0.8010.12 headless and headed and
in WebKit 26.6: at once, 10 s and 70 s after the click, the first and
second downloads after a second click, and two downloads with no click
between. The user's activation had ended from 10 s on. Decision, by the
plan's rule: the automatic download, no Save click. Safari, Firefox and
Chrome's question for several downloads are the owner's, in work
package 10.

**2, the worker writes a VCF and the file by pieces** (eacf06c,
85bd24e). `WriteJob` and `Written` take `"nei" | "vcf"`,
`PROTOCOL_VERSION` 15; the runner gives `onBytes` to `writeVars` or to
`writeVcf` with `bgzip: true`, gathers the pieces into parts of 64 MiB
and one `Blob`, and reads its last byte with `FileReaderSync` before it
answers. Each `Blob` holds the same bytes as popnei's whole file. The
old page's flows of the write, run by the session at dbaf1c6: 288
passed, 144 in Chromium and 144 in WebKit.

**3, the core functions** (a816b4f, d73e546, aa6d8fc). `writtenName(p,
format)`, a VCF always `.filtered.vcf.gz`; `keptNoneReason` with a step
of `null`, "Loosen them."; `noVariantForCertain` with
`variantsNoneKept`, tested against popnei's filters at every edge in
steps of 0.001 on `panel.vcf.gz` (the MAF keeps none up to 0.499, the
observed heterozygosity none up to 0.026, the missing rate 2 at 0); the
fixture `e2e/fixtures/variants_summary.json`.

**Review of 2 and 3**, four categories (spec, architecture, tests,
errors), no defect in the code. Taken, in 0866d48: what `onBytes`
throws tested to stay a defect of ours (no test failed without the
wrapper); the refusal after pieces checked with popnei's message;
`noVariantForCertain` given only the finished result of the one pass,
written into its comment and the specs, since a result so far or that
of a Stop could make it say "nothing to download" for a file with
variants (work package 6 tests that a result so far and a stopped one
give no sentence); the runner spec's opening names the VCF. Not taken:
the surviving mutant that drops `bgzip: true`, popnei's default; the
grouping of pieces into parts, which no spec fixes. Left to work
package 8: whether `FileReaderSync` throws on a `Blob` a browser could
not keep. Vitest 4,390.

### Work package 4, 8 October 2026

1b98830 (the store holds `writeFormat`; `startWrite(format)`; the key
and every state with a key carry the format), 9c8de23 (`saved` keeps the
file, for "Save it again", until the write's key changes), f794faa (the
store of `popgen2.html` writes, from the one pass once finished). Vitest
4,401; the flows of `popgen2.html` 146 in Chromium and WebKit; the old
page's flows of the write 288; the old page's 40 screens of the write
the same bytes before and after.

Review, four categories (spec, architecture, tests, errors). Taken, in
23a13fc: a write of the other format that was being stopped and
answered `done` after its cancel marked the current write `dropped`
with no change of filters (no screen reads it yet); now only a file of
the current format does; the place of the format check tested by the
state it leaves; the file forgotten on a change of format tested; the
expected filters and words of `popgen2Store.test.ts` written as
literals; seven passages of the specs, the architecture (section 6) and
a comment that said the saved file is let go, now kept until the key
changes, and the design's list for section 6; two sentences of
`store.md`. Not taken: two surviving mutants, one close to unreachable,
one covered by the key that holds the format. Found by the session
after the literals: the store of `popgen2.html` gives the words of no
individual kept with "Loosen them in the Variants step.", where the
screen spec has "Loosen them."; left to work package 6, which shows
them. Vitest 4,402.

### Work package 5, 8 October 2026

66be52f, `DL5 D1` in `e2e/measure.spec.ts`: ten writes of the VCF of
200,000 variants to a `.nei` file of 220.2 MB on `popgen.html`, five
with the bar's progress (32 messages each) and five with the messages
dropped, alternating, on an Apple M5 Pro, 64 GB, load 3.2 to 4.3.
Medians with and without: Chromium 153 3,083 and 3,088 ms (spread
without 63 ms); WebKit 26.6 3,035 and 2,986 ms (spread without 143 ms).
Both differences within the allowance, so the dialog's bar shows
popnei's share of the write, as the screen spec has it.

### Work package 6, 9 October 2026

98da5cb (the store of `popgen2.html` gives the words of no individual
kept without a step, "Loosen them."; the store's setting
`keptNoneStep`), a48b009 (`Dialog.tsx` can be kept open on Escape),
cade009 (the words), 95c8f0b (the button, the dialog, the write with
its bar and Stop, the file downloaded by itself, the text after it with
"Save it again"; a write's crash or defect to the error bar), d0f07f6
(`e2e/popgen2Download.spec.ts`; a write held or crashed), 3fd68e6 (the
screens), 1f7b408 (two flows of the statistics count the new button).
Vitest 4,428; the flows of the download 14 in Chromium and WebKit, the
files' bytes those of the spec (75,577, 113,594, 41,972, 261,570), each
opened again by popnei in node; the old page's flows of the write 288;
the other flows of `popgen2.html` 188; screens of popgen2 164. Seen by
the session: the dialog (light), the write at 21% (dark), the text
after the download at 320 px (light), "low_qual.filtered.vcf.gz
downloaded, 42 KB: 772 variants of 111 individuals" with the counts of
each filter.

Review, seven categories (react, api, architecture, accessibility, ux,
browser, bundle), no defect a user meets with a mouse. Taken, with work
package 7: a screen reader heard only "Stop, button" once the write
started, so the page says "Writing <file>." once; the words of no
individual kept shown from the store's reason, not worked out again in
the screen; the first load of `popgen2.html` 13.4 KB gzipped larger
(200.37 to 213.73 KB, React Aria's dialog and radio group most of it)
recorded in `docs/technology.md`, with loading the dialog on its first
press left to the owner. Not taken: no ring on the text after a click
of the mouse, which `:focus-visible` gives the keyboard alone, as
everywhere on the page. Firefox not run (it does not start here).

### Work package 7, and the review of 6 and 7, 9 October 2026

The fixes of package 6's review: 361b9a3 (the words of no individual
kept are the store's reason), 1ce5e71 ("Writing <file>." said once as a
write starts), 24509fa (the first load of `popgen2.html` 13.39 KB
gzipped larger, 200.37 to 213.76 KB, recorded in `docs/technology.md`;
loading the dialog on its first press, about 34 KB less in the first
load, left to the owner). Work package 7: 097f56c (the sentence of no
variant said once on a change of the filters; the gate before the
dialog), 687811f (the screens of no individual kept, of no variant
before and after a write, and of a file written and not handed over).
Seen by the session: no individual kept (dark), no variant after a write
(light), each with the spec's words.

Review of 7 and the fixes, six categories (react, api, architecture,
tests, accessibility, ux, browser). Taken: a write shorter than 100 ms
left "Writing <file>." to be said after the words of the download, as
if a second write began (56594a4, the start's words dropped when the
write ends); a click of the mouse within the quiet second after a
threshold's change took the button away under the pointer and left the
focus on nothing, so the focus now goes to what takes its place, and
the gate before the dialog, which a blur makes useless, is kept as a
defence with a unit test that reaches it (1ac75c6); the sentence of no
variant said again on a change that left it on the screen (2a9ca70);
two lines no test guarded (bf403b8). Not taken: a bare "0" said in the
status region when a threshold goes back to removing some, which the
spec of the filters asks for and `main` has; a sentence that takes the
button's place under the focus may be heard twice, once from the status
region and once from the focus, left to the owner's VoiceOver. Vitest
4,444; the flows of the download 32, the other flows of `popgen2.html`
178, the old page's write 130, in Chromium and WebKit; screens 180.

### Work package 8, 9 October 2026

80c66fc (the measurements `DL8`), c7c5731 (Chromium with a profile of
its own; the `.nei` file of 19,161,818 bytes with popnei 0.2.2),
a1ce4e2 (parts of 16 MiB; "What was measured" of 9 October in
`writeVariants.md`; `runner.md`). The `.nei` files written, with what
the engine's processes held above the page before Download:

| file (bytes) | Chromium, Playwright's own context | Chromium, a profile of its own | WebKit |
|---|---|---|---|
| 2,004,062,114 | saved, 27.3 s, peak 2.15 GB | not run | saved, 27.1 s, peak 2.17 GB |
| 4,008,131,338 | failed twice, 57 s | saved, 55.6 s, peak 2.21 GB | saved, 54.5 s, peak 4.16 GB |
| 8,005,214,850 | failed twice, 111 s | saved, 109 s, peak 2.26 GB | saved, 109 s, peak 8.20 GB, footer broken |

No size under 2 GB failed, so no stop. The saved bytes are the `Blob`'s
in every case saved; no tab closed. Playwright's context is like a
private window, where Chromium refused the files of 4 and 8 GB with the
page's words of a write that stopped; an ordinary window saved them.

- D2: the peak at 2 GB was 1.07 times the file in Chromium and 1.08 in
  WebKit, under 1.5: no copy of the parts; task 8.2 not needed.
- D3: the restart gives back about 120 MB in Chromium and under 45 MB
  in WebKit; both under 50 MB is the rule, so the restart stays; task
  8.3 not needed.
- D4: median times at 2 GB with parts of 16, 64 and 256 MiB, Chromium
  27,915, 27,855 and 28,339 ms, WebKit 27,274, 27,111 and 27,385 ms;
  the smallest within 2% of the best is 16 MiB, now the value.

Found: the `.nei` file of 8 GB saved by WebKit holds its 7,270,000
variants when read as a stream, but pyarrow fails by its footer at
batch 782 of 1,454, the first that starts past 4 GiB. Suspected cause
in popnei's writer of the vars file under wasm32; the session has it
reproduced under node before an issue of popnei is drafted. A VCF has
no footer. The VCF of 2 GB for the owner's try in Firefox is in the
session's scratchpad, `big/dl8_1820000.vcf.gz`, 1,161,482,233 bytes.
