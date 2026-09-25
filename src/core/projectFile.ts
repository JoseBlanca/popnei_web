/**
 * The project file, `<name>.popnei.json`, that a user saves to take their
 * work out of the browser and opens again later: its writing from the
 * state of the store, its reading back into a project, and the words of
 * the two comparisons a reopened project makes, of the variants file
 * given with the one the project was made with, and of the numbers of a
 * new run with the numbers saved (docs/specs/core/projectFile.md).
 */

import { variantsStem } from "./fileNames.ts";
import type { JsonValue } from "./keys.ts";
import {
  bothOf,
  counted,
  escaped,
  FORMAT_VERSION,
  grouped,
  namesOf,
  parseProject,
  projectErrorText,
  shown,
} from "./project.ts";
import type {
  AppId,
  ProjectError,
  AnalysisOptions,
  Check,
  Grouping,
  IndividualsSource,
  Project,
  SourceRead,
  VariantSource,
} from "./project.ts";
import type { Result } from "./result.ts";
import type { AnalysisDef, AppState, CheckVerdict } from "./store.ts";
import { settingsFingerprint } from "./keys.ts";
import type {
  ColumnType,
  IndividualFilter,
  VariantFilter,
} from "../worker/protocol.ts";

/** The text of the field `format`, which tells a project file from any
    other JSON file. */
export const FORMAT_NAME = "popnei_web project";

/** The largest project file the shell opens, 64 MB; a file with a table
    of 10,000 individuals is about 3 MB. */
export const MAX_PROJECT_FILE_BYTES = 64 * 1024 * 1024;

/** The end of the name of every project file, which `projectFileName`
    adds and the saving of the entry uses. */
export const PROJECT_FILE_EXTENSION = ".popnei.json";

// The writing.

/**
 * The text of the project file of the state of the store, `state`, with
 * the definitions of the analyses of the application, `analyses`, in the
 * order the screens show them, the version of the application,
 * `appVersion`, and the date and time of the save, `saved`, which the page
 * gives. The same state gives the same text, byte for byte.
 *
 * Throws a defect on a number that is not finite, a check number among
 * them, and on an analysis done while the state has no version of popnei.
 */
export function writeProjectFile<J, R>(
  state: AppState<R>,
  analyses: readonly AnalysisDef<J, R>[],
  appVersion: string,
  saved: string,
): string {
  const p = state.project;
  const variants = variantsWritten(p);
  const individuals =
    p.individuals !== null && p.individuals.read.kind === "read"
      ? p.individuals
      : null;
  const file = fields([
    ["format", FORMAT_NAME],
    ["formatVersion", FORMAT_VERSION],
    ["app", p.app],
    ["appVersion", appVersion],
    ["popneiVersion", state.popneiVersion],
    ["saved", saved],
    ["variants", variants === null ? null : variantSourceOut(variants)],
    ["filters", p.filters.map(variantFilterOut)],
    ["individualFilters", p.individualFilters.map(individualFilterOut)],
    ["individuals", individuals === null ? null : individualsOut(individuals)],
    ["grouping", groupingOut(p.grouping)],
    ["analyses", p.analyses.map(analysisOptionsOut)],
    [
      "checks",
      checksWritten(state, analyses, appVersion).map((check) =>
        checkOut(check),
      ),
    ],
  ]);
  return `${render(file, "")}\n`;
}

/**
 * The name the dialog of Save proposes: the name of the variants file
 * loaded, or of the reference's when none is, without its extension,
 * `.nei`, `.vcf` or `.vcf.gz` in any case, with `.popnei.json`; any other
 * extension kept; or `project.popnei.json` when there is neither, or
 * when the name is only an extension.
 */
export function projectFileName(p: Project): string {
  const name = (p.variants ?? p.reference?.variants)?.name;
  if (name === undefined) {
    return DEFAULT_FILE_NAME;
  }
  return `${variantsStem(name)}${PROJECT_FILE_EXTENSION}`;
}

