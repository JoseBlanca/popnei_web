/**
 * The project, everything the user has set in one application, and the
 * commands that change it, the records that put into it what the workers
 * read, what every analysis needs of it, and the validation of a project
 * file (docs/specs/core/project.md).
 *
 * The project is one plain value, never changed in place, that holds only
 * what JSON holds. It names each file by its load id, a random name the
 * page gives each pick of a file, new at every pick.
 */

import { canonical } from "./keys.ts";
import type { JsonObject, JsonValue } from "./keys.ts";
import type { Result } from "./result.ts";
import type {
  Cell,
  ColumnType,
  CsvFound,
  CsvOptions,
  IndividualFilter,
  IndividualFilterKind,
  IndividualsFileError,
  IndividualsTable,
  RunError,
  VariantFilter,
  VariantFilterKind,
} from "../worker/protocol.ts";

/** The two applications, population genetics and association. */
export type AppId = "popgen" | "gwas";

/**
 * The id of an analysis, a literal of its module, "diversity", "pca". A
 * string and not a union of the ids, so that adding an analysis adds its
 * module and nothing here (docs/architecture.md, section 4).
 */
export type AnalysisId = string;

/** Everything the user has set in one application. */
export interface Project {
  /** The application the project is of. */
  readonly app: AppId;
  /** The variants file, or `null` before one is loaded. */
  readonly variants: VariantSource | null;
  /** The filters of the variants, at most one of each kind, in the order
      the user gave, which changes the result. */
  readonly filters: readonly VariantFilter[];
  /** The filters of the individuals, at most one of each kind, in the
      fixed order keep, remove, missing_data, obs_het. */
  readonly individualFilters: readonly IndividualFilter[];
  /** The individuals file, or `null` when there is none. */
  readonly individuals: IndividualsSource | null;
  /** The populations, or the roles of the columns in association. */
  readonly grouping: Grouping;
  /** The options of each analysis the user has set, one entry per
      analysis; an analysis with no entry runs with its defaults. */
  readonly analyses: readonly AnalysisOptions[];
  /** What an opened project file said of the variants file it was made
      with and of its results, or `null`. */
  readonly reference: Reference | null;
}

/** The variants file of one load. */
export interface VariantSource {
  /** The load id: 16 random bytes as 32 lower case hexadecimal digits. */
  readonly fileId: string;
  /** The name of the file, as the browser gives it; in no key. */
  readonly name: string;
  /** The size of the file in bytes; in no key. */
  readonly size: number;
  /** The format of the file. */
  readonly format: "vcf" | "nei";
  /** How a VCF is read, its ploidy a whole number from 1 to 255; `null`
      for a `.nei`. */
  readonly readOptions: {
    readonly ploidy: number;
    readonly onlyPassed: boolean;
  } | null;
  /** What the calculation worker read of the file. */
  readonly read: SourceRead;
}

/** What the calculation worker read of the variants file. */
export type SourceRead =
  /** Not read yet. */
  | { readonly kind: "pending" }
  /** Read: its individuals in the order of the file, its ploidy, and its
      number of variants, `null` until a first pass has counted them. */
  | {
      readonly kind: "read";
      readonly individuals: readonly string[];
      readonly ploidy: number;
      readonly numVars: number | null;
    }
  /** Could not be read. */
  | { readonly kind: "failed"; readonly error: SourceError };

/**
 * Why the variants file could not be read: popnei refused the file, or
 * the worker failed before popnei answered, because it could not start,
 * it crashed, or the file could not be read again.
 */
export type SourceError =
  /** popnei refused the file, with its message. */
  | { readonly kind: "popnei"; readonly message: string }
  /** The worker failed. */
  | { readonly kind: "worker"; readonly error: RunError };

/** The individuals file of one load. */
export interface IndividualsSource {
  /** The load id: 16 random bytes as 32 lower case hexadecimal digits. */
  readonly fileId: string;
  /** The name of the file, as the browser gives it. */
  readonly name: string;
  /** How a CSV or TSV is read; `null` for an xlsx. */
  readonly csv: CsvOptions | null;
  /** What the light worker read of the file. */
  readonly read: IndividualsRead;
}

/** What the light worker read of the individuals file. */
export type IndividualsRead =
  /** Not read yet. */
  | { readonly kind: "pending" }
  /** Read: the table, the type of each of its columns, and what the
      options that were `"auto"` found, `null` for an xlsx. */
  | {
      readonly kind: "read";
      readonly table: IndividualsTable;
      readonly columns: readonly ColumnType[];
      readonly found: CsvFound | null;
    }
  /** Could not be read: the reader refused the file, or the worker
      failed. */
  | {
      readonly kind: "failed";
      readonly error:
        | IndividualsFileError
        | { readonly kind: "worker"; readonly error: RunError };
    };

/**
 * The grouping of the individuals. A column is named by its name in the
 * header, so that it is found again when the file is loaded again with its
 * columns in another order.
 */
export type Grouping =
  /** Population genetics: the column that defines the populations, `null`
      when every individual is in one population. */
  | { readonly kind: "populations"; readonly column: string | null }
  /** Association: the role of each column. */
  | {
      readonly kind: "roles";
      readonly roles: readonly (readonly [
        column: string,
        role: "trait" | "covariate" | "ignored",
      ])[];
    };

/**
 * The options of an analysis the user has set. The options of the
 * analyses are a list of these pairs, not an object with a field per
 * analysis, because the JSON of a project file can hold a field of any
 * name, `__proto__` among them.
 */
export interface AnalysisOptions {
  /** The analysis. */
  readonly analysis: AnalysisId;
  /** Its options, whole, the defaults filled in. */
  readonly options: JsonObject;
}

/**
 * What an opened project file says of the variants file it was made with
 * and of the results it had. Its `variants.fileId` is the id of a load of
 * another session, and names no file of this one.
 */
export interface Reference {
  /** The identity of the file: name, size, format, individuals, ploidy,
      number of variants. */
  readonly variants: VariantSource;
  /** The version of popnei, from the header of the project file. */
  readonly popneiVersion: string;
  /** The version of the application, from the header. */
  readonly appVersion: string;
  /** The check numbers of each analysis. */
  readonly checks: readonly Check[];
}

/** The check numbers of one analysis, saved in the project file. */
export interface Check {
  /** The analysis. */
  readonly analysis: AnalysisId;
  /** The numbers saved; `null` where popnei gave NaN. */
  readonly numbers: readonly (number | null)[];
  /** The analysis's key version when it was run, a whole number. */
  readonly keyVersion: number;
  /** The fingerprint of its settings in the file, 64 lower case
      hexadecimal digits; made when the file is opened, never saved. */
  readonly settings: string;
}

/**
 * What is wrong with the project part of a project file. `path` is the
 * place of the field in the project, `["filters", 1, "maxAllowedMaf"]`;
 * the text the user reads names it in words.
 */
export type ProjectError =
  /** The file is of the other application. */
  | { readonly kind: "otherApp"; readonly found: AppId }
  /** The file names an analysis this version does not know. */
  | { readonly kind: "unknownAnalysis"; readonly id: string }
  /** A field whose value is not what `expected` says, or that the type
      does not have. */
  | {
      readonly kind: "wrongValue";
      readonly path: readonly (string | number)[];
      readonly expected: string;
    }
  /** A second filter of the kind `filter` in one list. */
  | {
      readonly kind: "twoFiltersOfAKind";
      readonly path: readonly (string | number)[];
      readonly filter: string;
    }
  /** A table and the types of its columns that do not agree: a row not as
      long as the header, a type per column, a binary type whose values
      are not those of its column. */
  | {
      readonly kind: "inconsistentTable";
      readonly path: readonly (string | number)[];
      readonly expected: string;
    };

/** The place of a field in the project, `["filters", 1, "maxAllowedMaf"]`. */
export type FieldPath = readonly (string | number)[];

/** The order the filters of the individuals are kept in. */
export const INDIVIDUAL_FILTER_ORDER: readonly IndividualFilterKind[] = [
  "keep",
  "remove",
  "missing_data",
  "obs_het",
];

/** The largest ploidy of a VCF that popnei's `openVcf` accepts. */
export const MAX_PLOIDY = 255;

/** The largest `maxDist` of the LD filter, 2^53 − 1, which popnei's
    `filterByLd` accepts. */
export const MAX_LD_DIST = Number.MAX_SAFE_INTEGER;

/** A new, empty project of the application `app`. */
export function emptyProject(app: AppId): Project {
  return {
    app,
    variants: null,
    filters: [],
    individualFilters: [],
    individuals: null,
    grouping:
      app === "popgen"
        ? { kind: "populations", column: null }
        : { kind: "roles", roles: [] },
    analyses: [],
    reference: null,
  };
}

