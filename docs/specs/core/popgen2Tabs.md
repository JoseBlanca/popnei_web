# The tabs of the analyses of popgen2.html, greyed and why

`analysisTabs` says, from the project and the individuals kept, which of
the three tabs of the analyses of `popgen2.html`, PCA, Populations and
Distances, is greyed, and why, as a reason with the names and the counts
its words need. The words are the screen's
(`docs/specs/steps/popgen2-pca.md`, "Its words"). It is a pure function
of core, so that every case is tested in node with no browser
(`docs/designs/analyses-pca.md`, "What WCAG 2.2 asks, and how (b) meets
it", the last paragraph). Written on 9 October 2026; no code yet. It
develops section 7 of `docs/architecture.md`, as revised that day, and
depends on `docs/specs/core/project.md` for the project and the reads of
its files, and on `populationCounts` of `src/core/populations.ts`
(`docs/specs/core/project.md`, "The counts per population on
popgen2.html").

## What it does

A tab greyed does not open, and its reason is its tooltip and its
description for a screen reader, so a wrong reason sends the user to
fix what is not broken, and a tab greyed by mistake hides an analysis
that could run. The rules, decided by the owner on 9 October 2026
(answers 6 and 7 of the design):

- **PCA and Populations** are greyed while no variants file is open:
  none in the project; one whose read is `pending`, being opened; or
  one whose read `failed`. A variants file is open once its read is
  `read`, the moment its box shows its individuals and its ploidy,
  before the one pass ends.
- **Distances** is greyed for the same reasons first; then while the
  populations with an individual in the variants file are fewer than
  two; then, once the list of the individuals kept is known, while the
  populations that keep an individual are fewer than two. The
  unclassified are no population here. The populations are those of
  `populationCounts(p, kept)`: its `populations`, each with an
  individual in both files, and, when `known`, its `kept` of each.

The reasons of Distances, in the order they are asked:

| the project | the reason |
|---|---|
| no individuals file | `noIndividuals` |
| the individuals file read `pending` | `individualsReading`, with its name |
| the individuals file refused or failed | `individualsFailed`, with its name |
| the individuals file `notGiven`, named by a project file that did not hold it, which `popgen2.html`, opening no project file, never has | `individualsFailed`, with its name: the user opens the file again, as after a failed read |
| read, and no column of the populations | `noColumn` |
| read, the column of more values than a column of populations can have, `tooMany` | `tooManyValues`, with the column and its number of values |
| read, fewer than two populations with an individual in the variants file | `fewPopulations`, with the column, the number, 0 or 1, and the name of the variants file |
| the list known, fewer than two populations keep an individual | `fewKept`, with the number, 0 or 1 |

With a threshold of the individuals on and the one pass not ended, the
list is not known, and the tab follows the populations before the
thresholds; a Distances run then would say that the filters keep fewer
than two, when it is built.

## The TypeScript interface

The three tabs, by id:

```ts
export type AnalysisTabId = "pca" | "populations" | "distances";
```

Why one is greyed, each with what its words need; `name` is the file's
name as the project holds it:

```ts
export type TabGreyed =
  | { readonly kind: "noVariants" }
  | { readonly kind: "variantsOpening"; readonly name: string }
  | { readonly kind: "variantsFailed"; readonly name: string }
  | { readonly kind: "noIndividuals" }
  | { readonly kind: "individualsReading"; readonly name: string }
  | { readonly kind: "individualsFailed"; readonly name: string }
  | { readonly kind: "noColumn" }
  | { readonly kind: "tooManyValues"; readonly column: string; readonly numValues: number }
  | {
      readonly kind: "fewPopulations";
      readonly column: string;
      readonly numPopulations: 0 | 1;
      readonly variantsName: string;
      readonly individualsName: string;
      /** No individual of the variants file is in the individuals file. */
      readonly noneInFile: boolean;
    }
  | { readonly kind: "fewKept"; readonly numPopulations: 0 | 1 };
```

Each tab's reason, or `null` when it is not greyed. The same frozen
object as the call before when the reasons are the same, so that the
row of tabs, which reads it at every change of the store, is not drawn
again for a threshold moved:

```ts
export function analysisTabs(
  p: Project,
  kept: IndividualsKept | null,
): Readonly<Record<AnalysisTabId, TabGreyed | null>>;
```

`kept` is the store's `individualsKept`.

## The cases

- **Another variants file being opened** over one that was open: the
  read of the new load is `pending`, so the three tabs are greyed with
  `variantsOpening` and the new name, whichever tab is shown.
- **A column of the populations of more than 20 values**:
  `tooManyValues`, since `populationCounts` gives `tooMany` and no
  populations. A column the list does not offer gives `column` null, and
  `noColumn`.
- **An individuals file of names none of which are in the variants
  file**: `fewPopulations` with 0 and `noneInFile` true, from
  `noneInFile` of `PopulationCounts`, whose words ask the user to check
  the names; names that match, with every cell of the column empty:
  `noneInFile` false, whose words ask for another column.
- **A threshold that keeps no individual**: `fewKept` with 0; the PCA
  and Populations are not greyed, since their own locks say so.

## How it is verified

With Vitest, on frozen projects made with the commands of
`docs/specs/core/project.md`, `panel.nei` of 200 individuals and
`panel_pops.csv`, whose column `popcat` gives p0 48, p2 84 and p1 68:

- No variants file: the three `noVariants`. `panel.nei` pending:
  `variantsOpening` with "panel.nei"; failed: `variantsFailed`.
- `panel.nei` read, no individuals file: PCA and Populations `null`,
  Distances `noIndividuals`; `panel_pops.csv` pending:
  `individualsReading`; refused: `individualsFailed`; `notGiven`, made
  by `parseProject` from a project file: `individualsFailed`.
- Read, `popcat` chosen, `kept` `null`: the three `null`. None chosen:
  `noColumn`. A column of one value for every individual:
  `fewPopulations` with 1 and "panel.nei".
- A list of the individuals kept that keeps only individuals of p0:
  `fewKept` with 1; one that keeps none: `fewKept` with 0.
- The same inputs twice: the same object, compared with `toBe`; a list
  kept that changes but leaves the same reasons: the same object.

## When Distances is built on popgen2.html

Core has two rules for "fewer than two populations" today: Distances'
tab here, through `populationCounts` of `src/core/populations.ts`,
which takes no column of booleans as a column of populations; and the
lock of the distances of the old page, `popDists.needs` of
`src/core/analyses/popDists.ts`, through `populationsColumnOf`, which
looks at no type. On a column of booleans the tab would be greyed while
the analysis could run. When Distances is built on `popgen2.html`, its
tab and the lock of its Run call one function of `populations.ts` for
"fewer than two populations", so that a tab is never greyed while its
analysis could run, nor open while its Run is locked for that reason.
Noted on 9 October 2026, by the review of the first work package of
`docs/plans/analyses-pca.md`; nothing changes in the code for it now.

## Not in this spec

- The words of each reason, and the greyed tab itself, its keys and its
  attribute: `docs/specs/steps/popgen2-pca.md`.
- The locks of the PCA once its tab opens: `docs/specs/analyses/pca.md`.
