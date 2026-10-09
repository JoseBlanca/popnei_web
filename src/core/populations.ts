/**
 * What the analyses per population share from stage 5, the diversity, the
 * distances between populations and the LD decay, which lock and name the
 * populations alike (docs/specs/core/project.md, "What the analyses per
 * population share from stage 5"): the reasons of a lock when the lists of
 * individuals, or the individuals kept, leave no population; the
 * populations under the minimum of individuals, and their words before a
 * Run; and the helpers the analyses and their panels call beside them.
 *
 * They are in a module of their own because `populationListsNeeds` needs
 * `individualsKept` of individualsKept.ts, which imports project.ts: in
 * project.ts, where they were until 1 October 2026, they made the two
 * modules import each other, and a constant at the top of either, made
 * with a function of the other, could have stopped the page at load. This
 * module imports both, and neither is to import it.
 */

import { individualsKept } from "./individualsKept.ts";
import type { IndividualsKept } from "./individualsKept.ts";
import {
  bothOf,
  cellShown,
  counted,
  escaped,
  grouped,
  identifierOf,
  individualsCheck,
  namesOf,
  populationsKept,
  populationsToRun,
  shown,
  shownDecimal,
  MAX_LISTED_POPULATIONS,
  MAX_NAMED,
} from "./project.ts";
import type { Project, SourceRead, TableRead } from "./project.ts";
import type { IndividualsTable, LeftOut, Pops } from "../worker/protocol.ts";

/** The reason of the lock of `populationsKeptNeeds`, when the `numKept`
    individuals kept have no population in the column `column`, which
    leaves every population, `emptied`, empty: "The 34 individuals kept
    have no population in popcat, so none of the 2 populations has an
    individual left. Loosen …", with one population by its name. */
export function allEmptiedText(
  numKept: number,
  column: string,
  emptied: readonly string[],
): string {
  const kept =
    numKept === 1
      ? "The one individual kept has"
      : `The ${counted(numKept, "individual")} kept have`;
  const [only] = emptied;
  const left =
    emptied.length === 1 && only !== undefined
      ? `${escaped(only)} has no individual left. ${loosenText(true)}`
      : `none of the ${counted(emptied.length, "population")} has an individual left. ${loosenText(false)}`;
  return `${kept} no population in ${shown(column)}, so ${left}`;
}

/** What to do about populations left empty, of one or of several. */
export function loosenText(one: boolean): string {
  return `Loosen the filters of individuals in the Variants step to keep ${one ? "it" : "them"}.`;
}

/** The populations the lists of individuals to keep and to remove leave,
    known from the project alone, since the thresholds on the individuals
    can only lower them; `null` when the individuals kept or the
    populations cannot be made. */
export function populationsByLists(p: Project): Pops | null {
  const kept = individualsKept(p, null);
  return kept === null
    ? null
    : (populationsKept(p, kept.byLists)?.pops ?? null);
}

/**
 * The reason when the lists to keep and to remove leave no individual
 * that has a population, known from the project alone: "The lists of
 * individuals to keep and to remove leave none of the individuals of
 * panel.nei that have a population in popcat, so no population is left.
 * Change the lists in the Variants step." `null` for the one population,
 * whose lists that leave nobody the store locks on first with the words
 * of `keptNoneReason`; when some population keeps an individual; when the
 * individuals kept cannot be made, which the store locks on first; and
 * for a project of association, as the functions of the populations of
 * stage 4 are.
 */
export function populationListsNeeds(p: Project): string | null {
  const left = populationsByLists(p);
  if (left === null || p.variants === null) {
    return null;
  }
  const column = populationsColumnOf(p);
  if (column === null || left.length > 0) {
    return null;
  }
  return `The lists of individuals to keep and to remove leave none of the individuals of ${escaped(p.variants.name)} that have a population in ${shown(column)}, so no population is left. Change the lists in the Variants step.`;
}

/**
 * The reason when the individuals kept, once known, leave no population,
 * in the words the owner decided at stop B on 27 September 2026, those of
 * `allEmptiedText`. `null` while the list is not known, when some
 * population keeps an individual, for the one population, and for a
 * project of association, as the functions of the populations of stage 4
 * are. A list that keeps no individual the store locks
 * on first, with the words of `keptNoneReason`, and never asks of this.
 */
