/**
 * The worker client, the page's one door to its two workers
 * (docs/specs/worker/client.md): it starts them, keeps the `File` of every
 * load, sends each worker one request at a time and keeps the others
 * waiting, and gives every request one answer, also when a worker is
 * cancelled, crashes, or cannot start.
 *
 * The calculation worker holds one load, the variants file of the one
 * `open` it received first; a request on another load ends it and starts
 * another, and so does a write of a file larger than
 * `WRITE_RESTART_BYTES`, or one that popnei refused, a PCA of more
 * than `PCA_RESTART_INDIVIDUALS` individuals, done or refused, and every
 * LD decay, done, refused or ended by a defect, since the memory of its
 * wasm never shrinks. The light worker holds nothing between two reads of
 * the individuals file, and is ended after a read of a file larger than
 * `READ_RESTART_BYTES`, for the same reason.
 */

import {
  DEFECT_START,
  describeMessageError,
  messageOf,
  parseFromFilesRunner,
  parseFromRunner,
  type FromFilesRunner,
  type FromRunner,
  type IndividualsFileRead,
  type ToFilesRunner,
  type ToRunner,
} from "./messages.ts";
import type {
  CsvOptions,
  IndividualsFileError,
  TableFormat,
  Job,
  JobResult,
  LoadFormat,
  Opened,
  Outcome,
  Progress,
  Run,
  RunError,
  WriteJob,
  Written,
} from "./protocol.ts";

/** The part of the browser's `Worker` the client uses; a test gives fakes
    with these members, which it drives by hand. */
export type WorkerLike = Pick<
  Worker,
  "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror"
>;

/** How long the client waits for a worker's `ready` from the moment it is
    made, in milliseconds; the value worker.md gives until the walking
    skeleton measures a slow connection. */
export const WORKER_READY_TIMEOUT_MS = 30_000;

/** Above it, in bytes, the calculation worker is started again after a
    write, to give back the memory of wasm the file took (client.md, "A
    write, and the restart after a large one"). 25 MB: a write leaves
    about 4.5 times its file in the tab until the worker is started again,
    88 MB for the `.nei` file of 19,161,178 bytes in Chromium, so a file of
    25 MB leaves at most about 115 MB (writeVariants.md, "What was
    measured"). */
export const WRITE_RESTART_BYTES = 25_000_000;

/** Above it, in bytes, the light worker is ended after a read of the
    individuals file, whatever its answer, to give back the memory
    table_io's wasm took for it, which a wasm never gives back (client.md,
    "The light worker started again after a large read"); the next read
    starts a new one. 0, every read of a file that is not empty: a CSV of
    1 MB of 100 columns, its cells empty, left 76.0 MB in Chromium 153 and
    51.9 MB in WebKit 26.6 that the restart gave back, more than the 50 MB
    by which the restart after a write was kept, and one of 20 MB 816.6 MB
    and 3,326.7 MB; the next read's new worker costs 30 ms or less for
    panel_pops.csv (individuals.md, "How it runs"). */
export const READ_RESTART_BYTES = 0;

/** Above it, in individuals, the calculation worker is started again after
    a run of the principal components, done or refused by popnei, to give
    back the memory of wasm its matrix of the individuals took (client.md,
    "A large PCA, and the restart after it"). 700: a PCA or a PCoA of 700
    individuals holds about 24 MB, 700 × 700 × 48.8 bytes by popnei's
    count, about `WRITE_RESTART_BYTES`, so the two restarts come at the
    same memory left behind (pca.md, "How it runs"). */
export const PCA_RESTART_INDIVIDUALS = 700;

/** The page's side of the two workers. */
export interface Client {
  /** Keeps the File of a load under its load id, for the life of the
      page, so that an undo of the load finds it; before the load goes
      into the project. The same id twice is a defect, thrown. */
  addFile(fileId: string, file: File): void;

  /** Opens the variants file of a load on the calculation worker. An
      `openVariants` of a load id it knows with other read options is a
      defect, thrown. */
  openVariants(
    load: { readonly fileId: string } & LoadFormat,
  ): Read<VariantsOpened>;

  /** Reads the individuals file of a load on the light worker, a CSV or
      a TSV with the options `csv`, or an xlsx when `csv` is `null`. */
  readIndividuals(
    fileId: string,
    csv: CsvOptions | null,
  ): Read<IndividualsAnswer>;

  /** Sends a calculation, under its key; the store's `send`. `onSoFar`
      is given each result so far of the run while it is the one running,
      of a calculation that gives one, the summary of the variants file;
      none reaches it after the outcome, nor after a cancel. It is
      required, so that a caller that forgets to pass it on, as the page's
      `send` could, fails the type check instead of losing the plots so
      far in silence. */
  run(
    key: string,
    job: Job,
    onProgress: (p: Progress) => void,
    onSoFar: (result: JobResult) => void,
  ): Run<JobResult>;

  /** Writes the variants the job's filters keep as a file, under its key;
      the store's `write.send`. Its outcome is `done` with the file, a
      `Blob` that is the store's from then on. */
  write(
    key: string,
    job: WriteJob,
    onProgress: (p: Progress) => void,
  ): Run<Written<Blob>>;
}

/** A read under way: its answer, and how to stop it. */
export interface Read<A> {
  /** The answer, which never rejects: a failure is one of its values. */
  readonly outcome: Promise<A>;
  /** Stops the read; of a read that has ended, or a second time, does
      nothing. */
  cancel(): void;
}

