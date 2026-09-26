# The individuals the filters keep

Written on 26 September 2026 for stage 3 of `docs/build-order.md`, the
Variants step whole, as the revision of `docs/architecture.md` the owner
approved that day has it (its section 4, "The checks of the Variants
step, and the individuals they keep"); approved by the owner on 26 September 2026. It was a
section of `docs/specs/core/project.md` in the first draft of stage 3,
and has a file of its own because the store, the diversity, the write of
the filtered variants and the Variants step all cite it. There is no
code of it yet; it will be `src/core/individualsKept.ts`, the row of
section 9 of the architecture. It depends on
`docs/specs/core/project.md`, for the project, its filters of
individuals, `projectNeeds`, `individualListNeeds` and the rules by which a text names a value
of a file, and on `docs/specs/analyses/individualChecks.md`, whose
result gives the statistics.

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
the calculation worker puts on the `Variants` after the filters of the
variants. The function is `individualsKept`, pure, which reads nothing
but the project and a result.

What a user would see go wrong if this module were wrong: an analysis
run on other individuals than the thresholds say, with no sign of it,
since the job carries only the list; and counts beside the filters of
individuals that do not match what the analyses read.

The statistics are the result of the analysis of the statistics of each
individual, `individualChecks`, under the key the project gives it, which
the store finds in its cache (`docs/specs/core/store.md`, "The
individuals kept"). Its pass has the filters of the variants of the
project and no filter of individuals, as the owner decided on 26
September 2026, so every individual of the variants file is in it, in
the order of the file, and its numbers are counted over the variants the
analyses read.

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
  are in the project, or when it has one and the statistics are given.
  A known list is `null` when the filters remove no individual, as when
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
  kept of every filter after it.
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
`escaped` of the same module.

Seen in node 26.8.2, with popnei's release `js-v0.1.0-dev.2`, on 26
September 2026, on `e2e/fixtures/panel.nei`, 200 individuals and 1,200
variants: with the missing data filter of the variants at 0.05,
`calcPerIndividualStats` gave a `missingGtRate` from 0.0165 to 0.0434
and an `obsHetRate` from 0.318 to 0.397, none NaN; a threshold of 0.03 on
the missing rate kept 125 of the 200 individuals, and one of 0.35 on the
heterozygosity 48 of those 125, or one of 0.38 119 of them; and
`filterIndividuals` of those 48 after the missing data filter gave 48
individuals and the counts of the variants the filter gives with every
individual, 1,200 to 1,152.

## The TypeScript interface

In `src/core/individualsKept.ts`. The fields are `readonly` in the code,
as below. The statistics are taken by their shape, the three fields of
popnei's `PerIndividualStats` that the result of `individualChecks`
carries, `IndividualChecksResult` of `docs/specs/worker/protocol.md`, so
that this module names no type of an analysis.

```ts
import type { IndividualFilterKind } from "../worker/protocol.ts";
import type { Project } from "./project.ts";

/** The statistics of each individual, over the variants the filters keep. */
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
export function keptNoneReason(p: Project, kept: IndividualsKept | null): string | null;
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
- **Every individual without a called genotype** among the variants the
  filters keep, with a filter by heterozygosity: none is kept, whatever
  its threshold, and `keptNoneReason` gives the lock. Without that
  filter, they are kept.
- **A filter of the variants changed.** The statistics of the old
  filters are under another key, so the list is `needsStatistics` again
  until a new pass; the lists' counts stay known.

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
  threshold's `null`; statistics of another order of the individuals, a
  defect.
- **popnei's numbers**: the same function, given the statistics that
  popnei's release gives on `panel.nei` with the missing data filter at
  0.05, gives the 125, 48 and 119 individuals above, in the runner's
  tests in node, which the architecture asks for (`docs/architecture.md`,
  section 4, "What would show these choices wrong";
  `docs/specs/worker/runner.md`).
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
