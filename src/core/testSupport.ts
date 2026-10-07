/**
 * What the tests of core share: the generators of fast-check, which draw
 * random values for the property tests, a project written by hand, the
 * analyses of the tests, and the deep freeze. Imported by tests alone.
 */

import * as fc from "fast-check";
import type { JsonObject, JsonValue, KeyedDef } from "./keys.ts";
import {
  INDIVIDUAL_FILTER_ORDER,
  VARIANT_FILTER_ORDER,
  columnAllows,
  analysisOptions,
  individualsNeeds,
  loadIndividuals,
  loadVariants,
  removeIndividualFilter,
  removeIndividuals,
  setAnalysisOptions,
  setColumnType,
  setCsvOptions,
  setGrouping,
  setIndividualFilter,
  setVariantFilter,
  turnOffIndividualFilter,
  turnOffVariantFilter,
} from "./project.ts";
import type {
  AnalysisId,
  AnalysisOptions,
  AppId,
  ColumnAllows,
  ColumnTypeOf,
  Grouping,
  VariantLoad,
  IndividualThreshold,
  IndividualsRead,
  IndividualsSource,
  ParsedAnalysis,
  Project,
  ProjectVariantFilter,
  SourceRead,
  VariantSource,
} from "./project.ts";
import type { Result } from "./result.ts";
import type { IndividualStats } from "./individualsKept.ts";
import type { AnalysisDef, PassFound, WorkerClient } from "./store.ts";
import type {
  Cell,
  ColumnType,
  CsvFound,
  CsvOptions,
  DiversityResult,
  IndividualFilter,
  IndividualsFileError,
  IndividualsTable,
  Outcome,
  Progress,
  Run,
  PassStats,
  RunError,
  VariantDistrib,
  VariantFilterKind,
  VariantsSummaryResult,
  WriteJob,
  Written,
} from "../worker/protocol.ts";

/**
 * The fields of a diversity result that popnei's `calcPopDiversity`
 * gives, from stage 5, for `numPops` populations none of which was given
 * to it, as when none has the minimum of individuals: NaN in the six
 * arrays of numbers, 0 variants in the draw, no count of the variants of
 * every population and no spectrum, at the draw `numCalledAlleles`, 40 by
 * default. The results written before stage 5 take them unchanged.
 */
export function noPopDiversity(
  numPops: number,
  numCalledAlleles = 40,
): Omit<
  DiversityResult,
  | "analysis"
  | "pops"
  | "numIndividuals"
  | "unbiasedExpHet"
  | "obsHet"
  | "polyRatio"
  | "numVarsWithValue"
  | "passStats"
> {
  const nan = (): Float64Array => new Float64Array(numPops).fill(NaN);
  return {
    fis: nan(),
    numAllelesMean: nan(),
    numAllelesInDraw: nan(),
    privateAllelesTotal: nan(),
    privateAllelesMean: nan(),
    privateAllelesInDraw: nan(),
    numVarsInDraw: new Uint32Array(numPops),
    numVarsEveryPop: null,
    numVarsEveryPopInDraw: null,
    numCalledAlleles,
    foldedSfs: Array.from({ length: numPops }, () => null),
  };
}

/**
 * Freezes a value and everything it holds, so that a function that writes
 * into it throws in a test, since ES modules run in strict mode. Gives the
 * value itself.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    const fields: readonly unknown[] = Object.values(value);
    for (const field of fields) {
      deepFreeze(field);
    }
    Object.freeze(value);
  }
  return value;
}

/** The load id of the variants file of `sampleProject`. */
export const SAMPLE_VARIANTS_ID = "00112233445566778899aabbccddeeff";

/** The load id of the individuals file of `sampleProject`. */
export const SAMPLE_INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

/**
 * A project of population genetics, frozen deeply, with every part set: a
 * `.nei` file read with four individuals, two filters of the variants and
 * two of the individuals, a CSV file of individuals read, with a column
 * of populations, a binary column of text and a continuous one, the
 * populations grouped by `pop`, and the options of the diversity.
 */
export function sampleProject(): Project {
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: SAMPLE_VARIANTS_ID,
      name: "panel.nei",
      size: 1024,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: null,
      },
    },
    filters: [
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "maf", maxAllowedMaf: 0.95 },
    ],
    filtersOff: [],
    individualFilters: [
      { kind: "remove", individuals: ["i4"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
    ],
    individualFiltersOff: [],
    individuals: {
      fileId: SAMPLE_INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table: {
          columns: ["id", "pop", "sex", "height"],
          rows: [
            ["i1", "P1", "1", "1.52"],
            ["i2", "P1", "2", null],
            ["i3", "P2", "1", "1.61"],
            ["i4", "P2", "2", "1.70"],
          ],
        },
        columns: [
          { kind: "identifier" },
          { kind: "categorical" },
          { kind: "binary", one: "2", zero: "1" },
          { kind: "continuous" },
        ],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
    grouping: { kind: "populations", column: "pop" },
    analyses: [{ analysis: "diversity", options: { minNumInds: 20 } }],
    reference: null,
  });
}

/** Half of a pair that encodes one character, alone. */
const loneSurrogate = fc
  .integer({ min: 0xd800, max: 0xdfff })
  .map((code) => String.fromCharCode(code));

/** How the generator of JSON values draws the names of the fields. */
export interface JsonValueOptions {
  /** Whether a field may be named `__proto__`, which JavaScript treats in
      a special way. */
  readonly withProto: boolean;
}

function jsonArbitraries(options: JsonValueOptions): {
  value: fc.Arbitrary<JsonValue>;
  object: fc.Arbitrary<JsonObject>;
} {
  const text = fc.oneof(
    fc.string({ unit: "binary" }),
    fc.string({ unit: loneSurrogate }),
  );
  const name = options.withProto
    ? fc.oneof(text, fc.constant("__proto__"))
    : text.filter((n) => n !== "__proto__");
  const number = fc.oneof(
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.constant(-0),
  );
  return fc.letrec<{ value: JsonValue; object: JsonObject }>((tie) => ({
    value: fc.oneof(
      { depthSize: "small", withCrossShrink: true },
      fc.constant(null),
      fc.boolean(),
      number,
      text,
      fc.array(tie("value"), { maxLength: 4 }),
      tie("object"),
    ),
    object: fc
      .uniqueArray(fc.tuple(name, tie("value")), {
        selector: ([field]) => field,
        maxLength: 4,
      })
      // Object.fromEntries defines each field as its own, so a field
      // named __proto__ is kept as a field.
      .map((entries): JsonObject => Object.fromEntries(entries)),
  }));
}

/**
 * Any JSON value: `null`, booleans, whole numbers and fractions, −0 among
 * them, texts of the whole of Unicode, broken characters, half of a pair
 * that encodes one character, among them, and lists and objects of them,
 * nested up to a few levels.
 */
export function jsonValue(options: JsonValueOptions): fc.Arbitrary<JsonValue> {
  return jsonArbitraries(options).value;
}

/** Any JSON object, of the values `jsonValue` draws. */
export function jsonObject(
  options: JsonValueOptions,
): fc.Arbitrary<JsonObject> {
  return jsonArbitraries(options).object;
}

/**
 * A command drawn with its arguments. `bind` fixes, for the project it is
 * given, the arguments that depend on it, a filter to move, a column to
 * type, and gives the command with all its arguments, so that it can be
 * applied twice with the same ones; or `null` when the command has no
 * valid arguments on that project, a column type with no table read.
 */
export interface DrawnCommand {
  /** The name of the command, for the report of a failure. */
  readonly name: string;
  /** The command with its arguments fixed for `p`, or `null`. */
  readonly bind: (p: Project) => ((p: Project) => Project) | null;
}