/** The answer of a read of the variants file. */
export type VariantsOpened =
  /** popnei opened the file. */
  | ({ readonly kind: "opened" } & Opened)
  /** The read failed. */
  | {
      readonly kind: "failed";
      /** Why. */
      readonly error: Exclude<RunError, { kind: "files" }>;
    }
  /** The read was cancelled, or a request on another load came first. */
  | { readonly kind: "cancelled" };

/** The answer of a read of the individuals file. */
export type IndividualsAnswer =
  /** The reader read the file. */
  | Extract<IndividualsFileRead, { kind: "read" }>
  /** The reader refused the file. */
  | {
      readonly kind: "refused";
      /** The way the file is wrong. */
      readonly error: IndividualsFileError;
      /** The format the reader found, `null` when it refused the file
          before reading its bytes. */
      readonly format: TableFormat | null;
    }
  /** The read failed. */
  | {
      readonly kind: "failed";
      /** Why. */
      readonly error: Exclude<RunError, { kind: "popnei" | "files" }>;
    }
  /** The read was cancelled. */
  | { readonly kind: "cancelled" };

/**
 * Makes the client, once per page: it starts the calculation worker at
 * once, so that popnei's wasm downloads while the user picks a file, and
 * the light worker at its first request. `onPopneiReady` is given the
 * popnei version of every `ready` of the calculation worker, before any
 * answer of that worker reaches a caller.
 */
