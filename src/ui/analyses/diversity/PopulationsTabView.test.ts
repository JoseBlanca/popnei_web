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
  ldDecayOnPopgen2,
  ldDecayOptions,
} from "../../../core/analyses/ldDecay.ts";
import { ldDecayResult } from "../../band/testSupport.ts";
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
import { startAnalysis, startedAt } from "../../runs.ts";
import { LastRunProvider, createLastRunClock } from "../ldDecay/lastRun.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import { createAnnouncer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { AutoRunsProvider } from "../../autoRunsContext.ts";
import { RunGateProvider } from "../../variants/runGate.tsx";
import { createRunGate, gatedStore } from "../../variants/thresholdRun.ts";
import { ChangeHoldsProvider } from "../../widgets/changeHold.ts";
import { PopulationsTabView } from "./PopulationsTabView.tsx";

// The result drawn as a line: its plots need a browser's layout, and
// what is checked here is the button, its locks and its lines.
vi.mock("./PopulationsTabResultView.tsx", () => ({
  PopulationsTabResultView: () => "the result",
}));
vi.mock("../ldDecay/LdDecayResults.tsx", () => ({
  LdDecayResults: () => "the plot of the LD decay",
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const FAILURE_ENDED =
  "The diversity no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.";

const STOPPED =
  "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.";

/** The line of a Stop with the result shown, which offers no Run until
    a change takes it away. */
const STOPPED_WITH_RESULT =
  "Stopped: the diversity no longer starts by itself after a change. After the next change, Run calculates it and starts it again after each change.";

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
  /** The texts the status region was given, in their order. */
  readonly said: readonly string[];
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
  // The clock of the LD decay, made before the tab is drawn, as the
  // entry of the page makes it.
  const clock = createLastRunClock(
    raw,
    "ldDecay",
    () => performance.now(),
    startedAt,
  );
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
                  createElement(
                    LastRunProvider,
                    { value: clock },
                    createElement(PopulationsTabView),
                  ),
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

/** The part of the diversity, before the LD decay's in the same tab;
    the container while the tab is not drawn. */
function diversityPart(): Element {
  return (
    container.querySelector('[data-panel-analysis="diversity"]') ?? container
  );
}

/** The button of the diversity's part named `name`, or `null`. */
function button(
  name: "Run" | "Stop" | "Stop recalculating",
): HTMLButtonElement | null {
  return (
    [...diversityPart().querySelectorAll("button")].find(
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
    expect(diversityPart().textContent).toContain("the result");
    const stop = button("Stop recalculating");
    expect(stop).toBe(run);
    expect(document.activeElement).toBe(stop);

    await press(stop);
    expect(page.autoRuns.isLive(diversityOnPopgen2.id)).toBe(false);
    expect(button("Stop recalculating")).toBeNull();
    expect(button("Run")).toBeNull();
    expect(lines()).toContain(STOPPED_WITH_RESULT);
    expect(lines()).not.toContain(STOPPED);
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
      "The rarefaction draws 30 chromosomes, and the one population, Unclassified, holds 20, those of its 10 individuals at a ploidy of 2. Type a number of chromosomes of at most 20 in Parameters.",
    );
  });
});

describe("the order of the locks of the Populations tab", () => {
  test("the thresholds keeping no individual and a draw over every individual: Run shows the lock of no individual kept, which changing the draw would not lift", async () => {
    const page = await readyTab();
    await apply(page, (p) =>
      setAnalysisOptions(p, diversityOnPopgen2, {
        ...diversityOptions(p),
        minNumIndividuals: 2,
        numCalledAlleles: 30,
      }),
    );
    await apply(page, (p) =>
      setIndividualFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.1 }),
    );
    expect(button("Run")?.disabled).toBe(true);
    expect(descriptionOf(button("Run"))).toMatch(
      /^The filters of individuals keep none of the 10 individuals of panel\.nei\./u,
    );
  });
});

