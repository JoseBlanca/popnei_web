/**
 * The types the page, the workers and core share: the filters of the
 * variants and of the individuals, the table of the individuals file and
 * the types of its columns, a request to a worker with its progress and
 * its outcome, the counts of a pass, the request and the result of each
 * analysis, and the request of a written file and its answer
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
 * A filter of the individuals, the application's own, as the project
 * holds it; no job carries one. Core makes of them all the one list of the
 * individuals kept, which a job carries and the runner gives popnei's
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
 * and the user set it. A binary column holds its two values and which of
 * them is coded 1. They are the texts of two cells of the column, compared
 * exactly: a text as it is, a number or a boolean of an xlsx as `String`
 * writes it, so that a number 1 and a text "1" of one column are one
 * value. A missing cell is neither.
 */
export type ColumnType =
  /** The first column, which names the individuals, and no other. */
  | { readonly kind: "identifier" }
  /** Two values, the text `one` coded 1 and the text `zero` coded 0. */
  | {
      readonly kind: "binary";
      readonly one: string;
      readonly zero: string;
    }
  /** Numbers. */
  | { readonly kind: "continuous" }
  /** Categories, the populations among them. */
  | { readonly kind: "categorical" };

/** The character between the cells of a row of a CSV or TSV. */
export type Separator = "," | ";" | "\t";

/** How a CSV or TSV is read; `"auto"` lets the reader find the option. */
export interface CsvOptions {
  /** The encoding of the text. */
  readonly encoding: "auto" | "utf-8" | "windows-1252";
  /** The character between the cells of a row. */
  readonly separator: "auto" | Separator;
  /** The decimal mark of the numbers. */
  readonly decimal: "auto" | "." | ",";
}

/** The three options a read of a CSV or TSV used, each as the user set it
    or, where it was `"auto"`, as the reader found it, which the screen
    shows beside the file; which were `"auto"` is in the options of the
    source. And where the decoding lost a character, for the warning of
    the screen. */
export interface CsvFound {
  /** The encoding of the text; `"utf-16"` only from the mark at the start
      of the file, and so never set. */
  readonly encoding: "utf-8" | "windows-1252" | "utf-16";
  /** The character between the cells of a row. */
  readonly separator: Separator;
  /** The decimal mark of the numbers. */
  readonly decimal: "." | ",";
  /** The line of the file, counted from 1, of the first character that
      could not be decoded and is shown as U+FFFD, �; `null` when every
      character was decoded. */
  readonly undecodedLine: number | null;
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
      readonly separator: Separator;
    }
  /** The files wasm, xlsx_rs, could not open an xlsx as a workbook: a
      file cut short, damaged or of another format; its message, for the
      console. */
  | { readonly kind: "files"; readonly message: string }
  /** Values in a column with no name in the header; `column` is counted
      from 1, and for an xlsx is the column of the sheet, A being 1. */
  | { readonly kind: "unnamedColumn"; readonly column: number }
  /** A row with no name of an individual in its first column, on the
      line `line` of the file, or for an xlsx the row of the sheet. */
  | { readonly kind: "emptyIndividual"; readonly line: number }
  /** A quote that opens a cell on the line `line` and is never closed,
      read with `separator`. */
  | {
      readonly kind: "unclosedQuote";
      readonly line: number;
      readonly separator: Separator;
    }
  /** A file of `size` bytes, more than the `max` the individuals file
      can have; its bytes are never read. */
  | { readonly kind: "tooLarge"; readonly size: number; readonly max: number }
  /** The browser could not read the file, with its message, for the
      console. */
  | { readonly kind: "unreadable"; readonly message: string }
  /** Not a text file. */
  | { readonly kind: "notText" }
  /** A variants file, a VCF, picked as the individuals file: its first
      line starts with `##fileformat=VCF` or `#CHROM`. */
  | { readonly kind: "variantsFile" }
  /** A UTF-16 file that ends in the middle of a character, and may have
      been cut short. */
  | { readonly kind: "cutShort" }
  // From stage 4, an xlsx (docs/specs/worker/files.md, "The refusals"):
  /** Not a zip file, as every xlsx is: most often a CSV named .xlsx. */
  | { readonly kind: "notXlsx" }
  /** A workbook of Excel 97–2003, or another file of the old Office. */
  | { readonly kind: "oldExcel" }
  /** An xlsx saved with a password. */
  | { readonly kind: "encrypted" }
  /** The first sheet that is not hidden, named `sheet`, has no value. */
  | { readonly kind: "emptySheet"; readonly sheet: string }
  /** A cell holds an error calamine does not know, `error`, "#SPILL!". */
  | { readonly kind: "cellError"; readonly error: string }
  /** A cell of the header, at the row `row` and the column `column` of
      the sheet, each counted from 1, is one of the seven errors of Excel
      calamine knows, `error`, "#VALUE!", where a name is needed. */
  | {
      readonly kind: "headerError";
      readonly row: number;
      readonly column: number;
      readonly error: string;
    }
  /** The first sheet, `sheet`, has values as far as the row `lastRow`,
      counted from 1, and the column `lastColumn`, in the letters of
      Excel, "XFD": a rectangle of more than `max` cells. */
  | {
      readonly kind: "sheetTooLarge";
      readonly sheet: string;
      readonly lastRow: number;
      readonly lastColumn: string;
      readonly max: number;
    }
  /** The files wasm could not be downloaded; the browser's message, for
      the console. */
  | { readonly kind: "xlsxReaderNotLoaded"; readonly message: string };

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
  /** A mistake of our code: a message that did not validate, a request
      a worker refused, a `popnei_web defect:` thrown in the calculation
      worker, whose message this is after that start, or popnei's refusal
      of an option it does not know. */
  | { readonly kind: "defect"; readonly message: string };

