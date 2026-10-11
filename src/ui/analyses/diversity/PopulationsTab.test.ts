// @vitest-environment jsdom
/**
 * The Populations tab of popgen2.html (docs/specs/steps/
 * popgen2-populations.md, "Run and Stop", "The populations it runs on"
 * and "The states"), drawn by React in jsdom over the real store of the
 * page with a fake worker, the gate and the analyses started by
 * themselves: Run through `autoRuns.run`, Stop and Stop recalculating
 * through `autoRuns.pause`; each lock of "The locks" beside a disabled
 * Run; the line of the populations with the unclassified left out and
 * with the one population; and the line of a Stop.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  diversityOnPopgen2,
  diversityOptions,
} from "../../../core/analyses/diversity.ts";
import { pcaOnPopgen2, pcaOptions } from "../../../core/analyses/pca.ts";
import {
  loadIndividuals,
  setAnalysisOptions,
  setGrouping,
  setIndividualFilter,
} from "../../../core/project.ts";
import { noPopDiversity, summaryResult } from "../../../core/testSupport.ts";
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
  POPGEN2_CHAIN,
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
import { PopulationsTab } from "./PopulationsTab.tsx";

// The result drawn as a line: its plots need a browser's layout, and
// what is checked here is the button, its locks and its lines.
vi.mock("./PopulationsTabResults.tsx", () => ({
  PopulationsTabResults: () => "the result",
  prefetchPopulationsResults: () => undefined,
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const STOPPED =
  "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.";

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
  readonly diversityRequests: () => readonly Request[];
  readonly endPass: (outcome?: Outcome<JobResult>) => Promise<void>;
  readonly endDiversity: () => Promise<void>;
}

/** A result of the diversity of the one population. */
function diversityResult(): JobResult {
  return {
    analysis: "diversity",
    pops: ["Unclassified"],
    numIndividuals: Uint32Array.from([10]),
    unbiasedExpHet: Float64Array.from([0.3]),
    obsHet: Float64Array.from([0.3]),
    polyRatio: Float64Array.from([0.9]),
    numVarsWithValue: Uint32Array.from([1200]),
    ...noPopDiversity(1),
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
                  createElement(PopulationsTab, { shown: false }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await Promise.resolve();
  });
  const diversityRequests = (): readonly Request[] =>
    requests.filter((r) => r.job.analysis === "diversity");
  return {
    store,
    raw,
    autoRuns,
    requests,
    diversityRequests,
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
    endDiversity: async () => {
      const last = diversityRequests().at(-1);
      if (last === undefined) throw new Error("no diversity sent");
      last.end({ kind: "done", key: last.key, result: diversityResult() });
      await settle();
    },
  };
}

