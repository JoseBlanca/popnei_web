// @vitest-environment jsdom
/**
 * The button of the PCA tab of popgen2.html once the PCA is calculated
 * again by itself (docs/specs/steps/popgen2-pca.md, "Run and Stop" and
 * "The states"), drawn by React in jsdom over the real store of the page
 * with a fake worker, the gate and the analyses started by themselves:
 * Run through `autoRuns.run`, Stop through `autoRuns.pause`; during the
 * quiet second Stop in the place of Run, beside its line, and the line
 * of the dialog of the download while it is open; Stop in the place of
 * Run while the PCA is live and locked; and the line beside Run after a
 * Stop.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { pcaOnPopgen2, pcaOptions } from "../../../core/analyses/pca.ts";
import { setAnalysisOptions, setVariantFilter } from "../../../core/project.ts";
import { summaryResult } from "../../../core/testSupport.ts";
import type { Job, JobResult, Outcome, Run } from "../../../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../../autoRuns.ts";
import type { AutoRuns } from "../../autoRuns.ts";
import { POPGEN2_LIVE } from "../../../core/apps.ts";
import {
  POPGEN2_AUTO_GROUPS,
  createPopgen2Store,
  openVariantsFile,
} from "../../popgen2Store.ts";
import type { Popgen2PageStore } from "../../popgen2Store.ts";
import { startAnalysis } from "../../runs.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import { createAnnouncer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { RunGateProvider } from "../../variants/runGate.tsx";
import { AutoRunsProvider } from "../../variants/filtersLock.ts";
import { createRunGate, gatedStore } from "../../variants/thresholdRun.ts";
import type { RunGate } from "../../variants/thresholdRun.ts";
import { ChangeHoldsProvider } from "../../widgets/changeHold.ts";
import { PcaTab } from "./PcaTab.tsx";
import { failureEndsLive } from "./liveEnd.ts";

// The result drawn as nothing: its plots need a browser's layout, and
// what is checked here is the button and its line.
vi.mock("./PcaTabResults.tsx", () => ({
  PcaTabResults: () => null,
  prefetchPcaResults: () => undefined,
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const ABOUT =
  "The PCA starts again in a moment, once the filters and its options stop changing.";
const ABOUT_DIALOG =
  "The PCA starts again when the download is written or closed.";
const STOPPED =
  "Stopped: the PCA no longer starts by itself after a change. Run calculates it and starts it again after each change.";
/** The line under Stop recalculating with the result shown until 11
    October 2026, when the owner took it away (round 1 of work package 8
    of docs/plans/no-undo.md). */
const LIVE_DONE =
  "The PCA is calculated again after each change of the filters or of its options.";
const NO_DISTANCE = "Type the LD distance above, or turn the LD pruning off.";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
});