/** The name of a project file with no variants file to name it after. */
const DEFAULT_FILE_NAME = `project${PROJECT_FILE_EXTENSION}`;

/**
 * The variants file the file holds (the spec, "What is written of each
 * part"): the one loaded when it is read; the reference's when the one
 * loaded is not read, does not differ from it in its identity and has its
 * read options, or when none is loaded; the one loaded otherwise, so that
 * a VCF read again with another ploidy is saved with the ploidy the user
 * set. `sourceReadOut` writes its read as pending when it failed.
 */
function variantsWritten(p: Project): VariantSource | null {
  const loaded = p.variants;
  const reference = p.reference?.variants ?? null;
  let chosen: VariantSource | null;
  if (loaded === null) {
    chosen = reference;
  } else if (loaded.read.kind === "read") {
    chosen = loaded;
  } else {
    chosen =
      reference !== null &&
      compareIdentity(reference, loaded).length === 0 &&
      sameReadOptions(reference, loaded)
        ? reference
        : loaded;
  }
  return chosen;
}

/** Whether two variants files are read with the same read options: both
    `.nei` files, or two VCFs of the same ploidy and the same choice of the
    passed variants. */
function sameReadOptions(a: VariantSource, b: VariantSource): boolean {
  const optionsA = a.readOptions;
  const optionsB = b.readOptions;
  if (optionsA === null || optionsB === null) {
    return optionsA === optionsB;
  }
  return (
    optionsA.ploidy === optionsB.ploidy &&
    optionsA.onlyPassed === optionsB.onlyPassed
  );
}

/** A check as the file holds it, without the fingerprint of its
    settings, which is made again when the file is opened. */
type CheckWritten = Omit<Check, "settings">;

/**
 * The check numbers of each analysis, in the order of `analyses` (the
 * spec, "The check numbers"): those of its result when it is done, with
 * the versions now; otherwise the reference's, with their own versions,
 * when the fingerprint of its settings now is the one the reference kept
 * and the variants file loaded, if there is one, does not differ from the
 * reference's; otherwise none.
 */
function checksWritten<J, R>(
  state: AppState<R>,
  analyses: readonly AnalysisDef<J, R>[],
  appVersion: string,
): CheckWritten[] {
  const p = state.project;
  const reference = p.reference;
  const sameFile =
    reference !== null &&
    (p.variants === null ||
      compareIdentity(reference.variants, p.variants).length === 0);
  const checks: CheckWritten[] = [];
  for (const def of analyses) {
    const status = state.analyses.find((view) => view.id === def.id)?.status;
    if (status?.kind === "done") {
      if (state.popneiVersion === null) {
        throw defect(
          `the analysis ${JSON.stringify(def.id)} is done while the state has no version of popnei.`,
        );
      }
      checks.push({
        analysis: def.id,
        numbers: finiteNumbers(def.id, def.checkNumbers(status.result)),
        keyVersion: def.keyVersion,
        popneiVersion: state.popneiVersion,
        appVersion,
      });
      continue;
    }
    if (reference === null || !sameFile) {
      continue;
    }
    const kept = reference.checks.find((check) => check.analysis === def.id);
    if (kept === undefined) {
      continue;
    }
    const readOptions = (p.variants ?? reference.variants).readOptions;
    if (settingsFingerprint(def, p, readOptions, null) === kept.settings) {
      checks.push({
        analysis: kept.analysis,
        numbers: finiteNumbers(def.id, kept.numbers),
        keyVersion: kept.keyVersion,
        popneiVersion: kept.popneiVersion,
        appVersion: kept.appVersion,
      });
    }
  }
  return checks;
}

/** The check numbers of an analysis, after checking that each is finite
    or `null`: a NaN or an infinity is a defect of its `checkNumbers`,
    which JSON would write as `null`. */
