# One pass per file: the count of the FILTER failures taken out

A small piece, decided by the owner on 7 October 2026: `popgen2.html`
reads each variants file once. Today, after the pass of the summary,
the page starts a second pass over a VCF that counts the variants that
failed their FILTER, and shows "FILTER failures: 300" in the box of the
file. The owner does not want a second pass for one number. The count
comes back when popnei's summary carries it in its own pass, popnei
issue #12 (JoseBlanca/popnei), and not as a pass of its own. Built as
the `building` skill says, on the branch `one-pass` from `main` at
86ee7e3.

## What the user can do when it is done

Case 1 of `docs/use-cases.md`, "open a file and see what it holds":
the user opens a VCF and the page reads it once. The box of the file no
longer has the line "FILTER failures: …" in any of its states (reading,
counting, counted, not counted, failed), and nothing else of the page
changes: the summary, the six histograms, their thresholds, Stop and
the progress stay as they are. For a large VCF the page is done after
one read of the file instead of two.

## What it stands on

- The chain of the page, `POPGEN2_CHAIN` in `src/ui/popgen2Store.ts`,
  today `[variantsSummary, filterFailures]`, run by `src/ui/autoRuns.ts`
  as one group; and `POPGEN2_ANALYSES` in `src/core/apps.ts`.
- The analysis `src/core/analyses/filterFailures.ts`, its job and result
  in `src/worker/protocol.ts`, their checks in `src/worker/messages.ts`,
  and `runFilterFailures` in `src/worker/runner.ts`. Only `popgen2.html`
  uses it; the old page `popgen.html` does not.
- The words and states of the line in `src/ui/variants/words.ts`,
  `chain.ts` and `VariantsSummary.tsx`; the e2e helper `holdFailures` in
  `e2e/holdWorker.ts`, and the screens of `e2e/screens.spec.ts`.

## The design

The analysis is removed whole, not only from the chain: core, the
protocol of the worker, its checks and the runner. Kept with no page to
run it, it would be code nobody runs and tests that guard nothing. When
popnei #12 is done, the count arrives inside the summary's result and
needs none of it. The chain becomes the summary alone; whether
`POPGEN2_CHAIN` and the group machinery of `autoRuns.ts` stay as a
group of one or are simplified is for the implementer to judge, keeping
the behaviour of Stop and resume that the summary has today, with its
tests.

The status lines and announcements the box gives while reading, when
stopped and when failed, lose their FILTER part; their other parts stay
word for word. `docs/architecture.md` and `docs/functionality.md` lose
what they say about the count and say instead that the count waits for
popnei #12.

## Phase 1

Remove the analysis, its line and its tests; adapt the tests of the
chain, the summary box, the announcements and the worker's messages;
update the two documents. Checks: typecheck, lint, Vitest, format, the
Playwright flows of `popgen2.html` in Chromium and WebKit. Screens to
look at: the box of a VCF while read, done, stopped and failed, and of
a `.nei` file done.

## What is left out

- The FILTER filter the user sets, and the count of the failures: the
  design `docs/designs/stats-filters.md` and popnei #12.

## What was done

### Phase 1, 7 October 2026

Commits 4bb6312 (the box and the chain), 91b6a58 (core and the
worker), 359c5f6 (the flows and the screens), 65c8235 (the documents).
The analysis is removed whole, with what only it used: the runner's
step of the FILTER column and the kind of the counts `PassFilterKind`.
The design `docs/designs/stats-filters.md` brings the FILTER column
back as an ordinary filter of the project. `PROTOCOL_VERSION` of the
worker's messages went to 11 rather than back to 9, so that a worker of
an older build is reported as another version. The worker specs
`docs/specs/worker/{protocol,messages,runner}.md` were brought up to
date too.

Checks on 65c8235: typecheck and lint clean, Vitest 4,035 tests in 117
files (4,073 on 86ee7e3, the count's tests removed), format clean;
Playwright in Chromium and WebKit, the flows of opening a file, its
statistics and the thresholds, 96 passed; the screens of popgen2, 76.

Review: spec and stale, tests and api, ux and accessibility. No
finding changed what a user sees. Fixed in 2568302: the words of a
Stop lost a branch no state reaches; a test comment that read as if
the real histograms lock on a `.nei` file; a date of
`docs/functionality.md`; the screenshot of a `.nei` file was taken
before the code of the plots arrived, and its test now waits for the
plots. Not taken: `startAgainMends` of `chain.ts` stays exported, since
its test checks its table.

Seen in Chromium through the screenshots (light and dark, 1280 and 320
px): a VCF while read, done, stopped, crashed and refused, and a `.nei`
file done. Not seen in WebKit or Firefox by eye.
