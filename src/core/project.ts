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

import type { JsonObject } from "./keys.ts";
import type {
  ColumnType,
  CsvFound,
  CsvOptions,
  IndividualFilter,
  IndividualsFileError,
  IndividualsTable,
  RunError,
  VariantFilter,
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
