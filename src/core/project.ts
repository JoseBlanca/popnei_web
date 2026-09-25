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
  /** The worker failed; a refusal of popnei is the kind above, never
      this one. */
  | {
      readonly kind: "worker";
      readonly error: Exclude<RunError, { readonly kind: "popnei" }>;
    };

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
        | {
            readonly kind: "worker";
            /** A refusal of the xlsx reader is the kind files of
                IndividualsFileError, never a failure of the worker. */
            readonly error: Exclude<RunError, { readonly kind: "files" }>;
          };
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
  /** A field the type does not have: `path` is that of the object that
      has it, `name` the name of the field. */
  | {
      readonly kind: "unknownField";
      readonly path: FieldPath;
      readonly name: string;
    }
  /** A field the type has and the file does not. */
  | { readonly kind: "missingField"; readonly path: FieldPath }
  /** A field whose value is not what `expected` says, the end of a
      sentence "‹the field› should be ‹expected›". */
  | {
      readonly kind: "wrongValue";
      readonly path: FieldPath;
      readonly expected: string;
    }
  /** A filter of the individuals out of the order of the kinds. */
  | { readonly kind: "filterOutOfOrder"; readonly path: FieldPath }
  /** A second filter of the kind `filter` in one list. */
  | {
      readonly kind: "twoFiltersOfAKind";
      readonly path: FieldPath;
      readonly filter: VariantFilterKind | IndividualFilterKind;
    }
  /** The value at `path` repeats one before it in its list: an analysis,
      a column of the header or of the roles, an individual. */
  | {
      readonly kind: "repeated";
      readonly path: FieldPath;
      readonly what: "analysis" | "column" | "individual";
      readonly value: string;
    }
  /** A table the reader does not give, or that does not agree with the
      types of its columns; `problem` ends a sentence whose subject is the
      field of `path`, "‹the field› has 3 cells where the header has 4". */
  | {
      readonly kind: "inconsistentTable";
      readonly path: FieldPath;
      readonly problem: string;
    };

/** The place of a field in the project, `["filters", 1, "maxAllowedMaf"]`;
    exported for the errors of `parseProject` and for the tests. */
export type FieldPath = readonly (string | number)[];

/** What a text calls each kind of filter, of the variants and of the
    individuals, in the words of docs/functionality.md. */
const FILTER_KIND_WORDS: Readonly<
  Record<VariantFilterKind | IndividualFilterKind, string>
> = {
  missing_data: "missing genotypes",
  maf: "major allele frequency",
  obs_het: "observed heterozygosity",
  ld: "linkage disequilibrium",
  keep: "individuals to keep",
  remove: "individuals to remove",
};

/** The kinds of filter of the individuals, in the order a project keeps
    them. */
const INDIVIDUAL_FILTER_KINDS: Kinds<IndividualFilterKind> = {
  keep: { fields: ["individuals"], words: FILTER_KIND_WORDS.keep },
  remove: { fields: ["individuals"], words: FILTER_KIND_WORDS.remove },
  missing_data: {
    fields: ["maxAllowedMissingRate"],
    words: FILTER_KIND_WORDS.missing_data,
  },
  obs_het: { fields: ["maxAllowedObsHet"], words: FILTER_KIND_WORDS.obs_het },
};

/** The order the filters of the individuals are kept in: keep, remove,
    missing_data, obs_het. */
export const INDIVIDUAL_FILTER_ORDER: readonly IndividualFilterKind[] = keysOf(
  INDIVIDUAL_FILTER_KINDS,
);

/** The largest ploidy of a VCF that popnei's `openVcf` accepts. */
export const MAX_PLOIDY = 255;

/** The largest `maxDist` of the LD filter, 2^53 − 1, which popnei's
    `filterByLd` accepts. */
export const MAX_LD_DIST = Number.MAX_SAFE_INTEGER;

/** The version of the format of the project file this application
    writes; `projectFile.ts` writes it in the header, and a command checks
    the options of an analysis as of this version. */
export const FORMAT_VERSION = 1;

/** The deepest the options of an analysis are nested, in levels of lists
    and objects, the options themselves the first; deeper ones are refused,
    so that no check of them runs out of the stack of the browser. */
export const MAX_OPTIONS_DEPTH = 64;

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

function inconsistentTable(path: FieldPath, problem: string): ProjectError {
  return { kind: "inconsistentTable", path, problem };
}

function repeated(
  path: FieldPath,
  what: "analysis" | "column" | "individual",
  value: string,
): ProjectError {
  return { kind: "repeated", path, what, value };
}

/** Whether a value holds lists and objects nested deeper than `levels`,
    itself the first. Walked with a stack of its own, so that a value
    nested 100,000 levels does not run out of the stack of the browser. */
function deeperThan(value: unknown, levels: number): boolean {
  const stack: [unknown, number][] = [[value, 1]];
  for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
    const [item, level] = top;
    if (typeof item !== "object" || item === null) {
      continue;
    }
    if (level > levels) {
      return true;
    }
    const fields: readonly unknown[] = Object.values(item);
    for (const field of fields) {
      stack.push([field, level + 1]);
    }
  }
  return false;
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
    : wrongValue(
        path,
        max === Number.MAX_SAFE_INTEGER
          ? `a whole number, ${String(min)} or more`
          : `a whole number from ${String(min)} to ${String(max)}`,
      );
}

/** Checks the thresholds of a filter of the variants, from 0 to 1, and
    its `maxDist`, a whole number from 1 to 2^53 − 1. */
