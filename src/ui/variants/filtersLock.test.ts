// @vitest-environment jsdom
/**
 * The hooks of the lock of the filters and of the options on popgen2.html
 * drawn by React in jsdom over the real store of the page with a fake
 * worker: a component that reads the lock is drawn again only when the
 * lock's words change, not at every change of what the analyses started
 * by themselves know, which every histogram and the FILTER box read.
 */
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { POPGEN2_LIVE } from "../../core/apps.ts";
import { keyFromWire } from "../../core/keys.ts";
import type { AppState } from "../../core/store.ts";
import type { JobResult, Run } from "../../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { AutoRunsProvider } from "../autoRunsContext.ts";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_CHAIN,
  createPopgen2Store,
  popgen2EndsLive,
} from "../popgen2Store.ts";
import { StoreProvider } from "../store.tsx";
import {
  filtersLockOf,
  populationsLockOf,
  useFiltersLock,
  useOptionsLock,
} from "./filtersLock.ts";
import { createRunGate } from "./thresholdRun.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** A run that never ends, of the fake worker. */
function runOf(id: number): Run<never> {
  return { id, outcome: new Promise(() => undefined), cancel: () => undefined };
}

/** Draws a paragraph of what the hook `read` gives, over the store of
    the page and its analyses started by themselves, which start nothing;
    returns them and the number of times the paragraph was drawn so
    far. */
function draw(read: () => string | null): {
  readonly autoRuns: AutoRuns;
  readonly draws: () => number;
} {
  const store = createPopgen2Store({
    send: () => runOf(1),
    sendWrite: () => runOf(2),
    appVersion: "0.1.0",
  });
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: () => null,
    live: {
      analyses: POPGEN2_LIVE,
      changes: createRunGate(),
      runStart: () => null,
      quietMs: LIVE_QUIET_MS,
      endsLive: popgen2EndsLive,
    },
  });
  let count = 0;
  function Counted(): React.JSX.Element {
    count += 1;
    return createElement("p", null, read() ?? "open");
  }
  act(() => {
    root.render(
      createElement(
        StoreProvider,
        { value: store },
        createElement(
          AutoRunsProvider,
          { value: autoRuns },
          createElement(Counted),
        ),
      ),
    );
  });
  return { autoRuns, draws: () => count };
}

describe("the lock hooks draw again only when the lock changes", () => {
  test("useFiltersLock: a change of what autoRuns knows that leaves no lock draws nothing", () => {
    const { autoRuns, draws } = draw(useFiltersLock);
    const before = draws();
    const version = autoRuns.getVersion();
    act(() => {
      autoRuns.stop(POPGEN2_CHAIN);
    });
    expect(autoRuns.getVersion()).not.toBe(version);
    expect(draws()).toBe(before);
    expect(container.textContent).toBe("open");
  });

  test("useOptionsLock: the same for the options of the diversity", () => {
    const { autoRuns, draws } = draw(() => useOptionsLock("diversity"));
    const before = draws();
    act(() => {
      autoRuns.stop(POPGEN2_CHAIN);
    });
    expect(draws()).toBe(before);
  });
});

describe("PT3 D1 the lock of the populations names only the live analyses that read them", () => {
  /** The state of the page's store with the diversity running. */
  function diversityRunning(): AppState<JobResult, unknown> {
    const base = createPopgen2Store({
      send: () => runOf(1),
      sendWrite: () => runOf(2),
      appVersion: "0.1.0",
    }).getState();
    return {
      ...base,
      analyses: base.analyses.map((one) =>
        one.id === "diversity"
          ? {
              ...one,
              status: {
                kind: "running",
                key: keyFromWire("d".repeat(64)),
                runId: 1,
                progress: null,
                waitsForStatistics: false,
                soFar: null,
              },
            }
          : one,
      ),
    };
  }
  // The PCA and the diversity live, and no other: named, so that an
  // analysis made live on another branch is not live here.
  const bothLive = {
    isLive: (id: string) => id === "pca" || id === "diversity",
  };

  test("with the PCA live beside the running diversity, the populations' words name the diversity alone, the filters' both", () => {
    const s = diversityRunning();
    expect(populationsLockOf(s, bothLive)).toBe(
      "Stop the diversity in the Populations tab to change the populations; then press Run there to calculate it again.",
    );
    expect(filtersLockOf(s, bothLive)).toBe(
      "Stop the diversity in the Populations tab to change the filters, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again.",
    );
  });
});