export function populationsKeptNeeds(
  p: Project,
  kept: IndividualsKept,
): string | null {
  const list = kept.list.kind === "known" ? kept.list.individuals : null;
  const column = populationsColumnOf(p);
  if (list === null || column === null) {
    return null;
  }
  const left = populationsKept(p, list);
  if (left === null || left.pops.length > 0 || left.emptied.length === 0) {
    return null;
  }
  return allEmptiedText(list.length, column, left.emptied);
}

/** The column the populations are taken from, or `null` when no column
    is chosen, for the one population, without a metadata file or with the
    grouping `onePopulation`, and for a project of association, whose
    grouping has roles; an analysis per population, which is never given
    one, throws its own defect on it. */
export function populationsColumnOf(p: Project): string | null {
  switch (p.grouping.kind) {
    case "roles":
    case "onePopulation":
      return null;
    case "populations":
      return p.individuals === null ? null : p.grouping.column;
  }
}

/**
 * The populations `pops` with at least `minNumIndividuals` individuals,
 * `withMinimum`, and those with fewer, `under`, with their counts, each
 * in the order of `pops`. A population with fewer individuals than the
 * minimum reaches it at no variant, so it has no value in any statistic of
 * popnei that tests it; the diversity and the distances between
 * populations both find it here, so that they never disagree.
 */
export function populationsWithMinimum(
  pops: Pops,
  minNumIndividuals: number,
): { readonly withMinimum: Pops; readonly under: LeftOut } {
  const withMinimum = pops.filter(
    ([, individuals]) => individuals.length >= minNumIndividuals,
  );
  const under = pops
    .filter(([, individuals]) => individuals.length < minNumIndividuals)
    .map(([pop, individuals]) =>
      Object.freeze([pop, individuals.length] as const),
    );
  return Object.freeze({
    withMinimum: Object.freeze(withMinimum),
    under: Object.freeze(under),
  });
}

/**
 * The words of the populations under the minimum of individuals, which
 * the ready state of the panels of the diversity and of the distances
 * shows: "p3 has 12 individuals, fewer than the minimum of 20, " and the
 * consequence of one, `consequence.one`; "p3 and p5 have 12 and 8
 * individuals, fewer than the minimum of 20, " and that of several,
 * `consequence.many`; past three populations, named as `namesOf` names
 * them, with no counts, "p3, p5 and 2 more have fewer individuals than
 * the minimum of 20, ". An empty `under` is a defect, thrown.
 */
export function underMinimumText(
  under: LeftOut,
  minNumIndividuals: number,
  consequence: { readonly one: string; readonly many: string },
): string {
  const minimum = `the minimum of ${grouped(minNumIndividuals)}`;
  const [only] = under;
  if (only === undefined) {
    throw defect("underMinimumText was given no population.");
  }
  if (under.length === 1) {
    const [pop, numIndividuals] = only;
    return `${namesOf([pop])} has ${counted(numIndividuals, "individual")}, fewer than ${minimum}, ${consequence.one}`;
  }
  const names = namesOf(under.map(([pop]) => pop));
  // The counts before the minimum, so that they are not read as more
  // minimums.
  const fewer =
    under.length <= MAX_NAMED
      ? `${bothOf(under.map(([, numIndividuals]) => grouped(numIndividuals)))} individuals, fewer than ${minimum}`
      : `fewer individuals than ${minimum}`;
  return `${names} have ${fewer}, ${consequence.many}`;
}

// The box of the individuals file of popgen2.html (the project spec,
// "The counts per population on popgen2.html").

/**
 * The column of the populations the page chooses when an individuals file
 * is read: the first column after the names one of whose cells is a
 * text, and whose different values that are not missing, as `cellShown`
 * writes them, are 1 to `MAX_LISTED_POPULATIONS`; `null` when none is. A
 * column of numbers or of booleans, which table_io gives as such, is
 * never chosen, and a table read as texts alone, before table_io, gives
 * its first column of 1 to 20 values.
 */
