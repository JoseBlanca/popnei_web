/**
 * The messages the page and each of its two workers send each other, the
 * functions that check every message when it arrives, and the number of
 * the version of these messages (docs/specs/worker/messages.md).
 *
 * A message that fails its check is a defect of ours, since both sides
 * are our code, and is never used: the client fails the request it
 * belongs to, and a runner answers it with `badRequest`. A check reads the
 * type of every field and not its range, which is popnei's to keep.
 *
 * The client and the runners import this file; core does not, since the
 * messages carry a `File`, a type of the DOM. It imports the types of
 * protocol.ts and of core's `Result`, and nothing else.
 */

import type { Result } from "../core/result.ts";
import { MIN_DRAW } from "./protocol.ts";
import type {
  Cell,
  ColumnType,
  CsvFound,
  CsvOptions,
  DiversityJob,
  DiversityResult,
  PopDiversityFields,
  FilterCountsJob,
  FilterCountsResult,
  FilteringStats,
  IndividualChecksJob,
  IndividualChecksResult,
  IndividualStatsPart,
  IndividualsFileError,
  IndividualsTable,
  Job,
  JobResult,
  FileOrderReason,
  HeatmapOrder,
  LdDecayJob,
  LdDecayResult,
  LeftOut,
  LoadFormat,
  Opened,
  PassStats,
  PcaJob,
  PcaMethod,
  PcaResult,
  PopDistsJob,
  PopDistsResult,
  Separator,
  VariantChecksJob,
  VariantChecksResult,
  VariantStatsPart,
  VariantDistrib,
  VariantFilter,
  VariantFilterKind,
  VariantsSummaryJob,
  VariantsSummaryResult,
  WriteJob,
  Written,
} from "./protocol.ts";

/**
 * The version of the messages, which each worker gives in its `ready`. It
 * is raised with any change to a message, to `Job` or `JobResult`, or to a
 * type of protocol.ts that a message carries.
 */
export const PROTOCOL_VERSION = 12;

/** A request of the page to the calculation worker. */
export type ToRunner =
  /** Open the variants file of a load; the worker's first request. */
  | ({
      /** Which request this is. */
      readonly kind: "open";
      /** The number of the request, counted up from 1 for the page. */
      readonly id: number;
      /** The load id of the variants file. */
      readonly fileId: string;
      /** The file the user picked. */
      readonly file: File;
    } & LoadFormat)
  /** Calculate the result of an analysis. */
  | {
      /** Which request this is. */
      readonly kind: "run";
      /** The number of the request. */
      readonly id: number;
      /** The key of the result, which comes back with it. */
      readonly key: string;
      /** What to calculate. */
      readonly job: Job;
    }
  /** Write the filtered variants as a file. */
  | {
      /** Which request this is. */
      readonly kind: "write";
      /** The number of the request. */
      readonly id: number;
      /** The key of the file, which comes back with it. */
      readonly key: string;
      /** What to write. */
      readonly job: WriteJob;
    };

/** A message of the calculation worker to the page. */
export type FromRunner =
  /** The worker can take requests. */
  | {
      /** Which message this is. */
      readonly kind: "ready";
      /** The worker's `PROTOCOL_VERSION`. */
      readonly protocol: number;
      /** popnei's `version()`, part of every key. */
      readonly popneiVersion: string;
    }
  /** The answer of an `open`: the variants file is open. */
  | ({
      /** Which message this is. */
      readonly kind: "opened";
      /** The id of the `open`. */
      readonly id: number;
    } & Opened)
  /** The answer of a `run`: its result. */
  | {
      /** Which message this is. */
      readonly kind: "result";
      /** The id of the `run`. */
      readonly id: number;
      /** The key the `run` was asked with. */
      readonly key: string;
      /** The result, of the analysis of the job. */
      readonly result: JobResult;
    }
  /** The result so far of a `run` whose calculation gives one, the
      summary of the variants file: the result over the variants read so
      far, of the analysis of the job, sent while the pass runs, every 2
      seconds as popnei gives it, before the `result`. */
  | {
      /** Which message this is. */
      readonly kind: "soFar";
      /** The id of the `run`. */
      readonly id: number;
      /** The key the `run` was asked with. */
      readonly key: string;
      /** The result over the variants read so far. */
      readonly result: JobResult;
    }
  /** The answer of a `write`: the file, as a `Blob` the runner made. */
  | {
      /** Which message this is. */
      readonly kind: "written";
      /** The id of the `write`. */
      readonly id: number;
      /** The key the `write` was asked with. */
      readonly key: string;
      /** The file, its size and the counts of its pass. */
      readonly result: Written<Blob>;
    }
  /** popnei refused the input of the request; the worker goes on. */
  | {
      /** Which message this is. */
      readonly kind: "refused";
      /** The id of the request. */
      readonly id: number;
      /** popnei's message, as it is. */
      readonly message: string;
    }
  /** The browser can no longer read the variants file; the worker goes
      on. */
  | {
      /** Which message this is. */
      readonly kind: "reopenFailed";
      /** The id of the request. */
      readonly id: number;
      /** The name of the file. */
      readonly name: string;
      /** popnei's message, for the console. */
      readonly message: string;
    }
  /** How far a `run` or a `write` has gone, popnei's `Progress` under its
      names. */
  | {
      /** Which message this is. */
      readonly kind: "progress";
      /** The id of the `run` or the `write`. */
      readonly id: number;
      /** The bytes of the file the pass has read. */
      readonly bytesRead: number;
      /** The bytes of the file on the disk. */
      readonly numBytes: number;
      /** The pass that reads, 1 for the first. */
      readonly pass: number;
      /** The passes of the run. */
      readonly numPasses: number;
    }
  | WorkerStop;

/** The worker cannot go on; it closes itself after posting it. It has no
    id, since a worker runs one request at a time. */
export type WorkerStop =
  /** A trap, a throw outside popnei, or the wasm not loaded. */
  | {
      /** Which message this is. */
      readonly kind: "crashed";
      /** The message of what was thrown. */
      readonly message: string;
    }
  /** A request that failed its check, a defect of the page. */
  | {
      /** Which message this is. */
      readonly kind: "badRequest";
      /** What was wrong with the request, from `describeMessageError`. */
      readonly message: string;
    };

/** A request of the page to the light worker. */
export interface ToFilesRunner {
  /** Which request this is: read the individuals file. */
  readonly kind: "readIndividuals";
  /** The number of the request. */
  readonly id: number;
  /** The file the user picked. */
  readonly file: File;
  /** How the CSV or TSV is read; `null` for an xlsx, from stage 4. */
  readonly csv: CsvOptions | null;
}

/** A message of the light worker to the page. */
export type FromFilesRunner =
  /** The worker can take requests; it holds no popnei, so gives no
      version of it. */
  | {
      /** Which message this is. */
      readonly kind: "ready";
      /** The worker's `PROTOCOL_VERSION`. */
      readonly protocol: number;
    }
  /** The answer of a `readIndividuals`. */
  | {
      /** Which message this is. */
      readonly kind: "individuals";
      /** The id of the `readIndividuals`. */
      readonly id: number;
      /** What the reader made of the file. */
      readonly read: IndividualsFileRead;
    }
  | WorkerStop;

/** What the reader made of the file: the table, or the ways it is wrong
    (docs/specs/worker/individuals.md). */
export type IndividualsFileRead =
  /** The file was read. */
  | {
      /** Which answer this is. */
      readonly kind: "read";
      /** The table, each row as long as the header. */
      readonly table: IndividualsTable;
      /** The type of each column, one per column of the header. */
      readonly columns: readonly ColumnType[];
      /** The three options of the CSV the read used; `null` for an
          xlsx, which has none. */
      readonly found: CsvFound | null;
    }
  /** The reader refused the file. */
  | {
      /** Which answer this is. */
      readonly kind: "failed";
      /** The way the file is wrong. */
      readonly error: IndividualsFileError;
    };

/**
 * The type of a value as a refusal names it: what `typeof` gives, but
 * `null` and `array` apart from `object`.
 */
export type TypeName =
  | "undefined"
  | "null"
  | "array"
  | "object"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function";

/**
 * The ways a message is refused, the first one its check met. `path` is
 * the place of a field in the message, `"job.filters.0.maxAllowedMissingRate"`,
 * with the index of an element of a list among its parts; for the fields
 * missing or more it is the object that holds them, `""` for the message
 * itself.
 */
export type MessageError =
  /** The message is not an object. */
  | {
      readonly kind: "notObject";
      /** The type of what arrived. */
      readonly found: TypeName;
    }
  /** The message has no field `kind` of its own. */
  | { readonly kind: "noKind" }
  /** The field `kind` is not text. */
  | {
      readonly kind: "kindNotText";
      /** The type of the field `kind`. */
      readonly found: TypeName;
    }
  /** The field `kind` is text but not a kind of this side. */
  | {
      readonly kind: "unknownKind";
      /** The kind that arrived. */
      readonly found: string;
      /** The kinds of this side. */
      readonly expected: readonly string[];
    }
  /** Fields of an object of the message are not there. */
  | {
      readonly kind: "missingFields";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The object that lacks them, `""` for the message itself. */
      readonly path: string;
      /** The fields that are not there. */
      readonly fields: readonly string[];
    }
  /** An object of the message has fields it should not have. */
  | {
      readonly kind: "extraFields";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The object that has them, `""` for the message itself. */
      readonly path: string;
      /** The fields it should not have. */
      readonly fields: readonly string[];
    }
  /** A field of text holds a text that is not one of its values. */
  | {
      readonly kind: "unknownValue";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The field. */
      readonly path: string;
      /** The text it holds. */
      readonly found: string;
      /** The values it may hold. */
      readonly expected: readonly string[];
    }
  /** A field holds a value of the wrong type. */
  | {
      readonly kind: "wrongType";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The field. */
      readonly path: string;
      /** What the field should hold, in words. */
      readonly expected: string;
      /** The type of what it holds. */
      readonly found: TypeName;
    }
  /** A list is not as long as what it goes with. */
  | {
      readonly kind: "wrongLength";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The list. */
      readonly path: string;
      /** The length it should have. */
      readonly expected: number;
      /** The length it has. */
      readonly found: number;
    }
  /** A field that gives the size of a file of the message, the
      `numBytes` of a `written`, is not that size. */
  | {
      readonly kind: "wrongSize";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The field. */
      readonly path: string;
      /** The size of the file, in bytes. */
      readonly expected: number;
      /** The number the field holds. */
      readonly found: number;
    }
  /** A `ready` of another `PROTOCOL_VERSION`: a worker of another build. */
  | {
      readonly kind: "otherProtocol";
      /** The version the worker gave. */
      readonly found: number;
    };

/**
 * Checks a request that arrived at the calculation worker: its kind is one
 * of `ToRunner`, it has exactly the fields of that kind at every depth,
 * each of its type, a `.nei` file has no read options while a VCF has
 * them, and the job of the histograms of the variants has no filter. It
 * gives the typed request, or the first way it was wrong.
 */
