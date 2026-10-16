// @vitest-environment jsdom
/**
 * The Distances tab of popgen2.html (docs/specs/steps/
 * popgen2-distances.md, "Run and Stop", "The populations it runs on",
 * "While the distances run" and "The states"), drawn by React in jsdom
 * over the real store of the page with a fake worker, the gate and the
 * analyses started by themselves: Run through `autoRuns.run`, Stop and
 * Stop recalculating through `autoRuns.pause`; the lock of the minimum
 * beside a disabled Run; the lines of the populations; the field of the
 * minimum greyed while the distances run, and the measure not; and the
 * lines of a Stop and of a failure that ended the live state.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  popDistsOnPopgen2,
  popDistsOptions,
} from "../../../core/analyses/popDists.ts";
import {
  loadIndividuals,
  setAnalysisOptions,
  setGrouping,
} from "../../../core/project.ts";
import { summaryResult } from "../../../core/testSupport.ts";
import type {
  CsvOptions,
  IndividualsTable,
  Job,
  JobResult,
  Outcome,
  Run,
} from "../../../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../../autoRuns.ts";
import type { AutoRuns } from "../../autoRuns.ts";
import { POPGEN2_LIVE } from "../../../core/apps.ts";
import {
  POPGEN2_AUTO_GROUPS,
  createPopgen2Store,
  openVariantsFile,
  popgen2EndsLive,
} from "../../popgen2Store.ts";
import type { Popgen2PageStore } from "../../popgen2Store.ts";
import { startAnalysis } from "../../runs.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import { createAnnouncer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { AutoRunsProvider } from "../../autoRunsContext.ts";
import { RunGateProvider } from "../../variants/runGate.tsx";
import { createRunGate, gatedStore } from "../../variants/thresholdRun.ts";
import { ChangeHoldsProvider } from "../../widgets/changeHold.ts";
import { DistancesTabView } from "./DistancesTabView.tsx";

// The result drawn as a line: its heatmap needs a browser's layout, and
// what is checked here is the button, its locks and its lines.
vi.mock("./DistancesTabResults.tsx", () => ({
  DistancesTabResults: () => "the result",
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const FAILURE_ENDED =
  "The distances no longer start by themselves after a change, since their calculation failed. Run calculates them and starts them again after each change.";

const STOPPED =
  "Stopped: the distances no longer start by themselves after a change. Run calculates them and starts them again after each change.";

/** The line of a Stop with the result shown. */
const STOPPED_WITH_RESULT =
  "Stopped: the distances no longer start by themselves after a change. After the next change, Run calculates them and starts them again after each change.";

/** The words of the lock of the filters while the distances run. */
const LOCK =
  "Stop the distances in the Distances tab to change the filters; then press Run there to calculate them again.";

/** The ten individuals of the variants file. */
const INDIVIDUALS = Array.from({ length: 10 }, (_, i) => `s00${String(i)}`);

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
  readonly key: string;
  readonly job: Job;
  cancelled: boolean;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** What a test drives. */
interface Page {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly raw: Popgen2PageStore<JobResult, Blob>;
  readonly autoRuns: AutoRuns;
  readonly requests: Request[];
  readonly distancesRequests: () => readonly Request[];
  readonly endPass: (outcome?: Outcome<JobResult>) => Promise<void>;
  readonly endDistances: () => Promise<void>;
  /** The texts the status region was given, in their order. */
  readonly said: readonly string[];
}

/** A result of the distances of A and B. */
function distancesResult(): JobResult {
  return {
    analysis: "popDists",
    pops: ["A", "B"],
    numIndividuals: Uint32Array.from([4, 4]),
    fst: Float64Array.from([0.1]),
    dest: Float64Array.from([0.05]),
    numVarsPerPair: Uint32Array.from([1200]),
    order: {
      fst: { kind: "file", reason: "twoPopulations" },
      dest: { kind: "file", reason: "twoPopulations" },
    },
    leftOut: [],
    passStats: { numVars: 1200, filtering: {} },
  };
}

/** Lets the promises of the fake worker and the page's `sync` settle. */
async function settle(): Promise<void> {
  await act(async () => {
    for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
  });
}

/** The tab drawn in <StrictMode> over the store of the page, with
    `panel.nei` of INDIVIDUALS read and its one pass sent, not ended. */