export function defaultPopulationsColumn(read: TableRead): string | null {
  const decimal = shownDecimal(read);
  const { columns, rows } = read.table;
  for (const [index, column] of columns.entries()) {
    if (index === 0 || !rows.some((row) => typeof row[index] === "string")) {
      continue;
    }
    const numValues = valuesOf(rows, index, decimal, MAX_LISTED_POPULATIONS);
    if (numValues >= 1 && numValues <= MAX_LISTED_POPULATIONS) {
      return column;
    }
  }
  return null;
}

/**
 * The number of different values of the column at `index` of `rows` that
 * are not missing, compared as `cellShown` writes them with `decimal`;
 * once past `bound`, `bound + 1`, the walk stopped there, since a column
 * of 10,000 names need not be walked to its end to be too many.
 */
function valuesOf(
  rows: IndividualsTable["rows"],
  index: number,
  decimal: "." | ",",
  bound: number,
): number {
  const values = new Set<string>();
  for (const row of rows) {
    const cell = row[index];
    if (cell === undefined) {
      throw defect(
        `a row of the individuals table has no cell ${String(index)}.`,
      );
    }
    const text = cellShown(cell, decimal);
    if (text === null) {
      continue;
    }
    values.add(text);
    if (values.size > bound) {
      break;
    }
  }
  return values.size;
}

/**
 * The columns the list "Column of the populations" of popgen2.html offers:
 * every column of the table but the first, which names the individuals,
 * and but a column of booleans, every cell of which that is not missing
 * is `true` or `false`, one at least; in the order of the table. The
 * owner decided on 9 October 2026 that a column of booleans is no column
 * of populations.
 */
export function populationColumnChoices(read: TableRead): readonly string[] {
  const rows = read.table.rows;
  return read.table.columns.filter(
    (_, index) => index > 0 && !isBooleanColumn(rows, index),
  );
}

/** Whether every cell of the column at `index` of `rows` that is not
    missing is `true` or `false`, and one is at least. */
function isBooleanColumn(
  rows: IndividualsTable["rows"],
  index: number,
): boolean {
  let found = false;
  for (const row of rows) {
    const cell = row[index];
    if (cell === undefined || cell === null) {
      continue;
    }
    if (typeof cell !== "boolean") {
      return false;
    }
    found = true;
  }
  return found;
}

/** A population of the box of the individuals file of popgen2.html and
    its individuals kept, or null while the list of the individuals kept
    is not known. */
export interface PopulationCount {
  /** The name of the population, as `cellShown` writes its cell. */
  readonly pop: string;
  /** Its individuals the filters keep, 0 for one they all remove; null
      while the list of the individuals kept is not known. */
  readonly kept: number | null;
}

/** The individuals kept that have no population, and why. */
export interface Unclassified {
  /** How many of the individuals kept have no population. */
  readonly kept: number;
  /** How many of them are in the individuals file with an empty cell in
      the column. */
  readonly missingCell: number;
  /** Those of them not in the individuals file, in the order of the
      variants file. */
  readonly notInFile: readonly string[];
}

/** What the box of the individuals file of popgen2.html counts. */
export interface PopulationCounts {
  /** The column the populations are taken from, a column of the table
      but its first, or null: no column chosen, or none of that name. */
  readonly column: string | null;
  /** The different values of the column in the file, missing ones left
      out; 0 with no column. */
  readonly numValues: number;
  /** numValues above MAX_LISTED_POPULATIONS: no population, and the
      unclassified not counted. */
  readonly tooMany: boolean;
  /** Whether the variants file is read; with false, populations and
      notInFile are empty, and unclassified, rowsNotInVariants and
      noneInFile null. */
  readonly variantsRead: boolean;
  /** Whether the list of the individuals kept is known; false before the
      variants file is read. */
  readonly known: boolean;
  /** The populations with an individual in both files, in the order of
      `populationsToRun`, the order each first appears in the file. */
  readonly populations: readonly PopulationCount[];
  /** The unclassified kept; null while the list is not known, and with
      tooMany. */
  readonly unclassified: Unclassified | null;
  /** The individuals of the variants file not in the individuals file,
      before the filters, in the order of the variants file. */
  readonly notInFile: readonly string[];
  /** The rows of the individuals file whose individual the variants file
      does not have; null before the variants file is read. */
  readonly rowsNotInVariants: number | null;
  /** None of the individuals of the variants file in the individuals
      file, with the first name of each; null otherwise. */
  readonly noneInFile: {
    readonly firstOfVariants: string;
    readonly firstOfFile: string;
  } | null;
}