describe("the Populations tab's Stop and its options while an analysis runs", () => {
  const LOCK =
    "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again.";

  /** The fields of the diversity's options, its three number fields. */
  function optionInputs(): readonly HTMLInputElement[] {
    return [...diversityPart().querySelectorAll("input")];
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

  test("a crash of the diversity ends its live state: its words, Run, and the line of a failure under them, not that of a Stop", async () => {
    const page = await readyTab();
    await press(button("Run"));
    page.diversityRequests()[0]?.end({
      kind: "failed",
      error: { kind: "workerFailed", message: "the worker crashed" },
    });
    await settle();
    expect(page.autoRuns.isLive(diversityOnPopgen2.id)).toBe(false);
    expect(button("Run")).not.toBeNull();
    expect(lines()).toContain(FAILURE_ENDED);
    expect(lines()).not.toContain(STOPPED);
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

/** A result of the PCA of the ten individuals. */
function pcaResult(): JobResult {
  return {
    analysis: "pca",
    method: "pca",
    individuals: INDIVIDUALS,
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from(INDIVIDUALS, (_, i) => i - 4.5),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: 548,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars: 548, filtering: {} },
  };
}

/** Gives the PCA its LD distance and runs it through autoRuns, as the
    PCA tab's Run does, the quiet second after the change of its
    distance run out; its request is left running. */
async function runPca(page: Page): Promise<void> {
  await apply(page, (p) =>
    setAnalysisOptions(p, pcaOnPopgen2, {
      ...pcaOptions(p, "popgen2"),
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
    }),
  );
  await quietSecond();
  await act(async () => {
    expect(page.autoRuns.run("pca")).toBe("started");
    await Promise.resolve();
  });
  await settle();
}

/** Ends the last request of the PCA with its result. */
async function endPca(page: Page): Promise<void> {
  const last = page.requests.filter((r) => r.job.analysis === "pca").at(-1);
  if (last === undefined) throw new Error("no PCA sent");
  last.end({ kind: "done", key: last.key, result: pcaResult() });
  await settle();
}

/** Lets the quiet second of the page run out. */
async function quietSecond(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(LIVE_QUIET_MS + 10);
  });
  await settle();
}

describe("PT2 D2 the Populations tab while the diversity is live and does not run", () => {
  const IN_A_MOMENT =
    "The diversity starts in a moment, later if the filters, its options or the populations change.";
  const AFTER_PCA =
    "The diversity starts after the PCA, once the filters, the options and the populations stop changing.";
  const BEHIND_PCA =
    "The diversity starts once the PCA, which is running, ends.";

  test("about to start after a change of its options: Stop recalculating, the line of the quiet second, and no result; then it starts by itself", async () => {
    const page = await readyTab();
    await press(button("Run"));
    await page.endDiversity();
    await apply(page, (p) =>
      setAnalysisOptions(p, diversityOnPopgen2, {
        ...diversityOptions(p),
        minNumIndividuals: 5,
      }),
    );
    expect(button("Stop recalculating")).not.toBeNull();
    expect(lines()).toContain(IN_A_MOMENT);
    expect(diversityPart().textContent).not.toContain("the result");
    await quietSecond();
    expect(page.diversityRequests()).toHaveLength(2);
    expect(lines()).not.toContain(IN_A_MOMENT);
  });

  test("a Run while the PCA runs waits: Stop recalculating, the line that names the PCA, said once by the status region; the focus kept on the button as it becomes Stop and then Stop recalculating", async () => {
    const page = await readyTab();
    await runPca(page);
    const run = button("Run");
    run?.focus();
    await press(run);
    expect(page.diversityRequests()).toHaveLength(0);
    const waiting = button("Stop recalculating");
    expect(waiting).toBe(run);
    expect(document.activeElement).toBe(waiting);
    expect(lines()).toContain(BEHIND_PCA);
    expect(page.said.filter((text) => text === BEHIND_PCA)).toHaveLength(1);

    await endPca(page);
    expect(page.diversityRequests()).toHaveLength(1);
    expect(button("Stop")).toBe(run);
    expect(document.activeElement).toBe(run);
    expect(lines()).not.toContain(BEHIND_PCA);

    await page.endDiversity();
    expect(button("Stop recalculating")).toBe(run);
    expect(document.activeElement).toBe(run);
    expect(page.said.filter((text) => text === BEHIND_PCA)).toHaveLength(1);
  });

  test("Stop recalculating pressed while it waits: Run, with the focus kept on it, and the line of a Stop; nothing starts at the PCA's end", async () => {
    const page = await readyTab();
    await runPca(page);
    const run = button("Run");
    run?.focus();
    await press(run);
    await press(button("Stop recalculating"));
    expect(button("Run")).toBe(run);
    expect(document.activeElement).toBe(run);
    expect(lines()).toContain(STOPPED);
    await endPca(page);
    await quietSecond();
    expect(page.diversityRequests()).toHaveLength(0);
  });

  test("both live and done, a threshold of the individuals moved: in the quiet second the line names the PCA before it; while the PCA runs, the line of waiting for it", async () => {
    const page = await readyTab();
    await runPca(page);
    await endPca(page);
    await press(button("Run"));
    await page.endDiversity();
    expect(page.diversityRequests()).toHaveLength(1);

    await apply(page, (p) =>
      setIndividualFilter(p, {
        kind: "keep",
        individuals: INDIVIDUALS.slice(0, 9),
      }),
    );
    expect(lines()).toContain(AFTER_PCA);
    await quietSecond();
    expect(page.requests.filter((r) => r.job.analysis === "pca")).toHaveLength(
      2,
    );
    expect(lines()).toContain(BEHIND_PCA);
    expect(page.diversityRequests()).toHaveLength(1);
    await endPca(page);
    expect(page.diversityRequests()).toHaveLength(2);
  });
});

describe("PT3 the sections Parameters of the Populations tab (the owner, 16 October 2026)", () => {
  test("one for the diversity and one for the LD decay, each in its part, closed when drawn, with the options of its analysis inside and its Run outside", async () => {
    await readyTab();
    for (const [id, label] of [
      ["diversity", "Chromosomes drawn for the rarefaction"],
      ["ldDecay", "Largest distance between the two variants of a pair"],
    ] as const) {
      const part = container.querySelector(`[data-panel-analysis="${id}"]`);
      if (part === null) throw new Error(`no part of ${id}`);
      const triggers = [...part.querySelectorAll("button")].filter(
        (b) => b.textContent === "Parameters",
      );
      expect(triggers).toHaveLength(1);
      const [trigger] = triggers;
      expect(trigger?.getAttribute("aria-expanded")).toBe("false");
      const section = part.querySelector<HTMLElement>(
        `[role="group"][aria-labelledby="${trigger?.id ?? ""}"]`,
      );
      expect(section?.hidden).toBe(true);
      expect(section?.textContent).toContain(label);
      const run = [...part.querySelectorAll("button")].find(
        (b) => b.textContent === "Run",
      );
      expect(run).toBeDefined();
      expect(section?.contains(run ?? null)).toBe(false);
    }
  });
});

describe("LT1 D4 the part of the LD decay in the Populations tab", () => {
  /** The part of the LD decay, after the diversity's. */
  function ldPart(): Element {
    const part = container.querySelector('[data-panel-analysis="ldDecay"]');
    if (part === null) throw new Error("no part of the LD decay");
    return part;
  }

  /** The button of the LD decay's part named `name`, or `null`. */
  function ldButton(name: string): HTMLButtonElement | null {
    return (
      [...ldPart().querySelectorAll("button")].find(
        (b) => b.textContent === name,
      ) ?? null
    );
  }

  /** Types the largest distance `maxDist` into the project, as its
      field does. */
  async function typeMaxDist(page: Page, maxDist: number): Promise<void> {
    await apply(page, (p) =>
      setAnalysisOptions(p, ldDecayOnPopgen2, {
        ...ldDecayOptions(p, "popgen2"),
        maxDist,
      }),
    );
  }

  /** Ends the last LD decay sent with popnei's refusal `message`. */
  async function refuseLdDecay(page: Page, message: string): Promise<void> {
    const last = page.requests
      .filter((r) => r.job.analysis === "ldDecay")
      .at(-1);
    if (last === undefined) throw new Error("no LD decay sent");
    last.end({ kind: "failed", error: { kind: "popnei", message } });
    await settle();
  }

  test("refused by popnei for memory: its words, no Run, and a line that names no Run until the distance is smaller; then Run, with the line of a failure (the review of the LD decay, 12 October 2026)", async () => {
    const page = await readyTab();
    await typeMaxDist(page, 100_000);
    await press(ldButton("Run"));
    await refuseLdDecay(
      page,
      "this machine has not the memory for the counts of 2 populations at 100,000 base pairs",
    );
    expect(page.autoRuns.isLive("ldDecay")).toBe(false);
    expect(ldPart().textContent).toContain(
      "The LD decay needed more memory than the browser tab could give.",
    );
    expect(ldButton("Run")).toBeNull();
    expect(ldButton("Stop recalculating")).toBeNull();
    expect(ldPart().textContent).toContain(
      "The LD decay no longer starts by itself after a change, since popnei refused it for lack of memory. Once a smaller largest distance is typed, or fewer individuals are kept, Run comes back: it calculates the LD decay and starts it again after each change.",
    );

    await typeMaxDist(page, 50_000);
    expect(ldButton("Run")?.disabled).toBe(false);
    expect(ldPart().textContent).toContain(
      "The LD decay no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.",
    );
  });

  test("refused for filters that keep no variant, live: its words end with its start by itself; after Stop recalculating, not, and the line of a Stop names the Run of after the next change (the review of the LD decay, 12 October 2026)", async () => {
    const page = await readyTab();
    await typeMaxDist(page, 100_000);
    await press(ldButton("Run"));
    await refuseLdDecay(
      page,
      "the pass gave no variant: its source gave 1200 and the steps kept none of them, the filter by missing data kept 0",
    );
    expect(page.autoRuns.isLive("ldDecay")).toBe(true);
    expect(ldPart().textContent).toContain(
      "Loosen them. The LD decay is then calculated again by itself.",
    );
    await press(ldButton("Stop recalculating"));
    expect(page.autoRuns.isLive("ldDecay")).toBe(false);
    expect(ldPart().textContent).not.toContain("again by itself");
    expect(ldButton("Run")).toBeNull();
    expect(ldPart().textContent).toContain(
      "Stopped: the LD decay no longer starts by itself after a change. After the next change, Run calculates it and starts it again after each change.",
    );
  });

  test("done and live: Stop recalculating pressed with the focus on it, the button goes and the focus goes to the heading LD decay, not to the diversity's above it (the review of the LD decay, 12 October 2026)", async () => {
    const page = await readyTab();
    await typeMaxDist(page, 100_000);
    const run = ldButton("Run");
    run?.focus();
    await press(run);
    const [request] = page.requests.filter((r) => r.job.analysis === "ldDecay");
    if (request === undefined) throw new Error("no LD decay sent");
    request.end({ kind: "done", key: request.key, result: ldDecayResult() });
    await settle();
    // The time of the last run beside it draws the button anew, and the
    // focus goes to it.
    const stop = ldButton("Stop recalculating");
    expect(document.activeElement).toBe(stop);
    await press(stop);
    expect(ldButton("Stop recalculating")).toBeNull();
    expect(ldButton("Run")).toBeNull();
    expect(document.activeElement?.tagName).toBe("H2");
    expect(document.activeElement?.textContent).toBe("LD decay");
  });

  test("its heading after the diversity's; Run enabled with no option typed, the largest distance at 100,000, and locked once the distance is emptied; Run and Stop recalculating through autoRuns of the LD decay alone; the time of the last run after a result, kept after a Stop", async () => {
    const page = await readyTab();
    const headings = [...container.querySelectorAll("h2")].map(
      (h) => h.textContent,
    );
    expect(headings).toEqual(["Diversity", "LD decay"]);
    expect(ldButton("Run")?.disabled).toBe(false);
    expect(ldPart().textContent).not.toContain(
      "Type the largest distance in Parameters.",
    );

    await apply(page, (p) =>
      setAnalysisOptions(p, ldDecayOnPopgen2, {
        ...ldDecayOptions(p, "popgen2"),
        maxDist: null,
      }),
    );
    expect(ldButton("Run")?.disabled).toBe(true);
    expect(ldPart().textContent).toContain(
      "Type the largest distance in Parameters.",
    );

    await apply(page, (p) =>
      setAnalysisOptions(p, ldDecayOnPopgen2, {
        ...ldDecayOptions(p, "popgen2"),
        maxDist: 100_000,
      }),
    );
    const run = vi.spyOn(page.autoRuns, "run");
    const pause = vi.spyOn(page.autoRuns, "pause");
    await press(ldButton("Run"));
    expect(run).toHaveBeenCalledWith("ldDecay");
    const sent = page.requests.filter((r) => r.job.analysis === "ldDecay");
    expect(sent).toHaveLength(1);
    expect(ldPart().textContent).not.toContain("The last run");
    const [request] = sent;
    if (request === undefined) throw new Error("no LD decay sent");
    request.end({ kind: "done", key: request.key, result: ldDecayResult() });
    await settle();
    expect(ldPart().textContent).toContain("the plot of the LD decay");
    expect(ldPart().textContent).toContain(
      "The last run, pairs up to 100,000 base pairs, took less than a second.",
    );
    expect(button("Run")).not.toBeNull();

    await press(ldButton("Stop recalculating"));
    expect(pause).toHaveBeenCalledWith("ldDecay");
    expect(pause).not.toHaveBeenCalledWith("diversity");
    expect(page.autoRuns.isLive("ldDecay")).toBe(false);
    expect(ldPart().textContent).toContain(
      "Stopped: the LD decay no longer starts by itself after a change.",
    );
    expect(ldPart().textContent).toContain(
      "The last run, pairs up to 100,000 base pairs, took less than a second.",
    );
  });
});
