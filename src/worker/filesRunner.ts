/**
 * The light worker, the second thread of the tab, which reads the files of
 * the user and holds no popnei (docs/architecture.md, section 6). In stage
 * 2 it answers one request, `readIndividuals`, with what
 * `readIndividualsFile` makes of the file, and holds nothing between two
 * reads (docs/specs/worker/individuals.md, "The TypeScript interface").
 *
 * Every request gets its answer or a `crashed` or `badRequest`, after
 * which the worker closes itself (docs/specs/worker/messages.md, "A worker
 * that cannot go on"): the client has no timeout, and a request with no
 * answer would wait for ever.
 */

import { readIndividualsFile } from "./individualsFile.ts";
import {
  PROTOCOL_VERSION,
  describeMessageError,
  parseToFilesRunner,
} from "./messages.ts";
import type { FromFilesRunner, WorkerStop } from "./messages.ts";

/** Posts a message to the page. */
function post(message: FromFilesRunner): void {
  postMessage(message);
}

/** Posts a message after which the worker cannot go on, and closes it. */
function stop(message: WorkerStop): void {
  post(message);
  close();
}

function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
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
    const read = await readIndividualsFile(file, csv);
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