/** Asks `fc.record` for objects of `Object.prototype`, as JSON.parse
    gives, and not of a null prototype, which strict equality tells
    apart. */
const PLAIN = { noNullPrototype: true } as const;

const threshold = fc.double({ min: 0, max: 1, noNaN: true });

/** Any filter of the variants as the project holds it, the filter of
    the FILTER column among them; the LD filter has no distance, `maxDist`
    `null`, in about half of the draws. */
const variantFilter: fc.Arbitrary<ProjectVariantFilter> = fc.oneof(
  fc.constant<ProjectVariantFilter>({ kind: "passed" }),
  threshold.map((t): ProjectVariantFilter => ({
    kind: "missing_data",
    maxAllowedMissingRate: t,
  })),
  threshold.map((t): ProjectVariantFilter => ({
    kind: "maf",
    maxAllowedMaf: t,
  })),
  threshold.map((t): ProjectVariantFilter => ({
    kind: "obs_het",
    maxAllowedObsHet: t,
  })),
  fc
    .tuple(
      threshold,
      fc.option(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), {
        freq: 2,
      }),
    )
    .map(([r2, dist]): ProjectVariantFilter => ({
      kind: "ld",
      maxAllowedR2: r2,
      maxDist: dist,
    })),
);

const variantFilterKind = fc.constantFrom<VariantFilterKind>(
  ...VARIANT_FILTER_ORDER,
);

const individualNames = fc.subarray(["i1", "i2", "i3", "i4"]);

const individualFilter: fc.Arbitrary<IndividualFilter> = fc.oneof(
  individualNames.map((names): IndividualFilter => ({
    kind: "keep",
    individuals: names,
  })),
  individualNames.map((names): IndividualFilter => ({
    kind: "remove",
    individuals: names,
  })),
  threshold.map((t): IndividualFilter => ({
    kind: "missing_data",
    maxAllowedMissingRate: t,
  })),
  threshold.map((t): IndividualFilter => ({
    kind: "obs_het",
    maxAllowedObsHet: t,
  })),
);

/** The kinds of the lists of individuals, which have no switch. */
const listKind = fc.constantFrom<"keep" | "remove">("keep", "remove");

/** The kinds of the thresholds of the individuals, which have a switch. */
const thresholdKind = fc.constantFrom<IndividualThreshold["kind"]>(
  "missing_data",
  "obs_het",
);

const csvOptions: fc.Arbitrary<CsvOptions> = fc.record(
  {
    encoding: fc.constantFrom("auto", "utf-8", "windows-1252"),
    separator: fc.constantFrom("auto", ",", ";", "\t"),
    decimal: fc.constantFrom("auto", ".", ","),
  },
  PLAIN,
);

/** A few load ids, so that a load sometimes repeats the one there. */
const loadId = fc.constantFrom(
  SAMPLE_VARIANTS_ID,
  SAMPLE_INDIVIDUALS_ID,
  "0123456789abcdef0123456789abcdef",
);

function command(
  name: string,
  bind: (p: Project) => ((p: Project) => Project) | null,
): DrawnCommand {
  return { name, bind };
}

/** A position drawn as a number, taken modulo the length of a list the
    project gives when the command is bound. */
const seed = fc.nat();

/**
 * Any of the commands of the project spec, with arguments valid on the
 * project it is bound to, starting from `sampleProject`, a project of
 * population genetics; and the switch of a filter kept off turned on
 * again, `setVariantFilter` or `setIndividualFilter` of the values kept.
 */
export const drawnCommand: fc.Arbitrary<DrawnCommand> = fc.oneof(
  fc
    .record({
      fileId: loadId,
      vcf: fc.boolean(),
      ploidy: fc.integer({ min: 1, max: 255 }),
      onlyPassed: fc.boolean(),
    })
    .map(({ fileId, vcf, ploidy, onlyPassed }) =>
      command("loadVariants", (p) => {
        // A load id already there comes with the fields it has: another
        // field with it is a defect.
        const there = p.variants;
        const load: VariantLoad =
          there?.fileId === fileId
            ? there
            : {
                fileId,
                name: vcf ? "panel.vcf" : "panel.nei",
                size: 2048,
                format: vcf ? "vcf" : "nei",
                readOptions: vcf ? { ploidy, onlyPassed } : null,
              };
        return (q) => loadVariants(q, load);
      }),
    ),
  variantFilter.map((filter) =>
    command("setVariantFilter", () => (p) => setVariantFilter(p, filter)),
  ),
  variantFilterKind.map((kind) =>
    command("turnOffVariantFilter", () => (p) => turnOffVariantFilter(p, kind)),
  ),
  // The switch turned on again, with the values kept while it was off.
  seed.map((which) =>
    command("setVariantFilter kept", (p) => {
      const kept = p.filtersOff[which % Math.max(p.filtersOff.length, 1)];
      return kept === undefined ? null : (q) => setVariantFilter(q, kept);
    }),
  ),
  individualFilter.map((filter) =>
    command("setIndividualFilter", () => (p) => setIndividualFilter(p, filter)),
  ),
  listKind.map((kind) =>
    command(
      "removeIndividualFilter",
      () => (p) => removeIndividualFilter(p, kind),
    ),
  ),
  thresholdKind.map((kind) =>
    command(
      "turnOffIndividualFilter",
      () => (p) => turnOffIndividualFilter(p, kind),
    ),
  ),
  seed.map((which) =>
    command("setIndividualFilter kept", (p) => {
      const off = p.individualFiltersOff;
      const kept = off[which % Math.max(off.length, 1)];
      return kept === undefined ? null : (q) => setIndividualFilter(q, kept);
    }),
  ),
  fc
    .record({ fileId: loadId, csv: fc.option(csvOptions) })
    .map(({ fileId, csv }) =>
      command("loadIndividuals", (p) => {
        const there = p.individuals;
        const load =
          there?.fileId === fileId
            ? there
            : { fileId, name: csv === null ? "pops.xlsx" : "pops.csv", csv };
        return (q) => loadIndividuals(q, load);
      }),
    ),
  csvOptions.map((csv) =>
    command("setCsvOptions", (p) =>
      (p.individuals?.csv ?? null) === null
        ? null
        : (q) => setCsvOptions(q, csv),
    ),
  ),
  fc.tuple(seed, seed, fc.boolean()).map(([which, kind, flip]) =>
    command("setColumnType", (p) => {
      const read = p.individuals?.read;
      if (read?.kind !== "read") {
        return null;
      }
      const index = which % read.table.columns.length;
      const column = read.table.columns[index];
      if (column === undefined) {
        return null;
      }
      const type = columnTypeFor(columnAllows(read)[index], index, kind, flip);
      return (q) => setColumnType(q, column, type);
    }),
  ),
  fc.constant(command("removeIndividuals", () => (p) => removeIndividuals(p))),
  fc
    .constantFrom(null, "pop", "sex", "height", "breed")
    .map((column) =>
      command(
        "setGrouping",
        () => (p) => setGrouping(p, { kind: "populations", column }),
      ),
    ),
  fc
    .tuple(fc.constantFrom("diversity", "pca"), jsonObject({ withProto: true }))
    .map(([analysis, options]) =>
      command(
        "setAnalysisOptions",
        () => (p) => setAnalysisOptions(p, testAnalysis(analysis), options),
      ),
    ),
);

/** A type the values of a column allow, by `columnAllows`: `identifier`
    for the first, and for another categorical, continuous when it is all
    numbers, or binary, in either coding, when it has two values. */
