# The individuals the filters keep

Written on 26 September 2026 for stage 3 of `docs/build-order.md`, the
Variants step whole, as the revision of `docs/architecture.md` the owner
approved that day has it (its section 4, "The checks of the Variants
step, and the individuals they keep"); approved by the owner on 26 September 2026. It was a
section of `docs/specs/core/project.md` in the first draft of stage 3,
and has a file of its own because the store, the diversity, the write of
the filtered variants and the Variants step all cite it. Revised on 26
September 2026, after its approval: popnei's numbers of `panel.nei` are
tested in core, from a fixture of popnei's statistics, and not among the
runner's tests, since a test of the worker imports no function of core
("How it is verified"). Revised on 27 September 2026, after the review
of the specs of stage 4: the list known and empty, with no statistics,
when the lists alone leave nobody. Revised on 28 September 2026 for the
owner's decision that day that the filters of individuals act first
(`docs/architecture.md`, section 2): the statistics are counted over
every variant of the file, their pass has no filter, the calculation
worker puts the list before the filters of the variants, and popnei's
numbers of `panel.nei` are those over every variant. The revisions for stage 4 are approved by the owner on 28 September 2026. Built in `src/core/individualsKept.ts`, the row
of section 9 of the architecture. It depends on
`docs/specs/core/project.md`, for the project, its filters of
individuals, `projectNeeds`, `individualListNeeds` and the rules by which a text names a value
of a file, and on `docs/specs/analyses/individualChecks.md`, whose
result gives the statistics. Revised on 8 October 2026 for the download of popgen2.html
(`docs/specs/steps/popgen2-download.md`): `keptNoneReason` takes the
step its words send the user to, "the Variants step" by default, and
`null` for a page with no steps, whose words end "Loosen them."; the
store keeps calling it with the default, and the store of popgen2.html
with `null`, from its setting `keptNoneStep`. Built on the branch
`download`, work packages 3 and 6 of `docs/plans/download.md`, on 8 and
9 October 2026.

## What it does

popnei filters individuals only by a list, `filterIndividuals` of
`js/popnei/src/variant.ts`, and gives, for each individual, its
proportion of missing genotypes and its observed heterozygosity,
`missingGtRate` and `obsHetRate` of `calcPerIndividualStats` of
`js/popnei/src/stats.ts`. The four filters of individuals of
`docs/functionality.md`, section 3, a list to keep, a list to remove, and
a threshold on each of those two numbers, are the application's
arithmetic on them (`docs/build-order.md`, section 4). Core makes, from
the project and those statistics, the one list of the individuals kept,
which every analysis that reads the filters of individuals is given and
the calculation worker puts on the `Variants` before the filters of the
variants, which then count over the individuals it keeps. The function is `individualsKept`, pure, which reads nothing
but the project and a result.

What a user would see go wrong if this module were wrong: an analysis
run on other individuals than the thresholds say, with no sign of it,
since the job carries only the list; and counts beside the filters of
individuals that do not match what the analyses read.

The statistics are the result of the analysis of the statistics of each
individual, `individualChecks`, under the key the project gives it, which
the store finds in its cache (`docs/specs/core/store.md`, "The
individuals kept"). Its pass has no filter, as the owner decided on 28
September 2026, so every individual of the variants file is in it, in
the order of the file, and its numbers are counted over every variant of
the file: one pass for each load, which no change of a filter takes
off. Until then the pass had the filters of the variants, and a change
of one needed a pass again before the list was known.

The filters are applied in their fixed order, keep, remove, missing
data, observed heterozygosity (`docs/specs/core/project.md`, "One filter
of each kind, in a fixed order"). The first is given every individual of
the variants file, and each one after it the individuals the one before
it kept. Each keeps:

| filter | keeps an individual when |
|---|---|
| `keep` | the list names it |
| `remove` | the list does not name it |
| `missing_data` | its `missingGtRate` is at most `maxAllowedMissingRate` |
| `obs_het` | its `obsHetRate` is at most `maxAllowedObsHet`; an individual with no called genotype, whose `obsHetRate` is NaN, is removed, as the owner decided on 26 September 2026 (`docs/architecture.md`, section 13, point 4) |

A threshold keeps what is at most it, as popnei's filters of the
variants do, compared with `<=` against the number the user typed, with
no arithmetic between them (`docs/specs/worker/protocol.md`). The list is
in the order of the variants file, whatever the order of the names in a
list to keep.

What `individualsKept` gives:

- **The list**, known or not. It is known when the project has no
  threshold, since the lists and the individuals of the variants file
  are in the project, or when it has one and the statistics are given,
  or when the lists to keep and to remove keep no individual, whatever
  the thresholds, since a threshold can only remove more: the list is
  then empty, and no statistics are calculated for a list that cannot
  keep anyone. A known list is `null` when the filters remove no individual, as when
  there is no filter of individuals, so that the job carries nothing and
  the runner puts no `filterIndividuals` on the `Variants`
  (`docs/specs/worker/runner.md`); it is empty when they keep none. It is
  not known when the project has a threshold and no statistics are
  given: the store then calculates them before the analysis
  (`docs/specs/core/store.md`).
- **How many individuals each filter was given and kept**, which the
  Variants step shows beside each filter as it is set, with no pass
  (`docs/specs/steps/variants.md`). A number that needs the statistics
  and has none is `null`: the kept of a threshold, and the given and
  kept of every filter after it; a threshold given no individual by the
  lists is given and keeps 0, known, so after lists that leave nobody
  every count is 0, known.
- **The individuals the lists keep**, `byLists`, the two lists alone,
  known from the project whatever the thresholds, for a module that must
  know before a run what the lists leave, the diversity's populations
  with no individual left (`docs/specs/analyses/diversity.md`, "Why it
  cannot run"); a threshold can only remove more.
- **Nothing**, `null`, when `projectNeeds` or `individualListNeeds`
  of `docs/specs/core/project.md` gives a reason: a variants file not
  read has no individuals, and a list that names an individual twice or
  one not in the file has no meaning to count.

When the filters keep no individual, every analysis that reads them,
and the writing of the filtered variants, are locked by the store with
the words of `keptNoneReason`, since popnei refuses a `filterIndividuals`
of no name: "The filters of individuals keep none of the 200 individuals
of panel.nei. Loosen them in the Variants step." The count is the number
of individuals of the variants file, written as `grouped` of
`project.ts` writes a count, and the name of the file is escaped with
`escaped` of the same module. A file of one individual reads "The
filters of individuals do not keep the one individual of one.vcf.
Loosen them in the Variants step.", in place of "keep none of the 1
individuals", as the owner decided at stop B on 27 September 2026.

Seen in node, with popnei's release `js-v0.1.0-dev.3`, on 28 September
2026, on `e2e/fixtures/panel.nei`, 200 individuals and 1,200 variants,
by the script of `docs/specs/worker/runner.md`, "How it is verified",
`orderA.mjs`: with no filter, `calcPerIndividualStats` gave a
`missingGtRate` from 0.0175 to 0.0442 and an `obsHetRate` from 0.321 to
0.393, none NaN, with `passStats.numVars` 1,200; a threshold of 0.03 on
the missing rate kept 116 of the 200 individuals, and one of 0.35 on the
heterozygosity 42 of those 116, or one of 0.38 111 of them, removing
s023, s042, s086, s168 and s183; and `filterIndividuals` of those 111
before the missing data filter of the variants at 0.05 gave 111
individuals and 1,200 to 1,117 variants, where that filter keeps 1,152
with every individual. `js-v0.1.0-dev.2` gives the same statistics.
Over the 1,152 variants the missing data filter at 0.05 kept, the
statistics of the order of 26 September 2026, the same thresholds kept
125, 48 and 119.

## The TypeScript interface

In `src/core/individualsKept.ts`. The fields are `readonly` in the code,
as below. The statistics are taken by their shape, the three fields of
popnei's `PerIndividualStats` that the result of `individualChecks`
carries, `IndividualChecksResult` of `docs/specs/worker/protocol.md`, so
that this module names no type of an analysis.

```ts
import type { IndividualFilterKind } from "../worker/protocol.ts";
import type { Project } from "./project.ts";

/** The statistics of each individual, over every variant of the file. */
export interface IndividualStats {
  readonly individuals: readonly string[];  // every individual of the variants file, in its order
  readonly missingGtRate: Float64Array;
  readonly obsHetRate: Float64Array;        // NaN for an individual with no called genotype
}

export type KeptList =
  | { readonly kind: "known"; readonly individuals: readonly string[] | null } // null: none removed
  | { readonly kind: "needsStatistics" };

export interface IndividualsKept {
  readonly list: KeptList;
  /** The individuals the lists to keep and to remove keep, in the order
      of the variants file, known with no statistics; every individual
      of the file when there is no list. */
  readonly byLists: readonly string[];
  /** One per filter of individuals of the project, in its order. */
  readonly counts: readonly {
    readonly kind: IndividualFilterKind;
    readonly given: number | null;          // null: needs the statistics
    readonly kept: number | null;
  }[];
}

/** The individuals the filters keep, or null when projectNeeds or
    individualListNeeds gives a reason. `stats` is used only when the project has a threshold. */
export function individualsKept(p: Project, stats: IndividualStats | null): IndividualsKept | null;

/** The reason of the lock when the list is known and empty, or null. */
export function keptNoneReason(
  p: Project, kept: IndividualsKept | null,
  step: string | null = "the Variants step",  // null on popgen2.html, which has no steps: "… Loosen them."
): string | null;
```

Statistics whose `individuals` are not those of the variants file of
`p`, in its order, or whose arrays are not as long, are a defect, thrown:
the store gives only the result under the key of `p`, whose load is that
file.

## The cases

- **An opened project with a threshold on the individuals.** The
  statistics of each individual are results, which a project file does
  not keep, so the list is `needsStatistics` until they are calculated
  for the new load; the first Run of an analysis that reads the filters
  of individuals calculates them first (`docs/specs/core/store.md`).
- **Filters that remove no individual**: a list to keep that names every
  individual, a threshold above every value. The list is `null`, as with
  no filter, and the counts say so, each filter given and kept the same
  number.
- **Every individual without a called genotype** in the file, with a
  filter by heterozygosity: none is kept, whatever
  its threshold, and `keptNoneReason` gives the lock. Without that
  filter, they are kept.
- **Lists that keep no individual, with a threshold and no
  statistics**: a list to remove that names every individual, then the
  missing data switch turned on. The list is known and empty, and
  `keptNoneReason` gives the lock at once. Were it `needsStatistics`,
  the threshold would read "Known once the statistics are calculated",
  the writing would be offered, and a press would spend a pass of the
  statistics before it was refused.
- **A filter of the variants changed.** The statistics are under the
  same key, which holds the load and no filter, so the list stays known
  and needs no pass; only a new load, an opened project, or the cache
  dropping the statistics make it `needsStatistics` again.

## How it runs

On the page, in the store, once for each project and each result of the
statistics under the key it gives them (`docs/specs/core/store.md`, "How
it runs"): a walk over the individuals of the file, 10,000 at most in the
largest dataset the architecture plans for, and a set of the names of
each list.

## How it is verified

With Vitest, at the two functions, on frozen projects:

- **A worked case**, on a project of five individuals `a` to `e` and
  statistics given as literals, `missingGtRate` `[0.2, 0.1, 0.3, 0.05,
  1]` and `obsHetRate` `[0.3, 0.5, 0.2, 0.4, NaN]`, `e` calling no
  genotype: with no filter, the list `null`; with remove `[b]`, missing
  data 0.2 and observed heterozygosity 0.4, the list `[a, d]` and the
  counts remove 5 to 4, missing data 4 to 2, heterozygosity 2 to 2, `c`
  and `e` dropped by their missing rate, `a` kept at 0.2 and `d` at 0.4,
  their thresholds exactly; with keep `[e, a]`, `[a, e]` in the order of
  the file; with observed heterozygosity 1 alone, `e` removed for its
  NaN; with missing data 0.01, the list empty and `keptNoneReason` "The
  filters of individuals keep none of the 5 individuals of panel.nei.
  Loosen them in the Variants step."; with a threshold and no
  statistics, `needsStatistics`, the lists' counts given and the
  threshold's `null`; with remove `[a, b, c, d, e]`, missing data 0.2
  and no statistics, the list known and empty, the counts remove 5 to 0
  and missing data 0 to 0, and `keptNoneReason` the words above; with
  keep `[a]`, remove `[a]` and missing data 0.2, and no statistics, the
  list known and empty, the counts keep 5 to 1, remove 1 to 0, missing
  data 0 to 0, and `keptNoneReason` the words above; statistics of
  another order of the individuals, a defect.
- **popnei's numbers**: the same function, given the statistics that
  popnei's release gives on `panel.nei` with no filter, gives the 116,
  42 and 111 individuals above, which the
  architecture asks for (`docs/architecture.md`, section 4, "What would
  show these choices wrong"). The test is in core, in node, and reads
  those statistics from `e2e/fixtures/panel_individual_stats.json`, the
  individuals, their `missingGtRate` and their `obsHetRate` as
  `calcPerIndividualStats` gave them, which `e2e/fixtures/make_fixtures.mjs`
  writes with popnei beside the other fixtures, and which is written
  again with them when popnei's release changes. It is not among the
  runner's tests, as the first draft had it, since a test of
  `src/worker` imports nothing of core but the types of `result.ts`
  (`.claude/skills/coding/SKILL.md`, "The layers and what each may
  import"); the runner's tests check the statistics themselves
  (`docs/specs/worker/runner.md`, "How it is verified").
- **A property, with fast-check**, which draws random projects and
  statistics: the list is in the order of the variants file and holds
  exactly the individuals that every filter keeps, and each filter's
  `kept` is the next one's `given`.

## Open points

None. Its choices are the architecture's, approved by the owner on 26
September 2026.

## Not in this spec

- The filters of individuals in the project, their fields and their
  validation: `docs/specs/core/project.md` and
  `docs/specs/worker/protocol.md`.
- When the store makes the list, the lock of no individual kept, and a
  Run that waits for the statistics: `docs/specs/core/store.md`.
- The list in the Python script, made from popnei's statistics in the
  same way: `src/core/script.ts`, stage 6 (`docs/architecture.md`,
  section 8).