/**
 * What the box of the individuals file of popgen2.html counts, from the
 * project and the individuals kept that the store works out, `kept`,
 * `null` exactly when the variants file is not read; `null` with no
 * individuals file read (the project spec, "The counts per population on
 * popgen2.html"). The same frozen object as the call before when the
 * table, its decimal mark, the column and the read of the variants file
 * are the same objects and the list of the individuals kept holds the
 * same individuals in the same order, or is unknown, or removes nobody,
 * as the list before: the store makes a new list at every change of the
 * project, an arrow key on a threshold among them.
 */
export function populationCounts(
  p: Project,
  kept: IndividualsKept | null,
): PopulationCounts | null {
  const read = p.individuals?.read;
  if (read?.kind !== "read") {
    return null;
  }
  const decimal = shownDecimal(read);
  const column = countedColumn(p, read);
  const variantsRead =
    p.variants?.read.kind === "read" ? p.variants.read : null;
  const list = keptListOf(kept);
  const last = lastCounts;
  if (
    last !== null &&
    last.table === read.table &&
    last.decimal === decimal &&
    last.column === column &&
    last.variantsRead === variantsRead &&
    sameList(last.list, list)
  ) {
    return last.counts;
  }
  const counts = countPopulations(p, read, column, variantsRead, list);
  lastCounts = {
    table: read.table,
    decimal,
    column,
    variantsRead,
    list,
    counts,
  };
  return counts;
}

/** The individuals kept as the counts compare them: not known; known,
    the filters removing nobody; or known, the list of those kept. */
type CountedList =
  | { readonly kind: "unknown" }
  | { readonly kind: "everyone" }
  | { readonly kind: "list"; readonly individuals: readonly string[] };

/** The last answer of `populationCounts`, with what it was made from. The
    one state of this module: the store makes a new list of the
    individuals kept at every change of the project, which no memo keyed
    by the list's reference would find again (the project spec, "The
    counts per population on popgen2.html"). Set at the first call, so
    that this module makes nothing when it loads. */
let lastCounts: {
  readonly table: IndividualsTable;
  readonly decimal: "." | ",";
  readonly column: string | null;
  readonly variantsRead: SourceRead | null;
  readonly list: CountedList;
  readonly counts: PopulationCounts;
} | null = null;

/** The list of `kept` as the counts compare it. */
function keptListOf(kept: IndividualsKept | null): CountedList {
  if (kept === null || kept.list.kind === "needsStatistics") {
    return { kind: "unknown" };
  }
  const individuals = kept.list.individuals;
  return individuals === null
    ? { kind: "everyone" }
    : { kind: "list", individuals };
}

/** Whether two lists of the individuals kept give the same counts: both
    unknown, both removing nobody, or the same individuals in the same
    order, compared one by one. */
function sameList(before: CountedList, now: CountedList): boolean {
  if (before.kind === "list" && now.kind === "list") {
    return (
      before.individuals === now.individuals ||
      (before.individuals.length === now.individuals.length &&
        before.individuals.every(
          (individual, index) => now.individuals[index] === individual,
        ))
    );
  }
  return before.kind === now.kind;
}

/** The column of the grouping of `p` when it is a column of the table of
    `read` but its first, which names the individuals; null otherwise. */
function countedColumn(p: Project, read: TableRead): string | null {
  if (p.grouping.kind !== "populations" || p.grouping.column === null) {
    return null;
  }
  return read.table.columns.indexOf(p.grouping.column) > 0
    ? p.grouping.column
    : null;
}