function columnTypeFor(
  allows: ColumnAllows | undefined,
  index: number,
  kind: number,
  flip: boolean,
): ColumnType {
  if (index === 0 || allows === undefined) {
    return { kind: "identifier" };
  }
  switch (kind % 3) {
    case 0:
      return allows.continuous
        ? { kind: "continuous" }
        : { kind: "categorical" };
    case 1:
      return { kind: "categorical" };
    default:
      if (allows.binary === null) {
        return { kind: "categorical" };
      }
      return flip
        ? { kind: "binary", one: allows.binary.zero, zero: allows.binary.one }
        : { kind: "binary", one: allows.binary.one, zero: allows.binary.zero };
  }
}

/** Any load id: 32 lower case hexadecimal digits. */
export const anyLoadId: fc.Arbitrary<string> =
  fc.stringMatching(/^[0-9a-f]{32}$/);

/** Any list of filters of the variants, at most one of each kind, in the
    fixed order of the project; the LD filter with no distance in about
    half of the lists that have it. */
export const variantFilters: fc.Arbitrary<readonly ProjectVariantFilter[]> = fc
  .uniqueArray(variantFilter, {
    selector: (f) => f.kind,
    maxLength: VARIANT_FILTER_ORDER.length,
  })
  .map((filters) =>
    filters.toSorted(
      (a, b) =>
        VARIANT_FILTER_ORDER.indexOf(a.kind) -
        VARIANT_FILTER_ORDER.indexOf(b.kind),
    ),
  );

/** Any list of filters of the individuals, at most one of each kind, in
    the fixed order of the project. */
export const individualFilters: fc.Arbitrary<readonly IndividualFilter[]> = fc
  .uniqueArray(individualFilter, { selector: (f) => f.kind, maxLength: 4 })
  .map((filters) =>
    filters.toSorted(
      (a, b) =>
        INDIVIDUAL_FILTER_ORDER.indexOf(a.kind) -
        INDIVIDUAL_FILTER_ORDER.indexOf(b.kind),
    ),
  );

/** Any filters of the variants on and turned off: at most one of each
    kind in the two lists together, each in the fixed order of the
    project; about half of the filters drawn are off. */
export const variantFiltersOnAndOff: fc.Arbitrary<
  Pick<Project, "filters" | "filtersOff">
> = fc
  .tuple(
    variantFilters,
    fc.array(fc.boolean(), {
      minLength: VARIANT_FILTER_ORDER.length,
      maxLength: VARIANT_FILTER_ORDER.length,
    }),
  )
  .map(([filters, off]) => ({
    filters: filters.filter((_, at) => off[at] !== true),
    filtersOff: filters.filter((_, at) => off[at] === true),
  }));

function isThreshold(filter: IndividualFilter): filter is IndividualThreshold {
  return filter.kind === "missing_data" || filter.kind === "obs_het";
}

/** Any filters of the individuals on and turned off: at most one of each
    kind in the two lists together, each in the fixed order of the
    project; about half of the thresholds drawn are off, and a list of
    individuals is always on, since it has no switch. */
export const individualFiltersOnAndOff: fc.Arbitrary<
  Pick<Project, "individualFilters" | "individualFiltersOff">
> = fc
  .tuple(
    individualFilters,
    fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
  )
  .map(([filters, off]) => ({
    individualFilters: filters.filter(
      (f, at) => !isThreshold(f) || off[at] !== true,
    ),
    individualFiltersOff: filters
      .filter((_, at) => off[at] === true)
      .filter(isThreshold),
  }));

/** Any state of the read of the variants file. */
const sourceRead: fc.Arbitrary<SourceRead> = fc.oneof(
  fc.constant<SourceRead>({ kind: "pending" }),
  fc
    .record({
      ploidy: fc.integer({ min: 1, max: 255 }),
      numVars: fc.option(fc.nat()),
    })
    .map(({ ploidy, numVars }): SourceRead => ({
      kind: "read",
      individuals: ["i1", "i2", "i3", "i4"],
      ploidy,
      numVars,
    })),
  fc.string().map((message): SourceRead => ({
    kind: "failed",
    error: { kind: "popnei", message },
  })),
);

/** Any variants file: a `.nei`, or a VCF with its read options. */
export const variantSource: fc.Arbitrary<VariantSource> = fc
  .record({
    fileId: anyLoadId,
    name: fc.string(),
    size: fc.nat(),
    readOptions: fc.option(
      fc.record(
        {
          ploidy: fc.integer({ min: 1, max: 255 }),
          onlyPassed: fc.boolean(),
        },
        PLAIN,
      ),
    ),
    read: sourceRead,
  })
  .map((source): VariantSource => ({
    ...source,
    format: source.readOptions === null ? "nei" : "vcf",
  }));

/**
 * A project of population genetics with any variants file and any
 * filters of the variants and of the individuals; the rest is that of
 * `sampleProject`. Frozen deeply.
 */
export const projectWithVariants: fc.Arbitrary<Project> = fc
  .record({
    variants: variantSource,
    filters: variantFilters,
    individualFilters,
  })
  .map((parts) => deepFreeze<Project>({ ...sampleProject(), ...parts }));

/**
 * Any definition of an analysis as the keys read it: any id, key version
 * and lists of filters read, and a `keyInputs` that gives a JSON value
 * drawn once.
 */
export const keyedDef: fc.Arbitrary<KeyedDef> = fc
  .record({
    id: fc.string(),
    keyVersion: fc.nat(),
    filtersRead: fc.record({
      variants: fc.boolean(),
      individuals: fc.boolean(),
    }),
    inputs: jsonValue({ withProto: true }),
  })
  .map(({ inputs, ...def }): KeyedDef => ({
    ...def,
    keyInputs: () => inputs,
  }));

/** Any number a project file can hold: finite, and never −0, which JSON
    writes as 0, so that a project reads back equal to itself. */
const fileNumber = fc
  .double({ noNaN: true, noDefaultInfinity: true })
  .filter((n) => !Object.is(n, -0));

/** Whether a JSON value holds a −0 anywhere. */
function hasNegativeZero(value: JsonValue): boolean {
  if (typeof value === "number") {
    return Object.is(value, -0);
  }
  if (value === null || typeof value !== "object") {
    return false;
  }
  const fields: readonly JsonValue[] = Array.isArray(value)
    ? value
    : Object.values(value);
  return fields.some(hasNegativeZero);
}

/** Any options of an analysis a project file can hold. */
const fileOptions: fc.Arbitrary<JsonObject> = jsonObject({
  withProto: true,
}).filter((options) => !hasNegativeZero(options));

/** Any failure of a worker. */
/** Any failure of a worker, one generator per kind, in a table that names
    every kind of RunError, so that a kind added to it fails the compile
    here too. */
const RUN_ERRORS: Readonly<Record<RunError["kind"], fc.Arbitrary<RunError>>> = {
  popnei: fc.string().map((message) => ({ kind: "popnei", message })),
  files: fc.string().map((message) => ({ kind: "files", message })),
  workerFailed: fc
    .string()
    .map((message) => ({ kind: "workerFailed", message })),
  couldNotStart: fc
    .string()
    .map((reason) => ({ kind: "couldNotStart", reason })),
  reopenFailed: fc
    .tuple(fc.string(), fc.string())
    .map(([name, message]) => ({ kind: "reopenFailed", name, message })),
  protocolMismatch: fc.constant({ kind: "protocolMismatch" }),
  defect: fc.string().map((message) => ({ kind: "defect", message })),
};

const runError: fc.Arbitrary<RunError> = fc.oneof(...Object.values(RUN_ERRORS));

/** Any variants file, its read failed by a worker among the reads. */
const anyVariantSource: fc.Arbitrary<VariantSource> = fc
  .tuple(
    variantSource,
    fc.option(
      runError.filter(
        (error): error is Exclude<RunError, { kind: "popnei" }> =>
          error.kind !== "popnei",
      ),
    ),
  )
  .map(([source, error]) =>
    error === null
      ? source
      : {
          ...source,
          read: { kind: "failed", error: { kind: "worker", error } },
        },
  );

