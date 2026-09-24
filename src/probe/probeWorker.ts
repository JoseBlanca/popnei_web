/**
 * The probe's worker: it loads popnei's wasm when it starts, then opens the
 * file the site serves or a file the user picked, and tells the page what
 * popnei read from it (docs/specs/site.md, "The probe").
 *
 * It is the one file of the probe that calls popnei. Every message it sends
 * is a `FromProbe`, and every request it receives is checked by
 * `validateToProbe` before it is read.
 */
import { init, openVars, openVcf, version } from "popnei";
import type { Variants } from "popnei";

import { describeMessageError, validateToProbe } from "./messages.ts";
import type { FromProbe } from "./messages.ts";

/** The path of the file the site serves, under the base path of the site. */
const SERVED_PATH = "probe/panel.nei";

/** What the worker says when a file is asked for and popnei is not loaded. */
const POPNEI_NOT_LOADED = "popnei is not loaded, so no file can be opened.";

/** A name that ends in `.vcf` or `.vcf.gz`, compared without case. */
const VCF_NAME = /\.vcf(\.gz)?$/i;

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
  switch (request.kind) {
    case "openServed":
      post(await openServed());
      return;
    case "openFile":
      post(await openFile(request.file));
      return;
  }
}

/**
 * Fetches the file the site serves and opens it. A status other than 200
 * is a failure with the address, so that popnei is never given the page of
 * an error to read.
 */
async function openServed(): Promise<FromProbe> {
  const name = SERVED_PATH.slice(SERVED_PATH.lastIndexOf("/") + 1);
  const address = new URL(import.meta.env.BASE_URL + SERVED_PATH, location.href)
    .href;
  const failed = (message: string): FromProbe => ({
    kind: "failed",
    stage: "open",
    source: "served",
    name,
    address,
    message,
  });
  if (!(await popneiLoaded)) {
    return failed(POPNEI_NOT_LOADED);
  }
  let bytes: Uint8Array;
  try {
    const response = await fetch(address);
    if (response.status !== 200) {
      return failed(
        `The server answered ${String(response.status)} ${response.statusText}`.trim(),
      );
    }
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    return failed(messageOf(error));
  }
  return open(bytes, "served", name, address);
}

/**
 * Reads a file the user picked, whole, with `FileReaderSync`, which exists
 * only in a worker and returns the bytes at once, and opens it.
 */
async function openFile(file: File): Promise<FromProbe> {
  if (!(await popneiLoaded)) {
    return {
      kind: "failed",
      stage: "open",
      source: "file",
      name: file.name,
      address: null,
      message: POPNEI_NOT_LOADED,
    };
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(new FileReaderSync().readAsArrayBuffer(file));
  } catch (error) {
    return {
      kind: "failed",
      stage: "open",
      source: "file",
      name: file.name,
      address: null,
      message: messageOf(error),
    };
  }
  return open(bytes, "file", file.name, null);
}

/**
 * Opens the bytes with popnei, as a VCF when the name says so and as a
 * vars file otherwise, and frees what popnei gave. A VCF is opened with
 * popnei's default ploidy, 2, which is then given and not read. `openMs`
 * is the time of popnei's call alone, not of the fetch or the read.
 */
function open(
  bytes: Uint8Array,
  source: "served" | "file",
  name: string,
  address: string | null,
): FromProbe {
  const isVcf = VCF_NAME.test(name);
  const started = performance.now();
  let variants: Variants;
  try {
    variants = isVcf ? openVcf(bytes) : openVars(bytes);
  } catch (error) {
    return {
      kind: "failed",
      stage: "open",
      source,
      name,
      address,
      message: messageOf(error),
    };
  }
  const openMs = performance.now() - started;
  try {
    return {
      kind: "opened",
      source,
      name,
      numIndividuals: variants.individuals.length,
      ploidy: variants.ploidy,
      ploidyAssumed: isVcf,
      openMs,
    };
  } finally {
    variants.free();
  }
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