/**
 * Freezes a project deeply, so that a write into it throws, and gives it
 * back. A part already frozen is taken as frozen with everything it
 * holds and is not walked again, so freezing the project a command gave
 * costs only the parts the command made. The store freezes every project
 * it takes, and the memo of the keys trusts only frozen objects.
 */
export function freezeProject(p: Project): Project {
  freezeDeeply(p);
  return p;
}

function freezeDeeply(value: unknown): void {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return;
  }
  const fields: readonly unknown[] = Object.values(value);
  for (const field of fields) {
    freezeDeeply(field);
  }
  // Frozen last, so that a frozen part always holds only frozen parts.
  Object.freeze(value);
}

// The checks of each value, which the commands and parseProject share, so
// that a project a command made always opens again from its project file.
// Each gives the first thing wrong, or null.

function wrongValue(path: FieldPath, expected: string): ProjectError {
  return { kind: "wrongValue", path, expected };
}

function inconsistentTable(path: FieldPath, expected: string): ProjectError {
  return { kind: "inconsistentTable", path, expected };
}

function thresholdError(value: number, path: FieldPath): ProjectError | null {
  return Number.isFinite(value) && value >= 0 && value <= 1
    ? null
    : wrongValue(path, "a number from 0 to 1");
}

function wholeNumberError(
  value: number,
  min: number,
  max: number,
  path: FieldPath,
): ProjectError | null {
  return Number.isInteger(value) && value >= min && value <= max
    ? null
    : wrongValue(path, `a whole number from ${String(min)} to ${String(max)}`);
}

/** Checks the thresholds of a filter of the variants, from 0 to 1, and
    its `maxDist`, a whole number from 1 to 2^53 − 1. */
export function variantFilterError(
  filter: VariantFilter,
  path: FieldPath,
): ProjectError | null {
  switch (filter.kind) {
    case "missing_data":
      return thresholdError(filter.maxAllowedMissingRate, [
        ...path,
        "maxAllowedMissingRate",
      ]);
    case "maf":
      return thresholdError(filter.maxAllowedMaf, [...path, "maxAllowedMaf"]);
    case "obs_het":
      return thresholdError(filter.maxAllowedObsHet, [
        ...path,
        "maxAllowedObsHet",
      ]);
    case "ld":
      return (
        thresholdError(filter.maxAllowedR2, [...path, "maxAllowedR2"]) ??
        wholeNumberError(filter.maxDist, 1, MAX_LD_DIST, [...path, "maxDist"])
      );
  }
}

/** Checks the threshold of a filter of the individuals, from 0 to 1. A
    list of individuals is checked by `projectNeeds`, not here. */
export function individualFilterError(
  filter: IndividualFilter,
  path: FieldPath,
): ProjectError | null {
  switch (filter.kind) {
    case "keep":
    case "remove":
      return null;
    case "missing_data":
      return thresholdError(filter.maxAllowedMissingRate, [
        ...path,
        "maxAllowedMissingRate",
      ]);
    case "obs_het":
      return thresholdError(filter.maxAllowedObsHet, [
        ...path,
        "maxAllowedObsHet",
      ]);
  }
}

const LOAD_ID = /^[0-9a-f]{32}$/;

/** Checks a load id: 32 lower case hexadecimal digits. */
export function loadIdError(
  fileId: string,
  path: FieldPath,
): ProjectError | null {
  return LOAD_ID.test(fileId)
    ? null
    : wrongValue(path, "32 lower case hexadecimal digits");
}

/** A load of the variants file, what the page gives before it is read. */
export type VariantLoad = Omit<VariantSource, "read">;

/** Checks a load of the variants file: its load id, a finite size, and
    read options for a VCF, with a ploidy from 1 to 255, and none for a
    `.nei`. */
export function variantLoadError(
  load: VariantLoad,
  path: FieldPath,
): ProjectError | null {
  const idError = loadIdError(load.fileId, [...path, "fileId"]);
  if (idError !== null) {
    return idError;
  }
  if (!Number.isFinite(load.size)) {
    return wrongValue([...path, "size"], "a number");
  }
  const optionsPath = [...path, "readOptions"];
  if (load.format === "nei") {
    return load.readOptions === null
      ? null
      : wrongValue(optionsPath, "none, as a .nei file has no read options");
  }
  if (load.readOptions === null) {
    return wrongValue(optionsPath, "the read options of a VCF");
  }
  return wholeNumberError(load.readOptions.ploidy, 1, MAX_PLOIDY, [
    ...optionsPath,
    "ploidy",
  ]);
}

/** Checks that a grouping is of the application `app`: the populations
    in population genetics, the roles of the columns in association. */
export function groupingError(
  grouping: Grouping,
  app: AppId,
  path: FieldPath,
): ProjectError | null {
  if (app === "popgen") {
    return grouping.kind === "populations"
      ? null
      : wrongValue([...path, "kind"], "the column of the populations");
  }
  return grouping.kind === "roles"
    ? null
    : wrongValue([...path, "kind"], "the roles of the columns");
}

/**
 * Checks that the table of the individuals file and the types of its
 * columns agree: every row as long as the header, one type per column,
 * the first `identifier` and no other, and a binary type whose `one` and
 * `zero` are the two distinct values of its column that are not missing.
 * `path` is that of the read that holds them.
 */
export function tableError(
  table: IndividualsTable,
  columns: readonly ColumnType[],
  path: FieldPath,
): ProjectError | null {
  for (const [row, cells] of table.rows.entries()) {
    if (cells.length !== table.columns.length) {
      return inconsistentTable(
        [...path, "table", "rows", row],
        "a row with one cell per column of the header",
      );
    }
  }
  if (columns.length !== table.columns.length) {
    return inconsistentTable(
      [...path, "columns"],
      "one type per column of the table",
    );
  }
  for (const [index, type] of columns.entries()) {
    const typePath = [...path, "columns", index];
    if ((index === 0) !== (type.kind === "identifier")) {
      return inconsistentTable(
        typePath,
        "the type identifier for the first column and for no other",
      );
    }
    if (
      type.kind === "binary" &&
      !isBinaryOf(type, valuesOfColumn(table, index))
    ) {
      return inconsistentTable(
        typePath,
        "a binary type whose two values are the two values of its column",
      );
    }
  }
  return null;
}

/** The distinct cells of a column that are not missing, compared
    exactly. */
function valuesOfColumn(
  table: IndividualsTable,
  index: number,
): (string | number | boolean)[] {
  const values: (string | number | boolean)[] = [];
  for (const row of table.rows) {
    const cell: Cell | undefined = row[index];
    if (cell !== undefined && cell !== null && !values.includes(cell)) {
      values.push(cell);
    }
  }
  return values;
}

function isBinaryOf(
  type: {
    readonly one: string | number | boolean;
    readonly zero: string | number | boolean;
  },
  values: readonly (string | number | boolean)[],
): boolean {
  return (
    values.length === 2 &&
    type.one !== type.zero &&
    values.includes(type.one) &&
    values.includes(type.zero)
  );
}

// The commands.

function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}

/** Throws a defect when a command is given a value parseProject would
    refuse in its place. */
function refuse(command: string, error: ProjectError | null): void {
  if (error !== null) {
    throw defect(
      `${command} was given a value a project file could not hold: ${JSON.stringify(error)}.`,
    );
  }
}

/** Whether two values are equal, as the canonical form writes them. */
function same(a: unknown, b: unknown): boolean {
  return canonical(a, null) === canonical(b, null);
}

/** Puts a new load of the variants file, pending. Everything else is
    kept, the reference of an opened project file among it. A load whose
    id and fields are already there gives `p` itself; a load whose id is
    there with another field is a defect, since a new read of a file is a
    new load, with a new load id. */
export function loadVariants(p: Project, source: VariantLoad): Project {
  const load = copyVariantLoad(source);
  const variants = p.variants;
  if (variants?.fileId === load.fileId) {
    if (same(copyVariantLoad(variants), load)) {
      return p;
    }
    throw defect(
      `loadVariants was given the load id ${load.fileId}, already there, with other fields.`,
    );
  }
  refuse("loadVariants", variantLoadError(load, ["variants"]));
  return { ...p, variants: { ...load, read: { kind: "pending" } } };
}

function copyVariantLoad(source: VariantLoad): VariantLoad {
  return {
    fileId: source.fileId,
    name: source.name,
    size: source.size,
    format: source.format,
    readOptions:
      source.readOptions === null
        ? null
        : {
            ploidy: source.readOptions.ploidy,
            onlyPassed: source.readOptions.onlyPassed,
          },
  };
}

