/**
 * The types the page, the workers and core share: the filters of the
 * variants and of the individuals, the table of the individuals file and
 * the types of its columns, a request to a worker with its progress and
 * its outcome, and the request and the result of each analysis
 * (docs/specs/worker/protocol.md).
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

/** The three options a read of a CSV or TSV used, each as the user set it
    or, where it was `"auto"`, as the reader found it, which the screen
    shows beside the file; which were `"auto"` is in the options of the
    source. */
export interface CsvFound {
  /** The encoding of the text; `"utf-16"` only from the mark at the start
      of the file, and so never set. */
  readonly encoding: "utf-8" | "windows-1252" | "utf-16";
  /** The character between the cells of a row. */
  readonly separator: "," | ";" | "\t";
  /** The decimal mark of the numbers. */
  readonly decimal: "." | ",";
}

/**
 * The ways the individuals file can be refused. The spec of the reader,
 * docs/specs/worker/individuals.md, owns this union and the words of
 * each kind.
 */
export type IndividualsFileError =
  /** No row of individuals: a header alone, or nothing at all. */
  | { readonly kind: "empty" }
  /** Two columns of one name. */
  | { readonly kind: "duplicateColumn"; readonly name: string }
  /** One individual in two rows. */
  | { readonly kind: "duplicateIndividual"; readonly name: string }
  /** A row whose number of cells, `found`, is not that of the header,
      `expected`; `line` is the line of the file, and `separator` the one
      the read used, whose mistake is the likeliest cause. */
  | {
      readonly kind: "raggedRow";
      readonly line: number;
      readonly expected: number;
      readonly found: number;
      readonly separator: "," | ";" | "\t";
    }
  /** The reader of xlsx, the files wasm, refused the file, with its
      message. */
  | { readonly kind: "files"; readonly message: string }
  /** Values in a column with no name in the header; `column` is counted
      from 1. */
  | { readonly kind: "unnamedColumn"; readonly column: number }
  /** A row with no name of an individual in its first column, on the
      line `line` of the file. */
  | { readonly kind: "emptyIndividual"; readonly line: number }
  /** A quote that opens a cell on the line `line` and is never closed,
      read with `separator`. */
  | {
      readonly kind: "unclosedQuote";
      readonly line: number;
      readonly separator: "," | ";" | "\t";
    }
  /** A file of `size` bytes, more than the `max` a metadata file can
      have; its bytes are never read. */
  | { readonly kind: "tooLarge"; readonly size: number; readonly max: number }
  /** The browser could not read the file, with its message, for the
      console. */
  | { readonly kind: "unreadable"; readonly message: string }
  /** Not a text file. */
  | { readonly kind: "notText" };

/**
 * How far a run has gone: the four numbers popnei's `Variants.onProgress`
 * gives of each pass, under popnei's names. The run is
 * `(pass − 1 + bytesRead / numBytes) / numPasses` done.
 */
export interface Progress {
  /** The bytes of the file the pass has read, `numBytes` at most. */
  readonly bytesRead: number;
  /** The bytes of the file, counted on the disk, so a gzipped VCF
      compressed. */
  readonly numBytes: number;
  /** The pass that reads, 1 for the first. */
  readonly pass: number;
  /** The passes of the run. */
  readonly numPasses: number;
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
  /** The browser can no longer read the variants file `name`: changed,
      moved or deleted on the disk since it was picked. popnei's message
      is for the console. A new load of the file mends it, a second try
      does not. */
  | {
      readonly kind: "reopenFailed";
      readonly name: string;
      readonly message: string;
    }
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

/** The populations, as pairs `[population, individuals]` in the order of
    the file; the names are the user's, and never the names of fields. */
export type Pops = readonly (readonly [
  pop: string,
  individuals: readonly string[],
])[];

/** The request of the diversity of each population
    (docs/specs/analyses/diversity.md). */
export interface DiversityJob {
  /** The analysis the request is of. */
  readonly analysis: "diversity";
  /** The load id of the variants file it reads. */
  readonly fileId: string;
  /** The filters of the variants, in their order. */
  readonly filters: readonly VariantFilter[];
  /** The filters of the individuals; empty in stage 2. */
  readonly individualFilters: readonly IndividualFilter[];
  /** The populations, each with the individuals of the variants file it
      holds, none empty. */
  readonly pops: Pops;
  /** The fewest individuals with a called genotype at a variant for a
      population to have a value there, popnei's `minNumIndividuals`. */
  readonly minNumIndividuals: number;
  /** The frequency of the commonest allele below which a variant is
      polymorphic, popnei's `polyThreshold`. */
  readonly polyThreshold: number;
}

/** The result of the diversity, every array in the order of the
    populations of its request. */
export interface DiversityResult {
  /** The analysis the result is of. */
  readonly analysis: "diversity";
  /** The populations popnei was given. */
  readonly pops: readonly string[];
  /** The individuals of each that popnei was given. */
  readonly numIndividuals: Uint32Array;
  /** The mean unbiased expected heterozygosity; NaN for no value. */
  readonly unbiasedExpHet: Float64Array;
  /** The mean observed heterozygosity; NaN for no value. */
  readonly obsHet: Float64Array;
  /** The proportion of polymorphic variants; NaN for no value. */
  readonly polyRatio: Float64Array;
  /** The variants at which each population has a value. */
  readonly numVarsWithValue: Uint32Array;
  /** The variants the filters kept. */
  readonly numVars: number;
  /** The variants of the file. */
  readonly numVarsRead: number;
}

/** The request of a calculation, one member per analysis, tagged by
    `analysis`. */
export type Job = DiversityJob;

/** The result of a calculation, one member per analysis, tagged by
    `analysis` as its request. */
export type JobResult = DiversityResult;