export function parseToRunner(data: unknown): Result<ToRunner, MessageError> {
  const known = knownKind(data, TO_RUNNER_KINDS);
  if (!known.ok) {
    return known;
  }
  const { record, kind } = known.value;
  const place: Place = { messageKind: kind, path: "" };
  switch (kind) {
    case "open": {
      const wrong = exactFields(record, place, [
        "kind",
        "id",
        "fileId",
        "file",
        "format",
        "readOptions",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const fileId = field(record, "fileId", place, isText);
      if (!fileId.ok) {
        return fileId;
      }
      const file = field(record, "file", place, isFile);
      if (!file.ok) {
        return file;
      }
      const format = field(record, "format", place, oneOf(FORMATS));
      if (!format.ok) {
        return format;
      }
      const load = checkLoadFormat(
        format.value,
        ownField(record, "readOptions"),
        inner(place, "readOptions"),
      );
      if (!load.ok) {
        return load;
      }
      return accepted({
        kind,
        id: id.value,
        fileId: fileId.value,
        file: file.value,
        ...load.value,
      });
    }
    case "run": {
      const wrong = exactFields(record, place, ["kind", "id", "key", "job"]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const key = field(record, "key", place, isText);
      if (!key.ok) {
        return key;
      }
      const job = field(record, "job", place, checkJob);
      if (!job.ok) {
        return job;
      }
      return accepted({ kind, id: id.value, key: key.value, job: job.value });
    }
    case "write": {
      const wrong = exactFields(record, place, ["kind", "id", "key", "job"]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const key = field(record, "key", place, isText);
      if (!key.ok) {
        return key;
      }
      const job = field(record, "job", place, checkWriteJob);
      if (!job.ok) {
        return job;
      }
      return accepted({ kind, id: id.value, key: key.value, job: job.value });
    }
  }
}

/**
 * Checks a message that arrived at the page from the calculation worker:
 * its kind is one of `FromRunner`, it has exactly the fields of that kind
 * at every depth, each of its type, every array of a result is as long as
 * what it goes with, the populations, the individuals or the edges of the
 * bins, and the `numBytes` of a written file is its size. A `ready` of
 * another `PROTOCOL_VERSION` gives
 * `otherProtocol`, whatever its other fields. It gives the typed message,
 * or the first way it was wrong.
 */
export function parseFromRunner(
  data: unknown,
): Result<FromRunner, MessageError> {
  const known = knownKind(data, FROM_RUNNER_KINDS);
  if (!known.ok) {
    return known;
  }
  const { record, kind } = known.value;
  const place: Place = { messageKind: kind, path: "" };
  switch (kind) {
    case "ready": {
      const protocol = checkProtocol(record, place, [
        "kind",
        "protocol",
        "popneiVersion",
      ]);
      if (!protocol.ok) {
        return protocol;
      }
      const popneiVersion = field(record, "popneiVersion", place, isText);
      if (!popneiVersion.ok) {
        return popneiVersion;
      }
      return accepted({
        kind,
        protocol: protocol.value,
        popneiVersion: popneiVersion.value,
      });
    }
    case "opened": {
      const wrong = exactFields(record, place, [
        "kind",
        "id",
        "individuals",
        "ploidy",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const individuals = field(record, "individuals", place, listOf(isText));
      if (!individuals.ok) {
        return individuals;
      }
      const ploidy = field(record, "ploidy", place, isNumber);
      if (!ploidy.ok) {
        return ploidy;
      }
      return accepted({
        kind,
        id: id.value,
        individuals: individuals.value,
        ploidy: ploidy.value,
      });
    }
    case "result":
    case "soFar": {
      const wrong = exactFields(record, place, ["kind", "id", "key", "result"]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const key = field(record, "key", place, isText);
      if (!key.ok) {
        return key;
      }
      const result = field(record, "result", place, checkJobResult);
      if (!result.ok) {
        return result;
      }
      return accepted({
        kind,
        id: id.value,
        key: key.value,
        result: result.value,
      });
    }
    case "written": {
      const wrong = exactFields(record, place, ["kind", "id", "key", "result"]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const key = field(record, "key", place, isText);
      if (!key.ok) {
        return key;
      }
      const result = field(record, "result", place, checkWritten);
      if (!result.ok) {
        return result;
      }
      return accepted({
        kind,
        id: id.value,
        key: key.value,
        result: result.value,
      });
    }
    case "refused": {
      const wrong = exactFields(record, place, ["kind", "id", "message"]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const message = field(record, "message", place, isText);
      if (!message.ok) {
        return message;
      }
      return accepted({ kind, id: id.value, message: message.value });
    }
    case "reopenFailed": {
      const wrong = exactFields(record, place, [
        "kind",
        "id",
        "name",
        "message",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const name = field(record, "name", place, isText);
      if (!name.ok) {
        return name;
      }
      const message = field(record, "message", place, isText);
      if (!message.ok) {
        return message;
      }
      return accepted({
        kind,
        id: id.value,
        name: name.value,
        message: message.value,
      });
    }
    case "progress": {
      const wrong = exactFields(record, place, [
        "kind",
        "id",
        "bytesRead",
        "numBytes",
        "pass",
        "numPasses",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const bytesRead = field(record, "bytesRead", place, isNumber);
      if (!bytesRead.ok) {
        return bytesRead;
      }
      const numBytes = field(record, "numBytes", place, isNumber);
      if (!numBytes.ok) {
        return numBytes;
      }
      const pass = field(record, "pass", place, isNumber);
      if (!pass.ok) {
        return pass;
      }
      const numPasses = field(record, "numPasses", place, isNumber);
      if (!numPasses.ok) {
        return numPasses;
      }
      return accepted({
        kind,
        id: id.value,
        bytesRead: bytesRead.value,
        numBytes: numBytes.value,
        pass: pass.value,
        numPasses: numPasses.value,
      });
    }
    case "crashed":
    case "badRequest":
      return checkWorkerStop(record, kind);
  }
}

/**
 * Checks a request that arrived at the light worker: a `readIndividuals`
 * with exactly its fields, each of its type. It gives the typed request,
 * or the first way it was wrong.
 */
export function parseToFilesRunner(
  data: unknown,
): Result<ToFilesRunner, MessageError> {
  const known = knownKind(data, TO_FILES_RUNNER_KINDS);
  if (!known.ok) {
    return known;
  }
  const { record, kind } = known.value;
  const place: Place = { messageKind: kind, path: "" };
  const wrong = exactFields(record, place, ["kind", "id", "file", "csv"]);
  if (wrong !== null) {
    return wrong;
  }
  const id = field(record, "id", place, isWhole);
  if (!id.ok) {
    return id;
  }
  const file = field(record, "file", place, isFile);
  if (!file.ok) {
    return file;
  }
  const csv = field(record, "csv", place, orNull(checkCsvOptions));
  if (!csv.ok) {
    return csv;
  }
  return accepted({ kind, id: id.value, file: file.value, csv: csv.value });
}

/**
 * Checks a message that arrived at the page from the light worker: its
 * kind is one of `FromFilesRunner`, it has exactly the fields of that kind
 * at every depth, each of its type, every row of a table is as long as its
 * header, with one type for each column, and a refusal of the reader is
 * one of the kinds of `IndividualsFileError`. A `ready` of another
 * `PROTOCOL_VERSION` gives `otherProtocol`, whatever its other fields. It
 * gives the typed message, or the first way it was wrong.
 */
export function parseFromFilesRunner(
  data: unknown,
): Result<FromFilesRunner, MessageError> {
  const known = knownKind(data, FROM_FILES_RUNNER_KINDS);
  if (!known.ok) {
    return known;
  }
  const { record, kind } = known.value;
  const place: Place = { messageKind: kind, path: "" };
  switch (kind) {
    case "ready": {
      const protocol = checkProtocol(record, place, ["kind", "protocol"]);
      if (!protocol.ok) {
        return protocol;
      }
      return accepted({ kind, protocol: protocol.value });
    }
    case "individuals": {
      const wrong = exactFields(record, place, ["kind", "id", "read"]);
      if (wrong !== null) {
        return wrong;
      }
      const id = field(record, "id", place, isWhole);
      if (!id.ok) {
        return id;
      }
      const read = field(record, "read", place, checkFileRead);
      if (!read.ok) {
        return read;
      }
      return accepted({ kind, id: id.value, read: read.value });
    }
    case "crashed":
    case "badRequest":
      return checkWorkerStop(record, kind);
  }
}

/** How the message of a defect of our code starts, the `Error` that a
    state our code makes impossible throws (.claude/skills/coding/
    typescript.md, "Errors"). A `crashed` of the calculation worker whose
    message starts so is a defect of the application, which the client
    gives the page as the `RunError` `defect`, and not a crash
    (docs/specs/worker/client.md, "Crashes, defects, and every read
    answered"). */
export const DEFECT_START = "popnei_web defect: ";

/** The text of what was thrown, which a `crashed` and a failure of a
    worker carry: the message of an `Error`, of any of its subclasses, and
    the text of anything else. The worker's copy of messageOf of
    src/core/thrown.ts, since the worker imports no value of core. */
export function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}

/** The text of a refusal, which the client writes to the console and a
    runner sends in `badRequest`: the kind of the message, the path of the
    field, and what was wrong with it. */
export function describeMessageError(e: MessageError): string {
  switch (e.kind) {
    case "notObject":
      return `A message between the page and a worker is ${typeWords(e.found)}, not an object.`;
    case "noKind":
      return "A message between the page and a worker has no field kind.";
    case "kindNotText":
      return `A message between the page and a worker has a kind that is ${typeWords(e.found)}, not text.`;
    case "unknownKind":
      return `A message between the page and a worker has the kind "${e.found}", which is not one of ${e.expected.join(", ")}.`;
    case "missingFields":
      return `The message ${e.messageKind} lacks the fields ${e.fields.join(", ")}${inPath(e.path)}.`;
    case "extraFields":
      return `The message ${e.messageKind} has fields it should not have${inPath(e.path)}: ${e.fields.join(", ")}.`;
    case "unknownValue":
      return `The field ${e.path} of the message ${e.messageKind} is "${e.found}", which is not one of ${e.expected.join(", ")}.`;
    case "wrongType":
      return `The field ${e.path} of the message ${e.messageKind} is ${typeWords(e.found)}, not ${e.expected}.`;
    case "wrongLength":
      return `The list ${e.path} of the message ${e.messageKind} has ${String(e.found)} elements, not ${String(e.expected)}.`;
    case "wrongSize":
      return `The field ${e.path} of the message ${e.messageKind} is ${String(e.found)}, not the size of its file, ${e.expected.toLocaleString("en-US")} bytes.`;
    case "otherProtocol":
      return `A worker gave version ${String(e.found)} of the messages, and the page is of version ${String(PROTOCOL_VERSION)}: the worker is of another build of the site.`;
  }
}

/** What a check gives: the typed value, or the first way it was wrong. */
type Checked<T> = Result<T, MessageError>;

/** A refusal, which is a `Checked` of any type. */
interface Refusal {
  readonly ok: false;
  readonly error: MessageError;
}

/** Where a check is in a message: the kind of the message and the path of
    the value, `""` for the message itself. */
interface Place {
  readonly messageKind: string;
  readonly path: string;
}

/** A check of one value of a message, at its place. */
type Check<T> = (value: unknown, place: Place) => Checked<T>;

/** The formats of an `open`. */
type Format = LoadFormat["format"];

// The kinds of each side, and the values of each field of text, tied to
// the types so that a new one is not missed.
const TO_RUNNER_KINDS: Readonly<Record<ToRunner["kind"], true>> = {
  open: true,
  run: true,
  write: true,
};
const FROM_RUNNER_KINDS: Readonly<Record<FromRunner["kind"], true>> = {
  ready: true,
  opened: true,
  result: true,
  soFar: true,
  written: true,
  refused: true,
  reopenFailed: true,
  progress: true,
  crashed: true,
  badRequest: true,
};
const TO_FILES_RUNNER_KINDS: Readonly<Record<ToFilesRunner["kind"], true>> = {
  readIndividuals: true,
};
const FROM_FILES_RUNNER_KINDS: Readonly<Record<FromFilesRunner["kind"], true>> =
  {
    ready: true,
    individuals: true,
    crashed: true,
    badRequest: true,
  };
const FORMATS: Readonly<Record<Format, true>> = { vcf: true, nei: true };
const WRITE_FORMATS: Readonly<Record<WriteJob["format"], true>> = {
  nei: true,
};
const JOB_ANALYSES: Readonly<Record<Job["analysis"], true>> = {
  diversity: true,
  individualChecks: true,
  variantChecks: true,
  filterCounts: true,
  variantsSummary: true,
  pca: true,
  popDists: true,
  ldDecay: true,
};
const RESULT_ANALYSES: Readonly<Record<JobResult["analysis"], true>> = {
  diversity: true,
  individualChecks: true,
  variantChecks: true,
  filterCounts: true,
  variantsSummary: true,
  pca: true,
  popDists: true,
  ldDecay: true,
};
const HEATMAP_ORDER_KINDS: Readonly<Record<HeatmapOrder["kind"], true>> = {
  pcoa: true,
  file: true,
};
const FILE_ORDER_REASONS: Readonly<Record<FileOrderReason, true>> = {
  twoPopulations: true,
  noDistance: true,
  allZero: true,
  notPlaced: true,
};
const PCA_METHODS: Readonly<Record<PcaMethod, true>> = {
  pca: true,
  pcoa: true,
};
const VARIANT_FILTER_KINDS: Readonly<Record<VariantFilterKind, true>> = {
  missing_data: true,
  maf: true,
  obs_het: true,
  ld: true,
  passed: true,
};
const READ_KINDS: Readonly<Record<IndividualsFileRead["kind"], true>> = {
  read: true,
  failed: true,
};
const COLUMN_TYPE_KINDS: Readonly<Record<ColumnType["kind"], true>> = {
  identifier: true,
  binary: true,
  continuous: true,
  categorical: true,
};
const FILE_ERROR_KINDS: Readonly<Record<IndividualsFileError["kind"], true>> = {
  empty: true,
  duplicateColumn: true,
  duplicateIndividual: true,
  raggedRow: true,
  files: true,
  unnamedColumn: true,
  emptyIndividual: true,
  unclosedQuote: true,
  tooLarge: true,
  unreadable: true,
  notText: true,
  variantsFile: true,
  cutShort: true,
  notXlsx: true,
  oldExcel: true,
  encrypted: true,
  emptySheet: true,
  cellError: true,
  headerError: true,
  sheetTooLarge: true,
  xlsxReaderNotLoaded: true,
};
const SEPARATORS: Readonly<Record<Separator, true>> = {
  ",": true,
  ";": true,
  "\t": true,
};
const FOUND_ENCODINGS: Readonly<Record<CsvFound["encoding"], true>> = {
  "utf-8": true,
  "windows-1252": true,
  "utf-16": true,
};
const FOUND_DECIMALS: Readonly<Record<CsvFound["decimal"], true>> = {
  ".": true,
  ",": true,
};
const OPTION_ENCODINGS: Readonly<Record<CsvOptions["encoding"], true>> = {
  auto: true,
  "utf-8": true,
  "windows-1252": true,
};
const OPTION_SEPARATORS: Readonly<Record<CsvOptions["separator"], true>> = {
  auto: true,
  ",": true,
  ";": true,
  "\t": true,
};
const OPTION_DECIMALS: Readonly<Record<CsvOptions["decimal"], true>> = {
  auto: true,
  ".": true,
  ",": true,
};

/**
 * The `protocol` of a `ready`, read before any other field, then the
 * fields of the `ready`: a worker of another version, whatever its other
 * fields, gives `otherProtocol` and not a refusal of them.
 */
function checkProtocol(
  record: object,
  place: Place,
  fields: readonly string[],
): Checked<number> {
  if (Object.hasOwn(record, "protocol")) {
    const protocol = field(record, "protocol", place, isNumber);
    if (!protocol.ok) {
      return protocol;
    }
    if (protocol.value !== PROTOCOL_VERSION) {
      return refused({ kind: "otherProtocol", found: protocol.value });
    }
  }
  const wrong = exactFields(record, place, fields);
  if (wrong !== null) {
    return wrong;
  }
  return field(record, "protocol", place, isNumber);
}

/** A `crashed` or a `badRequest`, whose one field is its message. */
function checkWorkerStop(
  record: object,
  kind: WorkerStop["kind"],
): Checked<WorkerStop> {
  const place: Place = { messageKind: kind, path: "" };
  const message = onlyField(record, place, "message", isText);
  if (!message.ok) {
    return message;
  }
  return accepted({ kind, message: message.value });
}

/** The format of an `open` with its read options: null for a `.nei`
    file, the two options of `openVcf` for a VCF, the ploidy a number or
    null. */
function checkLoadFormat(
  format: Format,
  value: unknown,
  place: Place,
): Checked<LoadFormat> {
  switch (format) {
    case "nei":
      return value === null
        ? accepted({ format, readOptions: null })
        : wrongType(
            place,
            "null, since a .nei file has no read options",
            value,
          );
    case "vcf": {
      const record = objectWith(
        value,
        place,
        ["ploidy", "onlyPassed"],
        "an object, the read options of a VCF",
      );
      if (!record.ok) {
        return record;
      }
      // A ploidy of null is read from the file by popnei.
      const ploidy = field(record.value, "ploidy", place, orNull(isNumber));
      if (!ploidy.ok) {
        return ploidy;
      }
      const onlyPassed = field(record.value, "onlyPassed", place, isBoolean);
      if (!onlyPassed.ok) {
        return onlyPassed;
      }
      return accepted({
        format,
        readOptions: { ploidy: ploidy.value, onlyPassed: onlyPassed.value },
      });
    }
  }
}

/** A `Job`, tagged by its analysis. */
function checkJob(value: unknown, place: Place): Checked<Job> {
  const tagged = taggedObject(value, place, "analysis", JOB_ANALYSES);
  if (!tagged.ok) {
    return tagged;
  }
  const { record, tag } = tagged.value;
  switch (tag) {
    case "diversity":
      return checkDiversityJob(record, place);
    case "individualChecks":
      return checkIndividualChecksJob(record, place);
    case "filterCounts":
      return checkFilterCountsJob(record, place);
    case "variantChecks":
      return checkVariantChecksJob(record, place);
    case "variantsSummary":
      return checkVariantsSummaryJob(record, place);
    case "pca":
      return checkPcaJob(record, place);
    case "popDists":
      return checkPopDistsJob(record, place);
    case "ldDecay":
      return checkLdDecayJob(record, place);
  }
}

/** The fields of the diversity's request, docs/specs/analyses/diversity.md. */
function checkDiversityJob(
  record: object,
  place: Place,
): Checked<DiversityJob> {
  const wrong = exactFields(record, place, [
    "analysis",
    "fileId",
    "filters",
    "individuals",
    "pops",
    "minNumIndividuals",
    "polyThreshold",
    "numCalledAlleles",
    "popDiversityPops",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, listOf(checkVariantFilter));
  if (!filters.ok) {
    return filters;
  }
  const individuals = field(record, "individuals", place, isTextsOrNull);
  if (!individuals.ok) {
    return individuals;
  }
  const pops = field(record, "pops", place, listOf(checkPop));
  if (!pops.ok) {
    return pops;
  }
  const minNumIndividuals = field(record, "minNumIndividuals", place, isNumber);
  if (!minNumIndividuals.ok) {
    return minNumIndividuals;
  }
  const polyThreshold = field(record, "polyThreshold", place, isNumber);
  if (!polyThreshold.ok) {
    return polyThreshold;
  }
  const numCalledAlleles = field(record, "numCalledAlleles", place, isDraw);
  if (!numCalledAlleles.ok) {
    return numCalledAlleles;
  }
  const popDiversityPops = field(
    record,
    "popDiversityPops",
    place,
    inOrderOf(pops.value.map(([pop]) => pop)),
  );
  if (!popDiversityPops.ok) {
    return popDiversityPops;
  }
  return accepted({
    analysis: "diversity",
    fileId: fileId.value,
    filters: filters.value,
    individuals: individuals.value,
    pops: pops.value,
    minNumIndividuals: minNumIndividuals.value,
    polyThreshold: polyThreshold.value,
    numCalledAlleles: numCalledAlleles.value,
    popDiversityPops: popDiversityPops.value,
  });
}

/** The draw of a diversity job, a whole number of 2 or more: popnei
    refuses a smaller one only at its second call, after a whole first
    pass, so the range is kept here against the rule of the type. */
const isDraw: Check<number> = (value, place) =>
  typeof value === "number" && Number.isInteger(value) && value >= MIN_DRAW
    ? accepted(value)
    : wrongType(place, `a whole number of ${String(MIN_DRAW)} or more`, value);

/**
 * A check of a list of texts each of which is one of `names`, in their
 * order and each once: the populations given to `calcPopDiversity`, taken
 * from those of the job. A name not among them, or one out of their order
 * or twice, is refused as of the wrong type.
 */
function inOrderOf(names: readonly string[]): Check<readonly string[]> {
  return (value, place) => {
    const texts = listOf(isText)(value, place);
    if (!texts.ok) {
      return texts;
    }
    let next = 0;
    for (const name of texts.value) {
      const at = names.indexOf(name, next);
      if (at < 0) {
        return wrongType(
          place,
          "a list of populations of the job, in their order and each once",
          value,
        );
      }
      next = at + 1;
    }
    return accepted(texts.value);
  };
}

/** The fields of the request of the statistics of each individual,
    docs/specs/analyses/individualChecks.md: the load alone, whose filters
    are none. */
function checkIndividualChecksJob(
  record: object,
  place: Place,
): Checked<IndividualChecksJob> {
  const wrong = exactFields(record, place, ["analysis", "fileId", "filters"]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, noFilters);
  if (!filters.ok) {
    return filters;
  }
  return accepted({
    analysis: "individualChecks",
    fileId: fileId.value,
    filters: filters.value,
  });
}

/** The fields of the request of the summary of the variants file,
    docs/plans/live-stats.md: the load, whose filters are none, and the
    bins of the histograms of the variants. */
function checkVariantsSummaryJob(
  record: object,
  place: Place,
): Checked<VariantsSummaryJob> {
  const wrong = exactFields(record, place, [
    "analysis",
    "fileId",
    "filters",
    "minNumIndividuals",
    "numBins",
    "range",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, noFilters);
  if (!filters.ok) {
    return filters;
  }
  const minNumIndividuals = field(record, "minNumIndividuals", place, isNumber);
  if (!minNumIndividuals.ok) {
    return minNumIndividuals;
  }
  const numBins = field(record, "numBins", place, isNumber);
  if (!numBins.ok) {
    return numBins;
  }
  const range = field(record, "range", place, checkRange);
  if (!range.ok) {
    return range;
  }
  return accepted({
    analysis: "variantsSummary",
    fileId: fileId.value,
    filters: filters.value,
    minNumIndividuals: minNumIndividuals.value,
    numBins: numBins.value,
    range: range.value,
  });
}

/** The fields of the request of the counts of the filters,
    docs/specs/analyses/filterCounts.md: its pass alone, the load, the
    filters of the variants and the list of the individuals kept. */
function checkFilterCountsJob(
  record: object,
  place: Place,
): Checked<FilterCountsJob> {
  const wrong = exactFields(record, place, [
    "analysis",
    "fileId",
    "filters",
    "individuals",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, listOf(checkVariantFilter));
  if (!filters.ok) {
    return filters;
  }
  const individuals = field(record, "individuals", place, isTextsOrNull);
  if (!individuals.ok) {
    return individuals;
  }
  return accepted({
    analysis: "filterCounts",
    fileId: fileId.value,
    filters: filters.value,
    individuals: individuals.value,
  });
}

/** The filters of a job that reads none: a list of filters, and empty. */
function noFilters(value: unknown, place: Place): Checked<readonly []> {
  const filters = listOf(checkVariantFilter)(value, place);
  if (!filters.ok) {
    return filters;
  }
  if (filters.value.length !== 0) {
    return wrongLength(place, 0, filters.value.length);
  }
  return accepted([]);
}

/** The fields of the request of the histograms of the variants,
    docs/specs/analyses/variantChecks.md, whose filters are none, with the
    list of the individuals kept. */
function checkVariantChecksJob(
  record: object,
  place: Place,
): Checked<VariantChecksJob> {
  const wrong = exactFields(record, place, [
    "analysis",
    "fileId",
    "filters",
    "individuals",
    "minNumIndividuals",
    "numBins",
    "range",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, noFilters);
  if (!filters.ok) {
    return filters;
  }
  const individuals = field(record, "individuals", place, isTextsOrNull);
  if (!individuals.ok) {
    return individuals;
  }
  const minNumIndividuals = field(record, "minNumIndividuals", place, isNumber);
  if (!minNumIndividuals.ok) {
    return minNumIndividuals;
  }
  const numBins = field(record, "numBins", place, isNumber);
  if (!numBins.ok) {
    return numBins;
  }
  const range = field(record, "range", place, checkRange);
  if (!range.ok) {
    return range;
  }
  return accepted({
    analysis: "variantChecks",
    fileId: fileId.value,
    filters: filters.value,
    individuals: individuals.value,
    minNumIndividuals: minNumIndividuals.value,
    numBins: numBins.value,
    range: range.value,
  });
}

/** The fields of the request of the principal components,
    docs/specs/analyses/pca.md: its pass, the load, the filters of the
    variants and the list of the individuals kept, its method and the
    components it keeps, a whole number. That they are 1 or more is the
    runner's to keep, as a range. */
function checkPcaJob(record: object, place: Place): Checked<PcaJob> {
  const wrong = exactFields(record, place, [
    "analysis",
    "fileId",
    "filters",
    "individuals",
    "method",
    "numCompsKept",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, listOf(checkVariantFilter));
  if (!filters.ok) {
    return filters;
  }
  const individuals = field(record, "individuals", place, isTextsOrNull);
  if (!individuals.ok) {
    return individuals;
  }
  const method = field(record, "method", place, oneOf(PCA_METHODS));
  if (!method.ok) {
    return method;
  }
  const numCompsKept = field(record, "numCompsKept", place, isWhole);
  if (!numCompsKept.ok) {
    return numCompsKept;
  }
  return accepted({
    analysis: "pca",
    fileId: fileId.value,
    filters: filters.value,
    individuals: individuals.value,
    method: method.value,
    numCompsKept: numCompsKept.value,
  });
}

/** The fields of the request of the distances between populations,
    docs/specs/analyses/popDists.md: its pass, the populations with the
    minimum, those left out, and the minimum, whose range is popnei's to
    keep. */
function checkPopDistsJob(record: object, place: Place): Checked<PopDistsJob> {
  const wrong = exactFields(record, place, [
    "analysis",
    "fileId",
    "filters",
    "individuals",
    "pops",
    "leftOut",
    "minNumIndividuals",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, listOf(checkVariantFilter));
  if (!filters.ok) {
    return filters;
  }
  const individuals = field(record, "individuals", place, isTextsOrNull);
  if (!individuals.ok) {
    return individuals;
  }
  const pops = field(record, "pops", place, listOf(checkPop));
  if (!pops.ok) {
    return pops;
  }
  const leftOut = field(record, "leftOut", place, checkLeftOut);
  if (!leftOut.ok) {
    return leftOut;
  }
  const minNumIndividuals = field(record, "minNumIndividuals", place, isNumber);
  if (!minNumIndividuals.ok) {
    return minNumIndividuals;
  }
  return accepted({
    analysis: "popDists",
    fileId: fileId.value,
    filters: filters.value,
    individuals: individuals.value,
    pops: pops.value,
    leftOut: leftOut.value,
    minNumIndividuals: minNumIndividuals.value,
  });
}

/** The populations left out of the distances, each a pair of its name and
    the whole number of its individuals kept. */
const checkLeftOut: Check<LeftOut> = listOf((value, place) => {
  if (!isList(value)) {
    return wrongType(
      place,
      "a pair of a population and its number of individuals",
      value,
    );
  }
  if (value.length !== 2) {
    return wrongLength(place, 2, value.length);
  }
  const pop = isText(value[0], inner(place, 0));
  if (!pop.ok) {
    return pop;
  }
  const numIndividuals = isWhole(value[1], inner(place, 1));
  if (!numIndividuals.ok) {
    return numIndividuals;
  }
  return accepted([pop.value, numIndividuals.value] as const);
});

/** The fields of the request of the LD decay,
    docs/specs/analyses/ldDecay.md: its pass, its populations, and the four
    numbers of popnei's options, whose ranges are popnei's to keep. */
function checkLdDecayJob(record: object, place: Place): Checked<LdDecayJob> {
  const wrong = exactFields(record, place, [
    "analysis",
    "fileId",
    "filters",
    "individuals",
    "pops",
    "minDist",
    "maxDist",
    "numBins",
    "maxAllowedMaf",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const fileId = field(record, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(record, "filters", place, listOf(checkVariantFilter));
  if (!filters.ok) {
    return filters;
  }
  const individuals = field(record, "individuals", place, isTextsOrNull);
  if (!individuals.ok) {
    return individuals;
  }
  const pops = field(record, "pops", place, listOf(checkPop));
  if (!pops.ok) {
    return pops;
  }
  const minDist = field(record, "minDist", place, isNumber);
  if (!minDist.ok) {
    return minDist;
  }
  const maxDist = field(record, "maxDist", place, isNumber);
  if (!maxDist.ok) {
    return maxDist;
  }
  const numBins = field(record, "numBins", place, isNumber);
  if (!numBins.ok) {
    return numBins;
  }
  const maxAllowedMaf = field(record, "maxAllowedMaf", place, isNumber);
  if (!maxAllowedMaf.ok) {
    return maxAllowedMaf;
  }
  return accepted({
    analysis: "ldDecay",
    fileId: fileId.value,
    filters: filters.value,
    individuals: individuals.value,
    pops: pops.value,
    minDist: minDist.value,
    maxDist: maxDist.value,
    numBins: numBins.value,
    maxAllowedMaf: maxAllowedMaf.value,
  });
}

/** The request of a written file: its format, its pass and the list of
    the individuals kept. */
function checkWriteJob(value: unknown, place: Place): Checked<WriteJob> {
  const record = objectWith(value, place, [
    "format",
    "fileId",
    "filters",
    "individuals",
  ]);
  if (!record.ok) {
    return record;
  }
  const format = field(record.value, "format", place, oneOf(WRITE_FORMATS));
  if (!format.ok) {
    return format;
  }
  const fileId = field(record.value, "fileId", place, isText);
  if (!fileId.ok) {
    return fileId;
  }
  const filters = field(
    record.value,
    "filters",
    place,
    listOf(checkVariantFilter),
  );
  if (!filters.ok) {
    return filters;
  }
  const individuals = field(record.value, "individuals", place, isTextsOrNull);
  if (!individuals.ok) {
    return individuals;
  }
  return accepted({
    format: format.value,
    fileId: fileId.value,
    filters: filters.value,
    individuals: individuals.value,
  });
}

/** The lowest and the highest edge of the bins, a pair of numbers. */
function checkRange(
  value: unknown,
  place: Place,
): Checked<readonly [number, number]> {
  if (!isList(value)) {
    return wrongType(place, "a pair of numbers", value);
  }
  if (value.length !== 2) {
    return wrongLength(place, 2, value.length);
  }
  const low = isNumber(value[0], inner(place, 0));
  if (!low.ok) {
    return low;
  }
  const high = isNumber(value[1], inner(place, 1));
  if (!high.ok) {
    return high;
  }
  return accepted([low.value, high.value] as const);
}

/** A filter of the variants, with the one threshold of its kind, the
    two of `ld`, or none for `passed`. */
function checkVariantFilter(
  value: unknown,
  place: Place,
): Checked<VariantFilter> {
  const tagged = taggedObject(value, place, "kind", VARIANT_FILTER_KINDS);
  if (!tagged.ok) {
    return tagged;
  }
  const { record, tag } = tagged.value;
  switch (tag) {
    case "missing_data": {
      const threshold = onlyField(
        record,
        place,
        "maxAllowedMissingRate",
        isNumber,
      );
      if (!threshold.ok) {
        return threshold;
      }
      return accepted({ kind: tag, maxAllowedMissingRate: threshold.value });
    }
    case "maf": {
      const threshold = onlyField(record, place, "maxAllowedMaf", isNumber);
      if (!threshold.ok) {
        return threshold;
      }
      return accepted({ kind: tag, maxAllowedMaf: threshold.value });
    }
    case "obs_het": {
      const threshold = onlyField(record, place, "maxAllowedObsHet", isNumber);
      if (!threshold.ok) {
        return threshold;
      }
      return accepted({ kind: tag, maxAllowedObsHet: threshold.value });
    }
    case "ld": {
      const wrong = exactFields(record, place, [
        "kind",
        "maxAllowedR2",
        "maxDist",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const maxAllowedR2 = field(record, "maxAllowedR2", place, isNumber);
      if (!maxAllowedR2.ok) {
        return maxAllowedR2;
      }
      const maxDist = field(record, "maxDist", place, isNumber);
      if (!maxDist.ok) {
        return maxDist;
      }
      return accepted({
        kind: tag,
        maxAllowedR2: maxAllowedR2.value,
        maxDist: maxDist.value,
      });
    }
    case "passed": {
      const wrong = exactFields(record, place, ["kind"]);
      if (wrong !== null) {
        return wrong;
      }
      return accepted({ kind: tag });
    }
  }
}

/** A population, the pair of its name and its individuals. */
function checkPop(
  value: unknown,
  place: Place,
): Checked<readonly [pop: string, individuals: readonly string[]]> {
  if (!isList(value)) {
    return wrongType(
      place,
      "a pair of a population and its individuals",
      value,
    );
  }
  if (value.length !== 2) {
    return wrongLength(place, 2, value.length);
  }
  const pop = isText(value[0], inner(place, 0));
  if (!pop.ok) {
    return pop;
  }
  const individuals = listOf(isText)(value[1], inner(place, 1));
  if (!individuals.ok) {
    return individuals;
  }
  return accepted([pop.value, individuals.value] as const);
}

/** A `JobResult`, tagged by its analysis. */
function checkJobResult(value: unknown, place: Place): Checked<JobResult> {
  const tagged = taggedObject(value, place, "analysis", RESULT_ANALYSES);
  if (!tagged.ok) {
    return tagged;
  }
  const { record, tag } = tagged.value;
  switch (tag) {
    case "diversity":
      return checkDiversityResult(record, place);
    case "individualChecks":
      return checkIndividualChecksResult(record, place);
    case "variantChecks":
      return checkVariantChecksResult(record, place);
    case "filterCounts":
      return checkFilterCountsResult(record, place);
    case "variantsSummary":
      return checkVariantsSummaryResult(record, place);
    case "pca":
      return checkPcaResult(record, place);
    case "popDists":
      return checkPopDistsResult(record, place);
    case "ldDecay":
      return checkLdDecayResult(record, place);
  }
}

/** The fields of the diversity's result, docs/specs/analyses/diversity.md,
    every array as long as its populations. */
function checkDiversityResult(
  record: object,
  place: Place,
): Checked<DiversityResult> {
  const wrong = exactFields(record, place, [
    "analysis",
    "pops",
    "numIndividuals",
    "unbiasedExpHet",
    "obsHet",
    "polyRatio",
    "numVarsWithValue",
    "fis",
    "numAllelesMean",
    "numAllelesInDraw",
    "privateAllelesTotal",
    "privateAllelesMean",
    "privateAllelesInDraw",
    "numVarsInDraw",
    "numVarsEveryPop",
    "numVarsEveryPopInDraw",
    "numCalledAlleles",
    "foldedSfs",
    "passStats",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const pops = field(record, "pops", place, listOf(isText));
  if (!pops.ok) {
    return pops;
  }
  const numPops = pops.value.length;
  const numIndividuals = field(
    record,
    "numIndividuals",
    place,
    uint32Array(numPops),
  );
  if (!numIndividuals.ok) {
    return numIndividuals;
  }
  const unbiasedExpHet = field(
    record,
    "unbiasedExpHet",
    place,
    float64Array(numPops),
  );
  if (!unbiasedExpHet.ok) {
    return unbiasedExpHet;
  }
  const obsHet = field(record, "obsHet", place, float64Array(numPops));
  if (!obsHet.ok) {
    return obsHet;
  }
  const polyRatio = field(record, "polyRatio", place, float64Array(numPops));
  if (!polyRatio.ok) {
    return polyRatio;
  }
  const numVarsWithValue = field(
    record,
    "numVarsWithValue",
    place,
    uint32Array(numPops),
  );
  if (!numVarsWithValue.ok) {
    return numVarsWithValue;
  }
  const numbers = checkPopDiversity(record, place, numPops);
  if (!numbers.ok) {
    return numbers;
  }
  const passStats = field(record, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    analysis: "diversity",
    pops: pops.value,
    numIndividuals: numIndividuals.value,
    unbiasedExpHet: unbiasedExpHet.value,
    obsHet: obsHet.value,
    polyRatio: polyRatio.value,
    numVarsWithValue: numVarsWithValue.value,
    ...numbers.value,
    passStats: passStats.value,
  });
}

/**
 * The fields of a diversity result of `calcPopDiversity`, of `numPops`
 * populations: each array as long as the populations, the two counts of
 * the variants of every population both `null` or both whole numbers, and
 * one spectrum per population, each `null` or of `floor(numCalledAlleles
 * / 2) + 1` values.
 */
function checkPopDiversity(
  record: object,
  place: Place,
  numPops: number,
): Checked<PopDiversityFields> {
  const fis = field(record, "fis", place, float64Array(numPops));
  if (!fis.ok) {
    return fis;
  }
  const numAllelesMean = field(
    record,
    "numAllelesMean",
    place,
    float64Array(numPops),
  );
  if (!numAllelesMean.ok) {
    return numAllelesMean;
  }
  const numAllelesInDraw = field(
    record,
    "numAllelesInDraw",
    place,
    float64Array(numPops),
  );
  if (!numAllelesInDraw.ok) {
    return numAllelesInDraw;
  }
  const privateAllelesTotal = field(
    record,
    "privateAllelesTotal",
    place,
    float64Array(numPops),
  );
  if (!privateAllelesTotal.ok) {
    return privateAllelesTotal;
  }
  const privateAllelesMean = field(
    record,
    "privateAllelesMean",
    place,
    float64Array(numPops),
  );
  if (!privateAllelesMean.ok) {
    return privateAllelesMean;
  }
  const privateAllelesInDraw = field(
    record,
    "privateAllelesInDraw",
    place,
    float64Array(numPops),
  );
  if (!privateAllelesInDraw.ok) {
    return privateAllelesInDraw;
  }
  const numVarsInDraw = field(
    record,
    "numVarsInDraw",
    place,
    uint32Array(numPops),
  );
  if (!numVarsInDraw.ok) {
    return numVarsInDraw;
  }
  const numVarsEveryPop = field(
    record,
    "numVarsEveryPop",
    place,
    isWholeOrNull,
  );
  if (!numVarsEveryPop.ok) {
    return numVarsEveryPop;
  }
  const numVarsEveryPopInDraw = field(
    record,
    "numVarsEveryPopInDraw",
    place,
    isWholeOrNull,
  );
  if (!numVarsEveryPopInDraw.ok) {
    return numVarsEveryPopInDraw;
  }
  if (
    (numVarsEveryPop.value === null) !==
    (numVarsEveryPopInDraw.value === null)
  ) {
    return wrongType(
      inner(place, "numVarsEveryPopInDraw"),
      numVarsEveryPop.value === null
        ? "null, as numVarsEveryPop is"
        : "a whole number, as numVarsEveryPop is",
      numVarsEveryPopInDraw.value,
    );
  }
  const numCalledAlleles = field(record, "numCalledAlleles", place, isDraw);
  if (!numCalledAlleles.ok) {
    return numCalledAlleles;
  }
  const numBins = Math.floor(numCalledAlleles.value / 2) + 1;
  const foldedSfs = field(
    record,
    "foldedSfs",
    place,
    listOfLength(numPops, orNull(float64Array(numBins))),
  );
  if (!foldedSfs.ok) {
    return foldedSfs;
  }
  return accepted({
    fis: fis.value,
    numAllelesMean: numAllelesMean.value,
    numAllelesInDraw: numAllelesInDraw.value,
    privateAllelesTotal: privateAllelesTotal.value,
    privateAllelesMean: privateAllelesMean.value,
    privateAllelesInDraw: privateAllelesInDraw.value,
    numVarsInDraw: numVarsInDraw.value,
    numVarsEveryPop: numVarsEveryPop.value,
    numVarsEveryPopInDraw: numVarsEveryPopInDraw.value,
    numCalledAlleles: numCalledAlleles.value,
    foldedSfs: foldedSfs.value,
  });
}

/** The fields of the statistics of each individual,
    docs/specs/analyses/individualChecks.md, the two arrays as long as its
    individuals. */
function checkIndividualChecksResult(
  record: object,
  place: Place,
): Checked<IndividualChecksResult> {
  const wrong = exactFields(record, place, [
    "analysis",
    ...INDIVIDUAL_STATS_FIELDS,
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const part = individualStatsFields(record, place);
  if (!part.ok) {
    return part;
  }
  return accepted({ analysis: "individualChecks", ...part.value });
}

/** The fields of the statistics of each individual, of their own result
    and of the summary of the variants file. */
const INDIVIDUAL_STATS_FIELDS = [
  "individuals",
  "missingGtRate",
  "obsHetRate",
  "passStats",
] as const;

/** The statistics of each individual, the part `individuals` of the
    summary of the variants file: an object of exactly their fields. */
function checkIndividualStatsPart(
  value: unknown,
  place: Place,
): Checked<IndividualStatsPart> {
  const record = objectWith(value, place, INDIVIDUAL_STATS_FIELDS);
  if (!record.ok) {
    return record;
  }
  return individualStatsFields(record.value, place);
}

/** The fields of the statistics of each individual in `record`, whose
    names the caller checked: the two arrays as long as its
    individuals. */
function individualStatsFields(
  record: object,
  place: Place,
): Checked<IndividualStatsPart> {
  const individuals = field(record, "individuals", place, listOf(isText));
  if (!individuals.ok) {
    return individuals;
  }
  const numIndividuals = individuals.value.length;
  const missingGtRate = field(
    record,
    "missingGtRate",
    place,
    float64Array(numIndividuals),
  );
  if (!missingGtRate.ok) {
    return missingGtRate;
  }
  const obsHetRate = field(
    record,
    "obsHetRate",
    place,
    float64Array(numIndividuals),
  );
  if (!obsHetRate.ok) {
    return obsHetRate;
  }
  const passStats = field(record, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    individuals: individuals.value,
    missingGtRate: missingGtRate.value,
    obsHetRate: obsHetRate.value,
    passStats: passStats.value,
  });
}

/** The fields of the histograms of the variants,
    docs/specs/analyses/variantChecks.md, the counts of each one fewer
    than the edges. */
function checkVariantChecksResult(
  record: object,
  place: Place,
): Checked<VariantChecksResult> {
  const wrong = exactFields(record, place, [
    "analysis",
    ...VARIANT_STATS_FIELDS,
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const part = variantStatsFields(record, place);
  if (!part.ok) {
    return part;
  }
  return accepted({ analysis: "variantChecks", ...part.value });
}

/** The fields of the histograms of the variants, of their own result and
    of the summary of the variants file. */
const VARIANT_STATS_FIELDS = [
  "binEdges",
  "missingRate",
  "maf",
  "obsHet",
  "unbiasedExpHet",
  "passStats",
] as const;

/** The histograms of the variants, the part `variants` of the summary of
    the variants file: an object of exactly their fields. */
function checkVariantStatsPart(
  value: unknown,
  place: Place,
): Checked<VariantStatsPart> {
  const record = objectWith(value, place, VARIANT_STATS_FIELDS);
  if (!record.ok) {
    return record;
  }
  return variantStatsFields(record.value, place);
}

/** The fields of the histograms of the variants in `record`, whose names
    the caller checked: the counts of each one fewer than the edges. */
function variantStatsFields(
  record: object,
  place: Place,
): Checked<VariantStatsPart> {
  const binEdges = field(record, "binEdges", place, isFloat64Array);
  if (!binEdges.ok) {
    return binEdges;
  }
  const distrib = checkDistrib(binEdges.value.length - 1);
  const missingRate = field(record, "missingRate", place, distrib);
  if (!missingRate.ok) {
    return missingRate;
  }
  const maf = field(record, "maf", place, distrib);
  if (!maf.ok) {
    return maf;
  }
  const obsHet = field(record, "obsHet", place, distrib);
  if (!obsHet.ok) {
    return obsHet;
  }
  const unbiasedExpHet = field(record, "unbiasedExpHet", place, distrib);
  if (!unbiasedExpHet.ok) {
    return unbiasedExpHet;
  }
  const passStats = field(record, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    binEdges: binEdges.value,
    missingRate: missingRate.value,
    maf: maf.value,
    obsHet: obsHet.value,
    unbiasedExpHet: unbiasedExpHet.value,
    passStats: passStats.value,
  });
}

/** A check of one histogram of the variants, of `numBins` counts. */
function checkDistrib(numBins: number): Check<VariantDistrib> {
  return (value, place) => {
    const record = objectWith(value, place, ["mean", "counts"]);
    if (!record.ok) {
      return record;
    }
    const mean = field(record.value, "mean", place, isNumber);
    if (!mean.ok) {
      return mean;
    }
    const counts = field(record.value, "counts", place, uint32Array(numBins));
    if (!counts.ok) {
      return counts;
    }
    return accepted({ mean: mean.value, counts: counts.value });
  };
}

/** The fields of the counts of the filters,
    docs/specs/analyses/filterCounts.md: the counts of the pass alone. */
function checkFilterCountsResult(
  record: object,
  place: Place,
): Checked<FilterCountsResult> {
  const wrong = exactFields(record, place, ["analysis", "passStats"]);
  if (wrong !== null) {
    return wrong;
  }
  const checked = field(record, "passStats", place, checkPassStats);
  if (!checked.ok) {
    return checked;
  }
  return accepted({ analysis: "filterCounts", passStats: checked.value });
}

/** The fields of the summary of the variants file,
    docs/plans/live-stats.md, the counts as many as the chromosomes, and
    its two parts of the statistics. */
function checkVariantsSummaryResult(
  record: object,
  place: Place,
): Checked<VariantsSummaryResult> {
  const wrong = exactFields(record, place, [
    "analysis",
    "chroms",
    "numVarsPerChrom",
    "perVar",
    "perIndividual",
    "passStats",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const chroms = field(record, "chroms", place, listOf(isText));
  if (!chroms.ok) {
    return chroms;
  }
  const numVarsPerChrom = field(
    record,
    "numVarsPerChrom",
    place,
    uint32Array(chroms.value.length),
  );
  if (!numVarsPerChrom.ok) {
    return numVarsPerChrom;
  }
  const perVar = field(record, "perVar", place, checkVariantStatsPart);
  if (!perVar.ok) {
    return perVar;
  }
  const perIndividual = field(
    record,
    "perIndividual",
    place,
    checkIndividualStatsPart,
  );
  if (!perIndividual.ok) {
    return perIndividual;
  }
  const passStats = field(record, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    analysis: "variantsSummary",
    chroms: chroms.value,
    numVarsPerChrom: numVarsPerChrom.value,
    perVar: perVar.value,
    perIndividual: perIndividual.value,
    passStats: passStats.value,
  });
}

/** A written file, the `Blob` the runner made with its size and the
    counts of its pass; `numBytes` is the `size` of the file. */
function checkWritten(value: unknown, place: Place): Checked<Written<Blob>> {
  const record = objectWith(value, place, [
    "format",
    "file",
    "numBytes",
    "passStats",
  ]);
  if (!record.ok) {
    return record;
  }
  const format = field(record.value, "format", place, oneOf(WRITE_FORMATS));
  if (!format.ok) {
    return format;
  }
  const file = field(record.value, "file", place, isBlob);
  if (!file.ok) {
    return file;
  }
  const numBytes = field(record.value, "numBytes", place, isNumber);
  if (!numBytes.ok) {
    return numBytes;
  }
  if (numBytes.value !== file.value.size) {
    return wrongSize(inner(place, "numBytes"), file.value.size, numBytes.value);
  }
  const passStats = field(record.value, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    format: format.value,
    file: file.value,
    numBytes: numBytes.value,
    passStats: passStats.value,
  });
}

/** The counts of a pass: `numVars`, and the counts of each filter under
    its kind, a kind of `VariantFilter`, in the order they came. */
function checkPassStats(value: unknown, place: Place): Checked<PassStats> {
  const record = objectWith(value, place, ["numVars", "filtering"]);
  if (!record.ok) {
    return record;
  }
  const numVars = field(record.value, "numVars", place, isNumber);
  if (!numVars.ok) {
    return numVars;
  }
  const filtering = field(record.value, "filtering", place, checkFiltering);
  if (!filtering.ok) {
    return filtering;
  }
  return accepted({ numVars: numVars.value, filtering: filtering.value });
}

/** The counts of the filters of a pass, an object whose fields are kinds
    of `VariantFilter`, kept in their order. */
function checkFiltering(
  value: unknown,
  place: Place,
): Checked<PassStats["filtering"]> {
  if (!isRecord(value)) {
    return wrongType(place, "an object", value);
  }
  const names = Object.keys(value);
  const extra = names.filter((name) => !isOneOf(name, VARIANT_FILTER_KINDS));
  if (extra.length > 0) {
    return refused({
      kind: "extraFields",
      messageKind: place.messageKind,
      path: place.path,
      fields: extra,
    });
  }
  const filtering: Partial<Record<VariantFilterKind, FilteringStats>> = {};
  for (const name of names) {
    if (!isOneOf(name, VARIANT_FILTER_KINDS)) {
      continue;
    }
    const stats = field(value, name, place, checkFilteringStats);
    if (!stats.ok) {
      return stats;
    }
    filtering[name] = stats.value;
  }
  return accepted(filtering);
}

/** The counts of one filter of a pass. */
function checkFilteringStats(
  value: unknown,
  place: Place,
): Checked<FilteringStats> {
  const record = objectWith(value, place, ["varsProcessed", "varsKept"]);
  if (!record.ok) {
    return record;
  }
  const varsProcessed = field(record.value, "varsProcessed", place, isNumber);
  if (!varsProcessed.ok) {
    return varsProcessed;
  }
  const varsKept = field(record.value, "varsKept", place, isNumber);
  if (!varsKept.ok) {
    return varsKept;
  }
  return accepted({
    varsProcessed: varsProcessed.value,
    varsKept: varsKept.value,
  });
}

/** The options of a CSV of a `readIndividuals`. */
function checkCsvOptions(value: unknown, place: Place): Checked<CsvOptions> {
  const record = objectWith(value, place, ["encoding", "separator", "decimal"]);
  if (!record.ok) {
    return record;
  }
  const encoding = field(
    record.value,
    "encoding",
    place,
    oneOf(OPTION_ENCODINGS),
  );
  if (!encoding.ok) {
    return encoding;
  }
  const separator = field(
    record.value,
    "separator",
    place,
    oneOf(OPTION_SEPARATORS),
  );
  if (!separator.ok) {
    return separator;
  }
  const decimal = field(record.value, "decimal", place, oneOf(OPTION_DECIMALS));
  if (!decimal.ok) {
    return decimal;
  }
  return accepted({
    encoding: encoding.value,
    separator: separator.value,
    decimal: decimal.value,
  });
}

/** The three options of a CSV that a read used, and the line of the first
    character it could not decode. */
function checkCsvFound(value: unknown, place: Place): Checked<CsvFound> {
  const record = objectWith(value, place, [
    "encoding",
    "separator",
    "decimal",
    "undecodedLine",
  ]);
  if (!record.ok) {
    return record;
  }
  const encoding = field(
    record.value,
    "encoding",
    place,
    oneOf(FOUND_ENCODINGS),
  );
  if (!encoding.ok) {
    return encoding;
  }
  const separator = field(record.value, "separator", place, oneOf(SEPARATORS));
  if (!separator.ok) {
    return separator;
  }
  const decimal = field(record.value, "decimal", place, oneOf(FOUND_DECIMALS));
  if (!decimal.ok) {
    return decimal;
  }
  const undecodedLine = field(
    record.value,
    "undecodedLine",
    place,
    isWholeOrNull,
  );
  if (!undecodedLine.ok) {
    return undecodedLine;
  }
  return accepted({
    encoding: encoding.value,
    separator: separator.value,
    decimal: decimal.value,
    undecodedLine: undecodedLine.value,
  });
}

/** What the reader made of the individuals file. */
function checkFileRead(
  value: unknown,
  place: Place,
): Checked<IndividualsFileRead> {
  const tagged = taggedObject(value, place, "kind", READ_KINDS);
  if (!tagged.ok) {
    return tagged;
  }
  const { record, tag } = tagged.value;
  switch (tag) {
    case "read": {
      const wrong = exactFields(record, place, [
        "kind",
        "table",
        "columns",
        "found",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const table = field(record, "table", place, checkTable);
      if (!table.ok) {
        return table;
      }
      const columns = field(record, "columns", place, listOf(checkColumnType));
      if (!columns.ok) {
        return columns;
      }
      const numColumns = table.value.columns.length;
      if (columns.value.length !== numColumns) {
        return wrongLength(
          inner(place, "columns"),
          numColumns,
          columns.value.length,
        );
      }
      const found = field(record, "found", place, orNull(checkCsvFound));
      if (!found.ok) {
        return found;
      }
      return accepted({
        kind: tag,
        table: table.value,
        columns: columns.value,
        found: found.value,
      });
    }
    case "failed": {
      const error = onlyField(record, place, "error", checkFileError);
      if (!error.ok) {
        return error;
      }
      return accepted({ kind: tag, error: error.value });
    }
  }
}

/** The table of the individuals file, every row as long as its header. */
function checkTable(value: unknown, place: Place): Checked<IndividualsTable> {
  const record = objectWith(value, place, ["columns", "rows"]);
  if (!record.ok) {
    return record;
  }
  const columns = field(record.value, "columns", place, listOf(isText));
  if (!columns.ok) {
    return columns;
  }
  const numColumns = columns.value.length;
  const rows = field(
    record.value,
    "rows",
    place,
    listOf((row, rowPlace) => checkRow(row, rowPlace, numColumns)),
  );
  if (!rows.ok) {
    return rows;
  }
  return accepted({ columns: columns.value, rows: rows.value });
}

/** A row of the table, of `numColumns` cells. */
function checkRow(
  value: unknown,
  place: Place,
  numColumns: number,
): Checked<readonly Cell[]> {
  const cells = listOf(isCell)(value, place);
  if (!cells.ok) {
    return cells;
  }
  if (cells.value.length !== numColumns) {
    return wrongLength(place, numColumns, cells.value.length);
  }
  return cells;
}

/** The type of a column. */
function checkColumnType(value: unknown, place: Place): Checked<ColumnType> {
  const tagged = taggedObject(value, place, "kind", COLUMN_TYPE_KINDS);
  if (!tagged.ok) {
    return tagged;
  }
  const { record, tag } = tagged.value;
  switch (tag) {
    case "identifier":
    case "continuous":
    case "categorical":
      return exactFields(record, place, ["kind"]) ?? accepted({ kind: tag });
    case "binary": {
      const wrong = exactFields(record, place, ["kind", "one", "zero"]);
      if (wrong !== null) {
        return wrong;
      }
      // The texts of the two values, from stage 4 (protocol.ts).
      const one = field(record, "one", place, isText);
      if (!one.ok) {
        return one;
      }
      const zero = field(record, "zero", place, isText);
      if (!zero.ok) {
        return zero;
      }
      return accepted({ kind: tag, one: one.value, zero: zero.value });
    }
  }
}

/** A way the reader refused the file, one of the kinds its spec gives. */
function checkFileError(
  value: unknown,
  place: Place,
): Checked<IndividualsFileError> {
  const tagged = taggedObject(value, place, "kind", FILE_ERROR_KINDS);
  if (!tagged.ok) {
    return tagged;
  }
  const { record, tag } = tagged.value;
  switch (tag) {
    case "empty":
    case "notText":
    case "variantsFile":
    case "cutShort":
    case "notXlsx":
    case "oldExcel":
    case "encrypted":
      return exactFields(record, place, ["kind"]) ?? accepted({ kind: tag });
    case "emptySheet": {
      const sheet = onlyField(record, place, "sheet", isText);
      if (!sheet.ok) {
        return sheet;
      }
      return accepted({ kind: tag, sheet: sheet.value });
    }
    case "cellError": {
      const error = onlyField(record, place, "error", isText);
      if (!error.ok) {
        return error;
      }
      return accepted({ kind: tag, error: error.value });
    }
    case "headerError": {
      const wrong = exactFields(record, place, [
        "kind",
        "row",
        "column",
        "error",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const row = field(record, "row", place, isNumber);
      if (!row.ok) {
        return row;
      }
      const column = field(record, "column", place, isNumber);
      if (!column.ok) {
        return column;
      }
      const error = field(record, "error", place, isText);
      if (!error.ok) {
        return error;
      }
      return accepted({
        kind: tag,
        row: row.value,
        column: column.value,
        error: error.value,
      });
    }
    case "sheetTooLarge": {
      const wrong = exactFields(record, place, [
        "kind",
        "sheet",
        "lastRow",
        "lastColumn",
        "max",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const sheet = field(record, "sheet", place, isText);
      if (!sheet.ok) {
        return sheet;
      }
      const lastRow = field(record, "lastRow", place, isNumber);
      if (!lastRow.ok) {
        return lastRow;
      }
      const lastColumn = field(record, "lastColumn", place, isText);
      if (!lastColumn.ok) {
        return lastColumn;
      }
      const max = field(record, "max", place, isNumber);
      if (!max.ok) {
        return max;
      }
      return accepted({
        kind: tag,
        sheet: sheet.value,
        lastRow: lastRow.value,
        lastColumn: lastColumn.value,
        max: max.value,
      });
    }
    case "duplicateColumn":
    case "duplicateIndividual": {
      const name = onlyField(record, place, "name", isText);
      if (!name.ok) {
        return name;
      }
      return accepted({ kind: tag, name: name.value });
    }
    case "files":
    case "unreadable":
    case "xlsxReaderNotLoaded": {
      const message = onlyField(record, place, "message", isText);
      if (!message.ok) {
        return message;
      }
      return accepted({ kind: tag, message: message.value });
    }
    case "unnamedColumn": {
      const column = onlyField(record, place, "column", isNumber);
      if (!column.ok) {
        return column;
      }
      return accepted({ kind: tag, column: column.value });
    }
    case "emptyIndividual": {
      const line = onlyField(record, place, "line", isNumber);
      if (!line.ok) {
        return line;
      }
      return accepted({ kind: tag, line: line.value });
    }
    case "raggedRow": {
      const wrong = exactFields(record, place, [
        "kind",
        "line",
        "expected",
        "found",
        "separator",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const line = field(record, "line", place, isNumber);
      if (!line.ok) {
        return line;
      }
      const expected = field(record, "expected", place, isNumber);
      if (!expected.ok) {
        return expected;
      }
      const found = field(record, "found", place, isNumber);
      if (!found.ok) {
        return found;
      }
      const separator = field(record, "separator", place, oneOf(SEPARATORS));
      if (!separator.ok) {
        return separator;
      }
      return accepted({
        kind: tag,
        line: line.value,
        expected: expected.value,
        found: found.value,
        separator: separator.value,
      });
    }
    case "unclosedQuote": {
      const wrong = exactFields(record, place, ["kind", "line", "separator"]);
      if (wrong !== null) {
        return wrong;
      }
      const line = field(record, "line", place, isNumber);
      if (!line.ok) {
        return line;
      }
      const separator = field(record, "separator", place, oneOf(SEPARATORS));
      if (!separator.ok) {
        return separator;
      }
      return accepted({
        kind: tag,
        line: line.value,
        separator: separator.value,
      });
    }
    case "tooLarge": {
      const wrong = exactFields(record, place, ["kind", "size", "max"]);
      if (wrong !== null) {
        return wrong;
      }
      const size = field(record, "size", place, isNumber);
      if (!size.ok) {
        return size;
      }
      const max = field(record, "max", place, isNumber);
      if (!max.ok) {
        return max;
      }
      return accepted({ kind: tag, size: size.value, max: max.value });
    }
  }
}

/**
 * The fields of the principal components, docs/specs/analyses/pca.md:
 * `projections` as long as the individuals times `numComps`, and
 * `explainedVariancePercent` as `numComps`, two whole numbers; of the PCA,
 * `numVarsUsed` a number and the two numbers of the PCoA `null`, and of the
 * PCoA the other way round. That `numComps` is at most `numCompsFound` is
 * the runner's to keep, as a range.
 */
function checkPcaResult(record: object, place: Place): Checked<PcaResult> {
  const wrong = exactFields(record, place, [
    "analysis",
    "method",
    "individuals",
    "numComps",
    "numCompsFound",
    "projections",
    "explainedVariancePercent",
    "numVarsUsed",
    "lingoesConstant",
    "negativeEigenvaluesPercent",
    "passStats",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const method = field(record, "method", place, oneOf(PCA_METHODS));
  if (!method.ok) {
    return method;
  }
  const individuals = field(record, "individuals", place, listOf(isText));
  if (!individuals.ok) {
    return individuals;
  }
  const numComps = field(record, "numComps", place, isWhole);
  if (!numComps.ok) {
    return numComps;
  }
  const numCompsFound = field(record, "numCompsFound", place, isWhole);
  if (!numCompsFound.ok) {
    return numCompsFound;
  }
  const projections = field(
    record,
    "projections",
    place,
    float64Array(individuals.value.length * numComps.value),
  );
  if (!projections.ok) {
    return projections;
  }
  const explainedVariancePercent = field(
    record,
    "explainedVariancePercent",
    place,
    float64Array(numComps.value),
  );
  if (!explainedVariancePercent.ok) {
    return explainedVariancePercent;
  }
  const ofPca = method.value === "pca";
  const numVarsUsed = field(
    record,
    "numVarsUsed",
    place,
    ofPca ? isNumber : isNull("the PCoA"),
  );
  if (!numVarsUsed.ok) {
    return numVarsUsed;
  }
  const lingoesConstant = field(
    record,
    "lingoesConstant",
    place,
    ofPca ? isNull("the PCA") : isNumber,
  );
  if (!lingoesConstant.ok) {
    return lingoesConstant;
  }
  const negativeEigenvaluesPercent = field(
    record,
    "negativeEigenvaluesPercent",
    place,
    ofPca ? isNull("the PCA") : isNumber,
  );
  if (!negativeEigenvaluesPercent.ok) {
    return negativeEigenvaluesPercent;
  }
  const passStats = field(record, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    analysis: "pca",
    method: method.value,
    individuals: individuals.value,
    numComps: numComps.value,
    numCompsFound: numCompsFound.value,
    projections: projections.value,
    explainedVariancePercent: explainedVariancePercent.value,
    numVarsUsed: numVarsUsed.value,
    lingoesConstant: lingoesConstant.value,
    negativeEigenvaluesPercent: negativeEigenvaluesPercent.value,
    passStats: passStats.value,
  });
}

/**
 * The fields of the result of the distances between populations,
 * docs/specs/analyses/popDists.md: `fst`, `dest` and `numVarsPerPair` of
 * k × (k − 1) / 2 values for the k populations of `pops`, `numIndividuals`
 * of k, and the order of the heatmap of each measure, each checked against
 * the k populations.
 */
function checkPopDistsResult(
  record: object,
  place: Place,
): Checked<PopDistsResult> {
  const wrong = exactFields(record, place, [
    "analysis",
    "pops",
    "numIndividuals",
    "fst",
    "dest",
    "numVarsPerPair",
    "order",
    "leftOut",
    "passStats",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const pops = field(record, "pops", place, listOf(isText));
  if (!pops.ok) {
    return pops;
  }
  const numPops = pops.value.length;
  const numPairs = (numPops * (numPops - 1)) / 2;
  const numIndividuals = field(
    record,
    "numIndividuals",
    place,
    uint32Array(numPops),
  );
  if (!numIndividuals.ok) {
    return numIndividuals;
  }
  const fst = field(record, "fst", place, float64Array(numPairs));
  if (!fst.ok) {
    return fst;
  }
  const dest = field(record, "dest", place, float64Array(numPairs));
  if (!dest.ok) {
    return dest;
  }
  const numVarsPerPair = field(
    record,
    "numVarsPerPair",
    place,
    uint32Array(numPairs),
  );
  if (!numVarsPerPair.ok) {
    return numVarsPerPair;
  }
  const order = field(record, "order", place, checkOrders(numPops));
  if (!order.ok) {
    return order;
  }
  const leftOut = field(record, "leftOut", place, checkLeftOut);
  if (!leftOut.ok) {
    return leftOut;
  }
  const passStats = field(record, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    analysis: "popDists",
    pops: pops.value,
    numIndividuals: numIndividuals.value,
    fst: fst.value,
    dest: dest.value,
    numVarsPerPair: numVarsPerPair.value,
    order: order.value,
    leftOut: leftOut.value,
    passStats: passStats.value,
  });
}

/** A check of the orders of the heatmap of the two measures, of
    `numPops` populations. */
function checkOrders(numPops: number): Check<PopDistsResult["order"]> {
  return (value, place) => {
    const record = objectWith(value, place, ["fst", "dest"]);
    if (!record.ok) {
      return record;
    }
    const fst = field(record.value, "fst", place, checkHeatmapOrder(numPops));
    if (!fst.ok) {
      return fst;
    }
    const dest = field(record.value, "dest", place, checkHeatmapOrder(numPops));
    if (!dest.ok) {
      return dest;
    }
    return accepted({ fst: fst.value, dest: dest.value });
  };
}

/**
 * A check of the order of the heatmap of one measure, of `numPops`
 * populations: of the kind `pcoa`, an `order` that holds every index of
 * the populations once; of the kind `file`, one of the four reasons, with
 * a `message` for `notPlaced` alone.
 */
function checkHeatmapOrder(numPops: number): Check<HeatmapOrder> {
  return (value, place) => {
    const tagged = taggedObject(value, place, "kind", HEATMAP_ORDER_KINDS);
    if (!tagged.ok) {
      return tagged;
    }
    const { record, tag } = tagged.value;
    switch (tag) {
      case "pcoa": {
        const wrong = exactFields(record, place, ["kind", "order"]);
        if (wrong !== null) {
          return wrong;
        }
        const order = field(record, "order", place, eachIndexOnce(numPops));
        if (!order.ok) {
          return order;
        }
        return accepted({ kind: tag, order: order.value });
      }
      case "file": {
        // The fields hang on the reason, a message with notPlaced alone, so
        // the reason is read before them; without one, what is missing is
        // named among the fields the object has.
        if (!Object.hasOwn(record, "reason")) {
          return (
            exactFields(
              record,
              place,
              Object.hasOwn(record, "message")
                ? ["kind", "reason", "message"]
                : ["kind", "reason"],
            ) ?? wrongType(place, "an object with a reason", record)
          );
        }
        const reason = field(
          record,
          "reason",
          place,
          oneOf(FILE_ORDER_REASONS),
        );
        if (!reason.ok) {
          return reason;
        }
        const wrong = exactFields(
          record,
          place,
          reason.value === "notPlaced"
            ? ["kind", "reason", "message"]
            : ["kind", "reason"],
        );
        if (wrong !== null) {
          return wrong;
        }
        if (reason.value !== "notPlaced") {
          return accepted({ kind: tag, reason: reason.value });
        }
        const message = field(record, "message", place, isText);
        if (!message.ok) {
          return message;
        }
        return accepted({
          kind: tag,
          reason: reason.value,
          message: message.value,
        });
      }
    }
  };
}

/** A check of a `Uint32Array` that holds each of the indexes 0 to
    `numPops` − 1 once, in any order; one that holds an index twice, or one
    beyond them, is refused as of the wrong type. */
function eachIndexOnce(numPops: number): Check<Uint32Array> {
  return (value, place) => {
    const array = uint32Array(numPops)(value, place);
    if (!array.ok) {
      return array;
    }
    const seen = new Set<number>();
    for (const index of array.value) {
      if (index >= numPops || seen.has(index)) {
        return wrongType(
          place,
          `a Uint32Array that holds each index of the ${String(numPops)} populations once`,
          value,
        );
      }
      seen.add(index);
    }
    return accepted(array.value);
  };
}

/**
 * The fields of the LD decay's result, docs/specs/analyses/ldDecay.md: the
 * bins are as many as `smallestDist` holds, which the runner makes from
 * the job's `numBins`; `largestDist` is as long, `numPairs`, `meanR2` and
 * `sdR2` the populations × the bins, and the other arrays one value per
 * population.
 */
function checkLdDecayResult(
  record: object,
  place: Place,
): Checked<LdDecayResult> {
  const wrong = exactFields(record, place, [
    "analysis",
    "pops",
    "numIndividuals",
    "numVars",
    "smallestDist",
    "largestDist",
    "numPairs",
    "meanR2",
    "sdR2",
    "rhoPerBp",
    "r2AtZero",
    "halfDist",
    "passStats",
  ]);
  if (wrong !== null) {
    return wrong;
  }
  const pops = field(record, "pops", place, listOf(isText));
  if (!pops.ok) {
    return pops;
  }
  const numPops = pops.value.length;
  const numIndividuals = field(
    record,
    "numIndividuals",
    place,
    uint32Array(numPops),
  );
  if (!numIndividuals.ok) {
    return numIndividuals;
  }
  const numVars = field(record, "numVars", place, float64Array(numPops));
  if (!numVars.ok) {
    return numVars;
  }
  const smallestDist = field(record, "smallestDist", place, isFloat64Array);
  if (!smallestDist.ok) {
    return smallestDist;
  }
  const numBins = smallestDist.value.length;
  const largestDist = field(
    record,
    "largestDist",
    place,
    float64Array(numBins),
  );
  if (!largestDist.ok) {
    return largestDist;
  }
  const ofEveryBin = float64Array(numPops * numBins);
  const numPairs = field(record, "numPairs", place, ofEveryBin);
  if (!numPairs.ok) {
    return numPairs;
  }
  const meanR2 = field(record, "meanR2", place, ofEveryBin);
  if (!meanR2.ok) {
    return meanR2;
  }
  const sdR2 = field(record, "sdR2", place, ofEveryBin);
  if (!sdR2.ok) {
    return sdR2;
  }
  const rhoPerBp = field(record, "rhoPerBp", place, float64Array(numPops));
  if (!rhoPerBp.ok) {
    return rhoPerBp;
  }
  const r2AtZero = field(record, "r2AtZero", place, float64Array(numPops));
  if (!r2AtZero.ok) {
    return r2AtZero;
  }
  const halfDist = field(record, "halfDist", place, float64Array(numPops));
  if (!halfDist.ok) {
    return halfDist;
  }
  const passStats = field(record, "passStats", place, checkPassStats);
  if (!passStats.ok) {
    return passStats;
  }
  return accepted({
    analysis: "ldDecay",
    pops: pops.value,
    numIndividuals: numIndividuals.value,
    numVars: numVars.value,
    smallestDist: smallestDist.value,
    largestDist: largestDist.value,
    numPairs: numPairs.value,
    meanR2: meanR2.value,
    sdR2: sdR2.value,
    rhoPerBp: rhoPerBp.value,
    r2AtZero: r2AtZero.value,
    halfDist: halfDist.value,
    passStats: passStats.value,
  });
}

/** The one field of an object besides its `kind`, checked by `check`,
    when the object has these two fields and no other. */
function onlyField<T>(
  record: object,
  place: Place,
  name: string,
  check: Check<T>,
): Checked<T> {
  const wrong = exactFields(record, place, ["kind", name]);
  if (wrong !== null) {
    return wrong;
  }
  return field(record, name, place, check);
}

/**
 * The message as an object and its kind, when the kind is one of `kinds`;
 * otherwise the way it was wrong.
 */
function knownKind<K extends string>(
  message: unknown,
  kinds: Readonly<Record<K, true>>,
): Checked<{ readonly record: object; readonly kind: K }> {
  if (!isRecord(message)) {
    return refused({ kind: "notObject", found: typeName(message) });
  }
  if (!Object.hasOwn(message, "kind")) {
    return refused({ kind: "noKind" });
  }
  const kind = ownField(message, "kind");
  if (typeof kind !== "string") {
    return refused({ kind: "kindNotText", found: typeName(kind) });
  }
  if (!isOneOf(kind, kinds)) {
    return refused({
      kind: "unknownKind",
      found: kind,
      expected: Object.keys(kinds),
    });
  }
  return accepted({ record: message, kind });
}

/**
 * An object inside a message whose field `tag` tells which of `tags` it
 * is, with the object and its tag; otherwise the way it was wrong. Its
 * other fields are left to the caller, which knows them by the tag.
 */
function taggedObject<K extends string>(
  value: unknown,
  place: Place,
  tag: string,
  tags: Readonly<Record<K, true>>,
): Checked<{ readonly record: object; readonly tag: K }> {
  if (!isRecord(value)) {
    return wrongType(place, "an object", value);
  }
  if (!Object.hasOwn(value, tag)) {
    return refused({
      kind: "missingFields",
      messageKind: place.messageKind,
      path: place.path,
      fields: [tag],
    });
  }
  const checked = field(value, tag, place, oneOf(tags));
  if (!checked.ok) {
    return checked;
  }
  return accepted({ record: value, tag: checked.value });
}

/** An object inside a message with exactly the fields `names`; `expected`
    says what it is, for a value that is not an object. */
function objectWith(
  value: unknown,
  place: Place,
  names: readonly string[],
  expected = "an object",
): Checked<object> {
  if (!isRecord(value)) {
    return wrongType(place, expected, value);
  }
  return exactFields(value, place, names) ?? accepted(value);
}

/** The value of the field `name` of `record`, checked at its place. */
function field<T>(
  record: object,
  name: string,
  place: Place,
  check: Check<T>,
): Checked<T> {
  return check(ownField(record, name), inner(place, name));
}

/** The place of a field or an element inside the value at `place`. */
function inner(place: Place, name: string | number): Place {
  const part = String(name);
  return {
    messageKind: place.messageKind,
    path: place.path === "" ? part : `${place.path}.${part}`,
  };
}

/** A check of a list whose every element passes `check`. */
function listOf<T>(check: Check<T>): Check<readonly T[]> {
  return (value, place) => {
    if (!isList(value)) {
      return wrongType(place, "a list", value);
    }
    const checked: T[] = [];
    for (const [index, element] of value.entries()) {
      const one = check(element, inner(place, index));
      if (!one.ok) {
        return one;
      }
      checked.push(one.value);
    }
    return accepted(checked);
  };
}

/** A check of a list of `length` elements, each of which passes
    `check`. */
function listOfLength<T>(length: number, check: Check<T>): Check<readonly T[]> {
  return (value, place) => {
    const checked = listOf(check)(value, place);
    if (!checked.ok) {
      return checked;
    }
    return checked.value.length === length
      ? checked
      : wrongLength(place, length, checked.value.length);
  };
}

/** A check of a text that is one of `values`. */
function oneOf<K extends string>(values: Readonly<Record<K, true>>): Check<K> {
  return (value, place) => {
    const expected = Object.keys(values);
    if (typeof value !== "string") {
      return wrongType(place, `one of ${expected.join(", ")}`, value);
    }
    if (!isOneOf(value, values)) {
      return refused({
        kind: "unknownValue",
        messageKind: place.messageKind,
        path: place.path,
        found: value,
        expected,
      });
    }
    return accepted(value);
  };
}

/** A check of a `Float64Array` of `length` numbers. */
function float64Array(length: number): Check<Float64Array> {
  return (value, place) => {
    if (!(value instanceof Float64Array)) {
      return wrongType(place, "a Float64Array", value);
    }
    return value.length === length
      ? accepted(value)
      : wrongLength(place, length, value.length);
  };
}

/** A `Float64Array` of any length. */
const isFloat64Array: Check<Float64Array> = (value, place) =>
  value instanceof Float64Array
    ? accepted(value)
    : wrongType(place, "a Float64Array", value);

/** A check of a `Uint32Array` of `length` numbers. */
function uint32Array(length: number): Check<Uint32Array> {
  return (value, place) => {
    if (!(value instanceof Uint32Array)) {
      return wrongType(place, "a Uint32Array", value);
    }
    return value.length === length
      ? accepted(value)
      : wrongLength(place, length, value.length);
  };
}

/** Text. */
const isText: Check<string> = (value, place) =>
  typeof value === "string" ? accepted(value) : wrongType(place, "text", value);

/** A number, NaN among them: popnei gives one where a value is not
    defined. */
const isNumber: Check<number> = (value, place) =>
  typeof value === "number"
    ? accepted(value)
    : wrongType(place, "a number", value);

/** A whole number, as an id is. */
const isWhole: Check<number> = (value, place) =>
  typeof value === "number" && Number.isInteger(value)
    ? accepted(value)
    : wrongType(place, "a whole number", value);

/** A whole number, or null, as the line of a character not decoded. */
const isWholeOrNull: Check<number | null> = (value, place) =>
  value === null ? accepted(null) : isWhole(value, place);

/** A check of `null`, or of what `check` accepts: the options of a CSV
    and what was found of them, `null` for an xlsx. */
function orNull<T>(check: Check<T>): Check<T | null> {
  return (value, place) =>
    value === null ? accepted(null) : check(value, place);
}

/** A check of `null`, the field of a method that does not have it; `of`
    names the method, for the words of the refusal. */
function isNull(of: string): Check<null> {
  return (value, place) =>
    value === null
      ? accepted(null)
      : wrongType(place, `null, since ${of} does not have it`, value);
}

/** A boolean. */
const isBoolean: Check<boolean> = (value, place) =>
  typeof value === "boolean"
    ? accepted(value)
    : wrongType(place, "a boolean", value);

/** A list of texts, or null, as the individuals kept of a job. */
const isTextsOrNull: Check<readonly string[] | null> = (value, place) =>
  value === null
    ? accepted(null)
    : isList(value)
      ? listOf(isText)(value, place)
      : wrongType(place, "a list of texts, or null", value);

/** A `Blob`, a file made in a worker. */
const isBlob: Check<Blob> = (value, place) =>
  value instanceof Blob ? accepted(value) : wrongType(place, "a Blob", value);

/** A `File`, the handle of a file the user picked. */
const isFile: Check<File> = (value, place) =>
  value instanceof File ? accepted(value) : wrongType(place, "a File", value);

/** A value of a cell that is not missing. */
const isCellValue: Check<string | number | boolean> = (value, place) =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"
    ? accepted(value)
    : wrongType(place, "text, a number or a boolean", value);

/** A cell of the table, null where it is missing. */
const isCell: Check<Cell> = (value, place) =>
  value === null ? accepted(null) : isCellValue(value, place);

/**
 * The fields missing from an object of the message, or those it should
 * not have, or null when it has exactly `expected`. Only its own fields
 * are read, so a field every object inherits is never one of them.
 */
function exactFields(
  record: object,
  place: Place,
  expected: readonly string[],
): Refusal | null {
  const present = Object.keys(record);
  const missing = expected.filter((name) => !present.includes(name));
  if (missing.length > 0) {
    return refused({
      kind: "missingFields",
      messageKind: place.messageKind,
      path: place.path,
      fields: missing,
    });
  }
  const extra = present.filter((name) => !expected.includes(name));
  if (extra.length > 0) {
    return refused({
      kind: "extraFields",
      messageKind: place.messageKind,
      path: place.path,
      fields: extra,
    });
  }
  return null;
}

function accepted<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value };
}

function refused(error: MessageError): Refusal {
  return { ok: false, error };
}

function wrongType(place: Place, expected: string, value: unknown): Refusal {
  return refused({
    kind: "wrongType",
    messageKind: place.messageKind,
    path: place.path,
    expected,
    found: typeName(value),
  });
}

function wrongLength(place: Place, expected: number, found: number): Refusal {
  return refused({
    kind: "wrongLength",
    messageKind: place.messageKind,
    path: place.path,
    expected,
    found,
  });
}

function wrongSize(place: Place, expected: number, found: number): Refusal {
  return refused({
    kind: "wrongSize",
    messageKind: place.messageKind,
    path: place.path,
    expected,
    found,
  });
}

function isOneOf<K extends string>(
  value: string,
  values: Readonly<Record<K, true>>,
): value is K {
  return Object.hasOwn(values, value);
}

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function typeName(value: unknown): TypeName {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

/** A type as a sentence names it. */
function typeWords(found: TypeName): string {
  switch (found) {
    case "undefined":
    case "null":
      return found;
    case "array":
      return "a list";
    case "object":
      return "an object";
    case "boolean":
      return "a boolean";
    case "number":
      return "a number";
    case "bigint":
      return "a bigint";
    case "string":
      return "text";
    case "symbol":
      return "a symbol";
    case "function":
      return "a function";
  }
}

/** The words that place fields inside an object of the message, none for
    the message itself. */
function inPath(path: string): string {
  return path === "" ? "" : ` in ${path}`;
}

/**
 * The value of a field of the object itself, not of its prototype, so that
 * a message never passes on a field such as `constructor` that every
 * object inherits.
 */
function ownField(record: object, name: string): unknown {
  return Object.getOwnPropertyDescriptor(record, name)?.value;
}
