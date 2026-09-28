# Report: the Individuals step and the PCA

The work report of the plan `docs/plans/individuals-pca.md`, stage 4 of
`docs/build-order.md`, carried out from 28 September 2026 on the branch
`plan/individuals-pca`, which is not merged and not pushed.

## Where the plan stands

Under way, from 28 September 2026.

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