function finiteNumbers(
  analysis: string,
  numbers: readonly (number | null)[],
): readonly (number | null)[] {
  for (const n of numbers) {
    if (n !== null && !Number.isFinite(n)) {
      throw defect(
        `the check numbers of the analysis ${JSON.stringify(analysis)} hold ${String(n)}, which is not finite; checkNumbers gives null for a NaN.`,
      );
    }
  }
  return numbers;
}

/**
 * A value as the writer writes it: a JSON value whose objects are lists
 * of their fields, in the order they are written. The file is built from
 * these, and not by making a sorted copy of each object, which would lose
 * a field named `__proto__`.
 */
type Out = null | boolean | number | string | readonly Out[] | Fields;

/** An object of the file, its fields in the order they are written. */
interface Fields {
  readonly fields: readonly (readonly [name: string, value: Out])[];
}

function fields(entries: Fields["fields"]): Fields {
  return { fields: entries };
}

function variantSourceOut(source: VariantSource): Fields {
  return fields([
    ["fileId", source.fileId],
    ["name", source.name],
    ["size", source.size],
    ["format", source.format],
    [
      "readOptions",
      source.readOptions === null
        ? null
        : fields([
            ["ploidy", source.readOptions.ploidy],
            ["onlyPassed", source.readOptions.onlyPassed],
          ]),
    ],
    ["read", sourceReadOut(source.read)],
  ]);
}

/** A read of the variants file; one that failed is written as pending,
    since what failed was a read of that session, which a new load of the
    file makes again. */
function sourceReadOut(read: SourceRead): Fields {
  switch (read.kind) {
    case "pending":
    case "failed":
      return fields([["kind", "pending"]]);
    case "read":
      return fields([
        ["kind", "read"],
        ["individuals", read.individuals],
        ["ploidy", read.ploidy],
        ["numVars", read.numVars],
      ]);
  }
}

function variantFilterOut(filter: VariantFilter): Fields {
  switch (filter.kind) {
    case "missing_data":
      return fields([
        ["kind", filter.kind],
        ["maxAllowedMissingRate", filter.maxAllowedMissingRate],
      ]);
    case "maf":
      return fields([
        ["kind", filter.kind],
        ["maxAllowedMaf", filter.maxAllowedMaf],
      ]);
    case "obs_het":
      return fields([
        ["kind", filter.kind],
        ["maxAllowedObsHet", filter.maxAllowedObsHet],
      ]);
    case "ld":
      return fields([
        ["kind", filter.kind],
        ["maxAllowedR2", filter.maxAllowedR2],
        ["maxDist", filter.maxDist],
      ]);
  }
}

function individualFilterOut(filter: IndividualFilter): Fields {
  switch (filter.kind) {
    case "keep":
    case "remove":
      return fields([
        ["kind", filter.kind],
        ["individuals", filter.individuals],
      ]);
    case "missing_data":
      return fields([
        ["kind", filter.kind],
        ["maxAllowedMissingRate", filter.maxAllowedMissingRate],
      ]);
    case "obs_het":
      return fields([
        ["kind", filter.kind],
        ["maxAllowedObsHet", filter.maxAllowedObsHet],
      ]);
  }
}

/** An individuals file whose read is done; the caller writes `null` for
    any other. */
function individualsOut(source: IndividualsSource): Fields {
  const read = source.read;
  if (read.kind !== "read") {
    throw defect("an individuals file whose read is not done was written.");
  }
  return fields([
    ["fileId", source.fileId],
    ["name", source.name],
    [
      "csv",
      source.csv === null
        ? null
        : fields([
            ["encoding", source.csv.encoding],
            ["separator", source.csv.separator],
            ["decimal", source.csv.decimal],
          ]),
    ],
    [
      "read",
      fields([
        ["kind", "read"],
        [
          "table",
          fields([
            ["columns", read.table.columns],
            ["rows", read.table.rows],
          ]),
        ],
        ["columns", read.columns.map(columnTypeOut)],
        [
          "found",
          read.found === null
            ? null
            : fields([
                ["encoding", read.found.encoding],
                ["separator", read.found.separator],
                ["decimal", read.found.decimal],
                ["undecodedLine", read.found.undecodedLine],
              ]),
        ],
      ]),
    ],
  ]);
}

