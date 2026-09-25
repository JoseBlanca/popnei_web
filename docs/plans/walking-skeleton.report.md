# Report: the walking skeleton

The work report of the plan `docs/plans/walking-skeleton.md`, stage 2 of
`docs/build-order.md`, carried out from 25 September 2026 on the branch
`plan/walking-skeleton`, which is not merged and not pushed.

## Where the plan stands

Under way. The work packages done are written below, one section each,
as they end.

## Before the first task

On 25 September 2026 the owner ordered the merge of
`docs/plan-walking-skeleton` into `main`, which moved `main` from 88f44c5
to 59e46d2, the commit of the plan, and the branch `plan/walking-skeleton`
was made from it. The checks the plan lists were run again there, after
`npm ci`, and gave the plan's counts:

| Check | Result on 59e46d2 |
|---|---|
| `node --version`, `npm --version` | v26.8.2, 11.19.1 |
| `npm pkg get dependencies.popnei` | the URL of `js-v0.1.0-dev.1` |
| `format:check`, `typecheck`, `lint` | exit 0 |
| `npm test` | "Tests 634 passed (634)", 6 files |
| `npm run build` | exit 0 |
| `npx playwright test --project=chromium --project=webkit` | "40 passed" |
