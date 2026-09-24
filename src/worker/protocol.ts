/**
 * The types the page, the workers and core share: the filters of the
 * variants and of the individuals, the table of the individuals file and
 * the types of its columns, and a request to a worker with its progress
 * and its outcome (docs/specs/worker/protocol.md).
 *
 * This file holds types and nothing else, and names nothing of the
 * browser, because core imports it and is checked with no part of the
 * browser. It imports nothing of core: a key travels here as a `string`.
 */

/**
 * A filter of the variants, one of the four of popnei 0.1.0, with the
 * names of the arguments of popnei's methods of `Variants`. `kind` is the
 * name popnei gives the filter in the counts of a pass. Each keeps the
 * variants whose number is at most its threshold; the thresholds are
 * numbers from 0 to 1, given to popnei as the user typed them.
 */
export type VariantFilter =
  /** `filterByMissingData`: the largest proportion of missing genotypes. */
  | { readonly kind: "missing_data"; readonly maxAllowedMissingRate: number }
  /** `filterByMaf`: the largest major allele frequency, the count of the
      commonest allele over the called alleles. */
  | { readonly kind: "maf"; readonly maxAllowedMaf: number }
  /** `filterByObsHet`: the largest observed heterozygosity. */
  | { readonly kind: "obs_het"; readonly maxAllowedObsHet: number }
  /** `filterByLd`: the largest r² between two variants at most `maxDist`
      base pairs apart, a whole number from 1 to 2^53 − 1. */
  | {
      readonly kind: "ld";
      readonly maxAllowedR2: number;
      readonly maxDist: number;
    };

/** The kind of a filter of the variants; a project holds one of each. */
export type VariantFilterKind = VariantFilter["kind"];

/**
 * A filter of the individuals, the application's own: the calculation
 * worker makes of them all the one list it gives popnei's
 * `filterIndividuals`. The names are those of the individuals of the
 * variants file; the thresholds, numbers from 0 to 1, are of each
 * individual.
 */
export type IndividualFilter =
  /** Keeps the individuals of the list. */
  | { readonly kind: "keep"; readonly individuals: readonly string[] }
  /** Removes the individuals of the list. */
  | { readonly kind: "remove"; readonly individuals: readonly string[] }
  /** Keeps the individuals whose proportion of missing genotypes is at
      most the threshold. */
  | { readonly kind: "missing_data"; readonly maxAllowedMissingRate: number }
  /** Keeps the individuals whose observed heterozygosity is at most the
      threshold. */
  | { readonly kind: "obs_het"; readonly maxAllowedObsHet: number };

/** The kind of a filter of the individuals; a project holds one of each. */
export type IndividualFilterKind = IndividualFilter["kind"];

/**
 * A cell of the individuals file: text, a number, a boolean, or `null`
 * when it is missing, an empty cell, `NA` or `-`. The cells of a CSV or
 * TSV are text as written in the file; numbers and booleans come only
 * from an xlsx.
 */
export type Cell = string | number | boolean | null;

/** The table of the individuals file, as the light worker read it. */
export interface IndividualsTable {
  /** The names of the header, in the order of the file; the first column
      names the individuals. */
  readonly columns: readonly string[];
  /** One row per individual, in the order of the file, each as long as
      the header. */
  readonly rows: readonly (readonly Cell[])[];
}

/**
 * The type of a column of the individuals file, as the reader inferred it
 * and the user set it. A binary column holds its two values, two cells of
 * the column compared exactly, and which of them is coded 1; a missing
 * cell is neither.
 */
export type ColumnType =
  /** The first column, which names the individuals, and no other. */
  | { readonly kind: "identifier" }
  /** Two values, `one` coded 1 and `zero` coded 0. */
  | {
      readonly kind: "binary";
      readonly one: string | number | boolean;
      readonly zero: string | number | boolean;
    }
  /** Numbers. */
  | { readonly kind: "continuous" }
  /** Categories, the populations among them. */
  | { readonly kind: "categorical" };

/** How a CSV or TSV is read; `"auto"` lets the reader find the option. */
export interface CsvOptions {
  /** The encoding of the text. */
  readonly encoding: "auto" | "utf-8" | "windows-1252";
  /** The character between the cells of a row. */
  readonly separator: "auto" | "," | ";" | "\t";
  /** The decimal mark of the numbers. */
  readonly decimal: "auto" | "." | ",";
}

/** What the reader found of a CSV or TSV, where an option was `"auto"`,
    which the screen shows beside the file. */
export interface CsvFound {
  /** The encoding of the text. */
  readonly encoding: "utf-8" | "windows-1252";
  /** The character between the cells of a row. */
  readonly separator: "," | ";" | "\t";
  /** The decimal mark of the numbers. */
  readonly decimal: "." | ",";
}

/**
 * The ways the individuals file can be refused. The spec of the reader,
 * in stage 2, owns this union and may add to it.
 */
export type IndividualsFileError =
  /** No row below the header. */
  | { readonly kind: "empty" }
  /** Two columns of one name. */
  | { readonly kind: "duplicateColumn"; readonly name: string }
  /** One individual in two rows. */
  | { readonly kind: "duplicateIndividual"; readonly name: string }
  /** A row whose number of cells, `found`, is not that of the header,
      `expected`; `line` is the line of the file. */
  | {
      readonly kind: "raggedRow";
      readonly line: number;
      readonly expected: number;
      readonly found: number;
    }
  /** The reader of xlsx, the files wasm, refused the file, with its
      message. */
  | { readonly kind: "files"; readonly message: string };

/** How far a request has gone: `done` of `total` steps. */
export interface Progress {
  /** The steps done. */
  readonly done: number;
  /** The steps of the whole request. */
  readonly total: number;
}

/**
 * A request sent to a worker, whose result `R` arrives later.
 */
export interface Run<R> {
  /** The number of the request, counted up from 1 for the life of the
      page. */
  readonly id: number;
  /** The outcome, which never fails: a failure is one of its values. */
  readonly outcome: Promise<Outcome<R>>;
  /** Takes a request that waits in the queue out of it, or, for one that
      runs, ends its worker and starts another. */
  cancel(): void;
}

/** How a request ended. */
export type Outcome<R> =
  /** The result, under the key it was requested with, as a text; core
      makes its own key of it with `keyFromWire`. */
  | { readonly kind: "done"; readonly key: string; readonly result: R }
  /** The request failed. */
  | { readonly kind: "failed"; readonly error: RunError }
  /** The request was cancelled. */
  | { readonly kind: "cancelled" };

/** Why a request failed. */
export type RunError =
  /** popnei refused its input: a call to popnei threw a plain `Error`,
      whose message this is. The same data gives it again every time. */
  | { readonly kind: "popnei"; readonly message: string }
  /** A call to the files wasm threw. */
  | { readonly kind: "files"; readonly message: string }
  /** The worker crashed, or threw outside a call; a second try, after a
      restart, can succeed. */
  | { readonly kind: "workerFailed"; readonly message: string }
  /** The worker gave no `ready`, twice. */
  | { readonly kind: "couldNotStart"; readonly reason: string }
  /** The worker is of another version of the protocol: a stale file after
      a deploy. */
  | { readonly kind: "protocolMismatch" }
  /** A message that did not validate, a mistake of our code. */
  | { readonly kind: "defect"; readonly message: string };