function columnTypeOut(column: ColumnType): Fields {
  switch (column.kind) {
    case "identifier":
    case "continuous":
    case "categorical":
      return fields([["kind", column.kind]]);
    case "binary":
      return fields([
        ["kind", column.kind],
        ["one", column.one],
        ["zero", column.zero],
      ]);
  }
}

function groupingOut(grouping: Grouping): Fields {
  switch (grouping.kind) {
    case "populations":
      return fields([
        ["kind", grouping.kind],
        ["column", grouping.column],
      ]);
    case "roles":
      return fields([
        ["kind", grouping.kind],
        ["roles", grouping.roles],
      ]);
  }
}

function analysisOptionsOut(entry: AnalysisOptions): Fields {
  return fields([
    ["analysis", entry.analysis],
    ["options", jsonOut(entry.options)],
  ]);
}

/** A JSON value whose fields no type fixes, the options of an analysis,
    with the fields of each object sorted by their UTF-16 code units, as
    the canonical form of the keys sorts them. */
function jsonOut(value: JsonValue): Out {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(jsonOut);
  }
  return fields(
    Object.entries(value)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, field]) => [name, jsonOut(field)] as const),
  );
}

function checkOut(check: CheckWritten): Fields {
  return fields([
    ["analysis", check.analysis],
    ["numbers", check.numbers],
    ["keyVersion", check.keyVersion],
    ["popneiVersion", check.popneiVersion],
    ["appVersion", check.appVersion],
  ]);
}

/** The indentation of one level. */
const INDENT = "  ";

/**
 * The text of a value at the indentation `indent`: one field per line; a
 * list whose items are all texts, numbers, booleans or `null` on one line;
 * `[]` and `{}` for empty ones; texts and numbers as `JSON.stringify`
 * writes them, a −0 as `0`. Throws a defect on a number that is not
 * finite.
 */
function render(value: Out, indent: string): string {
  if (value === null || typeof value !== "object") {
    return scalar(value);
  }
  const inner = indent + INDENT;
  if (isList(value)) {
    if (value.length === 0) {
      return "[]";
    }
    if (value.every((item) => item === null || typeof item !== "object")) {
      return `[${value.map((item) => render(item, inner)).join(", ")}]`;
    }
    const items = value.map((item) => `${inner}${render(item, inner)}`);
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (value.fields.length === 0) {
    return "{}";
  }
  const lines = value.fields.map(
    ([name, field]) =>
      `${inner}${JSON.stringify(name)}: ${render(field, inner)}`,
  );
  return `{\n${lines.join(",\n")}\n${indent}}`;
}

function isList(value: readonly Out[] | Fields): value is readonly Out[] {
  return Array.isArray(value);
}

function scalar(value: null | boolean | number | string): string {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw defect(`the number ${String(value)} is not finite.`);
  }
  return JSON.stringify(value);
}

function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}

// The opening.

/** Why a file cannot be opened as a project. */
export type ProjectFileError =
  | { readonly kind: "tooLarge"; readonly size: number }
  | { readonly kind: "notJson" }
  | { readonly kind: "notProjectFile" }
  | {
      readonly kind: "newerFormat";
      readonly formatVersion: number;
      readonly appVersion: string | null;
    }
  | { readonly kind: "unknownField"; readonly name: string }
  | { readonly kind: "missingField"; readonly name: string }
  | {
      readonly kind: "header";
      readonly field: HeaderField;
      readonly expected: string;
    }
  | { readonly kind: "project"; readonly error: ProjectError };

/** A field of the top of the file whose value a `header` error names. */
export type HeaderField =
  | "formatVersion"
  | "app"
  | "appVersion"
  | "popneiVersion"
  | "saved"
  | "checks"
  | "variants"
  | "individuals";

