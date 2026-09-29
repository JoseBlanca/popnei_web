/**
 * The read of the individuals file in the light worker: its size checked,
 * its bytes read, and then, for a CSV or a TSV, decoded and given to the
 * reader of the text, or, for an xlsx, given to the files wasm and its
 * cells to the reader of the cells (docs/specs/worker/individuals.md,
 * "The bytes and the encoding" and "The xlsx"). It is apart from
 * filesRunner.ts so that it runs under Vitest in node, where a `Blob` and
 * `TextDecoder` exist and a worker does not, with a function of the test
 * in the place of the files wasm.
 */

import type { IndividualsFileRead } from "./messages.ts";
import type { CsvFound, CsvOptions } from "./protocol.ts";
import { readCsv } from "./individuals/csv.ts";
import { readSheet } from "./individuals/sheet.ts";
import type { SheetCellsRead } from "./individuals/sheet.ts";

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

/** Reads the cells of an xlsx with the files wasm: a refusal, a file
    calamine cannot open and a files wasm that could not be downloaded are
    a failed read; rejects only for a defect of ours, a result of the files
    wasm that breaks its contract (readXlsxCells of xlsxCells.ts). */
export type XlsxReader = (bytes: Uint8Array) => Promise<SheetCellsRead>;

/**
 * Reads the individuals file `file`, a CSV or a TSV with the options
 * `csv`, or an xlsx when `csv` is `null`, whose cells `readXlsx` reads.
 * It rejects only when `readXlsx` rejects, for a defect of ours. It
 * refuses a file of more than `MAX_INDIVIDUALS_FILE_BYTES`,
 * `tooLarge`, without reading it; one the browser cannot read,
 * `unreadable`; one with a byte 0 that does not start with the mark of
 * UTF-16, `notText`; and one with that mark that ends in the middle of a
 * character, `cutShort`. A file with the mark of UTF-16 is decoded as
 * UTF-16 whatever `csv.encoding` says. The BOM of UTF-8 is removed, and
 * with `"auto"` decides UTF-8. With `"auto"` and no BOM, the text is
 * decoded as UTF-8, and as Windows-1252 when it is not valid UTF-8. The
 * text then goes to `readCsv`, whose refusals are the failed read; the
 * line of its first character not decoded, U+FFFD, is
 * `found.undecodedLine`.
 */
export async function readIndividualsFile(
  file: BytesSource,
  csv: CsvOptions | null,
  readXlsx: XlsxReader,
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
        message: unreadableMessage(error),
      },
    };
  }
  if (csv === null) return readXlsxFile(new Uint8Array(buffer), readXlsx);
  const decoded = decode(new Uint8Array(buffer), csv.encoding);
  if (decoded === "notText" || decoded === "cutShort") {
    return { kind: "failed", error: { kind: decoded } };
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
      undecodedLine: undecodedLine(decoded.text),
    },
  };
}

/** The read of the bytes of an xlsx: its cells, given by `readXlsx`, made
    the table by `readSheet`, with `found` `null`, since an xlsx has no
    encoding, separator or decimal mark to report; or the refusal of
    either. */
async function readXlsxFile(
  bytes: Uint8Array,
  readXlsx: XlsxReader,
): Promise<IndividualsFileRead> {
  const cells = await readXlsx(bytes);
  if (cells.kind === "failed") return cells;
  const read = readSheet(cells.cells);
  if (!read.ok) return { kind: "failed", error: read.error };
  return {
    kind: "read",
    table: read.value.table,
    columns: read.value.columns,
    found: null,
  };
}

/** The name and the message of what the browser threw, for the console:
    the name tells a file deleted, `NotFoundError`, from one changed,
    `NotReadableError`. */
function unreadableMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.message === "" ? error.name : `${error.name}: ${error.message}`;
}

/** The text of the bytes and the encoding it was decoded with; or
    `notText` for bytes that are not text, and `cutShort` for UTF-16 that
    ends in the middle of a character. */
function decode(
  bytes: Uint8Array,
  encoding: CsvOptions["encoding"],
):
  | { readonly text: string; readonly encoding: CsvFound["encoding"] }
  | "notText"
  | "cutShort" {
  const [first, second] = bytes;
  if (first === 0xff && second === 0xfe) {
    return endsInCharacter(bytes, true)
      ? {
          text: new TextDecoder("utf-16le").decode(bytes),
          encoding: "utf-16",
        }
      : "cutShort";
  }
  if (first === 0xfe && second === 0xff) {
    return endsInCharacter(bytes, false)
      ? {
          text: new TextDecoder("utf-16be").decode(bytes),
          encoding: "utf-16",
        }
      : "cutShort";
  }
  if (bytes.includes(0)) return "notText";
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const body = hasBom ? bytes.subarray(3) : bytes;
  switch (encoding) {
    case "utf-8":
      return { text: new TextDecoder("utf-8").decode(body), encoding };
    case "windows-1252":
      return { text: new TextDecoder("windows-1252").decode(body), encoding };
    case "auto":
      // The BOM says the encoding, as the mark of UTF-16 does: a bad byte
      // of such a file is shown as U+FFFD, and the rest read as UTF-8.
      if (hasBom) {
        return {
          text: new TextDecoder("utf-8").decode(body),
          encoding: "utf-8",
        };
      }
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

/** Whether UTF-16 bytes, their mark included, end with a whole character:
    an even number of bytes, the last two not the first half of a
    character written in four, a high surrogate, U+D800 to U+DBFF. */
function endsInCharacter(bytes: Uint8Array, littleEndian: boolean): boolean {
  if (bytes.length % 2 !== 0) return false;
  const high = bytes[bytes.length - (littleEndian ? 1 : 2)];
  return high === undefined || high < 0xd8 || high > 0xdb;
}

/** The replacement character, which a decoder puts where it could not
    decode a character. */
const REPLACEMENT = "�";

/** The line of the first replacement character of `text`, counted from 1
    with the line endings of the reader, `\r\n`, `\n` and `\r`; `null` when
    there is none. */
function undecodedLine(text: string): number | null {
  const index = text.indexOf(REPLACEMENT);
  if (index === -1) return null;
  const before = text.slice(0, index);
  const breaks = before.match(/\r\n|\n|\r/g);
  return (breaks?.length ?? 0) + 1;
}