/** Any value of a binary column. */
const cellValue = fc.oneof(fc.string(), fileNumber, fc.boolean());

/** Any cell of a table. */
const cell: fc.Arbitrary<Cell> = fc.oneof(fc.constant(null), cellValue);

/** A cell that is a number with either decimal mark: a whole number as
    text, or a number of an xlsx, whose text String writes with a point. */
const numberCell: fc.Arbitrary<Cell> = fc.oneof(
  fc.integer({ min: -1000, max: 1000 }).map(String),
  fc.integer({ min: -1000, max: 1000 }),
);

type TypeKind = "binary" | "continuous" | "categorical";

/** A column of `numRows` cells and a type valid for it; a binary column
    has exactly two distinct values that are not missing. */
function column(
  kind: TypeKind | "identifier",
  numRows: number,
): fc.Arbitrary<{ type: ColumnType; cells: readonly Cell[] }> {
  const cells = (from: fc.Arbitrary<Cell>, length: number) =>
    fc.array(from, { minLength: length, maxLength: length });
  switch (kind) {
    case "identifier":
      // The names of the individuals: texts, none empty, none twice.
      return fc
        .uniqueArray(fc.string({ minLength: 1 }), {
          minLength: numRows,
          maxLength: numRows,
        })
        .map((c) => ({ type: { kind }, cells: c }));
    case "continuous":
      // Numbers with either decimal mark, whole numbers as text or numbers
      // of an xlsx, and one at least, so that the values allow the type.
      return fc
        .tuple(
          numberCell,
          cells(fc.oneof(fc.constant(null), numberCell), numRows - 1),
        )
        .map(([first, rest]) => ({ type: { kind }, cells: [first, ...rest] }));
    case "categorical":
      return cells(cell, numRows).map((c) => ({ type: { kind }, cells: c }));
    case "binary":
      // Two values of different texts, compared as the types compare them.
      return fc
        .tuple(cellValue, cellValue, fc.boolean())
        .filter(([a, b]) => String(a) !== String(b))
        .chain(([a, b, flip]) =>
          cells(fc.constantFrom<Cell>(a, b, null), numRows - 2).map((rest) => ({
            type: flip
              ? { kind, one: String(a), zero: String(b) }
              : { kind, one: String(b), zero: String(a) },
            cells: [a, b, ...rest],
          })),
        );
  }
}

/** Any table read of an individuals file, of two to five rows, with a
    valid type for each of its columns. */
const tableRead: fc.Arbitrary<{
  table: IndividualsTable;
  columns: readonly ColumnType[];
}> = fc
  .record({
    numRows: fc.integer({ min: 2, max: 5 }),
    kinds: fc.array(
      fc.constantFrom<TypeKind>("binary", "continuous", "categorical"),
      { maxLength: 3 },
    ),
  })
  .chain(({ numRows, kinds }) =>
    fc.tuple(
      fc.uniqueArray(fc.string(), {
        minLength: kinds.length + 1,
        maxLength: kinds.length + 1,
      }),
      fc.tuple(
        ...(["identifier", ...kinds] as const).map((kind) =>
          column(kind, numRows),
        ),
      ),
      fc.constant(numRows),
    ),
  )
  .map(([header, cols, numRows]) => ({
    table: {
      columns: header,
      rows: Array.from({ length: numRows }, (_, row) =>
        cols.map((c) => c.cells[row] ?? null),
      ),
    },
    columns: cols.map((c) => c.type),
  }));

const csvFound: fc.Arbitrary<CsvFound> = fc.record(
  {
    encoding: fc.constantFrom("utf-8", "windows-1252", "utf-16"),
    separator: fc.constantFrom(",", ";", "\t"),
    decimal: fc.constantFrom(".", ","),
    undecodedLine: fc.option(fc.integer({ min: 1, max: 100_000 }), {
      nil: null,
    }),
  },
  PLAIN,
);

/** Any separator a read of a CSV used. */
const separator: fc.Arbitrary<CsvFound["separator"]> = fc.constantFrom(
  ",",
  ";",
  "\t",
);

const individualsFileError: fc.Arbitrary<IndividualsFileError> = fc.oneof(
  fc.constant<IndividualsFileError>({ kind: "empty" }),
  fc.string().map((name): IndividualsFileError => ({
    kind: "duplicateColumn",
    name,
  })),
  fc.string().map((name): IndividualsFileError => ({
    kind: "duplicateIndividual",
    name,
  })),
  fc
    .tuple(fc.nat(), fc.nat(), fc.nat(), separator)
    .map(([line, expected, found, sep]): IndividualsFileError => ({
      kind: "raggedRow",
      line,
      expected,
      found,
      separator: sep,
    })),
  fc.string().map((message): IndividualsFileError => ({
    kind: "files",
    message,
  })),
  // A column counted from 1, as the reader gives it and a project file
  // holds it.
  fc
    .integer({ min: 1, max: Number.MAX_SAFE_INTEGER })
    .map((column): IndividualsFileError => ({
      kind: "unnamedColumn",
      column,
    })),
  fc.nat().map((line): IndividualsFileError => ({
    kind: "emptyIndividual",
    line,
  })),
  fc.tuple(fc.nat(), separator).map(([line, sep]): IndividualsFileError => ({
    kind: "unclosedQuote",
    line,
    separator: sep,
  })),
  fc.tuple(fc.nat(), fc.nat()).map(([size, max]): IndividualsFileError => ({
    kind: "tooLarge",
    size,
    max,
  })),
  fc.string().map((message): IndividualsFileError => ({
    kind: "unreadable",
    message,
  })),
  fc.constant<IndividualsFileError>({ kind: "notText" }),
  // A row and a column of the sheet, counted from 1, as a project file
  // holds them.
  fc
    .tuple(
      fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
      fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
      fc.constantFrom("#N/A", "#VALUE!", "#REF!"),
    )
    .map(([row, column, error]): IndividualsFileError => ({
      kind: "headerError",
      row,
      column,
      error,
    })),
);

/** Any read of the individuals file, `notGiven` among them. */
const individualsRead: fc.Arbitrary<IndividualsRead> = fc.oneof(
  fc.constant<IndividualsRead>({ kind: "pending" }),
  fc
    .tuple(tableRead, fc.option(csvFound))
    .map(([{ table, columns }, found]): IndividualsRead => ({
      kind: "read",
      table,
      columns,
      found,
    })),
  individualsFileError.map((error): IndividualsRead => ({
    kind: "failed",
    error,
  })),
  runError
    .filter(
      (error): error is Exclude<RunError, { kind: "files" }> =>
        error.kind !== "files",
    )
    .map((error): IndividualsRead => ({
      kind: "failed",
      error: { kind: "worker", error },
    })),
  fc.constant<IndividualsRead>({ kind: "notGiven" }),
);

/** Any type the user can set on a column, whatever its values: never
    identifier, and a binary type of two different texts. */
const typeSetAnywhere: fc.Arbitrary<ColumnType> = fc.oneof(
  fc.constant<ColumnType>({ kind: "categorical" }),
  fc.constant<ColumnType>({ kind: "continuous" }),
  fc
    .tuple(fc.string(), fc.string())
    .filter(([one, zero]) => one !== zero)
    .map(([one, zero]): ColumnType => ({ kind: "binary", one, zero })),
);

/**
 * Any `typesSet` of a source whose read is `read`, in any order: for a
 * table read, pairs the read applies, which are the types of their
 * columns, and pairs it does not, a column gone, the first column, and
 * continuous on a column whose values are not all numbers; for a read not
 * done, any pairs.
 */