/** The fields of the top of the file, in the order they are written. */
const TOP_FIELDS = [
  "format",
  "formatVersion",
  "app",
  "appVersion",
  "popneiVersion",
  "saved",
  "variants",
  "filters",
  "individualFilters",
  "individuals",
  "grouping",
  "analyses",
  "checks",
] as const;

/** The placeholder of the fingerprint of a check while the project is
    validated, replaced by the real one once it is. */
const NO_FINGERPRINT = "0".repeat(64);

/**
 * The project of the text of a project file, in the application `app`
 * with the definitions of its analyses, `analyses`; or the first reason
 * it cannot be opened, in the order of the spec's "Opening", so that the
 * reason given is the one the user can act on: a text that is not JSON; a
 * JSON value that is not a project file; a version of the format that is
 * not a whole number of at least 1, or is newer than this one; a file of
 * the other application; a field at the top this version does not write,
 * or one missing; a header of the wrong value; check numbers that are not
 * a list of objects, or hold a fingerprint, or are there with no variants
 * file; the project, as `parseProject` checks it; and a read this version
 * never writes.
 *
 * The project has no variants file, and as its reference the file's
 * variants file and check numbers, each with the fingerprint of its
 * settings made from the opened project. It is not frozen; the store
 * freezes it when it takes it.
 */
export function readProjectFile<J, R>(
  text: string,
  app: AppId,
  analyses: readonly AnalysisDef<J, R>[],
): Result<Project, ProjectFileError> {
  const data = parseJson(
    text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text,
  );
  if (!data.ok) {
    return data;
  }
  const file = data.value;
  if (!isFields(file) || file["format"] !== FORMAT_NAME) {
    return refused({ kind: "notProjectFile" });
  }

  const formatVersion = file["formatVersion"];
  if (
    typeof formatVersion !== "number" ||
    !Number.isInteger(formatVersion) ||
    formatVersion < 1
  ) {
    return header("formatVersion", "a whole number, 1 or more");
  }
  if (formatVersion > FORMAT_VERSION) {
    const appVersion = file["appVersion"];
    return refused({
      kind: "newerFormat",
      formatVersion,
      appVersion: typeof appVersion === "string" ? appVersion : null,
    });
  }

  const fileApp = file["app"];
  if (fileApp !== "popgen" && fileApp !== "gwas") {
    return header("app", "population genetics or association");
  }
  if (fileApp !== app) {
    return refused({
      kind: "project",
      error: { kind: "otherApp", found: fileApp },
    });
  }

  for (const name of Object.keys(file)) {
    if (!TOP_FIELDS.some((field) => field === name)) {
      return refused({ kind: "unknownField", name });
    }
  }
  for (const name of TOP_FIELDS) {
    if (!Object.hasOwn(file, name)) {
      return refused({ kind: "missingField", name });
    }
  }
  if (typeof file["appVersion"] !== "string") {
    return header("appVersion", "a text");
  }
  const popneiVersion = file["popneiVersion"];
  if (popneiVersion !== null && typeof popneiVersion !== "string") {
    return header("popneiVersion", "a text or nothing");
  }
  if (typeof file["saved"] !== "string") {
    return header("saved", "a text");
  }

  const checks = file["checks"];
  if (!Array.isArray(checks) || !checks.every(isFields)) {
    return header("checks", CHECKS_EXPECTED);
  }
  if (checks.some((check) => Object.hasOwn(check, "settings"))) {
    return header(
      "checks",
      "without a record of the settings, which the application never saves",
    );
  }
  const variants = file["variants"];
  if (variants === null && checks.length > 0) {
    return header("checks", "empty when there is no variants file");
  }

  const parsed = parseProject(
    {
      app: fileApp,
      variants: null,
      filters: file["filters"],
      individualFilters: file["individualFilters"],
      individuals: file["individuals"],
      grouping: file["grouping"],
      analyses: file["analyses"],
      reference:
        variants === null
          ? null
          : {
              variants,
              checks: checks.map((check) => ({
                ...check,
                settings: NO_FINGERPRINT,
              })),
            },
    },
    app,
    formatVersion,
    analyses,
  );
  if (!parsed.ok) {
    return refused({ kind: "project", error: parsed.error });
  }
  const project = parsed.value;
  const reference = project.reference;

  if (reference?.variants.read.kind === "failed") {
    return header(
      "variants",
      "the file read, or nothing yet, as the application saves it",
    );
  }
  if (
    project.individuals !== null &&
    project.individuals.read.kind !== "read"
  ) {
    return header("individuals", "the table read, as the application saves it");
  }

  if (reference === null) {
    return { ok: true, value: project };
  }
  const readOptions = reference.variants.readOptions;
  return {
    ok: true,
    value: {
      ...project,
      reference: {
        ...reference,
        checks: reference.checks.map((check) => ({
          ...check,
          settings: settingsFingerprint(
            definitionOf(analyses, check.analysis),
            project,
            readOptions,
            null,
          ),
        })),
      },
    },
  };
}

