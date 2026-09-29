# Report: the Individuals step and the PCA

The work report of the plan `docs/plans/individuals-pca.md`, stage 4 of
`docs/build-order.md`, carried out from 28 September 2026 on the branch
`plan/individuals-pca`, which is not merged and not pushed.

## Where the plan stands

Done, on 29 September 2026, on the branch `plan/individuals-pca`, and
merged into `main` by the owner's order of the same day. The owner took
every recommendation of stops A, B and C and of "For the owner, later",
and ordered the merge and the push, without trying the screens by hand
first; the three stops are accepted by that order. The recommendations
were built before the merge, in four rounds, below, "The owner's
decisions of 29 September 2026". Work package 9, the xlsx, ran, since
xlsx_rs published its first release while work package 8 was reviewed.

What exists now that did not at the start: the individuals filtered
before the variants; the LD filter with no default distance, and every
filter keeping its values while off; the Individuals step with the
metadata file optional, the types of its columns set by the user, and a
metadata file read from an xlsx; the PCA and the PCoA with their own
filters, drawn in 3D with three.js or in 2D, with their table and its
CSV. The map of the cases, `docs/plans/individuals-pca.cases.md`,
reaches 978 of the 1,015 items of the specs of stage 4 with a test.

Not seen: Firefox, which runs the flows for the first time on GitHub
when `main` is pushed, and which engines give WebGL on GitHub's runners;
Safari itself, whose engine WebKit the flows ran headless; a screen
reader. Left open, with the owner: the points of the open-points file
that have no recommendation (the legend over the plot, the gap under
each filter that is on, the pressed button with two components, the
faint faded points, the small controls of the Variants step, the order
of the restart after a crash), and the new point at the end of "The
owner's decisions of 29 September 2026".

### Words the report uses

- **The open-points file** is `docs/specs/stage-4-open-points.md`, where
  every decision you took on stage 4 is written with the option not
  taken; "entry A" and "point 10" are its parts.
- **A tag** such as `IP5 D2` starts the name of a test: `IP` for this
  plan, the number of the work package, and `D` with the number of its
  deliverable; a count of tests of a tag is what checks that deliverable.
