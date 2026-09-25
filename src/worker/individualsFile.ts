/**
 * The read of the individuals file in the light worker: its size checked,
 * its bytes read and decoded, and the text given to the reader of CSV and
 * TSV (docs/specs/worker/individuals.md, "The bytes and the encoding").
 * It is apart from filesRunner.ts so that it runs under Vitest in node,
 * where a `Blob` and `TextDecoder` exist and a worker does not.
 */

import type { IndividualsFileRead } from "./messages.ts";
import type { CsvFound, CsvOptions } from "./protocol.ts";
import { readCsv } from "./individuals/csv.ts";

/**
 * The largest individuals file read, in bytes: 20 MB. A table of 10,000
 * individuals with 100 columns of 10 characters is about 11 MB; a larger
 * file is usually the variants file picked by mistake, whose reading whole
 * would end the worker for lack of memory. An estimate, to be revised when
 * a file of this size is tried.
 */
export const MAX_INDIVIDUALS_FILE_BYTES = 20_000_000;

/** What of a File the read uses; a File and a Blob are one. */
export interface BytesSource {
  /** The size of the file, in bytes. */
  readonly size: number;
  /** Its bytes, whole. */
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Reads the individuals file `file` with the options `csv`, and never
 * rejects. It refuses a file of more than `MAX_INDIVIDUALS_FILE_BYTES`,
 * `tooLarge`, without reading it; one the browser cannot read,
 * `unreadable`; and one with a byte 0 that does not start with the mark of
 * UTF-16, `notText`. A file with the mark of UTF-16 is decoded as UTF-16
 * whatever `csv.encoding` says. The BOM of UTF-8 is removed. With
 * `"auto"`, the text is decoded as UTF-8, and as Windows-1252 when it is
 * not valid UTF-8. The text then goes to `readCsv`, whose refusals are
 * the failed read.
 */
export async function readIndividualsFile(
  file: BytesSource,
  csv: CsvOptions,
): Promise<IndividualsFileRead> {
  if (file.size > MAX_INDIVIDUALS_FILE_BYTES) {
    return {
      kind: "failed",
      error: {
        kind: "tooLarge",
        size: file.size,
        max: MAX_INDIVIDUALS_FILE_BYTES,
      },
    };
  }
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    return {
      kind: "failed",
      error: {
        kind: "unreadable",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  const decoded = decode(new Uint8Array(buffer), csv.encoding);
  if (decoded === null) {
    return { kind: "failed", error: { kind: "notText" } };
  }
  const read = readCsv(decoded.text, {
    separator: csv.separator,
    decimal: csv.decimal,
  });
  if (!read.ok) return { kind: "failed", error: read.error };
  return {
    kind: "read",
    table: read.value.table,
    columns: read.value.columns,
    found: {
      encoding: decoded.encoding,
      separator: read.value.separator,
      decimal: read.value.decimal,
    },
  };
}

/** The text of the bytes and the encoding it was decoded with, or null
    for bytes that are not text. */
function decode(
  bytes: Uint8Array,
  encoding: CsvOptions["encoding"],
): { readonly text: string; readonly encoding: CsvFound["encoding"] } | null {
  const [first, second] = bytes;
  if (first === 0xff && second === 0xfe) {
    return {
      text: new TextDecoder("utf-16le").decode(bytes),
      encoding: "utf-16",
    };
  }
  if (first === 0xfe && second === 0xff) {
    return {
      text: new TextDecoder("utf-16be").decode(bytes),
      encoding: "utf-16",
    };
  }
  if (bytes.includes(0)) return null;
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const body = hasBom ? bytes.subarray(3) : bytes;
  switch (encoding) {
    case "utf-8":
      return { text: new TextDecoder("utf-8").decode(body), encoding };
    case "windows-1252":
      return { text: new TextDecoder("windows-1252").decode(body), encoding };
    case "auto":
      try {
        return {
          text: new TextDecoder("utf-8", { fatal: true }).decode(body),
          encoding: "utf-8",
        };
      } catch {
        return {
          text: new TextDecoder("windows-1252").decode(body),
          encoding: "windows-1252",
        };
      }
  }
}
