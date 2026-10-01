<!-- spec: docs/specs/worker/runner.md -->
<!-- heading: The runner -->
<!-- row: the runner -->
<!-- sections: "How it is verified", the items of stage 5 -->
<!-- file run: src/worker/runner.test.ts -->
<!-- file ord: src/worker/runnerPopDistsOrder.test.ts -->
<!-- file pf: src/core/projectFile.test.ts -->

The revision changed no item of "The cases". The runner is the code of
the calculation worker that calls popnei; its tests call popnei in node
over the files of `e2e/fixtures/`. The sentence that says the numbers of
stage 5 are those of the four specs of its analyses, got in node on 30
September 2026, and the one that names the scripts `dists.mjs` and
`order.mjs`, say where the literals of the tests come from and name no
case; they are not counted.

| item | test | note |
|---|---|---|
| `transferablesOf` of a result of each of the seven analyses: the diversity of stage 5 with its spectra, one buffer per array {{@ `explainedVariancePercent`, the diversity of stage 5 with its spectra,}} | {{run: of a diversity result, the fifteen buffers of its twelve arrays and three spectra, each once}} | |
| the distances with the `order` of the kind `pcoa`; none twice when two fields hold one array; a view of part of a buffer throws {{@ the distances with the `order` of the kind `pcoa`, one buffer per}} | {{run: transferablesOf of a result of the distances with orders of the kind pcoa: …}}; {{run: transferablesOf of a result of the LD decay: the buffer of each of its ten arrays, each once, and a view of part of a buffer throws}} | the LD decay is the seventh analysis |
| The diversity of stage 5, over `panel.nei` and the populations of `panel_pops.csv` with the missing data filter at 0.05 and the default draw of 40: the table of stage 5 of `diversity.md`, F, the alleles and the private alleles of each population {{@ - **The diversity of stage 5**, over `panel.nei`}} | {{run: with the missing data filter at 0.05, F, the alleles and the private alleles of the table of stage 5, beside the three numbers of stage 2}} | |
| the spectra of `sfs.md` from a second job with no filter, p0's first value 44.79323144486922, each of 21 values {{@ and the spectra of `docs/specs/analyses/sfs.md`, "The numbers of}} | {{run: the spectra with no filter are in the order of the job, of 21 values each, p0's first 44.79323144486922, and equal to those of a call that asks folded_sfs alone}} | |
| equal to the last digit to those of a call that asks `folded_sfs` alone {{@ equal to the last digit to those of a call that asks `folded_sfs`}} | {{run: the spectra with no filter are in the order of the job, …}} | the test makes that call of popnei itself |
| the progress of the two calls, passes 1 and 2 of 2 {{@ the progress of the two calls, passes 1 and 2 of 2}} | {{run: told is given the calls of the two passes as passes 1 and 2 of 2}} | |
| and of a job whose `popDiversityPops` is empty, one pass of 1 {{@ job whose `popDiversityPops` is empty, one pass of 1}} | {{run: with popDiversityPops empty there is one pass, told as pass 1 of 1, calcPopDiversity is not called, and its numbers are NaN}} | |
| a job with one population in `popDiversityPops`, with no private alleles asked, NaN in their three arrays and `numVarsEveryPop` `null` {{@ population in `popDiversityPops`, with no private alleles asked, NaN}} | {{run: one population of a column given to calcPopDiversity has no private alleles asked: NaN in their three arrays and numVarsEveryPop null}}; {{run: All individuals, one population, gives F and the alleles, and no private alleles, which are not asked for}} | |
| populations named `10`, `9` and `p`, in that order, whose spectra come back in the order of the job {{@ named `10`, `9` and `p`, in that order, whose spectra come back}} | {{run: populations named 10, 9 and p come back with their numbers and spectra in the order of the job, not in popnei's 9, 10, p}} | |
| The distances between populations: the Fst, the D and the variants of each pair of `popDists.md` at the missing data filter at 0.1 and at 0.05, the order p2, p0, p1 of both measures {{@ - **The distances between populations**: the Fst, the D and the}} | {{run: the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, the D and the variants of each pair of popDists.md to the last digit, and the order p2, p0, p1 of both measures}}; {{run: at the missing data filter at 0.05, which keeps 1,152 variants, the pairs of popDists.md and the order p2, p0, p1 of both measures}} | |
| and the check numbers there {{@ measures, and the check numbers there}} | {{run: the populations of panel_pops.csv at the missing data filter at 0.1 give the Fst, …}}; {{pf: v1-stage5-options.popnei.json opens into its project, …}} | the check numbers are the variants kept and the Fst and the D of each pair: the runner's test gives the seven, and the project file of stage 5 holds the same seven as a literal |
| the populations named "3", "1" and "2" for p0, p2 and p1, given back by popnei as "1", "2", "3", held as "3", "1", "2" pair by pair {{@ and "2" for p0, p2 and p1, given back by popnei as "1", "2", "3", held}} | {{run: p0, p2 and p1 named "3", "1" and "2", which popnei gives back as "1", "2", "3", …}}; {{ord: the counts of variants of each pair follow popnei's order of the names 3, 1 and 2, and are put back in the job's}} | |
| the fixture `panel_split.csv`, whose negative pair gives the order p0b, p0a, p2, p1 for both measures {{@ whose negative pair gives the order p0b, p0a, p2, p1 for both}} | {{run: panel_split.csv gives the negative pair of p0a and p0b of popDists.md and the order p0b, p0a, p2, p1 of both measures}} | |
| The LD decay, over `e2e/fixtures/ld.nei` and `ld_pops.csv` with the missing data filter at 0.1, `maxDist` 100,000: 432 variants and 29,367 pairs in each population, the half distances 7548.08187836982 and 7339.709512618931, and the first and last bins {{@ - **The LD decay**, over `e2e/fixtures/ld.nei`}} | {{run: the job of the flow over ld.nei gives the numbers of ldDecay.md to the last digit: …}} | |
| populations named "10" and "2", given back by popnei as "2", "10", held in the order of the job {{@ "10" and "2", given back by popnei as "2", "10", held in the order of}} | {{run: populations named "10" and "2", which popnei gives back as "2", "10", are held in the order of the job}} | |
| and a population named `__proto__`, thrown as a defect {{@ and a population named `__proto__`, thrown as a defect}} | {{run: a population named __proto__, the %s of the job, which popnei's result does not hold as a field of its own, is thrown as a defect}} | run for the first, the second and the only population of the job |
