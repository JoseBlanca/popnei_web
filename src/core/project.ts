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

import type { IndividualsKept } from "./individualsKept.ts";
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
  LoadFormat,
  Pops,
  RunError,
  VariantFilter,
  VariantFilterKind,
  VcfReadOptions,
} from "../worker/protocol.ts";
import {
  cellNumber,
  columnLetters,
  columnWarnings,
  inferColumnTypes,
} from "../worker/individuals/columnTypes.ts";
import type { ColumnWarning } from "../worker/individuals/columnTypes.ts";

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
  /** The filters of the variants, at most one of each kind, in the fixed
      order of `VARIANT_FILTER_ORDER`, whatever the order the user added
      them in; the LD filter with no distance until the user types one. */
  readonly filters: readonly ProjectVariantFilter[];
  /** The filters of the variants the user turned off, with the values
      they had, for the switch that turns them on again; at most one of
      each kind, in the same fixed order, and no kind both here and in
      `filters`. No key, no job and no lock reads them. */
  readonly filtersOff: readonly ProjectVariantFilter[];
  /** The filters of the individuals, at most one of each kind, in the
      fixed order keep, remove, missing_data, obs_het. */
  readonly individualFilters: readonly IndividualFilter[];
  /** The thresholds of the individuals the user turned off, with their
      values, in the order missing_data, obs_het, and no kind both here
      and in `individualFilters`. The lists have no switch, and are never
      kept here. */
  readonly individualFiltersOff: readonly IndividualThreshold[];
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

/**
 * A filter of the variants as the project holds it: a `VariantFilter` of
 * the protocol, but that the LD filter's `maxDist` is `null` from the
 * moment its switch is turned on until the user types a distance, which
 * has no default (the project spec, "What an analysis needs of every
 * project"). A job never carries a `null` distance: `jobFilters` gives
 * the filters of every job.
 */
export type ProjectVariantFilter =
  | Exclude<VariantFilter, { readonly kind: "ld" }>
  | {
      readonly kind: "ld";
      readonly maxAllowedR2: number;
      readonly maxDist: number | null;
    };

/** A filter of the individuals that has a switch in the Variants step,
    and so can be turned off and kept: a threshold, not a list. */
export type IndividualThreshold = Extract<
  IndividualFilter,
  { readonly kind: "missing_data" | "obs_het" }
>;

/** The kind of a threshold of the individuals: missing_data or obs_het. */
export type ThresholdKind = IndividualThreshold["kind"];

/** The variants file of one load. */
export interface VariantSource {
  /** The load id: 16 random bytes as 32 lower case hexadecimal digits. */
  readonly fileId: string;
  /** The name of the file, as the browser gives it; in no key. */
  readonly name: string;
  /** The size of the file in bytes; in no key. */
  readonly size: number;
  /** The format of the file. */
  readonly format: LoadFormat["format"];
  /** How a VCF is read, its ploidy a whole number from 1 to 255, or
      `null` for the ploidy read from the file, which only the page that
      opens a variants file, popgen2.html, gives and no project file
      holds; `null` for a `.nei`. */
  readonly readOptions: VcfReadOptions | null;
  /** What the calculation worker read of the file. */
  readonly read: SourceRead;
}

/** What the calculation worker read of the variants file. */
export type SourceRead =
  /** Not read yet. */
  | { readonly kind: "pending" }
  /** Read: its individuals in the order of the file, its ploidy, its
      number of variants, `null` until a first pass has counted them, and
      whether its variants record whether each passed its FILTER, popnei's
      `Variants.keepsPassed`, which no project file holds. */
  | {
      readonly kind: "read";
      readonly individuals: readonly string[];
      readonly ploidy: number;
      readonly numVars: number | null;
      readonly keepsPassed: boolean;
    }
  /** Could not be read. */
  | { readonly kind: "failed"; readonly error: SourceError };

/**
 * Why the variants file could not be read: popnei refused the file, or
 * the worker failed before popnei answered, because it could not start,
 * it crashed, or the browser could no longer read the file,
 * `reopenFailed`.
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

/** A column's name, with a type. */
export type ColumnTypeOf = readonly [column: string, type: ColumnType];

/** The individuals file of one load. */
export interface IndividualsSource {
  /** The load id: 16 random bytes as 32 lower case hexadecimal digits. */
  readonly fileId: string;
  /** The name of the file, as the browser gives it. */
  readonly name: string;
  /** How a CSV or TSV is read; `null` for an xlsx. */
  readonly csv: CsvOptions | null;
  /** The types the user set, each by the name of its column, applied by
      the read or waiting for a read that allows them (`typesLost`); never
      identifier, and no column twice. */
  readonly typesSet: readonly ColumnTypeOf[];
  /** What the light worker read of the file. */
  readonly read: IndividualsRead;
}

/** What the light worker read of the individuals file. */
export type IndividualsRead =
  /** Not read yet. */
  | { readonly kind: "pending" }
  /** Read: the table, the type of each of its columns, and the three
      options of the CSV the read used, each as set or, where it was
      `"auto"`, as found; `null` for an xlsx. */
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
    }
  /** Named by an opened project, not read when the project was saved, so
      the project file holds no table of it and the page no copy of the
      file: no read is asked, and what uses the file is locked until the
      user loads it again or removes it. Made only by the opening of a
      project file. */
  | { readonly kind: "notGiven" };

/** A read as the light worker gives it, to be recorded; the record puts
    on its columns the types of `typesSet` that it allows. */
export type IndividualsReadGiven = Extract<
  IndividualsRead,
  { readonly kind: "read" | "failed" }
>;

/**
 * The grouping of the individuals. A column is named by its name in the
 * header, so that it is found again when the file is loaded again with its
 * columns in another order.
 */
export type Grouping =
  /** Population genetics: the column that defines the populations, `null`
      until one is chosen; without an individuals file it is kept and not
      looked at. */
  | { readonly kind: "populations"; readonly column: string | null }
  /** Population genetics: every individual in one population, "All
      individuals", which a project with an individuals file can choose. */
  | { readonly kind: "onePopulation" }
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
  /** The check numbers of each analysis, each with the versions it was
      calculated with. */
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
  /** The version of popnei the numbers were calculated with. */
  readonly popneiVersion: string;
  /** The version of the application the numbers were calculated with. */
  readonly appVersion: string;
  /** The fingerprints of its settings in the file, made when the file
      is opened, never saved. */
  readonly settings: CheckSettings;
}

/**
 * The fingerprints of the settings of a check, each 64 lower case
 * hexadecimal digits: one for a variants file whose variants record
 * whether they passed their FILTER, `keepsPassed` true, and one for a
 * file whose variants do not. The two differ only when the filter of the
 * FILTER column is on, which applies to the first file and not to the
 * second. A project file does not say which its file is, so both are
 * made when it is opened, and the comparison takes the one of the
 * variants file the user gave again, as its read tells
 * (docs/specs/core/keys.md, "The fingerprint of the settings").
 */
export interface CheckSettings {
  /** For a file whose variants record their FILTER. */
  readonly passedKept: string;
  /** For a file whose variants do not. */
  readonly passedNotKept: string;
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
  /** A filter out of the fixed order of the kinds of its list, of the
      variants or of the individuals. */
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
  passed: "the FILTER column",
  missing_data: "missing genotypes",
  maf: "major allele frequency",
  obs_het: "observed heterozygosity",
  ld: "linkage disequilibrium",
  keep: "individuals to keep",
  remove: "individuals to remove",
};

/** The kinds of filter of the variants, in the order a project keeps
    them: the filter of the FILTER column first, which has no field. */
const VARIANT_FILTER_KINDS: Kinds<VariantFilterKind> = {
  passed: { fields: [], words: FILTER_KIND_WORDS.passed },
  missing_data: {
    fields: ["maxAllowedMissingRate"],
    words: FILTER_KIND_WORDS.missing_data,
  },
  obs_het: { fields: ["maxAllowedObsHet"], words: FILTER_KIND_WORDS.obs_het },
  maf: { fields: ["maxAllowedMaf"], words: FILTER_KIND_WORDS.maf },
  ld: { fields: ["maxAllowedR2", "maxDist"], words: FILTER_KIND_WORDS.ld },
};

/** The order the filters of the variants are kept in: passed,
    missing_data, obs_het, maf, ld. "regions" joins first with popnei's
    filter of the regions of a BED file. */
export const VARIANT_FILTER_ORDER: readonly VariantFilterKind[] =
  keysOf(VARIANT_FILTER_KINDS);

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

/** The kinds of the thresholds of the individuals, which can be turned
    off and kept, in the order `individualFiltersOff` keeps them. */
const THRESHOLD_KINDS: Kinds<ThresholdKind> = {
  missing_data: INDIVIDUAL_FILTER_KINDS.missing_data,
  obs_het: INDIVIDUAL_FILTER_KINDS.obs_het,
};

/** The order of the thresholds of the individuals, and of
    `individualFiltersOff`: missing_data, obs_het, as in
    `INDIVIDUAL_FILTER_ORDER`. */
export const THRESHOLD_ORDER: readonly ThresholdKind[] =
  keysOf(THRESHOLD_KINDS);

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
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
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

/** The error of a value that may also be `null`, which the text calls
    nothing: "a whole number, 1 or more, or nothing". */
function orNothing(error: ProjectError): ProjectError {
  if (error.kind !== "wrongValue") {
    return error;
  }
  const expected = error.expected;
  return wrongValue(
    error.path,
    expected.includes(",")
      ? `${expected}, or nothing`
      : `${expected} or nothing`,
  );
}

/** Checks the `maxDist` of the LD filter: `null`, a distance not typed
    yet, or a whole number from 1 to 2^53 − 1. */
function ldDistError(
  maxDist: number | null,
  path: FieldPath,
): ProjectError | null {
  if (maxDist === null) {
    return null;
  }
  const error = wholeNumberError(maxDist, 1, MAX_LD_DIST, path);
  return error === null ? null : orNothing(error);
}

/** Checks the thresholds of a filter of the variants, from 0 to 1, and
    its `maxDist`, a whole number from 1 to 2^53 − 1 or `null`, a
    distance not typed yet. */
function variantFilterError(
  filter: ProjectVariantFilter,
  path: FieldPath,
): ProjectError | null {
  switch (filter.kind) {
    case "passed":
      return null;
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
        ldDistError(filter.maxDist, [...path, "maxDist"])
      );
  }
}

/** Checks the threshold of a filter of the individuals, from 0 to 1. A
    list of individuals is checked by `individualListNeeds`, not here. */
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
    read options for a VCF, with a ploidy from 1 to 255 or `null`, read
    from the file, and none for a `.nei`. */
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
  // A ploidy of null is read from the file by popnei.
  const ploidy = load.readOptions.ploidy;
  return ploidy === null
    ? null
    : wholeNumberError(ploidy, 1, MAX_PLOIDY, [...optionsPath, "ploidy"]);
}

/** Checks that a grouping is of the application `app`: the populations
    in population genetics, the roles of the columns in association. */