/** The mark some editors write at the start of a text in UTF-8. */
const BYTE_ORDER_MARK = "\uFEFF";

/** What a `header` error of the check numbers says they should be. */
const CHECKS_EXPECTED =
  "a list of the numbers of each analysis, as the application saves them";

/** The value of the JSON text `text`, or `notJson`. */
function parseJson(text: string): Result<unknown, ProjectFileError> {
  try {
    const value: unknown = JSON.parse(text);
    return { ok: true, value };
  } catch (error) {
    // JSON.parse refuses a text that is not JSON with a SyntaxError, the
    // expected failure of a file cut short or of another kind; anything
    // else is not expected, and is thrown on.
    if (error instanceof SyntaxError) {
      return refused({ kind: "notJson" });
    }
    throw error;
  }
}

type FileFields = Readonly<Record<string, unknown>>;

function isFields(value: unknown): value is FileFields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function refused(error: ProjectFileError): {
  readonly ok: false;
  readonly error: ProjectFileError;
} {
  return { ok: false, error };
}

function header(
  field: HeaderField,
  expected: string,
): { readonly ok: false; readonly error: ProjectFileError } {
  return refused({ kind: "header", field, expected });
}

/** The definition of the analysis `id`, which `parseProject` has checked
    is one of `analyses`. */
function definitionOf<J, R>(
  analyses: readonly AnalysisDef<J, R>[],
  id: string,
): AnalysisDef<J, R> {
  const def = analyses.find((a) => a.id === id);
  if (def === undefined) {
    throw defect(
      `the check of the analysis ${JSON.stringify(id)} passed the validation with no definition of its own.`,
    );
  }
  return def;
}

/** The end of the text of an error of the content of a file: what
    happened to the file, and what the user can do; the same as
    `projectErrorText` of project.ts ends with. */
const DAMAGED =
  "The file was changed outside the application, or is damaged. Open a copy saved before the change, or make the project again.";

/** A field of the top of the file in words. */
const HEADER_WORDS: Readonly<Record<HeaderField, string>> = {
  formatVersion: "the version of its format",
  app: "the application",
  appVersion: "the version of the application that saved it",
  popneiVersion: "the version of popnei it was saved with",
  saved: "the date it was saved",
  checks: "the check numbers",
  variants: "what was read of the variants file",
  individuals: "what was read of the individuals file",
};

/** The size of a project file too large to open, in MB, as the text
    says it. */
const MAX_PROJECT_FILE_MB = MAX_PROJECT_FILE_BYTES / (1024 * 1024);

/**
 * The text the user reads of a file refused, `fileName` the name of the
 * file picked: the first three name the file, since it may not be a
 * project file at all, and the others are in the pattern of
 * `projectErrorText`, which gives the text of the project itself (the
 * spec, Open 1).
 */
