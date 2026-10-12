// @vitest-environment jsdom
/**
 * The block of the spectrum of popgen2.html (docs/specs/analyses/sfs.md,
 * "On popgen2.html"), drawn by React in jsdom over the store of the page:
 * a defect thrown while its plot of lines is drawn, which no flow can
 * make happen, takes the plot alone, and leaves the block's table and
 * what stands beside the block, the Run of the panel.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { noPopDiversity } from "../../../core/testSupport.ts";
import type { DiversityResult } from "../../../worker/protocol.ts";
import { createPopgen2Store } from "../../popgen2Store.ts";
import { StoreProvider } from "../../store.tsx";
import { SpectrumBlock } from "./SpectrumBlock.tsx";

// The plot of the lines throws a defect as it is drawn.
vi.mock("./SpectrumLines.tsx", () => ({
  SpectrumLines: (): never => {
    throw new Error("popnei_web defect: the plot of the test throws.");
  },
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container, { onCaughtError: () => undefined });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

/** A result of one population, p0, of a draw of 4 with a spectrum. */
function result(): DiversityResult {
  return {
    analysis: "diversity",
    pops: ["p0"],
    numIndividuals: Uint32Array.from([10]),
    unbiasedExpHet: Float64Array.from([0.3]),
    obsHet: Float64Array.from([0.3]),
    polyRatio: Float64Array.from([0.9]),
    numVarsWithValue: Uint32Array.from([1200]),
    ...noPopDiversity(1, 4),
    numVarsInDraw: Uint32Array.from([5]),
    foldedSfs: [Float64Array.from([1, 2, 2])],
    passStats: { numVars: 1200, filtering: {} },
  };
}

describe("review of round 1 the block of the spectrum on popgen2.html", () => {
  test("a defect drawn in the plot of the lines leaves the heading of the plot in its place, the block's tabs and what stands beside the block", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = createPopgen2Store({
      send: () => {
        throw new Error("popnei_web defect: no request is sent here.");
      },
      sendWrite: () => {
        throw new Error("popnei_web defect: no write is sent here.");
      },
      appVersion: "0.1.0",
    });
    act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(
            StoreProvider,
            { value: store },
            createElement("button", { type: "button" }, "Run"),
            createElement(SpectrumBlock, {
              result: result(),
              variantsName: "panel.nei",
              page: "popgen2",
            }),
          ),
        ),
      );
    });
    expect(
      [...container.querySelectorAll("button")].map((b) => b.textContent),
    ).toContain("Run");
    expect(container.querySelector("h3")?.textContent).toBe(
      "Site frequency spectrum",
    );
    expect(container.querySelector("h4")?.textContent).toBe("Plot");
    expect(
      [...container.querySelectorAll('[role="tab"]')].map(
        (tab) => tab.textContent,
      ),
    ).toEqual(["Plot", "Table"]);
  });
});