/** The counts of `populationCounts`, worked out anew. */
function countPopulations(
  p: Project,
  read: TableRead,
  column: string | null,
  variantsRead: Extract<SourceRead, { readonly kind: "read" }> | null,
  list: CountedList,
): PopulationCounts {
  const numValues =
    column === null
      ? 0
      : valuesOf(
          read.table.rows,
          read.table.columns.indexOf(column),
          shownDecimal(read),
          Number.POSITIVE_INFINITY,
        );
  const tooMany = numValues > MAX_LISTED_POPULATIONS;
  const check = individualsCheck(p);
  if (variantsRead === null || check === null) {
    return Object.freeze({
      column,
      numValues,
      tooMany,
      variantsRead: false,
      known: false,
      populations: Object.freeze([]),
      unclassified: null,
      notInFile: Object.freeze([]),
      rowsNotInVariants: null,
      noneInFile: null,
    });
  }
  const keptIndividuals =
    list.kind === "unknown"
      ? null
      : list.kind === "everyone"
        ? variantsRead.individuals
        : list.individuals;
  const toRun = column === null || tooMany ? [] : (populationsToRun(p) ?? []);
  return Object.freeze({
    column,
    numValues,
    tooMany,
    variantsRead: true,
    known: keptIndividuals !== null,
    populations: countsOfPopulations(p, toRun, list),
    unclassified:
      keptIndividuals === null || tooMany
        ? null
        : unclassifiedOf(keptIndividuals, toRun, column, check.missing),
    notInFile: Object.freeze([...check.missing]),
    rowsNotInVariants: check.ignoredRows,
    noneInFile: noneInFileOf(check.found, variantsRead.individuals, read),
  });
}

/** Each population of `toRun`, in its order, with its individuals kept by
    `list`, 0 for one the list empties, or null while it is unknown. */
function countsOfPopulations(
  p: Project,
  toRun: Pops,
  list: CountedList,
): readonly PopulationCount[] {
  if (list.kind === "unknown") {
    return Object.freeze(
      toRun.map(([pop]) => Object.freeze({ pop, kept: null })),
    );
  }
  const narrowed = populationsKept(
    p,
    list.kind === "everyone" ? null : list.individuals,
  );
  const keptOfPop = new Map<string, number>(
    (narrowed?.pops ?? []).map(([pop, individuals]) => [
      pop,
      individuals.length,
    ]),
  );
  return Object.freeze(
    toRun.map(([pop]) => Object.freeze({ pop, kept: keptOfPop.get(pop) ?? 0 })),
  );
}

/** The unclassified among `kept`: those in none of the populations
    `toRun`, each with an empty cell in `column` or not in the file, one
    of `notInFile`; with no column, all of them, by no cause. */
function unclassifiedOf(
  kept: readonly string[],
  toRun: Pops,
  column: string | null,
  notInFile: readonly string[],
): Unclassified {
  if (column === null) {
    return Object.freeze({
      kept: kept.length,
      missingCell: 0,
      notInFile: Object.freeze([]),
    });
  }
  const classified = new Set(toRun.flatMap(([, individuals]) => individuals));
  const outside = new Set(notInFile);
  let missingCell = 0;
  const keptNotInFile: string[] = [];
  for (const individual of kept) {
    if (classified.has(individual)) {
      continue;
    }
    if (outside.has(individual)) {
      keptNotInFile.push(individual);
    } else {
      missingCell += 1;
    }
  }
  return Object.freeze({
    kept: missingCell + keptNotInFile.length,
    missingCell,
    notInFile: Object.freeze(keptNotInFile),
  });
}

/** The first name of each file when none of the `found` individuals of
    the variants file is in the individuals file, for the warning; null
    when some is. */
function noneInFileOf(
  found: number,
  variantsIndividuals: readonly string[],
  read: TableRead,
): PopulationCounts["noneInFile"] {
  const [firstOfVariants] = variantsIndividuals;
  const [firstRow] = read.table.rows;
  if (found > 0 || firstOfVariants === undefined || firstRow === undefined) {
    return null;
  }
  return Object.freeze({
    firstOfVariants,
    firstOfFile: identifierOf(firstRow[0]),
  });
}

/** An error for a state the code makes impossible. */
function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