export function projectFileErrorText(
  error: ProjectFileError,
  fileName: string,
): string {
  const name = escaped(fileName);
  switch (error.kind) {
    case "tooLarge":
      return `${name} cannot be opened as a project: it is larger than ${String(MAX_PROJECT_FILE_MB)} MB, and a project file, which holds settings and no genotypes, is much smaller. Open the .popnei.json file the application saved.`;
    case "notJson":
      return `${name} cannot be opened as a project: it is not a project file, or it was cut short or changed outside the application. Open the .popnei.json file the application saved, or a copy of it.`;
    case "notProjectFile":
      return `${name} cannot be opened as a project: it is not a project file of the application. Open the .popnei.json file the application saved.`;
    case "newerFormat": {
      const version =
        error.appVersion === null ? "" : `, ${shown(error.appVersion)},`;
      return `This project file was saved by a newer version of the application${version} in a format this version cannot read. Reload the page to get the newest version, and open the file again.`;
    }
    case "unknownField":
      return `The project file cannot be opened: it has a field "${shown(error.name)}", which the application does not write. ${DAMAGED}`;
    case "missingField":
      return `The project file cannot be opened: its field "${shown(error.name)}" is missing. ${DAMAGED}`;
    case "header":
      return `The project file cannot be opened: ${HEADER_WORDS[error.field]} should be ${error.expected}. ${DAMAGED}`;
    case "project":
      return projectErrorText(error.error);
  }
}

// The comparisons after an opening.

/** A way the variants file given differs from the one the project was
    made with, in the order they are compared. */
export type IdentityDifference =
  /** Its name, `now`. */
  | { readonly kind: "name"; readonly now: string }
  /** Its format, `now`. */
  | { readonly kind: "format"; readonly now: "vcf" | "nei" }
  /** Its size in bytes. */
  | { readonly kind: "size"; readonly saved: number; readonly now: number }
  /** Its number of individuals, `now`; both read. */
  | { readonly kind: "individualsCount"; readonly now: number }
  /** The individuals of the saved file it lacks, in the order of that
      file; both read, with the same number. */
  | { readonly kind: "otherIndividuals"; readonly missing: readonly string[] }
  /** The same individuals in another order; both read. */
  | { readonly kind: "individualsOrder" }
  /** Its ploidy; both read. */
  | { readonly kind: "ploidy"; readonly saved: number; readonly now: number }
  /** Its number of variants, `now`; both counted. */
  | { readonly kind: "numVars"; readonly now: number };

/**
 * How the variants file `now` differs from `saved`, the reference's, in
 * the order of the spec's table: the name, the format and the size
 * always; the individuals, their number, their order and the ploidy when
 * both are read; the number of variants when both are counted. Empty when
 * nothing differs.
 */
export function compareIdentity(
  saved: VariantSource,
  now: VariantSource,
): readonly IdentityDifference[] {
  const differences: IdentityDifference[] = [];
  if (saved.name !== now.name) {
    differences.push({ kind: "name", now: now.name });
  }
  if (saved.format !== now.format) {
    differences.push({ kind: "format", now: now.format });
  }
  if (saved.size !== now.size) {
    differences.push({ kind: "size", saved: saved.size, now: now.size });
  }
  const savedRead = saved.read;
  const nowRead = now.read;
  if (savedRead.kind !== "read" || nowRead.kind !== "read") {
    return differences;
  }
  if (savedRead.individuals.length !== nowRead.individuals.length) {
    differences.push({
      kind: "individualsCount",
      now: nowRead.individuals.length,
    });
  } else {
    const inNow = new Set(nowRead.individuals);
    const missing = savedRead.individuals.filter((name) => !inNow.has(name));
    if (missing.length > 0) {
      differences.push({ kind: "otherIndividuals", missing });
    } else if (
      savedRead.individuals.some(
        (name, index) => nowRead.individuals[index] !== name,
      )
    ) {
      differences.push({ kind: "individualsOrder" });
    }
  }
  if (savedRead.ploidy !== nowRead.ploidy) {
    differences.push({
      kind: "ploidy",
      saved: savedRead.ploidy,
      now: nowRead.ploidy,
    });
  }
  if (
    savedRead.numVars !== null &&
    nowRead.numVars !== null &&
    savedRead.numVars !== nowRead.numVars
  ) {
    differences.push({ kind: "numVars", now: nowRead.numVars });
  }
  return differences;
}

