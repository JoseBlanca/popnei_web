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
import type { Project, SourceRead, VariantSource } from "./project.ts";
import type {
  ColumnType,
  CsvOptions,
  IndividualFilter,
  IndividualFilterKind,
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

const csvOptions: fc.Arbitrary<CsvOptions> = fc.record({
  encoding: fc.constantFrom("auto", "utf-8", "windows-1252"),
  separator: fc.constantFrom("auto", ",", ";", "\t"),
  decimal: fc.constantFrom("auto", ".", ","),
});

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
      command(
        "loadVariants",
        () => (p) =>
          loadVariants(p, {
            fileId,
            name: vcf ? "panel.vcf" : "panel.nei",
            size: 2048,
            format: vcf ? "vcf" : "nei",
            readOptions: vcf ? { ploidy, onlyPassed } : null,
          }),
      ),
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
      command(
        "loadIndividuals",
        () => (p) =>
          loadIndividuals(p, {
            fileId,
            name: csv === null ? "pops.xlsx" : "pops.csv",
            csv,
          }),
      ),
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
        () => (p) => setAnalysisOptions(p, analysis, options),
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
      fc.record({
        ploidy: fc.integer({ min: 1, max: 255 }),
        onlyPassed: fc.boolean(),
      }),
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