/** A request of the fake worker. */
interface Request {
  readonly id: number;
  readonly key: string;
  readonly job: Job;
  cancelled: boolean;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** What a test drives. */
interface Page {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly autoRuns: AutoRuns;
  readonly gate: RunGate;
  readonly pcaRequests: () => readonly Request[];
  readonly endPca: () => Promise<void>;
}

/** A result of the PCA of `s000` and `s001`. */
function pcaResult(): JobResult {
  return {
    analysis: "pca",
    method: "pca",
    individuals: ["s000", "s001"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from([1, -1]),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: 548,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars: 548, filtering: {} },
  };
}

/** Lets the promises of the fake worker and the page's `sync` settle. */
async function settle(): Promise<void> {
  await act(async () => {
    for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
  });
}

/** The PCA tab drawn in <StrictMode> over the store of the page, with
    `panel.nei` read, its one pass done and the LD distance typed. */
async function drawTab(): Promise<Page> {
  const requests: Request[] = [];
  const raw = createPopgen2Store({
    send: (key, job): Run<JobResult> => {
      const id = requests.length + 1;
      let request: Request | null = null;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        request = { id, key, job, cancelled: false, end: resolve };
        requests.push(request);
      });
      return {
        id,
        outcome,
        cancel: () => {
          if (request !== null) request.cancelled = true;
        },
      };
    },
    sendWrite: () => {
      throw new Error("no write here");
    },
    appVersion: "0.1.0",
  });
  raw.popneiReady("0.2.2");
  const gate = createRunGate();
  const store = gatedStore(raw, gate);
  const autoRuns = createAutoRuns({
    store: raw,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(raw, id),
    live: {
      analyses: POPGEN2_LIVE,
      changes: gate,
      runStart: (id) => startAnalysis(store, id),
      quietMs: LIVE_QUIET_MS,
      endsLive: failureEndsLive,
    },
  });
  raw.subscribe(() => {
    queueMicrotask(() => {
      autoRuns.sync();
    });
  });
  const fileId = "a".repeat(32);
  openVariantsFile(store, {
    fileId,
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  });
  raw.variantsRead(fileId, {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  store.apply("the LD distance changed", (p) =>
    setAnalysisOptions(p, pcaOnPopgen2, {
      ...pcaOptions(p, "popgen2"),
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
    }),
  );
  await settle();
  const pass = requests[0];
  if (pass === undefined) throw new Error("the one pass did not start");
  pass.end({
    kind: "done",
    key: pass.key,
    result: summaryResult(["1"], [1200]),
  });
  await settle();
  await act(async () => {
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
              RunGateProvider,
              { value: gate },
              createElement(
                ChangeHoldsProvider,
                { value: gate },
                createElement(
                  AutoRunsProvider,
                  { value: autoRuns },
                  createElement(PcaTab, { autoRuns, shown: false }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await Promise.resolve();
  });
  const pcaRequests = (): readonly Request[] =>
    requests.filter((r) => r.job.analysis === "pca");
  return {
    store,
    autoRuns,
    gate,
    pcaRequests,
    endPca: async () => {
      const last = pcaRequests().at(-1);
      if (last === undefined) throw new Error("no PCA sent");
      last.end({ kind: "done", key: last.key, result: pcaResult() });
      await settle();
    },
  };
}

/** The button of the tab named `name`, or `null`. */
function button(
  name: "Run" | "Stop" | "Stop recalculating",
): HTMLButtonElement | null {
  return (
    [...container.querySelectorAll("button")].find(
      (b) => b.textContent === name,
    ) ?? null
  );
}

/** Whether a line of the tab, a paragraph, reads `text`. */
function lineShown(text: string): boolean {
  return [...container.querySelectorAll("p")].some(
    (p) => p.textContent === text,
  );
}
/** The words that describe `element`, by its `aria-describedby`. */
function descriptionOf(element: Element | null): string {
  const ids = element?.getAttribute("aria-describedby") ?? "";
  return ids
    .split(" ")
    .filter((id) => id !== "")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
}

/** Presses `element` as a click does. */
async function press(element: HTMLButtonElement | null): Promise<void> {
  if (element === null) throw new Error("no button to press");
  await act(async () => {
    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    element.click();
    await Promise.resolve();
  });
  await settle();
}

/** The missing rate of the variants set to `value`, as a threshold does. */
async function setMissing(page: Page, value: number): Promise<void> {
  await act(async () => {
    page.store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: value,
      }),
    );
    await Promise.resolve();
  });
  await settle();
}

/** Moves the clock by `ms`, and lets what it starts settle. */
async function wait(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await settle();
}

describe("NU4 D2 the PCA tab with the PCA calculated again by itself", () => {
  test("Run makes the PCA live and starts it, through autoRuns; Stop ends the live state", async () => {
    const page = await drawTab();
    expect(descriptionOf(button("Run"))).toBe("");
    await press(button("Run"));
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.autoRuns.isLive("pca")).toBe(true);
    expect(button("Stop")).not.toBeNull();

    await press(button("Stop"));
    expect(page.pcaRequests()[0]?.cancelled).toBe(true);
    expect(page.autoRuns.isLive("pca")).toBe(false);
  });

  test("NU8 R1 live and done: Stop recalculating, the same button as Stop, the focus kept, with no line under it; pressed, the result kept with the line of a Stop and no button, the focus on the heading", async () => {
    const page = await drawTab();
    const run = button("Run");
    run?.focus();
    await press(run);
    expect(button("Stop")).toBe(run);
    await page.endPca();
    const stop = button("Stop recalculating");
    expect(stop).toBe(run);
    expect(document.activeElement).toBe(stop);
    expect(button("Stop")).toBeNull();
    expect(descriptionOf(stop)).toBe("");
    expect(lineShown(LIVE_DONE)).toBe(false);
    expect(lineShown(ABOUT)).toBe(false);
    expect(lineShown(STOPPED)).toBe(false);

    await press(stop);
    expect(page.autoRuns.isLive("pca")).toBe(false);
    expect(button("Run")).toBeNull();
    expect(button("Stop recalculating")).toBeNull();
    expect(lineShown(STOPPED)).toBe(true);
    expect(document.activeElement?.tagName).toBe("H2");
  });

  test("about to start: Stop recalculating in the place of Run, and the line of the quiet second under it, not its description; then Stop and the bar", async () => {
    const page = await drawTab();
    await press(button("Run"));
    await page.endPca();
    await setMissing(page, 0.05);
    expect(button("Run")).toBeNull();
    const stop = button("Stop recalculating");
    expect(stop).not.toBeNull();
    expect(descriptionOf(stop)).toBe("");
    expect(lineShown(ABOUT)).toBe(true);

    await wait(LIVE_QUIET_MS);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(button("Stop")).not.toBeNull();
    expect(lineShown(ABOUT)).toBe(false);
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  test("Stop recalculating during the second: Run, the same button, the line of a Stop under it, and nothing starts", async () => {
    const page = await drawTab();
    await press(button("Run"));
    await page.endPca();
    await setMissing(page, 0.05);
    const stop = button("Stop recalculating");
    stop?.focus();
    await press(stop);
    const run = button("Run");
    expect(run).toBe(stop);
    expect(document.activeElement).toBe(run);
    expect(descriptionOf(run)).toBe("");
    expect(lineShown(STOPPED)).toBe(true);
    expect(lineShown(ABOUT)).toBe(false);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);

    // A change after the Stop starts nothing, and the line stays.
    await setMissing(page, 0.04);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(lineShown(STOPPED)).toBe(true);

    // Run again: live, and the line goes.
    await press(button("Run"));
    expect(page.pcaRequests()).toHaveLength(2);
    expect(lineShown(STOPPED)).toBe(false);
    await page.endPca();
    await setMissing(page, 0.03);
    expect(lineShown(ABOUT)).toBe(true);
  });

  test("while the dialog of the download is open, the line says the PCA waits for the download", async () => {
    const page = await drawTab();
    await press(button("Run"));
    await page.endPca();
    await setMissing(page, 0.05);
    let unmark = (): void => undefined;
    await act(async () => {
      unmark = page.gate.holdChange("download");
      await Promise.resolve();
    });
    expect(lineShown(ABOUT_DIALOG)).toBe(true);
    await act(async () => {
      unmark();
      await Promise.resolve();
    });
    expect(lineShown(ABOUT)).toBe(true);
  });

  test("live and locked: Stop recalculating, enabled, in the place of Run, beside the lock; pressed, Run disabled with the lock", async () => {
    const page = await drawTab();
    await press(button("Run"));
    await page.endPca();
    await act(async () => {
      page.store.apply("the LD distance changed", (p) =>
        setAnalysisOptions(p, pcaOnPopgen2, {
          ...pcaOptions(p, "popgen2"),
          ld: { follow: false, maxAllowedR2: 0.1, maxDist: null },
        }),
      );
      await Promise.resolve();
    });
    await settle();
    const stop = button("Stop recalculating");
    expect(stop).not.toBeNull();
    expect(stop?.disabled).toBe(false);
    expect(descriptionOf(stop)).toBe(NO_DISTANCE);

    stop?.focus();
    await press(stop);
    expect(page.autoRuns.isLive("pca")).toBe(false);
    const run = button("Run");
    expect(run?.disabled).toBe(true);
    expect(descriptionOf(run)).toBe(NO_DISTANCE);
    expect(lineShown(STOPPED)).toBe(true);
    // The focus on the reason of the disabled Run, which a screen reader
    // reads with the name of the button, and not on the heading.
    expect(document.activeElement?.textContent).toBe(
      `Run is unavailable: ${NO_DISTANCE}`,
    );
  });

  test("a crash of the worker that leaves the PCA live: its words, Run and Stop recalculating side by side, Run first; Run tries again under the same key, live; Stop recalculating ends it and gives the focus to Run", async () => {
    const page = await drawTab();
    await press(button("Run"));
    const crash = async (): Promise<void> => {
      page
        .pcaRequests()
        .at(-1)
        ?.end({
          kind: "failed",
          error: { kind: "workerFailed", message: "out of memory" },
        });
      await settle();
    };
    await crash();
    expect(page.autoRuns.isLive("pca")).toBe(true);
    expect(container.textContent).toContain("stopped unexpectedly");
    const run = button("Run");
    const stop = button("Stop recalculating");
    expect(run).not.toBeNull();
    expect(stop).not.toBeNull();
    const labels = [...container.querySelectorAll("button")].map(
      (b) => b.textContent,
    );
    expect(labels.indexOf("Run")).toBeLessThan(
      labels.indexOf("Stop recalculating"),
    );
    expect(lineShown(LIVE_DONE)).toBe(false);

    await press(run);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(page.pcaRequests()[1]?.key).toBe(page.pcaRequests()[0]?.key);
    expect(page.autoRuns.isLive("pca")).toBe(true);
    await crash();

    const again = button("Stop recalculating");
    again?.focus();
    await press(again);
    expect(page.autoRuns.isLive("pca")).toBe(false);
    expect(button("Stop recalculating")).toBeNull();
    expect(document.activeElement).toBe(button("Run"));
    expect(lineShown(STOPPED)).toBe(true);
  });

  test("Stop during a run started by itself: Run with the line of a Stop", async () => {
    const page = await drawTab();
    await press(button("Run"));
    await page.endPca();
    await setMissing(page, 0.05);
    await wait(LIVE_QUIET_MS);
    expect(page.pcaRequests()).toHaveLength(2);
    await press(button("Stop"));
    expect(page.pcaRequests()[1]?.cancelled).toBe(true);
    page.pcaRequests()[1]?.end({ kind: "cancelled" });
    await settle();
    expect(button("Run")).not.toBeNull();
    expect(lineShown(STOPPED)).toBe(true);
  });
});