/** The tab drawn with its one pass ended. */
async function readyTab(): Promise<Page> {
  const page = await drawTab();
  await page.endPass();
  return page;
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

/** Expects Run disabled, described by `reason`. */
function expectLocked(reason: string): void {
  const run = button("Run");
  expect(run?.disabled).toBe(true);
  expect(descriptionOf(run)).toBe(reason);
}

describe("PT1 D3 the Populations tab", () => {
  test("Run makes the diversity live and starts it through autoRuns; Stop cancels it and ends its live state, with the line of a Stop", async () => {
    const page = await readyTab();
    expect(container.querySelector("h2")?.textContent).toBe("Diversity");
    expect(descriptionOf(button("Run"))).toBe("");
    await press(button("Run"));
    expect(page.diversityRequests()).toHaveLength(1);
    expect(page.autoRuns.isLive(diversityOnPopgen2.id)).toBe(true);
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();

    await press(button("Stop"));
    expect(page.diversityRequests()[0]?.cancelled).toBe(true);
    expect(page.autoRuns.isLive(diversityOnPopgen2.id)).toBe(false);
    page.diversityRequests()[0]?.end({ kind: "cancelled" });
    await settle();
    expect(button("Run")).not.toBeNull();
    expect(lines()).toContain(STOPPED);
  });

  test("done and live: the result and Stop recalculating, the same button as Run; pressed, the live state ends, the line of a Stop stands and the focus goes to the heading Diversity", async () => {
    const page = await readyTab();
    const run = button("Run");
    run?.focus();
    await press(run);
    await page.endDiversity();
    expect(container.textContent).toContain("the result");
    const stop = button("Stop recalculating");
    expect(stop).toBe(run);
    expect(document.activeElement).toBe(stop);

    await press(stop);
    expect(page.autoRuns.isLive(diversityOnPopgen2.id)).toBe(false);
    expect(button("Stop recalculating")).toBeNull();
    expect(lines()).toContain(STOPPED);
    expect(document.activeElement?.tagName).toBe("H2");
    expect(document.activeElement?.textContent).toBe("Diversity");

    // A change after the Stop starts nothing by itself.
    await apply(page, (p) =>
      setAnalysisOptions(p, diversityOnPopgen2, {
        ...diversityOptions(p),
        minNumIndividuals: 5,
      }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await settle();
    expect(page.diversityRequests()).toHaveLength(1);
  });

  test("the one pass running locks Run with its words; stopped, with Start again; refused, with the words of a file that could not be read", async () => {
    const page = await drawTab();
    expectLocked(
      "Run once panel.nei is read to the end: the reading under way in the box Variants and the diversity cannot run at once.",
    );
    await act(async () => {
      page.autoRuns.stop(POPGEN2_CHAIN);
      await Promise.resolve();
    });
    await settle();
    expectLocked(
      "Run once panel.nei is read to the end: Start again its reading in the box Variants.",
    );

    const refused = await drawTab();
    await refused.endPass({
      kind: "failed",
      error: { kind: "popnei", message: "the file is not a vars file" },
    });
    expectLocked(
      "Run once panel.nei is read to the end: it could not be read, as the box Variants says. Open it again there, or open another.",
    );
  });

  test("the individuals file being read locks Run; read, the line of the populations says how many unclassified are left out", async () => {
    const page = await readyTab();
    await withPopulations(page, false);
    expectLocked("The diversity waits for pops.csv to be read.");

    const read = await readyTab();
    await withPopulations(read);
    expect(button("Run")?.disabled).toBe(false);
    expect(lines()).toContain(
      "2 populations: A, 4 individuals; B, 4 individuals",
    );
    expect(lines()).toContain(
      "2 unclassified individuals kept are left out, as the box Individuals says.",
    );
  });

  test("with no individuals file, the line of the one population, Unclassified", async () => {
    await readyTab();
    expect(lines()).toContain(
      "1 population, Unclassified: 10 individuals. No individual is assigned to a population, so the diversity is of every individual kept as one population.",
    );
  });

  test("the thresholds of the individuals keeping no individual lock Run with the store's words", async () => {
    const page = await readyTab();
    await apply(page, (p) =>
      setIndividualFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.1 }),
    );
    expect(button("Run")?.disabled).toBe(true);
    expect(descriptionOf(button("Run"))).toMatch(
      /^The filters of individuals keep none of the 10 individuals of panel\.nei\./u,
    );
  });

  test("the individuals kept all unclassified while the column classifies some lock Run with the words of no population kept", async () => {
    const page = await readyTab();
    await withPopulations(page);
    await apply(page, (p) =>
      setIndividualFilter(p, { kind: "keep", individuals: ["s008", "s009"] }),
    );
    expectLocked(
      "The 2 individuals kept have no population in pop, so none of the 2 populations has an individual left. Loosen the thresholds of the individuals in the Variants tab to keep them.",
    );
  });

  test("a draw larger than the chromosomes of the largest population locks Run with the old words", async () => {
    const page = await readyTab();
    await apply(page, (p) =>
      setAnalysisOptions(p, diversityOnPopgen2, {
        ...diversityOptions(p),
        minNumIndividuals: 2,
        numCalledAlleles: 30,
      }),
    );
    expectLocked(
      "The rarefaction draws 30 chromosomes, and the one population, Unclassified, holds 20, those of its 10 individuals at a ploidy of 2. Type a number of chromosomes of at most 20 in the options of the diversity.",
    );
  });
});

describe("the Populations tab's Stop and its options while an analysis runs", () => {
  const LOCK =
    "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again.";

  /** The fields of the diversity's options, its three number fields. */
  function optionInputs(): readonly HTMLInputElement[] {
    return [...container.querySelectorAll("input")];
  }

  test("Stop and Stop recalculating call pause of the diversity alone, never Stop all", async () => {
    const page = await readyTab();
    const pause = vi.spyOn(page.autoRuns, "pause");
    const pauseAll = vi.spyOn(page.autoRuns, "pauseAll");
    await press(button("Run"));
    await press(button("Stop"));
    expect(pause).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledWith(diversityOnPopgen2.id);
    page.diversityRequests()[0]?.end({ kind: "cancelled" });
    await settle();
    await press(button("Run"));
    await page.endDiversity();
    await press(button("Stop recalculating"));
    expect(pause).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenLastCalledWith(diversityOnPopgen2.id);
    expect(pauseAll).not.toHaveBeenCalled();
  });

  test("while the diversity runs, its three options are greyed with the words of the lock", async () => {
    await readyTab();
    for (const input of optionInputs()) {
      expect(input.getAttribute("aria-disabled")).toBeNull();
    }
    await press(button("Run"));
    expect(optionInputs()).toHaveLength(3);
    for (const input of optionInputs()) {
      expect(input.getAttribute("aria-disabled")).toBe("true");
      expect(descriptionOf(input)).toContain(LOCK);
    }
  });

  test("while only the PCA runs, the options of the diversity stay open", async () => {
    const page = await readyTab();
    // The PCA's LD pruning given a distance, which it has no default of.
    await apply(page, (p) =>
      setAnalysisOptions(p, pcaOnPopgen2, {
        ...pcaOptions(p, "popgen2"),
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
      }),
    );
    await act(async () => {
      expect(page.autoRuns.run("pca")).toBe("started");
      await Promise.resolve();
    });
    await settle();
    expect(page.requests.filter((r) => r.job.analysis === "pca")).toHaveLength(
      1,
    );
    expect(optionInputs()).toHaveLength(3);
    for (const input of optionInputs()) {
      expect(input.getAttribute("aria-disabled")).toBeNull();
      expect(descriptionOf(input)).not.toContain("Stop the");
    }
  });
});