function groupingError(
  grouping: Grouping,
  app: AppId,
  path: FieldPath,
): ProjectError | null {
  if (app === "popgen") {
    return grouping.kind === "populations" || grouping.kind === "onePopulation"
      ? null
      : wrongValue(
          [...path, "kind"],
          "the column of the populations or all individuals in one population",
        );
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
  return tableError(read, path);
}

/**
 * Checks that the table of the individuals file is one the reader gives,
 * and that the types of its columns agree with it: at least one column and
 * one row, no name of the header twice, every row as long as the header,
 * the first cell of each row the name of an individual, a text that is not
 * empty, no individual in two rows; one type per column, the first
 * `identifier` and no other, and each other type one its values allow, by
 * `columnAllows`: a binary type with the two texts of the column's values,
 * in either coding, and a continuous type only on a column of numbers.
 * `path` is that of the read.
 */
function tableError(read: TableRead, path: FieldPath): ProjectError | null {
  const { table, columns } = read;
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
  const allows = columnAllows(read);
  for (const [index, type] of columns.entries()) {
    const wrong = typeError(allows, index, type);
    if (wrong !== null) {
      return inconsistentTable([...path, "columns", index], wrong);
    }
  }
  return null;
}

/** What is wrong with `type` on the column at `index` of a table whose
    columns allow `allows`, the end of a sentence whose subject is the
    type; null when the column may have it. */
function typeError(
  allows: readonly ColumnAllows[],
  index: number,
  type: ColumnType,
): string | null {
  if (index === 0) {
    return type.kind === "identifier"
      ? null
      : "should be identifier, since the first column names the individuals";
  }
  const allowed = allows[index];
  if (allowed === undefined) {
    throw defect(
      `a table has no types allowed for its column ${String(index)}.`,
    );
  }
  switch (type.kind) {
    case "identifier":
      return "cannot be identifier: only the first column can have that type";
    case "categorical":
      return null;
    case "continuous":
      return allowed.continuous
        ? null
        : "cannot be continuous: its values are not all numbers";
    case "binary":
      if (allowed.binary === null) {
        return "cannot be binary: its column does not have exactly two values";
      }
      return sameValues(type, allowed.binary)
        ? null
        : `should be binary with the values ${shown(allowed.binary.one)} and ${shown(allowed.binary.zero)}, in either coding`;
  }
}

/** Whether a binary type holds the same two values as `allowed`, in
    either coding; `allowed` has two different ones, so one coded twice
    does not. */
function sameValues(
  type: { readonly one: string; readonly zero: string },
  allowed: { readonly one: string; readonly zero: string },
): boolean {
  return (
    (type.one === allowed.one && type.zero === allowed.zero) ||
    (type.one === allowed.zero && type.zero === allowed.one)
  );
}

// The types of the columns: which each column allows, worked out from the
// table, and the types the user set that a read does not apply.

/** A read of the individuals file that gave its table. */
export type TableRead = Extract<IndividualsRead, { readonly kind: "read" }>;

/** The types the values of one column allow, besides categorical, which
    any column but the first allows. */
export interface ColumnAllows {
  /** Whether every value of the column that is not missing is a number,
      with the decimal mark of the read, and there is one at least. */
  readonly continuous: boolean;
  /** The binary type of a column of exactly two values, compared as
      text, with the reader's coding; null for any other column. */
  readonly binary: {
    readonly kind: "binary";
    readonly one: string;
    readonly zero: string;
  } | null;
}

/** The answers of `columnAllows`, by the table and the decimal mark, so
    that every read of one table, whatever its types, finds them. */
const ALLOWS = new WeakMap<
  IndividualsTable,
  Map<"." | ",", readonly ColumnAllows[]>
>();

/**
 * The types each column of a read allows, one per column in the order of
 * its table, from its values and the decimal mark of the read,
 * `found.decimal`, or the point for an xlsx, whose `found` is null. The
 * first column allows neither. A cell is a number by the reader's rule,
 * and a binary column has the reader's coding, since both come from the
 * reader's own functions. The same array for the same table and mark, so
 * that a table of 10,000 rows is walked once. Throws a defect when a row
 * is not as long as the header, which the checks of a read refuse first.
 */
export function columnAllows(read: TableRead): readonly ColumnAllows[] {
  const decimal = read.found?.decimal ?? ".";
  let byDecimal = ALLOWS.get(read.table);
  if (byDecimal === undefined) {
    byDecimal = new Map();
    ALLOWS.set(read.table, byDecimal);
  }
  const kept = byDecimal.get(decimal);
  if (kept !== undefined) {
    return kept;
  }
  const inferred = inferColumnTypes(read.table, decimal);
  const allows = inferred.map((type, index): ColumnAllows => {
    if (index === 0) {
      return { continuous: false, binary: null };
    }
    return {
      continuous: allNumbers(read.table, index, decimal),
      binary:
        type.kind === "binary"
          ? { kind: "binary", one: type.one, zero: type.zero }
          : null,
    };
  });
  byDecimal.set(decimal, allows);
  return allows;
}

/** Whether every cell of the column at `index` that is not missing is a
    number read with `decimal`, and one is at least. */
function allNumbers(
  table: IndividualsTable,
  index: number,
  decimal: "." | ",",
): boolean {
  let found = false;
  for (const row of table.rows) {
    const cell: Cell | undefined = row[index];
    if (cell === undefined || cell === null) {
      continue;
    }
    if (cellNumber(cell, decimal) === null) {
      return false;
    }
    found = true;
  }
  return found;
}

/** Whether a read allows the type set `type` on `column`: a column of its
    table that is not the first, whose values allow the type. */
function applies(read: TableRead, [column, type]: ColumnTypeOf): boolean {
  const index = read.table.columns.indexOf(column);
  return index > 0 && typeError(columnAllows(read), index, type) === null;
}

/** The answers of `typesLost`, by the source. */
const LOST = new WeakMap<IndividualsSource, readonly ColumnTypeOf[]>();

/** Nothing lost, for a source not read. */
const NONE_LOST: readonly ColumnTypeOf[] = Object.freeze([]);

/**
 * The types of `source.typesSet` that its read does not apply, in the
 * order of `typesSet`: their column is gone, is now the first, which names
 * the individuals, or has values that do not allow the type. `[]` for a
 * source not read. The same array for the same source, so that a screen
 * that compares it is not drawn again.
 */
export function typesLost(source: IndividualsSource): readonly ColumnTypeOf[] {
  const read = source.read;
  if (read.kind !== "read") {
    return NONE_LOST;
  }
  const kept = LOST.get(source);
  if (kept !== undefined) {
    return kept;
  }
  const lost = source.typesSet.filter((pair) => !applies(read, pair));
  LOST.set(source, lost);
  return lost;
}

/**
 * Why a read does not apply a type the user set on `column`, one of
 * `typesLost` of its source: `"gone"`, its table has no such column;
 * `"firstColumn"`, the column is its first, which names the individuals;
 * `"values"`, the values of the column do not allow the type.
 */
export function typeLostReason(
  read: TableRead,
  column: string,
): "gone" | "firstColumn" | "values" {
  const index = read.table.columns.indexOf(column);
  if (index === -1) {
    return "gone";
  }
  return index === 0 ? "firstColumn" : "values";
}

/** The warning each column of a table would have if it were continuous,
    by the table and the decimal mark, by the name of the column; the
    first column, the names of the individuals, has none. */
const WARNED = new WeakMap<
  IndividualsTable,
  Map<"." | ",", ReadonlyMap<string, ColumnWarning>>
>();

/** The answers of `columnWarningsOf`, by the read. */
const WARNINGS = new WeakMap<TableRead, readonly ColumnWarning[]>();

/**
 * The warnings of the columns of few whole numbers of a read, as
 * `columnWarnings` of the reader gives them for its table, its types and
 * its decimal mark, `found.decimal` or the point for an xlsx, whose
 * `found` is null. The same array for the same read. The walk of each
 * column does not depend on the types, so it is kept by the table and
 * the mark, for every column but the first as if it were continuous: a
 * read that changes only a type walks no column again, and a column the
 * read does not type continuous has no warning. Throws a defect when a
 * row is not as long as the header, as `columnWarnings` does.
 */
export function columnWarningsOf(read: TableRead): readonly ColumnWarning[] {
  const kept = WARNINGS.get(read);
  if (kept !== undefined) {
    return kept;
  }
  const decimal = read.found?.decimal ?? ".";
  let byDecimal = WARNED.get(read.table);
  if (byDecimal === undefined) {
    byDecimal = new Map();
    WARNED.set(read.table, byDecimal);
  }
  let byColumn = byDecimal.get(decimal);
  if (byColumn === undefined) {
    const everyContinuous = read.table.columns.map((_, index): ColumnType =>
      index === 0 ? { kind: "identifier" } : { kind: "continuous" },
    );
    byColumn = new Map(
      columnWarnings(read.table, everyContinuous, decimal).map((warning) => [
        warning.column,
        Object.freeze(warning),
      ]),
    );
    byDecimal.set(decimal, byColumn);
  }
  const warned = byColumn;
  const warnings = Object.freeze(
    read.columns.flatMap((type, index) => {
      if (type.kind !== "continuous") {
        return [];
      }
      const warning = warned.get(columnName(read.table, index));
      return warning === undefined ? [] : [warning];
    }),
  );
  WARNINGS.set(read, warnings);
  return warnings;
}

/** The name of the column at `index` of `table`, which has it. */
function columnName(table: IndividualsTable, index: number): string {
  const name = table.columns[index];
  if (name === undefined) {
    throw defect(`the table has no column ${String(index)}.`);
  }
  return name;
}

/** The number of distinct values `firstValues` gives of each column. */
const FIRST_VALUES = 3;

/** The answers of `firstValues`, by the table. */
const FIRST = new WeakMap<IndividualsTable, readonly (readonly string[])[]>();

/**
 * The first three distinct values of each column of `table` that are not
 * missing, as `String` writes them, in the order of the file: one array
 * per column, in the order of the table, which the Individuals step shows
 * beside each type. The same array for the same table, so that a table of
 * 10,000 rows is walked once.
 */
export function firstValues(
  table: IndividualsTable,
): readonly (readonly string[])[] {
  const kept = FIRST.get(table);
  if (kept !== undefined) {
    return kept;
  }
  const values = Object.freeze(
    table.columns.map((_, index) => {
      const found: string[] = [];
      for (const row of table.rows) {
        const cell: Cell | undefined = row[index];
        if (cell === undefined || cell === null) {
          continue;
        }
        const text = String(cell);
        if (!found.includes(text)) {
          found.push(text);
        }
        if (found.length === FIRST_VALUES) {
          break;
        }
      }
      return Object.freeze(found);
    }),
  );
  FIRST.set(table, values);
  return values;
}

/** The columns of a read with each type of `typesSet` that it allows put
    on its column, in the order of `typesSet`; `read.columns` itself when
    none changes a type. */
function withTypesSet(
  read: TableRead,
  typesSet: readonly ColumnTypeOf[],
): readonly ColumnType[] {
  let columns = read.columns;
  for (const [column, type] of typesSet) {
    const index = read.table.columns.indexOf(column);
    if (applies(read, [column, type]) && !same(columns[index], type)) {
      columns = columns.with(index, type);
    }
  }
  return columns;
}

/**
 * Checks the types the user set of a source: no column named twice, no
 * identifier, a binary type of two different values; and, in a source
 * read, each type the read allows the type of its column, since the
 * record put it there. `path` is that of `typesSet`.
 */
function typesSetError(
  typesSet: readonly ColumnTypeOf[],
  read: IndividualsRead,
  path: FieldPath,
): ProjectError | null {
  const named = new Set<string>();
  for (const [index, [column, type]] of typesSet.entries()) {
    if (named.has(column)) {
      return repeated([...path, index, 0], "column", column);
    }
    named.add(column);
    if (type.kind === "identifier") {
      return wrongValue(
        [...path, index, 1],
        "categorical, binary or continuous, since only the first column is the identifier",
      );
    }
    if (type.kind === "binary" && type.one === type.zero) {
      return wrongValue(
        [...path, index, 1],
        "binary with two different values",
      );
    }
    if (read.kind !== "read" || !applies(read, [column, type])) {
      continue;
    }
    const there = read.columns[read.table.columns.indexOf(column)];
    if (!same(there, type)) {
      return inconsistentTable(
        [...path, index],
        `names the column ${shown(column)}, whose values allow the type set, but that column has another type`,
      );
    }
  }
  return null;
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

function copyVariantFilter(filter: ProjectVariantFilter): ProjectVariantFilter {
  switch (filter.kind) {
    case "passed":
      return { kind: filter.kind };
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

/** Where a filter of the kind `kind` goes in a list kept in the order
    `order`: `index`, that of the filter of its kind already there, or -1
    when there is none; and `at`, its place, `index`, or before the first
    filter of a kind after it in the order. */
function placeOf<K extends string>(
  filters: readonly { readonly kind: K }[],
  order: readonly K[],
  kind: K,
): { readonly index: number; readonly at: number } {
  const index = filters.findIndex((f) => f.kind === kind);
  if (index !== -1) {
    return { index, at: index };
  }
  const rank = order.indexOf(kind);
  const after = filters.findIndex((f) => order.indexOf(f.kind) > rank);
  return { index, at: after === -1 ? filters.length : after };
}

/** Sets the filter of its kind on, in the fixed order of the kinds,
    `VARIANT_FILTER_ORDER`, in place of the one of its kind, and
    drops the one of its kind from `filtersOff`; the LD filter may have no
    distance yet, `maxDist` `null`. */
export function setVariantFilter(
  p: Project,
  filter: ProjectVariantFilter,
): Project {
  const { index, at } = placeOf(p.filters, VARIANT_FILTER_ORDER, filter.kind);
  refuse("setVariantFilter", variantFilterError(filter, ["filters", at]));
  const copy = copyVariantFilter(filter);
  if (index === -1) {
    return {
      ...p,
      filters: p.filters.toSpliced(at, 0, copy),
      filtersOff: withoutKind(p.filtersOff, filter.kind),
    };
  }
  if (same(p.filters[index], copy)) {
    return p;
  }
  return { ...p, filters: p.filters.with(index, copy) };
}

/** Turns the filter of the variants of that kind off: it leaves
    `filters` and is kept, with its values, in `filtersOff`, in the fixed
    order. `p` itself when no filter of that kind is on, whatever
    `filtersOff` holds; a defect when one of that kind is on and kept off
    at once, which no command makes. */
export function turnOffVariantFilter(
  p: Project,
  kind: VariantFilterKind,
): Project {
  const filter = p.filters.find((f) => f.kind === kind);
  if (filter === undefined) {
    return p;
  }
  return {
    ...p,
    filters: withoutKind(p.filters, kind),
    filtersOff: keptOff(p.filtersOff, VARIANT_FILTER_ORDER, filter),
  };
}

/** The list without the filter of the kind `kind`; the list itself when
    it has none, so that a part a command did not change keeps its
    reference. */
function withoutKind<F extends { readonly kind: string }>(
  filters: readonly F[],
  kind: string,
): readonly F[] {
  return filters.some((f) => f.kind === kind)
    ? filters.filter((f) => f.kind !== kind)
    : filters;
}

/** The list of the filters off with `filter` kept in it, in the order
    `order`. The list holds none of its kind, since turning a filter on
    takes its kind out of it and `parseProject` refuses a filter both on
    and off: one there is a defect. */
function keptOff<K extends string, F extends { readonly kind: K }>(
  filtersOff: readonly F[],
  order: readonly K[],
  filter: F,
): readonly F[] {
  const { index, at } = placeOf(filtersOff, order, filter.kind);
  if (index !== -1) {
    throw defect(
      `the filter ${JSON.stringify(filter.kind)} was turned off while one of its kind was kept off.`,
    );
  }
  return filtersOff.toSpliced(at, 0, filter);
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

/** Sets the filter of its kind on, in the fixed order of the kinds,
    keep, remove, missing_data, obs_het, in place of the one of its kind;
    a threshold drops the one of its kind from `individualFiltersOff`. */
export function setIndividualFilter(
  p: Project,
  filter: IndividualFilter,
): Project {
  const { index, at } = placeOf(
    p.individualFilters,
    INDIVIDUAL_FILTER_ORDER,
    filter.kind,
  );
  refuse(
    "setIndividualFilter",
    individualFilterError(filter, ["individualFilters", at]),
  );
  const copy = copyIndividualFilter(filter);
  if (index === -1) {
    return {
      ...p,
      individualFilters: p.individualFilters.toSpliced(at, 0, copy),
      individualFiltersOff: withoutKind(p.individualFiltersOff, filter.kind),
    };
  }
  if (same(p.individualFilters[index], copy)) {
    return p;
  }
  return { ...p, individualFilters: p.individualFilters.with(index, copy) };
}

/** Removes the list of individuals of that kind, which is not kept, as
    Clear empties a list; `p` itself when there is none. */
export function removeIndividualFilter(
  p: Project,
  kind: "keep" | "remove",
): Project {
  if (!p.individualFilters.some((f) => f.kind === kind)) {
    return p;
  }
  return { ...p, individualFilters: withoutKind(p.individualFilters, kind) };
}

/** Turns the threshold of the individuals of that kind off: it leaves
    `individualFilters` and is kept, with its value, in
    `individualFiltersOff`, in the fixed order. `p` itself when no
    threshold of that kind is on, whatever `individualFiltersOff` holds;
    a defect when one of that kind is on and kept off at once, which no
    command makes. */
export function turnOffIndividualFilter(
  p: Project,
  kind: IndividualThreshold["kind"],
): Project {
  const threshold = p.individualFilters.find(
    (f): f is IndividualThreshold => f.kind === kind,
  );
  if (threshold === undefined) {
    return p;
  }
  return {
    ...p,
    individualFilters: withoutKind(p.individualFilters, kind),
    individualFiltersOff: keptOff(
      p.individualFiltersOff,
      THRESHOLD_ORDER,
      threshold,
    ),
  };
}

/** A threshold of popgen2.html: a filter of one number, a maximum, of
    the variants, the missing rate, the MAF and the observed
    heterozygosity, or of the individuals, the missing rate and the
    observed heterozygosity. */
export type Threshold =
  | {
      readonly of: "variants";
      readonly kind: "missing_data" | "maf" | "obs_het";
    }
  | { readonly of: "individuals"; readonly kind: ThresholdKind };

/** The value at which a threshold, a maximum, keeps everything, and so
    the value `setThreshold` takes as off, not as a filter at that value:
    popnei's filters of the MAF and of the observed heterozygosity drop a
    variant with no called genotype at every threshold, so a filter at 1
    is not the same as no filter, as the owner decided on 7 October 2026
    (docs/specs/core/project.md, "A threshold, on or off"). */
const THRESHOLD_OFF_AT = 1;

/** The filter of a threshold of the variants on at `value`. */
function variantThresholdFilter(
  kind: Extract<Threshold, { readonly of: "variants" }>["kind"],
  value: number,
): ProjectVariantFilter {
  switch (kind) {
    case "missing_data":
      return { kind, maxAllowedMissingRate: value };
    case "maf":
      return { kind, maxAllowedMaf: value };
    case "obs_het":
      return { kind, maxAllowedObsHet: value };
  }
}

/** The filter of a threshold of the individuals on at `value`. */
function individualThresholdFilter(
  kind: ThresholdKind,
  value: number,
): IndividualThreshold {
  switch (kind) {
    case "missing_data":
      return { kind, maxAllowedMissingRate: value };
    case "obs_het":
      return { kind, maxAllowedObsHet: value };
  }
}

/** Sets the threshold on at `value`, a number from 0 to below 1, as
    `setVariantFilter` or `setIndividualFilter` would; for `null`, its
    box emptied, and for 1, the value at which a maximum keeps
    everything, turns it off, as `turnOffVariantFilter` or
    `turnOffIndividualFilter` would, kept with the value it had while on
    and not with 1, and `p` itself when it is off already. The one
    command of a threshold of popgen2.html, whether its number was typed,
    dragged or moved with the keys. A number below 0 or above 1, or one
    not finite, is a defect. */
export function setThreshold(
  p: Project,
  threshold: Threshold,
  value: number | null,
): Project {
  if (value !== null && !(Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw defect(
      `setThreshold was given ${String(value)}, where a number from 0 to 1, or null, was expected.`,
    );
  }
  const off = value === null || value === THRESHOLD_OFF_AT;
  if (threshold.of === "variants") {
    return off
      ? turnOffVariantFilter(p, threshold.kind)
      : setVariantFilter(p, variantThresholdFilter(threshold.kind, value));
  }
  return off
    ? turnOffIndividualFilter(p, threshold.kind)
    : setIndividualFilter(p, individualThresholdFilter(threshold.kind, value));
}

/** The value of the threshold while its filter is on; `null` while it is
    off, kept in its list of the filters off or never turned on. */
export function thresholdValue(
  p: Project,
  threshold: Threshold,
): number | null {
  const filter =
    threshold.of === "variants"
      ? p.filters.find((f) => f.kind === threshold.kind)
      : p.individualFilters.find((f) => f.kind === threshold.kind);
  if (filter === undefined) {
    return null;
  }
  switch (filter.kind) {
    case "missing_data":
      return filter.maxAllowedMissingRate;
    case "maf":
      return filter.maxAllowedMaf;
    case "obs_het":
      return filter.maxAllowedObsHet;
    case "passed":
    case "ld":
    case "keep":
    case "remove":
      throw defect(
        `the threshold ${JSON.stringify(threshold)} found the filter ${JSON.stringify(filter.kind)}.`,
      );
  }
}

function copyCsvOptions(csv: CsvOptions): CsvOptions {
  return {
    encoding: csv.encoding,
    separator: csv.separator,
    decimal: csv.decimal,
  };
}

/** Puts a new load of the individuals file, pending; `csv` is null for an
    xlsx. The grouping is kept, by the name of its column, and so are the
    types the user set, `typesSet` of the source it replaces, which the
    record of the new read applies where its values allow them. A load
    whose id is already there gives `p` itself. */
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
  return {
    ...p,
    individuals: {
      ...load,
      typesSet: individuals?.typesSet ?? [],
      read: { kind: "pending" },
    },
  };
}

/** Sets how the CSV is read, and puts its read back to pending; the types
    the user set are kept, for the new read to apply. Throws a defect when
    there is no individuals file, it is an xlsx, or it is `notGiven`, a
    file the page holds no copy of and so cannot read with other
    options. */
export function setCsvOptions(p: Project, csv: CsvOptions): Project {
  const individuals = p.individuals;
  const current = individuals?.csv ?? null;
  if (individuals === null || current === null) {
    throw defect("setCsvOptions was given a project with no CSV file.");
  }
  if (individuals.read.kind === "notGiven") {
    throw defect(
      "setCsvOptions was given a project whose CSV file was not read when it was saved, which the page cannot read.",
    );
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

/**
 * Sets the type of a column of the table read, and records it in
 * `typesSet`, in the place of the column's pair, applied or not, or last;
 * so the column is no longer in `typesLost`. The first column has one
 * type, identifier: setting it gives `p` itself, and it never enters
 * `typesSet`. The type the column has, when the user set no other on it,
 * gives `p` itself. Throws a defect when the file is not read, the column
 * is not in the table, or its values do not allow the type, by
 * `columnAllows`: a binary type of other values than the column's two, in
 * either coding, or continuous on a column that is not all numbers.
 */
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
  const wrong = typeError(columnAllows(read), index, copy);
  if (wrong !== null) {
    refuse(
      "setColumnType",
      inconsistentTable(["individuals", "read", "columns", index], wrong),
    );
  }
  if (index === 0) {
    return p;
  }
  const at = individuals.typesSet.findIndex(([name]) => name === column);
  const setBefore = individuals.typesSet[at];
  if (
    same(read.columns[index], copy) &&
    (setBefore === undefined || same(setBefore[1], copy))
  ) {
    return p;
  }
  const pair: ColumnTypeOf = [column, copy];
  return {
    ...p,
    individuals: {
      ...individuals,
      typesSet:
        at === -1
          ? [...individuals.typesSet, pair]
          : individuals.typesSet.with(at, pair),
      read: { ...read, columns: read.columns.with(index, copy) },
    },
  };
}

/** Drops from `typesSet` the types the read does not apply, `typesLost`,
    and keeps those it applies. `p` itself with no file, a file not read,
    or none lost. */
export function forgetTypesLost(p: Project): Project {
  const individuals = p.individuals;
  if (individuals === null) {
    return p;
  }
  const lost = typesLost(individuals);
  if (lost.length === 0) {
    return p;
  }
  return {
    ...p,
    individuals: {
      ...individuals,
      typesSet: individuals.typesSet.filter((pair) => !lost.includes(pair)),
    },
  };
}

/** Removes the individuals file, with the types the user set; `p` itself
    when there is none. The grouping is kept. */
export function removeIndividuals(p: Project): Project {
  return p.individuals === null ? p : { ...p, individuals: null };
}

function copyGrouping(grouping: Grouping): Grouping {
  switch (grouping.kind) {
    case "populations":
      return { kind: grouping.kind, column: grouping.column };
    case "onePopulation":
      return { kind: grouping.kind };
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
    dropped. A read of a table gets the types the reader inferred, then,
    for each type of the source's `typesSet` in its order, the type set in
    place of the inferred one where the read allows it; the others wait in
    `typesSet`, which is kept whole, and are those of `typesLost`. A failed
    read keeps `typesSet` too. */
export function recordIndividualsRead(
  p: Project,
  fileId: string,
  csv: CsvOptions | null,
  read: IndividualsReadGiven,
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
    const columns =
      read.kind === "read" ? withTypesSet(read, individuals.typesSet) : null;
    // The read itself when no type set changes its columns.
    const recorded =
      read.kind === "read" && columns !== null && columns !== read.columns
        ? { ...read, columns }
        : read;
    return { ...p, individuals: { ...individuals, read: recorded } };
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
    defect of our code, and has its words; so is a `reopenFailed` of the
    light worker, which it never gives. A `reopenFailed` of the variants
    file has its own words, `REOPEN_FAILED`. */
const WHAT_HAPPENED: Readonly<Record<RunError["kind"], string>> = {
  couldNotStart: "the application could not start its calculations",
  workerFailed: "the calculation stopped unexpectedly",
  defect: "the calculation stopped unexpectedly",
  popnei: "the calculation stopped unexpectedly",
  files: "the calculation stopped unexpectedly",
  reopenFailed: "the calculation stopped unexpectedly",
  protocolMismatch: "the page is out of date",
};

/** What follows the name of a variants file the browser can no longer
    read, before what to do, as the owner decided on 25 September 2026
    (point B of docs/specs/stage-2-open-points.md). */
const REOPEN_FAILED =
  "could not be read; it may have changed on the disk since it was picked.";

/** The ends of the reason of a file that was not read: what the user can
    do, where the reason is shown. */
interface ReasonEnds {
  /** popnei's message as the reason gives it; as it is when absent. */
  readonly message?: (message: string) => string;
  /** After a refusal of the file's reader. */
  readonly refused: string;
  /** After a failure that a new load of the file mends. */
  readonly again: string;
  /** After a failure that only a new page mends, for the file of the
      name `fileName`, as shown. */
  readonly reload: (fileName: string) => string;
}

/** What to do after a failure that only a new page mends, a worker that
    could not start or a page out of date, for the file of the name
    `fileName`: save the project first, since a new version of the site
    deployed while the page was open is one cause and a reload would lose
    the project; then give the file again, which the project file does
    not hold, loaded beside a Run button and chosen in its step (the
    project spec, Open 4, decided on 27 September 2026). */
function reloadText(verb: "load" | "choose", fileName: string): string {
  return `Save the project, reload the page, open the project and ${verb} ${fileName} again.`;
}

/** The ends of a reason of the variants file beside a Run button, and of
    the individuals file (the project spec, Open 4). */
function endsIn(step: "Variants" | "Individuals", refused: string): ReasonEnds {
  return {
    refused,
    again: `Load it again in the ${step} step.`,
    reload: (fileName) => reloadText("load", fileName),
  };
}

/** The ends of a reason of a file that could not be read by no fault of
    its own, in the step of the file, beside its button that opens the
    file picker: the same in the Variants and the Individuals steps (the
    project spec, "What an analysis needs of every project"). */
const STEP_AGAIN = "Choose it again.";

/** The end of a reason, in the step of the file of the name `fileName`,
    after a failure that only a new page mends. */
function stepReload(fileName: string): string {
  return reloadText("choose", fileName);
}

/** The ends of a reason of the variants file in the Variants step, beside
    its button "Replace panel.nei…", as the owner decided on 25 September
    2026 (the project spec, "What an analysis needs of every project"). */
const VARIANTS_STEP_ENDS: ReasonEnds = {
  refused: "Choose another file.",
  again: STEP_AGAIN,
  reload: stepReload,
};

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
    page or a new load of the file, in the words of `ends`. */
function workerFailedText(
  fileName: string,
  kind: RunError["kind"],
  ends: Pick<ReasonEnds, "again" | "reload">,
): string {
  const next = MENDED_BY_RELOAD.has(kind) ? ends.reload(fileName) : ends.again;
  return `${fileName} could not be read: ${WHAT_HAPPENED[kind]}. ${next}`;
}

/** The end of a reason of the variants file. */
const LOAD_VARIANTS = "Load a variants file in the Variants step.";

/** The ends of a reason of the variants file beside a Run button. */
const VARIANTS_ENDS = endsIn("Variants", LOAD_VARIANTS);

/** The reason of a variants file being read or not read, with the ends
    `ends`, or `null` for a file read. */
function variantsReadNeeds(
  variants: VariantSource,
  ends: ReasonEnds,
): string | null {
  const fileName = escaped(variants.name);
  const read = variants.read;
  switch (read.kind) {
    case "pending":
      return `Reading ${fileName}.`;
    case "failed":
      if (read.error.kind === "popnei") {
        const message =
          ends.message?.(read.error.message) ?? read.error.message;
        return `popnei could not read ${fileName}${saying(message)}. ${ends.refused}`;
      }
      return read.error.error.kind === "reopenFailed"
        ? `${fileName} ${REOPEN_FAILED} ${ends.again}`
        : workerFailedText(fileName, read.error.error.kind, ends);
    case "read":
      return null;
  }
}

/**
 * The reason of the variants file being read or not read, in the words
 * the Variants step shows beside its button, or `null` when the project
 * has no variants file or its file is read (the project spec, "What an
 * analysis needs of every project"): `projectNeeds` for such a file, with
 * the ends of that step, "Choose another file." after a refusal of
 * popnei.
 */
export function variantsStepNeeds(p: Project): string | null {
  return p.variants === null
    ? null
    : variantsReadNeeds(p.variants, VARIANTS_STEP_ENDS);
}

/** The ends of a reason of the variants file on the page that opens it,
    popgen2.html, beside its button "Open another variants file…", which
    has no project to save before a reload. */
const VARIANTS_OPEN_ENDS: ReasonEnds = {
  message: withoutBackquotes,
  refused: "Open another file.",
  again: "Open it again.",
  reload: (fileName) => `Reload the page and open ${fileName} again.`,
};

/**
 * The reason of the variants file being read or not read, in the words
 * of the page that opens it, popgen2.html, or `null` when the project has
 * no variants file or its file is read: those of `variantsStepNeeds`,
 * with "Open another file." after a refusal of popnei, "Open it again."
 * after a failure that a new load mends, and a reload with no project to
 * save after one that only a new page mends.
 */
export function variantsOpenNeeds(p: Project): string | null {
  return p.variants === null
    ? null
    : variantsReadNeeds(p.variants, VARIANTS_OPEN_ENDS);
}

/** What each application calls its individuals file, as the owner
    decided on 25 September 2026 (point P of
    docs/specs/stage-2-open-points.md). */
const FILE_WORDS: Readonly<Record<AppId, string>> = {
  popgen: "metadata file",
  gwas: "traits file",
};

/** The end of a reason of the individuals file of the application `app`. */
function loadIndividualsText(app: AppId): string {
  return `Load a ${FILE_WORDS[app]} in the Individuals step.`;
}

/** The ends of the reasons of a list of individuals, an empty list and
    the others (the project spec, Open 2, decided by the owner on 26
    September 2026). */
const FILL_LIST =
  "Add individuals to it, or remove the filter, in the Variants step.";
const CORRECT_LIST =
  "Change the list, or remove the filter, in the Variants step.";

/** The kinds of the lists of individuals, in the order they are checked
    (the project spec, Open 6). */
const LIST_KINDS = ["keep", "remove"] as const;

/**
 * The reason no analysis can run on this project, in the words the screen
 * shows beside the Run button, or `null` when the variants file is read:
 * a variants file missing, being read or refused (the project spec, "What
 * an analysis needs of every project"). A list of individuals popnei
 * would refuse is `individualListNeeds`'s.
 */
export function projectNeeds(p: Project): string | null {
  const variants = p.variants;
  if (variants === null) {
    return LOAD_VARIANTS;
  }
  return variants.read.kind === "read"
    ? null
    : variantsReadNeeds(variants, VARIANTS_ENDS);
}

/** The reason of the LD filter of the variants on with no distance
    (the project spec, "What an analysis needs of every project"), which
    names it "the LD pruning", as the switch and the Undo of the Variants
    step do (stop A 1, decided by the owner on 29 September 2026). */
const LD_NO_DISTANCE =
  "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning, in the Variants step.";

/**
 * The reason of the LD filter of the variants on with no distance, whose
 * `maxDist` is `null` until the user types one, or `null`; whatever the
 * variants file, since the filter does not depend on it. The store locks
 * with it what reads the filters of the variants, and nothing else (the
 * project spec, "What an analysis needs of every project").
 */
export function variantFilterNeeds(p: Project): string | null {
  return hasDistances(p.filters) ? null : LD_NO_DISTANCE;
}

/**
 * The filters of the variants as a job carries them to popnei: `filters`
 * itself, the same array, once every filter has what popnei needs. Each
 * analysis and the writing build the filters of their job with it, from
 * `filtersApplied(p)`; it leaves out no filter by the format of the file,
 * which is `filtersApplied`'s. Throws a defect when the LD filter has no
 * distance, which the lock of `variantFilterNeeds` keeps from every job:
 * popnei's `filterByLd` cannot be given it.
 */
export function jobFilters(
  filters: readonly ProjectVariantFilter[],
): readonly VariantFilter[] {
  if (!hasDistances(filters)) {
    throw defect(
      "a job was given the LD filter with no distance, which variantFilterNeeds locks.",
    );
  }
  return filters;
}

/** Whether every filter has what popnei needs: the LD filter its
    distance. */
function hasDistances(
  filters: readonly ProjectVariantFilter[],
): filters is readonly VariantFilter[] {
  return filters.every((f) => f.kind !== "ld" || f.maxDist !== null);
}

/** A list of individuals popnei would refuse: which of the two it is,
    and the reason. */
export interface ListNeeds {
  readonly list: (typeof LIST_KINDS)[number];
  readonly reason: string;
}

/**
 * The first list of individuals popnei would refuse, one that is empty,
 * names an individual more than once, or names individuals not in the
 * variants file, the list to keep before the list to remove; or `null`,
 * and `null` too while `projectNeeds` gives a reason, since a list is
 * checked against the individuals of the file. The store locks with it
 * only what reads the filters of individuals (the project spec, "What an
 * analysis needs of every project").
 */
export function individualListNeeds(p: Project): ListNeeds | null {
  const variants = p.variants;
  if (variants?.read.kind !== "read") {
    return null;
  }
  const fileName = escaped(variants.name);
  const inVariants = new Set(variants.read.individuals);
  for (const kind of LIST_KINDS) {
    const list = listOf(p.individualFilters, kind);
    const reason =
      list === null ? null : listNeeds(kind, list, fileName, inVariants);
    if (reason !== null) {
      return { list: kind, reason };
    }
  }
  return null;
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
    return `${theList} is empty. ${FILL_LIST}`;
  }
  const times = new Map<string, number>();
  for (const name of list) {
    times.set(name, (times.get(name) ?? 0) + 1);
  }
  const repeated = [...times].filter(([, n]) => n > 1).map(([name]) => name);
  if (repeated.length > 0) {
    return `${theList} names ${namesOf(repeated)} more than once. ${CORRECT_LIST}`;
  }
  const unknown = list.filter((name) => !inVariants.has(name));
  if (unknown.length > 0) {
    const one = unknown.length === 1;
    return `${theList} names ${counted(unknown.length, "individual")} that ${one ? "is" : "are"} not in ${fileName}: ${namesOf(unknown)}. ${CORRECT_LIST}`;
  }
  return null;
}

/**
 * The reason an analysis that uses the individuals file cannot run, or
 * `null`: the first of an individuals file being read or refused, then
 * individuals of the variants file missing from it, with the file named
 * as the application of `p` names it, "a metadata file" or "a traits
 * file". No individuals file is a reason in association alone, whose
 * GWAS needs a trait; in population genetics every analysis per
 * population then runs on one population ("The populations", below).
 * The individuals of the variants are looked at only when the variants
 * file is read; until then `projectNeeds` gives its reason (the project
 * spec, "What an analysis needs of every project").
 */
export function individualsNeeds(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals === null) {
    return p.app === "gwas" ? loadIndividualsText(p.app) : null;
  }
  if (individuals.read.kind !== "read") {
    const load = loadIndividualsText(p.app);
    const ends = endsIn("Individuals", load);
    return individualsReadNeeds(individuals, p.app, {
      ...ends,
      again: `${ends.again} ${SAVE_AGAIN}`,
      refusedEnd: () => load,
      notGivenEnd: (fileName) =>
        `Load ${fileName} again in the Individuals step.`,
    });
  }
  return missingText(p, {
    one: "Add it to the file and load the file again in the Individuals step.",
    several: "Add them to the file and load it again in the Individuals step.",
  });
}

/** What to do about individuals missing, after one and after several. */
interface MissingEnds {
  readonly one: string;
  readonly several: string;
}

/** The reason of individuals of the variants file missing from the
    individuals file, with the ends `ends`, or `null` when none is
    missing or either file is not read. */
function missingText(p: Project, ends: MissingEnds): string | null {
  const check = individualsCheck(p);
  if (check === null || p.variants === null || p.individuals === null) {
    return null;
  }
  const missing = check.missing;
  if (missing.length === 0) {
    return null;
  }
  const name = escaped(p.individuals.name);
  const variantsName = escaped(p.variants.name);
  return missing.length === 1
    ? `1 individual of ${variantsName} is not in ${name}: ${namesOf(missing)}. ${ends.one}`
    : `${counted(missing.length, "individual")} of ${variantsName} are not in ${name}: ${namesOf(missing)}. ${ends.several}`;
}

/** The ends of a reason of the individuals file: after a refusal of its
    reader, by the refusal, after a failure of the worker, and for a file
    an opened project names and does not hold. */
interface IndividualsEnds extends Pick<ReasonEnds, "again" | "reload"> {
  /** What the user can do after the refusal `error`. */
  readonly refusedEnd: (error: IndividualsFileError) => string;
  /** What the user can do about a file `notGiven` of the name
      `fileName`, as shown. */
  readonly notGivenEnd: (fileName: string) => string;
}

/** What happened when the light worker stopped, by a crash or a defect
    of our code, while it read the individuals file, as the owner decided
    on 29 September 2026, which closes Open 4 of the project spec for that
    file (stop B 7); what follows is the end `again` of the place. */
const READING_STOPPED = "the reading of the file stopped unexpectedly.";

/** What to do when the reading of the individuals file stopped: save the
    file again from Excel, since a file that stops the reader every time
    is not mended by loading it again (the owner, 29 September 2026). */
const SAVE_AGAIN =
  "If it happens again with this file, save it again from Excel as .xlsx or as CSV.";

/** Why an opened project does not hold its individuals file of the name
    `fileName`, as shown: its read was not done when the project was
    saved (the project spec, "The project of an opened project file"). */
function notGivenText(fileName: string): string {
  return `${fileName} was not read when this project was saved, so the project file does not hold it.`;
}

/** The reason of an individuals file of the application `app` being read
    or not read, with the ends `ends`, or `null` for a file read. */
function individualsReadNeeds(
  individuals: IndividualsSource,
  app: AppId,
  ends: IndividualsEnds,
): string | null {
  const name = escaped(individuals.name);
  const read = individuals.read;
  switch (read.kind) {
    case "pending":
      return `Reading ${name}.`;
    case "failed": {
      const error = read.error;
      if (error.kind === "worker") {
        return MENDED_BY_RELOAD.has(error.error.kind)
          ? workerFailedText(name, error.error.kind, ends)
          : `${name} could not be read: ${READING_STOPPED} ${ends.again}`;
      }
      const words = `${name} could not be read${saying(individualsFileRefusalWords(error, app, individuals.csv === null))}.`;
      // Its words say what to do, and take no end.
      return error.kind === "xlsxReaderNotLoaded"
        ? words
        : `${words} ${ends.refusedEnd(error)}`;
    }
    case "notGiven":
      return `${notGivenText(name)} ${ends.notGivenEnd(name)}`;
    case "read":
      return null;
  }
}

/**
 * What follows the colon of a refusal of the reader of a CSV in the
 * Individuals step of the application `app`: its words and its end, "it
 * is a variants file, which the Variants step takes. Load a metadata
 * file.". The step says a variants file told by its name in these words.
 */
export function individualsStepRefusal(
  error: IndividualsFileError,
  app: AppId,
): string {
  const words = saying(individualsFileRefusalWords(error, app, false));
  const end = stepRefusedEnd(error, app);
  return end === "" ? `${words.slice(2)}.` : `${words.slice(2)}. ${end}`;
}

/** The end of a refusal of the reader shown in the Individuals step, as
    the owner decided on 25 September 2026: another separator for the two
    refusals a wrong one most often causes, a corrected file for the
    others; and, the writer's, another file for a variants file, which is
    not corrected but replaced, and the file chosen again, in the words of
    the Variants step, for a file the browser could not read, by no fault
    of its own; none for the reader of xlsx files not downloaded, whose
    words say what to do. */
function stepRefusedEnd(error: IndividualsFileError, app: AppId): string {
  switch (error.kind) {
    case "raggedRow":
    case "unclosedQuote":
      return "Choose another separator, or load a corrected file.";
    case "variantsFile":
      return `Load a ${FILE_WORDS[app]}.`;
    case "unreadable":
      return STEP_AGAIN;
    case "empty":
    case "duplicateColumn":
    case "duplicateIndividual":
    case "files":
    case "unnamedColumn":
    case "emptyIndividual":
    case "tooLarge":
    case "notText":
    case "cutShort":
    case "notXlsx":
    case "oldExcel":
    case "encrypted":
    case "emptySheet":
    case "cellError":
    case "headerError":
    case "sheetTooLarge":
      return "Load a corrected file.";
    case "xlsxReaderNotLoaded":
      return "";
  }
}

/**
 * The reason of the individuals file being read or not read, in the words
 * the Individuals step shows under the options of its reader, or `null`
 * when the project has no individuals file or its file is read (the
 * project spec, "What an analysis needs of every project"): the reason of
 * `individualsNeeds` for such a file, with the ends of that step, "Choose
 * another separator, or load a corrected file." after a row of the
 * wrong length or a quote never closed, "Load a corrected file." after
 * most other refusals, and after a crash of the reader the owner's words
 * of 29 September 2026, "the reading of the file stopped unexpectedly. If
 * it happens again with this file, save it again from Excel as .xlsx or
 * as CSV."
 */
export function individualsStepNeeds(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals === null) {
    return null;
  }
  return individualsReadNeeds(individuals, p.app, {
    refusedEnd: (error) => stepRefusedEnd(error, p.app),
    notGivenEnd: () => STEP_AGAIN,
    again: SAVE_AGAIN,
    reload: stepReload,
  });
}

/**
 * The reason of individuals of the variants file missing from the
 * individuals file, in the words of the Individuals step, which name the
 * file to add them to, or `null` when none is missing or either file is
 * not read (the project spec, "What an analysis needs of every project").
 */
export function individualsStepMissing(p: Project): string | null {
  const name = escaped(p.individuals?.name ?? "");
  return missingText(p, {
    one: `Add it to ${name} and load ${name} again.`,
    several: `Add them to ${name} and load it again.`,
  });
}

/** Whether every individual of the variants file is in the individuals
    file. */
export interface IndividualsCheck {
  /** The individuals of the variants file found in the table. */
  readonly found: number;
  /** The individuals of the variants file missing from the table, all of
      them, in the order of the variants file. */
  readonly missing: readonly string[];
  /** The rows of the table whose individual is not in the variants file,
      which are ignored. */
  readonly ignoredRows: number;
}

/** The check of each pair of reads, the table's and the variants file's,
    kept by the reads themselves and dropped with them, so that a table of
    10,000 rows is not matched again each time a screen is drawn. */
const CHECKS = new WeakMap<
  IndividualsRead,
  WeakMap<SourceRead, IndividualsCheck>
>();

/**
 * Whether every individual of the variants file is in the individuals
 * file: the individuals found, those missing in the order of the
 * variants file, and the rows of other individuals; `null` when either
 * file is not read. The same object for the same two reads.
 * `individualsNeeds` is written on it, so that the two never disagree on
 * who is missing.
 */
export function individualsCheck(p: Project): IndividualsCheck | null {
  const tableRead = p.individuals?.read;
  const variantsRead = p.variants?.read;
  if (tableRead?.kind !== "read" || variantsRead?.kind !== "read") {
    return null;
  }
  const byVariants =
    CHECKS.get(tableRead) ?? new WeakMap<SourceRead, IndividualsCheck>();
  CHECKS.set(tableRead, byVariants);
  const kept = byVariants.get(variantsRead);
  if (kept !== undefined) {
    return kept;
  }
  const inTable = new Set<Cell | undefined>(
    tableRead.table.rows.map((row) => row[0]),
  );
  const inVariants = new Set<Cell | undefined>(variantsRead.individuals);
  const missing = variantsRead.individuals.filter(
    (individual) => !inTable.has(individual),
  );
  const check: IndividualsCheck = {
    found: variantsRead.individuals.length - missing.length,
    missing,
    ignoredRows: tableRead.table.rows.filter((row) => !inVariants.has(row[0]))
      .length,
  };
  byVariants.set(variantsRead, check);
  return check;
}

// The populations (the project spec, "The populations").

/** The name of the one population of every individual, "All
    individuals": without an individuals file, and with the grouping
    `onePopulation`. */
export const ONE_POPULATION = "All individuals";

/** The grouping of each table, by the name of its column, so that a
    change of a threshold does not walk a table of 10,000 rows again. It
    keeps only tables frozen with all they hold, as the memo of the keys
    does, so that a table changed in place is walked again. */
const GROUPED = new WeakMap<IndividualsTable, Map<string, Pops>>();

/** The populations to run of each set of populations, by the read of the
    variants file; only reads frozen with their individuals are kept. */
const TO_RUN = new WeakMap<Pops, WeakMap<SourceRead, Pops>>();

/** The one population to run, by the read of the variants file; only
    reads frozen with their individuals are kept. */
const ONE_TO_RUN = new WeakMap<SourceRead, Pops>();

/** The populations to run narrowed to each frozen list of the individuals
    kept, by the populations to run. */
const KEPT = new WeakMap<Pops, WeakMap<readonly string[], PopulationsKept>>();

/** The populations to run left whole, when the filters remove nobody. */
const WHOLE = new WeakMap<Pops, PopulationsKept>();

/**
 * The populations as a key holds them, from the project alone: those of
 * the column chosen, each named by the text of its cell, with every
 * individual of the table that has it, in the order each first appears
 * in the file, an individual whose cell is missing in none; `"all"` for
 * the one population, without an individuals file whatever the
 * grouping, and with a file read and the grouping `onePopulation`;
 * `null` when neither can be given yet, a file not read, no column
 * chosen or no column of that name, and for a project of association.
 * Never reads `p.variants`. The same frozen value for the same frozen
 * table and column.
 */
export function populationsOf(p: Project): Pops | "all" | null {
  if (p.app !== "popgen") {
    return null;
  }
  const individuals = p.individuals;
  if (individuals === null) {
    return "all";
  }
  const read = individuals.read;
  if (read.kind !== "read") {
    return null;
  }
  switch (p.grouping.kind) {
    case "onePopulation":
      return "all";
    case "populations":
      return p.grouping.column === null
        ? null
        : groupedBy(read.table, p.grouping.column);
    case "roles":
      return null;
  }
}

/** The populations of `table` by its column `column`, as `populationsOf`
    gives them; `null` when the table has no column of that name, or has
    it first, where it names the individuals. */
function groupedBy(table: IndividualsTable, column: string): Pops | null {
  const kept = GROUPED.get(table)?.get(column);
  if (kept !== undefined) {
    return kept;
  }
  const index = table.columns.indexOf(column);
  // The first column names the individuals, and is never the column of
  // the populations.
  if (index <= 0) {
    return null;
  }
  const members = new Map<string, string[]>();
  for (const row of table.rows) {
    const cell = row[index];
    if (cell === undefined) {
      throw defect(`a row of the individuals table has no cell ${column}.`);
    }
    if (cell === null) {
      continue;
    }
    const pop = String(cell);
    const individuals = members.get(pop) ?? [];
    members.set(pop, individuals);
    individuals.push(identifierOf(row[0]));
  }
  const pops: Pops = Object.freeze(
    [...members].map(([pop, individuals]) =>
      Object.freeze([pop, Object.freeze(individuals)] as const),
    ),
  );
  if (isTableFrozen(table)) {
    const byColumn = GROUPED.get(table) ?? new Map<string, Pops>();
    GROUPED.set(table, byColumn);
    byColumn.set(column, pops);
  }
  return pops;
}

/** Whether a table is frozen with everything it holds, so that its
    populations can be kept: its cells are texts, numbers, booleans or
    null. */
function isTableFrozen(table: IndividualsTable): boolean {
  return (
    Object.isFrozen(table) &&
    Object.isFrozen(table.columns) &&
    Object.isFrozen(table.rows) &&
    table.rows.every((row) => Object.isFrozen(row))
  );
}

/** The name of an individual, the cell of the first column. The reader
    refuses a row with no name, so a missing one is a defect, thrown. */
export function identifierOf(cell: Cell | undefined): string {
  if (cell === null || cell === undefined) {
    throw defect("a row of the individuals table has no individual.");
  }
  return String(cell);
}

/** A read of the variants file. */
type VariantsRead = Extract<SourceRead, { readonly kind: "read" }>;

/** Whether a read and its individuals are frozen, so that what is made
    of them can be kept by the read. */
function isReadFrozen(read: VariantsRead): boolean {
  return Object.isFrozen(read) && Object.isFrozen(read.individuals);
}

/**
 * `populationsOf(p)` narrowed to the individuals of the variants file, the
 * populations left empty dropped, since popnei refuses a population that
 * names an individual it does not have and an empty one; `"all"` as
 * `[["All individuals", every individual of the variants file, in its
 * order]]`. What `populationsKept` narrows to the individuals kept, and
 * what the Individuals step lists. `null` when `populationsOf` is `null`
 * or the variants file is not read. The same frozen value for the same
 * frozen table, column and read of the variants file.
 */
export function populationsToRun(p: Project): Pops | null {
  const pops = populationsOf(p);
  const variantsRead = p.variants?.read;
  if (pops === null || variantsRead?.kind !== "read") {
    return null;
  }
  return pops === "all"
    ? onePopulationOf(variantsRead)
    : narrowedToVariants(pops, variantsRead);
}

/** The one population of every individual of the variants file read
    `variantsRead`, in its order. */
function onePopulationOf(variantsRead: VariantsRead): Pops {
  const kept = ONE_TO_RUN.get(variantsRead);
  if (kept !== undefined) {
    return kept;
  }
  const one: Pops = Object.freeze([
    Object.freeze([
      ONE_POPULATION,
      Object.freeze([...variantsRead.individuals]),
    ] as const),
  ]);
  if (isReadFrozen(variantsRead)) {
    ONE_TO_RUN.set(variantsRead, one);
  }
  return one;
}

/** The populations `pops` narrowed to the individuals of the variants
    file read `variantsRead`, those left empty dropped. */
function narrowedToVariants(pops: Pops, variantsRead: VariantsRead): Pops {
  const kept = TO_RUN.get(pops)?.get(variantsRead);
  if (kept !== undefined) {
    return kept;
  }
  const inVariants = new Set(variantsRead.individuals);
  const toRun: Pops = Object.freeze(
    pops
      .map(([pop, individuals]) =>
        Object.freeze([
          pop,
          Object.freeze(individuals.filter((i) => inVariants.has(i))),
        ] as const),
      )
      .filter(([, individuals]) => individuals.length > 0),
  );
  if (isReadFrozen(variantsRead)) {
    const byRead = TO_RUN.get(pops) ?? new WeakMap<SourceRead, Pops>();
    TO_RUN.set(pops, byRead);
    byRead.set(variantsRead, toRun);
  }
  return toRun;
}

/** The populations to run narrowed to the individuals kept. */
export interface PopulationsKept {
  /** The populations with an individual kept, each with the individuals
      kept, in the order of `populationsToRun`. */
  readonly pops: Pops;
  /** The populations the list leaves with no individual, in the same
      order, which are not in `pops`. */
  readonly emptied: readonly string[];
}

/**
 * `populationsToRun(p)` narrowed to the individuals kept, `kept`, or left
 * whole when `kept` is `null`, the filters removing nobody; with the
 * populations that the list leaves empty apart, in their order, which are
 * not sent and are named on the screen. `null` when `populationsToRun` is
 * `null`. The same frozen value for the same populations to run and the
 * same frozen list.
 */
export function populationsKept(
  p: Project,
  kept: readonly string[] | null,
): PopulationsKept | null {
  const toRun = populationsToRun(p);
  if (toRun === null) {
    return null;
  }
  if (kept === null) {
    const whole =
      WHOLE.get(toRun) ??
      Object.freeze({ pops: toRun, emptied: Object.freeze([]) });
    WHOLE.set(toRun, whole);
    return whole;
  }
  const found = KEPT.get(toRun)?.get(kept);
  if (found !== undefined) {
    return found;
  }
  const inKept = new Set(kept);
  const narrowed = toRun.map(([pop, individuals]) =>
    Object.freeze([
      pop,
      Object.freeze(individuals.filter((i) => inKept.has(i))),
    ] as const),
  );
  const narrowedKept: PopulationsKept = Object.freeze({
    pops: Object.freeze(
      narrowed.filter(([, individuals]) => individuals.length > 0),
    ),
    emptied: Object.freeze(
      narrowed
        .filter(([, individuals]) => individuals.length === 0)
        .map(([pop]) => pop),
    ),
  });
  if (Object.isFrozen(kept)) {
    const byList =
      KEPT.get(toRun) ?? new WeakMap<readonly string[], PopulationsKept>();
    KEPT.set(toRun, byList);
    byList.set(kept, narrowedKept);
  }
  return narrowedKept;
}

/**
 * The populations as they are known before a Run, which the ready state
 * of the panel of an analysis and the summary line of the shell list, so
 * that the two never disagree: `populationsKept(p, list)` with the list
 * of `kept` when it is known, and, while a threshold on the individuals
 * waits for the statistics of each individual, with `kept.byLists`, the
 * individuals the lists to keep and to remove keep, since the thresholds
 * can only remove more; for the one population, "All individuals"
 * narrowed in the same way. `null` when `populationsToRun(p)` is `null`.
 */
export function populationsBeforeRun(
  p: Project,
  kept: IndividualsKept,
): PopulationsKept | null {
  return populationsKept(
    p,
    kept.list.kind === "known" ? kept.list.individuals : kept.byLists,
  );
}

/** The reason about the column of the populations, and its kind. */
export interface PopulationsNeed {
  /** No column chosen, "To do" in the stepper; a column the table does
      not have, or one that gives no individual of the variants file a
      population, "Problem". */
  readonly kind: "noColumn" | "noSuchColumn" | "noPopulation";
  /** The words shown beside a Run button and in the shell, which name
      the Individuals step. */
  readonly reason: string;
  /** The same words without "in the Individuals step", which that step
      shows at its select. */
  readonly inStep: string;
}

/** The choice a reason about the column of the populations asks for. */
const CHOOSE_POPULATIONS =
  "Choose the column that defines the populations, or all individuals in one population";

/**
 * The reason about the column of the populations, with its kind, in the
 * words beside a Run button, `reason`, and in those of the Individuals
 * step, `inStep`: a file read and no column chosen; no column of that
 * name in the table; no individual of the variants file with a
 * population in the column, looked at only once the variants file is
 * read. `null` without an individuals file, with the grouping
 * `onePopulation`, while the file is not read, when the column gives
 * populations or while a column of that name is chosen and the variants
 * file is not read, and for a project of association.
 */
export function populationsNeeds(p: Project): PopulationsNeed | null {
  const individuals = p.individuals;
  if (p.grouping.kind !== "populations" || individuals?.read.kind !== "read") {
    return null;
  }
  const column = p.grouping.column;
  if (column === null) {
    return needOf("noColumn", CHOOSE_POPULATIONS);
  }
  const fileName = escaped(individuals.name);
  if (populationsOf(p) === null) {
    return needOf(
      "noSuchColumn",
      `${fileName} has no column ${shown(column)}, from which the populations were taken. ${CHOOSE_POPULATIONS}`,
    );
  }
  const toRun = populationsToRun(p);
  if (toRun !== null && toRun.length === 0 && p.variants !== null) {
    return needOf(
      "noPopulation",
      `No individual of ${escaped(p.variants.name)} has a population in the column ${shown(column)} of ${fileName}. Fill in the column and load the file again, or choose another column`,
    );
  }
  return null;
}

/** A reason about the column of the populations of the kind `kind`, its
    words `words` followed by the end of each place. */
function needOf(kind: PopulationsNeed["kind"], words: string): PopulationsNeed {
  return {
    kind,
    reason: `${words}, in the Individuals step.`,
    inStep: `${words}.`,
  };
}

// What the analyses per population share from stage 5 is in
// populations.ts (the project spec, "What the analyses per population
// share from stage 5"), which imports this module and individualsKept.ts,
// so that this module imports individualsKept.ts for its types alone,
// and nothing of populations.ts.

/** The separator a read used, as the Individuals step names it. */
const SEPARATOR_NAMES: Readonly<Record<CsvFound["separator"], string>> = {
  ",": "the comma",
  ";": "the semicolon",
  "\t": "the tab",
};

/** The bytes in an MB, as macOS counts them. */
const BYTES_IN_MB = 1_000_000;

/** A size of a file in MB, with one decimal rounded up, so that 20,000,001
    bytes is "20.1 MB" and never "20.0 MB", more than a limit of 20 MB. */
function megabytes(size: number): string {
  const tenths = Math.ceil(size / (BYTES_IN_MB / 10));
  return `${grouped(Math.floor(tenths / 10))}.${String(tenths % 10)} MB`;
}

/** What the reader of the individuals file found wrong with it, in the
    words of docs/specs/worker/individuals.md, "The refusals and their
    words", with the file named as the application `app` names it, and, for
    an xlsx, `xlsx`, a row and a column named as Excel names them, "row 7"
    and "column D". */
function individualsFileRefusalWords(
  error: IndividualsFileError,
  app: AppId,
  xlsx: boolean,
): string {
  switch (error.kind) {
    case "empty":
      return "it has no row of individuals";
    case "duplicateColumn":
      return error.name === ""
        ? "two columns have an empty name"
        : `two columns are named ${shown(error.name)}`;
    case "duplicateIndividual":
      return error.name === ""
        ? "two rows have an empty name"
        : `the individual ${shown(error.name)} is in two rows`;
    case "raggedRow":
      return `line ${String(error.line)} has ${counted(error.found, "cell")} where the header has ${grouped(error.expected)}, read with ${SEPARATOR_NAMES[error.separator]} as the separator`;
    case "unnamedColumn":
      return `column ${xlsx ? columnLetters(error.column) : String(error.column)} has values but no name in the header`;
    case "emptyIndividual":
      return `${xlsx ? "row" : "line"} ${String(error.line)} has no name of an individual in its first column`;
    case "unclosedQuote":
      return `the quote that opens a cell on line ${String(error.line)} is never closed, read with ${SEPARATOR_NAMES[error.separator]} as the separator`;
    case "tooLarge":
      return `it is ${megabytes(error.size)}, more than the ${grouped(error.max / BYTES_IN_MB)} MB a ${FILE_WORDS[app]} can have; check that it is the ${FILE_WORDS[app]} and not the variants`;
    case "unreadable":
      return "the browser could not read it; it may have been changed, moved or deleted since it was picked";
    case "notText":
      return "it is not a text file; if it is an Excel workbook, open it in Excel and save it as Excel Workbook (.xlsx)";
    case "variantsFile":
      return "it is a variants file, which the Variants step takes";
    case "cutShort":
      return "it ends in the middle of a character and may have been cut short";
    case "files":
      return "it could not be read as an Excel workbook and may be damaged; open it in Excel and save it again";
    case "notXlsx":
      return "it is not an Excel workbook, although its name ends in .xlsx; if it is a CSV or a TSV, give it a name that ends in .csv";
    case "oldExcel":
      return "it is a workbook of Excel 97–2003, although its name ends in .xlsx; in Excel, save it as Excel Workbook (.xlsx)";
    case "encrypted":
      return "it is protected by a password; in Excel, save a copy without the password";
    case "emptySheet":
      return `its first sheet, ${shown(error.sheet)}, is empty, and only the first sheet is read; put the table in the first sheet`;
    case "cellError":
      return `a cell holds the error ${shown(error.error)}, which cannot be read; in Excel, find the cells with an error with Find & Select › Go To Special › Formulas › Errors, and correct the formula or replace it with its value`;
    case "headerError":
      return `the header has the error ${shown(error.error)} at row ${grouped(error.row)}, column ${columnLetters(error.column)}, where the name of a column should be; in Excel, type the name of the column in that cell`;
    case "sheetTooLarge":
      return `its first sheet, ${shown(error.sheet)}, has values as far as row ${grouped(error.lastRow)} and column ${error.lastColumn}, more than the ${grouped(error.max)} cells a ${FILE_WORDS[app]} can have; delete the values outside the table`;
    case "xlsxReaderNotLoaded":
      return "the part of the application that reads Excel files could not be downloaded; check the connection and load the file again; if it fails again, the site may have been updated since this page was opened: save the project, reload the page and open the project again";
  }
}

/** The most individuals or populations a text names all of (the project
    spec, Open 3), as `namesOf` names them: past it, a text names the
    first two and how many more, and gives no counts of each. */
export const MAX_NAMED = 3;

/** The largest whole number popnei takes for a minimum of individuals or
    a draw, 2^32 − 1, `LARGEST_WHOLE_NUMBER` of popnei's `arguments.ts`:
    the bound of the options of the diversity and of the distances. */
export const LARGEST_WHOLE_NUMBER = 4_294_967_295;

/** Names in words, in their order: all of them when there are at most
    MAX_NAMED, "a, b and c"; otherwise the first two and how many more,
    "a, b and 10 more"; each escaped and cut, an empty one "an empty
    name". */
export function namesOf(names: readonly string[]): string {
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

/** A list of things in words: "a, b and c"; exported for the words of
    the project file, so that the rule is written once. */
export function bothOf(words: readonly string[]): string {
  const last = words.at(-1) ?? "";
  return words.length < 2
    ? last
    : `${words.slice(0, -1).join(", ")} and ${last}`;
}

/** A count with its noun: "1 individual", "1,203 individuals". */
export function counted(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${grouped(count)} ${noun}s`;
}

/** A whole number with a comma between groups of three digits, the same
    in every browser: "1,203,554". */
export function grouped(count: number): string {
  return String(count).replace(/\B(?=(\d{3})+$)/g, ",");
}

/** popnei's message with each pair of its backquotes, around a name of
    its code or a piece of the user's file, written as quotes, which a
    user of the application reads as the bounds of what they hold: "it
    starts with `This is a line o`" becomes "it starts with “This is a line
    o”". A backquote with no pair is taken out. */
export function withoutBackquotes(message: string): string {
  return message.replace(/`([^`]*)`/gu, "\u201c$1\u201d").replaceAll("`", "");
}

/** What follows "could not read panel.nei": a colon and the message of
    popnei, of the files wasm or of the reader, without the spaces around
    it and the full stop it may end with, so that the sentence has one; or
    nothing, when that leaves it empty. Exported for the refusals of the
    analyses. */
export function saying(message: string): string {
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
 * have, a value the commands would refuse, two filters of one kind or
 * filters out of their fixed order, or a table that does not agree with
 * the types of its columns. Every project
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
  const fields = readObject(data, [], PROJECT_FIELDS, OPTIONAL_FIELDS);
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
  // A project saved before the filters turned off were kept has neither
  // list, and opens with nothing kept.
  const filtersOff = Object.hasOwn(f, "filtersOff")
    ? parseVariantFiltersOff(f["filtersOff"], ["filtersOff"])
    : success([]);
  if (!filtersOff.ok) {
    return filtersOff;
  }
  const bothVariants = bothOnAndOff(filters.value, filtersOff.value, [
    "filtersOff",
  ]);
  if (bothVariants !== null) {
    return failure(bothVariants);
  }
  const individualFilters = parseIndividualFilters(f["individualFilters"], [
    "individualFilters",
  ]);
  if (!individualFilters.ok) {
    return individualFilters;
  }
  const individualFiltersOff = Object.hasOwn(f, "individualFiltersOff")
    ? parseThresholds(f["individualFiltersOff"], ["individualFiltersOff"])
    : success([]);
  if (!individualFiltersOff.ok) {
    return individualFiltersOff;
  }
  const bothIndividuals = bothOnAndOff(
    individualFilters.value,
    individualFiltersOff.value,
    ["individualFiltersOff"],
  );
  if (bothIndividuals !== null) {
    return failure(bothIndividuals);
  }
  const individuals = parseNullable(
    f["individuals"],
    ["individuals"],
    parseIndividualsSource,
  );
  if (!individuals.ok) {
    return individuals;
  }
  const grouping = parseGrouping(f["grouping"], app, ["grouping"]);
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
    filtersOff: filtersOff.value,
    individualFilters: individualFilters.value,
    individualFiltersOff: individualFiltersOff.value,
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

/** The fields of the project a file may lack: the two lists of the
    filters turned off, which a file saved before 28 September 2026 does
    not have. */
const OPTIONAL_FIELDS = ["filtersOff", "individualFiltersOff"] as const;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** An object with exactly the fields `names`, and any of the fields
    `optional`. */
function readObject(
  value: unknown,
  path: FieldPath,
  names: readonly string[],
  optional: readonly string[] = [],
): Parsed<Fields> {
  if (!isFields(value)) {
    return failure(wrongValue(path, OBJECT));
  }
  for (const name of Object.keys(value)) {
    if (!names.includes(name) && !optional.includes(name)) {
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
    that kind has besides it. A kind not known is refused with the words
    of the kinds of `listed`, those a project file of this application and
    version holds, every kind of `kinds` when it is not given. */
function readKind<K extends string>(
  value: unknown,
  path: FieldPath,
  kinds: Kinds<K>,
  listed: readonly NoInfer<K>[] = keysOf(kinds),
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
        eitherOf(listed.map((name) => kinds[name].words)),
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
  return parsed.ok ? parsed : failure(orNothing(parsed.error));
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
  reopenFailed: {
    fields: ["name", "message"],
    words: "a file the browser could no longer read",
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
  notGiven: { fields: [], words: "not read when the project was saved" },
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
      fields: ["line", "expected", "found", "separator"],
      words: "a row of the wrong length",
    },
    files: {
      fields: ["message"],
      words: "a refusal of the reader of xlsx files",
    },
    unnamedColumn: { fields: ["column"], words: "a column with no name" },
    emptyIndividual: {
      fields: ["line"],
      words: "a row with no name of an individual",
    },
    unclosedQuote: {
      fields: ["line", "separator"],
      words: "a quote never closed",
    },
    tooLarge: { fields: ["size", "max"], words: "a file too large" },
    unreadable: {
      fields: ["message"],
      words: "a file the browser could not read",
    },
    notText: { fields: [], words: "a file that is not text" },
    variantsFile: { fields: [], words: "a variants file" },
    cutShort: { fields: [], words: "a file cut short" },
    notXlsx: { fields: [], words: "an xlsx that is not a workbook" },
    oldExcel: { fields: [], words: "a workbook of Excel 97–2003" },
    encrypted: { fields: [], words: "a workbook protected by a password" },
    emptySheet: { fields: ["sheet"], words: "an empty first sheet" },
    cellError: { fields: ["error"], words: "a cell with an error" },
    headerError: {
      fields: ["row", "column", "error"],
      words: "an error of Excel in the header",
    },
    sheetTooLarge: {
      fields: ["sheet", "lastRow", "lastColumn", "max"],
      words: "a sheet too large",
    },
    xlsxReaderNotLoaded: {
      fields: ["message"],
      words: "the reader of xlsx files not downloaded",
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
  onePopulation: { fields: [], words: "all individuals in one population" },
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
  "utf-16": "UTF-16",
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
): Parsed<ProjectVariantFilter> {
  const read = readKind(value, path, VARIANT_FILTER_KINDS);
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  let filter: ProjectVariantFilter;
  switch (kind) {
    case "passed":
      filter = { kind };
      break;
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
      const dist = parseOrNothing(
        fields["maxDist"],
        [...path, "maxDist"],
        parseNumber,
      );
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
): Parsed<ProjectVariantFilter[]> {
  const filters = parseList(value, path, parseVariantFilter);
  if (!filters.ok) {
    return filters;
  }
  const wrong =
    secondOfAKind(filters.value, path) ??
    outOfOrder(filters.value, VARIANT_FILTER_ORDER, path);
  return wrong === null ? filters : failure(wrong);
}

/** The list of the filters of the variants turned off: at most one of
    each kind, in the fixed order. */
function parseVariantFiltersOff(
  value: unknown,
  path: FieldPath,
): Parsed<ProjectVariantFilter[]> {
  const filters = parseList(value, path, parseVariantFilter);
  if (!filters.ok) {
    return filters;
  }
  const wrong =
    secondOffOfAKind(filters.value, path) ??
    outOfOrder(filters.value, VARIANT_FILTER_ORDER, path);
  return wrong === null ? filters : failure(wrong);
}

/** The first filter whose kind comes before that of a filter before it,
    in the order `order`. */
function outOfOrder<K extends string>(
  filters: readonly { readonly kind: K }[],
  order: readonly K[],
  path: FieldPath,
): ProjectError | null {
  let rankBefore = -1;
  for (const [index, filter] of filters.entries()) {
    const rank = order.indexOf(filter.kind);
    if (rank < rankBefore) {
      return { kind: "filterOutOfOrder", path: [...path, index] };
    }
    rankBefore = rank;
  }
  return null;
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
  const wrong =
    secondOfAKind(filters.value, path) ??
    outOfOrder(filters.value, INDIVIDUAL_FILTER_ORDER, path);
  return wrong === null ? filters : failure(wrong);
}

/** The list of the thresholds of the individuals turned off: a
    threshold alone, at most one of each kind, in their order; a list of
    individuals is refused by its kind. */
function parseThresholds(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualThreshold[]> {
  const thresholds = parseList(value, path, parseThreshold);
  if (!thresholds.ok) {
    return thresholds;
  }
  const wrong =
    secondOffOfAKind(thresholds.value, path) ??
    outOfOrder(thresholds.value, THRESHOLD_ORDER, path);
  return wrong === null ? thresholds : failure(wrong);
}

/** A second filter of a kind already in a list of the filters off. Its
    path ends in the `kind` of that filter, where a filter both on and
    off is refused at the path of the filter off (`bothOnAndOff`), so that
    the text tells the two apart. */
function secondOffOfAKind(
  filters: readonly {
    readonly kind: VariantFilterKind | IndividualFilterKind;
  }[],
  path: FieldPath,
): ProjectError | null {
  for (const [index, filter] of filters.entries()) {
    if (filters.findIndex((f) => f.kind === filter.kind) !== index) {
      return {
        kind: "twoFiltersOfAKind",
        path: [...path, index, "kind"],
        filter: filter.kind,
      };
    }
  }
  return null;
}

function parseThreshold(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualThreshold> {
  const read = readKind(value, path, THRESHOLD_KINDS);
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  let threshold: IndividualThreshold;
  switch (kind) {
    case "missing_data": {
      const rate = numberField(fields, path, "maxAllowedMissingRate");
      if (!rate.ok) {
        return rate;
      }
      threshold = { kind, maxAllowedMissingRate: rate.value };
      break;
    }
    case "obs_het": {
      const het = numberField(fields, path, "maxAllowedObsHet");
      if (!het.ok) {
        return het;
      }
      threshold = { kind, maxAllowedObsHet: het.value };
      break;
    }
  }
  return orFailure(threshold, individualFilterError(threshold, path));
}

/** The first filter of the list of the filters off, of the path
    `pathOff`, whose kind is also on: a filter is one or the other. */
function bothOnAndOff(
  filters: readonly {
    readonly kind: VariantFilterKind | IndividualFilterKind;
  }[],
  filtersOff: readonly {
    readonly kind: VariantFilterKind | IndividualFilterKind;
  }[],
  pathOff: FieldPath,
): ProjectError | null {
  for (const [index, filter] of filtersOff.entries()) {
    if (filters.some((f) => f.kind === filter.kind)) {
      return {
        kind: "twoFiltersOfAKind",
        path: [...pathOff, index],
        filter: filter.kind,
      };
    }
  }
  return null;
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
  const read = parseSourceRead(f["read"], [...path, "read"], format.value);
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

/**
 * The read of the variants file as a project file holds it. No file holds
 * `keepsPassed`, so the read gives what `keepsPassed` of a source gives a
 * file not yet read: true for a VCF, false for a `.nei` file
 * (docs/specs/core/project.md, "The validation").
 */
function parseSourceRead(
  value: unknown,
  path: FieldPath,
  format: VariantLoad["format"],
): Parsed<SourceRead> {
  // A read failed is the page's, and a project file never holds one.
  const read = readKind(value, path, SOURCE_READ_KINDS, ["pending", "read"]);
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
        keepsPassed: format === "vcf",
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
    case "reopenFailed": {
      const name = parseText(fields["name"], [...path, "name"]);
      if (!name.ok) {
        return name;
      }
      const message = parseText(fields["message"], [...path, "message"]);
      return message.ok
        ? success({ kind, name: name.value, message: message.value })
        : message;
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
  // A file of stages 2 and 3 has no typesSet, and is read as none set.
  const fields = readObject(
    value,
    path,
    ["fileId", "name", "csv", "read"],
    ["typesSet"],
  );
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
  const typesSet = Object.hasOwn(f, "typesSet")
    ? parseList(f["typesSet"], [...path, "typesSet"], parseColumnTypeOf)
    : success([]);
  if (!typesSet.ok) {
    return typesSet;
  }
  const read = parseIndividualsRead(f["read"], [...path, "read"]);
  if (!read.ok) {
    return read;
  }
  const readWrong = individualsReadError(csv.value, read.value, [
    ...path,
    "read",
  ]);
  if (readWrong !== null) {
    return failure(readWrong);
  }
  return orFailure(
    {
      fileId: fileId.value,
      name: name.value,
      csv: csv.value,
      typesSet: typesSet.value,
      read: read.value,
    },
    typesSetError(typesSet.value, read.value, [...path, "typesSet"]),
  );
}

/** A type the user set: a pair of the name of a column and its type. */
function parseColumnTypeOf(
  value: unknown,
  path: FieldPath,
): Parsed<ColumnTypeOf> {
  if (!isList(value) || value.length !== 2) {
    return failure(
      wrongValue(path, "a pair of the name of a column and its type"),
    );
  }
  const column = parseText(value[0], [...path, 0]);
  if (!column.ok) {
    return column;
  }
  const type = parseColumnType(value[1], [...path, 1]);
  return type.ok ? success([column.value, type.value]) : type;
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
  const fields = readObject(value, path, [
    "encoding",
    "separator",
    "decimal",
    "undecodedLine",
  ]);
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
  const undecodedLine = parseNullable(
    f["undecodedLine"],
    [...path, "undecodedLine"],
    parseLine,
  );
  if (!undecodedLine.ok) {
    return undecodedLine;
  }
  return success({
    encoding: encoding.value,
    separator: separator.value,
    decimal: decimal.value,
    undecodedLine: undecodedLine.value,
  });
}

/** A line of a file, a whole number of at least 1. */
function parseLine(value: unknown, path: FieldPath): Parsed<number> {
  const line = parseNumber(value, path);
  if (!line.ok) {
    return line;
  }
  return orFailure(
    line.value,
    wholeNumberError(line.value, 1, Number.MAX_SAFE_INTEGER, path),
  );
}

function parseIndividualsRead(
  value: unknown,
  path: FieldPath,
): Parsed<IndividualsRead> {
  // A read pending or failed is the page's; a project file holds it as
  // notGiven (docs/specs/core/projectFile.md, rule 8 of the opening).
  const read = readKind(value, path, INDIVIDUALS_READ_KINDS, [
    "read",
    "notGiven",
  ]);
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
    case "notGiven":
      return success({ kind });
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
      const separator = parseOneOf(
        fields["separator"],
        [...path, "separator"],
        FOUND_SEPARATOR_WORDS,
      );
      if (!separator.ok) {
        return separator;
      }
      return success({
        kind,
        line: line.value,
        expected: expected.value,
        found: found.value,
        separator: separator.value,
      });
    }
    case "unnamedColumn": {
      // A column of a file or of a sheet, counted from 1, which the words
      // of an xlsx write in the letters of Excel.
      const column = numberField(fields, path, "column");
      if (!column.ok) {
        return column;
      }
      return orFailure(
        { kind, column: column.value },
        wholeNumberError(column.value, 1, Number.MAX_SAFE_INTEGER, [
          ...path,
          "column",
        ]),
      );
    }
    case "emptyIndividual": {
      const line = numberField(fields, path, "line");
      return line.ok ? success({ kind, line: line.value }) : line;
    }
    case "unclosedQuote": {
      const line = numberField(fields, path, "line");
      if (!line.ok) {
        return line;
      }
      const separator = parseOneOf(
        fields["separator"],
        [...path, "separator"],
        FOUND_SEPARATOR_WORDS,
      );
      return separator.ok
        ? success({ kind, line: line.value, separator: separator.value })
        : separator;
    }
    case "tooLarge": {
      const size = numberField(fields, path, "size");
      if (!size.ok) {
        return size;
      }
      const max = numberField(fields, path, "max");
      return max.ok ? success({ kind, size: size.value, max: max.value }) : max;
    }
    case "notText":
    case "variantsFile":
    case "cutShort":
    case "notXlsx":
    case "oldExcel":
    case "encrypted":
      return success({ kind });
    case "files":
    case "unreadable":
    case "xlsxReaderNotLoaded": {
      const message = parseText(fields["message"], [...path, "message"]);
      return message.ok ? success({ kind, message: message.value }) : message;
    }
    case "emptySheet": {
      const sheet = parseText(fields["sheet"], [...path, "sheet"]);
      return sheet.ok ? success({ kind, sheet: sheet.value }) : sheet;
    }
    case "cellError": {
      const error = parseText(fields["error"], [...path, "error"]);
      return error.ok ? success({ kind, error: error.value }) : error;
    }
    case "headerError": {
      // A row and a column of the sheet, counted from 1, which the words
      // write as Excel does.
      const row = numberField(fields, path, "row");
      if (!row.ok) {
        return row;
      }
      const wrongRow = wholeNumberError(row.value, 1, Number.MAX_SAFE_INTEGER, [
        ...path,
        "row",
      ]);
      if (wrongRow !== null) {
        return failure(wrongRow);
      }
      const column = numberField(fields, path, "column");
      if (!column.ok) {
        return column;
      }
      const wrongColumn = wholeNumberError(
        column.value,
        1,
        Number.MAX_SAFE_INTEGER,
        [...path, "column"],
      );
      if (wrongColumn !== null) {
        return failure(wrongColumn);
      }
      const error = parseText(fields["error"], [...path, "error"]);
      return error.ok
        ? success({
            kind,
            row: row.value,
            column: column.value,
            error: error.value,
          })
        : error;
    }
    case "sheetTooLarge": {
      const sheet = parseText(fields["sheet"], [...path, "sheet"]);
      if (!sheet.ok) {
        return sheet;
      }
      const lastRow = numberField(fields, path, "lastRow");
      if (!lastRow.ok) {
        return lastRow;
      }
      const lastColumn = parseText(fields["lastColumn"], [
        ...path,
        "lastColumn",
      ]);
      if (!lastColumn.ok) {
        return lastColumn;
      }
      const max = numberField(fields, path, "max");
      return max.ok
        ? success({
            kind,
            sheet: sheet.value,
            lastRow: lastRow.value,
            lastColumn: lastColumn.value,
            max: max.value,
          })
        : max;
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

/** A type of a column; the two values of a binary type are texts, those
    of the cells of its column as `String` writes them. */
function parseColumnType(value: unknown, path: FieldPath): Parsed<ColumnType> {
  const read = readKind(value, path, COLUMN_TYPE_KINDS);
  if (!read.ok) {
    return read;
  }
  const { kind, fields } = read.value;
  switch (kind) {
    case "binary": {
      const one = parseText(fields["one"], [...path, "one"]);
      if (!one.ok) {
        return one;
      }
      const zero = parseText(fields["zero"], [...path, "zero"]);
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

function parseGrouping(
  value: unknown,
  app: AppId,
  path: FieldPath,
): Parsed<Grouping> {
  const read = readKind(
    value,
    path,
    GROUPING_KINDS,
    app === "popgen" ? ["populations", "onePopulation"] : ["roles"],
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
    case "onePopulation":
      return success({ kind });
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
  const fields = readObject(value, path, ["variants", "checks"]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const variants = parseVariantSource(f["variants"], [...path, "variants"]);
  if (!variants.ok) {
    return variants;
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
  return success({ variants: variants.value, checks: checks.value });
}

function parseCheck(value: unknown, path: FieldPath): Parsed<Check> {
  const fields = readObject(value, path, [
    "analysis",
    "numbers",
    "keyVersion",
    "popneiVersion",
    "appVersion",
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
  const settings = parseCheckSettings(f["settings"], [...path, "settings"]);
  if (!settings.ok) {
    return settings;
  }
  return success({
    analysis: analysis.value,
    numbers: numbers.value,
    keyVersion: keyVersion.value,
    popneiVersion: popneiVersion.value,
    appVersion: appVersion.value,
    settings: settings.value,
  });
}

function parseCheckSettings(
  value: unknown,
  path: FieldPath,
): Parsed<CheckSettings> {
  const fields = readObject(value, path, ["passedKept", "passedNotKept"]);
  if (!fields.ok) {
    return fields;
  }
  const f = fields.value;
  const passedKept = parseFingerprint(f["passedKept"], [...path, "passedKept"]);
  if (!passedKept.ok) {
    return passedKept;
  }
  const passedNotKept = parseFingerprint(f["passedNotKept"], [
    ...path,
    "passedNotKept",
  ]);
  if (!passedNotKept.ok) {
    return passedNotKept;
  }
  return success({
    passedKept: passedKept.value,
    passedNotKept: passedNotKept.value,
  });
}

function parseFingerprint(value: unknown, path: FieldPath): Parsed<string> {
  const text = parseText(value, path);
  if (!text.ok) {
    return text;
  }
  if (!FINGERPRINT.test(text.value)) {
    return failure(wrongValue(path, "64 lower case hexadecimal digits"));
  }
  return text;
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
      return `This project file has the analysis ${shown(error.id)}, which this version of the application does not know: it was saved by another version of the application. Open it with the version of the application that saved it.`;
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
    case "twoFiltersOfAKind": {
      const list = LISTS_OF_FILTERS[filtersListOf(error.path)];
      // A filter off whose kind is on is refused at its own path; a second
      // filter off of one kind at the path of its kind (secondOffOfAKind).
      if (list.off && error.path.length === 2) {
        return opened(
          `it has the filter of the ${list.of} by ${FILTER_KIND_WORDS[error.filter]} both on and turned off, and a filter is one or the other`,
        );
      }
      return opened(
        `it has ${twoOfAKind(list, error.filter)}, and a project has at most one of each kind`,
      );
    }
    case "filterOutOfOrder": {
      const list = LISTS_OF_FILTERS[filtersListOf(error.path)];
      return opened(
        `${list.words} should be in the order ${list.order.map((kind) => FILTER_KIND_WORDS[kind]).join(", ")}, and the ${ordinal(positionOf(error.path))} one is out of that order`,
      );
    }
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

/** The four lists of filters of a project. */
type ListOfFilters =
  "filters" | "filtersOff" | "individualFilters" | "individualFiltersOff";

/** A list of filters as the texts name it: what it filters, whether it
    holds the filters turned off, its words, and the order of its kinds. */
interface ListWords {
  readonly of: "variants" | "individuals";
  readonly off: boolean;
  readonly words: string;
  readonly order: readonly (VariantFilterKind | IndividualFilterKind)[];
}

const LISTS_OF_FILTERS: Readonly<Record<ListOfFilters, ListWords>> = {
  filters: {
    of: "variants",
    off: false,
    words: "the filters of the variants",
    order: VARIANT_FILTER_ORDER,
  },
  filtersOff: {
    of: "variants",
    off: true,
    words: "the filters of the variants turned off",
    order: VARIANT_FILTER_ORDER,
  },
  individualFilters: {
    of: "individuals",
    off: false,
    words: "the filters of the individuals",
    order: INDIVIDUAL_FILTER_ORDER,
  },
  individualFiltersOff: {
    of: "individuals",
    off: true,
    words: "the filters of the individuals turned off",
    order: THRESHOLD_ORDER,
  },
};

const LIST_NAMES: readonly ListOfFilters[] = keysOf(LISTS_OF_FILTERS);

/** The list of filters a path of an error of the filters starts in. */
function filtersListOf(path: FieldPath): ListOfFilters {
  const first = path[0];
  const list = LIST_NAMES.find((name) => name === first);
  if (list === undefined) {
    throw defect(
      `an error of the filters has a path that starts in ${String(first)}.`,
    );
  }
  return list;
}

/** Two filters of one kind, in words: "two filters of the variants by
    missing genotypes", "two lists of individuals to keep", "two filters
    of the variants turned off by missing genotypes". */
function twoOfAKind(
  list: ListWords,
  kind: VariantFilterKind | IndividualFilterKind,
): string {
  const off = list.off ? " turned off" : "";
  return kind === "keep" || kind === "remove"
    ? `two lists of ${FILTER_KIND_WORDS[kind]}`
    : `two filters of the ${list.of}${off} by ${FILTER_KIND_WORDS[kind]}`;
}

/** The longest a value of the file is shown, in characters. */
const SHOWN_LENGTH = 40;

/** A value of the file as a text shows it: escaped, and cut after
    SHOWN_LENGTH of its characters, never inside an escape, with "…". */
export function shown(value: string): string {
  const characters = escapedCharacters(value);
  return characters.length > SHOWN_LENGTH
    ? `${characters.slice(0, SHOWN_LENGTH).join("")}…`
    : characters.join("");
}

/** A value of the user's files, the name of a file among them, escaped
    as `shown` escapes it, and not cut. */
export function escaped(value: string): string {
  return escapedCharacters(value).join("");
}

/** The characters that could change the text around them: the control
    and format characters, U+202E that reverses the direction of the text
    among them, and half of a pair that encodes one character, alone. */
const HIDDEN = /^[\p{Cc}\p{Cf}\p{Cs}]$/u;

/** Whether `character`, one character of a value, is one that a text
    escapes, `escapedCharacters` and the strings of popnei's Python that
    the page writes. */
export function isHidden(character: string): boolean {
  return HIDDEN.test(character);
}

/** The escapes of the commonest control characters. */
const NAMED_ESCAPES: ReadonlyMap<string, string> = new Map([
  ["\n", "\\n"],
  ["\t", "\\t"],
  ["\r", "\\r"],
]);

/** The characters of a value, each as a text shows it: a hidden one
    escaped, `\n`, `‮`, `\u{e0001}`, and any other as it is, a
    quote and a backslash among them. A text that cuts a value at a length
    of its own counts and cuts these, so that it never stops inside an
    escape. */
export function escapedCharacters(value: string): readonly string[] {
  return Array.from(value, (character) => {
    if (!isHidden(character)) {
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

/** The words of the fields of a list of filters of the variants, `list`,
    whose words are `words`, and whose filters' words end in `off`. */
function variantFilterFields(
  list: string,
  words: string,
  off: string,
): FieldWords[] {
  const filter = (o: readonly string[]): string =>
    `the ${nth(o, 0)} filter of the variants${off}`;
  return [
    [[list], () => words],
    [[list, N], filter],
    [[list, N, "kind"], (o) => `the kind of ${filter(o)}`],
    ...[
      "maxAllowedMissingRate",
      "maxAllowedMaf",
      "maxAllowedObsHet",
      "maxAllowedR2",
    ].map((name): FieldWords => [
      [list, N, name],
      (o) => `the threshold of ${filter(o)}`,
    ]),
    [[list, N, "maxDist"], (o) => `the distance of ${filter(o)}`],
  ];
}

/** The words of the fields of a list of filters of the individuals,
    `list`, whose words are `words`, and whose filters' words end in
    `off`. */
function individualFilterFields(
  list: string,
  words: string,
  off: string,
): FieldWords[] {
  const filter = (o: readonly string[]): string =>
    `the ${nth(o, 0)} filter of the individuals${off}`;
  return [
    [[list], () => words],
    [[list, N], filter],
    [[list, N, "kind"], (o) => `the kind of ${filter(o)}`],
    [[list, N, "individuals"], (o) => `the list of ${filter(o)}`],
    [
      [list, N, "individuals", N],
      (o) => `the ${nth(o, 1)} individual of the list of ${filter(o)}`,
    ],
    ...["maxAllowedMissingRate", "maxAllowedObsHet"].map((name): FieldWords => [
      [list, N, name],
      (o) => `the threshold of ${filter(o)}`,
    ]),
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
  ...variantFilterFields("filters", "the filters of the variants", ""),
  ...variantFilterFields(
    "filtersOff",
    "the filters of the variants turned off",
    " turned off",
  ),
  ...individualFilterFields(
    "individualFilters",
    "the filters of the individuals",
    "",
  ),
  ...individualFilterFields(
    "individualFiltersOff",
    "the filters of the individuals turned off",
    " turned off",
  ),
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
  [["individuals", "typesSet"], () => "the types set by the user"],
  [
    ["individuals", "typesSet", N],
    (o) => `the ${nth(o, 0)} of the types set by the user`,
  ],
  [
    ["individuals", "typesSet", N, 0],
    (o) => `the column of the ${nth(o, 0)} of the types set by the user`,
  ],
  [
    ["individuals", "typesSet", N, 1, REST],
    (o) => `the type of the ${nth(o, 0)} of the types set by the user`,
  ],
  [
    ["individuals", "typesSet", N, 1, "one"],
    (o) => `the value coded 1 of the ${nth(o, 0)} of the types set by the user`,
  ],
  [
    ["individuals", "typesSet", N, 1, "zero"],
    (o) => `the value coded 0 of the ${nth(o, 0)} of the types set by the user`,
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
    ["individuals", "read", "found", "undecodedLine"],
    () =>
      "the line of the first character that could not be decoded in the individuals file",
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
    ["reference", "checks", N, "popneiVersion"],
    (o) =>
      `the version of popnei of the ${nth(o, 0)} analysis with check numbers`,
  ],
  [
    ["reference", "checks", N, "appVersion"],
    (o) =>
      `the version of the application of the ${nth(o, 0)} analysis with check numbers`,
  ],
  [
    ["reference", "checks", N, "settings"],
    (o) =>
      `the record of the settings the ${nth(o, 0)} analysis with check numbers was calculated with`,
  ],
  [
    ["reference", "checks", N, "settings", "passedKept"],
    (o) =>
      `the record of the settings the ${nth(o, 0)} analysis with check numbers was calculated with, for a variants file that records whether each variant passed its FILTER`,
  ],
  [
    ["reference", "checks", N, "settings", "passedNotKept"],
    (o) =>
      `the record of the settings the ${nth(o, 0)} analysis with check numbers was calculated with, for a variants file that does not record whether each variant passed its FILTER`,
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
