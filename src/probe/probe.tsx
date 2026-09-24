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
import { StrictMode, useSyncExternalStore } from "react";
import type { ChangeEvent, JSX } from "react";
import { createRoot } from "react-dom/client";

import { describeMessageError, validateFromProbe } from "./messages.ts";
import type { FromProbe, ToProbe } from "./messages.ts";
import ProbeWorker from "./probeWorker.ts?worker";

/** Where popnei is: loading, loaded, refused, or a worker that never ran. */
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
  | { readonly kind: "notStarted"; readonly message: string | null };

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
    };

/** A defect of the probe: what went wrong, and the details when known. */
interface Defect {
  readonly summary: string;
  readonly details: string | null;
}

interface ProbeState {
  readonly popnei: PopneiState;
  readonly served: FileState;
  readonly file: FileState;
  readonly defects: readonly Defect[];
}

let state: ProbeState = {
  popnei: { kind: "loading" },
  served: { kind: "none" },
  file: { kind: "none" },
  defects: [],
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
  update({ defects: [...state.defects, { summary, details }] });
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

// A module worker that fails to load often gives an event with no message.
worker.addEventListener("error", (event: ErrorEvent) => {
  const message = event.message === "" ? null : event.message;
  if (state.popnei.kind === "loading") {
    update({ popnei: { kind: "notStarted", message } });
  } else {
    addDefect("A defect of the probe: the worker failed.", message);
  }
});

function receive(message: FromProbe): void {
  switch (message.kind) {
    case "ready":
      update({
        popnei: {
          kind: "ready",
          popneiVersion: message.popneiVersion,
          initMs: message.initMs,
        },
        served: { kind: "opening", name: "panel.nei" },
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
          });
          return;
        case "message":
          addDefect(
            "A defect of the probe: the worker received a request it does not know.",
            message.message,
          );
          return;
      }
  }
}

function showFile(source: "served" | "file", file: FileState): void {
  switch (source) {
    case "served":
      update({ served: file });
      return;
    case "file":
      pendingFiles -= 1;
      if (pendingFiles === 0) {
        update({ file });
      }
      return;
  }
}

function pickFile(event: ChangeEvent<HTMLInputElement>): void {
  const file = event.currentTarget.files?.item(0) ?? null;
  if (file === null) {
    return;
  }
  pendingFiles += 1;
  update({ file: { kind: "opening", name: file.name } });
  send({ kind: "openFile", file });
}

function Probe(): JSX.Element {
  const { popnei, served, file, defects } = useSyncExternalStore(
    subscribe,
    getState,
  );
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
        <div aria-live="polite">
          <FileStatus
            file={served}
            waiting="It is opened once popnei is loaded."
          />
        </div>
      </section>

      <section aria-labelledby="file-heading">
        <h2 id="file-heading">A variant file of your own</h2>
        <p>
          <label>
            Variant file, .nei or VCF{" "}
            <input
              type="file"
              disabled={popnei.kind !== "ready"}
              onChange={pickFile}
            />
          </label>
        </p>
        <div aria-live="polite">
          <FileStatus
            file={file}
            waiting={
              popnei.kind === "ready"
                ? "No file picked yet."
                : "A file can be picked once popnei is loaded."
            }
          />
        </div>
      </section>

      <div role="alert">
        {defects.length > 0 && (
          <section aria-labelledby="defects-heading">
            <h2 id="defects-heading">Defects of the probe</h2>
            {defects.map((defect, index) => (
              // The list only grows, so the position is the defect's identity.
              <div key={index}>
                <p>{defect.summary}</p>
                {defect.details !== null && <p>{defect.details}</p>}
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function PopneiStatus({ popnei }: { popnei: PopneiState }): JSX.Element {
  switch (popnei.kind) {
    case "loading":
      return <p>Loading popnei…</p>;
    case "ready":
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
          <p>The browser said: {popnei.message}</p>
        </>
      );
    case "notStarted":
      return (
        <>
          <p>The calculation worker did not start.</p>
          {popnei.message !== null && <p>The browser said: {popnei.message}</p>}
        </>
      );
  }
}

function FileStatus({
  file,
  waiting,
}: {
  file: FileState;
  waiting: string;
}): JSX.Element {
  switch (file.kind) {
    case "none":
      return <p>{waiting}</p>;
    case "opening":
      return <p>Opening {file.name}…</p>;
    case "opened":
      return (
        <p>
          {file.name}: {file.numIndividuals} individuals, ploidy {file.ploidy}
          {file.ploidyAssumed ? " (given: a VCF is opened as diploid)" : ""}.
          Opened in {formatMs(file.openMs)}.
        </p>
      );
    case "failed":
      return (
        <p>
          {file.address === null
            ? `${file.name} could not be opened: ${file.message}`
            : `${file.name} could not be opened from ${file.address}: ${file.message}`}
        </p>
      );
  }
}

function formatMs(ms: number): string {
  return `${String(Math.round(ms))} ms`;
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
