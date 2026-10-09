/**
 * The light worker, the second thread of the tab, which reads the files of
 * the user and holds no popnei (docs/architecture.md, section 6). It
 * answers one request, `readIndividuals`, with what `readIndividualsFile`
 * makes of the file, and holds nothing between two reads but the files
 * wasm, table_io's package, once the first read has loaded it
 * (docs/specs/worker/individuals.md, "The TypeScript interface" and
 * "Loading the files wasm on first need").
 *
 * Every request gets its answer or a `crashed` or `badRequest`, after
 * which the worker closes itself (docs/specs/worker/messages.md, "A worker
 * that cannot go on"): the client has no timeout, and a request with no
 * answer would wait for ever.
 */

import { readIndividualsFile } from "./individualsFile.ts";
import type { LoadImporter } from "./individualsFile.ts";
import {
  PROTOCOL_VERSION,
  describeMessageError,
  messageOf,
  parseToFilesRunner,
} from "./messages.ts";
import type { FromFilesRunner, WorkerStop } from "./messages.ts";
// Its types alone, which the build erases: the package itself is loaded
// on the first read, with import(), below.
import type * as TableIo from "table_io";

/** The package of table_io, its JavaScript and its wasm. */
type FilesWasm = typeof TableIo;

/** The files wasm loaded, or being loaded; `null` before the first read
    and after a load that failed, so that the next read tries again. */
let filesReady: Promise<FilesWasm> | null = null;

/** The address of the JavaScript of the package that the last failed
    download named, or `null` when none named one. */
let failedAddress: string | null = null;

/** The retries asked so far, which number the addresses they ask for. */
let retries = 0;

/** The first address of http or https in the message of a failure. */
const ADDRESS = /https?:\/\/[^\s"'<>]+/u;

/**
 * Imports the package, which Vite makes a file of its own downloaded only
 * here, and awaits its `init`, which fetches `table_io_bg.wasm` from beside
 * it. A browser may give the same failure to a later `import()` of the
 * same address without asking the network, as Chromium 153 does for the
 * life of the worker, where WebKit 26.6 asks again; so, as load3d.ts does
 * for the 3D view, a retry after a failed download asks for the same file
 * at another address, with `?retry=‹n›` after it, the address taken from
 * the message of the failure, "Failed to fetch dynamically imported
 * module: ‹address›" in Chromium. When the message holds none, as
 * WebKit's does, the retry is the plain `import()`. The wasm is found
 * from the address of the JavaScript, whatever its query.
 */
async function loadFiles(): Promise<FilesWasm> {
  let files: FilesWasm;
  try {
    files =
      failedAddress === null
        ? await import("table_io")
        : await importAgain(failedAddress);
  } catch (thrown) {
    failedAddress = ADDRESS.exec(messageOf(thrown))?.[0] ?? failedAddress;
    throw thrown;
  }
  await files.default();
  return files;
}

/** The JavaScript of the package at `address`, with a query that makes
    it another address for the browser; a module of other exports is a
    defect of ours, and throws. */
async function importAgain(address: string): Promise<FilesWasm> {
  retries += 1;
  const url = new URL(address);
  url.searchParams.set("retry", String(retries));
  // The address is Vite's own file of the package, which the worker asked
  // for first; Vite is told to leave this import as it is.
  const module: unknown = await import(/* @vite-ignore */ url.href);
  if (!isFilesWasm(module)) {
    throw new Error(
      `popnei_web defect: ${url.href} is not the package of table_io.`,
    );
  }
  return module;
}

/** Whether `module` has the two functions of the package the worker
    calls, its init and importTable. */
function isFilesWasm(module: unknown): module is FilesWasm {
  return (
    typeof module === "object" &&
    module !== null &&
    "default" in module &&
    typeof module.default === "function" &&
    "importTable" in module &&
    typeof module.importTable === "function"
  );
}

/**
 * The importTable of the files wasm, loaded on the first read of any
 * file. A load that fails, a network that drops or a page left open
 * across a deploy of the site, is forgotten and given as `notLoaded`,
 * with the browser's message, which goes to the console; the worker goes
 * on, and the next read tries again.
 */
const loadImporter: LoadImporter = async () => {
  try {
    const files = await (filesReady ??= loadFiles());
    return files.importTable;
  } catch (thrown) {
    filesReady = null;
    const message = messageOf(thrown);
    console.error(`popnei_web: the reader of tables did not load. ${message}`);
    return { notLoaded: message };
  }
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
    const read = await readIndividualsFile(file, csv, loadImporter);
    if (read.kind === "failed" && read.error.kind === "files") {
      console.error(
        `popnei_web: table_io could not read the file. ${read.error.message}`,
      );
    }
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
