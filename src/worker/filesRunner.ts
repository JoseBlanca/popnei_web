/**
 * The light worker, the second thread of the tab, which reads the files of
 * the user and holds no popnei (docs/architecture.md, section 6). It
 * answers one request, `readIndividuals`, with what `readIndividualsFile`
 * makes of the file, and holds nothing between two reads but the files
 * wasm, the package of xlsx_rs, once an xlsx has loaded it
 * (docs/specs/worker/individuals.md, "The TypeScript interface" and "The
 * package of xlsx_rs, loaded on first need").
 *
 * Every request gets its answer or a `crashed` or `badRequest`, after
 * which the worker closes itself (docs/specs/worker/messages.md, "A worker
 * that cannot go on"): the client has no timeout, and a request with no
 * answer would wait for ever.
 */

import { readIndividualsFile } from "./individualsFile.ts";
import type { XlsxReader } from "./individualsFile.ts";
import {
  PROTOCOL_VERSION,
  describeMessageError,
  messageOf,
  parseToFilesRunner,
} from "./messages.ts";
import type { FromFilesRunner, WorkerStop } from "./messages.ts";
import { readXlsxCells } from "./xlsxCells.ts";
// Its types alone, which the build erases: the package itself is loaded
// on the first xlsx, with import(), below.
import type * as XlsxRs from "xlsx_rs";

/** The package of xlsx_rs, its JavaScript and its wasm. */
type FilesWasm = typeof XlsxRs;

/** The files wasm loaded, or being loaded; `null` before the first xlsx
    and after a load that failed, so that the next xlsx tries again. */
let filesReady: Promise<FilesWasm> | null = null;

/** Imports the package, which Vite makes a file of its own downloaded
    only here, and awaits its `init`, which fetches `xlsx_rs_bg.wasm`
    from beside it. */
async function loadFiles(): Promise<FilesWasm> {
  const files = await import("xlsx_rs");
  await files.default();
  return files;
}

/**
 * The cells of an xlsx, read by the files wasm, loaded on the first xlsx.
 * A load that fails, a network that drops or a page left open across a
 * deploy of the site, is forgotten and the read fails as
 * `xlsxReaderNotLoaded`, with the browser's message for the console; the
 * worker goes on, and a CSV read after it is read. A browser may keep a
 * failed `import()` as failed for the life of the worker, and then the
 * next xlsx fails the same way, which a new worker mends.
 */
const readXlsx: XlsxReader = async (bytes) => {
  let files: FilesWasm;
  try {
    files = await (filesReady ??= loadFiles());
  } catch (thrown) {
    filesReady = null;
    const message = messageOf(thrown);
    console.error(
      `popnei_web: the reader of xlsx files did not load. ${message}`,
    );
    return {
      kind: "failed",
      error: { kind: "xlsxReaderNotLoaded", message },
    };
  }
  const read = readXlsxCells(files.readXlsx, bytes);
  if (read.kind === "failed" && read.error.kind === "files") {
    console.error(
      `popnei_web: xlsx_rs could not read the file. ${read.error.message}`,
    );
  }
  return read;
};

/** Posts a message to the page. */
function post(message: FromFilesRunner): void {
  postMessage(message);
}

/** Posts a message after which the worker cannot go on, and closes it. */
function stop(message: WorkerStop): void {
  post(message);
  close();
}

async function handle(data: unknown): Promise<void> {
  try {
    const request = parseToFilesRunner(data);
    if (!request.ok) {
      stop({
        kind: "badRequest",
        message: describeMessageError(request.error),
      });
      return;
    }
    const { id, file, csv } = request.value;
    const read = await readIndividualsFile(file, csv, readXlsx);
    post({ kind: "individuals", id, read });
  } catch (thrown) {
    stop({ kind: "crashed", message: messageOf(thrown) });
  }
}

addEventListener("message", (event: MessageEvent<unknown>) => {
  void handle(event.data);
});

addEventListener("messageerror", () => {
  stop({
    kind: "badRequest",
    message: "a request the browser could not copy into the worker",
  });
});

addEventListener("error", (event: ErrorEvent) => {
  event.preventDefault();
  stop({ kind: "crashed", message: event.message });
});

addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  stop({ kind: "crashed", message: messageOf(event.reason) });
});

post({ kind: "ready", protocol: PROTOCOL_VERSION });
