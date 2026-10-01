# The map of the cases of stage 5

Deliverable 3 of work package 9 of `docs/plans/population-analyses.md`:
every item of "The cases" and of "How it is verified" of the specs of
stage 5, with the test that reaches it. A test reaches an item when it
gives the input the item names and checks the outcome the item gives;
each was read for that, not matched by its name. For a spec written
before stage 5, the items are those its revision of 30 September 2026
for stage 5, and the owner's decisions of 1 October 2026, added or
changed; `docs/specs/charts/heatmap.md`, `line.md`,
`docs/specs/analyses/popDists.md`, `sfs.md` and `ldDecay.md`, written
for stage 5, are mapped whole. The items the earlier stages wrote are in
`docs/plans/individuals-pca.cases.md`.

This file is written by a script and is not edited by hand. The map is
kept in parts, one per spec, in `docs/plans/population-analyses.cases/`,
where a test is named by its file and its title, and
`node docs/plans/population-analyses.cases.mjs`, run from the root of
the repository, finds the line of each test as the files stand and
writes this file. It is run again after any commit that moves a test.
The map of stage 4 was written with the line numbers themselves, and 182
of its 2,438 line numbers had moved before it was committed. When a
title a part gives is in no test of its file, or in two, the script
stops, prints that title with its part and its line, and writes nothing.
With `--check` it writes nothing and says whether this file is what it
would write. Its opening comment says what a part holds. The parts were
started on 1 October 2026 with the specs that have no screen; those of
the three panels, `docs/specs/analyses/popDists.md`, `diversity.md`,
`sfs.md` and `ldDecay.md`, and of `docs/specs/shell.md`, were added the
same day, after the owner's decisions on the panels.

Each item is named in the spec's words, shortened, with the line of the
spec where it starts. A test is named by a short name of its file, the
line where it starts, and its title, or the start of it, as it stands in
the source: `prj:120` would be the test that starts at line 120 of the
file the section gives for `prj`. Each section names its short names
before its table. A test
marked "added" was written for this map: each test of Vitest was seen to
fail with the code it guards broken on purpose, on a copy of the sources
outside the repository, and to pass with the code as it is. The one flow
added, of the link of the LD decay in `e2e/ldDecay.spec.ts`, was written
by a session that runs no browser, and is run by the browser check of
the plan.

The tests of Vitest, which run in node, are under `src/`; those of the
plots run under jsdom, a library that gives node the document of a page
and lays nothing out. The flows of Playwright, which drive a browser
through the built site, are under `e2e/`; some run axe, a checker of the
rules of accessibility, on the page. The flows run in Chromium and WebKit here, since Playwright
1.63.0 cannot start Firefox on this Mac; Firefox runs them on GitHub
once `main` is pushed.

An item counts as reached when a test reaches all of it. The items that
are not are in "Left without a test", at the end, each with its reason.
Of the {{items}} items, {{reached}} are reached and {{left}} not; the
tests cited are {{tests}}, {{added}} of them added for the map. A spec
whose revision changed no item of the two sections has 0 items in the
table below; its section says what the revision changed and which tests
check it.

{{summary}}

## Where a spec and the code differ

Two points, each a sentence of a spec that the code does not do:

- `docs/specs/analyses/sfs.md`, "The cases", says of a population under
  the minimum of individuals, which has no spectrum, "It is not in the
  table nor in the CSV." The CSV leaves it out, but the table of the
  block keeps its two columns, with "no value" in every cell: the review
  of work package 7 made it so, since the table had dropped such a
  population without a word (`docs/plans/population-analyses.report.md`,
  work package 7, "The review"), and the spec was not changed with it.
  "What it shows" of the same spec gives the table "for each population,
  two columns", which agrees with the code. The recommendation is to
  correct the case to "Its columns in the table read "no value", and it
  is not in the CSV."
- `docs/specs/analyses/ldDecay.md`, "How it is verified", gives the line
  under the plot of 17 populations as "…in the order of the table. The
  two tables hold all 17.", where "Its words" of the same spec, the code
  and its tests have "…in the order of the table of the populations. The
  two tables hold all 17." The recommendation is to correct the sentence
  of "How it is verified".

The point the map of 1 October found first, the vertical axis of the
spectrum in `docs/specs/charts/histogram.md`, 0 to 0.07 where the code
gives 0 to 0.065, was settled the same day: the spec now gives 0.065.
