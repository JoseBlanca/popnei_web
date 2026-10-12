// @vitest-environment jsdom
/**
 * The result of the Distances tab above 200 populations, drawn by React
 * in jsdom (docs/specs/steps/popgen2-distances.md, "The result"): no
 * heatmap and no table, the old panel's line in their place, and the
 * table's "Download…", whose CSV holds every pair. popgen2.html's column
 * of the populations has 20 values at most, so no flow reaches it.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { JobResult } from "../../../worker/protocol.ts";
import { downloadText } from "../../download.ts";
import { createPopgen2Store, openVariantsFile } from "../../popgen2Store.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import { createAnnouncer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import {
  ChangeHoldsProvider,
  HOLDS_NOTHING,
} from "../../widgets/changeHold.ts";
import { DistancesTabResults } from "./DistancesTabResults.tsx";
import { pairsCsv } from "./tabWords.ts";

vi.mock("../../download.ts", () => ({
  downloadText: vi.fn(),
  downloadFile: vi.fn(),
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(downloadText).mockClear();
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

/** A result of the distances between 201 populations, one more than the
    heatmap and the table draw. */
function manyPopulations(): JobResult {
  const numPops = 201;
  const numPairs = (numPops * (numPops - 1)) / 2;
  return {
    analysis: "popDists",
    pops: Array.from({ length: numPops }, (_, i) => `p${String(i)}`),
    numIndividuals: new Uint32Array(numPops).fill(20),
    fst: Float64Array.from({ length: numPairs }, (_, i) => i / numPairs),
    dest: Float64Array.from({ length: numPairs }, (_, i) => i / numPairs / 2),
    numVarsPerPair: new Uint32Array(numPairs).fill(1200),
    order: {
      fst: { kind: "file", reason: "noDistance" },
      dest: { kind: "file", reason: "noDistance" },
    },
    leftOut: [],
    passStats: { numVars: 1200, filtering: {} },
  };
}

/** Presses the key `key` on the element that has the focus. */
function press(key: string): void {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement)) throw new Error("no focus");
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  });
}

describe("the Distances tab above 200 populations (the review of the Distances tab, 12 October 2026)", () => {
  test("no heatmap and no table, and the table's Download… saves the CSV of every pair", async () => {
    const store = createPopgen2Store({
      send: () => {
        throw new Error("nothing is sent");
      },
      sendWrite: () => {
        throw new Error("nothing is written");
      },
      appVersion: "0.1.0",
    });
    store.popneiReady("0.2.2");
    openVariantsFile(store, {
      fileId: "a".repeat(32),
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    });
    const result = manyPopulations();
    act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(
            StoreProvider,
            { value: store },
            createElement(
              AnnouncerProvider,
              { value: createAnnouncer() },
              createElement(
                ChangeHoldsProvider,
                { value: HOLDS_NOTHING },
                createElement(DistancesTabResults, { result, check: null }),
              ),
            ),
          ),
        ),
      );
    });
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    const button = container.querySelector(
      'button[aria-label="Download the table of the distances"]',
    );
    if (!(button instanceof HTMLElement)) throw new Error("no Download…");
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Shift", bubbles: true }),
      );
      button.focus();
    });
    press("Enter");
    expect(document.activeElement?.textContent).toBe("Table as CSV");
    press("Enter");
    // The menu saves once it has closed.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    const calls = vi.mocked(downloadText).mock.calls;
    expect(calls).toHaveLength(1);
    const [name, text] = calls[0] ?? [];
    expect(name).toBe("panel.popdists.csv");
    if (result.analysis !== "popDists") throw new Error("not the distances");
    expect(text).toBe(pairsCsv(result));
    // The header and the 20,100 pairs.
    expect(text?.trimEnd().split("\n")).toHaveLength(1 + 20_100);
  });
});