function typesSetOf(read: IndividualsRead): fc.Arbitrary<ColumnTypeOf[]> {
  const gone = (header: readonly string[]) =>
    fc.uniqueArray(
      fc.tuple(
        fc.string().filter((name) => !header.includes(name)),
        typeSetAnywhere,
      ),
      { selector: ([column]) => column, maxLength: 2 },
    );
  if (read.kind !== "read") {
    return gone([]).chain((pairs) => fc.shuffledSubarray(pairs));
  }
  const header = read.table.columns;
  const allows = columnAllows(read);
  const perColumn = header.map((column, index) => {
    const type = read.columns[index];
    const allowed = allows[index];
    if (type === undefined || allowed === undefined) {
      throw new Error("popnei_web defect: a column with no type drawn.");
    }
    const options: ColumnTypeOf[] =
      index === 0
        ? [[column, { kind: "categorical" }]]
        : [
            [column, type],
            ...(allowed.continuous
              ? []
              : [[column, { kind: "continuous" }] as const]),
          ];
    return fc.option(fc.constantFrom(...options), { nil: null });
  });
  return fc
    .tuple(fc.tuple(...perColumn), gone(header))
    .map(([columns, lost]) => [
      ...columns.filter((pair): pair is ColumnTypeOf => pair !== null),
      ...lost,
    ])
    .chain((pairs) =>
      fc.shuffledSubarray(pairs, {
        minLength: pairs.length,
        maxLength: pairs.length,
      }),
    );
}

/** Any individuals file, with the types the user set, applied by its read
    and not. */
const individualsSource: fc.Arbitrary<IndividualsSource> = fc
  .record(
    {
      fileId: anyLoadId,
      name: fc.string(),
      csv: fc.option(csvOptions),
      read: individualsRead,
    },
    PLAIN,
  )
  // An xlsx, whose csv is null, has nothing found of the options of a CSV.
  .map((source) =>
    source.csv === null && source.read.kind === "read"
      ? { ...source, read: { ...source.read, found: null } }
      : source,
  )
  .chain((source) =>
    typesSetOf(source.read).map((typesSet): IndividualsSource => ({
      fileId: source.fileId,
      name: source.name,
      csv: source.csv,
      typesSet,
      read: source.read,
    })),
  );

/** The analyses the generator of whole projects draws from, with a check
    of their options that takes any JSON object. */
export const TEST_ANALYSES: readonly ParsedAnalysis[] = [
  "diversity",
  "pca",
  "gwas_lm",
].map((id) => ({ id, parseOptions: jsonObjectOf }));

/** The request of an analysis of `TEST_DEFS`: its id alone. */
export interface TestDefJob {
  /** The analysis the request is of. */
  readonly analysis: AnalysisId;
}

/** A result of an analysis of `TEST_DEFS`: the check numbers the test
    chooses. */
export interface TestDefResult {
  /** The analysis the result is of. */
  readonly analysis: AnalysisId;
  /** What its `checkNumbers` gives. */
  readonly numbers: readonly (number | null)[];
}

/**
 * The analyses of `TEST_ANALYSES` as whole definitions, for the tests of
 * the project file and of the shell: each of key version 1, reading both
 * lists of filters, with a `keyInputs` that gives its options and the
 * grouping, no reason of its own not to run, no warning, a
 * `checkNumbers` that gives the numbers of its result, and a
 * `numCheckNumbers` that gives `null`, so that the project file checks
 * the count of the numbers only in the tests of the count. `diversity` and
 * `pca` are of population genetics, `gwas_lm` of association.
 */
export const TEST_DEFS: readonly AnalysisDef<TestDefJob, TestDefResult>[] =
  TEST_ANALYSES.map((analysis): AnalysisDef<TestDefJob, TestDefResult> => ({
    id: analysis.id,
    app: analysis.id === "gwas_lm" ? ["gwas"] : ["popgen"],
    defaults: {},
    keyVersion: 1,
    filtersRead: { variants: true, individuals: true },
    parseOptions: (options, formatVersion) =>
      analysis.parseOptions(options, formatVersion),
    keyInputs: (p) => ({
      options: analysisOptions(p, analysis.id, {}),
      grouping: p.grouping,
    }),
    needs: () => null,
    run: (_p, c) => c.run({ analysis: analysis.id }),
    warnings: () => [],
    checkNumbers: (r) => {
      if (r.analysis !== analysis.id) {
        throw new Error(
          `popnei_web defect: a result of ${r.analysis} given to ${analysis.id}.`,
        );
      }
      return r.numbers;
    },
    numCheckNumbers: () => null,
    script: () => "",
  }));

/** The analysis of TEST_ANALYSES of the id `id`. */
export function testAnalysis(id: string): ParsedAnalysis {
  const found = TEST_ANALYSES.find((a) => a.id === id);
  if (found === undefined) {
    throw new Error(`popnei_web defect: no test analysis ${id}.`);
  }
  return found;
}

/** The JSON object `value` is, rebuilt, or what it should be. */
export function jsonObjectOf(value: unknown): Result<JsonObject, string> {
  const json = jsonValueOf(value);
  return json !== undefined &&
    json !== null &&
    typeof json === "object" &&
    !Array.isArray(json)
    ? { ok: true, value: jsonObjectFrom(json) }
    : { ok: false, error: "in the form the application writes" };
}

function jsonObjectFrom(value: JsonObject | readonly JsonValue[]): JsonObject {
  return Object.fromEntries(Object.entries(value));
}

function jsonValueOf(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "object") {
    return undefined;
  }
  const entries: [string, JsonValue][] = [];
  for (const name of Object.keys(value)) {
    const field = jsonValueOf(Reflect.get(value, name));
    if (field === undefined) {
      return undefined;
    }
    entries.push([name, field]);
  }
  if (Array.isArray(value)) {
    return entries.map(([, field]) => field);
  }
  return Object.fromEntries(entries);
}

const role = fc.constantFrom("trait", "covariate", "ignored");

/**
 * Any valid project of either application: every part drawn, the reads
 * of both files in each of their states, `notGiven` among those of the
 * individuals file, tables whose rows are as long as their header and
 * whose binary columns have two values, the types the user set, applied
 * by the read and not, the grouping `onePopulation` in population
 * genetics, the options of the analyses of `TEST_ANALYSES`, a reference
 * with its checks, and filters turned off, with their values. Frozen
 * deeply. Every number is one JSON writes back as itself.
 */
export const wholeProject: fc.Arbitrary<Project> = fc
  .constantFrom<AppId>("popgen", "gwas")
  .chain((app) =>
    fc.record(
      {
        app: fc.constant(app),
        variants: fc.option(anyVariantSource),
        variantLists: variantFiltersOnAndOff,
        individualLists: individualFiltersOnAndOff,
        individuals: fc.option(individualsSource),
        grouping:
          app === "popgen"
            ? fc.oneof(
                fc
                  .option(fc.string())
                  .map((column): Grouping => ({ kind: "populations", column })),
                fc.constant<Grouping>({ kind: "onePopulation" }),
              )
            : fc
                .uniqueArray(fc.tuple(fc.string(), role), {
                  selector: ([column]) => column,
                })
                .map((roles): Grouping => ({ kind: "roles", roles })),
        analyses: fc.uniqueArray(
          fc.record(
            {
              analysis: fc.constantFrom(...TEST_ANALYSES.map((a) => a.id)),
              options: fileOptions,
            },
            PLAIN,
          ),
          { selector: (entry) => entry.analysis },
        ),
        reference: fc.option(
          fc.record(
            {
              variants: anyVariantSource,
              checks: fc.uniqueArray(
                fc.record(
                  {
                    analysis: fc.constantFrom(
                      ...TEST_ANALYSES.map((a) => a.id),
                    ),
                    numbers: fc.array(fc.option(fileNumber)),
                    keyVersion: fc.nat(),
                    popneiVersion: fc.string(),
                    appVersion: fc.string(),
                    settings: fc.stringMatching(/^[0-9a-f]{64}$/),
                  },
                  PLAIN,
                ),
                { selector: (check) => check.analysis },
              ),
            },
            PLAIN,
          ),
        ),
      },
      PLAIN,
    ),
  )
  .map(({ variantLists, individualLists, ...rest }) =>
    deepFreeze<Project>({
      ...rest,
      filters: variantLists.filters,
      filtersOff: variantLists.filtersOff,
      individualFilters: individualLists.individualFilters,
      individualFiltersOff: individualLists.individualFiltersOff,
    }),
  );