function copyVariantFilter(filter: VariantFilter): VariantFilter {
  switch (filter.kind) {
    case "missing_data":
      return {
        kind: filter.kind,
        maxAllowedMissingRate: filter.maxAllowedMissingRate,
      };
    case "maf":
      return { kind: filter.kind, maxAllowedMaf: filter.maxAllowedMaf };
    case "obs_het":
      return { kind: filter.kind, maxAllowedObsHet: filter.maxAllowedObsHet };
    case "ld":
      return {
        kind: filter.kind,
        maxAllowedR2: filter.maxAllowedR2,
        maxDist: filter.maxDist,
      };
  }
}

/** Sets the filter of its kind: in its place when there is one, last
    otherwise. */
export function setVariantFilter(p: Project, filter: VariantFilter): Project {
  const index = p.filters.findIndex((f) => f.kind === filter.kind);
  const at = index === -1 ? p.filters.length : index;
  refuse("setVariantFilter", variantFilterError(filter, ["filters", at]));
  const copy = copyVariantFilter(filter);
  if (index === -1) {
    return { ...p, filters: [...p.filters, copy] };
  }
  if (same(p.filters[index], copy)) {
    return p;
  }
  return { ...p, filters: p.filters.with(index, copy) };
}

/** Removes the filter of the variants of that kind; `p` itself when there
    is none. */
export function removeVariantFilter(
  p: Project,
  kind: VariantFilterKind,
): Project {
  if (!p.filters.some((f) => f.kind === kind)) {
    return p;
  }
  return { ...p, filters: p.filters.filter((f) => f.kind !== kind) };
}

/** Moves the filter of that kind to a position of the list, 0 the first.
    Throws a defect when there is no filter of that kind, or `to` is not a
    whole number from 0 to the length of the list − 1. */
export function moveVariantFilter(
  p: Project,
  kind: VariantFilterKind,
  to: number,
): Project {
  const index = p.filters.findIndex((f) => f.kind === kind);
  const filter = p.filters[index];
  if (filter === undefined) {
    throw defect(`moveVariantFilter was given ${kind}, not in the filters.`);
  }
  if (!Number.isInteger(to) || to < 0 || to >= p.filters.length) {
    throw defect(
      `moveVariantFilter was given the position ${String(to)}, not one of the ${String(p.filters.length)} filters.`,
    );
  }
  if (to === index) {
    return p;
  }
  return {
    ...p,
    filters: p.filters.toSpliced(index, 1).toSpliced(to, 0, filter),
  };
}

function copyIndividualFilter(filter: IndividualFilter): IndividualFilter {
  switch (filter.kind) {
    case "keep":
    case "remove":
      return { kind: filter.kind, individuals: [...filter.individuals] };
    case "missing_data":
      return {
        kind: filter.kind,
        maxAllowedMissingRate: filter.maxAllowedMissingRate,
      };
    case "obs_het":
      return { kind: filter.kind, maxAllowedObsHet: filter.maxAllowedObsHet };
  }
}

/** Sets the filter of its kind, in the fixed order of the kinds, keep,
    remove, missing_data, obs_het. */
export function setIndividualFilter(
  p: Project,
  filter: IndividualFilter,
): Project {
  const rank = INDIVIDUAL_FILTER_ORDER.indexOf(filter.kind);
  const index = p.individualFilters.findIndex((f) => f.kind === filter.kind);
  const after = p.individualFilters.findIndex(
    (f) => INDIVIDUAL_FILTER_ORDER.indexOf(f.kind) > rank,
  );
  let at = index;
  if (at === -1) {
    at = after === -1 ? p.individualFilters.length : after;
  }
  refuse(
    "setIndividualFilter",
    individualFilterError(filter, ["individualFilters", at]),
  );
  const copy = copyIndividualFilter(filter);
  if (index === -1) {
    return {
      ...p,
      individualFilters: p.individualFilters.toSpliced(at, 0, copy),
    };
  }
  if (same(p.individualFilters[index], copy)) {
    return p;
  }
  return { ...p, individualFilters: p.individualFilters.with(index, copy) };
}

/** Removes the filter of the individuals of that kind; `p` itself when
    there is none. */
export function removeIndividualFilter(
  p: Project,
  kind: IndividualFilterKind,
): Project {
  if (!p.individualFilters.some((f) => f.kind === kind)) {
    return p;
  }
  return {
    ...p,
    individualFilters: p.individualFilters.filter((f) => f.kind !== kind),
  };
}

function copyCsvOptions(csv: CsvOptions): CsvOptions {
  return {
    encoding: csv.encoding,
    separator: csv.separator,
    decimal: csv.decimal,
  };
}

/** Puts a new load of the individuals file, pending; `csv` is null for an
    xlsx. The grouping is kept, by the name of its column; the types of
    the columns come with the new read, and those the user set are lost
    (the project spec, Open 1). A load whose id is already there gives `p`
    itself. */
export function loadIndividuals(
  p: Project,
  source: {
    readonly fileId: string;
    readonly name: string;
    readonly csv: CsvOptions | null;
  },
): Project {
  const load = {
    fileId: source.fileId,
    name: source.name,
    csv: source.csv === null ? null : copyCsvOptions(source.csv),
  };
  const individuals = p.individuals;
  if (individuals?.fileId === load.fileId) {
    const there = {
      fileId: individuals.fileId,
      name: individuals.name,
      csv: individuals.csv,
    };
    if (same(there, load)) {
      return p;
    }
    throw defect(
      `loadIndividuals was given the load id ${load.fileId}, already there, with other fields.`,
    );
  }
  refuse(
    "loadIndividuals",
    loadIdError(load.fileId, ["individuals", "fileId"]),
  );
  return { ...p, individuals: { ...load, read: { kind: "pending" } } };
}

/** Sets how the CSV is read, and puts its read back to pending, so the
    types of the columns the user set are lost. Throws a defect when there
    is no individuals file, or it is an xlsx. */
export function setCsvOptions(p: Project, csv: CsvOptions): Project {
  const individuals = p.individuals;
  const current = individuals?.csv ?? null;
  if (individuals === null || current === null) {
    throw defect("setCsvOptions was given a project with no CSV file.");
  }
  const copy = copyCsvOptions(csv);
  if (same(current, copy)) {
    return p;
  }
  return {
    ...p,
    individuals: { ...individuals, csv: copy, read: { kind: "pending" } },
  };
}

function copyColumnType(type: ColumnType): ColumnType {
  switch (type.kind) {
    case "binary":
      return { kind: type.kind, one: type.one, zero: type.zero };
    case "identifier":
    case "continuous":
    case "categorical":
      return { kind: type.kind };
  }
}

/** Sets the type of a column of the table read. Throws a defect when the
    file is not read, the column is not in the table, or the type is not
    one `tableError` accepts for that column. */
export function setColumnType(
  p: Project,
  column: string,
  type: ColumnType,
): Project {
  const individuals = p.individuals;
  if (individuals?.read.kind !== "read") {
    throw defect("setColumnType was given a project with no table read.");
  }
  const read = individuals.read;
  const index = read.table.columns.indexOf(column);
  if (index === -1) {
    throw defect(
      `setColumnType was given ${column}, not a column of the table.`,
    );
  }
  const copy = copyColumnType(type);
  if (same(read.columns[index], copy)) {
    return p;
  }
  const columns = read.columns.with(index, copy);
  refuse(
    "setColumnType",
    tableError(read.table, columns, ["individuals", "read"]),
  );
  return {
    ...p,
    individuals: { ...individuals, read: { ...read, columns } },
  };
}

/** Removes the individuals file; `p` itself when there is none. The
    grouping is kept. */
export function removeIndividuals(p: Project): Project {
  return p.individuals === null ? p : { ...p, individuals: null };
}

function copyGrouping(grouping: Grouping): Grouping {
  switch (grouping.kind) {
    case "populations":
      return { kind: grouping.kind, column: grouping.column };
    case "roles":
      return {
        kind: grouping.kind,
        roles: grouping.roles.map(([column, role]) => [column, role] as const),
      };
  }
}

/** Sets the grouping. Throws a defect for a grouping of the other
    application. */
export function setGrouping(p: Project, grouping: Grouping): Project {
  const copy = copyGrouping(grouping);
  refuse("setGrouping", groupingError(copy, p.app, ["grouping"]));
  return same(p.grouping, copy) ? p : { ...p, grouping: copy };
}

/** Sets the options of an analysis, whole: in the place of its entry, or
    as a new entry, last, also when the options are the defaults. Throws a
    defect on options that are not JSON. */
