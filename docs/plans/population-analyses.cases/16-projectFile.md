<!-- spec: docs/specs/core/projectFile.md -->
<!-- heading: The project file -->
<!-- row: the project file -->
<!-- sections: "How it is verified", the fixture of stage 5 -->
<!-- file pf: src/core/projectFile.test.ts -->

The revision changed no item of "The cases". The fixture is a project
file kept in `src/core/fixtures/projectFile/`, which the tests open and
write back.

| item | test | note |
|---|---|---|
| `v1-stage5-options.popnei.json`: `panel.nei` and `panel_pops.csv` with the column `popcat`, the options of the diversity with a draw of 60 typed, of the distances with a minimum of 10 and the measure `"dest"`, and of the LD decay with a largest distance of 100000 and a largest major allele frequency of 0.9; it opens into a project written as a literal in its test {{@ from stage 5, `v1-stage5-options.popnei.json`}} | {{pf: v1-stage5-options.popnei.json opens into its project, with the options of the three analyses and the 7 check numbers of the distances, and is written back byte for byte}}; {{pf: a file with a draw of 60 typed, the distances at 10 and dest, and the LD decay at 100000 and 0.9 opens with them}} | |
| with the check numbers of the distances, 1 + 3 × 2 = 7, those of `popDists.md` at the missing data filter at 0.1 {{@ with the check numbers of the distances, 1 + 3 × 2 =}} | {{pf: v1-stage5-options.popnei.json opens into its project, …}}; {{pf: the distances at a minimum of 10 over p0, p1 and p2 are refused with 6 check numbers, as with the 3 of two populations}} | the seven numbers are a literal of the test, `DISTANCES_NUMBERS`; that popnei gives them is the runner's test of the distances, under the runner below |
| the project written back from it, with no result and the header's versions and date, is the fixture byte for byte {{@ the project written back from it, with no result}} | {{pf: v1-stage5-options.popnei.json opens into its project, …}} | |
