/**
 * The probe's worker: it loads popnei's wasm when it starts, then opens the
 * file the site serves or a file the user picked, and tells the page what
 * popnei read from it (docs/specs/site.md, "The probe").
 *
 * It is the one file of the probe that calls popnei. Every message it sends
 * is a `FromProbe`, and every request it receives is checked by
 * `validateToProbe` before it is read. Every request of a file is
 * answered, whatever is thrown while it is opened, but for a trap of
 * popnei's wasm, after which the worker stops (docs/specs/site.md, "The
 * cases").
 */
import { init, openVars, openVcf, version } from "popnei";
import type { Variants } from "popnei";

import {
  SERVED_NAME,
  describeMessageError,
  readsAsVcf,
  validateToProbe,
} from "./messages.ts";
import type { FileSource, FromProbe, ToProbe } from "./messages.ts";

/** What the worker says when a file is asked for and popnei is not loaded. */
const POPNEI_NOT_LOADED = "popnei is not loaded, so no file can be opened";

/**
 * True once popnei can be called, false when it could not be loaded. It is
 * made once, when the worker starts, so that the wasm downloads before the
 * first request, and every request awaits it.
 */
const popneiLoaded: Promise<boolean> = loadPopnei();

addEventListener("message", (event: MessageEvent<unknown>) => {
  void answer(event.data);
});

function post(message: FromProbe): void {
  postMessage(message);
}

async function loadPopnei(): Promise<boolean> {
  const started = performance.now();
  try {
    await init();
  } catch (error) {
    post({
      kind: "failed",
      stage: "init",
      address: wasmAddress(),
      message: messageOf(error),
    });
    return false;
  }
  post({
    kind: "ready",
    popneiVersion: version(),
    initMs: performance.now() - started,
  });
  return true;
}

/** The file a request asks for: where it comes from, its name, its address. */
interface Target {
  readonly source: FileSource;
  readonly name: string;
  readonly address: string | null;
}

async function answer(data: unknown): Promise<void> {
  const checked = validateToProbe(data);
  if (!checked.ok) {
    post({
      kind: "failed",
      stage: "message",
      message: describeMessageError(checked.error),
    });
    return;
  }
  const request = checked.value;
  const target = targetOf(request);
  try {
    if (!(await popneiLoaded)) {
      post(failed(target, POPNEI_NOT_LOADED, false));
      return;
    }
    const bytes = await bytesOf(request);
    post(open(bytes, target));
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) {
      stop(error);
      return;
    }
    post(failed(target, messageOf(error), false));
  }
}

function targetOf(request: ToProbe): Target {
  switch (request.kind) {
    case "openServed":
      return {
        source: "served",
        name: SERVED_NAME,
        address: servedAddress(),
      };
    case "openFile":
      return { source: "file", name: request.file.name, address: null };
  }
}

/**
 * The bytes of the file a request asks for. The served file is fetched
 * with `cache: "no-cache"`, since it keeps its name from one build to the
 * next, and a status other than 200 is thrown, so that popnei is never
 * given the page of an error to read. A file of the user is read whole with
 * `FileReaderSync`, which exists only in a worker and returns the bytes at
 * once.
 */
async function bytesOf(request: ToProbe): Promise<Uint8Array> {
  switch (request.kind) {
    case "openServed": {
      const response = await fetch(servedAddress(), { cache: "no-cache" });
      if (response.status !== 200) {
        throw new Error(
          `the server answered ${String(response.status)} ${response.statusText}`.trim(),
        );
      }
      return new Uint8Array(await response.arrayBuffer());
    }
    case "openFile":
      return new Uint8Array(
        new FileReaderSync().readAsArrayBuffer(request.file),
      );
  }
}

/**
 * Opens the bytes with popnei, as a VCF when the name says so and as a
 * vars file otherwise, and frees what popnei gave. A VCF is opened with
 * popnei's default ploidy, 2, which is then given and not read. `openMs`
 * is the time of popnei's call alone, not of the fetch or the read. What
 * popnei's call throws is a refusal of the file, but for a trap, which is
 * thrown on for the caller to stop the worker; what throws after it is the
 * caller's to catch.
 */
function open(bytes: Uint8Array, target: Target): FromProbe {
  const isVcf = readsAsVcf(target.name);
  const started = performance.now();
  let variants: Variants;
  try {
    variants = isVcf ? openVcf(bytes) : openVars(bytes);
  } catch (error) {
    if (error instanceof WebAssembly.RuntimeError) {
      throw error;
    }
    return failed(target, messageOf(error), true);
  }
  try {
    const openMs = performance.now() - started;
    return {
      kind: "opened",
      source: target.source,
      name: target.name,
      numIndividuals: variants.individuals.length,
      ploidy: variants.ploidy,
      ploidyAssumed: isVcf,
      openMs,
    };
  } finally {
    variants.free();
  }
}

/** The address of the served file, under the base path of the site. */
function servedAddress(): string {
  return new URL(
    `${import.meta.env.BASE_URL}probe/${SERVED_NAME}`,
    location.href,
  ).href;
}

function failed(
  target: Target,
  message: string,
  popneiRefused: boolean,
): FromProbe {
  return { kind: "failed", stage: "open", ...target, message, popneiRefused };
}

/**
 * Stops the worker after a trap of popnei's wasm, whose memory is then not
 * to be trusted (worker.md). The error is reported as one nothing caught,
 * which reaches the page as the worker's `error` event, and the worker
 * closes, so that no later request runs on that memory.
 */
function stop(error: WebAssembly.RuntimeError): void {
  reportError(error);
  close();
}

/**
 * The address of popnei's wasm, from the list of what this worker fetched,
 * or null when the list has no `.wasm`: popnei's message names the address
 * only when the server answered with an error status.
 */
function wasmAddress(): string | null {
  const fetched = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name);
  return (
    fetched.find((address) => new URL(address).pathname.endsWith(".wasm")) ??
    null
  );
}

/** The message of what was thrown, as it came. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