/** A number from `min` to 1 that is not −0, which JSON writes back as
    0. */
const share = (min: number): fc.Arbitrary<number> =>
  fc
    .double({ min, max: 1, noNaN: true })
    .filter((value) => !Object.is(value, -0));

/** The largest minimum of individuals and draw of chromosomes popnei
    takes, 2^32 − 1. */
const WHOLE_UP_TO_2_32 = 4_294_967_295;

/**
 * Any options of the three analyses of the populations, each drawn among
 * the values its `parseOptions` takes: the diversity's minimum of
 * individuals, its threshold of a polymorphic variant and its draw,
 * `null` or 2 or more (`docs/specs/analyses/diversity.md`); the
 * distances' minimum and measure (`popDists.md`); and the LD decay's
 * largest distance, `null` or 50 or more, and its largest major allele
 * frequency, from 0.5 to 1 (`ldDecay.md`).
 */
const populationAnalysesOptions: fc.Arbitrary<AnalysisOptions> = fc.oneof(
  fc.record(
    {
      analysis: fc.constant("diversity"),
      options: fc.record(
        {
          minNumIndividuals: fc.integer({ min: 0, max: WHOLE_UP_TO_2_32 }),
          polyThreshold: share(0),
          numCalledAlleles: fc.option(
            fc.integer({ min: 2, max: WHOLE_UP_TO_2_32 }),
            { nil: null },
          ),
        },
        PLAIN,
      ),
    },
    PLAIN,
  ),
  fc.record(
    {
      analysis: fc.constant("popDists"),
      options: fc.record(
        {
          minNumIndividuals: fc.integer({ min: 0, max: WHOLE_UP_TO_2_32 }),
          measure: fc.constantFrom("fst", "dest"),
        },
        PLAIN,
      ),
    },
    PLAIN,
  ),
  fc.record(
    {
      analysis: fc.constant("ldDecay"),
      options: fc.record(
        {
          maxDist: fc.option(
            fc.integer({ min: 50, max: Number.MAX_SAFE_INTEGER }),
            { nil: null },
          ),
          maxAllowedMaf: share(0.5),
        },
        PLAIN,
      ),
    },
    PLAIN,
  ),
);

/** The ids of the three analyses of the populations, which the checks of
    the reference of `populationsProject` take in turn in place of those of
    `TEST_ANALYSES`, of which the reference holds at most one each. */
const POPULATION_ANALYSES = ["diversity", "popDists", "ldDecay"] as const;

/**
 * Any valid project of population genetics, as `wholeProject` draws it,
 * whose options are those of the diversity, the distances between
 * populations and the LD decay, each analysis at most once, in any order,
 * and whose reference's checks are of those three. Their definitions read
 * them, where `wholeProject` holds options of any shape for the analyses
 * of `TEST_ANALYSES`. Frozen deeply.
 */
export const populationsProject: fc.Arbitrary<Project> = fc
  .tuple(
    wholeProject.filter((p) => p.app === "popgen"),
    fc.uniqueArray(populationAnalysesOptions, {
      selector: (entry) => entry.analysis,
    }),
  )
  .map(([p, analyses]) =>
    deepFreeze<Project>({
      ...p,
      analyses,
      reference:
        p.reference === null
          ? null
          : {
              ...p.reference,
              checks: p.reference.checks.map((check, index) => ({
                ...check,
                analysis: POPULATION_ANALYSES[index] ?? "diversity",
              })),
            },
    }),
  );

// The fakes of the store spec's "How it is verified": a `send` whose
// requests the test ends by hand, and two analyses, one that needs the
// individuals file and uses the populations, and one that needs only the
// variants file. Their results differ in shape, so that a result given
// to the other analysis's functions shows. From stage 3, two more: the
// statistics of each individual, reading no filter since 28 September
// 2026, and the counts of the filters, reading the filters of
// individuals and of the variants.

/** A request of the fake analyses. */
export interface TestJob {
  readonly analysis: "pops" | "vars" | "stats" | "counts";
  /** The key of an intermediate result, made by the client. */
  readonly pruned: string;
}

/** The result of the analysis of the populations. */
export interface PopsResult {
  readonly kind: "pops";
  readonly fst: Float64Array;
}

/** The result of the analysis of the variants. */
export interface VarsResult {
  readonly kind: "vars";
  /** The number of variants the pass counted, or `null`. */
  readonly numVars: number | null;
  readonly values: Float64Array;
}

/** The result of the fake statistics of each individual. */
export interface StatsResult {
  readonly kind: "stats";
  /** The statistics, which `statistics.of` of the store finds. */
  readonly stats: IndividualStats;
}

/** The result of the fake counts of the filters. */
export interface CountsResult {
  readonly kind: "counts";
  /** The variants the filters kept. */
  readonly numVars: number;
  /** What each filter kept, which gives the result a size in the cache,
      4 bytes a filter. */
  readonly kept: Uint32Array;
}

/** A result of any of the fake analyses. */
export type TestResult = PopsResult | VarsResult | StatsResult | CountsResult;

/** A request the fake `send` was given, which the test ends by hand. */
export interface SentRequest {
  readonly run: Run<TestResult>;
  readonly key: string;
  readonly job: TestJob;
  /** Passes a progress to the store, as the worker client would. */
  readonly progress: (p: Progress) => void;
  /** Passes a result so far to the store, as the worker client would. */
  readonly soFar: (r: TestResult) => void;
  /** Resolves the request's outcome. */
  readonly end: (outcome: Outcome<TestResult>) => void;
  /** How many times its `cancel()` was called. */
  readonly cancels: () => number;
}

/** A write the fake `write.send` was given, which the test ends by
    hand; its file is a text. */
export interface SentWrite {
  readonly run: Run<Written<string>>;
  readonly key: string;
  readonly job: WriteJob;
  /** Passes a progress to the store, as the worker client would. */
  readonly progress: (p: Progress) => void;
  /** Resolves the write's outcome. */
  readonly end: (outcome: Outcome<Written<string>>) => void;
  /** How many times its `cancel()` was called. */
  readonly cancels: () => number;
}

/** A fake `send`, and the requests it was given, in order; and a fake
    `write.send` whose file is a text, with the writes it was given. The
    two count their ids together, as the worker client does. */
