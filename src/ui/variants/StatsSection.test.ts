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
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { loadVariants } from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Run,
  RunError,
} from "../../worker/protocol.ts";
import { createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_CHAIN,
  createPopgen2Store,
} from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { createAnnouncer } from "../shell/status.ts";
import { StoreProvider } from "../store.tsx";
import { announceChanges } from "./announceChanges.ts";
import { StatsSection } from "./StatsSection.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** A request the fake `send` was given, and how the test ends it. */
interface Request {
  readonly key: string;
  readonly job: Job;
  readonly end: (outcome: Outcome<JobResult>) => void;
  /** Gives the store a result so far of the request. */
  readonly soFar: (result: JobResult) => void;
}

/** The result of each analysis the page starts, by its id: the summary
    of panel.nei, 1,200 variants on the chromosome 1, with the statistics
    of its two individuals. */
const RESULTS: ReadonlyMap<string, JobResult> = new Map<string, JobResult>([
  ["variantsSummary", summaryResult(["1"], [1200], ["i1", "i2"])],
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

beforeAll(async () => {
  // The code of the statistics, which the section loads by import() once
  // a file is picked, made ready once, so that each test waits for it a
  // few turns and not for its first transform.
  await import("./FileStats.tsx");
});

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
async function drawPage(announced = true): Promise<Page> {
  const requests: Request[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (key, job, _onProgress, onSoFar): Run<JobResult> => {
      lastId += 1;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        requests.push({ key, job, end: resolve, soFar: onSoFar });
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
  const announcer = createAnnouncer();
  const onShown = announced
    ? announceChanges(store, announcer, () => null)
    : () => () => undefined;
  const tree = createElement(
    StrictMode,
    null,
    createElement(
      StoreProvider,
      { value: store },
      createElement(
        AnnouncerProvider,
        { value: announcer },
        createElement("button", { ref: openButton }, "Open variants file…"),
        createElement(StatsSection, { autoRuns, openButton, onShown }),
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
  await read(page, fileId);
  // The code of the statistics comes by import(), a few turns later.
  for (let turn = 0; turn < 50 && sectionOf() === null; turn += 1) {
    await settled();
  }
  if (sectionOf() === null) throw new Error("the section was not drawn");
}

/** Opens `panel.nei` under `fileId` and records its read, in one act. */
async function read(page: Page, fileId: string): Promise<void> {
  await act(async () => {
    readUnwrapped(page, fileId);
    await Promise.resolve();
  });
}

/** Opens `panel.nei` under `fileId` and records its read. */
function readUnwrapped(page: Page, fileId: string): void {
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
}

/** The section of the statistics, once drawn, or `null`. */
function sectionOf(): Element | null {
  return container.querySelector(
    'section[aria-label="Statistics of the file"]',
  );
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

/** The text of the parts of the section, the line over the room of
    each. */
function partsText(): string {
  return sectionOf()?.textContent ?? "";
}

describe("the section of the statistics of the open file", () => {
  test("the section of a second file is drawn within a few milliseconds of its read, its code already downloaded", async () => {
    const page = await drawPage();
    await open(page, FIRST);
    await endDone(page);

    // Outside act(), which would draw at once what React holds back: a
    // section that waits for its code is drawn 300 ms after it comes.
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    const first = sectionOf();
    const start = performance.now();
    readUnwrapped(page, SECOND);
    const drawn = (): boolean => ![null, first].includes(sectionOf());
    while (!drawn() && performance.now() - start < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
    expect(drawn()).toBe(true);
    expect(performance.now() - start).toBeLessThan(100);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  test("a defect drawn in the section leaves its name alone, and the next file draws its statistics again", async () => {
    // The words of the status region would throw the same defect first.
    const page = await drawPage(false);
    await open(page, FIRST);
    // Histograms of 2 bins with no variant in them, which the page draws
    // as 40 bins over 0 to 1 and popnei never gives, are a defect thrown
    // as the section draws its plots.
    const request = page.requests.at(-1);
    if (request === undefined) throw new Error("no request was sent");
    request.end({
      kind: "done",
      key: request.key,
      result: summaryResult(["1"], [0], ["i1", "i2"]),
    });
    await settled();
    expect(caught).toHaveLength(1);
    expect(container.querySelector("h2")?.textContent).toBe(
      "Statistics of the file",
    );
    expect(container.textContent).not.toContain("Variants");

    await open(page, SECOND);
    expect(partsText()).toContain(
      "Calculating the statistics of the variants…",
    );
    await endDone(page);
    expect(page.requests.map((r) => r.job.analysis)).toEqual([
      "variantsSummary",
      "variantsSummary",
    ]);
    expect(container.querySelectorAll("svg.chart")).toHaveLength(6);
  });

  test("the section has no bar and no button of its own; each part says it is calculated while the pass runs, Stopped. after the Stop of the page, and Not calculated. in place of its plots after a failure", async () => {
    const page = await drawPage();
    await open(page, FIRST);
    expect(partsText()).toContain(
      "Calculating the statistics of the variants…",
    );
    expect(partsText()).toContain(
      "Calculating the statistics of the individuals…",
    );
    expect(sectionOf()?.querySelector('[role="progressbar"]')).toBeNull();
    // Not even the download, which comes with the result.
    expect(sectionOf()?.querySelectorAll("button")).toHaveLength(0);

    await act(async () => {
      page.autoRuns.stop(POPGEN2_CHAIN);
      page.requests.at(-1)?.end({ kind: "cancelled" });
      await Promise.resolve();
    });
    await settled();
    expect(partsText().match(/Stopped\./gu)).toHaveLength(2);

    await act(async () => {
      page.autoRuns.resume(POPGEN2_CHAIN);
      await Promise.resolve();
    });
    await endFailed(page, {
      kind: "popnei",
      message: "a genotype of 3 alleles",
    });
    expect(partsText().match(/Not calculated\./gu)).toHaveLength(2);
    expect(container.querySelectorAll("svg.chart")).toHaveLength(0);
  });

  test("live-stats 2 the plots are drawn from each result so far while the pass runs, saying so, with no download, and from the result at its end", async () => {
    const page = await drawPage();
    await open(page, FIRST);
    expect(container.querySelectorAll("svg.chart")).toHaveLength(0);
    const request = page.requests.at(-1);
    if (request === undefined) throw new Error("no request was sent");
    await act(async () => {
      request.soFar(summaryResult(["1"], [523], ["i1", "i2"]));
      await Promise.resolve();
    });
    await settled();
    expect(container.querySelectorAll("svg.chart")).toHaveLength(6);
    // The line of each threshold, over the variants or the individuals
    // so far.
    expect(partsText().match(/Keeps [^.]*523 variants so far/gu)).toHaveLength(
      4,
    );
    expect(partsText().match(/Keeps [^.]*2 individuals so far/gu)).toHaveLength(
      2,
    );
    expect(partsText()).toContain(
      "Calculating the statistics of the variants…",
    );
    expect(sectionOf()?.querySelectorAll("button")).toHaveLength(0);
    // Each plot keeps its element as the next result so far comes.
    const before = [...container.querySelectorAll("svg.chart")];
    await act(async () => {
      request.soFar(summaryResult(["1"], [1000], ["i1", "i2"]));
      await Promise.resolve();
    });
    await settled();
    expect(
      partsText().match(/Keeps [^.]*1,000 variants so far/gu),
    ).toHaveLength(4);
    expect([...container.querySelectorAll("svg.chart")]).toEqual(before);

    await endDone(page);
    expect(partsText()).not.toContain("so far");
    expect(partsText()).not.toContain("Calculating");
    expect(partsText().match(/Keeps [^.]*1,200 variants/gu)).toHaveLength(4);
    expect(
      [...(sectionOf()?.querySelectorAll("button") ?? [])].map(
        (element) => element.textContent,
      ),
    ).toEqual([
      "Download the missing genotypes and heterozygosity of each individual (CSV)",
    ]);
  });
});