- **The orchestrator** is the session that ran the plan and wrote this
  report; **a writer** or **a fixer** is a session it sent to write a
  task's code or its fixes; **a reviewer** is a session that reads or
  runs the code afresh, one for each kind of problem: `spec` (does the
  code do what the spec says), `stale` (can an old result show as
  current), `tests` (breaks the code on purpose to see whether a test
  fails), `errors` (what the user reads when something fails), `api` and
  `architecture` (the shapes and layers of the code), `react` (the
  screens' code), `accessibility` (keyboard and screen reader), `ux`
  (what a user sees), `browser` and `bundle` (the engines, and the size
  of the files downloaded).
- **The calculation worker** runs popnei in a thread of its own so the
  page keeps answering; **the light worker** reads the metadata file,
  and the xlsx, in another. The **protocol** is the list of the messages
  between the page and the calculation worker, with its version.
- **The probe** is the test page of stage 1 that checks popnei's wasm in
  each browser; its 40 tests run in every browser check.
- **React Aria** is the library of accessible controls the screens are
  built with; **StrictMode** is React's mode of development, where it
  runs each effect twice to show defects; **jsdom** is the imitation of
  a browser, with no layout, that the unit tests run in.
- A name in backquotes, `columnAllows`, is a name of the code or of a
  spec; the report says what it does where it matters.

## Before the first task

The branch `plan/individuals-pca` was made from `main` at 7e7eb04,
called the start below, in the worktree
`.claude/worktrees/individuals-pca`. On the start, on 28 September 2026,
on this Mac, after `npm ci`:

- `grep -rlzE "not yet[[:space:]]+(reviewed nor[[:space:]]+)?approved"
  docs/specs` prints nothing; `git ls-tree -r --name-only main
  docs/plans/individuals-pca.md` prints the path.
- node v26.8.2, npm 11.19.1.
- `npm pkg get dependencies.popnei` prints the URL of `js-v0.1.0-dev.2`;
  `gh release view js-v0.1.0-dev.3 -R JoseBlanca/popnei` shows the
  release, published 2026-09-28T06:56:17Z, with the asset
  `popnei-0.1.0.tgz`.
- `gh release view js-v0.1.0-dev.1 -R JoseBlanca/xlsx_rs` answers
  "release not found". Only work package 9 needs it; it is asked again
  when work package 8 ends.
- `format:check`, `typecheck` and `lint` exit 0; `npm test` gives "Test
  Files 63 passed (63)", "Tests 2107 passed (2107)".
- `POPNEI_TEST_PAGES=1 npm run build` exits 0: `popgen-*.js` 648.04 kB,
  191.81 kB gzipped; popnei's wasm 2,164.96 kB, 710.62 kB gzipped, as
  Vite counts them.
- `npx playwright test --project=chromium --project=webkit` gives "618
  passed (1.7m)".

## 1. popnei js-v0.1.0-dev.3

Done as planned, in the commits 64dcd20, d07a5c0, e7b6aa5 and 00a7a90.
Nothing a user sees changed but the size of a written file.

### The deliverables, on 00a7a90

1. `npm pkg get dependencies.popnei` prints
   `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.3/popnei-0.1.0.tgz`;
   `git diff 03cad62 -- package-lock.json` changes popnei's entry alone,
   its `resolved` and `integrity`, in d07a5c0 with `package.json`.
2. `npx vitest run src/worker/runner.test.ts -t "IP1 D1"`: "Tests 5
   passed | 101 skipped (106)". With dev.2 installed the same five fail,
   each on its size, and nothing else of the 2,107 fails (the tests
   reviewer).
3. The browser check with `-g "IP1 D2"`: "4 passed (2.9s)". With dev.2
   built, the four fail on 250,994 and 170,042 bytes (the tests
   reviewer).
4. `npm test`: "Tests 2107 passed (2107)"; the browser check: "618
   passed (1.7m)". `git diff 03cad62 --stat -- 'src/**/*.test.ts'
   'e2e/**'` changes four files; besides the sizes, the lines changed
   are the tags `IP1 D1` and `IP1 D2`, which deliverables 2 and 3 ask
   for, and comments that name the release, from `runner.md`, "The
   written file". No options key of the runner is refused by the new
   release: the spec and errors reviewers each compared every options
   object of `src/worker/runner.ts` with the lists of popnei's package.
5. `POPNEI_TEST_PAGES=1 npm run build`: popnei's wasm 2,389.51 kB,
   785.16 kB gzipped, beside 710.62 kB on the start (by `gzip`, 774,080
   bytes beside 701,996); `popgen-*.js` 191.81 kB gzipped, unchanged.
   Written into section 11 of `docs/architecture.md`.

### What was changed in the plan

Task 1.1 asked for the release in one commit and the tests after it;
the sizes the tests read went into the commit of the release, d07a5c0,
so that every commit passes its checks, and the tags came after.

### The review

`spec`, `tests`, `stale`, `errors` and `bundle`. What mattered:

- A sentence of `runner.md`, "In the browser", gave only dev.2's size of
  the file saved at 0.05, and the header of `runner.test.ts` named
  dev.2; both corrected.
- A plain `Error` from popnei is answered as a refusal of the user's
  input. Since dev.3 popnei throws one for an options key it does not
  know, which can only be a defect of the application, and the user
  would read "Change the settings" for it. No call sends such a key
  today: `runner.md` asks each options object to be written with its
  keys in the call, where the type check catches a wrong one. How to
  class it is a question for the owner, below.
- Not taken: the table of `docs/technology.md`, section 2, that gives
  0.71 MB for dev.2's wasm, since it compares the releases as they were
  measured then.

### For the owner

- Should the application show as its own defect, with the words of a
  defect, a refusal of popnei that names an option it does not know?
  Recommended yes: it costs a line in `runner.md`, "The answers", and a
  test, and nothing changes today.
- Seen by the tests reviewer, outside the plan: `npm install --no-save`
  of the `.tgz` of dev.3 over an installed dev.2, both called 0.1.0,
  did not replace the package, and the build kept the old wasm; `npm
  ci` did. CLAUDE.md gives that command for a local popnei, so a session
  could test against the old popnei without knowing it.

### How the work of 1 went, for whoever revises a skill or a plan

One subagent did both tasks, 121,268 tokens; the review, three
reviewers, 225,110 tokens, about twice the work. The tests reviewer
installed each release in turn to see the tests fail, which is what
made its "no findings" worth having.

## 2. The individuals first

The worker, core, the store and the Variants step now filter the
individuals before the variants, in the commits 96287d6, 9628a60,
a98196a, ddbf8a3, b1c4305 and f45ca69.

### The deliverables, on f45ca69

1. `npx vitest run src/worker -t "IP2 D1"`: "Tests 25 passed" (at least
   14 asked); `grep -c "PROTOCOL_VERSION = 3" src/worker/messages.ts`: 1.
2. `npx vitest run src/core -t "IP2 D2"`: "Tests 33 passed" (at least 14
   asked). One test of the list is not written: the check numbers of the
   three checks of a stage-3 project file compared "only where their
   result is stage 3's", which the code cannot tell (below, for the
   owner).
3. The browser check with `-g "IP2 D3"`: "58 passed (33.0s)", 29 in each
   engine (at least 12 asked).
4. The screenshots, light and dark, in `screens/`:
   `popgen-variants-order-ready-*`, `popgen-variants-order-thresholds-*`,
   `popgen-variants-order-list-locked-*` and
   `popgen-variants-order-list-locked-variants-*`; the orchestrator
   looked at the thresholds in light and the list locked in dark.
5. `npm test`: "Tests 2138 passed (2138)"; the browser check: "634
   passed (2.8m)"; `grep -rnE "\b(125|119) (of|individuals)" e2e src
   --include='*.ts'` prints nothing.

### What was changed in the plan

Each task of 2.1 to 2.3 changed more than its own layer, so that its
commit passed every check: 2.1 made core send the jobs of protocol 3 and
gave the statistics no counts in `countsOf` (task 2.3's), and moved the
flows of stage 3 to the new numbers without their tags (task 2.4's);
2.2 took out the store's refusal of counts that read the filters of
individuals (2.3's). The later task wrote the tests of each.

### The review

Ten reviewers: `spec`, `tests`, `stale`, `errors`, `api` with
`architecture`, `react`, `accessibility`, `ux`, and a keyboard drive of
the step in Chromium and WebKit. The tests reviewer broke the code in 30
ways on a copy and each broke at least one test; the numbers 116, 111,
1,117, 0.0283, 0.3654 and 0.7173 were recomputed with popnei's Python.
What was found and fixed, in the commits ff832b5 to 7310abe:

- After an Undo to a file whose statistics the cache had dropped, the
  histograms of the variants gave way to the error bar, "The application
  met an error of its own", until the user left the step. Five reviewers
  found it; two reproduced it in Chromium and WebKit with a small cache.
  The store's spec names that state, so the block now draws the caption
  without the number of individuals.
- A keyboard user who pressed Count while the thresholds kept nobody was
  sent to the top of the page once the statistics came. The focus now
  stays on the part of the Count; a sentence of `steps/variants.md`,
  "Accessibility", says so (464dc7e).
- When the statistics a Count or the histograms waited for failed, the
  step said the histograms or the counts had failed. They now say "The
  statistics of each individual, which the thresholds of the individuals
  need, could not be calculated, so the histograms of the variants were
  not calculated." (or "so the variants were not counted"), then the
  words of the statistics; the specs gave only "'the diversity' replaced
  by", which made "the histograms of the variants was not run", and now
  give these words (3b9a459).
- Which command removed the histograms was found by comparing its
  English words with a copy of them; now named once.
- Four new states had no screenshot; added, light and dark.
- `runner.md`, `variantChecks.md`, `store.md` and six comments still
  described the old order; corrected with no rule changed (bbea80b,
  60f8951).
- "Over the 1 variant … and the one individual" now "the one variant".

Not taken: the words "Histograms of the variants was not run." of the
status region, which `shell.md` gives as the title and " was not run.";
for the owner, below.

After the fixes, on 7310abe: `npm test` "Tests 2146 passed (2146)"; the
browser check "640 passed (2.3m)"; `-g "IP2 D3"` "64 passed (28.8s)";
`npm run screens` 258 passed (the writer's run).

After this section was written, the fix of the focus of the Count had
two more rounds, both from reviewers of `react` and `accessibility`
run again, and both about focus alone:

- Coming out of the locked state, by a Redo, the focus fell to the top
  of the page, and the part that took the focus was read by a screen
  reader as the button's words without saying it was unavailable. The
  focus now goes to the reason alone, with hidden words before it,
  "Count the variants each filter keeps is unavailable: ", and back to
  the Count when it unlocks (2b1b034, 8b73a04, 8f62b9f, 4e13b2b).
- An Undo after a Count sent the focus to the top of the page, since
  stage 3; now the focus goes to what the step shows next.
- Under `npm run dev`, where React runs each effect twice, the fix of
  the focus moved it a second time: after the Count locked and the user
  typed a threshold, Enter ran a Count the user had not asked for. The
  built site never did this. It is fixed; its flows were run against
  the development server by hand, and no check runs them there (below).

## 3. The switches of the Variants step

The LD filter of the Variants step has no default distance, and every
switch keeps its values while off, in the commits 63f6016, 2e121ce,
295e982 and 6778949.

### The deliverables, on 6778949

1. `npx vitest run src/core -t "IP3 D1"`: "Tests 39 passed" (at least
   20 asked).
2. `npx vitest run src/core/projectFile.test.ts -t "IP3 D2"`: "Tests 11
   passed" (at least 3).
3. The browser check with `-g "IP3 D3"`: "14 passed (11.7s)", 7 in each
   engine (at least 12); `npx vitest run src/ui/shell -t "IP3 D3"`: 4
   passed, the stepper and the summary line.
4. `grep -rn LD_DIST_TURNED_ON src` prints nothing; `npx vitest run
   src/ui/steps/variants -t "IP3 D4"`: 2 passed.
5. The screenshots, light and dark: `popgen-variants-ld-no-distance-*`,
   `popgen-variants-ld-counted-*`, `popgen-variants-filter-kept-off-*`
   and `-kept-on-*`; the orchestrator looked at the first in light.
6. Stop A: waiting for the owner.

`npm test` "Tests 2203 passed (2203)"; the browser check "660 passed
(2.1m)". The writer ran the flows of the switches against `npm run
dev` as well, 47 passed in Chromium.

### What was changed in the specs, for the owner to see at stop A

- `project.md`, "The validation" (2e121ce): two filters of one kind
  both turned off are refused with their own words, and a list of the
  filters off out of its order; the spec did not say.
- `steps/variants.md`, "Accessibility" (464dc7e, 2b1b034, 8f62b9f):
  where the focus goes when the Count locks or unlocks with the focus
  on it, and the hidden words before the reason.
- `variantChecks.md` and `filterCounts.md` (3b9a459): the words of the
  statistics a Count or the histograms waited for, which failed.

### The review

Seven reviewers: `spec` with `stale`, `tests`, `errors` with `api`,
`react`, `accessibility` with a drive of the keyboard, and `ux`. Spec
and stale found nothing: undoing and redoing through two counts never
showed a stale one. The fixes took three rounds, each looked at again by
`react` and `accessibility`:

- One click on the LD switch, with a distance typed and not committed,
  only committed the distance: the counts above left and moved the
  switch from under the pointer. The line of each count now keeps its
  place while its filter is on and a variants file is read, empty before
  a Count, so one click or tap turns the switch off at 1280 and 320
  pixels wide (ab57834, 1ba21ef, 5e536db). A first fix that scrolled the
  page failed on a touch screen and on a tall window.
- Pastes into the distance: a valid number pasted after a refused
  character was dropped with no word; a pasted number above 2^53 was
  named rounded; "-5" pasted announced two contradictory lines (69a39dc,
  c47077a, 2518875).
- Under `npm run dev`, a Count moved the focus a second time on a later
  Undo; a test under React's StrictMode now runs in `npm test`
  (7cadc3a).
- The Count's words and the warning of a file of no variant, taken off
  by an Undo with the focus on them, left the focus at the top of the
  page; tests of the order of the stepper's reasons; a number refused
  named as typed; one type of the kinds of threshold (4c61cc3, 04a05af,
  983654a).

Not fixed, for the owner: a refused number's line, added under a field
above a switch when the field loses the focus, still moves the switch
from under the pointer, as it did in stage 3.

After the fixes, on e438862: `npm test` "Tests 2575 passed (2575)"; the
browser check "686 passed (3.1m)"; `-g "IP3 D3"` "24 passed"; `npm run
screens` 268 passed (the fixer's run); the step's flows against `npm run
dev`, 200 passed.

### How the work of 2 and 3 went, for whoever revises a skill or a plan

- The focus of one part, the Count, took five rounds of review, and
  three of its defects appeared only under `npm run dev`, where React
  runs each effect twice. The checks run against the built site, so
  `testing.md` should ask for a test under `<StrictMode>` in jsdom for
  any effect that moves the focus.
- Each task of 2.1 to 2.3 had to change the layers of the next task to
  keep its commit green; a plan that changes an order across layers is
  better cut by what each commit keeps working than by layer.
- A reviewer that reached a preview server started by another found its
  own results on someone else's build; reviewers now each get a
  directory and a port of their own.

## Stop A: the Variants step, for the owner

### How to try it

In a terminal, in `.claude/worktrees/individuals-pca`: `npm run dev`,
then open the address it prints, followed by `popgen.html`. Load
`e2e/fixtures/panel.nei` of the worktree. In Firefox and Safari by hand;
Playwright saw only Chromium and WebKit.

What to judge: the section of the individuals now before that of the
variants; the LD pruning turned on with an empty distance, its reason
and the locked Count and Write; a filter turned off and on again with
its values and its count back; and the choices below.

### The screenshots, in `screens/` of the worktree, light and dark

- `popgen-variants-order-ready-*`: the step before any calculation.
- `popgen-variants-order-thresholds-*`: the thresholds 0.03 and 0.38,
  116 and then 111 individuals kept.
- `popgen-variants-order-list-locked-*`: a list that names someone not
  in the file locks the histograms, the Count and the Write.
- `popgen-variants-ld-no-distance-*`, `popgen-variants-ld-after-count-*`:
  the LD pruning with no distance.
- `popgen-variants-ld-counted-*`: 50000 typed, 1,187 of 1,200 kept.
- `popgen-variants-count-back-*`: a filter off and on, its count back.
- `popgen-variants-histograms-kept-*`, `-count-waits-*`, `-kept-none-*`.

### Decisions, each with the recommendation

1. The LD pruning's reason says "turn off the LD filter", while its
   switch reads "Prune the variants by linkage disequilibrium (LD)" and
   Undo says "the LD pruning". Recommended: say "the LD pruning" on the
   Variants step.
2. That reason, 45 words, stands three times: under the field, beside
   the Count and beside the Write. Recommended: whole under the field, a
   short line beside the buttons, "Locked until the distance of the LD
   pruning is typed, above."
3. An Undo that brings the empty distance back tells a screen reader
   only "Undone: the LD pruning changed". Recommended: add the reason
   after it.
4. Number fields. An empty field ignores the arrow keys, Page Up and
   Down, Home and End, a cleared threshold too; recommended: keep. In a
   field that holds a number, End and Home jump to its limit, as React
   Aria does, so End in the distance makes it 9,007,199,254,740,991 base
   pairs; recommended: End and Home move the caret only.
5. The line of each count keeps its place, empty before a Count, so that
   a click on a switch is not lost when a field above it commits. It
   shows as a small gap under each filter that is on. Judge on the
   screen.
6. The status region says "Histograms of the variants was not run.",
   as `shell.md` gives the sentence. Recommended: "were" for a plural
   title.
7. A project file keeps a few numbers of each result, its check numbers,
   and when the project is opened again and the result calculated anew,
   the application compares them and says whether the result changed.
   Entry A of the open-points file, your decision to filter the
   individuals first, says those of the statistics, the histograms and
   the counts of a project saved by stage 3 are compared "only where
   their result is stage 3's", which the file cannot tell. The code
   compares them always, and says a difference comes from the new version
   of the application. Recommended: correct that sentence of entry A and
   of the three specs.
8. The warning of the variants with no called genotype says "among the
   individuals kept" when the project has a filter of individuals; the
   spec says when the filter removes someone. They differ only for a
   filter that removes nobody, where the sentence is still true.
   Recommended: the spec takes the code's rule.
9. A refusal of popnei that names an option it does not know can only
   be a defect of the application, and the user would read "Change the
   settings". No call sends one. Recommended: show it as a defect.

10. Known and not fixed: a number refused under a field above a switch
    adds its line when the field loses the focus, and moves the switch
    from under the pointer, so that click is lost; it was so in stage 3,
    and the PCA panel has it too. Recommended: leave it unless you meet
    it.

### Changes made to the specs during the work, for you to accept

- `steps/variants.md`, "Accessibility": where the focus goes when the
  Count locks and unlocks, and when its words leave; hidden words before
  the reason, "Count the variants each filter keeps is unavailable: ".
- `variantChecks.md` and `filterCounts.md`: "The statistics of each
  individual, which the thresholds of the individuals need, could not be
  calculated, so the histograms of the variants were not calculated."
- `project.md`, "The validation": the words for two filters of one kind
  both off, and for the lists of filters off out of order.
- `runner.md`, `variantChecks.md`, `store.md`: sentences of the old
  order corrected to the new, with no rule changed.
- `scatter.md`: the legend of an exported plot takes the left edge of
  the frame.

## 4. The project of stage 4, in core

A project with no metadata file, or whose user chose one population,
runs on "All individuals"; the types the user sets on the columns are
kept, wait, come back and can be forgotten; a project saved while its
metadata file was not read asks for it again; the project file holds
all of it. Commits dd53623, 50b6cbd, b6c5e8b and e438862.

### The deliverables, on e438862

1. `npx vitest run src/core -t "IP4 D1"`: "Tests 33 passed" (at least
   16); `grep -n "export function populationsToRun"
   src/core/analyses/diversity.ts` prints nothing.
2. `npx vitest run src/core src/worker/individuals -t "IP4 D2"`: "Tests
   47 passed" (at least 22). The lint rule, tried with `eslint --stdin`
   as a core file: `columnTypes.ts` accepted, `csv.ts` refused; after
   the review, `columnTypes.test.ts` refused too.
3. `npx vitest run src/core -t "IP4 D3"`: "Tests 14 passed" (at least
   6).
4. `npx vitest run src/core/projectFile.test.ts -t "IP4 D4"`: "Tests 6
   passed" (at least 4); the property of stage 4 passes and counts that
   each new field is drawn. The three fixtures, written by hand from the
   spec, matched the writer byte for byte on the first run.
5. `npm test` "Tests 2575 passed (2575)"; the browser check "686
   passed". A project with no metadata file runs the diversity: the row
   "All individuals" reads 200, 0.3755, 0.3543, 0.9792 in Chromium and
   WebKit, as `diversity.md` gives.

### What was changed in the plan

- Added to task 5.1: the lines of the diversity when it is ready on one
  population, which no task named.
- Added to task 6.3: `ldOrderText` with the PCA's LD filter.
- Moved from task 4.2 to task 9.1: the words of a metadata file that is
  not text, which tell the user to name it `.xlsx`.

### The review

`spec` with `stale`, `tests`, and `errors` with `api` and
`architecture`. No stale result: the reviewer ran the real store
through a type set, one population and a file not given. The tests
reviewer broke the code 70 times; 66 failed a test, and two of the
other four were gaps. Fixed, in 00e316f to 9ae123b:

- A refusal of a binary type asked for the two values of a column that
  had three; two refusals listed values the opening then refused.
- The lint rule let core import files of the reader other than
  `columnTypes.ts`.
- No test got the numbers of the one population from popnei itself;
  now the runner's test does, and popnei gives them exactly.
- Tests of the real store for a result given back by a read, of a
  binary type whose two values are the same, and of `columnAllows` kept
  by decimal mark.

After the fixes: `npm test` "Tests 2583 passed (2583)"; the browser
check "698 passed (2.0m)".

### For the owner, not urgent

Specs that contradict each other, where the code follows one of them,
each with the line that would settle it: `diversity.md`, "The key", says
the populations of a new project are none, `project.md` says "all";
`store.md` says the store keeps the key of each result removed, where
it drops it once the result is back; `project.md`, "The validation", has
an example refusal that its own rule no longer gives, and says a read
pending is never accepted where its cases accept one; the example of
`typesSet` in `projectFile.md` is laid out otherwise than its rule of
writing. Recommended: each spec takes what the code does.

Opening a project with a table of 10,000 rows and 50 columns took 127
ms in node, all on the page; task 5.3 measures it in the browsers.

## Stop B: the Individuals step, for the owner

### How to try it

In a terminal, in `.claude/worktrees/individuals-pca`: `npm run dev`,
then open the address it prints, followed by `popgen.html`. Load
`e2e/fixtures/panel.nei`, then in the Individuals step
`e2e/fixtures/panel_pops.csv`, or a metadata file of your own. In
Firefox and Safari by hand; Playwright saw only Chromium and WebKit.

What to judge, from the spec's open points: a project with a metadata
file locked until a column or the one population is chosen; the words
of the types that wait and "Forget these types"; the populations and the
check not shown while the file has no table; a select of the type in
every row; the name "All individuals"; and, if you wish, the section
"How it is checked" of `steps/individuals.md`.

### The screenshots, in `screens/` of the worktree, light and dark

`popgen-individuals-*`: `empty` (no file, the step optional),
`one-population`, `no-column`, `types`, `types-waiting` (a type set that
a new read cannot apply), `missing` (12 individuals of the variants file
not in the metadata file), `no-population`, `no-such-column`,
`not-given`, and `types-320`, `types-waiting-320` at the width of a
phone.

### Decisions, each with the recommendation

1. The words of the coding put the value bare: "no is coded 0." reads
   as "nothing is coded 0", and "binary with no coded 1" as "binary
   without a value coded 1". Recommended: quote the value, `"no" is coded 0.` and
   `binary with "yes" coded 1`.
2. With a font wider than the Mac's, at 320 px, the dot between two
   first values can start a line, "España ·". Avoiding it leaves no
   margin. Recommended: accept.
3. A file of one column still says "Choose the column that defines the
   populations…" though only "All individuals" can be chosen.
   Recommended: accept.
4. Changes made to the specs during the review, to accept: the first
   column, which holds the names of the individuals, one in each row, is
   never the column of the populations, since it would make each
   individual a population of its own, and a grouping on it
   is "not in the file" (`project.md`, `diversity.md`, which said the
   opposite); an Undo or a Redo that removes the control with the focus
   gives the focus to the step's heading (`shell.md`); the name of the
   select of the coding has the value first, as React Aria makes it
   (`steps/individuals.md`). Below 30em the selects of every step are
   drawn smaller, and the warning of a few whole numbers stands in a row
   of its own.

5. An Excel 97-2003 workbook named `.csv` is told to give it a name
   ending in `.xlsx`, and is then refused again as a workbook of Excel
   97-2003. Recommended: "…if it is an Excel workbook, open it in Excel
   and save it as Excel Workbook (.xlsx)", which serves both.
6. An error of Excel in the header is the name of its column: a sheet
   whose first cell Excel saved as `#VALUE!` gives a column named
   "#VALUE!". Recommended: refuse a header cell that is an error of
   Excel, naming its place.
7. When the reader of a file crashes, the user reads "the calculation
   stopped unexpectedly. Choose it again." Recommended: "the reading of
   the file stopped unexpectedly. If it happens again with this file,
   save it again from Excel as .xlsx or as CSV."

8. After a paste into the step that loads nothing, the focus stays on
   the paste button; the spec puts it on the file button. Recommended:
   the spec says the focus stays where it was, on the file button after
   a pick or a drop, on the paste button after a paste.

## Stop C: the PCA panel, for the owner

### How to try it

In a terminal, in `.claude/worktrees/individuals-pca`: `npm run dev`,
then open the address it prints, followed by `popgen.html`. Load
`e2e/fixtures/panel.nei`, then `e2e/fixtures/panel_meta.csv` in the
Individuals step and its column of the populations, and run the
principal components in the Analyses step. In Firefox and Safari by hand.
On the Mac: the zoom of the 3D view with Ctrl held and the wheel, and a
pinch of the trackpad in Safari (point 10 of the open-points file); if
Ctrl held with the wheel does something else there, such as the zoom of
the whole screen of macOS's Accessibility, say whether ⌘ should take its place.

### The screenshots, in `screens/` of the worktree, light and dark

`popgen-pca-ready`, `-running`, `-3d-highlighted`, `-2d`, `-values` (the
colour by altitude), `-table`, `-no-webgl`, `-not-loaded`, `-320`, and
`popgen-pcoa-warning`.

### Decisions, each with the recommendation

1. The legend over the plot (point 14): at 320 px it covers about a third
   of the 3D view. Judge on the screen; the other way is a strip beside
   the plot.
2. In dense clusters the grey outline of the marks covers their colours,
   on the screen and more in an exported file, where a highlighted group
   looks grey. Recommended: an outline only on the three light colours,
   or a thinner one; judge on the screen.
3. Once there is a PCA, the diversity starts about 2,400 px below the
   PCA's heading, and nothing leads to it. Recommended: a short list of
   links to the analyses under the heading of the step.
4. When the statistics of each individual fail after the diversity's
   Run, the PCA's panel says "…so the PCA was not run" though its Run was
   never pressed. Recommended: "…so the PCA cannot run" for an analysis
   whose Run was not pressed.
5. Under the PCoA, the choice "For the PCA alone" still says PCA.
   Recommended: it follows the method.
6. A defect of the application during a PCA is told as the user's
   problem (below 2,264 individuals "load panel.nei again", above it "did
   not fit in the memory of this tab"). Recommended: the words of a defect
   of the application, which also answers decision 9 of stop A.
7. The pruning is at least two thirds of a PCA with the LD filter.
   Recommended: ask popnei, at a low priority, to give back the list of
   the variants its pruning kept, so that the next PCA with the same
   filters reads those alone and skips the pruning.
8. `pca.md` leaves three choices open that the code made: an axis beyond
   the result takes the first component not shown, with a note; the
   description names the individuals of no group last; and in 3D the
   view spans ±1.3 on its shorter side, a tap may move 3 px, the axis
   names sit 4 px from the lines. Recommended: write them into the specs.
9. The note of a column of more than 1,000 values says "the table gives
   each individual's value", but the table then shows "All individuals".
   Recommended: the table gives each individual's value, as the note
   says; the other way is to drop the clause.

10. The order of the Tab key through the panel puts the download of the
    explained variance right after its table, and "Try again" after the
    bar of controls; the spec lists the downloads last. Recommended: the
    spec takes the code, each download beside what it downloads.
11. `pca3d.md` and `scatter.md` say "the screen says why" for a plot with
    no point, with no words for it; popnei's PCA gives no coordinate that
    is not finite. Recommended: the spec says the panel never has such a
    point, and drops the sentence.
12. `pca.md` says a change of the colour, the axes or the view while the
    PCA runs keeps the calculation, but those controls exist only once
    the result is there. Recommended: the sentence says only an Undo or a
    Redo can change them while it runs.
13. With two components, "2D" looks pressed while the option stays 3D;
    the spec says nothing. Judge on the screen.
14. A click on a switch just below a number field is lost when leaving
    the field adds or takes off a line of refusal (decision 10 of stop A);
    the PCA panel has it too.
15. The 3D/2D switch and the legend are announced as radio buttons, and
    their arrow keys move the focus without choosing, as React Aria makes
    them; the spec states it for the legend. Recommended: accept.

## The restart of 29 September 2026

The Mac rebooted during the night of 28 September, while the orchestrator
waited for the last reviewer of work package 5. Nothing committed was
lost: the branch stood at 72c36e6 with a clean tree, and on it
`format:check`, `typecheck`, `lint` and the build pass and `npm test`
gives "Tests 2631 passed (2631)". Lost were the tests reviewer of work
package 5, which never reported and was run again, and the orchestrator's
notes, which were rebuilt from the session's transcript. The box of task
3.3 had been left unticked after its review; it is ticked now.

## 5. The Individuals step

The user picks a metadata file or goes on without one, sets the type of
each column and the value coded 1 of a binary column, chooses a column
of the populations or "All individuals in one population", forgets the
types that wait, and copies the names missing from the file. Commits
36b7d13, 67cc11a, 5a6e5af and aa407ef; the fixes of the review 0ecb53d,
d50a9f7, 9a16957, c21319a, 2c74fbf, ec96fb3 and 5789f37.

### The deliverables, on 794b876

1. `npx vitest run src/ui/shell -t "IP5 D1"`: "Tests 15 passed" (at
   least 14).
2. The browser check with `-g "IP5 D2"`: "48 passed (31.1s)", 24 in each
   engine (at least 24).
3. `-g "IP5 D3"`: "2 passed"; the row "All individuals" with 200, 0.3755,
   0.3543 and 0.9792.
4. The freeze, below, measured after the fixes.
5. The screenshots, light and dark, 40 files `popgen-individuals-*` in
   `screens/`, the state of a column that gives no population among them;
   the orchestrator looked at `popgen-individuals-types-320-light`.
6. Stop B: waiting for the owner.

`npm test` "Tests 2674 passed (2674)"; the browser check "756 passed
(2.5m)", with the PCA placeholder of task 8.3 in the Analyses step.

### The freeze of a large metadata file (IP5 D4)

`npx playwright test --project=measure-chromium --project=measure-webkit
-g "IP5 D4" --workers=1`, 29 September 2026, on the built site, Apple M5
Pro with 64 GB, macOS 27.0, Playwright 1.63.0; a virtual machine and the
analysis of photos of macOS each held one core. A metadata file of
10,000 rows and 50 columns, 2.64 MB, read after a VCF of 10,000
individuals; the project file that holds its read, 4.36 MB; each 5 times
on a new page, the median.

| what | Chromium 153 | WebKit 26.6 |
|---|---|---|
| `columnAllows` alone | 35 ms | 9 ms |
| the read: the longest time between two frames | 102 ms | 162 ms |
| the opening of the project: the same | 47 ms | 111 ms |
| the step shown after the opening | 53 ms | 99 ms |

Before the fixes of the review, on aa407ef, the read froze the page for
238 ms in Chromium and 351 ms in WebKit, the opening 79 and 201 ms, and
every change of a type 104 to 131 ms (the react reviewer's measure),
since the step walked the whole table at each drawing. `columnAllows`
alone is under the 100 ms of `project.md`, "How it runs", in both
engines, so it stays on the page; the rest of the freeze of a read is
the drawing of the table. A change of a type after the fixes was not
measured. Firefox: not measured, since it does not launch here.

### What was changed in the plan

Task 5.3 was timed first on aa407ef, and the review showed its test
measured the whole freeze and not `columnAllows`, which the rule of the
plan names; the test now gives both, and the table above is from it.

### The review

`spec` with `stale`, `tests`, `errors` with `api`, `react`,
`accessibility` with a drive of the keyboard, and `ux`; then `react`
with `accessibility` again at 2c74fbf, and `accessibility` with `ux` at
5789f37, which found nothing. The tests reviewer was lost with the
reboot and run again. What was fixed:

- On a phone 320 px wide, a column with a long name without spaces,
  `Estado_de_salud_del_individuo`, made the whole page scroll sideways.
  The table now fits with a font wider than the Mac's, which the flow
  serves itself: 282 of 288 px with DejaVu Sans, the longest names of the
  flow.
- An Undo or a Redo that took away the control with the focus left the
  focus nowhere, so a screen reader said nothing; the focus now goes to
  the step's heading, in every step, and the Variants step still places
  it itself where it does.
- Opening a project whose metadata file was not read when it was saved
  did not tell a screen reader to load that file again.
- When the column of the populations became the first column of a new
  file, the analyses ran on 200 populations of one individual while the
  step said no column was chosen; that column is now "not in the file".
- The step walked the whole table at each drawing (the freeze above).
- A click on the visible words "Coded 1, the case" did nothing.
- The tests reviewer broke the code 42 ways; four passed every test,
  and each now fails one: the populations shown while individuals are
  missing, the order of the coding, the table at 320 px in a wider font,
  the measurement's test.

Not taken: the words of the coding, which are the spec's, for the owner
below; a flow of stage 2 that holds a read by the name of a built file
and so fails under `npm run dev`.

### What the owner should know

- `e2e/fixtures/fonts/` holds DejaVu Sans cut to the Latin letters,
  72 KB with its licence, which allows it: the flow at 320 px serves it
  so that it checks a wide font on any machine. It never reaches the
  site.
- A flow of the Variants step, `variants.spec.ts:826`, failed 5 times in
  120 runs in WebKit with the fixes and 1 in 140 before; a race of the
  status region, not on the path of the fixes. Watched.

### How the work of 5 went, for whoever revises a skill or a plan

The fix of the table at 320 px was sent back once: it fitted with 2 px
to spare in the Mac's font, and the site uses the system's font, so a
check at 320 px has to bring a wider font of its own. The review's
reviewers each needed a directory and a port of their own, as work
package 3 found.

## 6. The PCA and the PCoA, in the worker and core

The calculation worker answers a PCA or a PCoA with popnei's numbers, cut
to the first 10 components, and is started again after one of more than
700 individuals; the analysis knows its options, its own filters that
follow the Variants step, its key, its locks, warnings, check numbers and
words. Commits 155ec45, 8b524d8, ee6f21d, c575d2e, c79ff88; the
measurements 8dc278c, e5328f3, fe216ca, 9bf5fa0; the fixes of the review
904f5f3, efdaeb6, df1267e, 0bfe060, 5f2bdc4.

### The deliverables, on 5f2bdc4

1. `npx vitest run src/worker/messages.test.ts -t "IP6 D1"`: "Tests 19
   passed" (at least 11).
2. `npx vitest run src/worker/runner.test.ts -t "IP6 D2"`: "Tests 18
   passed" (at least 10); the tests reviewer ran popnei on `panel.nei`
   and every number of the tests matched to the last digit.
3. `npx vitest run src/worker/client.test.ts -t "IP6 D3"`: "Tests 10
   passed" (at least 5).
4. `npx vitest run src/core/analyses/pca.test.ts src/core -t "IP6 D4"`:
   "Tests 105 passed" (at least 40).
5. `npx vitest run src/core/analyses/pca.test.ts -t "IP6 D5"`: "Tests 23
   passed" (at least 12); a scratch `keyInputs` that leaves out the PCA's
   own LD filter failed 7 of them (the tests reviewer).
6. `npx playwright test --project=measure-chromium
   --project=measure-webkit -g "IP6 D6" --workers=1`: "4 passed (37.8m)"
   on 9bf5fa0, the load 1.4 to 2.9; after the review's new assertions,
   on the sizes of 700 and 1,000 and the pruning alone, "4 passed
   (23.0m)", the load 9 to 17.

`npm test` "Tests 2719 passed (2719)"; the browser check "782 passed
(2.7m)".

### The measurements

29 September 2026, Apple M5 Pro with 64 GB, macOS 27.0, Playwright
1.63.0, the PCA run from the application; the tables are in `pca.md`,
"How it runs", and the architecture's section 11.

| individuals | Chromium 153, PCA / PCoA | WebKit 26.6, PCA / PCoA |
|---|---|---|
| 700 | 0.12 s / 0.14 s | 0.10 s / 0.12 s |
| 1,000 | 0.31 s / 0.36 s | 1.21 s / 1.26 s |
| 2,000 | 2.11 s / 2.50 s | 1.25 s / 1.63 s |
| 4,000 | 16.0 s / 18.9 s | 10.2 s / 12.9 s |
| 9,381 | 205 s, 3.03 GB / 240 s, 3.30 GB | 121 s, 3.12 GB / 156 s, 3.40 GB |

No engine closed the tab; a first run of the WebKit PCoA at 9,381 held
4.10 GB at its peak. A PCA of 700 individuals left 11 to 18 MB in the
worker, and a restart after every one of more than 700 gave all of it
back, so `PCA_RESTART_INDIVIDUALS` stays at 700. The pruning of the PCA's
own LD filter is at least 62 to 68% of a PCA in both engines (1,000
individuals and 20,000 variants: 3.4 s with it, 1.1 to 1.2 s without), a
lower bound, since the PCA with the filter also decomposes fewer
variants. Firefox: not measured.

### The review

`spec` with `stale`, `tests`, and `errors` with `api` and
`architecture`. Spec and stale found nothing: every change of the PCA's
inputs gives a new key, and the warnings ran on popnei's real PCoA give
the spec's numbers. The tests reviewer made 102 changes; 13 passed every
test. Fixed, each test seen to fail first:

- the Python script's lines of the MAF and observed heterozygosity
  filters and of `only_passed`;
- the runner's checks of popnei's answer, tested with popnei mocked,
  since popnei itself always answers in the job's order;
- five refusals of the options of a project file;
- the measurement's time of "the pass" timed the start of the pass, so
  that column and the "at most 17 ms" of `pca.md` are gone; the
  measurement now fails when it measures nothing.

Not fixed, for the owner (below): a defect of the application during a
PCA is shown as the user's problem.

### For the owner

- A defect of the application during a PCA, a result of popnei that does
  not match what was asked, reaches the page as a crash, and the words of
  a crash are chosen by the number of individuals alone: from 2,264 up
  "did not fit in the memory of this tab… Keep fewer individuals", below
  it "load panel.nei again". Recommended: a defect keeps its kind to the
  page and gets the words of a defect of the application. It is the same
  question as decision 9 of stop A, a refusal of popnei naming an option
  it does not know, and one answer serves both.
- Point 1 of the open-points file: the pruning is at least two thirds of
  a PCA with the LD filter. Recommended: ask popnei to keep the pruned
  variants for the next PCA, at a low priority, since it saves about 2 s
  a repeated PCA at 1,000 individuals and 20,000 variants.
- WebKit takes 1.21 s for a PCA of 1,000 individuals, four times
  Chromium, in every run; the cause is not known.

### How the work of 6 went, for whoever revises a skill or a plan

The PCA was measured through the application's panel, with a
placeholder of task 8.3 and a project file for its options, rather than
a page of the measurements. The first measurement passed while one of
its columns measured nothing: a measurement's test needs assertions that
it measured, as any test does, and the tests reviewer is the one that
finds it.

## 7. The 2D scatter

The scatter of the individuals, its marks, colours, tooltip, legend
and export, in the charts layer, with no screen of the application yet.
Commits aecfa8a to bfd77d8, and the fixes of the review up to 2111d9f.

### The deliverables

1. `npm ls d3-shape d3-path d3-scale-chromatic` prints 3.2.0, 3.1.0
   and 3.1.0; `package.json` pins the six packages exactly; the
   lockfile added exactly those six and nothing else.
2. `npx vitest run src/charts -t "IP7 D1"`: "Tests 62 passed" (at least
   20).
3. `-t "IP7 D2"`: "Tests 28 passed" (at least 10).
4. The browser check with `-g "IP7 D3"`: 12 passed on bfd77d8, 18
   after the fixes, half in each engine (at least 10).
5. The times, in `scatter.md`, on an Apple M5 Pro with 64 GB and macOS
   27.0, run alone: from `createScatter` to the next frame, 9,381
   points, 17.0 ms in Chromium 153 and 19.0 ms in WebKit 26.6; an
   update of the highlight 16.7 and 17.0 ms. Measured again after the
   fixes, on 29 September 2026 with the load at 2.9: 16.8 and 18.0 ms,
   the update 16.9 and 18.0 ms (72a0546).

The three d3 packages reach no file of the site yet: the first script
of `popgen.html` grew 0.48 kB gzipped, the base of the 2D plots.

### The review

`spec` with `api`, `tests`, `stale` with `errors` and `architecture`,
and `browser` with `bundle` and `accessibility`. No browser or size
problem. The tests reviewer broke the code 94 ways and 25 real changes
passed every test, most in what jsdom cannot see. Fixed, with the
commits 9f31144 to 2111d9f:

- The tooltip stayed on screen after the pointer left it over the axes;
  ran off the left edge of a narrow plot; and could not be reached in a
  cluster, since another point's tooltip took its place on the way.
- An exported PNG could carry the legend of before a change; with one
  value its legend labelled yellow while every point was teal; its bar
  ran over the axis on a short plot.
- Values near ±10^308 made the plot report a defect of its own code.
- Tests of the layout of the exported legend, of the style of the marks
  in a browser, of infinite coordinates and of Escape.

Changes to `scatter.md` made by the writers, for the owner at stop C:
the legend of an export takes the left edge of the frame; the tooltip
tells an Escape from a leave; it keeps its point while the pointer is
within 10 pixels, and sits 6 pixels from it with its near corner square,
where it sat 7, since browsers find what is under the pointer by whole
pixels.

For the owner at stop C: in dense clusters the grey outline of the
marks covers their colours, so that at 600 by 450 pixels the four
populations of the test page look like grey discs; see the section of
stop C.

## 8. The PCA panel and the 3D view

The user runs the PCA or the PCoA in the Analyses step, with its own
filters that follow the Variants step until set, and sees the individuals
in 3D, turned by dragging or with buttons, or in 2D where the browser
cannot draw 3D; colours them by a column, highlights a population from
the legend, and reads and saves the explained variance and the table.
Commits f8b998a (8.1), cdcc473 and 794b876 (8.3), 8bfe80b and 0e759c7
(8.2), d0b6260 and 22a59fd (8.4), 0e70690 and 6d3fb9a (8.5); the fixes of
the review e01f6fe, 9a000ff, b861e85, 7f2802b, c675d8f, 903bd5b, 6a9dece
and 5db6ac6.

### The deliverables, on 5db6ac6

1. Both headless engines here give WebGL 2: Chromium 153 by SwiftShader,
   points of 1 to 1,023 px; WebKit 26.6 by the Mac's graphics card, 1 to
   511 px; written into `testing.md` and `pca3d.md`. Firefox does not
   launch here; GitHub's runners are seen at the first push of `main`.
2. `npm ls three @types/three`: 0.186.1 and 0.186.0, pinned; the lockfile
   added those two and the six `pca3d.md` names, and nothing else.
3. `npx vitest run src/charts -t "IP8 D1"`: "Tests 24 passed" (at least
   14).
4. The browser check with `-g "IP8 D2"`: "46 passed", 23 in each engine
   (at least 9 each).
5. `npx vitest run src/core src/ui -t "IP8 D3"`: "Tests 31 passed" (at
   least 20).
6. `-g "IP8 D4"`: "12 passed" (at least 8): the numbers of `pca.md` read
   on the screen, 7.61% and 5.56%, then with the PCA's own LD filter
   3.55%, 3.40% and `s000` at −0.7139 and 7.6765, the PCoA's 3.68%,
   3.54%, 7.87%, 0.047, 53%, 0.22 and 198 components.
7. `-g "IP8 D5"`: "6 passed" (at least 4); `grep -c WebGLRenderer` of the
   first script of `popgen.html`: 0; the file of three.js 139,253 bytes
   with gzip -9, beside the 134,245 of `pca3d.md`.
8. `-g "IP8 D6"`: "4 passed" (at least 4); a change of the colour, the
   axes or the view sends no request to the calculation worker.
9. The screenshots, light and dark, 20 files `popgen-pca-*` and
   `popgen-pcoa-*` in `screens/`; the orchestrator looked at
   `popgen-pca-3d-highlighted-light`.
10. Stop C: waiting for the owner.

`npm test` "Tests 2740 passed (2740)"; the browser check "872 passed
(3.4m)"; `npm run screens` "302 passed". The first script of
`popgen.html` is 224,454 bytes with gzip -9, where it was 191.81 KB as
Vite counts it at the start of the plan.

### What was changed in the plan

Task 8.2 built "The export" of `pca3d.md` too, since the handle's `toSVG`
and `toPNG` belong to the plot. The flows of task 8.3 that found the
diversity's Run by its name alone were scoped to its panel, since the
Analyses step now has two.

### The review

`spec` with `stale`, `errors`, `api` and `architecture`; `react` with
`accessibility` and a drive of the keyboard; `ux` with `browser` and
`bundle`; `tests`; then `react` with `accessibility` again after the
fixes. What was fixed:

- A keyboard user who typed the PCA's LD distance and pressed Tab went
  past the PCA's Run, still locked, to the diversity's, and Enter ran the
  diversity. Every number field now commits its value at the Tab key,
  before the focus moves.
- "Try again" after a failed download of the 3D view could never work in
  Chromium, which keeps a failed download for the life of the page; it
  now asks for the file under another address, and draws in both
  engines. Pressed from the keyboard it left the focus nowhere.
- A drawing context handed over already lost made the whole PCA panel
  disappear; it is now the case of no WebGL, with the 2D plot.
- Zoomed in, the names of the axes left the plot, over the controls, and
  at 320 px the page scrolled sideways.
- Escape in a number field did not put back the number typed, so the
  next Tab committed it.
- "The principal components was removed … as it was"; the table's header
  81 px high at 320 px; a column of numbers aligned left; "none" in the
  table where the legend says "No population".
- The tests reviewer broke the code 120 ways and 60 passed every test,
  most in what only a browser shows: a highlight or a colour change that
  left the old picture in the 3D view, the buttons of the view, the
  downloads, the announcements. 57 of them now fail a test; the two left
  are cleanups of `destroy` that nothing on the page shows.

Not taken, for the owner at stop C: a click on a switch just below a
number field is lost when a refusal's line comes or goes (decision 10 of
stop A); the 3D/2D switch and the legend move the focus with the arrow
keys without choosing, as React Aria makes them.

### How the work of 8 went, for whoever revises a skill or a plan

The review ran beside task 8.5, on copies, which saved a round. The
tests reviewer's share of changes that passed every test, half, is the
highest of the plan and comes from the 3D view, which only a browser
shows; a task that builds a view drawn by WebGL should be asked to
compare pictures from its first flow.

## 9. The metadata file read from an xlsx

The user loads the metadata file as an `.xlsx`; the Individuals step
reads its first sheet with the same types, checks and populations as a
CSV. The reader, xlsx_rs's wasm package, is downloaded the first time an
xlsx is read, never for a CSV. xlsx_rs published its first release,
`js-v0.1.0-dev.1`, on 29 September 2026 at 12:02 UTC, while work package
8 was reviewed, so this work package ran. Commits 873725c (the release
in `package.json`; the lockfile added xlsx_rs alone), 915b06e (9.1),
191bb7e (9.2); the fixes of the review 4ad209e, 4b86110, d11fe7f and
be43e05.

### The deliverables, on be43e05

1. `npm pkg get dependencies.xlsx_rs`:
   `https://github.com/JoseBlanca/xlsx_rs/releases/download/js-v0.1.0-dev.1/xlsx_rs-0.1.0.tgz`.
2. `npx vitest run src/worker -t "IP9 D1"`: "Tests 80 passed" (at least
   12).
3. The browser check with `-g "IP9 D2"`: "14 passed", 7 in each engine
   (at least 5 each). After the `.wasm` was answered with an error, both
   engines ask for it again. After the JavaScript was, Chromium keeps the
   failed import for the life of the page and WebKit asks again; the
   retry now asks for the file at another address, so the next xlsx is
   read in both.
4. In the built site, xlsx_rs's `.wasm` is 565,045 bytes, 300,655 with
   gzip -9, and its JavaScript 4,564 and 1,767: 0.30 MB, as `files.md`
   gives.

`npm test` "Tests 2866 passed (2866)"; the browser check "886 passed".
The contract of the release matched our specs field by field; the three
xlsx files of the flow are byte for byte those of xlsx_rs's
`tests/data`. Reading `individuals_10000.xlsx` took 347 to 430 ms in
Chromium and 362 to 424 ms in WebKit with the download, and the page
stayed answering while the light worker read it.

### The review

`spec` with `stale`, `errors`, `api` and `architecture`; `tests`; `ux`
with `accessibility`, `browser` and `bundle`. The code followed the
specs; fixed:

- in Chromium, after the reader's JavaScript failed to download, every
  later xlsx failed for the rest of the page;
- a date in the first values broke at its hyphen, "2024-05-" then "15";
- two passages of the specs corrected to the release's contract: an
  example row that contradicted its own table, and `#SPILL!`, which Excel
  saves as `#VALUE!` and so refuses no sheet;
- a crash of either worker is now written to the console;
- a project file could hold a refusal naming column 0;
- the tests reviewer made 92 changes, 85 caught; the 4 real gaps now
  fail a test: a row named NA with every other cell missing, which must
  stay, the largest size of a sheet checked in two places, and "row
  100,001" in the words.

For the owner, below at stop B: the words for an Excel 97-2003 file
named `.csv`, which lead to a second refusal; whether an error of Excel
in the header should refuse the file; the words of the light worker's
crash, which speak of a calculation.

## 10. The end of the stage

The documents the specs ask for, the final checks, and the map of the
cases. Commits 76f0727, 0df562b, 20b000b (10.1); c6bfc01, 534d705,
cfe1300, e8122ac, f6ff2d5, 5328bbf, fb783ac, dcb4a5f, faa0995, 589787f,
5771037, 8e38f1f and e40bc1e (10.2).

### The deliverables, on e40bc1e

1. `npm run format:check`, `typecheck`, `lint` and `build` exit 0; `npm
   test` "Tests 2924 passed (2924)", none skipped; the browser check
   "1016 passed (3.1m)", the probe's 40 among them; `npm run screens`
   "308 passed"; popnei at `js-v0.1.0-dev.3` and xlsx_rs at
   `js-v0.1.0-dev.1`; the search for time, randomness, `await` and popnei
   in `src/core` finds nothing. The first script of `popgen.html` is
   228.87 KB gzipped as Vite counts it, beside 191.81 KB at the start,
   the only file of the first download that grew (the second,
   `jsx-runtime-*.js`, 68.78 KB, is the same file to the byte); the file
   of three.js 141.36 KB, 139,304 bytes with gzip -9.
2. The 35 items the specs of stage 4 ask of the skills and of
   `docs/architecture.md` and `docs/technology.md` are each made, with
   its commit; one, the answer to open point 1 of `technology.md` once
   the owner's xlsx files were read, was made by this task. The comment
   of `site.yml` says the workflow needs no Rust. `make_fixtures.mjs`
   writes the `.nei` files only when asked, since popnei dev.3 writes
   them larger than the tests pin.
3. The map, `docs/plans/individuals-pca.cases.md`: 1,015 items, 978
   reached; 53 tests of Vitest and 55 flows added for it, each seen to
   fail with its code broken; 37 left without a test, each with its
   reason, most a person looking or listening, a measurement, or a fact
   of the build.

### What the map found

- In an emptied number field, a comma typed first made the field show
  the threshold in Arabic-Indic digits, "٠٫١", in both engines; the
  application now names the Latin digits in its locale.
- Near the largest number the axes of the scatter showed ticks of
  "−Infinity" and "Infinity"; they are left out.
- Twelve sentences of the specs that the code had left behind were
  corrected, with no rule changed: the deployed site's address,
  "none yet in `package.json`", the version of the protocol, and others.

### How the work of 10 went, for whoever revises a skill or a plan

The map was made by three sessions side by side, as in stage 3, and
their line numbers came from four commits: 182 of 2,438 had moved and
were recomputed from the titles by a script. A map's parts should be
joined by a script from the start.

## For the owner, later

None of these is urgent, and none changes what a user can do.

- Specs that say less than the code or contradict it, where the code is
  right; recommended for each, the spec takes the code: `diversity.md`
  gives the populations of a new project as none where `project.md`
  gives "all"; `store.md` says it keeps the key of each result removed;
  the example refusal of `project.md`, "The validation", and its
  sentence on a read pending; the layout of `typesSet` in the example of
  `projectFile.md`; `projectFile.md` compares a VCF's ploidy where the
  code compares its name, size, format and the choice of passed
  variants; `writeVariants.md` on what a list popnei would refuse locks;
  `scatter.md` gives viridis 256 colours where d3 gives 254.
- The application's version is 0.1.0 before and after, so a check of a
  saved project may say "0.1.0 … 0.1.0". Recommended: raise it at the
  first release.
- `CLAUDE.md`: `npm install --no-save <tgz>` over an installed popnei of
  the same version did not replace it; `npm ci` did. Recommended: say to
  remove `node_modules/popnei` first.
- `testing.md`: the checks run against the built site, so a defect of
  React's double effects in development is caught only by a test under
  `<StrictMode>`; this plan met four. Recommended: a line there.
- On the Variants step, seven controls are 13 by 13 pixels, under the 24
  of WCAG 2.5.8 unless nothing is near them; not checked, from stage 3.
- After a crash, the page starts the calculation worker again before it
  gives the outcome, the reverse of the order after a large PCA; from
  before stage 4.
- Faded points, at an opacity of 0.25, have an outline of 1.44 to 1 on
  the background in light and 1.63 in dark; judge whether a faded point
  should be that faint, at stop C.

## The owner's decisions of 29 September 2026

The owner took every recommendation: "I recommend it says it is the
application's own error" yes; "I recommend quotation marks around the
value." OK; "I recommend a list of links to the analyses at the top of
the step." OK; "i accept the recommendations merge and push". They are
recorded, each with the option not taken, in the entry of that date of
`docs/specs/stage-4-open-points.md` (e6f1d1b). Each was built as a round,
its spec first, then its code with a test seen to fail first:

- The specs that take the code, and the record: e6f1d1b, 3a3ea24,
  549bba4, 33e5cf8, d0ca220 (`CLAUDE.md` and `testing.md` among them).
- The Variants step and the words of a defect, 7c4548d to f11a4f1: "the
  LD pruning" in its words; the reason whole under the distance, and
  "Locked until the distance of the LD pruning is typed, above." beside
  the Count and the Write; the reason said after an Undo that brings the
  empty distance back; End and Home move the caret and never jump a
  number to its limit; "were not run" for a plural title; a defect of the
  application during a PCA, and popnei refusing an option it does not
  know, read "The application met an error of its own: …".
- The Individuals step, 826a278 to 088f116: `"no" is coded 0.`; the words
  of a file that is not text; a header cell that is an error of Excel
  refuses the file, naming its place (`headerError`, with a fixture of
  our own, `header_error.xlsx`); the words of the reader's crash. The
  property of `project.test.ts` that failed now and then was the
  generator's fault, which drew column 0; fixed (cb8bd7c).
- The PCA panel and the Analyses step, 9d43236 to b9f4fc6: the grey
  outline on the three light colours only, the others at 3.06 to 5.81
  to 1 on the background; the list of links to the analyses under the
  step's heading; "…cannot run" for an analysis whose Run was not
  pressed; "For the PCoA alone"; each individual's value in the table
  for a column of more than 1,000 values.

The rounds were looked at again by the `react`, `accessibility` and `ux`
reviewers, on Chromium and WebKit, built and in development, with axe
clean in every state; they found two things, fixed: the reason of the
PCA's own LD filter under the PCoA still said "the PCA", and Shift with
Home or End lost the anchor of a selection in a number field.

For the owner, new, with a recommendation: the Variants step's checks
and the writing still say "…were not calculated", "…the file was not
written" when their own button was not pressed; recommended, the same
"cannot" as the analyses. And React Aria's live region of a number field
gathers the digits typed across edits, "5000050000777", which a screen
reader may read; from before this plan, recommended a look in the next
stage.

