// @vitest-environment jsdom
/**
 * The options of the PCA tab of popgen2.html drawn by React in jsdom over
 * the real store of the page with a fake worker
 * (docs/specs/steps/popgen2-pca.md, "Its filters"): a filter whose slider
 * would have its two ends the same, the Variants tab's missing rate at 0
 * or its MAF at or below 0.5, is drawn as its name and a line, with no
 * slider.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { setVariantFilter } from "../../../core/project.ts";
import type { ProjectVariantFilter } from "../../../core/project.ts";
import type { Run } from "../../../worker/protocol.ts";
import { POPGEN2_LIVE } from "../../../core/apps.ts";
import {
  POPGEN2_AUTO_GROUPS,
  createPopgen2Store,
  popgen2EndsLive,
} from "../../popgen2Store.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../../autoRuns.ts";
import type { AutoRunStore, AutoRuns } from "../../autoRuns.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import { createAnnouncer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { AutoRunsProvider } from "../../variants/filtersLock.ts";
import { createRunGate } from "../../variants/thresholdRun.ts";
import { PcaTabOptions } from "./PcaTabOptions.tsx";
import {
  ChangeHoldsProvider,
  HOLDS_NOTHING,
} from "../../widgets/changeHold.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The analyses the page starts by itself over `store`, which start
    nothing: none is live, so the lock and the wait read only what runs
    in the store. */
function idleAutoRuns(store: AutoRunStore): AutoRuns {
  return createAutoRuns({
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

/** Draws the options over the store of popgen2.html with the Variants
    tab's filters `filters`. */
function drawWith(filters: readonly ProjectVariantFilter[]): void {
  const store = createPopgen2Store({
    send: () => runOf(1),
    sendWrite: () => runOf(2),
    appVersion: "0.1.0",
  });
  for (const filter of filters) {
    store.apply("a filter", (p) => setVariantFilter(p, filter));
  }
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          ChangeHoldsProvider,
          { value: HOLDS_NOTHING },
          createElement(
            StoreProvider,
            { value: store },
            createElement(
              AnnouncerProvider,
              { value: createAnnouncer() },
              createElement(
                AutoRunsProvider,
                { value: idleAutoRuns(store) },
                createElement(PcaTabOptions),
              ),
            ),
          ),
        ),
      ),
    );
  });
}

describe("AP10 D2 a filter of the PCA's own whose slider would have no range", () => {
  test("the Variants tab's missing rate at 0: no slider of the missing data, its name and the line; the MAF's slider drawn", () => {
    drawWith([{ kind: "missing_data", maxAllowedMissingRate: 0 }]);
    const inputs = [...container.querySelectorAll('input[type="range"]')];
    expect(inputs).toHaveLength(1);
    expect(inputs[0]?.getAttribute("aria-valuetext")).toBe(
      "Off, as in the Variants tab",
    );
    expect(container.textContent).toContain(
      "Maximum proportion of missing genotypes for the PCA",
    );
    expect(container.textContent).toContain(
      "0, as in the Variants tab. The PCA cannot be stricter than the Variants tab here.",
    );
  });

  test("the Variants tab's MAF at 0.5: no slider of the MAF, its name and the line", () => {
    drawWith([{ kind: "maf", maxAllowedMaf: 0.5 }]);
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(1);
    expect(container.textContent).toContain(
      "Maximum major allele frequency for the PCA",
    );
    expect(container.textContent).toContain(
      "0.5, as in the Variants tab. The PCA cannot be stricter than the Variants tab here.",
    );
  });

  test("the Variants tab at 0.1 and its MAF off: both sliders", () => {
    drawWith([{ kind: "missing_data", maxAllowedMissingRate: 0.1 }]);
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(2);
    expect(container.textContent).not.toContain("cannot be stricter");
  });
});

describe("AP10 D1 the drop-down list of the method", () => {
  test("shows the PCA of the genotypes, with the advice of the PCoA under it as its description", () => {
    drawWith([]);
    const button = container.querySelector("button");
    if (button === null) throw new Error("no button");
    expect(button.textContent).toBe("PCA of the genotypes");
    const described = (button.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain(
      "The PCoA suits data with many missing genotypes.",
    );
  });
});
