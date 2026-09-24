# Report: the site stands up, and popnei runs in it

The work report of the plan `docs/plans/site.md`, stage 0 of
`docs/build-order.md`, carried out on the branch `plan/site` from 24
September 2026. It is written while the work goes, one section per work
package. The plan is under way.

The `following-plans` skill puts a report under `docs/reports/`; this
one is at `docs/plans/site.report.md` because the plan and the owner's
order name that path.

## 0. The release of popnei

Done on 24 September 2026. The release exists and installs from its
URL.

- Task 0.1. In a scratch folder, `npm install
  https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.1/popnei-0.1.0.tgz`
  added 1 package, and `node -p
  'require("./node_modules/popnei/package.json").version'` printed
  `0.1.0`. The package holds `dist/`, `wasm/`, `package.json`, `README.md`
  and `LICENSE`.
- The machine: macOS (Darwin 27.0.0), node 26.8.2, npm 11.19.1, as the
  plan expected.