export function setAnalysisOptions(
  p: Project,
  analysis: AnalysisId,
  options: JsonObject,
): Project {
  const index = p.analyses.findIndex((a) => a.analysis === analysis);
  canonical(options, null);
  if (index !== -1 && same(p.analyses[index], { analysis, options })) {
    return p;
  }
  const entry = { analysis, options: copyJsonObject(options) };
  return index === -1
    ? { ...p, analyses: [...p.analyses, entry] }
    : { ...p, analyses: p.analyses.with(index, entry) };
}

/** A copy of a JSON object and of everything it holds, so that the caller
    that changes its own object later does not change the project. A field
    named `__proto__` is copied as a field. */
function copyJsonObject(value: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(value).map(([name, field]) => [name, copyJson(field)]),
  );
}

function copyJson(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") {
    return value;
  }
  return isJsonList(value) ? value.map(copyJson) : copyJsonObject(value);
}

function isJsonList(value: object): value is readonly JsonValue[] {
  return Array.isArray(value);
}

/** The options of an analysis: its entry, or `defaults` when it has
    none. */
export function analysisOptions(
  p: Project,
  analysis: AnalysisId,
  defaults: JsonObject,
): JsonObject {
  return p.analyses.find((a) => a.analysis === analysis)?.options ?? defaults;
}

// The records: what the workers read of the files, put into the source of
// its load and no other. Each gives the project it was given when there is
// nothing to record, so a read that comes back for a load the user has
// replaced, or again after a restart of a worker, changes nothing.

/** What the calculation worker read of the variants file of the load
    `fileId`; recorded only while that source's read is pending. */
export function recordVariantsRead(
  p: Project,
  fileId: string,
  read: SourceRead,
): Project {
  const variants = p.variants;
  if (variants?.fileId !== fileId || variants.read.kind !== "pending") {
    return p;
  }
  return { ...p, variants: { ...variants, read } };
}

/** The number of variants, from the first pass over the load `fileId`;
    recorded when the source is read and its `numVars` is still null. */
export function recordVariantsCounted(
  p: Project,
  fileId: string,
  numVars: number,
): Project {
  const variants = p.variants;
  if (variants?.fileId !== fileId) {
    return p;
  }
  const read = variants.read;
  if (read.kind !== "read" || read.numVars !== null) {
    return p;
  }
  return { ...p, variants: { ...variants, read: { ...read, numVars } } };
}

/** What the light worker read of the individuals file of the load
    `fileId`, with the options `csv` it was read with; recorded only while
    that source's read is pending and its options are those, so a read of
    options since changed is dropped. The types of the columns are those
    of the read: a type the user set before is lost (the project spec,
    Open 1). */
export function recordIndividualsRead(
  p: Project,
  fileId: string,
  csv: CsvOptions | null,
  read: IndividualsRead,
): Project {
  const individuals = p.individuals;
  if (
    individuals?.fileId !== fileId ||
    individuals.read.kind !== "pending" ||
    !same(individuals.csv, csv === null ? null : copyCsvOptions(csv))
  ) {
    return p;
  }
  return { ...p, individuals: { ...individuals, read } };
}

// The validation of the project part of a project file.

/** What an analysis of the application gives `parseProject`: its id, and
    the function that checks its options read from a project file. */
export interface ParsedAnalysis {
  /** The id of the analysis. */
  readonly id: AnalysisId;
  /** Checks the options read from a project file of the version
      `formatVersion` of its format, and gives them whole, or what is
      expected of them. */
  parseOptions(o: unknown, formatVersion: number): Result<JsonObject, string>;
}

/**
 * Reads the project part of a project file, what `JSON.parse` gave of it,
 * into a project of the application `app`, or gives the first thing wrong
 * with it: a file of the other application, an analysis that is not one
 * of `analyses`, a field of the wrong shape or that the type does not
 * have, a value the commands would refuse, two filters of one kind, or a
 * table that does not agree with the types of its columns. Every project
 * written with `JSON.stringify` reads back equal to itself. The project is
 * not frozen; the store freezes it when it takes it.
 */
export function parseProject(
  data: unknown,
  app: AppId,
  formatVersion: number,
  analyses: readonly ParsedAnalysis[],
): Result<Project, ProjectError> {
  if (!isFields(data)) {
    return failure(wrongValue([], OBJECT));
  }
  const found = parseLiteral(data["app"], ["app"], APPS);
  if (!found.ok) {
    return found;
  }
  if (found.value !== app) {
    return failure({ kind: "otherApp", found: found.value });
  }
  const fields = readObject(data, [], PROJECT_FIELDS);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const variants = parseNullable(
    f["variants"],
    ["variants"],
    parseVariantSource,
  );
  if (!variants.ok) {
    return variants;
  }
  const filters = parseVariantFilters(f["filters"], ["filters"]);
  if (!filters.ok) {
    return filters;
  }
  const individualFilters = parseIndividualFilters(f["individualFilters"], [
    "individualFilters",
  ]);
  if (!individualFilters.ok) {
    return individualFilters;
  }
  const individuals = parseNullable(
    f["individuals"],
    ["individuals"],
    parseIndividualsSource,
  );
  if (!individuals.ok) {
    return individuals;
  }
  const grouping = parseGrouping(f["grouping"], ["grouping"]);
  if (!grouping.ok) {
    return grouping;
  }
  const groupingWrong = groupingError(grouping.value, app, ["grouping"]);
  if (groupingWrong !== null) {
    return failure(groupingWrong);
  }
  const options = parseAnalyses(
    f["analyses"],
    ["analyses"],
    formatVersion,
    analyses,
  );
  if (!options.ok) {
    return options;
  }
  const reference = parseNullable(
    f["reference"],
    ["reference"],
    parseReference,
  );
  if (!reference.ok) {
    return reference;
  }
  return success({
    app,
    variants: variants.value,
    filters: filters.value,
    individualFilters: individualFilters.value,
    individuals: individuals.value,
    grouping: grouping.value,
    analyses: options.value,
    reference: reference.value,
  });
}

type Parsed<T> = Result<T, ProjectError>;
interface Failure {
  readonly ok: false;
  readonly error: ProjectError;
}
type Fields = Readonly<Record<string, unknown>>;
type Parser<T> = (value: unknown, path: FieldPath) => Parsed<T>;

function success<T>(value: T): Parsed<T> {
  return { ok: true, value };
}

function failure(error: ProjectError): Failure {
  return { ok: false, error };
}

/** What the text says a field should be when it is not there, or is of
    the wrong shape. */
const OBJECT = "a group of named fields";
const PRESENT = "present";
const NO_SUCH_FIELD = "no field of this name";

const APPS: readonly AppId[] = ["popgen", "gwas"];

const PROJECT_FIELDS = [
  "app",
  "variants",
  "filters",
  "individualFilters",
  "individuals",
  "grouping",
  "analyses",
  "reference",
] as const;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** An object with exactly the fields `names`. */
function readObject(
  value: unknown,
  path: FieldPath,
  names: readonly string[],
): Parsed<Fields> {
  if (!isFields(value)) {
    return failure(wrongValue(path, OBJECT));
  }
  for (const name of Object.keys(value)) {
    if (!names.includes(name)) {
      return failure(wrongValue([...path, name], NO_SUCH_FIELD));
    }
  }
  for (const name of names) {
    if (!Object.hasOwn(value, name)) {
      return failure(wrongValue([...path, name], PRESENT));
    }
  }
  return success(value);
}

/** An object whose `kind` is one of `kinds`, with the fields each kind
    has besides it. */
function readKind<K extends string>(
  value: unknown,
  path: FieldPath,
  fieldsOf: Readonly<Record<K, readonly string[]>>,
  kinds: readonly K[],
): Parsed<{ readonly kind: K; readonly fields: Fields }> {
  if (!isFields(value)) {
    return failure(wrongValue(path, OBJECT));
  }
  const kind = parseLiteral(value["kind"], [...path, "kind"], kinds);
  if (!kind.ok) {
    return kind;
  }
  const fields = readObject(value, path, ["kind", ...fieldsOf[kind.value]]);
  if (!fields.ok) {
    return fields;
  }
  return success({ kind: kind.value, fields: fields.value });
}

function parseText(value: unknown, path: FieldPath): Parsed<string> {
  return typeof value === "string"
    ? success(value)
    : failure(wrongValue(path, "a text"));
}

function parseNumber(value: unknown, path: FieldPath): Parsed<number> {
  return typeof value === "number" && Number.isFinite(value)
    ? success(value)
    : failure(wrongValue(path, "a number"));
}

