/**
 * The script the browser runs as the calculation worker
 * (docs/specs/worker/runner.md, "Two files"): it loads popnei when it
 * starts, checks every request of the page with `parseToRunner`, gives it
 * to runner.ts, and posts the answer, the progress and the results so far.
 * popnei is called in
 * runner.ts alone.
 *
 * Every request gets its answer or a `crashed` or `badRequest`, after
 * which the worker closes itself: a throw that runner.ts did not turn into
 * an answer, one outside a request and a promise whose rejection nothing
 * handles among them (the runner spec, "The worker's script catches the
 * rest"). So no request waits for ever.
 */

import {
  DEFECT_START,
  PROTOCOL_VERSION,
  describeMessageError,
  messageOf,
  parseToRunner,
} from "./messages.ts";
import type { FromRunner, ToRunner, WorkerStop } from "./messages.ts";
import type { Progress } from "./protocol.ts";
import type { LoadToOpen, Runner } from "./runner.ts";
import { createRunner, loadPopnei, transferablesOf } from "./runner.ts";

/** Posts a message to the page, with the buffers it hands over. */
function post(message: FromRunner, transfer: Transferable[] = []): void {
  postMessage(message, transfer);
}

/**
 * Posts a message of a request running, `what` the words for it. What
 * `postMessage` throws, a DataCloneError of a message the browser cannot
 * copy or a buffer it cannot transfer, is a defect of ours, thrown with
 * `DEFECT_START`: the runner throws it on, the catch of `handle` posts it
 * as `crashed`, and the client then classes it as a defect, for which
 * Start again is not offered, since starting again would fail the same
 * way.
 */
function postOfRun(
  message: FromRunner,
  transfer: Transferable[],
  what: string,
): void {
  try {
    post(message, transfer);
  } catch (thrown: unknown) {
    throw new Error(
      `${DEFECT_START}${what} could not be posted: ${messageOf(thrown)}`,
      { cause: thrown },
    );
  }
}

/** Posts a message after which the worker cannot go on, and closes it. */
function stop(message: WorkerStop): void {
  post(message);
  close();
}

/** popnei loading, which starts with the worker, so that the wasm
    downloads while the user picks a file; every request awaits it. */
const loading = loadPopnei();

/** The runner of the one load of this worker, made once popnei loaded. */
let runner: Runner | null = null;

type OpenRequest = Extract<ToRunner, { kind: "open" }>;
type RunRequest = Extract<ToRunner, { kind: "run" }>;
type WriteRequest = Extract<ToRunner, { kind: "write" }>;

/** The load of an `open`, its read options kept tied to its format. */
function loadOf(request: OpenRequest): LoadToOpen {
  return request.format === "vcf"
    ? {
        fileId: request.fileId,
        format: "vcf",
        readOptions: request.readOptions,
      }
    : { fileId: request.fileId, format: "nei", readOptions: null };
}

function answerOpen(held: Runner, request: OpenRequest): void {
  const { id, file } = request;
  const answer = held.open(loadOf(request), { name: file.name, source: file });
  switch (answer.kind) {
    case "ok":
      post({
        kind: "opened",
        id,
        individuals: answer.value.individuals,
        ploidy: answer.value.ploidy,
      });
      return;
    case "refused":
    case "reopenFailed":
      post({ ...answer, id });
      return;
    case "crashed":
    case "badRequest":
      stop(answer);
      return;
  }
}

function answerRun(held: Runner, request: RunRequest): void {
  const { id, key, job } = request;
  const answer = held.run(job, progressOf(id), (result) => {
    // What this throws, a buffer that cannot be transferred or a result
    // the browser cannot copy, is the runner's to throw on as ours.
    postOfRun(
      { kind: "soFar", id, key, result },
      transferablesOf(result),
      "the result so far",
    );
  });
  switch (answer.kind) {
    case "ok":
      post(
        { kind: "result", id, key, result: answer.value },
        transferablesOf(answer.value),
      );
      return;
    case "refused":
    case "reopenFailed":
      post({ ...answer, id });
      return;
    case "crashed":
    case "badRequest":
      stop(answer);
      return;
  }
}

/** Posts the progress of the request `id`, popnei's four fields. */
function progressOf(id: number): (progress: Progress) => void {
  return (progress) => {
    postOfRun(
      {
        kind: "progress",
        id,
        bytesRead: progress.bytesRead,
        numBytes: progress.numBytes,
        pass: progress.pass,
        numPasses: progress.numPasses,
      },
      [],
      "the progress",
    );
  };
}

/** Answers a write with its file as `written`, with no list of transfers:
    a `Blob` crosses as a handle, and its counts hold no typed array. */
function answerWrite(held: Runner, request: WriteRequest): void {
  const { id, key, job } = request;
  const answer = held.write(job, progressOf(id));
  switch (answer.kind) {
    case "ok":
      post({ kind: "written", id, key, result: answer.value });
      return;
    case "refused":
    case "reopenFailed":
      post({ ...answer, id });
      return;
    case "crashed":
    case "badRequest":
      stop(answer);
      return;
  }
}

async function handle(data: unknown): Promise<void> {
  try {
    const request = parseToRunner(data);
    if (!request.ok) {
      stop({
        kind: "badRequest",
        message: describeMessageError(request.error),
      });
      return;
    }
    const loaded = await loading;
    if (!loaded.ok) {
      // The worker posted `crashed` and closed itself when popnei did not
      // load, and the client fails every request with that.
      return;
    }
    runner ??= createRunner();
    switch (request.value.kind) {
      case "open":
        answerOpen(runner, request.value);
        return;
      case "run":
        answerRun(runner, request.value);
        return;
      case "write":
        answerWrite(runner, request.value);
        return;
    }
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

// A throw outside a request. preventDefault keeps the browser from passing
// it on to the page, where it would reach the error bar beside the crash
// the client already handles (docs/specs/entry.md).
addEventListener("error", (event: ErrorEvent) => {
  event.preventDefault();
  stop({ kind: "crashed", message: event.message });
});

addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  stop({ kind: "crashed", message: messageOf(event.reason) });
});

void loading.then((loaded) => {
  if (loaded.ok) {
    post({
      kind: "ready",
      protocol: PROTOCOL_VERSION,
      popneiVersion: loaded.value,
    });
  } else {
    stop({ kind: "crashed", message: loaded.error });
  }
});