/** How a VCF is read: the two options of popnei's `openVcf`, both always
    given, so that neither default of popnei is used. */
export interface VcfReadOptions {
  /** The alleles of every genotype, a whole number from 1 to 255. */
  readonly ploidy: number;
  /** Whether the variants that failed a filter of the VCF are left out. */
  readonly onlyPassed: boolean;
}

/** The format of a variants file with its read options: a VCF, plain or
    gzipped, always with them, and popnei's `.nei`, never. */
export type LoadFormat =
  | { readonly format: "vcf"; readonly readOptions: VcfReadOptions }
  | { readonly format: "nei"; readonly readOptions: null };

/** What popnei gives once a variants file is open, with no pass over its
    variants. */
export interface Opened {
  /** The individuals of the file, in its order. */
  readonly individuals: readonly string[];
  /** The ploidy popnei opened the file with. */
  readonly ploidy: number;
}

/** The populations, as pairs `[population, individuals]` in the order of
    the file; the names are the user's, and never the names of fields. */
export type Pops = readonly (readonly [
  pop: string,
  individuals: readonly string[],
])[];

/** The populations under the minimum of individuals, with their
    individuals kept, as pairs `[population, numIndividuals]` in the order
    of the populations they were taken from. */
export type LeftOut = readonly (readonly [
  pop: string,
  numIndividuals: number,
])[];

/** How many variants one filter of the variants was given in a pass, and
    how many it kept, as popnei's `FilteringStats` has them. */
export interface FilteringStats {
  /** The variants the filter was given: those the filter before it kept,
      and every variant of the pass for the first. */
  readonly varsProcessed: number;
  /** Those of them that it kept. */
  readonly varsKept: number;
}

/**
 * The counts of a pass, popnei's `passStats` of its result, which every
 * result and every written file carries. The number of variants of the
 * file is `varsProcessed` of the first filter, or `numVars` when the pass
 * had none.
 */
export interface PassStats {
  /** The variants the pass gave, after every step. */
  readonly numVars: number;
  /** The counts of each filter of the variants of the job, under its kind,
      in the order of the job's filters; empty for a pass with no filter.
      The step of the individuals has no entry. */
  readonly filtering: Partial<Record<VariantFilterKind, FilteringStats>>;
}

/** The request of the diversity of each population
    (docs/specs/analyses/diversity.md). */
export interface DiversityJob {
  /** The analysis the request is of. */
  readonly analysis: "diversity";
  /** The load id of the variants file it reads. */
  readonly fileId: string;
  /** The filters of the variants, in their order. */
  readonly filters: readonly VariantFilter[];
  /** The individuals kept by the filters of the individuals, in the order
      of the variants file, which the runner puts before the filters of the
      variants, so that they count over them; `null` when the filters
      remove nobody, and never empty. */
  readonly individuals: readonly string[] | null;
  /** The populations, each with the individuals kept of the variants file
      it holds, none empty. */
  readonly pops: Pops;
  /** popnei's `minNumIndividuals`: the fewest called genotypes a
      population needs at a variant to have a value there, counted as its
      called alleles over the ploidy, so a genotype half called counts a
      half. */
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
  /** The counts of the pass; `numVars` is the variants the filters
      kept. */
  readonly passStats: PassStats;
}

