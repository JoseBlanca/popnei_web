/**
 * The probe's page: it starts the worker, shows popnei's version and what
 * popnei read from the file the site serves, and opens a file the user
 * picks (docs/specs/site.md, "The probe").
 *
 * The worker and what the page knows of it live here, outside React, in a
 * small store that the one screen reads with `useSyncExternalStore`, so
 * that no message of the worker arrives before someone listens to it, and
 * React's double mounting in development starts no second worker. The page
 * calls no function of popnei: the worker does.
 */
import { StrictMode, useEffect, useRef, useSyncExternalStore } from "react";
import type { ChangeEvent, JSX, MouseEvent } from "react";
import { createRoot } from "react-dom/client";

import {
  SERVED_NAME,
  describeMessageError,
  readsAsVcf,
  validateFromProbe,
} from "./messages.ts";
import type { FileSource, FromProbe, ToProbe } from "./messages.ts";
import ProbeWorker from "./probeWorker.ts?worker";

/** The id of the file input, which the page asks whether it has the focus. */
const FILE_INPUT_ID = "file-input";

/** Where the probe's issues are reported. */
const ISSUES = "https://github.com/JoseBlanca/popnei_web/issues";

/**
 * Where popnei is: loading, loaded, refused, a worker that never ran, or a
 * worker that ran and stopped on a defect.
 */
type PopneiState =
  | { readonly kind: "loading" }
  | {
      readonly kind: "ready";
      readonly popneiVersion: string;
      readonly initMs: number;
    }
  | {
      readonly kind: "failed";
      readonly address: string | null;
      readonly message: string;
    }
  | { readonly kind: "notStarted"; readonly message: string | null }
  | {
      readonly kind: "stopped";
      readonly popneiVersion: string;
      readonly initMs: number;
    };

/** Where one of the two files is. */
type FileState =
  | { readonly kind: "none" }
  | { readonly kind: "opening"; readonly name: string }
  | {
      readonly kind: "opened";
      readonly name: string;
      readonly numIndividuals: number;
      readonly ploidy: number;
      readonly ploidyAssumed: boolean;
      readonly openMs: number;
    }
  | {
      readonly kind: "failed";
      readonly name: string;
      readonly address: string | null;
      readonly message: string;
      /** Whether popnei refused the file, so that the reader its name chose is said. */
      readonly popneiRefused: boolean;
    };

/**
 * A defect of the probe: what went wrong, the details when known, and
 * whether the page asks the user to reload and report it.
 */
interface Defect {
  readonly summary: string;
  readonly details: string | null;
  readonly report: boolean;
}

interface ProbeState {
  readonly popnei: PopneiState;
  readonly served: FileState;
  readonly file: FileState;
  readonly defects: readonly Defect[];
  /**
   * How many times the focus was asked to move to the heading of the
   * defects: the screen moves it each time the count grows.
   */
  readonly focusDefects: number;
}

let state: ProbeState = {
  popnei: { kind: "loading" },
  served: { kind: "none" },
  file: { kind: "none" },
  defects: [],
  focusDefects: 0,
};
const listeners = new Set<() => void>();

/**
 * How many files of the user were asked for and not answered yet. The
 * worker answers them in the order they were asked, so only the answer to
 * the last one is shown, and a slow first file does not replace the second.
 */
let pendingFiles = 0;

