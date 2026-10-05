/**
 * What the entries of the pages of population genetics, `popgen.html`
 * and `popgen2.html`, share of the opening (docs/specs/entry.md, "At the
 * opening"): taking over from the start guard, the listeners of the
 * errors nothing else shows, the error bar in its own root, the store
 * joined to the worker client, the reads the project waits for, and the
 * root of the application with its handlers of errors. Each entry calls
 * them in the order of the opening, in one run of its code, so that
 * nothing that listens is made after the first message of a worker could
 * arrive.
 */
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { I18nProvider } from "react-aria-components";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import type { Store } from "../core/store.ts";
import { createClient } from "../worker/client.ts";
import type { Client } from "../worker/client.ts";
import type { JobResult } from "../worker/protocol.ts";
import { makeFilesWorker, makeRunnerWorker } from "../worker/start.ts";
import { createDefects, isResizeObserverNoise } from "./defects.ts";
import type { Defects } from "./defects.ts";
import { createFiles } from "./files.tsx";
import type { Files } from "./files.tsx";
import { createReads } from "./reads.ts";
import type { Saving } from "./saving.ts";
import { ErrorBar } from "./shell/ErrorBar.tsx";

declare global {
  /** The version of the application, the number in package.json, which
      `define` of vite.config.ts writes in at the build. */
  const APP_VERSION: string;

  interface Window {
    /** What the start guard of the page, src/ui/startGuard.js, leaves on
        the window. */
    readonly __startGuard?: {
      /** The browser lacks what the floor has, and the guard said so in
          `#root`. */
      readonly tooOld: boolean;
      /** Takes the guard's two listeners of errors off. */
      remove(): void;
    };
  }
}

/** The language of the widgets of React Aria, which would otherwise take
    the browser's: the application is in English, and a number field in a
    Spanish browser would show 0,1 and read its buttons in Spanish. Its
    digits are the Latin ones, named by `-u-nu-latn`: with no numbering
    system named, React Aria reads a text that is no number in these
    digits, a comma typed first in an empty field, in the digits of
    another system that takes it, keeps it in the field, and then shows
    the number in those digits, 0.1 as ٠٫١. */
export const LOCALE = "en-US-u-nu-latn";

/** The element of the page with the id `id`; a defect when the page
    lacks it. */
export function pageElement(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error(`popnei_web defect: the page has no #${id}.`);
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

/** Draws the error bar again, with the store and the saving once they
    are made. */
export type DrawBar = (
  store: Store<JobResult, Blob> | null,
  saving: Saving | null,
) => void;

/**
 * Steps 1 and 2 of the opening, then the page's own: the guard steps
 * back, and the page's listeners of errors take over; the error bar is
 * drawn in `#defects` with no store; then `startApplication` is called
 * with the log of the errors and the function that draws the bar again.
 * Nothing more is done when the guard found the browser too old. When
 * `startApplication` throws, "Loading…" goes from `#root` and the
 * window's listener gives the error to the bar, which says the page met
 * it as it started.
 */
export function startPage(
  startApplication: (defects: Defects, drawBar: DrawBar) => void,
): void {
  const guard = window.__startGuard;
  guard?.remove();
  if (guard?.tooOld === true) return;
  const defects = createDefects();
  listenForDefects(defects);

  const defectsRoot = createRoot(pageElement("defects"));
  const drawBar: DrawBar = (store, saving) => {
    defectsRoot.render(
      <StrictMode>
        <I18nProvider locale={LOCALE}>
          <ErrorBar
            defects={defects}
            store={store}
            saving={saving}
            appVersion={APP_VERSION}
          />
        </I18nProvider>
      </StrictMode>,
    );
  };
  drawBar(null, null);

  try {
    startApplication(defects, drawBar);
  } catch (error) {
    pageElement("root").replaceChildren();
    throw error;
  }
}

/** The functions of the worker client a store sends through. */
export interface Senders {
  /** `Client.run`. */
  readonly send: Client["run"];
  /** `Client.write`. */
  readonly sendWrite: Client["write"];
}

/** The store, the worker client and the files of a page. */
export interface Connected {
  readonly store: Store<JobResult, Blob>;
  readonly client: Client;
  readonly files: Files;
}

/**
 * Steps 3 and 4 of the opening: the store, made by `makeStore` with the
 * functions of the worker client it sends through, which reach the
 * client made next, since a store sends nothing while it is made; then
 * the worker client, which starts the calculation worker at once, so
 * that popnei's wasm loads while the user looks for their file, and the
 * files of the page over it.
 */
export function connectStore(
  makeStore: (senders: Senders) => Store<JobResult, Blob>,
): Connected {
  let client: Client | null = null;
  const madeClient = (): Client => {
    if (client === null) {
      throw new Error(
        "popnei_web defect: the store sent a request before the worker client was made.",
      );
    }
    return client;
  };
  const store = makeStore({
    send: (key, job, onProgress) => madeClient().run(key, job, onProgress),
    sendWrite: (key, job, onProgress) =>
      madeClient().write(key, job, onProgress),
  });
  const made = createClient({
    calculation: makeRunnerWorker,
    light: makeFilesWorker,
    onPopneiReady: (version) => {
      store.popneiReady(version);
    },
  });
  client = made;
  return { store, client: made, files: createFiles(made) };
}

/** Asks for the reads the project of `store` waits for, now and after
    every change of it. */
export function syncReads(store: Store<JobResult, Blob>, client: Client): void {
  const reads = createReads({ store, client });
  store.subscribe(() => {
    reads.sync();
  });
  reads.sync();
}

/** The root of the application in `#root`, whose errors go to the bar,
    drawing `app` in the language of the page. */
export function renderApplication(defects: Defects, app: ReactNode): Root {
  const root = createRoot(pageElement("root"), {
    // An error while React drew the application itself, outside every
    // boundary: React has emptied the root, and the bar says what
    // happened.
    onUncaughtError: (error, errorInfo) => {
      defects.report(error, "drawing", errorInfo.componentStack ?? null);
    },
    // What a boundary caught: it shows its heading alone, and the bar
    // says what happened.
    onCaughtError: (error, errorInfo) => {
      defects.report(error, "boundary", errorInfo.componentStack ?? null);
      console.error(error, errorInfo.componentStack);
    },
  });
  root.render(
    <StrictMode>
      <I18nProvider locale={LOCALE}>{app}</I18nProvider>
    </StrictMode>,
  );
  return root;
}
