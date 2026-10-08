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
  vi,
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
import { RunGateProvider } from "./runGate.tsx";
import { StatsSection } from "./StatsSection.tsx";
import { createRunGate, gatedStore } from "./thresholdRun.ts";

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
  /** The loads whose section was drawn with the code of its plots. */
  readonly shown: string[];
}

let container: HTMLElement;
let root: Root;
let caught: unknown[];

beforeAll(async () => {
  // The code of the plots, which the section loads by import() once a
  // file is picked, made ready once, so that each test waits for it a few
  // turns and not for its first transform.
  await import("./SectionPlots.tsx");
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
  const gate = createRunGate();
  const announceShown = announced
    ? announceChanges(store, announcer, () => null)
    : () => () => undefined;
  const shown: string[] = [];
  const onShown = (fileId: string): (() => void) => {
    shown.push(fileId);
    return announceShown(fileId);
  };
  const tree = createElement(
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
          { value: announcer },
          createElement("button", { ref: openButton }, "Open variants file…"),
          createElement(StatsSection, { autoRuns, openButton, onShown }),
        ),
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
    await Promise.resolve();
  });
  return { store, autoRuns, requests, openButton, shown };
}

/** Opens `panel.nei` under `fileId`, records its read, and lets the
    section draw it with the code of its plots, the count of its variants
    sent. */
async function open(page: Page, fileId: string): Promise<void> {
  await read(page, fileId);
  // The code of the plots comes by import(), a few turns later.
  for (let turn = 0; turn < 50 && !page.shown.includes(fileId); turn += 1) {
    await settled();
  }
  if (!page.shown.includes(fileId)) {
    throw new Error("the section was not drawn with its plots' code");
  }
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
    keepsPassed: false,
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
    const empty = summaryResult(["1"], [0], ["i1", "i2"]);
    const twoBins = { mean: NaN, counts: Uint32Array.of(0, 0) };
    request.end({
      kind: "done",
      key: request.key,
      result: {
        ...empty,
        perVar: {
          ...empty.perVar,
          binEdges: Float64Array.of(0, 0.5, 1),
          missingRate: twoBins,
          maf: twoBins,
          obsHet: twoBins,
          unbiasedExpHet: twoBins,
        },
      },
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

  test("SF9 D5 a run of the keys waiting in a box when its plot leaves the page, the pass failed, is made a change at once, with no warning of React", async () => {
    const warned = vi.spyOn(console, "error");
    try {
      const page = await drawPage();
      await open(page, FIRST);
      const request = page.requests.at(-1);
      if (request === undefined) throw new Error("no request was sent");
      await act(async () => {
        request.soFar(summaryResult(["1"], [523], ["i1", "i2"]));
        await Promise.resolve();
      });
      await settled();
      const box = sectionOf()?.querySelector(
        '[role="group"][aria-label="Major allele frequency"] input[data-number-field]',
      );
      if (!(box instanceof HTMLInputElement)) throw new Error("no MAF box");
      // Down from off turns the MAF on below the top of its axis, in a run
      // that waits a second before it is a change.
      await act(async () => {
        box.focus();
        box.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        );
        await Promise.resolve();
      });
      // The run waits: the last step of Undo is still the opening.
      expect(page.store.getState().undo).toBe("a new variants file was loaded");
      const pressedAt = performance.now();

      await endFailed(page, {
        kind: "popnei",
        message: "a genotype of 3 alleles",
      });
      expect(container.querySelectorAll("svg.chart")).toHaveLength(0);
      // Made by the threshold as it left, well before the run's second.
      expect(performance.now() - pressedAt).toBeLessThan(500);
      expect(page.store.getState().undo).toBe("the MAF filter was turned on");
      expect(warned).not.toHaveBeenCalled();
    } finally {
      warned.mockRestore();
    }
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
    // No line of what a threshold keeps: the four that start off, the
    // MAF's, the observed heterozygosity's and the individuals' two,
    // remove nothing, which the description of their box says; the
    // expected heterozygosity has no threshold.
    expect(partsText()).not.toMatch(/Keeps /u);
    expect(partsText().match(/This filter removes nothing\./gu)).toHaveLength(
      4,
    );
    // A box for each threshold, five: the line comes once the plot is
    // laid out, which jsdom does not do.
    expect(
      sectionOf()?.querySelectorAll('[role="group"] input[data-number-field]'),
    ).toHaveLength(5);
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
    expect(partsText().match(/This filter removes nothing\./gu)).toHaveLength(
      4,
    );
    expect([...container.querySelectorAll("svg.chart")]).toEqual(before);

    await endDone(page);
    expect(partsText()).not.toContain("so far");
    // The line of the pass keeps its room, hidden, so that the plots do
    // not move up (th4 fix 2); nothing else says it.
    const rooms = [...(sectionOf()?.querySelectorAll("p") ?? [])].filter(
      (line) => line.textContent.startsWith("Calculating"),
    );
    expect(rooms.map((line) => line.getAttribute("aria-hidden"))).toEqual([
      "true",
      "true",
    ]);
    expect(partsText().match(/This filter removes nothing\./gu)).toHaveLength(
      4,
    );
    expect(
      [...(sectionOf()?.querySelectorAll("button") ?? [])].map(
        (element) => element.textContent,
      ),
    ).toEqual([
      "Download the missing genotypes and heterozygosity of each individual (CSV)",
    ]);
  });
});