async function drawTab(): Promise<Page> {
  const requests: Request[] = [];
  const raw = createPopgen2Store({
    send: (key, job): Run<JobResult> => {
      let request: Request | null = null;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        request = { key, job, cancelled: false, end: resolve };
        requests.push(request);
      });
      return {
        id: requests.length,
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
      endsLive: popgen2EndsLive,
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
    individuals: INDIVIDUALS,
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  await settle();
  const announcer = createAnnouncer();
  const said: string[] = [];
  const announce = announcer.announce.bind(announcer);
  announcer.announce = (text, options) => {
    said.push(text);
    announce(text, options);
  };
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
            { value: announcer },
            createElement(
              RunGateProvider,
              { value: gate },
              createElement(
                ChangeHoldsProvider,
                { value: gate },
                createElement(
                  AutoRunsProvider,
                  { value: autoRuns },
                  createElement(DistancesTabView),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await Promise.resolve();
  });
  const distancesRequests = (): readonly Request[] =>
    requests.filter((r) => r.job.analysis === "popDists");
  return {
    store,
    raw,
    autoRuns,
    requests,
    distancesRequests,
    said,
    endPass: async (outcome?: Outcome<JobResult>) => {
      const pass = requests[0];
      if (pass === undefined) throw new Error("the one pass did not start");
      pass.end(
        outcome ?? {
          kind: "done",
          key: pass.key,
          result: summaryResult(["1"], [1200], INDIVIDUALS),
        },
      );
      await settle();
    },
    endDistances: async () => {
      const last = distancesRequests().at(-1);
      if (last === undefined) throw new Error("no distances sent");
      last.end({ kind: "done", key: last.key, result: distancesResult() });
      await settle();
    },
  };
}

/** The tab drawn with its one pass ended, pops.csv read with `pop`
    chosen, and the minimum of the distances at 2. */
async function readyTab(): Promise<Page> {
  const page = await drawTab();
  await page.endPass();
  await withPopulations(page);
  await setMinimum(page, 2);
  return page;
}

/** Sets the minimum of the distances to `min`, as its field does. */
async function setMinimum(page: Page, min: number): Promise<void> {
  await apply(page, (p) =>
    setAnalysisOptions(p, popDistsOnPopgen2, {
      ...popDistsOptions(p),
      minNumIndividuals: min,
    }),
  );
  // The quiet second of the change run out.
  await act(async () => {
    vi.advanceTimersByTime(LIVE_QUIET_MS);
    await Promise.resolve();
  });
  await settle();
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

/** The lines of the tab, its paragraphs. */
function lines(): readonly string[] {
  return [...container.querySelectorAll("p")].map((p) => p.textContent);
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

/** Applies `command` to the page's store, as a control does. */
async function apply(
  page: Page,
  command: Parameters<Page["store"]["apply"]>[1],
): Promise<void> {
  await act(async () => {
    page.store.apply("a change of the test", command);
    await Promise.resolve();
  });
  await settle();
}

/** The CSV options of the individuals file of the tests. */
const CSV: CsvOptions = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
};

/** Opens `pops.csv`, s000 to s003 in A, s004 to s007 in B, s008 with an
    empty cell, s009 not in it, and, unless `read` is false, gives its
    read and chooses `pop`. */
async function withPopulations(page: Page, read = true): Promise<void> {
  const fileId = "b".repeat(32);
  await act(async () => {
    page.store.applyAfresh((p) =>
      loadIndividuals(p, { fileId, name: "pops.csv", csv: CSV }),
    );
    await Promise.resolve();
  });
  if (!read) {
    await settle();
    return;
  }
  const table: IndividualsTable = {
    columns: ["id", "pop"],
    rows: [
      ...INDIVIDUALS.slice(0, 4).map((name) => [name, "A"]),
      ...INDIVIDUALS.slice(4, 8).map((name) => [name, "B"]),
      ["s008", null],
    ],
  };
  await act(async () => {
    page.raw.individualsRead(fileId, CSV, {
      kind: "read",
      table,
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    });
    await Promise.resolve();
  });
  await apply(page, (p) =>
    setGrouping(p, { kind: "populations", column: "pop" }),
  );
}

const ID = popDistsOnPopgen2.id;

describe("DT3 the section Parameters of the Distances tab (the owner, 16 October 2026)", () => {
  test("closed when drawn, with the minimum and the measure inside and Run outside", async () => {
    await readyTab();
    const trigger = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Parameters",
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    const section = container.querySelector<HTMLElement>(
      `[role="group"][aria-labelledby="${trigger?.id ?? ""}"]`,
    );
    expect(section?.hidden).toBe(true);
    expect(section?.textContent).toContain(
      "Individuals with a called genotype needed in each population, per variant",
    );
    expect(section?.textContent).toContain("Distance in the heatmap");
    expect(section?.contains(button("Run"))).toBe(false);
  });
});

describe("DT1 D4 the Distances tab", () => {
  test("its heading and the lines of the populations: A and B with the minimum, the unclassified s008 and s009 left out", async () => {
    await readyTab();
    expect(container.querySelector("h2")?.textContent).toBe(
      "Distances between populations",
    );
    expect(lines()).toContain(
      "2 populations: A, 4 individuals; B, 4 individuals",
    );
    expect(lines()).toContain(
      "2 unclassified individuals kept are left out, as the box Individuals says.",
    );
    expect(descriptionOf(button("Run"))).toBe("");
  });

  test("Run makes the distances live and starts them through autoRuns; Stop cancels them and ends the live state, with the line of a Stop", async () => {
    const page = await readyTab();
    await press(button("Run"));
    expect(page.distancesRequests()).toHaveLength(1);
    expect(page.autoRuns.isLive(ID)).toBe(true);
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();

    await press(button("Stop"));
    expect(page.distancesRequests()[0]?.cancelled).toBe(true);
    expect(page.autoRuns.isLive(ID)).toBe(false);
    page.distancesRequests()[0]?.end({ kind: "cancelled" });
    await settle();
    expect(button("Run")).not.toBeNull();
    expect(lines()).toContain(STOPPED);
  });

  test("done and live: the result and Stop recalculating; pressed, the line of a Stop with the result shown, the focus on the heading", async () => {
    const page = await readyTab();
    const run = button("Run");
    run?.focus();
    await press(run);
    await page.endDistances();
    expect(container.textContent).toContain("the result");
    const stop = button("Stop recalculating");
    expect(stop).toBe(run);
    await press(stop);
    expect(page.autoRuns.isLive(ID)).toBe(false);
    expect(lines()).toContain(STOPPED_WITH_RESULT);
    expect(document.activeElement?.tagName).toBe("H2");
  });

  test("the minimum above every population locks Run with its words, and its field stays open", async () => {
    const page = await readyTab();
    await setMinimum(page, 5);
    const run = button("Run");
    expect(run?.disabled).toBe(true);
    expect(descriptionOf(run)).toBe(
      "No population has 5 individuals or more, and a variant counts for a pair of populations only where both have 5 individuals with a called genotype, so no pair has a distance. Lower the individuals needed per variant in Parameters, or merge populations in pops.csv.",
    );
    const field = container.querySelector("input");
    expect(field?.getAttribute("aria-disabled")).toBeNull();
    expect(lines()).toContain(
      "A and B have 4 and 4 individuals, fewer than the 5 individuals needed per variant, and are left out.",
    );
  });

  test("while the distances run, the field of the minimum is greyed with the words of the lock, and the measure is not", async () => {
    await readyTab();
    const field = (): HTMLInputElement | null =>
      container.querySelector("input[inputmode]") ??
      container.querySelector("input");
    expect(field()?.getAttribute("aria-disabled")).toBeNull();
    await press(button("Run"));
    expect(field()?.getAttribute("aria-disabled")).toBe("true");
    expect(descriptionOf(field())).toContain(LOCK);
    const radios = [
      ...container.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ];
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio.disabled).toBe(false);
      expect(radio.getAttribute("aria-disabled")).toBeNull();
    }
  });

  test("a crash of the distances ends their live state: Run, and the line of a failure, not that of a Stop", async () => {
    const page = await readyTab();
    await press(button("Run"));
    page.distancesRequests()[0]?.end({
      kind: "failed",
      error: { kind: "workerFailed", message: "the worker crashed" },
    });
    await settle();
    expect(page.autoRuns.isLive(ID)).toBe(false);
    expect(button("Run")).not.toBeNull();
    expect(lines()).toContain(FAILURE_ENDED);
    expect(lines()).not.toContain(STOPPED);
  });

  test("Stop and Stop recalculating call pause of the distances alone", async () => {
    const page = await readyTab();
    const pause = vi.spyOn(page.autoRuns, "pause");
    await press(button("Run"));
    await press(button("Stop"));
    expect(pause).toHaveBeenLastCalledWith(ID);
  });
});
