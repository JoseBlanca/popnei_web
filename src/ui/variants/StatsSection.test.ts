// @vitest-environment jsdom
/**
 * The section of the statistics of the open file on popgen2.html, drawn
 * by React in jsdom over the real store of the page, with a fake `send`
 * whose requests the test ends by hand, and the analyses the page starts
 * by itself: the boundary of errors that starts again with each file, and
 * the focus when the button of the statistics goes with it. What a flow
 * cannot make happen, a defect drawn in the section or a failure the
 * fixtures cannot give, is made here.
 */
import { StrictMode, act, createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { loadVariants } from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Run,
  RunError,
  VariantDistrib,
} from "../../worker/protocol.ts";
import { createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { POPGEN2_AUTO_GROUPS, createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { createAnnouncer } from "../shell/status.ts";
import { StoreProvider } from "../store.tsx";
import { StatsSection } from "./StatsSection.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** A request the fake `send` was given, and how the test ends it. */
interface Request {
  readonly key: string;
  readonly job: Job;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** A histogram of the variants of 2 bins, all 1,200 in the first. */
function distrib(mean: number): VariantDistrib {
  return { mean, counts: Uint32Array.from([1200, 0]) };
}

/** The result of each analysis the page starts, by its id. */
const RESULTS: ReadonlyMap<string, JobResult> = new Map<string, JobResult>([
  [
    "variantsSummary",
    {
      analysis: "variantsSummary",
      passStats: { numVars: 1200, filtering: {} },
      chroms: ["1"],
      numVarsPerChrom: new Uint32Array([1200]),
    },
  ],
  [
    "individualChecks",
    {
      analysis: "individualChecks",
      individuals: ["i1", "i2"],
      missingGtRate: Float64Array.from([0.02, 0.04]),
      obsHetRate: Float64Array.from([0.3, 0.4]),
      passStats: { numVars: 1200, filtering: {} },
    },
  ],
  [
    "variantChecks",
    {
      analysis: "variantChecks",
      binEdges: Float64Array.from([0, 0.5, 1]),
      missingRate: distrib(0.03),
      maf: distrib(0.7),
      obsHet: distrib(0.35),
      unbiasedExpHet: distrib(0.37),
      passStats: { numVars: 1200, filtering: {} },
    },
  ],
]);

const FIRST = "0123456789abcdef0123456789abcdef";
const SECOND = "fedcba9876543210fedcba9876543210";

/** The page: its store, the analyses it starts by itself, the requests
    sent, and the open button the section gives the focus to. */
interface Page {
  readonly store: Store<JobResult, Blob>;
  readonly autoRuns: AutoRuns;
  readonly requests: Request[];
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
}

let container: HTMLElement;
let root: Root;
let caught: unknown[];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no ResizeObserver, which the plots ask for their size.
  globalThis.ResizeObserver = class {
    observe(): void {
      // Nothing is laid out in jsdom.
    }
    unobserve(): void {
      // Nothing is laid out in jsdom.
    }
    disconnect(): void {
      // Nothing is laid out in jsdom.
    }
  };
  container = document.createElement("div");
  document.body.append(container);
  caught = [];
  root = createRoot(container, {
    onCaughtError: (error) => {
      caught.push(error);
    },
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** Lets the outcomes given settle, and React draw what they changed. */
async function settled(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Draws the section in <StrictMode>, as the development server draws the
    page, with the open button before it. */
async function drawPage(): Promise<Page> {
  const requests: Request[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (key, job): Run<JobResult> => {
      lastId += 1;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        requests.push({ key, job, end: resolve });
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      autoRuns.sync();
    });
  });
  const openButton = createRef<HTMLButtonElement>();
  const tree = createElement(
    StrictMode,
    null,
    createElement(
      StoreProvider,
      { value: store },
      createElement(
        AnnouncerProvider,
        { value: createAnnouncer() },
        createElement("button", { ref: openButton }, "Open variants file…"),
        createElement(StatsSection, { autoRuns, openButton }),
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
    await Promise.resolve();
  });
  return { store, autoRuns, requests, openButton };
}

/** Opens `panel.nei` under `fileId`, records its read, and lets the
    section draw it, the count of its variants sent. */
async function open(page: Page, fileId: string): Promise<void> {
  await act(async () => {
    page.store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, {
        fileId,
        name: "panel.nei",
        size: 261_490,
        format: "nei",
        readOptions: null,
      }),
    );
    page.store.variantsRead(fileId, {
      kind: "read",
      individuals: ["i1", "i2"],
      ploidy: 2,
      numVars: null,
    });
    await Promise.resolve();
  });
  await settled();
}

/** Ends the last request sent with the result of its analysis. */
async function endDone(page: Page): Promise<void> {
  const request = page.requests.at(-1);
  if (request === undefined) throw new Error("no request was sent");
  const result = RESULTS.get(request.job.analysis);
  if (result === undefined) throw new Error("no result for the request");
  request.end({ kind: "done", key: request.key, result });
  await settled();
}

/** Ends the last request sent with the failure `error`. */
async function endFailed(page: Page, error: RunError): Promise<void> {
  const request = page.requests.at(-1);
  if (request === undefined) throw new Error("no request was sent");
  request.end({ kind: "failed", error });
  await settled();
}

/** The analysis of the last request sent. */
function lastAnalysis(page: Page): string | undefined {
  return page.requests.at(-1)?.job.analysis;
}

/** The button of the section named `name`. */
function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (element) => element.textContent === name,
  );
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
}

/** The words of what has the focus. */
function focused(): string {
  return document.activeElement?.textContent ?? "";
}

describe("the section of the statistics of the open file", () => {
  test("a defect drawn in the section leaves its name alone, and the next file draws its statistics again", async () => {
    const page = await drawPage();
    await open(page, FIRST);
    await endDone(page);
    expect(lastAnalysis(page)).toBe("variantChecks");
    // A failure of the files wasm, which the calculation worker does not
    // hold, is a defect thrown as the section draws its words.
    await endFailed(page, { kind: "files", message: "a defect" });
    expect(caught).toHaveLength(1);
    expect(container.querySelector("h2")?.textContent).toBe(
      "Statistics of the file",
    );
    expect(container.textContent).not.toContain("Variants");

    await open(page, SECOND);
    expect(container.textContent).toContain(
      "Waiting for the count of the variants.",
    );
    await endDone(page);
    expect(lastAnalysis(page)).toBe("variantChecks");
    await endDone(page);
    await endDone(page);
    expect(container.querySelectorAll("svg.chart")).toHaveLength(6);
  });

  test("the button gone with the focus on it, after popnei refused the statistics of the individuals, the focus is on the heading of the individuals", async () => {
    const page = await drawPage();
    await open(page, FIRST);
    await endDone(page);
    button("Stop the statistics").focus();
    await endDone(page);
    expect(lastAnalysis(page)).toBe("individualChecks");
    expect(focused()).toBe("Stop the statistics");

    await endFailed(page, {
      kind: "popnei",
      message: "a genotype of 3 alleles",
    });
    expect(container.textContent).not.toContain("Stop the statistics");
    expect(document.activeElement?.tagName).toBe("H2");
    expect(focused()).toBe("Individuals");
  });

  test("the button gone with the focus on it, after popnei refused the histograms of the variants, the focus is on the heading of the variants", async () => {
    const page = await drawPage();
    await open(page, FIRST);
    await endDone(page);
    button("Stop the statistics").focus();

    await endFailed(page, {
      kind: "popnei",
      message: "a genotype of 3 alleles",
    });
    expect(page.requests).toHaveLength(2);
    expect(container.textContent).not.toContain("Stop the statistics");
    expect(document.activeElement?.tagName).toBe("H2");
    expect(focused()).toBe("Variants");
  });
});