function parseBoolean(value: unknown, path: FieldPath): Parsed<boolean> {
  return typeof value === "boolean"
    ? success(value)
    : failure(wrongValue(path, "true or false"));
}

function parseLiteral<T extends string>(
  value: unknown,
  path: FieldPath,
  options: readonly T[],
): Parsed<T> {
  const found = options.find((option) => option === value);
  return found === undefined
    ? failure(wrongValue(path, `one of ${options.join(", ")}`))
    : success(found);
}

function parseNullable<T>(
  value: unknown,
  path: FieldPath,
  parse: Parser<T>,
): Parsed<T | null> {
  return value === null ? success(null) : parse(value, path);
}

function parseList<T>(
  value: unknown,
  path: FieldPath,
  parse: Parser<T>,
): Parsed<T[]> {
  if (!isList(value)) {
    return failure(wrongValue(path, "a list"));
  }
  const items: T[] = [];
  for (const [index, item] of value.entries()) {
    const parsed = parse(item, [...path, index]);
    if (!parsed.ok) {
      return parsed;
    }
    items.push(parsed.value);
  }
  return success(items);
}

/** The number of the field `name` of an object read. */
function numberField(
  fields: Fields,
  path: FieldPath,
  name: string,
): Parsed<number> {
  return parseNumber(fields[name], [...path, name]);
}

function orFailure<T>(value: T, error: ProjectError | null): Parsed<T> {
  return error === null ? success(value) : failure(error);
}

const VARIANT_FILTER_FIELDS: Readonly<
  Record<VariantFilterKind, readonly string[]>
> = {
  missing_data: ["maxAllowedMissingRate"],
  maf: ["maxAllowedMaf"],
  obs_het: ["maxAllowedObsHet"],
  ld: ["maxAllowedR2", "maxDist"],
};
const VARIANT_FILTER_KINDS: readonly VariantFilterKind[] = [
  "missing_data",
  "maf",
  "obs_het",
  "ld",
];

