# Report: the core, with no screen

The work report of the plan `docs/plans/core.md`, stage 1 of
`docs/build-order.md`, carried out from 24 September 2026 on the branch
`plan/core`. It says what was built, how each deliverable was checked,
what changed on the way and why, and what is asked of the owner.

## Where the plan stands

Under way.

## Before the first task

Checked on 24 September 2026 in the worktree
`.claude/worktrees/plan-core`, on a559619, after `npm ci`:

- The branch: `git ls-tree -r --name-only main docs/specs/core
  docs/specs/worker docs/plans/core.md` lists the five specs of the core,
  the protocol spec and the plan.
- node 26.8.2 and npm 11.19.1.
- `npm pkg get dependencies.popnei` prints
  `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`.
- `npm ls fast-check` prints `(empty)`.
- `npm run format:check`, `typecheck` and `lint` exit 0; `npm test`
  gives "Tests 68 passed (68)" in one file; `npm run build` exits 0;
  `npx playwright test --project=chromium --project=webkit` gives "40
  passed".

## 1. The project and its commands

Under way.

- Task 1.1, 67df68a: the types of `src/worker/protocol.ts`,
  `src/core/result.ts`, and of `project.ts`, `keys.ts` and `store.ts`,
  with no function; fast-check 4.10.2 added, which brought `pure-rand`
  and nothing else (`npm ls fast-check` prints `fast-check@4.10.2`). A
  scratch line naming `File` in `protocol.ts` failed `npm run typecheck`
  with "error TS2304: Cannot find name 'File'", and was removed. The
  checks exit 0, "Tests 68 passed (68)". `KeyedDef` was left for task
  2.2, which names it.
