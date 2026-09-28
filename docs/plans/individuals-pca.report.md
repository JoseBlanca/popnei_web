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