export function createClient(config: {
  readonly calculation: () => WorkerLike;
  readonly light: () => WorkerLike;
  readonly onPopneiReady: (popneiVersion: string) => void;
}): Client {
  let lastId = 0;
  const files = new Map<string, File>();
  const loadOptions = new Map<string, LoadFormat>();
  /** The loads an `open` ended `opened` for at least once. */
  const openedLoads = new Set<string>();
  /** The loads whose read, their first `open`, ended with no `opened`. */
  const failedReads = new Set<string>();

  const calc: CalculationSide = {
    life: createLife(config.calculation, onCalculationData, (error) => {
      calculationBroken(error);
    }),
    currentLoad: null,
    held: null,
    opening: null,
    running: null,
    queue: [],
    reopen: null,
    announce: null,
  };
  const light: LightSide = {
    life: createLife(config.light, onLightData, (error) => {
      lightBroken(error);
    }),
    running: null,
    queue: [],
  };

  function nextId(): number {
    lastId += 1;
    return lastId;
  }

  // The calculation worker.

  function startCalculation(): void {
    calc.life.start();
  }

  function endCalculation(): void {
    calc.life.end();
    calc.held = null;
    calc.opening = null;
    calc.announce = null;
  }

  /** Ends the calculation worker and starts another, which opens `reopen`
      again as soon as it is ready. */
  function restartCalculation(reopen: string | null): void {
    endCalculation();
    calc.reopen = reopen;
    startCalculation();
  }

  /** The load the worker has opened, whose `open` ended `opened`; null
      when it holds none or its open did not end so. */
  function openedLoad(): string | null {
    return calc.held !== null && calc.held.answer?.kind === "opened"
      ? calc.held.fileId
      : null;
  }

  /** Whether the request is a run of the principal components of more
      than `PCA_RESTART_INDIVIDUALS` individuals: those of its job's list,
      or, when the list is null, those the `opened` of the load the worker
      holds gave. Asked while the request is the one running, whose load
      the worker has opened. */
  function isLargePca(request: JobRequest): boolean {
    if (request.kind !== "run" || request.job.analysis !== "pca") {
      return false;
    }
    const listed = request.job.individuals;
    if (listed !== null) {
      return listed.length > PCA_RESTART_INDIVIDUALS;
    }
    const answer = calc.held?.answer;
    if (answer?.kind !== "opened") {
      throw new Error(
        "popnei_web defect: a run of the principal components ended on a worker that has not opened its load",
      );
    }
    return answer.individuals.length > PCA_RESTART_INDIVIDUALS;
  }

  /** Whether the worker is started again after the run ends done or
      refused by popnei: a large PCA, and every LD decay, whose blocks of
      variants and counts leave the memory of wasm larger, 64 MB for 100
      individuals and 20,000 variants at 100,000 bp and 0.4 to 1.1 GB for
      1,000 individuals in node, far above the 25 MB of the bound of a
      write and of a PCA (client.md, "The LD decay, and the restart after
      it"). */
  function restartsAfterRun(request: JobRequest): boolean {
    return (
      (request.kind === "run" && request.job.analysis === "ldDecay") ||
      isLargePca(request)
    );
  }

  function enqueueCalculation(request: CalculationRequest): void {
    const load = loadOf(request);
    switch (calc.life.phase) {
      case "givenUp":
        finish(request, couldNotStart(calc.life.reason));
        return;
      case "otherBuild":
        finish(request, PROTOCOL_MISMATCH);
        return;
      case "starting":
      case "ready":
        break;
    }
    changeLoad(load);
    if (request.kind === "read" && calc.held?.fileId === load) {
      if (calc.opening !== null) {
        calc.opening.readers.push(request);
        return;
      }
      if (calc.held.answer !== null) {
        finishRead(request, calc.held.answer);
        return;
      }
    }
    calc.queue.push(request);
    pumpCalculation();
  }

  /** A request on another load than the current one cancels every request
      on the current one and ends the worker that holds it. */
  function changeLoad(load: string): void {
    const old = calc.currentLoad;
    calc.currentLoad = load;
    if (old === null || old === load) {
      return;
    }
    const cancelled = [
      ...calc.queue,
      ...(calc.opening?.readers ?? []),
      ...(calc.running === null ? [] : [calc.running]),
    ];
    calc.queue = [];
    calc.running = null;
    calc.reopen = null;
    if (calc.held !== null) {
      restartCalculation(null);
    }
    for (const request of cancelled) {
      finish(request, CANCELLED);
    }
  }

  /** Sends the worker its next request when it is ready and idle. */
  function pumpCalculation(): void {
    if (
      calc.life.phase !== "ready" ||
      calc.opening !== null ||
      calc.running !== null
    ) {
      return;
    }
    const head = calc.queue[0];
    if (head === undefined) {
      return;
    }
    const load = loadOf(head);
    if (calc.held === null) {
      sendOpen(load, false);
      return;
    }
    if (calc.held.fileId !== load || calc.held.answer?.kind !== "opened") {
      throw new Error(
        `popnei_web defect: the calculation worker holds ${calc.held.fileId} and its next request is on ${load}, whose file it has not opened`,
      );
    }
    calc.queue.shift();
    switch (head.kind) {
      case "read":
        finishRead(head, calc.held.answer);
        pumpCalculation();
        return;
      case "run":
        calc.running = head;
        postCalculation({
          kind: "run",
          id: head.id,
          key: head.key,
          job: head.job,
        });
        return;
      case "write":
        calc.running = head;
        postCalculation({
          kind: "write",
          id: head.id,
          key: head.key,
          job: head.job,
        });
        return;
    }
  }

  /** Sends the worker, which holds no load, the `open` of `load`, with
      every read of that load that waits in the queue. */
  function sendOpen(load: string, reopen: boolean): void {
    const file = files.get(load);
    const options = loadOptions.get(load);
    if (file === undefined || options === undefined) {
      throw new Error(
        `popnei_web defect: an open of the load ${load}, whose File or read options the client does not hold`,
      );
    }
    const readers: VariantsRequest[] = [];
    const rest: CalculationRequest[] = [];
    for (const request of calc.queue) {
      if (request.kind === "read" && request.fileId === load) {
        readers.push(request);
      } else {
        rest.push(request);
      }
    }
    calc.queue = rest;
    const id = readers[0]?.id ?? nextId();
    calc.held = { fileId: load, answer: null };
    calc.opening = { id, fileId: load, name: file.name, reopen, readers };
    postCalculation({
      kind: "open",
      id,
      fileId: load,
      file,
      ...options,
    });
  }

  function postCalculation(message: ToRunner): void {
    const worker = calc.life.worker;
    if (worker === null) {
      throw new Error(
        "popnei_web defect: a request posted to no calculation worker",
      );
    }
    try {
      worker.postMessage(message);
    } catch (error) {
      calculationBroken({ kind: "defect", message: messageOf(error) });
    }
  }

  function onCalculationData(data: unknown): void {
    const parsed = parseFromRunner(data);
    if (!parsed.ok) {
      if (parsed.error.kind === "otherProtocol") {
        otherBuild();
        return;
      }
      const message = describeMessageError(parsed.error);
      console.error(
        `popnei_web: a message of the calculation worker was refused. ${message}`,
      );
      calculationBroken({ kind: "defect", message });
      return;
    }
    onCalculationMessage(parsed.value);
  }

  function onCalculationMessage(message: FromRunner): void {
    switch (message.kind) {
      case "crashed":
        // The page shows only that the reading or the calculation
        // stopped; the message, a trap of the wasm among them, is for
        // whoever reports the problem.
        console.error(
          `popnei_web: the calculation worker stopped. ${message.message}`,
        );
        // A defect of ours thrown in the worker, or popnei's refusal of an
        // option it does not know, is told as a defect of the
        // application, and not as a crash: the old page's words of a crash
        // send the user to load the file again or blame the memory of the
        // tab, which mends neither; the new page gives both to its error
        // bar.
        calculationBroken(
          message.message.startsWith(DEFECT_START)
            ? {
                kind: "defect",
                message: message.message.slice(DEFECT_START.length),
              }
            : { kind: "workerFailed", message: message.message },
        );
        return;
      case "badRequest":
        calculationBroken({ kind: "defect", message: message.message });
        return;
      case "ready":
        if (calc.life.phase !== "starting") {
          wrongCalculationMessage("a second ready");
          return;
        }
        onCalculationReady(message.popneiVersion);
        return;
      case "opened":
      case "refused":
      case "reopenFailed":
        if (calc.opening !== null && message.id === calc.opening.id) {
          onOpenAnswer(calc.opening, message);
          return;
        }
        if (
          message.kind !== "opened" &&
          calc.running !== null &&
          message.id === calc.running.id
        ) {
          const running = calc.running;
          // popnei refuses a file the memory of the tab does not take, a
          // PCA that may have made its matrix, and an LD decay that may
          // have made its counts, after its wasm grew by what it built:
          // the worker is started again, after the refusal was given. A
          // reopenFailed names the file, not the memory.
          const restart =
            message.kind === "refused" &&
            (running.kind === "write" || restartsAfterRun(running));
          calc.running = null;
          calc.life.failures = 0;
          finish(
            running,
            message.kind === "refused"
              ? {
                  kind: "failed",
                  error: { kind: "popnei", message: message.message },
                }
              : {
                  kind: "failed",
                  error: {
                    kind: "reopenFailed",
                    name: message.name,
                    message: message.message,
                  },
                },
          );
          if (restart) {
            restartCalculation(openedLoad());
            return;
          }
          pumpCalculation();
          return;
        }
        wrongCalculationMessage(
          `${message.kind} of the id ${String(message.id)}, which is not a request it runs`,
        );
        return;
      case "result":
      case "soFar": {
        // A result so far is checked as the result is: of the run running,
        // under its key, of its job's analysis. A cancel ends the worker,
        // whose messages then reach nobody, so one of a run stopped or
        // superseded is a defect.
        const run = calc.running;
        if (run?.kind !== "run" || run.id !== message.id) {
          wrongCalculationMessage(
            `a ${message.kind} of the id ${String(message.id)}, which is not a run it runs`,
          );
          return;
        }
        if (message.key !== run.key) {
          wrongCalculationMessage(
            `a ${message.kind} under the key ${message.key} for a run of the key ${run.key}`,
          );
          return;
        }
        if (message.result.analysis !== run.job.analysis) {
          wrongCalculationMessage(
            `a ${message.kind} of another analysis than its job's`,
          );
          return;
        }
        if (message.kind === "soFar") {
          run.onSoFar(message.result);
          return;
        }
        // A large PCA ends the worker, whose memory of wasm grew by its
        // matrix of the individuals, and so does every LD decay; the
        // outcome first, as after a write.
        const restart = restartsAfterRun(run);
        calc.running = null;
        calc.life.failures = 0;
        run.answer.settle({
          kind: "done",
          key: message.key,
          result: message.result,
        });
        if (restart) {
          restartCalculation(openedLoad());
          return;
        }
        pumpCalculation();
        return;
      }
      case "written": {
        const write = calc.running;
        if (write?.kind !== "write" || write.id !== message.id) {
          wrongCalculationMessage(
            `a written of the id ${String(message.id)}, which is not a write it runs`,
          );
          return;
        }
        if (message.key !== write.key) {
          wrongCalculationMessage(
            `a written under the key ${message.key} for a write of the key ${write.key}`,
          );
          return;
        }
        calc.running = null;
        calc.life.failures = 0;
        // The outcome first, so that it reaches the store before anything
        // else happens; then a large file ends the worker, whose memory of
        // wasm grew by its size.
        write.answer.settle({
          kind: "done",
          key: message.key,
          result: message.result,
        });
        if (message.result.numBytes > WRITE_RESTART_BYTES) {
          restartCalculation(openedLoad());
          return;
        }
        pumpCalculation();
        return;
      }
      case "progress": {
        const running = calc.running;
        if (running?.id !== message.id) {
          wrongCalculationMessage(
            `a progress of the id ${String(message.id)}, which is not a run or a write it runs`,
          );
          return;
        }
        running.onProgress({
          bytesRead: message.bytesRead,
          numBytes: message.numBytes,
          pass: message.pass,
          numPasses: message.numPasses,
        });
        return;
      }
    }
  }

  /** A message that passed its check but is not one the worker could
      send now: a defect, which ends the worker. */
  function wrongCalculationMessage(what: string): void {
    const message = `the calculation worker sent ${what}`;
    console.error(`popnei_web: ${message}`);
    calculationBroken({ kind: "defect", message });
  }

  function onCalculationReady(popneiVersion: string): void {
    calc.life.ready();
    const reopen = calc.reopen;
    calc.reopen = null;
    const head = calc.queue[0];
    if (reopen !== null && (head === undefined || loadOf(head) === reopen)) {
      calc.announce = popneiVersion;
      sendOpen(reopen, true);
      return;
    }
    try {
      config.onPopneiReady(popneiVersion);
    } finally {
      pumpCalculation();
    }
  }

  /** The answer of an `open`: the reads that wait on it get it, and the
      runs go on after it, or fail with it. */
  function onOpenAnswer(
    opening: Opening,
    message: Extract<
      FromRunner,
      { kind: "opened" | "refused" | "reopenFailed" }
    >,
  ): void {
    calc.opening = null;
    const load = opening.fileId;
    // An answer to a request sets the count of failures back; the open of
    // a worker started again with nothing waiting on it counts as its
    // ready does, so that a worker that crashes idle after every reopen is
    // given up.
    if (
      opening.readers.length > 0 ||
      calc.queue.some((request) => loadOf(request) === load)
    ) {
      calc.life.failures = 0;
    }
    const announce = calc.announce;
    calc.announce = null;
    const openedBefore = openedLoads.has(load);
    let answer: Exclude<VariantsOpened, { kind: "cancelled" }>;
    let failedRuns: readonly JobRequest[] = [];
    switch (message.kind) {
      case "opened":
        answer = {
          kind: "opened",
          individuals: message.individuals,
          ploidy: message.ploidy,
          keepsPassed: message.keepsPassed,
        };
        openedLoads.add(load);
        if (calc.held !== null) {
          calc.held.answer = answer;
        }
        break;
      case "refused":
      case "reopenFailed": {
        // A refusal of a file opened before is a file changed on the
        // disk (point B of docs/specs/stage-2-open-points.md), and the
        // runs that waited on it fail as that.
        answer = {
          kind: "failed",
          error:
            message.kind === "reopenFailed" || openedBefore
              ? {
                  kind: "reopenFailed",
                  name:
                    message.kind === "reopenFailed"
                      ? message.name
                      : opening.name,
                  message: message.message,
                }
              : { kind: "popnei", message: message.message },
        };
        failedRuns = calc.queue.filter(
          (request): request is JobRequest =>
            request.kind !== "read" && request.job.fileId === load,
        );
        calc.queue = calc.queue.filter(
          (request) => request.kind === "read" || !failedRuns.includes(request),
        );
        if (openedBefore) {
          // A worker whose open of a load read before failed holds no
          // open file: the next request on it goes to a new worker.
          restartCalculation(null);
        } else {
          failedReads.add(load);
          if (calc.held !== null) {
            calc.held.answer = answer;
          }
        }
        break;
      }
    }
    try {
      if (announce !== null) {
        config.onPopneiReady(announce);
      }
    } finally {
      for (const reader of opening.readers) {
        finishRead(reader, answer);
      }
      if (answer.kind === "failed") {
        for (const run of failedRuns) {
          finish(run, answer);
        }
      }
      pumpCalculation();
    }
  }

  /** The calculation worker failed: before its `ready`, a failed start;
      after it, the request it was running fails, and it is started
      again. */
  function calculationBroken(error: WorkerFailure): void {
    if (calc.life.phase === "starting") {
      calculationFailedStart(error.message);
      return;
    }
    const running = calc.running;
    const opening = calc.opening;
    calc.running = null;
    if (running !== null) {
      // The outcome first, as after a write: a defect thrown after the
      // pass of an LD decay reaches the store before the worker is ended.
      finish(running, { kind: "failed", error });
      restartCalculation(openedLoad());
      return;
    }
    if (opening !== null) {
      // A crash during an open fails the reads and every run waiting on
      // it, and the new worker opens nothing again.
      const waiting = calc.queue.filter(
        (request) => loadOf(request) === opening.fileId,
      );
      calc.queue = calc.queue.filter(
        (request) => loadOf(request) !== opening.fileId,
      );
      if (!openedLoads.has(opening.fileId)) {
        failedReads.add(opening.fileId);
      }
      restartCalculation(null);
      for (const request of [...opening.readers, ...waiting]) {
        finish(request, { kind: "failed", error });
      }
      return;
    }
    // Idle: counted, so that a worker that crashes after every ready is
    // given up.
    calc.life.failures += 1;
    calc.life.reason = error.message;
    const reopen = openedLoad();
    endCalculation();
    if (calc.life.failures >= MAX_FAILURES) {
      giveUpCalculation();
      return;
    }
    calc.reopen = reopen;
    startCalculation();
  }

  function calculationFailedStart(reason: string): void {
    endCalculation();
    calc.life.failures += 1;
    calc.life.reason = reason;
    if (calc.life.failures >= MAX_FAILURES) {
      giveUpCalculation();
      return;
    }
    startCalculation();
  }

  function giveUpCalculation(): void {
    calc.life.phase = "givenUp";
    const waiting = calc.queue;
    calc.queue = [];
    calc.reopen = null;
    for (const request of waiting) {
      finish(request, couldNotStart(calc.life.reason));
    }
  }

  /** A worker of another build: every request of it fails, and it is not
      started again. */
  function otherBuild(): void {
    const waiting = [
      ...calc.queue,
      ...(calc.opening?.readers ?? []),
      ...(calc.running === null ? [] : [calc.running]),
    ];
    calc.queue = [];
    calc.running = null;
    calc.reopen = null;
    endCalculation();
    calc.life.phase = "otherBuild";
    for (const request of waiting) {
      finish(request, PROTOCOL_MISMATCH);
    }
  }

  function cancelCalculation(request: CalculationRequest): void {
    if (request.answer.settled()) {
      return;
    }
    const index = calc.queue.indexOf(request);
    if (index >= 0) {
      calc.queue.splice(index, 1);
      finish(request, CANCELLED);
      return;
    }
    const opening = calc.opening;
    if (request.kind === "read" && opening !== null) {
      const readerIndex = opening.readers.indexOf(request);
      if (readerIndex >= 0) {
        opening.readers.splice(readerIndex, 1);
        const othersWait =
          opening.readers.length > 0 ||
          calc.queue.some((waiting) => loadOf(waiting) === opening.fileId);
        if (!othersWait) {
          restartCalculation(null);
        }
        finish(request, CANCELLED);
        return;
      }
    }
    if (calc.running === request) {
      calc.running = null;
      restartCalculation(openedLoad());
      finish(request, CANCELLED);
    }
  }

  // The light worker.

  function startLight(): void {
    light.life.start();
  }

  function enqueueLight(request: IndividualsRequest): void {
    switch (light.life.phase) {
      case "givenUp":
        finishIndividuals(request, couldNotStart(light.life.reason));
        return;
      case "otherBuild":
        finishIndividuals(request, PROTOCOL_MISMATCH);
        return;
      case "starting":
      case "ready":
        break;
    }
    light.queue.push(request);
    if (light.life.worker === null) {
      startLight();
    }
    pumpLight();
  }

  function pumpLight(): void {
    if (light.life.phase !== "ready" || light.running !== null) {
      return;
    }
    const head = light.queue.shift();
    const worker = light.life.worker;
    if (head === undefined || worker === null) {
      return;
    }
    light.running = head;
    const message: ToFilesRunner = {
      kind: "readIndividuals",
      id: head.id,
      file: head.file,
      csv: head.csv,
    };
    try {
      worker.postMessage(message);
    } catch (error) {
      lightBroken({ kind: "defect", message: messageOf(error) });
    }
  }

  function onLightData(data: unknown): void {
    const parsed = parseFromFilesRunner(data);
    if (!parsed.ok) {
      if (parsed.error.kind === "otherProtocol") {
        lightOtherBuild();
        return;
      }
      const message = describeMessageError(parsed.error);
      console.error(
        `popnei_web: a message of the light worker was refused. ${message}`,
      );
      lightBroken({ kind: "defect", message });
      return;
    }
    onLightMessage(parsed.value);
  }

  function onLightMessage(message: FromFilesRunner): void {
    switch (message.kind) {
      case "crashed":
        // The page shows only that the reading or the calculation
        // stopped; the message, a trap of the wasm among them, is for
        // whoever reports the problem.
        console.error(
          `popnei_web: the light worker stopped. ${message.message}`,
        );
        lightBroken({ kind: "workerFailed", message: message.message });
        return;
      case "badRequest":
        lightBroken({ kind: "defect", message: message.message });
        return;
      case "ready":
        if (light.life.phase !== "starting") {
          wrongLightMessage("a second ready");
          return;
        }
        light.life.ready();
        pumpLight();
        return;
      case "individuals": {
        const running = light.running;
        if (running?.id !== message.id) {
          wrongLightMessage(
            `individuals of the id ${String(message.id)}, which is not a read it runs`,
          );
          return;
        }
        light.running = null;
        light.life.failures = 0;
        // A read cancelled while it ran was answered at its cancel.
        if (!running.answer.settled()) {
          const read = message.read;
          switch (read.kind) {
            case "read":
              finishIndividuals(running, read);
              break;
            case "failed":
              finishIndividuals(running, {
                kind: "refused",
                error: read.error,
                format: read.format,
              });
              break;
          }
        }
        // After its outcome, so that it reaches the entry even when no
        // new worker can be made.
        if (running.file.size > READ_RESTART_BYTES) {
          restartLight();
          return;
        }
        pumpLight();
        return;
      }
    }
  }

  /** Ends the light worker after a large read, and starts a new one at
      once only when reads wait; otherwise the next read starts it
      (`enqueueLight`). */
  function restartLight(): void {
    light.life.end();
    if (light.queue.length > 0) {
      startLight();
    }
  }

  function wrongLightMessage(what: string): void {
    const message = `the light worker sent ${what}`;
    console.error(`popnei_web: ${message}`);
    lightBroken({ kind: "defect", message });
  }

  function lightBroken(error: WorkerFailure): void {
    const running = light.running;
    light.running = null;
    light.life.end();
    if (light.life.phase === "starting" || running === null) {
      light.life.failures += 1;
      light.life.reason = error.message;
      if (light.life.failures >= MAX_FAILURES) {
        light.life.phase = "givenUp";
        const waiting = light.queue;
        light.queue = [];
        for (const request of waiting) {
          finishIndividuals(request, couldNotStart(error.message));
        }
        return;
      }
    }
    startLight();
    if (running !== null && !running.answer.settled()) {
      finishIndividuals(running, { kind: "failed", error });
    }
  }

  function lightOtherBuild(): void {
    const waiting = [
      ...light.queue,
      ...(light.running === null || light.running.answer.settled()
        ? []
        : [light.running]),
    ];
    light.queue = [];
    light.running = null;
    light.life.end();
    light.life.phase = "otherBuild";
    for (const request of waiting) {
      finishIndividuals(request, PROTOCOL_MISMATCH);
    }
  }

  function cancelLight(request: IndividualsRequest): void {
    if (request.answer.settled()) {
      return;
    }
    const index = light.queue.indexOf(request);
    if (index >= 0) {
      light.queue.splice(index, 1);
    }
    // One that runs keeps the worker busy until its answer, which then
    // goes to no one: the reader reads 20 MB at most.
    finishIndividuals(request, CANCELLED);
  }

  startCalculation();

  return {
    addFile(fileId, file) {
      if (files.has(fileId)) {
        throw new Error(
          `popnei_web defect: addFile of the load ${fileId}, which the client already holds`,
        );
      }
      files.set(fileId, file);
    },

    openVariants(load) {
      const known = loadOptions.get(load.fileId);
      if (known !== undefined && !sameOptions(known, load)) {
        throw new Error(
          `popnei_web defect: openVariants of the load ${load.fileId} with other read options than before`,
        );
      }
      const { promise, resolve } = promiseWithResolver<VariantsOpened>();
      const request: VariantsRequest = {
        kind: "read",
        id: nextId(),
        fileId: load.fileId,
        answer: settler(resolve),
      };
      if (!files.has(load.fileId)) {
        finishRead(request, noFile(load.fileId));
      } else {
        loadOptions.set(load.fileId, loadFormatOf(load));
        enqueueCalculation(request);
      }
      return {
        outcome: promise,
        cancel: () => {
          cancelCalculation(request);
        },
      };
    },

    readIndividuals(fileId, csv) {
      const { promise, resolve } = promiseWithResolver<IndividualsAnswer>();
      const file = files.get(fileId);
      const id = nextId();
      if (file === undefined) {
        resolve(noFile(fileId));
        return { outcome: promise, cancel: () => undefined };
      }
      const request: IndividualsRequest = {
        id,
        file,
        csv,
        answer: settler(resolve),
      };
      enqueueLight(request);
      return {
        outcome: promise,
        cancel: () => {
          cancelLight(request);
        },
      };
    },

    run(key, job, onProgress, onSoFar) {
      const { promise, resolve } = promiseWithResolver<Outcome<JobResult>>();
      const request: RunRequest = {
        kind: "run",
        id: nextId(),
        key,
        job,
        onProgress,
        onSoFar,
        answer: settler(resolve),
      };
      sendJob(request);
      return {
        id: request.id,
        outcome: promise,
        cancel: () => {
          cancelCalculation(request);
        },
      };
    },

    write(key, job, onProgress) {
      const { promise, resolve } =
        promiseWithResolver<Outcome<Written<Blob>>>();
      const request: WriteRequest = {
        kind: "write",
        id: nextId(),
        key,
        job,
        onProgress,
        answer: settler(resolve),
      };
      sendJob(request);
      return {
        id: request.id,
        outcome: promise,
        cancel: () => {
          cancelCalculation(request);
        },
      };
    },
  };

  /** Queues a run or a write, or fails it at once as a defect of the page
      when the client holds no File of its load, or its file was never
      read. */
  function sendJob(request: JobRequest): void {
    const fileId = request.job.fileId;
    if (!files.has(fileId)) {
      finish(request, noFile(fileId));
    } else if (
      !loadOptions.has(fileId) ||
      (failedReads.has(fileId) && !openedLoads.has(fileId))
    ) {
      finish(request, {
        kind: "failed",
        error: {
          kind: "defect",
          message: `a ${request.kind} of the load ${fileId}, whose file was never read`,
        },
      });
    } else {
      enqueueCalculation(request);
    }
  }
}

