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
- Task 1.2, e008c22: `canonical` and `createKeyMemo` in `keys.ts`, and
  the generator of JSON values in `testSupport.ts`. `npx vitest run
  src/core/keys.test.ts -t "WP1 D2"` gives "Tests 21 passed (21)", of at
  least 17: twelve values that are not JSON, where the spec lists ten,
  since a bigint and a symbol are refused too, and a hole in a list and a
  subclass of `Array`. Each group of tests was seen to fail on the code
  broken for it. The spec gave no form for the path in the message of a
  defect; the writer chose a JSON list, the form of `ProjectError.path`,
  and the keys spec says so since 0c84dca, a commit of its own after the
  code rather than before it.
- Task 1.3, b8a8853: the twelve commands, `emptyProject`,
  `analysisOptions` and the check of each value that `parseProject` will
  share, in `project.ts`; the deep freeze, a project written by hand and
  the generator of commands in `testSupport.ts`. `npx vitest run
  src/core/project.test.ts -t "WP1 D3"` gives "Tests 58 passed (58)", of
  at least 50; `npm test` gives 147. Eighteen breaks of the code, one per
  group of tests, each failed its group; one showed that two cases of a
  binary column passed on the error of another column, and they were
  pinned to their own. A VCF load with no read options is refused, as
  the spec's type and its "read options only for a VCF" say. The
  commands copy the fields of the values they are given, so a field the
  type does not have cannot reach the project.
