// @vitest-environment jsdom
/**
 * Where the focus goes on popgen2.html when a change of the filters takes
 * the button of the download, or the text after a download, away from
 * under the focus or a press of the pointer, drawn by React in jsdom over
 * the real store of the page with a fake worker; and the gate of the
 * button, which a flow cannot reach, since the threshold makes its change
 * as it loses the focus (docs/specs/steps/popgen2-download.md, "The
 * dialog").
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  setThreshold,
  setVariantFilter,
  turnOffVariantFilter,
} from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type { JobResult, Run, Written } from "../../worker/protocol.ts";
import { createPopgen2Store, openVariantsFile } from "../popgen2Store.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { createAnnouncer } from "../shell/status.ts";
import { StoreProvider } from "../store.tsx";
import { DownloadVariants } from "./DownloadVariants.tsx";
import { RunGateProvider } from "./runGate.tsx";
import { createRunGate, gatedStore } from "./thresholdRun.ts";
import type { RunGate } from "./thresholdRun.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The sentence of no variant of the file of the tests. */
const NONE =
  "None of the 100 variants of panel.vcf.gz pass the filters, so there is nothing to download.";

const DOWNLOAD = "Download filtered variants…";

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

/** The store of popgen2.html with `panel.vcf.gz` read, the FILTER box
    off, and its one pass finished with 100 variants none of which passed
    their FILTER: the button enabled, and the box ticked would make it
    certain that nothing passes. The writes sent are ended with
    `written`. */
function storeOfPanel(): {
  readonly store: Store<JobResult, Blob>;
  readonly endWrite: (written: Written<Blob>) => void;
} {
  let lastId = 0;
  const passes: { id: number; key: string }[] = [];
  const writes: { id: number; key: string }[] = [];
  const store = createPopgen2Store({
    send: (key) => {
      lastId += 1;
      passes.push({ id: lastId, key });
      return runOf(lastId);
    },
    sendWrite: (key) => {
      lastId += 1;
      writes.push({ id: lastId, key });
      return runOf(lastId);
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const fileId = "c".repeat(32);
  openVariantsFile(store, {
    fileId,
    name: "panel.vcf.gz",
    size: 87_000,
    format: "vcf",
    readOptions: { ploidy: null, onlyPassed: false },
  });
  store.variantsRead(fileId, {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: true,
  });
  store.apply("the FILTER box changed", (p) =>
    turnOffVariantFilter(p, "passed"),
  );
  store.startRun("variantsSummary");
  const pass = passes.at(-1);
  if (pass === undefined) throw new Error("no pass sent");
  store.runEnded(pass.id, {
    kind: "done",
    key: pass.key,
    result: summaryResult(["chr1"], [100], ["s000", "s001"], {
      passed: 0,
      failed: 100,
    }),
  });
  const endWrite = (written: Written<Blob>): void => {
    store.startWrite("vcf");
    const write = writes.at(-1);
    if (write === undefined) throw new Error("no write sent");
    store.runEnded(write.id, { kind: "done", key: write.key, result: written });
  };
  return { store, endWrite };
}

/** A VCF written of 100 variants. */
const WRITTEN: Written<Blob> = {
  format: "vcf",
  file: new Blob(["##fileformat=VCFv4.3"]),
  numBytes: 2_000,
  passStats: {
    numVars: 100,
    filtering: { passed: { varsProcessed: 100, varsKept: 100 } },
  },
};

/** Draws the download in <StrictMode> over `store` and `gate`. */
function draw(store: Store<JobResult, Blob>, gate: RunGate): void {
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          StoreProvider,
          { value: gatedStore(store, gate) },
          createElement(
            RunGateProvider,
            { value: gate },
            createElement(
              AnnouncerProvider,
              { value: createAnnouncer() },
              createElement(DownloadVariants),
            ),
          ),
        ),
      ),
    );
  });
}

/** The button of the download, or a defect. */
function downloadButton(): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === DOWNLOAD,
  );
  if (found === undefined) throw new Error("no button of the download");
  return found;
}

/** The paragraph in place of the button, or `null`. */
function placeText(): HTMLParagraphElement | null {
  return container.querySelector("p");
}

/** Ticks the FILTER box, which makes it certain that nothing passes. */
function tickFilter(store: Store<JobResult, Blob>): void {
  store.apply("the FILTER box changed", (p) =>
    setVariantFilter(p, { kind: "passed" }),
  );
}

describe("the focus when the place of the button changes under it", () => {
  test("the button with the focus, taken by a change: the sentence takes it", () => {
    const { store } = storeOfPanel();
    draw(store, createRunGate());
    downloadButton().focus();

    act(() => {
      tickFilter(store);
    });

    expect(placeText()?.textContent).toBe(NONE);
    expect(document.activeElement).toBe(placeText());
  });

  test("a press of the pointer on the button, then a change: the sentence takes the focus", () => {
    const { store } = storeOfPanel();
    draw(store, createRunGate());
    const button = downloadButton();

    act(() => {
      button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      tickFilter(store);
    });

    expect(document.activeElement).toBe(placeText());
    document.dispatchEvent(new Event("pointerup", { bubbles: true }));
  });

  test("the focus elsewhere: a change that takes the button moves nothing", () => {
    const { store } = storeOfPanel();
    draw(store, createRunGate());
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    elsewhere.focus();

    act(() => {
      tickFilter(store);
    });

    expect(placeText()?.textContent).toBe(NONE);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  test("the text after a download with the focus, taken by a change: the button back takes it", () => {
    const { store, endWrite } = storeOfPanel();
    draw(store, createRunGate());
    act(() => {
      endWrite(WRITTEN);
    });
    const text = placeText();
    expect(text?.textContent).toMatch(/^panel\.filtered\.vcf\.gz written/u);
    text?.focus();

    act(() => {
      store.apply("the missing data filter changed", (p) =>
        setThreshold(p, { of: "variants", kind: "missing_data" }, 0.2),
      );
    });

    expect(document.activeElement).toBe(downloadButton());
  });
});

describe("the gate of the button", () => {
  test("a run held that leaves nothing to download: no dialog, and the sentence takes the focus once drawn", () => {
    const { store } = storeOfPanel();
    const gate = createRunGate();
    draw(store, gate);
    let ended = 0;
    gate.hold(
      () => {
        ended += 1;
        tickFilter(store);
      },
      () => "the FILTER box changed",
    );

    // A click with no pointer and no focus, as an assistive technology
    // may give: the button press alone runs the gate.
    act(() => {
      downloadButton().click();
    });

    expect(ended).toBe(1);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(placeText()?.textContent).toBe(NONE);
    expect(document.activeElement).toBe(placeText());
  });

  test("a run held that keeps the button: the dialog opens", () => {
    const { store } = storeOfPanel();
    const gate = createRunGate();
    draw(store, gate);
    let ended = 0;
    gate.hold(
      () => {
        ended += 1;
      },
      () => null,
    );

    act(() => {
      downloadButton().click();
    });

    expect(ended).toBe(1);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