/** How many failures in a row with no answer between give a worker up. */
const MAX_FAILURES = 2;

/** The format and the read options of the last `openVariants` of a load,
    without its load id. */
function loadFormatOf(load: LoadFormat): LoadFormat {
  switch (load.format) {
    case "vcf":
      return { format: "vcf", readOptions: load.readOptions };
    case "nei":
      return { format: "nei", readOptions: null };
  }
}

/** Where a worker is in its life: made and waiting for its `ready`, ready,
    given up after two failures, or of another build. */
type Phase = "starting" | "ready" | "givenUp" | "otherBuild";

/** A worker and what the client keeps of its start. */
interface Life {
  worker: WorkerLike | null;
  phase: Phase;
  /** The failures in a row with no answer between. */
  failures: number;
  /** The words of the last failure, for `couldNotStart`. */
  reason: string;
  timer: ReturnType<typeof setTimeout> | null;
  /** Makes the worker and waits for its `ready`. */
  readonly start: () => void;
  /** The `ready` came: its timer stops. */
  readonly ready: () => void;
  /** Ends the worker: its handlers first, so that a message it posted
      and the page has not read reaches no one, then the thread. */
  readonly end: () => void;
  readonly stopTimer: () => void;
}

/** The answer of a request, given once. A second one is a defect of the
    client, which gives every request one answer: it is dropped, so that
    the page sees the first, and written to the console, where the tests
    see it. */