describe("SF10 D2 the plots after a Stop, in the section", () => {
  /** Opens the first file, gives the store a result so far of 523
      variants, and stops the pass as the Stop of the box does; the
      request is ended by `ending`, as the worker would end it. */
  async function stoppedAfterSoFar(ending: Outcome<JobResult>): Promise<Page> {
    const page = await drawPage();
    await open(page, FIRST);
    const request = page.requests.at(-1);
    if (request === undefined) throw new Error("no request was sent");
    await act(async () => {
      request.soFar(summaryResult(["1"], [523], ["i1", "i2"]));
      await Promise.resolve();
    });
    await settled();
    await act(async () => {
      page.autoRuns.stop(POPGEN2_CHAIN);
      request.end(ending);
      await Promise.resolve();
    });
    await settled();
    return page;
  }

  /** The lines of the section a screen reader reads, not the rooms. */
  function shownLines(): readonly string[] {
    return [...(sectionOf()?.querySelectorAll("p") ?? [])]
      .filter((line) => line.getAttribute("aria-hidden") !== "true")
      .map((line) => line.textContent);
  }

  test("the plots read before the Stop stay, each part and each description saying so, with no download", async () => {
    await stoppedAfterSoFar({ kind: "cancelled" });
    expect(container.querySelectorAll("svg.chart")).toHaveLength(6);
    const stopped =
      "Stopped. The plots are of the variants read before the Stop. Start again reads the file from the start.";
    expect(shownLines().filter((line) => line === stopped)).toHaveLength(2);
    expect(shownLines()).not.toContain(
      "Stopped. Start again reads the file from the start.",
    );
    const descriptions = [...container.querySelectorAll("svg.chart desc")];
    expect(descriptions).toHaveLength(6);
    for (const description of descriptions) {
      expect(description.textContent).toMatch(
        / Drawn from the variants read before the Stop\.$/u,
      );
    }
    expect(partsText()).not.toContain("so far");
    expect(sectionOf()?.querySelectorAll("button")).toHaveLength(0);
  });

  test("Start again drops them and reads the file again", async () => {
    const page = await stoppedAfterSoFar({ kind: "cancelled" });
    await act(async () => {
      page.autoRuns.resume(POPGEN2_CHAIN);
      await Promise.resolve();
    });
    await settled();
    expect(container.querySelectorAll("svg.chart")).toHaveLength(0);
    expect(shownLines().join(" ")).not.toContain("before the Stop");
    expect(page.requests.map((r) => r.job.analysis)).toEqual([
      "variantsSummary",
      "variantsSummary",
    ]);
  });

  test("a failure of the pass being stopped drops them, since what was read may be what popnei refused", async () => {
    await stoppedAfterSoFar({
      kind: "failed",
      error: { kind: "popnei", message: "a genotype of 3 alleles" },
    });
    expect(container.querySelectorAll("svg.chart")).toHaveLength(0);
    expect(partsText().match(/Not calculated\./gu)).toHaveLength(2);
    expect(shownLines().join(" ")).not.toContain("before the Stop");
  });

  test("another file drops them", async () => {
    const page = await stoppedAfterSoFar({ kind: "cancelled" });
    await open(page, SECOND);
    expect(container.querySelectorAll("svg.chart")).toHaveLength(0);
    expect(shownLines().join(" ")).not.toContain("before the Stop");
  });
});
