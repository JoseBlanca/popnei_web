// @vitest-environment jsdom
/**
 * The section of the statistics of the open file on popgen2.html while its
 * code is slow to download, or fails to: what the status region says of
 * the statistics, and that the next file picked downloads it again. The
 * download is the import() of SectionPlots.tsx, held back or failed by a mock;
 * each test takes the modules of the page afresh, so that the section has
 * not downloaded its code yet.
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

import type { Store } from "../../core/store.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type { Job, JobResult, Outcome, Run } from "../../worker/protocol.ts";

/** How the download of the code of the section goes: held until `gate`
    resolves, then failed when `fail`; `calls` counts the downloads. */
const download = {
  gate: null as Promise<void> | null,
  fail: false,
  calls: 0,
};

/** The code of the section, mocked afresh for each test: Vitest keeps a
    mocked module across vi.resetModules(), and the section of the test
    after would get one bound to the store of the test before. */
function mockDownload(): void {
  vi.doMock("./SectionPlots.tsx", async (importOriginal) => {
    download.calls += 1;
    if (download.gate !== null) await download.gate;
    if (download.fail) {
      // What Chromium says when the file of the code does not come.
      throw new TypeError("Failed to fetch dynamically imported module");
    }
    return importOriginal();
  });
}

/** A request the fake `send` was given, and how the test ends it. */
interface Request {
  readonly key: string;
  readonly job: Job;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** The result of each analysis the page starts, by its id: the summary
    of panel.nei, with the statistics of its two individuals. */
const RESULTS: ReadonlyMap<string, JobResult> = new Map<string, JobResult>([
  ["variantsSummary", summaryResult(["1"], [1200], ["i1", "i2"])],
]);

const FIRST = "0123456789abcdef0123456789abcdef";
const SECOND = "fedcba9876543210fedcba9876543210";

/** The page: its store, the requests sent, every text the status
    region said, and the loads whose section was drawn, its code there. */
interface Page {
  readonly store: Store<JobResult, Blob>;
  readonly requests: Request[];
  readonly said: string[];
  readonly shown: string[];
  /** Opens panel.nei under `fileId`, read as recording the FILTER of its
      variants when `keepsPassed`. */
  readonly open: (fileId: string, keepsPassed?: boolean) => Promise<void>;
}

let container: HTMLElement;
let root: Root;
let caught: unknown[];
/** Aborted when the test ends, so that a wait of a test that failed or
    ran out of time stops, and acts on nothing of the next test. */
let testEnd: AbortController;

// The modules of the page and of the section, compiled once before the
// tests, so that each test takes them afresh at the cost of running them
// and neither pays for their compilation, which is many times longer on a
// loaded machine: the first test paid it alone, and the second ran only as
// fast as it did after it.
beforeAll(async () => {
  await import("../popgen2Store.ts");
  await import("../autoRuns.ts");
  await import("../runs.ts");
  await import("../shell/announcer.tsx");
  await import("../shell/status.ts");
  await import("../store.tsx");
  await import("./announceChanges.ts");
  await import("./StatsSection.tsx");
  await import("./SectionPlots.tsx");
});

beforeEach(() => {
  testEnd = new AbortController();
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
  download.gate = null;
  download.fail = false;
  download.calls = 0;
  vi.resetModules();
  mockDownload();
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
  testEnd.abort();
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** Lets `ms` milliseconds pass, and React draw what they changed. */
async function after(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/** Longer than the pause of the status region before it speaks. */
const REGION_PAUSE_MS = 150;

/** Draws the section in <StrictMode> over modules taken afresh, wired to
    the status region as the entry of the page wires it. */
async function drawPage(): Promise<Page> {
  const { loadVariants } = await import("../../core/project.ts");
  const { createAutoRuns } = await import("../autoRuns.ts");
  const { POPGEN2_AUTO_GROUPS, createPopgen2Store } =
    await import("../popgen2Store.ts");
  const { startAnalysis } = await import("../runs.ts");
  const { AnnouncerProvider } = await import("../shell/announcer.tsx");
  const { createAnnouncer } = await import("../shell/status.ts");
  const { StoreProvider } = await import("../store.tsx");
  const { announceChanges } = await import("./announceChanges.ts");
  const { StatsSection } = await import("./StatsSection.tsx");
  const { RunGateProvider } = await import("./runGate.tsx");
  const { createRunGate, gatedStore } = await import("./thresholdRun.ts");
  const gate = createRunGate();

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
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
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
  const announcer = createAnnouncer();
  const said: string[] = [];
  announcer.subscribe(() => {
    const text = announcer.getState();
    if (text !== "") said.push(text);
  });
  const announceShown = announceChanges(store, announcer, () => null);
  const shown: string[] = [];
  const onShown = (fileId: string): (() => void) => {
    shown.push(fileId);
    return announceShown(fileId);
  };
  const openButton = createRef<HTMLButtonElement>();
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
  const open = async (fileId: string, keepsPassed = false): Promise<void> => {
    await act(async () => {
      store.apply("a new variants file was loaded", (p) =>
        loadVariants(p, {
          fileId,
          name: "panel.nei",
          size: 261_490,
          format: "nei",
          readOptions: null,
        }),
      );
      store.variantsRead(fileId, {
        kind: "read",
        individuals: ["i1", "i2"],
        ploidy: 2,
        numVars: null,
        keepsPassed,
      });
      await Promise.resolve();
    });
  };
  return { store, requests, said, shown, open };
}

/** The section of the statistics, once drawn, or `null`. */
function sectionOf(): Element | null {
  return container.querySelector(
    'section[aria-label="Statistics of the file"]',
  );
}

/** The text of `node` that is shown, without what is hidden from a
    screen reader: the room of the plots, whose boxes have words. */
function shownText(node: Node | null): string {
  if (node === null) return "";
  if (node instanceof Element && node.getAttribute("aria-hidden") === "true") {
    return "";
  }
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  return [...node.childNodes].map(shownText).join("");
}

/** Ends the last request sent with the result of its analysis. */
async function endDone(page: Page): Promise<void> {
  const request = page.requests.at(-1);
  if (request === undefined) throw new Error("no request was sent");
  const result = RESULTS.get(request.job.analysis);
  if (result === undefined) throw new Error("no result for the request");
  request.end({ kind: "done", key: request.key, result });
  await after(0);
}

/** Waits, letting React draw every 10 ms, until `done` holds; stops when
    the test ends, by its timeout too, so that no wait outlives its test. */
async function until(done: () => boolean): Promise<void> {
  while (!done()) {
    if (testEnd.signal.aborted) {
      throw new Error("the test ended before what it waited for");
    }
    await after(10);
  }
}

/** Waits for the section of the load `fileId` to be drawn, its code
    imported afresh with the plots and D3, and then held back 300 ms by
    React, as the first download is, in place of the section drawn while
    it downloads. */
async function sectionDrawn(page: Page, fileId: string): Promise<void> {
  await until(() => page.shown.includes(fileId));
}

/** The texts said that speak of the statistics, each the whole text of
    one pause of the region. */
function saidOfStats(page: Page): readonly string[] {
  return page.said.filter((text) => text.includes("statistics"));
}

describe("the section of the statistics while its code downloads", () => {
  test("statistics calculated before their section is drawn are said once it is drawn, and not before", async () => {
    let release = (): void => undefined;
    download.gate = new Promise((resolve) => {
      release = resolve;
    });
    const page = await drawPage();
    await page.open(FIRST);
    await endDone(page);
    expect(page.requests.map((r) => r.job.analysis)).toEqual([
      "variantsSummary",
    ]);
    await after(REGION_PAUSE_MS);
    // While the code of its plots downloads, the section has its two
    // headings, and says of each part that it is calculated, over the
    // room of its plots, never a count done with no word of the
    // statistics; nothing is said of them yet.
    expect(shownText(sectionOf())).toBe(
      "VariantsCalculating the statistics of the variants…IndividualsCalculating the statistics of the individuals…",
    );
    expect(page.shown).toEqual([]);
    expect(saidOfStats(page)).toEqual([]);

    release();
    await sectionDrawn(page, FIRST);
    expect(sectionOf()?.querySelectorAll("svg.chart")).toHaveLength(6);
    await after(REGION_PAUSE_MS);
    expect(saidOfStats(page)).toEqual([
      "The statistics of panel.nei are calculated.",
    ]);
  });

  test("with the download failed nothing is said of the statistics, and the next file downloads the code again and draws its section", async () => {
    download.fail = true;
    const page = await drawPage();
    await page.open(FIRST);
    // The failed download reaches the boundary of the section once the
    // import of the mock has thrown, after as many turns as the machine
    // takes.
    await until(() => caught.length > 0);
    expect(caught).toHaveLength(1);
    expect(sectionOf()).toBeNull();
    await endDone(page);
    await after(REGION_PAUSE_MS);
    expect(saidOfStats(page)).toEqual([]);
    expect(download.calls).toBe(1);

    download.fail = false;
    await page.open(SECOND);
    await sectionDrawn(page, SECOND);
    expect(download.calls).toBe(2);
    await endDone(page);
    await after(REGION_PAUSE_MS);
    // Said with the read and the count, in one pause of the region, the
    // end of the pass in place of its start.
    expect(saidOfStats(page)).toHaveLength(1);
    expect(saidOfStats(page)[0]).toContain(
      "The statistics of panel.nei are calculated.",
    );
    expect(saidOfStats(page)[0]).not.toContain("Calculating");
  });

  test("the FILTER box drawn while the code of the plots downloads is the same element once it arrives, and keeps the focus", async () => {
    let release = (): void => undefined;
    download.gate = new Promise((resolve) => {
      release = resolve;
    });
    const page = await drawPage();
    await page.open(FIRST, true);
    await endDone(page);
    const box = container.querySelector('input[type="checkbox"]');
    if (!(box instanceof HTMLInputElement)) throw new Error("no FILTER box");
    act(() => {
      box.focus();
    });
    expect(page.shown).toEqual([]);

    release();
    await sectionDrawn(page, FIRST);
    expect(sectionOf()?.querySelectorAll("svg.chart")).toHaveLength(6);
    expect(container.querySelector('input[type="checkbox"]')).toBe(box);
    expect(document.activeElement).toBe(box);
  });
});