interface Settler<A> {
  readonly settle: (answer: A) => void;
  readonly settled: () => boolean;
}

function settler<A>(resolve: (answer: A) => void): Settler<A> {
  let done = false;
  return {
    settle(answer) {
      if (done) {
        console.error(
          "popnei_web defect: a request answered twice; the second answer is dropped.",
        );
        return;
      }
      done = true;
      resolve(answer);
    },
    settled: () => done,
  };
}

/** A way a worker fails that ends it. */
type WorkerFailure = Extract<RunError, { kind: "workerFailed" | "defect" }>;

/** A read of the variants file. */
interface VariantsRequest {
  readonly kind: "read";
  readonly id: number;
  readonly fileId: string;
  readonly answer: Settler<VariantsOpened>;
}

/** A calculation. */
interface RunRequest {
  readonly kind: "run";
  readonly id: number;
  readonly key: string;
  readonly job: Job;
  readonly onProgress: (p: Progress) => void;
  readonly onSoFar: (result: JobResult) => void;
  readonly answer: Settler<Outcome<JobResult>>;
}

/** A write of the filtered variants as a file. */
interface WriteRequest {
  readonly kind: "write";
  readonly id: number;
  readonly key: string;
  readonly job: WriteJob;
  readonly onProgress: (p: Progress) => void;
  readonly answer: Settler<Outcome<Written<Blob>>>;
}

