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
    id is already there gives `p` itself. */
export function loadVariants(p: Project, source: VariantLoad): Project {
  if (p.variants !== null && p.variants.fileId === source.fileId) {
    return p;
  }
  refuse("loadVariants", variantLoadError(source, ["variants"]));
  return {
    ...p,
    variants: {
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
      read: { kind: "pending" },
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
  if (p.individuals !== null && p.individuals.fileId === source.fileId) {
    return p;
  }
  refuse(
    "loadIndividuals",
    loadIdError(source.fileId, ["individuals", "fileId"]),
  );
  return {
    ...p,
    individuals: {
      fileId: source.fileId,
      name: source.name,
      csv: source.csv === null ? null : copyCsvOptions(source.csv),
      read: { kind: "pending" },
    },
  };
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
  if (same(current, csv)) {
    return p;
  }
  return {
    ...p,
    individuals: {
      ...individuals,
      csv: copyCsvOptions(csv),
      read: { kind: "pending" },
    },
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
  if (same(read.columns[index], type)) {
    return p;
  }
  const columns = read.columns.with(index, copyColumnType(type));
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
  refuse("setGrouping", groupingError(grouping, p.app, ["grouping"]));
  return same(p.grouping, grouping)
    ? p
    : { ...p, grouping: copyGrouping(grouping) };
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
    !same(individuals.csv, csv)
  ) {
    return p;
  }
  return { ...p, individuals: { ...individuals, read } };
}