/** The request of the statistics of each individual, popnei's
    `calcPerIndividualStats`, over every variant and every individual of
    the file, with no filter (docs/specs/analyses/individualChecks.md). */
export interface IndividualChecksJob {
  /** The analysis the request is of. */
  readonly analysis: "individualChecks";
  /** The load id of the variants file it reads. */
  readonly fileId: string;
  /** No filter: the statistics are over every variant of the file. */
  readonly filters: readonly [];
}

/** The statistics of each individual, one number per individual of the
    file in each array, in the order of `individuals`. */
export interface IndividualChecksResult {
  /** The analysis the result is of. */
  readonly analysis: "individualChecks";
  /** Every individual of the file, in its order, as popnei gave them. */
  readonly individuals: readonly string[];
  /** The proportion of missing genotypes of each individual, popnei's
      `missingGtRate`. */
  readonly missingGtRate: Float64Array;
  /** The observed heterozygosity of each individual, popnei's
      `obsHetRate`; NaN for one with no called genotype. */
  readonly obsHetRate: Float64Array;
  /** The counts of the pass. */
  readonly passStats: PassStats;
}

/** The request of the histograms of the variants, popnei's
    `calcPerVarDistribs` over every variant of the file and the individuals
    kept, as one population (docs/specs/analyses/variantChecks.md). */
export interface VariantChecksJob {
  /** The analysis the request is of. */
  readonly analysis: "variantChecks";
  /** The load id of the variants file it reads. */
  readonly fileId: string;
  /** No filter: the histograms are of every variant of the file. */
  readonly filters: readonly [];
  /** The individuals kept, in the order of the variants file, which the
      runner puts on the variants; `null` when the filters of the
      individuals remove nobody, and never empty. */
  readonly individuals: readonly string[] | null;
  /** popnei's `minNumIndividuals`, 0, so that popnei bins the variants
      with few called genotypes too. */
  readonly minNumIndividuals: number;
  /** The bins of each histogram, popnei's `histKwargs`. */
  readonly numBins: number;
  /** The lowest and the highest edge of the bins, popnei's `histKwargs`. */
  readonly range: readonly [number, number];
}

/** One histogram of the variants, and the mean of its statistic. */
export interface VariantDistrib {
  /** The mean over the variants that have a value; NaN for none. */
  readonly mean: number;
  /** The variants in each bin, one fewer than the edges. */
  readonly counts: Uint32Array;
}

/** The histograms of the variants, three over the same edges. */
export interface VariantChecksResult {
  /** The analysis the result is of. */
  readonly analysis: "variantChecks";
  /** The edges of the bins, `numBins` + 1, shared by the three. */
  readonly binEdges: Float64Array;
  /** The major allele frequency, popnei's `maf`. */
  readonly maf: VariantDistrib;
  /** The observed heterozygosity. */
  readonly obsHet: VariantDistrib;
  /** The unbiased expected heterozygosity. */
  readonly unbiasedExpHet: VariantDistrib;
  /** The counts of the pass; `numVars` is the variants of the file. */
  readonly passStats: PassStats;
}

/** The request of the counts of the filters of the variants, from a pass
    that gives nothing else (docs/specs/analyses/filterCounts.md). */
export interface FilterCountsJob {
  /** The analysis the request is of. */
  readonly analysis: "filterCounts";
  /** The load id of the variants file it reads. */
  readonly fileId: string;
  /** The filters of the variants, in their order. */
  readonly filters: readonly VariantFilter[];
  /** The individuals kept, in the order of the variants file, which the
      runner puts before the filters, so that they count over them; `null`
      when the filters of the individuals remove nobody, and never empty. */
  readonly individuals: readonly string[] | null;
}

/** The counts of the filters of the variants. */
export interface FilterCountsResult {
  /** The analysis the result is of. */
  readonly analysis: "filterCounts";
  /** The counts of the pass. */
  readonly passStats: PassStats;
}