function parseVariantFilter(
  value: unknown,
  path: FieldPath,
): Parsed<VariantFilter> {
  const read = readKind(
    value,
    path,
    VARIANT_FILTER_FIELDS,
    VARIANT_FILTER_KINDS,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  let filter: VariantFilter;
  switch (kind) {
    case "missing_data": {
      const rate = numberField(fields, path, "maxAllowedMissingRate");
      if (!rate.ok) {
        return rate;
      }
      filter = { kind, maxAllowedMissingRate: rate.value };
      break;
    }
    case "maf": {
      const maf = numberField(fields, path, "maxAllowedMaf");
      if (!maf.ok) {
        return maf;
      }
      filter = { kind, maxAllowedMaf: maf.value };
      break;
    }
    case "obs_het": {
      const het = numberField(fields, path, "maxAllowedObsHet");
      if (!het.ok) {
        return het;
      }
      filter = { kind, maxAllowedObsHet: het.value };
      break;
    }
    case "ld": {
      const r2 = numberField(fields, path, "maxAllowedR2");
      if (!r2.ok) {
        return r2;
      }
      const dist = numberField(fields, path, "maxDist");
      if (!dist.ok) {
        return dist;
      }
      filter = { kind, maxAllowedR2: r2.value, maxDist: dist.value };
      break;
    }
  }
  return orFailure(filter, variantFilterError(filter, path));
}

function parseVariantFilters(
  value: unknown,
  path: FieldPath,
): Parsed<VariantFilter[]> {
  const filters = parseList(value, path, parseVariantFilter);
  if (!filters.ok) {
    return filters;
  }
  const twice = secondOfAKind(filters.value, path);
  return twice === null ? filters : failure(twice);
}

/** A second filter of a kind already in the list. */
function secondOfAKind(
  filters: readonly { readonly kind: string }[],
  path: FieldPath,
): ProjectError | null {
  for (const [index, filter] of filters.entries()) {
    if (filters.findIndex((f) => f.kind === filter.kind) !== index) {
      return {
        kind: "twoFiltersOfAKind",
        path: [...path, index],
        filter: filter.kind,
      };
    }
  }
  return null;
}

const INDIVIDUAL_FILTER_FIELDS: Readonly<
  Record<IndividualFilterKind, readonly string[]>
> = {
  keep: ["individuals"],
  remove: ["individuals"],
  missing_data: ["maxAllowedMissingRate"],
  obs_het: ["maxAllowedObsHet"],
};

function parseIndividualFilter(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualFilter> {
  const read = readKind(
    value,
    path,
    INDIVIDUAL_FILTER_FIELDS,
    INDIVIDUAL_FILTER_ORDER,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  let filter: IndividualFilter;
  switch (kind) {
    case "keep":
    case "remove": {
      const individuals = parseList(
        fields["individuals"],
        [...path, "individuals"],
        parseText,
      );
      if (!individuals.ok) {
        return individuals;
      }
      filter = { kind, individuals: individuals.value };
      break;
    }
    case "missing_data": {
      const rate = numberField(fields, path, "maxAllowedMissingRate");
      if (!rate.ok) {
        return rate;
      }
      filter = { kind, maxAllowedMissingRate: rate.value };
      break;
    }
    case "obs_het": {
      const het = numberField(fields, path, "maxAllowedObsHet");
      if (!het.ok) {
        return het;
      }
      filter = { kind, maxAllowedObsHet: het.value };
      break;
    }
  }
  return orFailure(filter, individualFilterError(filter, path));
}

/** What the text says of filters of the individuals out of their order. */
const INDIVIDUAL_ORDER =
  "after the filters of the kinds before it, in the order keep, remove, missing data, observed heterozygosity";

function parseIndividualFilters(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualFilter[]> {
  const filters = parseList(value, path, parseIndividualFilter);
  if (!filters.ok) {
    return filters;
  }
  const twice = secondOfAKind(filters.value, path);
  if (twice !== null) {
    return failure(twice);
  }
  let rankBefore = -1;
  for (const [index, filter] of filters.value.entries()) {
    const rank = INDIVIDUAL_FILTER_ORDER.indexOf(filter.kind);
    if (rank < rankBefore) {
      return failure(wrongValue([...path, index], INDIVIDUAL_ORDER));
    }
    rankBefore = rank;
  }
  return filters;
}

function parseVariantSource(
  value: unknown,
  path: FieldPath,
): Parsed<VariantSource> {
  const fields = readObject(value, path, [
    "fileId",
    "name",
    "size",
    "format",
    "readOptions",
    "read",
  ]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const fileId = parseText(f["fileId"], [...path, "fileId"]);
  if (!fileId.ok) {
    return fileId;
  }
  const name = parseText(f["name"], [...path, "name"]);
  if (!name.ok) {
    return name;
  }
  const size = parseNumber(f["size"], [...path, "size"]);
  if (!size.ok) {
    return size;
  }
  const format = parseLiteral(f["format"], [...path, "format"], [
    "vcf",
    "nei",
  ] as const);
  if (!format.ok) {
    return format;
  }
  const readOptions = parseNullable(
    f["readOptions"],
    [...path, "readOptions"],
    parseReadOptions,
  );
  if (!readOptions.ok) {
    return readOptions;
  }
  const load: VariantLoad = {
    fileId: fileId.value,
    name: name.value,
    size: size.value,
    format: format.value,
    readOptions: readOptions.value,
  };
  const loadWrong = variantLoadError(load, path);
  if (loadWrong !== null) {
    return failure(loadWrong);
  }
  const read = parseSourceRead(f["read"], [...path, "read"]);
  if (!read.ok) {
    return read;
  }
  return success({ ...load, read: read.value });
}

function parseReadOptions(
  value: unknown,
  path: FieldPath,
): Parsed<{ readonly ploidy: number; readonly onlyPassed: boolean }> {
  const fields = readObject(value, path, ["ploidy", "onlyPassed"]);
  if (!fields.ok) {
    return fields;
  }
  const ploidy = parseNumber(fields.value["ploidy"], [...path, "ploidy"]);
  if (!ploidy.ok) {
    return ploidy;
  }
  const onlyPassed = parseBoolean(fields.value["onlyPassed"], [
    ...path,
    "onlyPassed",
  ]);
  if (!onlyPassed.ok) {
    return onlyPassed;
  }
  return success({ ploidy: ploidy.value, onlyPassed: onlyPassed.value });
}

function parseSourceRead(value: unknown, path: FieldPath): Parsed<SourceRead> {
  const read = readKind(
    value,
    path,
    {
      pending: [],
      read: ["individuals", "ploidy", "numVars"],
      failed: ["error"],
    },
    ["pending", "read", "failed"] as const,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "pending":
      return success({ kind });
    case "read": {
      const individuals = parseList(
        fields["individuals"],
        [...path, "individuals"],
        parseText,
      );
      if (!individuals.ok) {
        return individuals;
      }
      const ploidy = parseNumber(fields["ploidy"], [...path, "ploidy"]);
      if (!ploidy.ok) {
        return ploidy;
      }
      const ploidyWrong = wholeNumberError(ploidy.value, 1, MAX_PLOIDY, [
        ...path,
        "ploidy",
      ]);
      if (ploidyWrong !== null) {
        return failure(ploidyWrong);
      }
      const numVars = parseNullable(
        fields["numVars"],
        [...path, "numVars"],
        parseNumber,
      );
      if (!numVars.ok) {
        return numVars;
      }
      return success({
        kind,
        individuals: individuals.value,
        ploidy: ploidy.value,
        numVars: numVars.value,
      });
    }
    case "failed": {
      const error = parseSourceError(fields["error"], [...path, "error"]);
      if (!error.ok) {
        return error;
      }
      return success({ kind, error: error.value });
    }
  }
}

function parseSourceError(
  value: unknown,
  path: FieldPath,
): Parsed<SourceError> {
  const read = readKind(
    value,
    path,
    { popnei: ["message"], worker: ["error"] },
    ["popnei", "worker"] as const,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "popnei": {
      const message = parseText(fields["message"], [...path, "message"]);
      return message.ok ? success({ kind, message: message.value }) : message;
    }
    case "worker": {
      const error = parseRunError(fields["error"], [...path, "error"]);
      return error.ok ? success({ kind, error: error.value }) : error;
    }
  }
}

function parseRunError(value: unknown, path: FieldPath): Parsed<RunError> {
  const read = readKind(
    value,
    path,
    {
      popnei: ["message"],
      files: ["message"],
      workerFailed: ["message"],
      couldNotStart: ["reason"],
      protocolMismatch: [],
      defect: ["message"],
    },
    [
      "popnei",
      "files",
      "workerFailed",
      "couldNotStart",
      "protocolMismatch",
      "defect",
    ] as const,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "protocolMismatch":
      return success({ kind });
    case "couldNotStart": {
      const reason = parseText(fields["reason"], [...path, "reason"]);
      return reason.ok ? success({ kind, reason: reason.value }) : reason;
    }
    case "popnei":
    case "files":
    case "workerFailed":
    case "defect": {
      const message = parseText(fields["message"], [...path, "message"]);
      return message.ok ? success({ kind, message: message.value }) : message;
    }
  }
}

function parseIndividualsSource(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualsSource> {
  const fields = readObject(value, path, ["fileId", "name", "csv", "read"]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const fileId = parseText(f["fileId"], [...path, "fileId"]);
  if (!fileId.ok) {
    return fileId;
  }
  const idWrong = loadIdError(fileId.value, [...path, "fileId"]);
  if (idWrong !== null) {
    return failure(idWrong);
  }
  const name = parseText(f["name"], [...path, "name"]);
  if (!name.ok) {
    return name;
  }
  const csv = parseNullable(f["csv"], [...path, "csv"], parseCsvOptions);
  if (!csv.ok) {
    return csv;
  }
  const read = parseIndividualsRead(f["read"], [...path, "read"]);
  if (!read.ok) {
    return read;
  }
  return success({
    fileId: fileId.value,
    name: name.value,
    csv: csv.value,
    read: read.value,
  });
}

function parseCsvOptions(value: unknown, path: FieldPath): Parsed<CsvOptions> {
  const fields = readObject(value, path, ["encoding", "separator", "decimal"]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const encoding = parseLiteral(f["encoding"], [...path, "encoding"], [
    "auto",
    "utf-8",
    "windows-1252",
  ] as const);
  if (!encoding.ok) {
    return encoding;
  }
  const separator = parseLiteral(f["separator"], [...path, "separator"], [
    "auto",
    ",",
    ";",
    "\t",
  ] as const);
  if (!separator.ok) {
    return separator;
  }
  const decimal = parseLiteral(f["decimal"], [...path, "decimal"], [
    "auto",
    ".",
    ",",
  ] as const);
  if (!decimal.ok) {
    return decimal;
  }
  return success({
    encoding: encoding.value,
    separator: separator.value,
    decimal: decimal.value,
  });
}

function parseCsvFound(value: unknown, path: FieldPath): Parsed<CsvFound> {
  const fields = readObject(value, path, ["encoding", "separator", "decimal"]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const encoding = parseLiteral(f["encoding"], [...path, "encoding"], [
    "utf-8",
    "windows-1252",
  ] as const);
  if (!encoding.ok) {
    return encoding;
  }
  const separator = parseLiteral(f["separator"], [...path, "separator"], [
    ",",
    ";",
    "\t",
  ] as const);
  if (!separator.ok) {
    return separator;
  }
  const decimal = parseLiteral(f["decimal"], [...path, "decimal"], [
    ".",
    ",",
  ] as const);
  if (!decimal.ok) {
    return decimal;
  }
  return success({
    encoding: encoding.value,
    separator: separator.value,
    decimal: decimal.value,
  });
}

function parseIndividualsRead(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualsRead> {
  const read = readKind(
    value,
    path,
    { pending: [], read: ["table", "columns", "found"], failed: ["error"] },
    ["pending", "read", "failed"] as const,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "pending":
      return success({ kind });
    case "read": {
      const table = parseTable(fields["table"], [...path, "table"]);
      if (!table.ok) {
        return table;
      }
      const columns = parseList(
        fields["columns"],
        [...path, "columns"],
        parseColumnType,
      );
      if (!columns.ok) {
        return columns;
      }
      const found = parseNullable(
        fields["found"],
        [...path, "found"],
        parseCsvFound,
      );
      if (!found.ok) {
        return found;
      }
      return orFailure(
        {
          kind,
          table: table.value,
          columns: columns.value,
          found: found.value,
        },
        tableError(table.value, columns.value, path),
      );
    }
    case "failed": {
      const error = parseIndividualsError(fields["error"], [...path, "error"]);
      return error.ok ? success({ kind, error: error.value }) : error;
    }
  }
}

function parseIndividualsError(
  value: unknown,
  path: FieldPath,
): Parsed<
  IndividualsFileError | { readonly kind: "worker"; readonly error: RunError }
> {
  const read = readKind(
    value,
    path,
    {
      empty: [],
      duplicateColumn: ["name"],
      duplicateIndividual: ["name"],
      raggedRow: ["line", "expected", "found"],
      files: ["message"],
      worker: ["error"],
    },
    [
      "empty",
      "duplicateColumn",
      "duplicateIndividual",
      "raggedRow",
      "files",
      "worker",
    ] as const,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "empty":
      return success({ kind });
    case "duplicateColumn":
    case "duplicateIndividual": {
      const name = parseText(fields["name"], [...path, "name"]);
      return name.ok ? success({ kind, name: name.value }) : name;
    }
    case "raggedRow": {
      const line = numberField(fields, path, "line");
      if (!line.ok) {
        return line;
      }
      const expected = numberField(fields, path, "expected");
      if (!expected.ok) {
        return expected;
      }
      const found = numberField(fields, path, "found");
      if (!found.ok) {
        return found;
      }
      return success({
        kind,
        line: line.value,
        expected: expected.value,
        found: found.value,
      });
    }
    case "files": {
      const message = parseText(fields["message"], [...path, "message"]);
      return message.ok ? success({ kind, message: message.value }) : message;
    }
    case "worker": {
      const error = parseRunError(fields["error"], [...path, "error"]);
      return error.ok ? success({ kind, error: error.value }) : error;
    }
  }
}

function parseTable(value: unknown, path: FieldPath): Parsed<IndividualsTable> {
  const fields = readObject(value, path, ["columns", "rows"]);
  if (!fields.ok) {
    return fields;
  }
  const columns = parseList(
    fields.value["columns"],
    [...path, "columns"],
    parseText,
  );
  if (!columns.ok) {
    return columns;
  }
  const rows = parseList(fields.value["rows"], [...path, "rows"], (row, at) =>
    parseList(row, at, parseCell),
  );
  if (!rows.ok) {
    return rows;
  }
  return success({ columns: columns.value, rows: rows.value });
}

function parseCell(value: unknown, path: FieldPath): Parsed<Cell> {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return success(value);
  }
  return typeof value === "number" && Number.isFinite(value)
    ? success(value)
    : failure(wrongValue(path, "a text, a number, true, false or nothing"));
}

function parseValue(
  value: unknown,
  path: FieldPath,
): Parsed<string | number | boolean> {
  const cell = parseCell(value, path);
  if (!cell.ok) {
    return cell;
  }
  return cell.value === null
    ? failure(wrongValue(path, "a text, a number, true or false"))
    : success(cell.value);
}

function parseColumnType(value: unknown, path: FieldPath): Parsed<ColumnType> {
  const read = readKind(
    value,
    path,
    {
      identifier: [],
      binary: ["one", "zero"],
      continuous: [],
      categorical: [],
    },
    ["identifier", "binary", "continuous", "categorical"] as const,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "binary": {
      const one = parseValue(fields["one"], [...path, "one"]);
      if (!one.ok) {
        return one;
      }
      const zero = parseValue(fields["zero"], [...path, "zero"]);
      if (!zero.ok) {
        return zero;
      }
      return success({ kind, one: one.value, zero: zero.value });
    }
    case "identifier":
    case "continuous":
    case "categorical":
      return success({ kind });
  }
}

const ROLES = ["trait", "covariate", "ignored"] as const;

function parseGrouping(value: unknown, path: FieldPath): Parsed<Grouping> {
  const read = readKind(
    value,
    path,
    { populations: ["column"], roles: ["roles"] },
    ["populations", "roles"] as const,
  );
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "populations": {
      const column = parseNullable(
        fields["column"],
        [...path, "column"],
        parseText,
      );
      return column.ok ? success({ kind, column: column.value }) : column;
    }
    case "roles": {
      const roles = parseList(fields["roles"], [...path, "roles"], parseRole);
      return roles.ok ? success({ kind, roles: roles.value }) : roles;
    }
  }
}

function parseRole(
  value: unknown,
  path: FieldPath,
): Parsed<readonly [string, (typeof ROLES)[number]]> {
  if (!isList(value) || value.length !== 2) {
    return failure(wrongValue(path, "a column and its role"));
  }
  const column = parseText(value[0], [...path, 0]);
  if (!column.ok) {
    return column;
  }
  const role = parseLiteral(value[1], [...path, 1], ROLES);
  if (!role.ok) {
    return role;
  }
  return success([column.value, role.value] as const);
}

function parseAnalyses(
  value: unknown,
  path: FieldPath,
  formatVersion: number,
  analyses: readonly ParsedAnalysis[],
): Parsed<AnalysisOptions[]> {
  if (!isList(value)) {
    return failure(wrongValue(path, "a list"));
  }
  const entries: AnalysisOptions[] = [];
  for (const [index, item] of value.entries()) {
    const at = [...path, index];
    const fields = readObject(item, at, ["analysis", "options"]);
    if (!fields.ok) {
      return fields;
    }
    const id = parseText(fields.value["analysis"], [...at, "analysis"]);
    if (!id.ok) {
      return id;
    }
    const analysis = analyses.find((a) => a.id === id.value);
    if (analysis === undefined) {
      return failure({ kind: "unknownAnalysis", id: id.value });
    }
    if (entries.some((entry) => entry.analysis === id.value)) {
      return failure(
        wrongValue([...at, "analysis"], "an analysis not named before"),
      );
    }
    const options = analysis.parseOptions(
      fields.value["options"],
      formatVersion,
    );
    if (!options.ok) {
      return failure(wrongValue([...at, "options"], options.error));
    }
    entries.push({ analysis: id.value, options: options.value });
  }
  return success(entries);
}

const FINGERPRINT = /^[0-9a-f]{64}$/;

function parseReference(value: unknown, path: FieldPath): Parsed<Reference> {
  const fields = readObject(value, path, [
    "variants",
    "popneiVersion",
    "appVersion",
    "checks",
  ]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const variants = parseVariantSource(f["variants"], [...path, "variants"]);
  if (!variants.ok) {
    return variants;
  }
  const popneiVersion = parseText(f["popneiVersion"], [
    ...path,
    "popneiVersion",
  ]);
  if (!popneiVersion.ok) {
    return popneiVersion;
  }
  const appVersion = parseText(f["appVersion"], [...path, "appVersion"]);
  if (!appVersion.ok) {
    return appVersion;
  }
  const checks = parseList(f["checks"], [...path, "checks"], parseCheck);
  if (!checks.ok) {
    return checks;
  }
  return success({
    variants: variants.value,
    popneiVersion: popneiVersion.value,
    appVersion: appVersion.value,
    checks: checks.value,
  });
}

function parseCheck(value: unknown, path: FieldPath): Parsed<Check> {
  const fields = readObject(value, path, [
    "analysis",
    "numbers",
    "keyVersion",
    "settings",
  ]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const analysis = parseText(f["analysis"], [...path, "analysis"]);
  if (!analysis.ok) {
    return analysis;
  }
  const numbers = parseList(f["numbers"], [...path, "numbers"], (n, at) =>
    parseNullable(n, at, parseNumber),
  );
  if (!numbers.ok) {
    return numbers;
  }
  const keyVersion = parseNumber(f["keyVersion"], [...path, "keyVersion"]);
  if (!keyVersion.ok) {
    return keyVersion;
  }
  const versionWrong = wholeNumberError(
    keyVersion.value,
    0,
    Number.MAX_SAFE_INTEGER,
    [...path, "keyVersion"],
  );
  if (versionWrong !== null) {
    return failure(versionWrong);
  }
  const settings = parseText(f["settings"], [...path, "settings"]);
  if (!settings.ok) {
    return settings;
  }
  if (!FINGERPRINT.test(settings.value)) {
    return failure(
      wrongValue([...path, "settings"], "64 lower case hexadecimal digits"),
    );
  }
  return success({
    analysis: analysis.value,
    numbers: numbers.value,
    keyVersion: keyVersion.value,
    settings: settings.value,
  });
}

// The text the user reads.

/** The two applications, by what they do. */
const APP_WORDS: Readonly<Record<AppId, string>> = {
  popgen: "population genetics",
  gwas: "association",
};

/** The end of the text of an error of a field: what the user can do. */
const DAMAGED = "The file was changed outside the application, or is damaged.";

/**
 * The text the user reads of what is wrong with a project file. A field is
 * named in words, with a position as an ordinal, "the threshold of the
 * second filter of the variants", and never by its path.
 */
export function projectErrorText(error: ProjectError): string {
  switch (error.kind) {
    case "otherApp":
      return `This project file is of the ${APP_WORDS[error.found]} application. Open it there.`;
    case "unknownAnalysis":
      return `This project file has the analysis ${error.id}, which this version of the application does not know: it was saved by another version of the application.`;
    case "wrongValue":
    case "inconsistentTable":
      return `The project file cannot be opened: ${fieldWords(error.path)} should be ${error.expected}. ${DAMAGED}`;
    case "twoFiltersOfAKind":
      return `The project file cannot be opened: ${fieldWords(error.path.slice(0, -1))} have two filters of ${filterKindWords(error.filter)}. ${DAMAGED}`;
  }
}

/** What a filter of each kind filters on, in words. */
function filterKindWords(kind: string): string {
  switch (kind) {
    case "missing_data":
      return "missing genotypes";
    case "maf":
      return "major allele frequency";
    case "obs_het":
      return "observed heterozygosity";
    case "ld":
      return "linkage disequilibrium";
    case "keep":
      return "individuals to keep";
    case "remove":
      return "individuals to remove";
    default:
      return `the kind ${kind}`;
  }
}

/** A position of a list, 0 the first, as an ordinal: "first", "11th". */
export function ordinal(index: number): string {
  const words = [
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
  ];
  const word = words[index];
  if (word !== undefined) {
    return word;
  }
  const n = index + 1;
  const lastTwo = n % 100;
  const last = n % 10;
  let suffix = "th";
  if (lastTwo < 11 || lastTwo > 13) {
    suffix = last === 1 ? "st" : last === 2 ? "nd" : last === 3 ? "rd" : "th";
  }
  return `${String(n)}${suffix}`;
}

/** A part of a pattern of the table of the fields: a field by its name,
    or `N`, any position of a list, whose ordinal the words are given. */
const N: unique symbol = Symbol("any position");
type PatternPart = string | number | typeof N;

/** The words of a field, from the ordinals of the positions its pattern
    matched, in order. */
type Words = (ordinals: readonly string[]) => string;

/** The words of the fields of a variants file, below its words `file`. */
function sourceFields(
  base: readonly PatternPart[],
  file: string,
): (readonly [readonly PatternPart[], Words])[] {
  return [
    [base, () => file],
    [[...base, "fileId"], () => `the identifier of ${file}`],
    [[...base, "name"], () => `the name of ${file}`],
    [[...base, "size"], () => `the size of ${file}`],
    [[...base, "format"], () => `the format of ${file}`],
    [[...base, "readOptions"], () => `the read options of ${file}`],
    [[...base, "readOptions", "ploidy"], () => `the ploidy of ${file}`],
    [
      [...base, "readOptions", "onlyPassed"],
      () => `the option of ${file} that keeps only the variants that passed`,
    ],
    [[...base, "read"], () => `what was read of ${file}`],
    [[...base, "read", "kind"], () => `what was read of ${file}`],
    [[...base, "read", "individuals"], () => `the individuals read of ${file}`],
    [
      [...base, "read", "individuals", N],
      (o) => `the ${nth(o, 0)} individual read of ${file}`,
    ],
    [[...base, "read", "ploidy"], () => `the ploidy read of ${file}`],
    [[...base, "read", "numVars"], () => `the number of variants of ${file}`],
    [[...base, "read", "error"], () => `the reason ${file} could not be read`],
  ];
}

/**
 * The table of the fields of the project in words. A field is found by
 * the longest pattern that matches the start of its path; the rest of the
 * path, a field this version does not write, is named after it.
 */
const FIELD_WORDS: readonly (readonly [readonly PatternPart[], Words])[] = [
  [["app"], () => "the application"],
  ...sourceFields(["variants"], "the variants file"),
  [["filters"], () => "the filters of the variants"],
  [["filters", N], (o) => `the ${nth(o, 0)} filter of the variants`],
  [
    ["filters", N, "kind"],
    (o) => `the kind of the ${nth(o, 0)} filter of the variants`,
  ],
  ...[
    "maxAllowedMissingRate",
    "maxAllowedMaf",
    "maxAllowedObsHet",
    "maxAllowedR2",
  ].map((name): readonly [readonly PatternPart[], Words] => [
    ["filters", N, name],
    (o) => `the threshold of the ${nth(o, 0)} filter of the variants`,
  ]),
  [
    ["filters", N, "maxDist"],
    (o) => `the distance of the ${nth(o, 0)} filter of the variants`,
  ],
  [["individualFilters"], () => "the filters of the individuals"],
  [
    ["individualFilters", N],
    (o) => `the ${nth(o, 0)} filter of the individuals`,
  ],
  [
    ["individualFilters", N, "kind"],
    (o) => `the kind of the ${nth(o, 0)} filter of the individuals`,
  ],
  [
    ["individualFilters", N, "individuals"],
    (o) => `the list of the ${nth(o, 0)} filter of the individuals`,
  ],
  [
    ["individualFilters", N, "individuals", N],
    (o) =>
      `the ${nth(o, 1)} individual of the list of the ${nth(o, 0)} filter of the individuals`,
  ],
  ...["maxAllowedMissingRate", "maxAllowedObsHet"].map(
    (name): readonly [readonly PatternPart[], Words] => [
      ["individualFilters", N, name],
      (o) => `the threshold of the ${nth(o, 0)} filter of the individuals`,
    ],
  ),
  [["individuals"], () => "the individuals file"],
  [["individuals", "fileId"], () => "the identifier of the individuals file"],
  [["individuals", "name"], () => "the name of the individuals file"],
  [["individuals", "csv"], () => "the options of the individuals file"],
  [
    ["individuals", "csv", "encoding"],
    () => "the encoding of the individuals file",
  ],
  [
    ["individuals", "csv", "separator"],
    () => "the separator of the individuals file",
  ],
  [
    ["individuals", "csv", "decimal"],
    () => "the decimal mark of the individuals file",
  ],
  [["individuals", "read"], () => "what was read of the individuals file"],
  [
    ["individuals", "read", "kind"],
    () => "what was read of the individuals file",
  ],
  [["individuals", "read", "table"], () => "the table of the individuals file"],
  [
    ["individuals", "read", "table", "columns"],
    () => "the header of the individuals file",
  ],
  [
    ["individuals", "read", "table", "columns", N],
    (o) => `the name of the ${nth(o, 0)} column of the individuals file`,
  ],
  [
    ["individuals", "read", "table", "rows"],
    () => "the rows of the individuals file",
  ],
  [
    ["individuals", "read", "table", "rows", N],
    (o) => `the ${nth(o, 0)} row of the individuals file`,
  ],
  [
    ["individuals", "read", "table", "rows", N, N],
    (o) =>
      `the ${nth(o, 1)} cell of the ${nth(o, 0)} row of the individuals file`,
  ],
  [
    ["individuals", "read", "columns"],
    () => "the types of the columns of the individuals file",
  ],
  [
    ["individuals", "read", "columns", N],
    (o) => `the type of the ${nth(o, 0)} column of the individuals file`,
  ],
  [
    ["individuals", "read", "columns", N, "kind"],
    (o) => `the type of the ${nth(o, 0)} column of the individuals file`,
  ],
  [
    ["individuals", "read", "columns", N, "one"],
    (o) =>
      `the value coded 1 of the ${nth(o, 0)} column of the individuals file`,
  ],
  [
    ["individuals", "read", "columns", N, "zero"],
    (o) =>
      `the value coded 0 of the ${nth(o, 0)} column of the individuals file`,
  ],
  [
    ["individuals", "read", "found"],
    () => "what was found of how the individuals file is written",
  ],
  [
    ["individuals", "read", "error"],
    () => "the reason the individuals file could not be read",
  ],
  [["grouping"], () => "the grouping of the individuals"],
  [["grouping", "kind"], () => "the grouping of the individuals"],
  [["grouping", "column"], () => "the column of the populations"],
  [["grouping", "roles"], () => "the roles of the columns"],
  [["grouping", "roles", N], (o) => `the ${nth(o, 0)} role of the columns`],
  [
    ["grouping", "roles", N, 0],
    (o) => `the column of the ${nth(o, 0)} role of the columns`,
  ],
  [["grouping", "roles", N, 1], (o) => `the ${nth(o, 0)} role of the columns`],
  [["analyses"], () => "the options of the analyses"],
  [["analyses", N], (o) => `the options of the ${nth(o, 0)} analysis`],
  [["analyses", N, "analysis"], (o) => `the name of the ${nth(o, 0)} analysis`],
  [
    ["analyses", N, "options"],
    (o) => `the options of the ${nth(o, 0)} analysis`,
  ],
  [
    ["reference"],
    () => "what the project file says of the variants file it was made with",
  ],
  ...sourceFields(
    ["reference", "variants"],
    "the variants file the project was made with",
  ),
  [
    ["reference", "popneiVersion"],
    () => "the version of popnei the project was made with",
  ],
  [
    ["reference", "appVersion"],
    () => "the version of the application the project was made with",
  ],
  [["reference", "checks"], () => "the check numbers"],
  [
    ["reference", "checks", N],
    (o) => `the check numbers of the ${nth(o, 0)} analysis`,
  ],
  [
    ["reference", "checks", N, "analysis"],
    (o) => `the name of the ${nth(o, 0)} analysis of the check numbers`,
  ],
  [
    ["reference", "checks", N, "numbers"],
    (o) => `the check numbers of the ${nth(o, 0)} analysis`,
  ],
  [
    ["reference", "checks", N, "numbers", N],
    (o) => `the ${nth(o, 1)} check number of the ${nth(o, 0)} analysis`,
  ],
  [
    ["reference", "checks", N, "keyVersion"],
    (o) => `the version of the calculation of the ${nth(o, 0)} analysis`,
  ],
  [
    ["reference", "checks", N, "settings"],
    (o) => `the settings of the ${nth(o, 0)} analysis`,
  ],
];

/** The ordinal at `index` of those a pattern matched. */
function nth(ordinals: readonly string[], index: number): string {
  const found = ordinals[index];
  if (found === undefined) {
    throw new Error(
      `popnei_web defect: a pattern of the table of the fields has no position ${String(index)}.`,
    );
  }
  return found;
}

/** A field of the project in words, from the table of the fields. */
function fieldWords(path: FieldPath): string {
  let best: { length: number; words: string } = {
    length: 0,
    words: "the project",
  };
  for (const [pattern, words] of FIELD_WORDS) {
    if (pattern.length <= best.length || pattern.length > path.length) {
      continue;
    }
    const ordinals: string[] = [];
    const matches = pattern.every((part, at) => {
      const segment = path[at];
      if (part === N) {
        if (typeof segment !== "number") {
          return false;
        }
        ordinals.push(ordinal(segment));
        return true;
      }
      return segment === part;
    });
    if (matches) {
      best = { length: pattern.length, words: words(ordinals) };
    }
  }
  let words = best.words;
  for (const segment of path.slice(best.length)) {
    words =
      typeof segment === "number"
        ? `the ${ordinal(segment)} item of ${words}`
        : `the field ${JSON.stringify(segment)} of ${words}`;
  }
  return words;
}