/** A request that names its load in its job: a run or a write. */
type JobRequest = RunRequest | WriteRequest;

type CalculationRequest = VariantsRequest | JobRequest;

/** A read of the individuals file. */
interface IndividualsRequest {
  readonly id: number;
  readonly file: File;
  readonly csv: CsvOptions | null;
  readonly answer: Settler<IndividualsAnswer>;
}

/** An `open` the worker runs. */
interface Opening {
  readonly id: number;
  readonly fileId: string;
  /** The name of the file, for a refusal of a file read before. */
  readonly name: string;
  /** Sent to a worker started again, which announces its version when
      the open ends. */
  readonly reopen: boolean;
  /** The reads that wait for its answer. */
  readonly readers: VariantsRequest[];
}

/** The state of the calculation worker. */
interface CalculationSide {
  readonly life: Life;
  /** The load of the last request, which the worker holds or will. */
  currentLoad: string | null;
  /** The load the worker was sent the `open` of, and its answer once it
      came. */
  held: {
    readonly fileId: string;
    answer: Exclude<VariantsOpened, { kind: "cancelled" }> | null;
  } | null;
  opening: Opening | null;
  running: JobRequest | null;
  queue: CalculationRequest[];
  /** The load a worker started again opens as soon as it is ready. */
  reopen: string | null;
  /** The popnei version a worker started again gives `onPopneiReady`
      when its `open` ends. */
  announce: string | null;
}

