<!-- spec: docs/specs/entry.md -->
<!-- heading: The entry -->
<!-- row: the entry -->
<!-- sections: "How it is verified", the items of stage 5 -->
<!-- file apps: src/core/apps.test.ts -->

The revision changed no item of "The cases". `src/core/apps.ts` holds
the analyses of the application and `countsOf`, the function that says,
of a result, how many variants the file has and whether the counts of
its pass are those shown beside the filters of the Variants step.

| item | test | note |
|---|---|---|
| `countsOf` of a result of the distances between populations with the `passStats` of the diversity above: the same counts {{@ from stage 5, of a result of the distances between populations with the `passStats`}} | {{apps: countsOf of a result of the distances between populations with the passStats of the diversity gives the variants of the file, 1,200, and the counts of the same passStats, since its pass has the project's list and filters}} | |
| and of a result of the LD decay with the same `passStats`, `numVarsRead` 1,200 and no counts {{@ and of a result of the LD decay with the same}} | {{apps: countsOf of a result of the LD decay with the passStats of the diversity gives the variants of the file, 1,200, and no counts, since its filters are the project's but the LD pruning}} | |

The revision also names the two analyses in "The TypeScript interface",
in comments that are no item of the two sections: `popDists` and
`ldDecay` come after the diversity among the analyses of the
application, in the Analyses step. They are checked by
{{apps: the analyses of population genetics have distinct ids: …}},
{{apps: each analysis has its step in POPGEN_ANALYSIS_STEPS, …}},
{{apps: the distances between populations are an analysis of population genetics, in the Analyses step, just after the diversity}}
and
{{apps: the LD decay is the last analysis of population genetics, in the Analyses step, just after the distances between populations}}.