export function fakeSend(): {
  readonly send: (
    key: string,
    job: TestJob,
    onProgress: (p: Progress) => void,
    onSoFar?: (r: TestResult) => void,
  ) => Run<TestResult>;
  readonly sent: SentRequest[];
  /** What was sent and cancelled, in order: "send 2", "cancel 1",
      "write 3". */
  readonly log: string[];
  readonly writeSend: (
    key: string,
    job: WriteJob,
    onProgress: (p: Progress) => void,
  ) => Run<Written<string>>;
  readonly writes: SentWrite[];
} {
  const sent: SentRequest[] = [];
  const writes: SentWrite[] = [];
  const log: string[] = [];
  let lastId = 0;
  const send = (
    key: string,
    job: TestJob,
    onProgress: (p: Progress) => void,
    onSoFar: (r: TestResult) => void = () => undefined,
  ): Run<TestResult> => {
    let end: (outcome: Outcome<TestResult>) => void = () => undefined;
    const outcome = new Promise<Outcome<TestResult>>((resolve) => {
      end = resolve;
    });
    let cancels = 0;
    lastId += 1;
    const id = lastId;
    log.push(`send ${String(id)}`);
    const run: Run<TestResult> = {
      id,
      outcome,
      cancel: () => {
        cancels += 1;
        log.push(`cancel ${String(id)}`);
      },
    };
    sent.push({
      run,
      key,
      job,
      progress: onProgress,
      soFar: onSoFar,
      end,
      cancels: () => cancels,
    });
    return run;
  };
  const writeSend = (
    key: string,
    job: WriteJob,
    onProgress: (p: Progress) => void,
  ): Run<Written<string>> => {
    let end: (outcome: Outcome<Written<string>>) => void = () => undefined;
    const outcome = new Promise<Outcome<Written<string>>>((resolve) => {
      end = resolve;
    });
    let cancels = 0;
    lastId += 1;
    const id = lastId;
    log.push(`write ${String(id)}`);
    const run: Run<Written<string>> = {
      id,
      outcome,
      cancel: () => {
        cancels += 1;
        log.push(`cancel ${String(id)}`);
      },
    };
    writes.push({
      run,
      key,
      job,
      progress: onProgress,
      end,
      cancels: () => cancels,
    });
    return run;
  };
  return { send, sent, log, writeSend, writes };
}

/** A file written by the fake `write.send`, a text, of `numVars`
    variants kept of `numVarsRead` by the missing data filter, 100 bytes a
    variant. */
export function writtenFile(
  numVars: number,
  numVarsRead: number,
): Written<string> {
  const passStats: PassStats = {
    numVars,
    filtering: {
      missing_data: { varsProcessed: numVarsRead, varsKept: numVars },
    },
  };
  return {
    format: "nei",
    file: `the .nei file of ${String(numVars)} variants`,
    numBytes: 100 * numVars + 20,
    passStats,
  };
}

/** The result of the fake counts made of the counts of the pass of a
    written file, the store's `write.countsOf` in the tests: the variants
    kept, and what the first filter was given, which `writeTestCountsOf`
    gives back as the variants of the file. */
export function fakeWriteCountsOf(pass: PassStats): CountsResult {
  const first = Object.values(pass.filtering)[0];
  return {
    kind: "counts",
    numVars: pass.numVars,
    kept: Uint32Array.of(first?.varsProcessed ?? pass.numVars),
  };
}

/** `fakeCountsOf`, but for a result of the fake counts made of a written
    file, whose variants of the file are the first number it kept. */
export function writeTestCountsOf(r: TestResult): PassFound<TestResult> {
  return r.kind === "counts"
    ? { numVarsRead: r.kept[0] ?? null, counts: r }
    : fakeCountsOf(r);
}

/** How many times the fake analyses were asked for their keys and their
    reasons. */
export interface Calls {
  /** The calls of the `keyInputs` of the analysis of the populations. */
  pops: number;
  /** The calls of the `keyInputs` of the analysis of the variants. */
  vars: number;
  /** The calls of the `needs` of the analysis of the populations. */
  needs: number;
  /** What each `warnings` and `checkNumbers` was given, in order:
      "pops warnings of vars" when the populations were given a result of
      the variants. */
  readonly given: string[];
}

/** The list of the individuals kept that the client of a request gave
    its fake analysis. */
export interface ListGiven {
  readonly analysis: TestJob["analysis"];
  readonly individuals: readonly string[] | null;
}

/** The intermediate result both fake analyses ask the client for. */
export const PRUNED: readonly [string, JsonValue] = ["pruned", { maxR2: 0.5 }];

/** The warning of the analysis of the variants when its request's
    project filters by MAF. */
export const MAF_WARNING = {
  code: "mafFiltered",
  text: "Rare variants were removed.",
};

/** The reason of the analysis of the populations when no column of the
    individuals file defines them. */
export const NO_POPULATIONS =
  "Choose the column of the populations in the Individuals step.";

/** The reason of the analysis of the populations with no individuals
    file and a column: the fake keeps the lock of stage 2, which the
    diversity dropped in stage 4, so that the tests of the store still
    have an analysis locked by the individuals file. With the grouping
    `onePopulation` it runs without the file, as the diversity does. */
export const NO_METADATA_FILE = "Load a metadata file in the Individuals step.";

/** The two fake analyses, the populations first, and the count of the
    calls of their `keyInputs`; and, apart from them, the fakes of stage
    3, the statistics of each individual, `stats`, which read no filter,
    and the counts of the filters, `counts`, which read the filters of the
    variants and those of individuals, as in the order of 28 September
    2026 (docs/specs/core/store.md, "The individuals kept"). */
export function fakeAnalyses(): {
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly calls: Calls;
  /** The list each client gave, in the order of the requests. */
  readonly lists: ListGiven[];
  readonly stats: AnalysisDef<TestJob, TestResult>;
  readonly counts: AnalysisDef<TestJob, TestResult>;
} {
  const calls: Calls = { pops: 0, vars: 0, needs: 0, given: [] };
  const lists: ListGiven[] = [];
  /** Sends the job of `analysis` through `c`, noting the list of the
      individuals kept the client gave. */
  const sendThrough = (
    analysis: TestJob["analysis"],
    c: WorkerClient<TestJob, TestResult>,
  ): Run<TestResult> => {
    lists.push({ analysis, individuals: c.individuals });
    return c.run({ analysis, pruned: c.intermediateKey(...PRUNED) });
  };
  const pops: AnalysisDef<TestJob, TestResult> = {
    id: "pops",
    app: ["popgen"],
    defaults: {},
    keyVersion: 1,
    filtersRead: { variants: true, individuals: true },
    parseOptions: (options) => jsonObjectOf(options),
    keyInputs: (p) => {
      calls.pops += 1;
      if (p.grouping.kind === "onePopulation") {
        // Every individual in one population, whatever the table, as the
        // key of the diversity holds it ("all").
        return { populations: "all", table: null };
      }
      const read = p.individuals?.read;
      return {
        populations:
          p.grouping.kind === "populations" ? p.grouping.column : null,
        table:
          read?.kind === "read"
            ? { columns: read.table.columns, rows: read.table.rows }
            : null,
      };
    },
    needs: (p) => {
      calls.needs += 1;
      if (p.grouping.kind === "onePopulation") {
        return individualsNeeds(p);
      }
      return (
        individualsNeeds(p) ??
        (p.individuals === null ? NO_METADATA_FILE : null) ??
        (p.grouping.kind === "populations" && p.grouping.column === null
          ? NO_POPULATIONS
          : null)
      );
    },
    run: (_p, c) => sendThrough("pops", c),
    warnings: (r) => {
      calls.given.push(`pops warnings of ${r.kind}`);
      return [];
    },
    checkNumbers: (r) => {
      calls.given.push(`pops checkNumbers of ${r.kind}`);
      return r.kind === "pops" ? [...r.fst] : [];
    },
    numCheckNumbers: () => null,
    script: () => "",
  };
  const vars: AnalysisDef<TestJob, TestResult> = {
    id: "vars",
    app: ["popgen"],
    defaults: { minMaf: 0 },
    keyVersion: 1,
    filtersRead: { variants: true, individuals: false },
    parseOptions: (options) => jsonObjectOf(options),
    keyInputs: (p) => {
      calls.vars += 1;
      return analysisOptions(p, "vars", { minMaf: 0 });
    },
    needs: () => null,
    run: (_p, c) => sendThrough("vars", c),
    warnings: (r, p) => {
      calls.given.push(`vars warnings of ${r.kind}`);
      return p.filters.some((filter) => filter.kind === "maf")
        ? [MAF_WARNING]
        : [];
    },
    checkNumbers: (r) => {
      calls.given.push(`vars checkNumbers of ${r.kind}`);
      return r.kind === "vars"
        ? [...r.values].map((value) => (Number.isNaN(value) ? null : value))
        : [];
    },
    numCheckNumbers: () => null,
    script: () => "",
  };
  /** A fake of stage 3 of the id `id`, reading the filters `filtersRead`,
      whose check numbers are those `numbers` gives of a result of its own
      shape. */
  const ofStage3 = (
    id: "stats" | "counts",
    filtersRead: AnalysisDef<TestJob, TestResult>["filtersRead"],
    numbers: (r: TestResult) => readonly (number | null)[],
  ): AnalysisDef<TestJob, TestResult> => ({
    id,
    app: ["popgen"],
    defaults: {},
    keyVersion: 1,
    filtersRead,
    parseOptions: (options) => jsonObjectOf(options),
    keyInputs: () => null,
    needs: () => null,
    run: (_p, c) => sendThrough(id, c),
    warnings: (r) => {
      calls.given.push(`${id} warnings of ${r.kind}`);
      return [];
    },
    checkNumbers: (r) => {
      calls.given.push(`${id} checkNumbers of ${r.kind}`);
      return numbers(r);
    },
    numCheckNumbers: () => null,
    script: () => "",
  });
  const stats = ofStage3(
    "stats",
    { variants: false, individuals: false },
    (r) => (r.kind === "stats" ? [...r.stats.missingGtRate] : []),
  );
  const counts: AnalysisDef<TestJob, TestResult> = {
    ...ofStage3("counts", { variants: true, individuals: true }, (r) =>
      r.kind === "counts" ? [r.numVars] : [],
    ),
    // As the warnings of filterCounts.ts read the rows of the project's
    // filters: the first filter of `p` that kept none of its variants,
    // and a defect when the result has no count for a filter of `p`.
    warnings: (r, p) => {
      calls.given.push(`counts warnings of ${r.kind}`);
      if (r.kind !== "counts") {
        return [];
      }
      const index = p.filters.findIndex((filter, at) => {
        const kept = r.kept[at];
        if (kept === undefined) {
          throw new Error(
            `popnei_web defect: the fake counts have no count of ${filter.kind}.`,
          );
        }
        return kept === 0;
      });
      const filter = p.filters[index];
      return filter === undefined
        ? []
        : [{ code: "filterKeptNone", text: `${filter.kind} kept none.` }];
    },
  };
  return { analyses: [pops, vars], calls, lists, stats, counts };
}