/**
 * The words of the comparison of a new run with the check numbers of the
 * project file, which the panel of every analysis shows under its result:
 * the same numbers, or other numbers followed by a sentence for each
 * other cause the store names, another version of popnei and another
 * calculation of the analysis by the application (the spec, Open 1).
 */
export function checkVerdictText(verdict: CheckVerdict): string {
  switch (verdict.kind) {
    case "same":
      return "The same numbers as in the project file: this variants file gives the results the project was saved with.";
    case "differs": {
      const sentences = [
        "Not the same numbers as in the project file. The variants file may not be the one the project was saved with, or it was changed since.",
      ];
      if (verdict.popnei !== null) {
        sentences.push(
          `The numbers were calculated with popnei ${shown(verdict.popnei.saved)}, and this is popnei ${shown(verdict.popnei.now)}.`,
        );
      }
      if (verdict.app !== null) {
        sentences.push(
          `The numbers were calculated by version ${shown(verdict.app.saved)} of the application, which calculated this analysis in another way than this version, ${shown(verdict.app.now)}.`,
        );
      }
      return sentences.join(" ");
    }
  }
}
/**
 * The warning the Variants step shows beside the variants file given
 * after an opening, one sentence that says what the reference knows of
 * its file and how this one differs; `null` with no reference, no file,
 * or no difference (the spec, Open 1).
 */
export function identityWarning(p: Project): string | null {
  const reference = p.reference;
  if (reference === null || p.variants === null) {
    return null;
  }
  const differences = compareIdentity(reference.variants, p.variants);
  if (differences.length === 0) {
    return null;
  }
  return `The project was made with ${madeWith(reference.variants)}; this file ${bothOf(differences.map(differenceWords))}. Load the file the project was made with, or go on with this one.`;
}

/**
 * The file to give after an opening, the words of the Variants step, the
 * stepper and the announcement of the opening; `null` when a variants
 * file is loaded or there is no reference (the spec, Open 1).
 */
export function askedFileText(p: Project): string | null {
  if (p.variants !== null || p.reference === null) {
    return null;
  }
  return `This project was made with ${madeWith(p.reference.variants)}. Load it in the Variants step to run its analyses again.`;
}

/** What the reference knows of its file, the name first: "panel.nei,
    342 individuals and 1,203,554 variants". */
function madeWith(source: VariantSource): string {
  const words = [escaped(source.name)];
  const read = source.read;
  if (read.kind === "read") {
    words.push(counted(read.individuals.length, "individual"));
    if (read.numVars !== null) {
      words.push(counted(read.numVars, "variant"));
    }
  }
  return bothOf(words);
}

/** A difference as the end of a sentence whose subject is "this file". */
function differenceWords(difference: IdentityDifference): string {
  switch (difference.kind) {
    case "name":
      return `is called ${escaped(difference.now)}`;
    case "format":
      return difference.now === "vcf" ? "is a VCF file" : "is a .nei file";
    case "size":
      return `has ${grouped(difference.now)} bytes where that one had ${grouped(difference.saved)}`;
    case "individualsCount":
      return `has ${counted(difference.now, "individual")}`;
    case "otherIndividuals":
      return `lacks ${counted(difference.missing.length, "individual")} of that one: ${namesOf(difference.missing)}`;
    case "individualsOrder":
      return "has the same individuals in another order";
    case "ploidy":
      return `has ploidy ${String(difference.now)} where that one had ${String(difference.saved)}`;
    case "numVars":
      return `has ${counted(difference.now, "variant")}`;
  }
}