/** The state of the light worker. */
interface LightSide {
  readonly life: Life;
  running: IndividualsRequest | null;
  queue: IndividualsRequest[];
}

const CANCELLED = { kind: "cancelled" } as const;
const PROTOCOL_MISMATCH = {
  kind: "failed",
  error: { kind: "protocolMismatch" },
} as const;

function couldNotStart(reason: string): {
  readonly kind: "failed";
  readonly error: { readonly kind: "couldNotStart"; readonly reason: string };
} {
  return { kind: "failed", error: { kind: "couldNotStart", reason } };
}

function noFile(fileId: string): {
  readonly kind: "failed";
  readonly error: { readonly kind: "defect"; readonly message: string };
} {
  return {
    kind: "failed",
    error: {
      kind: "defect",
      message: `a request of the load ${fileId}, whose File the client does not hold`,
    },
  };
}

/** Makes the life of a worker, which `start` begins: it makes the worker
    and waits for its `ready`, and `onBroken` is called when the worker
    cannot be made, gives no `ready` in time, or fails. */
function createLife(
  make: () => WorkerLike,
  onData: (data: unknown) => void,
  onBroken: (error: WorkerFailure) => void,
): Life {
  const life: Life = {
    worker: null,
    phase: "starting",
    failures: 0,
    reason: "",
    timer: null,
    start() {
      life.phase = "starting";
      let worker: WorkerLike;
      try {
        worker = make();
      } catch (error) {
        onBroken({
          kind: "workerFailed",
          message: `the worker could not be made: ${messageOf(error)}`,
        });
        return;
      }
      life.worker = worker;
      // Each handler reads only while its worker is the current one: a
      // message an ended worker posted reaches no one, also through a
      // handler kept from before its end.
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (life.worker === worker) {
          onData(event.data);
        }
      };
      worker.onerror = (event: Event) => {
        // The client handles it; the page's error bar is for our own
        // errors (docs/specs/entry.md).
        event.preventDefault();
        if (life.worker !== worker) {
          return;
        }
        // A worker whose script does not load fires a plain Event, with no
        // message; one that stops on an error nothing caught, an
        // ErrorEvent.
        onBroken({
          kind: "workerFailed",
          message:
            event instanceof ErrorEvent && event.message !== ""
              ? event.message
              : "the worker stopped with no message",
        });
      };
      worker.onmessageerror = () => {
        if (life.worker !== worker) {
          return;
        }
        onBroken({
          kind: "workerFailed",
          message: "a message of the worker could not be copied",
        });
      };
      life.timer = setTimeout(() => {
        life.timer = null;
        onBroken({
          kind: "workerFailed",
          message: `the worker gave no ready in ${String(WORKER_READY_TIMEOUT_MS / 1000)} seconds`,
        });
      }, WORKER_READY_TIMEOUT_MS);
    },
    ready() {
      life.phase = "ready";
      life.stopTimer();
    },
    end() {
      life.stopTimer();
      const worker = life.worker;
      life.worker = null;
      if (worker !== null) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
      }
    },
    stopTimer() {
      if (life.timer !== null) {
        clearTimeout(life.timer);
        life.timer = null;
      }
    },
  };
  return life;
}