function variantFilterError(
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
function individualFilterError(
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
function loadIdError(fileId: string, path: FieldPath): ProjectError | null {
  return LOAD_ID.test(fileId)
    ? null
    : wrongValue(path, "32 lower case hexadecimal digits");
}

/** A load of the variants file, what the page gives before it is read. */
export type VariantLoad = Omit<VariantSource, "read">;

/** Checks a load of the variants file: its load id, a finite size, and
    read options for a VCF, with a ploidy from 1 to 255, and none for a
    `.nei`. */
function variantLoadError(
  load: VariantLoad,
  path: FieldPath,
): ProjectError | null {
  const idError = loadIdError(load.fileId, [...path, "fileId"]);
  if (idError !== null) {
    return idError;
  }
  const sizeError = wholeNumberError(load.size, 0, Number.MAX_SAFE_INTEGER, [
    ...path,
    "size",
  ]);
  if (sizeError !== null) {
    return sizeError;
  }
  const optionsPath = [...path, "readOptions"];
  if (load.format === "nei") {
    return load.readOptions === null
      ? null
      : wrongValue(optionsPath, "none, since a .nei file is read with none");
  }
  if (load.readOptions === null) {
    return wrongValue(
      optionsPath,
      "given, since a VCF file is read with a ploidy",
    );
  }
  return wholeNumberError(load.readOptions.ploidy, 1, MAX_PLOIDY, [
    ...optionsPath,
    "ploidy",
  ]);
}

/** Checks that a grouping is of the application `app`: the populations
    in population genetics, the roles of the columns in association. */
function groupingError(
  grouping: Grouping,
  app: AppId,
  path: FieldPath,
): ProjectError | null {
  if (app === "popgen") {
    return grouping.kind === "populations"
      ? null
      : wrongValue([...path, "kind"], "the column of the populations");
  }
  if (grouping.kind !== "roles") {
    return wrongValue([...path, "kind"], "the roles of the columns");
  }
  const columns = new Set<string>();
  for (const [index, [column]] of grouping.roles.entries()) {
    if (columns.has(column)) {
      return repeated([...path, "roles", index, 0], "column", column);
    }
    columns.add(column);
  }
  return null;
}

/**
 * Checks a read of the individuals file: nothing found of the options of
 * a CSV for an xlsx, whose `csv` is null, and the table as `tableError`
 * checks it. `path` is that of the read.
 */
function individualsReadError(
  csv: CsvOptions | null,
  read: IndividualsRead,
  path: FieldPath,
): ProjectError | null {
  if (read.kind !== "read") {
    return null;
  }
  if (csv === null && read.found !== null) {
    return wrongValue(
      [...path, "found"],
      "none, since the individuals file is an xlsx file",
    );
  }
  return tableError(read.table, read.columns, path);
}

/**
 * Checks that the table of the individuals file is one the reader gives,
 * and that the types of its columns agree with it: at least one column and
 * one row, no name of the header twice, every row as long as the header,
 * the first cell of each row the name of an individual, a text that is not
 * empty, no individual in two rows; one type per column, the first
 * `identifier` and no other, and a binary type whose `one` and `zero` are
 * the two distinct values of its column that are not missing. `path` is
 * that of the read that holds them.
 */
function tableError(
  table: IndividualsTable,
  columns: readonly ColumnType[],
  path: FieldPath,
): ProjectError | null {
  const tablePath = [...path, "table"];
  if (table.columns.length === 0) {
    return inconsistentTable([...tablePath, "columns"], "has no column");
  }
  if (table.rows.length === 0) {
    return inconsistentTable(tablePath, "has no row below its header");
  }
  const header = new Set<string>();
  for (const [index, name] of table.columns.entries()) {
    if (header.has(name)) {
      return repeated([...tablePath, "columns", index], "column", name);
    }
    header.add(name);
  }
  const individuals = new Set<string>();
  for (const [row, cells] of table.rows.entries()) {
    if (cells.length !== table.columns.length) {
      return inconsistentTable(
        [...tablePath, "rows", row],
        `has ${String(cells.length)} cells where the header has ${String(table.columns.length)}`,
      );
    }
    const name = cells[0];
    if (typeof name !== "string" || name === "") {
      return inconsistentTable(
        [...tablePath, "rows", row, 0],
        "should be a text that is not empty",
      );
    }
    if (individuals.has(name)) {
      return repeated([...tablePath, "rows", row, 0], "individual", name);
    }
    individuals.add(name);
  }
  if (columns.length !== table.columns.length) {
    return inconsistentTable(
      [...path, "columns"],
      `are ${String(columns.length)}, where the header has ${String(table.columns.length)} columns`,
    );
  }
  for (const [index, type] of columns.entries()) {
    const typePath = [...path, "columns", index];
    if (index === 0 && type.kind !== "identifier") {
      return inconsistentTable(
        typePath,
        "should be identifier, since the first column names the individuals",
      );
    }
    if (index !== 0 && type.kind === "identifier") {
      return inconsistentTable(
        typePath,
        "cannot be identifier: only the first column can have that type",
      );
    }
    if (
      type.kind === "binary" &&
      !isBinaryOf(type, valuesOfColumn(table, index))
    ) {
      return inconsistentTable(
        typePath,
        "should be binary, with the two values found in the column coded 1 and 0",
      );
    }
  }
  return null;
}

/** The distinct cells of a column that are not missing, compared
    exactly, up to three: a binary column has two, so a third is enough to
    refuse it, and the rows after it are not read. */
function valuesOfColumn(
  table: IndividualsTable,
  index: number,
): (string | number | boolean)[] {
  const values: (string | number | boolean)[] = [];
  for (const row of table.rows) {
    const cell: Cell | undefined = row[index];
    if (cell !== undefined && cell !== null && !values.includes(cell)) {
      values.push(cell);
      if (values.length > 2) {
        return values;
      }
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

/**
 * Sets the options of an analysis, as its `parseOptions` gives them back of
 * `FORMAT_VERSION`, whole, the defaults filled in: in the place of its
 * entry, or as a new entry, last, also when the options are the defaults.
 * Throws a defect on options nested deeper than `MAX_OPTIONS_DEPTH`, that
 * its `parseOptions` refuses, or that are not JSON.
 */
export function setAnalysisOptions(
  p: Project,
  analysis: ParsedAnalysis,
  options: JsonObject,
): Project {
  if (deeperThan(options, MAX_OPTIONS_DEPTH)) {
    throw defect(
      `setAnalysisOptions was given options of ${analysis.id} nested deeper than ${String(MAX_OPTIONS_DEPTH)} levels.`,
    );
  }
  const parsed = analysis.parseOptions(options, FORMAT_VERSION);
  if (!parsed.ok) {
    throw defect(
      `setAnalysisOptions was given options of ${analysis.id} that its parseOptions refuses: ${parsed.error}.`,
    );
  }
  // Throws a defect on a value that is not JSON.
  canonical(parsed.value, null);
  const entry = {
    analysis: analysis.id,
    options: copyJsonObject(parsed.value),
  };
  const index = p.analyses.findIndex((a) => a.analysis === analysis.id);
  if (index !== -1 && same(p.analyses[index], entry)) {
    return p;
  }
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
// its load and no other, while its read is pending or failed because its
// worker failed. Each gives the project it was given when there is nothing
// to record, so a read that comes back for a load the user has replaced
// changes nothing, and a read that succeeds after a failure of the worker,
// once it restarted, replaces the failure.

/** Whether a read can still be replaced: it is pending, or failed because
    its worker failed, which a second try after a restart can mend. A read
    that succeeded, or that popnei or the reader refused, which the same
    file gives again, stays. */
function awaitsRead(read: SourceRead | IndividualsRead): boolean {
  return (
    read.kind === "pending" ||
    (read.kind === "failed" && read.error.kind === "worker")
  );
}

/** What the calculation worker read of the variants file of the load
    `fileId`; recorded only while that source's read is pending or failed
    because its worker failed. */
export function recordVariantsRead(
  p: Project,
  fileId: string,
  read: SourceRead,
): Project {
  const variants = p.variants;
  if (variants?.fileId !== fileId || !awaitsRead(variants.read)) {
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
    that source's read is pending, or failed because its worker failed,
    and its options are those, so a read of options since changed is
    dropped. The types of the columns are those
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
    !awaitsRead(individuals.read) ||
    !same(individuals.csv, csv === null ? null : copyCsvOptions(csv))
  ) {
    return p;
  }
  const error = individualsReadError(individuals.csv, read, [
    "individuals",
    "read",
  ]);
  if (error === null) {
    return { ...p, individuals: { ...individuals, read } };
  }
  // The reader is our code: a table the project cannot hold is its defect.
  const message = `the reader gave a read the project cannot hold: ${JSON.stringify(error)}`;
  return {
    ...p,
    individuals: {
      ...individuals,
      read: {
        kind: "failed",
        error: { kind: "worker", error: { kind: "defect", message } },
      },
    },
  };
}

// What every analysis needs: the reasons shown beside the Run button. The
// words the owner took as provisional on 24 September 2026 are the
// meanwhiles of the project spec's Open 2 to Open 6.

/** What happened when a worker failed, by the kind of its failure (the
    project spec, Open 4). A refusal of the files wasm in the calculation
    worker, or of popnei in the light worker, which neither gives, is a
    defect of our code, and has its words. */
const WHAT_HAPPENED: Readonly<Record<RunError["kind"], string>> = {
  couldNotStart: "the application could not start its calculations",
  workerFailed: "the calculation stopped unexpectedly",
  defect: "the calculation stopped unexpectedly",
  popnei: "the calculation stopped unexpectedly",
  files: "the calculation stopped unexpectedly",
  protocolMismatch: "the page is out of date",
};

/** The end of a reason a new load of the page may fix. */
const RELOAD = "Reload the page and load it again.";

/** The kinds of failure of a worker that only a new page mends: it could
    not start, or it is of another version than the page. After any other,
    a crash or a defect, a new load of the file starts a new worker and
    keeps the project, which a reload would lose (the owner, 24 September
    2026). */
const MENDED_BY_RELOAD: ReadonlySet<RunError["kind"]> = new Set([
  "couldNotStart",
  "protocolMismatch",
]);

/** The reason of a file that could not be read because its worker failed
    with `kind`: what happened, and what the user can do, a reload of the
    page or a new load of the file in its step, `step`. */
function workerFailedText(
  fileName: string,
  kind: RunError["kind"],
  step: "Variants" | "Individuals",
): string {
  const next = MENDED_BY_RELOAD.has(kind)
    ? RELOAD
    : `Load it again in the ${step} step.`;
  return `${fileName} could not be read: ${WHAT_HAPPENED[kind]}. ${next}`;
}

/** The end of a reason of the variants file. */
const LOAD_VARIANTS = "Load a variants file in the Variants step.";

/** The end of a reason of the individuals file. */
const LOAD_INDIVIDUALS = "Load an individuals file in the Individuals step.";

/** The end of a reason of a list of individuals that names the wrong ones
    (the project spec, Open 2). */
const CHANGE_LIST =
  "Change the list, or remove the filter, in the Variants step.";

/** The kinds of the lists of individuals, in the order they are checked
    (the project spec, Open 6). */
const LIST_KINDS = ["keep", "remove"] as const;

/**
 * The reason no analysis can run on this project, in the words the screen
 * shows beside the Run button, or `null` when every analysis can: the
 * first of a variants file missing, being read or refused, then a list of
 * individuals that is empty, names one more than once, or names
 * individuals not in the variants file (the project spec, "What an
 * analysis needs of every project").
 */
export function projectNeeds(p: Project): string | null {
  const variants = p.variants;
  if (variants === null) {
    return LOAD_VARIANTS;
  }
  const fileName = escaped(variants.name);
  const read = variants.read;
  switch (read.kind) {
    case "pending":
      return `Reading ${fileName}.`;
    case "failed":
      return read.error.kind === "popnei"
        ? `popnei could not read ${fileName}${saying(read.error.message)}. ${LOAD_VARIANTS}`
        : workerFailedText(fileName, read.error.error.kind, "Variants");
    case "read": {
      const inVariants = new Set(read.individuals);
      for (const kind of LIST_KINDS) {
        const list = listOf(p.individualFilters, kind);
        const reason =
          list === null ? null : listNeeds(kind, list, fileName, inVariants);
        if (reason !== null) {
          return reason;
        }
      }
      return null;
    }
  }
}

/** The individuals of the list of that kind, or `null` when there is no
    such filter. */
function listOf(
  filters: readonly IndividualFilter[],
  kind: (typeof LIST_KINDS)[number],
): readonly string[] | null {
  for (const filter of filters) {
    if (
      (filter.kind === "keep" || filter.kind === "remove") &&
      filter.kind === kind
    ) {
      return filter.individuals;
    }
  }
  return null;
}

/** What is wrong with one list of individuals, or `null`: empty, then
    names repeated, then names not in the variants file. */
function listNeeds(
  kind: (typeof LIST_KINDS)[number],
  list: readonly string[],
  fileName: string,
  inVariants: ReadonlySet<string>,
): string | null {
  const theList = `The list of ${FILTER_KIND_WORDS[kind]}`;
  if (list.length === 0) {
    return `${theList} is empty. Add individuals to it, or remove the filter, in the Variants step.`;
  }
  const times = new Map<string, number>();
  for (const name of list) {
    times.set(name, (times.get(name) ?? 0) + 1);
  }
  const repeated = [...times].filter(([, n]) => n > 1).map(([name]) => name);
  if (repeated.length > 0) {
    return `${theList} names ${namesOf(repeated)} more than once. ${CHANGE_LIST}`;
  }
  const unknown = list.filter((name) => !inVariants.has(name));
  if (unknown.length > 0) {
    const one = unknown.length === 1;
    return `${theList} names ${counted(unknown.length, "individual")} that ${one ? "is" : "are"} not in ${fileName}: ${namesOf(unknown)}. ${CHANGE_LIST}`;
  }
  return null;
}

/**
 * The reason an analysis that uses the individuals file cannot run, or
 * `null`: the first of an individuals file missing, being read or
 * refused, then individuals of the variants file missing from it. The
 * individuals of the variants are looked at only when the variants file
 * is read; until then `projectNeeds` gives its reason (the project spec,
 * "What an analysis needs of every project").
 */
export function individualsNeeds(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals === null) {
    return LOAD_INDIVIDUALS;
  }
  const name = escaped(individuals.name);
  const read = individuals.read;
  switch (read.kind) {
    case "pending":
      return `Reading ${name}.`;
    case "failed":
      return read.error.kind === "worker"
        ? workerFailedText(name, read.error.error.kind, "Individuals")
        : `${name} could not be read${saying(refusalWords(read.error))}. ${LOAD_INDIVIDUALS}`;
    case "read": {
      const variants = p.variants;
      if (variants?.read.kind !== "read") {
        return null;
      }
      const inFile = new Set(read.table.rows.map((row) => row[0]));
      const missing = variants.read.individuals.filter(
        (individual) => !inFile.has(individual),
      );
      if (missing.length === 0) {
        return null;
      }
      return missing.length === 1
        ? `1 individual of ${escaped(variants.name)} is not in ${name}: ${namesOf(missing)}. Add it to the file and load the file again in the Individuals step.`
        : `${counted(missing.length, "individual")} of ${escaped(variants.name)} are not in ${name}: ${namesOf(missing)}. Add them to the file and load it again in the Individuals step.`;
    }
  }
}

/** What the reader of the individuals file found wrong with it (the
    project spec, Open 5), or the message of the files wasm, which may be
    empty. */
function refusalWords(error: IndividualsFileError): string {
  switch (error.kind) {
    case "empty":
      return "it has no row below the header";
    case "duplicateColumn":
      return error.name === ""
        ? "two columns have an empty name"
        : `two columns are named ${shown(error.name)}`;
    case "duplicateIndividual":
      return error.name === ""
        ? "two rows have an empty name"
        : `the individual ${shown(error.name)} is in two rows`;
    case "raggedRow":
      return `line ${String(error.line)} has ${counted(error.found, "cell")} where the header has ${grouped(error.expected)}`;
    case "files":
      return error.message;
  }
}

/** The most individuals a text names all of (the project spec, Open 3). */
const MAX_NAMED = 3;

/** Names in words, in their order: all of them when there are at most
    MAX_NAMED, "a, b and c"; otherwise the first two and how many more,
    "a, b and 10 more". */
function namesOf(names: readonly string[]): string {
  const words =
    names.length <= MAX_NAMED
      ? names.map(named)
      : [...names.slice(0, 2).map(named), `${grouped(names.length - 2)} more`];
  return bothOf(words);
}

/** A name of an individual as a text shows it; an empty one is "an
    empty name". */
function named(name: string): string {
  return name === "" ? "an empty name" : shown(name);
}

/** A list of things in words: "a, b and c". */
function bothOf(words: readonly string[]): string {
  const last = words.at(-1) ?? "";
  return words.length < 2
    ? last
    : `${words.slice(0, -1).join(", ")} and ${last}`;
}

/** A count with its noun: "1 individual", "1,203 individuals". */
function counted(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${grouped(count)} ${noun}s`;
}

/** A whole number with a comma between groups of three digits, the same
    in every browser: "1,203,554". */
function grouped(count: number): string {
  return String(count).replace(/\B(?=(\d{3})+$)/g, ",");
}

/** What follows "could not read panel.nei": a colon and the message of
    popnei, of the files wasm or of the reader, without the spaces around
    it and the full stop it may end with, so that the sentence has one; or
    nothing, when that leaves it empty. */
function saying(message: string): string {
  const trimmed = message.trim();
  const words = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
  return words === "" ? "" : `: ${words}`;
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
  const found = parseOneOf(data["app"], ["app"], APP_WORDS);
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
  const reference = parseNullable(f["reference"], ["reference"], (v, at) =>
    parseReference(v, at, analyses),
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

/** What the text says an object of the wrong shape should be. */
const OBJECT = "in the form the application writes";

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
      return failure({ kind: "unknownField", path, name });
    }
  }
  for (const name of names) {
    if (!Object.hasOwn(value, name)) {
      return failure({ kind: "missingField", path: [...path, name] });
    }
  }
  return success(value);
}

/** A kind of a union: the fields it has besides `kind`, and what a text
    calls it. */
interface KindShape {
  readonly fields: readonly string[];
  readonly words: string;
}

/** The kinds of a union, each with its shape. A table of this type names
    every kind of the union, so that a kind added to the union and not to
    its table fails the compile, instead of making the application refuse
    its own project files. */
type Kinds<K extends string> = Readonly<Record<K, KindShape>>;

/** The keys of a table, typed as the table's. */
function keysOf<K extends string>(table: Readonly<Record<K, unknown>>): K[] {
  return Object.keys(table).filter((key): key is K =>
    Object.hasOwn(table, key),
  );
}

/** A list of alternatives in words: "a, b or c". */
function eitherOf(words: readonly string[]): string {
  const last = words.at(-1) ?? "";
  return words.length < 2
    ? last
    : `${words.slice(0, -1).join(", ")} or ${last}`;
}

/** An object whose `kind` is one of the kinds of `kinds`, with the fields
    that kind has besides it. */
function readKind<K extends string>(
  value: unknown,
  path: FieldPath,
  kinds: Kinds<K>,
): Parsed<{ readonly kind: K; readonly fields: Fields }> {
  if (!isFields(value)) {
    return failure(wrongValue(path, OBJECT));
  }
  const names = keysOf(kinds);
  const kind = names.find((name) => name === value["kind"]);
  if (kind === undefined) {
    return failure(
      wrongValue(
        [...path, "kind"],
        eitherOf(names.map((name) => kinds[name].words)),
      ),
    );
  }
  const fields = readObject(value, path, ["kind", ...kinds[kind].fields]);
  if (!fields.ok) {
    return fields;
  }
  return success({ kind, fields: fields.value });
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

/** A whole number of at least 0. */
function parseCount(value: unknown, path: FieldPath): Parsed<number> {
  const count = parseNumber(value, path);
  if (!count.ok) {
    return count;
  }
  return orFailure(
    count.value,
    wholeNumberError(count.value, 0, Number.MAX_SAFE_INTEGER, path),
  );
}

function parseBoolean(value: unknown, path: FieldPath): Parsed<boolean> {
  return typeof value === "boolean"
    ? success(value)
    : failure(wrongValue(path, "true or false"));
}

/** One of the texts of `words`, a table of each text that is valid and
    what a text of the application calls it. */
function parseOneOf<T extends string>(
  value: unknown,
  path: FieldPath,
  words: Readonly<Record<T, string>>,
): Parsed<T> {
  const options = keysOf(words);
  const found = options.find((option) => option === value);
  return found === undefined
    ? failure(wrongValue(path, eitherOf(options.map((o) => words[o]))))
    : success(found);
}

function parseNullable<T>(
  value: unknown,
  path: FieldPath,
  parse: Parser<T>,
): Parsed<T | null> {
  return value === null ? success(null) : parse(value, path);
}

/** A value `parse` reads, or `null`, which the text calls nothing. */
function parseOrNothing<T>(
  value: unknown,
  path: FieldPath,
  parse: Parser<T>,
): Parsed<T | null> {
  const parsed = parseNullable(value, path, parse);
  if (parsed.ok || parsed.error.kind !== "wrongValue") {
    return parsed;
  }
  const expected = parsed.error.expected;
  return failure(
    wrongValue(
      parsed.error.path,
      expected.includes(",")
        ? `${expected}, or nothing`
        : `${expected} or nothing`,
    ),
  );
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

const VARIANT_FILTER_KINDS: Kinds<VariantFilterKind> = {
  missing_data: {
    fields: ["maxAllowedMissingRate"],
    words: FILTER_KIND_WORDS.missing_data,
  },
  maf: { fields: ["maxAllowedMaf"], words: FILTER_KIND_WORDS.maf },
  obs_het: { fields: ["maxAllowedObsHet"], words: FILTER_KIND_WORDS.obs_het },
  ld: { fields: ["maxAllowedR2", "maxDist"], words: FILTER_KIND_WORDS.ld },
};

const SOURCE_READ_KINDS: Kinds<SourceRead["kind"]> = {
  pending: { fields: [], words: "not yet read" },
  read: { fields: ["individuals", "ploidy", "numVars"], words: "read" },
  failed: { fields: ["error"], words: "not readable" },
};

const SOURCE_ERROR_KINDS: Kinds<SourceError["kind"]> = {
  popnei: { fields: ["message"], words: "a refusal of popnei" },
  worker: { fields: ["error"], words: "a failure of the application" },
};

const RUN_ERROR_KINDS: Kinds<RunError["kind"]> = {
  popnei: { fields: ["message"], words: "a refusal of popnei" },
  files: {
    fields: ["message"],
    words: "a refusal of the reader of xlsx files",
  },
  workerFailed: { fields: ["message"], words: "a calculation that stopped" },
  couldNotStart: {
    fields: ["reason"],
    words: "calculations that could not start",
  },
  protocolMismatch: { fields: [], words: "a page out of date" },
  defect: { fields: ["message"], words: "a mistake of the application" },
};

const INDIVIDUALS_READ_KINDS: Kinds<IndividualsRead["kind"]> = {
  pending: { fields: [], words: "not yet read" },
  read: { fields: ["table", "columns", "found"], words: "read" },
  failed: { fields: ["error"], words: "not readable" },
};

const INDIVIDUALS_ERROR_KINDS: Kinds<IndividualsFileError["kind"] | "worker"> =
  {
    empty: { fields: [], words: "an empty file" },
    duplicateColumn: { fields: ["name"], words: "two columns of one name" },
    duplicateIndividual: {
      fields: ["name"],
      words: "one individual in two rows",
    },
    raggedRow: {
      fields: ["line", "expected", "found"],
      words: "a row of the wrong length",
    },
    files: {
      fields: ["message"],
      words: "a refusal of the reader of xlsx files",
    },
    worker: { fields: ["error"], words: "a failure of the application" },
  };

const COLUMN_TYPE_KINDS: Kinds<ColumnType["kind"]> = {
  identifier: { fields: [], words: "identifier" },
  binary: { fields: ["one", "zero"], words: "binary" },
  continuous: { fields: [], words: "continuous" },
  categorical: { fields: [], words: "categorical" },
};

const GROUPING_KINDS: Kinds<Grouping["kind"]> = {
  populations: { fields: ["column"], words: "the column of the populations" },
  roles: { fields: ["roles"], words: "the roles of the columns" },
};

const FORMAT_WORDS: Readonly<Record<VariantSource["format"], string>> = {
  vcf: "a VCF file",
  nei: "a .nei file",
};

const ROLE_WORDS: Readonly<
  Record<Extract<Grouping, { kind: "roles" }>["roles"][number][1], string>
> = { trait: "trait", covariate: "covariate", ignored: "ignored" };

const ENCODING_WORDS: Readonly<Record<CsvOptions["encoding"], string>> = {
  "utf-8": "UTF-8",
  "windows-1252": "Windows-1252",
  auto: "found by the application",
};

const SEPARATOR_WORDS: Readonly<Record<CsvOptions["separator"], string>> = {
  ",": "a comma",
  ";": "a semicolon",
  "\t": "a tab",
  auto: "found by the application",
};

const DECIMAL_WORDS: Readonly<Record<CsvOptions["decimal"], string>> = {
  ".": "a point",
  ",": "a comma",
  auto: "found by the application",
};

const FOUND_ENCODING_WORDS: Readonly<Record<CsvFound["encoding"], string>> = {
  "utf-8": ENCODING_WORDS["utf-8"],
  "windows-1252": ENCODING_WORDS["windows-1252"],
};

const FOUND_SEPARATOR_WORDS: Readonly<Record<CsvFound["separator"], string>> = {
  ",": SEPARATOR_WORDS[","],
  ";": SEPARATOR_WORDS[";"],
  "\t": SEPARATOR_WORDS["\t"],
};

const FOUND_DECIMAL_WORDS: Readonly<Record<CsvFound["decimal"], string>> = {
  ".": DECIMAL_WORDS["."],
  ",": DECIMAL_WORDS[","],
};

function parseVariantFilter(
  value: unknown,
  path: FieldPath,
): Parsed<VariantFilter> {
  const read = readKind(value, path, VARIANT_FILTER_KINDS);
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
  filters: readonly {
    readonly kind: VariantFilterKind | IndividualFilterKind;
  }[],
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

function parseIndividualFilter(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualFilter> {
  const read = readKind(value, path, INDIVIDUAL_FILTER_KINDS);
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
      return failure({ kind: "filterOutOfOrder", path: [...path, index] });
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
  const format = parseOneOf(f["format"], [...path, "format"], FORMAT_WORDS);
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
  const read = readKind(value, path, SOURCE_READ_KINDS);
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
      const numVars = parseOrNothing(
        fields["numVars"],
        [...path, "numVars"],
        parseCount,
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
  const read = readKind(value, path, SOURCE_ERROR_KINDS);
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
      if (!error.ok) {
        return error;
      }
      // A refusal of popnei is the kind popnei of the read, not this one.
      if (error.value.kind === "popnei") {
        return failure(runErrorKindError([...path, "error"], "popnei"));
      }
      return success({ kind, error: error.value });
    }
  }
}

/** The kind of a failure of the worker that cannot be there, the kinds it
    can be in words. */
function runErrorKindError(
  path: FieldPath,
  excluded: RunError["kind"],
): ProjectError {
  const kinds = keysOf(RUN_ERROR_KINDS).filter((kind) => kind !== excluded);
  return wrongValue(
    [...path, "kind"],
    eitherOf(kinds.map((kind) => RUN_ERROR_KINDS[kind].words)),
  );
}

function parseRunError(value: unknown, path: FieldPath): Parsed<RunError> {
  const read = readKind(value, path, RUN_ERROR_KINDS);
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
  return orFailure(
    {
      fileId: fileId.value,
      name: name.value,
      csv: csv.value,
      read: read.value,
    },
    individualsReadError(csv.value, read.value, [...path, "read"]),
  );
}

function parseCsvOptions(value: unknown, path: FieldPath): Parsed<CsvOptions> {
  const fields = readObject(value, path, ["encoding", "separator", "decimal"]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const encoding = parseOneOf(
    f["encoding"],
    [...path, "encoding"],
    ENCODING_WORDS,
  );
  if (!encoding.ok) {
    return encoding;
  }
  const separator = parseOneOf(
    f["separator"],
    [...path, "separator"],
    SEPARATOR_WORDS,
  );
  if (!separator.ok) {
    return separator;
  }
  const decimal = parseOneOf(f["decimal"], [...path, "decimal"], DECIMAL_WORDS);
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
  const encoding = parseOneOf(
    f["encoding"],
    [...path, "encoding"],
    FOUND_ENCODING_WORDS,
  );
  if (!encoding.ok) {
    return encoding;
  }
  const separator = parseOneOf(
    f["separator"],
    [...path, "separator"],
    FOUND_SEPARATOR_WORDS,
  );
  if (!separator.ok) {
    return separator;
  }
  const decimal = parseOneOf(
    f["decimal"],
    [...path, "decimal"],
    FOUND_DECIMAL_WORDS,
  );
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
  const read = readKind(value, path, INDIVIDUALS_READ_KINDS);
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
      return success({
        kind,
        table: table.value,
        columns: columns.value,
        found: found.value,
      });
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
): Parsed<Extract<IndividualsRead, { kind: "failed" }>["error"]> {
  const read = readKind(value, path, INDIVIDUALS_ERROR_KINDS);
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
      if (!error.ok) {
        return error;
      }
      // A refusal of the xlsx reader is the kind files of the read.
      if (error.value.kind === "files") {
        return failure(runErrorKindError([...path, "error"], "files"));
      }
      return success({ kind, error: error.value });
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
    : failure(wrongValue(path, "a text, a number, true, false, or empty"));
}

function parseValue(
  value: unknown,
  path: FieldPath,
): Parsed<string | number | boolean> {
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return success(value);
  }
  return failure(wrongValue(path, "a text, a number, true or false"));
}

function parseColumnType(value: unknown, path: FieldPath): Parsed<ColumnType> {
  const read = readKind(value, path, COLUMN_TYPE_KINDS);
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

function parseGrouping(value: unknown, path: FieldPath): Parsed<Grouping> {
  const read = readKind(value, path, GROUPING_KINDS);
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
): Parsed<Extract<Grouping, { kind: "roles" }>["roles"][number]> {
  if (!isList(value) || value.length !== 2) {
    return failure(wrongValue(path, "a name and a role"));
  }
  const column = parseText(value[0], [...path, 0]);
  if (!column.ok) {
    return column;
  }
  const role = parseOneOf(value[1], [...path, 1], ROLE_WORDS);
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
      return failure(repeated(at, "analysis", id.value));
    }
    const given = fields.value["options"];
    if (deeperThan(given, MAX_OPTIONS_DEPTH)) {
      return failure(
        wrongValue(
          [...at, "options"],
          `nested at most ${String(MAX_OPTIONS_DEPTH)} levels deep`,
        ),
      );
    }
    const options = analysis.parseOptions(given, formatVersion);
    if (!options.ok) {
      return failure(wrongValue([...at, "options"], options.error));
    }
    entries.push({ analysis: id.value, options: options.value });
  }
  return success(entries);
}

const FINGERPRINT = /^[0-9a-f]{64}$/;

function parseReference(
  value: unknown,
  path: FieldPath,
  analyses: readonly ParsedAnalysis[],
): Parsed<Reference> {
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
  for (const [index, check] of checks.value.entries()) {
    if (!analyses.some((a) => a.id === check.analysis)) {
      return failure({ kind: "unknownAnalysis", id: check.analysis });
    }
    if (
      checks.value.findIndex((c) => c.analysis === check.analysis) !== index
    ) {
      return failure(
        repeated([...path, "checks", index], "analysis", check.analysis),
      );
    }
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
    parseOrNothing(n, at, parseNumber),
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

/** The end of the text of an error of a field: what happened to the file,
    and what the user can do. */
const DAMAGED =
  "The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.";

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
      return `This project file has the analysis ${shown(error.id)}, which this version of the application does not know: it was saved by another version of the application.`;
    case "unknownField": {
      const words = fieldWords(error.path);
      return opened(
        `${words} ${isPlural(words) ? "have" : "has"} a field "${shown(error.name)}", which the application does not write`,
      );
    }
    case "missingField": {
      const words = fieldWords(error.path);
      return opened(`${words} ${isPlural(words) ? "are" : "is"} missing`);
    }
    case "wrongValue":
      return opened(`${fieldWords(error.path)} should be ${error.expected}`);
    case "inconsistentTable":
      return opened(`${fieldWords(error.path)} ${error.problem}`);
    case "repeated":
      return opened(
        `${fieldWords(error.path)} repeats the ${error.what} ${shown(error.value)}`,
      );
    case "twoFiltersOfAKind":
      return opened(
        `it has ${twoOfAKind(error.path, error.filter)}, and a project has at most one of each kind`,
      );
    case "filterOutOfOrder":
      return opened(
        `the filters of the individuals should be in the order ${INDIVIDUAL_FILTER_ORDER.map((kind) => FILTER_KIND_WORDS[kind]).join(", ")}, and the ${ordinal(positionOf(error.path))} one is out of that order`,
      );
  }
}

/** Whether the words of a field name several things, "the filters of the
    variants", and so take a verb in the plural. */
function isPlural(words: string): boolean {
  return /^the (filters|rows|types|roles|numbers|check numbers|analyses|individuals found|options|encoding, separator)\b/.test(
    words,
  );
}

/** The position a path ends in, the filter out of its order. */
function positionOf(path: FieldPath): number {
  const last = path.at(-1);
  if (typeof last !== "number") {
    throw defect(
      `a path of a filter out of its order ends in ${String(last)}.`,
    );
  }
  return last;
}

/** The text of an error of the content of a file, in the pattern of the
    project spec, around the words of what is wrong. */
function opened(what: string): string {
  return `The project file cannot be opened: ${what}. ${DAMAGED}`;
}

/** Two filters of one kind, in words: "two filters of the variants by
    missing genotypes", "two lists of individuals to keep". */
function twoOfAKind(
  path: FieldPath,
  kind: VariantFilterKind | IndividualFilterKind,
): string {
  if (path[0] === "filters") {
    return `two filters of the variants by ${FILTER_KIND_WORDS[kind]}`;
  }
  return kind === "keep" || kind === "remove"
    ? `two lists of ${FILTER_KIND_WORDS[kind]}`
    : `two filters of the individuals by ${FILTER_KIND_WORDS[kind]}`;
}

/** The longest a value of the file is shown, in characters. */
const SHOWN_LENGTH = 40;

/** A value of the file as a text shows it: escaped, and cut after
    SHOWN_LENGTH of its characters, never inside an escape. */
function shown(value: string): string {
  const characters = escapedCharacters(value);
  return characters.length > SHOWN_LENGTH
    ? `${characters.slice(0, SHOWN_LENGTH).join("")}…`
    : characters.join("");
}

/** A value of the user's files, the name of a file among them, escaped
    and not cut. */
function escaped(value: string): string {
  return escapedCharacters(value).join("");
}

/** The characters that could change the text around them: the control
    and format characters, U+202E that reverses the direction of the text
    among them, and half of a pair that encodes one character, alone. */
const HIDDEN = /^[\p{Cc}\p{Cf}\p{Cs}]$/u;

/** The escapes of the commonest control characters. */
const NAMED_ESCAPES: ReadonlyMap<string, string> = new Map([
  ["\n", "\\n"],
  ["\t", "\\t"],
  ["\r", "\\r"],
]);

/** The characters of a value, each as a text shows it: a hidden one
    escaped, `\n`, `‮`, `\u{e0001}`, and any other as it is, a
    quote and a backslash among them. */
function escapedCharacters(value: string): string[] {
  return Array.from(value, (character) => {
    if (!HIDDEN.test(character)) {
      return character;
    }
    const named = NAMED_ESCAPES.get(character);
    if (named !== undefined) {
      return named;
    }
    const code = character.codePointAt(0);
    if (code === undefined) {
      throw defect("a character of a value has no code.");
    }
    const hex = code.toString(16);
    return code > 0xffff ? `\\u{${hex}}` : `\\u${hex.padStart(4, "0")}`;
  });
}

/** A position of a list, 0 the first, as an ordinal: "first", "11th".
    Exported for its tests alone. */
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

/** A part of a pattern of the table of the fields: a field by its name, a
    position by its number, `N`, any position of a list, whose ordinal the
    words are given, or `REST`, last, any fields below, named by the words
    of the pattern alone. */
const N: unique symbol = Symbol("any position");
const REST: unique symbol = Symbol("any fields below");
type PatternPart = string | number | typeof N | typeof REST;

/** The words of a field, from the ordinals of the positions its pattern
    matched, in order. */
type Words = (ordinals: readonly string[]) => string;

type FieldWords = readonly [readonly PatternPart[], Words];

/** The words of the fields of a variants file, below its words `file`. */
function sourceFields(
  base: readonly PatternPart[],
  file: string,
): FieldWords[] {
  return [
    [base, () => file],
    [[...base, "fileId"], () => `the identifier of ${file}`],
    [[...base, "name"], () => `the name of ${file}`],
    [[...base, "size"], () => `the size of ${file}`],
    [[...base, "format"], () => `the format of ${file}`],
    [[...base, "readOptions"], () => `the options set to read ${file}`],
    [
      [...base, "readOptions", "ploidy"],
      () => `the ploidy set to read ${file}`,
    ],
    [
      [...base, "readOptions", "onlyPassed"],
      () => `the option set to read only the variants that passed from ${file}`,
    ],
    [[...base, "read"], () => `what was read of ${file}`],
    [[...base, "read", "kind"], () => `what was read of ${file}`],
    [
      [...base, "read", "individuals"],
      () => `the individuals found in ${file}`,
    ],
    [
      [...base, "read", "individuals", N],
      (o) => `the ${nth(o, 0)} individual found in ${file}`,
    ],
    [[...base, "read", "ploidy"], () => `the ploidy found in ${file}`],
    [[...base, "read", "numVars"], () => `the number of variants of ${file}`],
    [
      [...base, "read", "error", REST],
      () => `the reason ${file} could not be read`,
    ],
  ];
}

/**
 * The table of the fields of the project in words. A field is found by
 * the longest pattern that matches its path. Every field a project has is
 * in it, which the tests check on random projects; the fallback of
 * `fieldWords` is for a path no project has.
 */
const FIELD_WORDS: readonly FieldWords[] = [
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
  ].map((name): FieldWords => [
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
  ...["maxAllowedMissingRate", "maxAllowedObsHet"].map((name): FieldWords => [
    ["individualFilters", N, name],
    (o) => `the threshold of the ${nth(o, 0)} filter of the individuals`,
  ]),
  [["individuals"], () => "the individuals file"],
  [["individuals", "fileId"], () => "the identifier of the individuals file"],
  [["individuals", "name"], () => "the name of the individuals file"],
  [
    ["individuals", "csv"],
    () => "the options set to read the individuals file",
  ],
  [
    ["individuals", "csv", "encoding"],
    () => "the encoding set to read the individuals file",
  ],
  [
    ["individuals", "csv", "separator"],
    () => "the separator set to read the individuals file",
  ],
  [
    ["individuals", "csv", "decimal"],
    () => "the decimal mark set to read the individuals file",
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
    ["individuals", "read", "table", "rows", N, 0],
    (o) =>
      `the name of the individual of the ${nth(o, 0)} row of the individuals file`,
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
    () =>
      "the encoding, separator and decimal mark found in the individuals file",
  ],
  [
    ["individuals", "read", "found", "encoding"],
    () => "the encoding found in the individuals file",
  ],
  [
    ["individuals", "read", "found", "separator"],
    () => "the separator found in the individuals file",
  ],
  [
    ["individuals", "read", "found", "decimal"],
    () => "the decimal mark found in the individuals file",
  ],
  [
    ["individuals", "read", "error", REST],
    () => "the reason the individuals file could not be read",
  ],
  [["grouping"], () => "the grouping of the individuals"],
  [["grouping", "kind"], () => "the grouping of the individuals"],
  [["grouping", "column"], () => "the column of the populations"],
  [["grouping", "roles"], () => "the roles of the columns"],
  [
    ["grouping", "roles", N],
    (o) => `the ${nth(o, 0)} column in the roles of the columns`,
  ],
  [
    ["grouping", "roles", N, 0],
    (o) => `the name of the ${nth(o, 0)} column in the roles of the columns`,
  ],
  [
    ["grouping", "roles", N, 1],
    (o) => `the role of the ${nth(o, 0)} column in the roles of the columns`,
  ],
  [["analyses"], () => "the analyses and their options"],
  [["analyses", N], (o) => `the ${nth(o, 0)} analysis`],
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
    (o) => `the ${nth(o, 0)} analysis with check numbers`,
  ],
  [
    ["reference", "checks", N, "analysis"],
    (o) => `the name of the ${nth(o, 0)} analysis with check numbers`,
  ],
  [
    ["reference", "checks", N, "numbers"],
    (o) => `the numbers of the ${nth(o, 0)} analysis with check numbers`,
  ],
  [
    ["reference", "checks", N, "numbers", N],
    (o) =>
      `the ${nth(o, 1)} number of the ${nth(o, 0)} analysis with check numbers`,
  ],
  [
    ["reference", "checks", N, "keyVersion"],
    (o) =>
      `the version of the calculation of the ${nth(o, 0)} analysis with check numbers`,
  ],
  [
    ["reference", "checks", N, "settings"],
    (o) =>
      `the record of the settings the ${nth(o, 0)} analysis with check numbers was calculated with`,
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

/** The ordinals of the positions of `path` a pattern matches, or `null`
    when it does not match. */
function matchOf(
  pattern: readonly PatternPart[],
  path: FieldPath,
): string[] | null {
  const ordinals: string[] = [];
  for (const [at, part] of pattern.entries()) {
    if (part === REST) {
      return ordinals;
    }
    const segment = path[at];
    if (part === N) {
      if (typeof segment !== "number") {
        return null;
      }
      ordinals.push(ordinal(segment));
    } else if (segment !== part) {
      return null;
    }
  }
  return pattern.length === path.length ? ordinals : null;
}

/** A field of the project in words, from the table of the fields: the
    pattern that matches the most of its path. */
function fieldWords(path: FieldPath): string {
  let best: { length: number; words: string } | null = null;
  for (const [pattern, words] of FIELD_WORDS) {
    const ordinals = matchOf(pattern, path);
    const length = pattern.length;
    if (ordinals !== null && (best === null || length > best.length)) {
      best = { length, words: words(ordinals) };
    }
  }
  if (best !== null) {
    return best.words;
  }
  // No project has such a path; it is named after the nearest field that
  // has words.
  return path.length === 0
    ? "the project"
    : `a part of ${fieldWords(path.slice(0, -1))}`;
}
