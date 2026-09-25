/**
 * The worker client, the page's one door to its two workers
 * (docs/specs/worker/client.md): it starts them, keeps the `File` of every
 * load, sends each worker one request at a time and keeps the others
 * waiting, and gives every request one answer, also when a worker is
 * cancelled, crashes, or cannot start.
 *
 * The calculation worker holds one load, the variants file of the one
 * `open` it received first; a request on another load ends it and starts
 * another. The light worker holds nothing between two reads of the
 * individuals file.
 */

import {
  describeMessageError,
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
  Job,
  JobResult,
  LoadFormat,
  Opened,
  Outcome,
  Progress,
  Run,
  RunError,
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

  /** Reads the individuals file of a load on the light worker. */
  readIndividuals(fileId: string, csv: CsvOptions): Read<IndividualsAnswer>;

  /** Sends a calculation, under its key; the store's `send`. */
  run(key: string, job: Job, onProgress: (p: Progress) => void): Run<JobResult>;
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
        calculationBroken({ kind: "workerFailed", message: message.message });
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
          const run = calc.running;
          calc.running = null;
          calc.life.failures = 0;
          finishRun(
            run,
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
          pumpCalculation();
          return;
        }
        wrongCalculationMessage(
          `${message.kind} of the id ${String(message.id)}, which is not a request it runs`,
        );
        return;
      case "result": {
        const run = calc.running;
        if (run?.id !== message.id) {
          wrongCalculationMessage(
            `a result of the id ${String(message.id)}, which is not a run it runs`,
          );
          return;
        }
        if (message.key !== run.key) {
          wrongCalculationMessage(
            `a result under the key ${message.key} for a run of the key ${run.key}`,
          );
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the diversity is the one analysis of stage 2
        if (message.result.analysis !== run.job.analysis) {
          wrongCalculationMessage(
            "a result of another analysis than its job's",
          );
          return;
        }
        calc.running = null;
        calc.life.failures = 0;
        finishRun(run, {
          kind: "done",
          key: message.key,
          result: message.result,
        });
        pumpCalculation();
        return;
      }
      case "progress": {
        const run = calc.running;
        if (run?.id !== message.id) {
          wrongCalculationMessage(
            `a progress of the id ${String(message.id)}, which is not a run it runs`,
          );
          return;
        }
        run.onProgress({
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
    let failedRuns: readonly RunRequest[] = [];
    switch (message.kind) {
      case "opened":
        answer = {
          kind: "opened",
          individuals: message.individuals,
          ploidy: message.ploidy,
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
          (request): request is RunRequest =>
            request.kind === "run" && request.job.fileId === load,
        );
        calc.queue = calc.queue.filter(
          (request) => request.kind !== "run" || !failedRuns.includes(request),
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
          finishRun(run, answer);
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
      restartCalculation(openedLoad());
      finishRun(running, { kind: "failed", error });
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
        const read = message.read;
        switch (read.kind) {
          case "read":
            finishIndividuals(running, read);
            break;
          case "failed":
            finishIndividuals(running, { kind: "refused", error: read.error });
            break;
        }
        pumpLight();
        return;
      }
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
    if (running !== null) {
      finishIndividuals(running, { kind: "failed", error });
    }
  }

  function lightOtherBuild(): void {
    const waiting = [
      ...light.queue,
      ...(light.running === null ? [] : [light.running]),
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

    run(key, job, onProgress) {
      const { promise, resolve } = promiseWithResolver<Outcome<JobResult>>();
      const request: RunRequest = {
        kind: "run",
        id: nextId(),
        key,
        job,
        onProgress,
        answer: settler(resolve),
      };
      if (!files.has(job.fileId)) {
        finishRun(request, noFile(job.fileId));
      } else if (
        !loadOptions.has(job.fileId) ||
        (failedReads.has(job.fileId) && !openedLoads.has(job.fileId))
      ) {
        finishRun(request, {
          kind: "failed",
          error: {
            kind: "defect",
            message: `a run of the load ${job.fileId}, whose file was never read`,
          },
        });
      } else {
        enqueueCalculation(request);
      }
      return {
        id: request.id,
        outcome: promise,
        cancel: () => {
          cancelCalculation(request);
        },
      };
    },
  };
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

/** The answer of a request, given once: a second one is dropped. */
interface Settler<A> {
  readonly settle: (answer: A) => void;
  readonly settled: () => boolean;
}

function settler<A>(resolve: (answer: A) => void): Settler<A> {
  let done = false;
  return {
    settle(answer) {
      if (!done) {
        done = true;
        resolve(answer);
      }
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
  readonly answer: Settler<Outcome<JobResult>>;
}

type CalculationRequest = VariantsRequest | RunRequest;

/** A read of the individuals file. */
interface IndividualsRequest {
  readonly id: number;
  readonly file: File;
  readonly csv: CsvOptions;
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
  running: RunRequest | null;
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
      finishRun(request, answer);
      return;
  }
}

function finishRead(request: VariantsRequest, answer: VariantsOpened): void {
  request.answer.settle(answer);
}

function finishRun(request: RunRequest, outcome: Outcome<JobResult>): void {
  request.answer.settle(outcome);
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
