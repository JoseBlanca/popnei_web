/**
 * What the tests of core share: the generators of fast-check, which draw
 * random values for the property tests, a project written by hand, and
 * the deep freeze. Imported by tests alone.
 */

import * as fc from "fast-check";
import type { JsonObject, JsonValue, KeyedDef } from "./keys.ts";
import {
  INDIVIDUAL_FILTER_ORDER,
  loadIndividuals,
  loadVariants,
  moveVariantFilter,
  removeIndividualFilter,
  removeIndividuals,
  removeVariantFilter,
  setAnalysisOptions,
  setColumnType,
  setCsvOptions,
  setGrouping,
  setIndividualFilter,
  setVariantFilter,
} from "./project.ts";
import type {
  AppId,
  Grouping,
  VariantLoad,
  IndividualsRead,
  IndividualsSource,
  ParsedAnalysis,
  Project,
  SourceRead,
  VariantSource,
} from "./project.ts";
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
      { kind: "maf", maxAllowedMaf: 0.95 },
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ],
    individualFilters: [
      { kind: "remove", individuals: ["i4"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
    ],
    individuals: {
      fileId: SAMPLE_INDIVIDUALS_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
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
        found: { encoding: "utf-8", separator: ",", decimal: "." },
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

const variantFilter: fc.Arbitrary<VariantFilter> = fc.oneof(
  threshold.map((t): VariantFilter => ({
    kind: "missing_data",
    maxAllowedMissingRate: t,
  })),
  threshold.map((t): VariantFilter => ({ kind: "maf", maxAllowedMaf: t })),
  threshold.map((t): VariantFilter => ({
    kind: "obs_het",
    maxAllowedObsHet: t,
  })),
  fc
    .tuple(threshold, fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }))
    .map(([r2, dist]): VariantFilter => ({
      kind: "ld",
      maxAllowedR2: r2,
      maxDist: dist,
    })),
);

const variantFilterKind = fc.constantFrom<VariantFilterKind>(
  "missing_data",
  "maf",
  "obs_het",
  "ld",
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

const individualFilterKind = fc.constantFrom<IndividualFilterKind>(
  "keep",
  "remove",
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
 * Any of the twelve commands of the project spec, with arguments valid on
 * the project it is bound to, starting from `sampleProject`, a project of
 * population genetics.
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
    command("removeVariantFilter", () => (p) => removeVariantFilter(p, kind)),
  ),
  fc.tuple(seed, seed).map(([which, to]) =>
    command("moveVariantFilter", (p) => {
      const filter = p.filters[which % Math.max(p.filters.length, 1)];
      if (filter === undefined) {
        return null;
      }
      const position = to % p.filters.length;
      return (q) => moveVariantFilter(q, filter.kind, position);
    }),
  ),
  individualFilter.map((filter) =>
    command("setIndividualFilter", () => (p) => setIndividualFilter(p, filter)),
  ),
  individualFilterKind.map((kind) =>
    command(
      "removeIndividualFilter",
      () => (p) => removeIndividualFilter(p, kind),
    ),
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
      const type = columnTypeFor(
        index,
        read.table.rows.map((row) => row[index] ?? null),
        kind,
        flip,
      );
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

/** A type valid for a column: `identifier` for the first, and for another
    continuous, categorical, or binary when it has two values. */
function columnTypeFor(
  index: number,
  cells: readonly (string | number | boolean | null)[],
  kind: number,
  flip: boolean,
): ColumnType {
  if (index === 0) {
    return { kind: "identifier" };
  }
  const values: (string | number | boolean)[] = [];
  for (const cell of cells) {
    if (cell !== null && !values.includes(cell)) {
      values.push(cell);
    }
  }
  const [first, second] = values;
  switch (kind % 3) {
    case 0:
      return { kind: "continuous" };
    case 1:
      return { kind: "categorical" };
    default:
      if (values.length !== 2 || first === undefined || second === undefined) {
        return { kind: "categorical" };
      }
      return flip
        ? { kind: "binary", one: first, zero: second }
        : { kind: "binary", one: second, zero: first };
  }
}

/** Any load id: 32 lower case hexadecimal digits. */
export const anyLoadId: fc.Arbitrary<string> =
  fc.stringMatching(/^[0-9a-f]{32}$/);

/** Any list of filters of the variants, at most one of each kind, in any
    order. */
export const variantFilters: fc.Arbitrary<readonly VariantFilter[]> =
  fc.uniqueArray(variantFilter, { selector: (f) => f.kind, maxLength: 4 });

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
    case "categorical":
      return cells(cell, numRows).map((c) => ({ type: { kind }, cells: c }));
    case "binary":
      return fc
        .tuple(cellValue, cellValue, fc.boolean())
        .filter(([a, b]) => a !== b)
        .chain(([a, b, flip]) =>
          cells(fc.constantFrom<Cell>(a, b, null), numRows - 2).map((rest) => ({
            type: flip ? { kind, one: a, zero: b } : { kind, one: b, zero: a },
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
    encoding: fc.constantFrom("utf-8", "windows-1252"),
    separator: fc.constantFrom(",", ";", "\t"),
    decimal: fc.constantFrom(".", ","),
  },
  PLAIN,
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
    .tuple(fc.nat(), fc.nat(), fc.nat())
    .map(([line, expected, found]): IndividualsFileError => ({
      kind: "raggedRow",
      line,
      expected,
      found,
    })),
  fc.string().map((message): IndividualsFileError => ({
    kind: "files",
    message,
  })),
);

/** Any read of the individuals file. */
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
);

/** Any individuals file. */
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
  );

/** The analyses the generator of whole projects draws from, with a check
    of their options that takes any JSON object. */
export const TEST_ANALYSES: readonly ParsedAnalysis[] = [
  "diversity",
  "pca",
  "gwas_lm",
].map((id) => ({ id, parseOptions: jsonObjectOf }));

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
 * of both files in each of their states, tables whose rows are as long as
 * their header and whose binary columns have two values, the options of
 * the analyses of `TEST_ANALYSES`, and a reference with its checks. Frozen
 * deeply. Every number is one JSON writes back as itself.
 */
export const wholeProject: fc.Arbitrary<Project> = fc
  .constantFrom<AppId>("popgen", "gwas")
  .chain((app) =>
    fc.record(
      {
        app: fc.constant(app),
        variants: fc.option(anyVariantSource),
        filters: variantFilters,
        individualFilters,
        individuals: fc.option(individualsSource),
        grouping:
          app === "popgen"
            ? fc
                .option(fc.string())
                .map((column): Grouping => ({ kind: "populations", column }))
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
              popneiVersion: fc.string(),
              appVersion: fc.string(),
              checks: fc.uniqueArray(
                fc.record(
                  {
                    analysis: fc.constantFrom(
                      ...TEST_ANALYSES.map((a) => a.id),
                    ),
                    numbers: fc.array(fc.option(fileNumber)),
                    keyVersion: fc.nat(),
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
  .map((p) => deepFreeze<Project>(p));