function update(change: Partial<ProbeState>): void {
  state = { ...state, ...change };
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState(): ProbeState {
  return state;
}

function addDefect(summary: string, details: string | null): void {
  update({
    defects: [...state.defects, { summary, details, report: false }],
  });
}

/** The file of a section, shown as not answered when it was being opened. */
function unanswered(file: FileState, message: string): FileState {
  return file.kind === "opening"
    ? {
        kind: "failed",
        name: file.name,
        address: null,
        message,
        popneiRefused: false,
      }
    : file;
}

const worker = new ProbeWorker();

function send(request: ToProbe): void {
  worker.postMessage(request);
}

worker.addEventListener("message", (event: MessageEvent<unknown>) => {
  const checked = validateFromProbe(event.data);
  if (!checked.ok) {
    addDefect(
      "A defect of the probe: the page received a message it does not know.",
      describeMessageError(checked.error),
    );
    return;
  }
  receive(checked.value);
});

worker.addEventListener("messageerror", () => {
  addDefect(
    "A defect of the probe: a message from the worker could not be read.",
    null,
  );
});

// A worker whose script does not load fires a plain Event, with no
// message; one that stops on an error nothing caught, an ErrorEvent.
worker.addEventListener("error", (event: Event) => {
  const message =
    event instanceof ErrorEvent && event.message !== "" ? event.message : null;
  const popnei = state.popnei;
  switch (popnei.kind) {
    case "loading":
      update({ popnei: { kind: "notStarted", message } });
      return;
    case "ready":
      stopped(popnei, message);
      return;
    case "failed":
    case "notStarted":
    case "stopped":
      addDefect("A defect of the probe: its worker failed.", message);
      return;
  }
});

/**
 * The worker stopped after popnei was loaded, on a trap of popnei's wasm or
 * a defect: no file can be opened any more, and a file that was being
 * opened is shown as not answered.
 */
function stopped(
  popnei: Extract<PopneiState, { kind: "ready" }>,
  message: string | null,
): void {
  const notAnswered = "the probe's worker stopped before it answered";
  // The input is about to be disabled, and a disabled element loses the
  // focus to nothing; the screen moves it to the heading of the defects.
  const inputHadFocus = document.activeElement?.id === FILE_INPUT_ID;
  pendingFiles = 0;
  update({
    popnei: { ...popnei, kind: "stopped" },
    served: unanswered(state.served, notAnswered),
    file: unanswered(state.file, notAnswered),
    defects: [
      ...state.defects,
      {
        summary: "A defect of the probe: its worker stopped.",
        details: message,
        report: true,
      },
    ],
    focusDefects: state.focusDefects + (inputHadFocus ? 1 : 0),
  });
}

function receive(message: FromProbe): void {
  switch (message.kind) {
    case "ready":
      update({
        popnei: {
          kind: "ready",
          popneiVersion: message.popneiVersion,
          initMs: message.initMs,
        },
        served: { kind: "opening", name: SERVED_NAME },
      });
      send({ kind: "openServed" });
      return;
    case "opened":
      showFile(message.source, {
        kind: "opened",
        name: message.name,
        numIndividuals: message.numIndividuals,
        ploidy: message.ploidy,
        ploidyAssumed: message.ploidyAssumed,
        openMs: message.openMs,
      });
      return;
    case "failed":
      switch (message.stage) {
        case "init":
          update({
            popnei: {
              kind: "failed",
              address: message.address,
              message: message.message,
            },
          });
          return;
        case "open":
          showFile(message.source, {
            kind: "failed",
            name: message.name,
            address: message.address,
            message: message.message,
            popneiRefused: message.popneiRefused,
          });
          return;
        case "message": {
          // The request it answers was not answered otherwise, and a file
          // that waited on it is shown as not answered, so that the next
          // file is shown.
          const notAnswered =
            "the probe's worker did not recognise the request for it";
          pendingFiles = 0;
          update({
            served: unanswered(state.served, notAnswered),
            file: unanswered(state.file, notAnswered),
          });
          addDefect(
            "A defect of the probe: the worker received a request it does not know.",
            message.message,
          );
          return;
        }
      }
  }
}

function showFile(source: FileSource, file: FileState): void {
  switch (source) {
    case "served":
      update({ served: file });
      return;
    case "file":
      pendingFiles = Math.max(0, pendingFiles - 1);
      if (pendingFiles === 0) {
        update({ file });
      }
      return;
  }
}

function pickFile(event: ChangeEvent<HTMLInputElement>): void {
  const input = event.currentTarget;
  const file = input.files?.item(0) ?? null;
  if (file === null) {
    // An emptied input shows no result of a file it no longer holds.
    if (pendingFiles === 0) {
      update({ file: { kind: "none" } });
    }
    return;
  }
  pendingFiles += 1;
  update({ file: { kind: "opening", name: file.name } });
  send({ kind: "openFile", file });
}

/**
 * Empties the input before the browser's dialog opens, so that picking the
 * same file again is a change, and opens it; after the pick the input
 * shows the name of the file picked.
 */
function emptyInput(event: MouseEvent<HTMLInputElement>): void {
  const input = event.currentTarget;
  input.value = "";
}

/** What the served file's section says while it has no result. */
function servedWaiting(popnei: PopneiState): string {
  switch (popnei.kind) {
    case "loading":
    case "ready":
    case "stopped":
      return "It is opened once popnei is loaded.";
    case "failed":
      return "Not opened, since popnei could not be loaded.";
    case "notStarted":
      return "Not opened, since the probe's worker did not start.";
  }
}

/**
 * What the file input's section says of the input, or null when the input
 * can be used and a result is shown.
 */
function inputNote(popnei: PopneiState, file: FileState): string | null {
  switch (popnei.kind) {
    case "loading":
      return "A file can be picked once popnei is loaded.";
    case "ready":
      return file.kind === "none" ? "No file picked yet." : null;
    case "failed":
      return "No file can be opened, since popnei could not be loaded.";
    case "notStarted":
      return "No file can be opened, since the probe's worker did not start.";
    case "stopped":
      return "No more files can be opened, since the probe's worker stopped. Reload the page.";
  }
}

function Probe(): JSX.Element {
  const { popnei, served, file, defects, focusDefects } = useSyncExternalStore(
    subscribe,
    getState,
  );
  const note = inputNote(popnei, file);
  const defectsHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusDefects > 0) {
      defectsHeading.current?.focus();
    }
  }, [focusDefects]);
  return (
    <main>
      <h1>popnei probe</h1>
      <p>
        This page checks that popnei loads in this browser and opens a variant
        file.
      </p>

      <section aria-labelledby="popnei-heading">
        <h2 id="popnei-heading">popnei</h2>
        <div aria-live="polite">
          <PopneiStatus popnei={popnei} />
        </div>
      </section>

      <section aria-labelledby="served-heading">
        <h2 id="served-heading">The variant file of the site</h2>
        {served.kind === "none" && <p>{servedWaiting(popnei)}</p>}
        <div aria-live="polite">
          <FileStatus file={served} source="served" />
        </div>
      </section>

      <section aria-labelledby="file-heading">
        <h2 id="file-heading">A variant file of your own</h2>
        <p>
          <label htmlFor={FILE_INPUT_ID}>Variant file</label>{" "}
          <input
            id={FILE_INPUT_ID}
            type="file"
            disabled={popnei.kind !== "ready"}
            aria-describedby={
              note === null ? "file-rule" : "file-rule file-note"
            }
            onClick={emptyInput}
            onChange={pickFile}
          />
        </p>
        <p id="file-rule">
          A .nei file, or a VCF whose name ends in .vcf or .vcf.gz. A file with
          any other name is read as a .nei file.
        </p>
        {note !== null && <p id="file-note">{note}</p>}
        <div aria-live="polite">
          <FileStatus file={file} source="file" />
        </div>
      </section>

      {defects.length > 0 && (
        <section aria-labelledby="defects-heading">
          <h2 id="defects-heading" tabIndex={-1} ref={defectsHeading}>
            Defects of the probe
          </h2>
          {defects.map((defect, index) => (
            // The list only grows, so the position is the defect's identity.
            // Each is an alert of its own, so that a screen reader announces
            // the new one and not the list again.
            <div key={index} role="alert">
              <p>{defect.summary}</p>
              {defect.details !== null && <p>{sentence(defect.details)}</p>}
              {defect.report && (
                <p>
                  Reload the page. If it happens again, report it at{" "}
                  <a href={ISSUES}>{ISSUES}</a>, with the name of the file and
                  the message above.
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function PopneiStatus({ popnei }: { popnei: PopneiState }): JSX.Element {
  switch (popnei.kind) {
    case "loading":
      return <p>Loading popnei…</p>;
    case "ready":
    case "stopped":
      return (
        <p>
          popnei {popnei.popneiVersion}, loaded in {formatMs(popnei.initMs)}.
        </p>
      );
    case "failed":
      return (
        <>
          <p>popnei could not be loaded.</p>
          {popnei.address !== null && <p>Address tried: {popnei.address}</p>}
          <p>Message: {sentence(popnei.message)}</p>
          <p>
            Reload the page. If popnei still does not load, report it at{" "}
            <a href={ISSUES}>{ISSUES}</a>, with the address and the message
            above.
          </p>
        </>
      );
    case "notStarted":
      return (
        <>
          <p>The probe&apos;s worker did not start.</p>
          {popnei.message !== null && (
            <p>Message: {sentence(popnei.message)}</p>
          )}
          <p>
            Reload the page. If the worker still does not start, report it at{" "}
            <a href={ISSUES}>{ISSUES}</a>, with the name and version of your
            browser.
          </p>
        </>
      );
  }
}

function FileStatus({
  file,
  source,
}: {
  file: FileState;
  source: FileSource;
}): JSX.Element | null {
  switch (file.kind) {
    case "none":
      return null;
    case "opening":
      return <p>Opening {file.name}…</p>;
    case "opened":
      return (
        <p>
          {file.name}: {file.numIndividuals} individuals, ploidy {file.ploidy}
          {file.ploidyAssumed ? " (given: a VCF is opened as diploid)" : ""}.
          popnei opened it in {formatMs(file.openMs)}, not counting{" "}
          {source === "served" ? "the download" : "the reading from the disk"}.
        </p>
      );
    case "failed":
      return (
        <>
          <p>
            {file.address === null
              ? `${file.name} could not be opened: ${sentence(file.message)}`
              : `${file.name} could not be opened from ${file.address}: ${sentence(file.message)}`}
          </p>
          {source === "file" && file.popneiRefused && (
            <p>{readerOf(file.name)}</p>
          )}
        </>
      );
  }
}

/** Which reader the name of a file chose, as the worker chooses it. */
function readerOf(name: string): string {
  return readsAsVcf(name)
    ? "It was read as a VCF because its name ends in .vcf or .vcf.gz; any other name is read as a .nei file."
    : "It was read as a .nei file because its name does not end in .vcf or .vcf.gz.";
}

/**
 * A message of popnei, the browser or the worker, as the end of a sentence
 * of the page: its words as they came, with a full stop when it has none.
 */
function sentence(message: string): string {
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

/** A time in milliseconds, with one decimal. */
function formatMs(ms: number): string {
  return ms < 0.1 ? "under 0.1 ms" : `${ms.toFixed(1)} ms`;
}

const root = document.getElementById("root");
if (root === null) {
  throw new Error("popnei_web defect: probe.html has no element #root.");
}
createRoot(root, {
  onUncaughtError: (error, info) => {
    console.error(error, info.componentStack);
  },
  onCaughtError: (error, info) => {
    console.error(error, info.componentStack);
  },
}).render(
  <StrictMode>
    <Probe />
  </StrictMode>,
);