function loadOf(request: CalculationRequest): string {
  switch (request.kind) {
    case "read":
      return request.fileId;
    case "run":
    case "write":
      return request.job.fileId;
  }
}

/** Ends a request of the calculation worker that failed or was
    cancelled. */
function finish(
  request: CalculationRequest,
  answer:
    | {
        readonly kind: "failed";
        readonly error: Exclude<RunError, { kind: "files" }>;
      }
    | typeof CANCELLED,
): void {
  switch (request.kind) {
    case "read":
      finishRead(request, answer);
      return;
    case "run":
    case "write":
      request.answer.settle(answer);
      return;
  }
}

function finishRead(request: VariantsRequest, answer: VariantsOpened): void {
  request.answer.settle(answer);
}

function finishIndividuals(
  request: IndividualsRequest,
  answer: IndividualsAnswer,
): void {
  request.answer.settle(answer);
}

function sameOptions(a: LoadFormat, b: LoadFormat): boolean {
  if (a.format !== b.format) {
    return false;
  }
  if (a.readOptions === null || b.readOptions === null) {
    return a.readOptions === b.readOptions;
  }
  return (
    a.readOptions.ploidy === b.readOptions.ploidy &&
    a.readOptions.onlyPassed === b.readOptions.onlyPassed
  );
}

/** A promise and the function that resolves it; `Promise.withResolvers`
    is of ES2024, above the floor of the browsers. */
function promiseWithResolver<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  const box: { resolve: ((value: T) => void) | null } = { resolve: null };
  const promise = new Promise<T>((settle) => {
    box.resolve = settle;
  });
  const resolve = box.resolve;
  if (resolve === null) {
    throw new Error("popnei_web defect: a Promise did not run its executor");
  }
  return { promise, resolve };
}
