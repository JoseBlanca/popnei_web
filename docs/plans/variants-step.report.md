# Report: the Variants step, whole

The work report of the plan `docs/plans/variants-step.md`, stage 3 of
`docs/build-order.md`, carried out from 26 September 2026 on the branch
`plan/variants-step`, which is not merged and not pushed.

## Where the plan stands

Under way since 26 September 2026.

## Before the first task

The branch `plan/variants-step` was made from `main` at 0bb7d78, called
the start below. On the start, on 26 September 2026, on this Mac:

- `grep -rlzE "not yet[[:space:]]+(reviewed nor[[:space:]]+)?approved" docs/specs`
  printed nothing: every spec is approved.
- `git ls-tree -r --name-only main docs/plans/variants-step.md` printed
  the path.
- node 26.8.2; `npm pkg get dependencies.popnei` printed the URL of
  `js-v0.1.0-dev.2`.
- After `npm ci`: `format:check`, `typecheck` and `lint` exited 0;
  `npm test` gave "Tests 1460 passed (1460)" in 41 files;
  `POPNEI_TEST_PAGES=1 npm run build` exited 0, the page's first script
  `popgen-*.js` 123.62 KB gzipped; `npx playwright test
  --project=chromium --project=webkit` gave "348 passed".