/** The method of the principal components: a PCA of the genotypes, or a
    PCoA of the Kosman distances, corrected by Lingoes' method when no
    space holds them. */
export type PcaMethod = "pca" | "pcoa";

/** The request of the principal components of the individuals kept, over
    the filters `pcaFilters` of core gives, the first `numCompsKept`
    components of what popnei gives (docs/specs/analyses/pca.md). */
export interface PcaJob {
  /** The analysis the request is of. */
  readonly analysis: "pca";
  /** The load id of the variants file it reads. */
  readonly fileId: string;
  /** The dataset's filters of the variants, with the PCA's own in the place
      of those of their kind, in the fixed order, one of each kind. */
  readonly filters: readonly VariantFilter[];
  /** The individuals kept, in the order of the variants file, which the
      runner puts before the filters; `null` when the filters of the
      individuals remove nobody, and never empty. */
  readonly individuals: readonly string[] | null;
  /** The PCA of the genotypes or the PCoA of the Kosman distances. */
  readonly method: PcaMethod;
  /** How many components the result keeps, 10, `PCA_NUM_COMPS_KEPT` of
      core; a whole number of 1 or more. */
  readonly numCompsKept: number;
}

/** The principal components of the individuals of a pass, cut to the
    components the job keeps. */
export interface PcaResult {
  /** The analysis the result is of. */
  readonly analysis: "pca";
  /** The method of the job. */
  readonly method: PcaMethod;
  /** The individuals of the pass, in the order of the file, which is the
      order of the rows of `projections`. */
  readonly individuals: readonly string[];
  /** The components kept: the smaller of `numCompsKept` and
      `numCompsFound`. */
  readonly numComps: number;
  /** Every component with variance that popnei gave. */
  readonly numCompsFound: number;
  /** Where each individual falls on each component kept, the individuals
      × `numComps`, row after row. */
  readonly projections: Float64Array;
  /** The share of each component kept, in percent of the variance of every
      component, `numComps` numbers. */
  readonly explainedVariancePercent: Float64Array;
  /** The PCA's variants with variance that it used, popnei's
      `usedVars.length`; `null` for the PCoA. */
  readonly numVarsUsed: number | null;
  /** The PCoA's constant of Lingoes' correction, in the units of a squared
      distance, 0 when none was needed; `null` for the PCA. */
  readonly lingoesConstant: number | null;
  /** The PCoA's share of the variance of the distances that lay in
      negative eigenvalues before the correction, in percent; `null` for
      the PCA. */
  readonly negativeEigenvaluesPercent: number | null;
  /** The counts of the pass, of filters that may not be the project's. */
  readonly passStats: PassStats;
}

/** The request of a calculation, one member per analysis, tagged by
    `analysis`. */
export type Job =
  | DiversityJob
  | IndividualChecksJob
  | VariantChecksJob
  | FilterCountsJob
  | PcaJob;

/** The result of a calculation, one member per analysis, tagged by
    `analysis` as its request. */
export type JobResult =
  | DiversityResult
  | IndividualChecksResult
  | VariantChecksResult
  | FilterCountsResult
  | PcaResult;

/**
 * The request of a file of the filtered variants
 * (docs/specs/analyses/writeVariants.md). It is not a `Job`: it is not an
 * analysis, and its answer never goes into the cache.
 */
export interface WriteJob {
  /** The format of the file, popnei's `.nei` until popnei has a writer of
      the VCF. */
  readonly format: "nei";
  /** The load id of the variants file it reads. */
  readonly fileId: string;
  /** The filters of the variants, in their order. */
  readonly filters: readonly VariantFilter[];
  /** The individuals kept, in the order of the variants file; `null` when
      the filters of the individuals remove nobody, and never empty. */
  readonly individuals: readonly string[] | null;
}

/**
 * A written file, generic in the type of the file so that this module
 * names nothing of the browser: the client gives `Written<Blob>`, and core
 * holds the file as a value it does not read.
 */
export interface Written<F> {
  /** The format of the file. */
  readonly format: "nei";
  /** The file, a `Blob` on the page. */
  readonly file: F;
  /** Its size in bytes, which core reads without naming a `Blob`. */
  readonly numBytes: number;
  /** The counts of the pass: the variants written, and what each filter
      kept. */
  readonly passStats: PassStats;
}
