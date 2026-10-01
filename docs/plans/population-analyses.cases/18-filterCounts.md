<!-- spec: docs/specs/analyses/filterCounts.md -->
<!-- heading: The counts of the filters -->
<!-- row: the counts of the filters -->
<!-- sections: "The cases" and "How it is verified" -->
<!-- file apps: src/core/apps.test.ts -->
<!-- file run: src/worker/runner.test.ts -->

The revision of stage 5 changed no item of the two sections. It changed
the table of "Which results fill it", which says, for each analysis,
whether the counts of its pass are those shown beside the filters of the
Variants step. Those of the distances between populations are:
{{apps: countsOf of a result of the distances between populations with the passStats of the diversity gives the variants of the file, 1,200, and the counts of the same passStats, …}}.
Those of the diversity are the counts of the first of its two passes:
{{run: with the missing data filter at 0.05, F, the alleles and the private alleles of the table of stage 5, beside the three numbers of stage 2}},
whose result holds the counts of stage 2 beside the numbers of the
second pass. Those of the LD decay are not, since its filters leave out
the LD pruning:
{{apps: countsOf of a result of the LD decay with the passStats of the diversity gives the variants of the file, 1,200, and no counts, …}}.
The function is `countsOf` of `src/core/apps.ts`, whose items are under
the entry below.