/** How the store finds the statistics of each individual in a result of
    the fake `stats`, its `statistics` of `createStore`; a defect for
    another result. */
export const FAKE_STATISTICS: {
  readonly analysis: AnalysisId;
  of(r: TestResult): IndividualStats;
} = {
  analysis: "stats",
  of: (r) => {
    if (r.kind !== "stats") {
      throw new Error(
        `popnei_web defect: the statistics asked of a result of ${r.kind}.`,
      );
    }
    return r.stats;
  },
};

/** The filters of a result of the fake counts that `fakeCountsOf`
    makes, 100, so that the result is 400 bytes in the cache. */
export const FAKE_COUNTS_FILTERS = 100;

/**
 * What the pass of a result of the fake analyses counted, the store's
 * `countsOf` of the tests of the counts: of a result of the analysis of
 * the variants, its `numVars` as the variants of the file, and the counts
 * of the filters, a result of the fake `counts` of those variants; of a
 * result of the fake counts, itself; of a result of the fake statistics,
 * whose pass has no filter since 28 September 2026, and of the analysis
 * of the populations, as of the PCA, whose filters can be its own,
 * nothing.
 */
export function fakeCountsOf(r: TestResult): PassFound<TestResult> {
  const madeOf = (numVars: number): CountsResult => ({
    kind: "counts",
    numVars,
    kept: new Uint32Array(FAKE_COUNTS_FILTERS).fill(numVars),
  });
  switch (r.kind) {
    case "vars":
      return {
        numVarsRead: r.numVars,
        counts: r.numVars === null ? null : madeOf(r.numVars),
      };
    case "counts":
      return { numVarsRead: null, counts: r };
    case "stats":
    case "pops":
      return { numVarsRead: null, counts: null };
  }
}

/** A result of the fake statistics of each individual, of the
    individuals `individuals` and their numbers. */
export function statsResult(
  individuals: readonly string[],
  missingGtRate: readonly number[],
  obsHetRate: readonly number[],
): StatsResult {
  return {
    kind: "stats",
    stats: {
      individuals,
      missingGtRate: Float64Array.from(missingGtRate),
      obsHetRate: Float64Array.from(obsHetRate),
    },
  };
}

/** The individuals of the worked case of docs/specs/core/individualsKept.md,
    "How it is verified", in the order of their variants file. */
export const FIVE_INDIVIDUALS: readonly string[] = ["a", "b", "c", "d", "e"];

/** The statistics of the worked case: `e` calls no genotype. */
export function fiveStats(): StatsResult {
  return statsResult(
    FIVE_INDIVIDUALS,
    [0.2, 0.1, 0.3, 0.05, 1],
    [0.3, 0.5, 0.2, 0.4, Number.NaN],
  );
}

/**
 * A project of population genetics, frozen deeply, on the five
 * individuals of the worked case: a `.nei` file read, `panel.nei`, with
 * no filter of the variants and the filters of individuals
 * `individualFilters`; a CSV of individuals read, `pops.csv`, putting
 * `a`, `b` and `c` in P1 and `d` and `e` in P2; and the populations
 * grouped by `pop`, so that the fake analysis of the populations can run.
 */
export function fiveIndividualsProject(
  individualFilters: readonly IndividualFilter[],
): Project {
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: SAMPLE_VARIANTS_ID,
      name: "panel.nei",
      size: 1024,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: FIVE_INDIVIDUALS,
        ploidy: 2,
        numVars: null,
      },
    },
    filters: [],
    filtersOff: [],
    individualFilters,
    individualFiltersOff: [],
    individuals: {
      fileId: SAMPLE_INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table: {
          columns: ["id", "pop"],
          rows: FIVE_INDIVIDUALS.map((name, index) => [
            name,
            index < 3 ? "P1" : "P2",
          ]),
        },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
    grouping: { kind: "populations", column: "pop" },
    analyses: [],
    reference: null,
  });
}

/**
 * A result of the summary of the variants file, of `numVarsPerChrom`
 * variants on each chromosome of `chroms`, for the tests that do not read
 * its statistics: the histograms of the variants in 2 bins over 0 to 1,
 * every variant in the first, and the statistics of `individuals`, each
 * with no missing genotype and a heterozygosity of 0.25.
 */
export function summaryResult(
  chroms: readonly string[],
  numVarsPerChrom: readonly number[],
  individuals: readonly string[] = ["s000", "s001"],
): VariantsSummaryResult {
  const numVars = numVarsPerChrom.reduce((sum, count) => sum + count, 0);
  const passStats = { numVars, filtering: {} };
  const distrib = (): VariantDistrib => ({
    mean: 0.25,
    counts: Uint32Array.of(numVars, 0),
  });
  return {
    analysis: "variantsSummary",
    chroms,
    numVarsPerChrom: Uint32Array.from(numVarsPerChrom),
    perVar: {
      binEdges: Float64Array.of(0, 0.5, 1),
      missingRate: distrib(),
      maf: distrib(),
      obsHet: distrib(),
      unbiasedExpHet: distrib(),
      passStats,
    },
    perIndividual: {
      individuals,
      missingGtRate: new Float64Array(individuals.length),
      obsHetRate: new Float64Array(individuals.length).fill(0.25),
      passStats,
    },
    passStats,
  };
}
