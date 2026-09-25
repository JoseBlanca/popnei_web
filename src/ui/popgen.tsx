/**
 * The entry of the population genetics page, `popgen.html`: the code that
 * runs once when the page opens (docs/specs/entry.md, "At the opening").
 * It takes over from the start guard of the page, puts on the window the
 * listeners of the errors nothing else shows, makes the store, and draws
 * the error bar and the application in two roots. All of it runs in one
 * run of this code, so that nothing that listens is made after the first
 * message of a worker could arrive.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { POPGEN_ANALYSES, firstProject, numVarsOf } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import { createStore } from "../core/store.ts";
import type { Store } from "../core/store.ts";
import type { Job, JobResult } from "../worker/protocol.ts";
import { createDefects, isResizeObserverNoise } from "./defects.ts";
import type { Defects } from "./defects.ts";
import { ErrorBar } from "./shell/ErrorBar.tsx";
import { Shell } from "./shell/Shell.tsx";
import { StoreProvider } from "./store.tsx";

declare global {
  /** The version of the application, the number in package.json, which
      `define` of vite.config.ts writes in at the build. */
  const APP_VERSION: string;

  interface Window {
    /** What the start guard of popgen.html leaves on the window. */
    readonly __popgenGuard?: {
      /** The browser lacks what the floor has, and the guard said so in
          `#root`. */
      readonly tooOld: boolean;
      /** Takes the guard's two listeners of errors off. */
      remove(): void;
    };
  }
}

/** The element of the page with the id `id`; a defect when popgen.html
    lacks it. */
function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error(`popnei_web defect: popgen.html has no #${id}.`);
  }
  return found;
}

/** Gives the log of the bar every error of our own code that no error
    boundary sees: one thrown in an event handler, and a promise rejected
    with nothing to handle it. The browser still writes each to the
    console. */
function listenForDefects(defects: Defects): void {
  window.addEventListener("error", (event: ErrorEvent) => {
    if (isResizeObserverNoise(event.message)) return;
    // The browser leaves `error` null for an error it does not describe.
    const thrown: unknown = event.error;
    defects.report(thrown ?? event.message, "event", null);
  });
  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      defects.report(reason, "rejection", null);
    },
  );
}

function start(): void {
  // 1. The guard steps back, and the page's own listeners take over.
  const guard = window.__popgenGuard;
  guard?.remove();
  if (guard?.tooOld === true) return;
  const defects = createDefects();
  listenForDefects(defects);

  // 2. The error bar, in a root of its own, with no store yet.
  const defectsRoot = createRoot(element("defects"));
  const drawBar = (store: Store<JobResult> | null): void => {
    defectsRoot.render(
      <StrictMode>
        <ErrorBar defects={defects} store={store} appVersion={APP_VERSION} />
      </StrictMode>,
    );
  };
  drawBar(null);

  // 3. The store. It sends nothing while it is made; its first request is
  // a Run of a panel.
  const store = createStore<Job, JobResult>({
    first: firstProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: () => {
      // The worker client, made with the two workers of
      // src/worker/start.ts, is the next step of the opening; until it is
      // here nothing can start a calculation.
      throw new Error("popnei_web defect: the page has no worker client yet.");
    },
    numVarsOf,
    appVersion: APP_VERSION,
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });

  // 5. The error bar again, now with the store.
  drawBar(store);

  // 7. The application, in its own root.
  const root = createRoot(element("root"), {
    // An error while React drew the shell itself, outside every boundary:
    // React has emptied the root, and the bar says what happened.
    onUncaughtError: (error, errorInfo) => {
      defects.report(error, "drawing", errorInfo.componentStack ?? null);
    },
    // What a boundary caught, and shows in place of what failed.
    onCaughtError: (error, errorInfo) => {
      console.error(error, errorInfo.componentStack);
    },
  });
  root.render(
    <StrictMode>
      <StoreProvider value={store}>
        <Shell />
      </StoreProvider>
    </StrictMode>,
  );
}

start();
