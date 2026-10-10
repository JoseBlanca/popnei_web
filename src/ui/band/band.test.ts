/**
 * What the band of popgen2.html says, `bandOf`, from states of the real
 * store of the page made with a fake worker, and its words
 * (docs/specs/steps/popgen2-band.md, "How it is checked", In Vitest).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import type { PcaOptions } from "../../core/analyses/pca.ts";
import type { Project } from "../../core/project.ts";
import { setAnalysisOptions, setVariantFilter } from "../../core/project.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Progress,
  Run,
  WriteJob,
} from "../../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { failureEndsLive } from "../analyses/pca/liveEnd.ts";
import { createDefects } from "../defects.ts";
import type { Defects } from "../defects.ts";
import type { PageTab } from "../../core/popgen2Tabs.ts";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_CHAIN,
  POPGEN2_LIVE,
  createPopgen2Store,
  openVariantsFile,
} from "../popgen2Store.ts";
import type { Popgen2PageStore } from "../popgen2Store.ts";
import { startAnalysis, startWriting } from "../runs.ts";
import { createRunGate, gatedStore } from "../variants/thresholdRun.ts";
import { STOPPING_MAX_MS, bandOf } from "./band.ts";
import type { Band, BandPage } from "./band.ts";
import { lineWords, stopOf } from "./bandWords.ts";

const FILE = "0123456789abcdef0123456789abcdef";

/** A request the fake worker was given, and how the test moves it. */
interface Request {
  readonly key: string;
  readonly job: Job | WriteJob;
  readonly progress: (p: Progress) => void;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** Lets the outcomes and the microtasks of the page's `sync` settle. */
async function flush(): Promise<void> {
  for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
}

/** A result of the PCA, or of the PCoA, of `s000` and `s001`, with
    `numVarsUsed` variants. */
function pcaResult(method: "pca" | "pcoa", numVarsUsed: number): JobResult {
  return {
    analysis: "pca",
    method,
    individuals: ["s000", "s001"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from([1, -1]),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: method === "pca" ? numVarsUsed : null,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars: numVarsUsed, filtering: {} },
  };
}

/** The page of popgen2.html as its entry makes it: the store, the gate,
    the analyses started by themselves, the log of the errors and the tab
    shown, with a fake worker; `panel.nei` open and read, and the PCA's
    LD distance typed, 50,000. The one pass is not ended. */
interface TestPage {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly auto: AutoRuns;
  readonly defects: Defects;
  readonly requests: Request[];
  readonly writes: Request[];
  tab: PageTab;
  now: number;
  stoppingSince: number | null;
  readonly band: () => Band;
  readonly endPass: () => Promise<void>;
  readonly lastPca: () => Request;
  readonly setPca: (options: Partial<PcaOptions>) => void;
}

function page(): TestPage {
  const requests: Request[] = [];
  const writes: Request[] = [];
  let lastId = 0;
  const sendOf =
    (into: Request[]) =>
    (
      key: string,
      job: Job | WriteJob,
      onProgress: (p: Progress) => void,
    ): Run<never> => {
      lastId += 1;
      const outcome = new Promise<Outcome<never>>((resolve) => {
        into.push({
          key,
          job,
          progress: onProgress,
          end: resolve as (outcome: Outcome<JobResult>) => void,
        });
      });
      return { id: lastId, outcome, cancel: () => undefined };
    };
  const store = createPopgen2Store({
    send: sendOf(requests),
    sendWrite: sendOf(writes),
    appVersion: "0.1.0",
  });
  store.popneiReady("0.2.2");
  const gate = createRunGate();
  const gated = gatedStore(store, gate);
  const auto = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
    live: {
      analyses: POPGEN2_LIVE,
      changes: gate,
      runStart: (id) => startAnalysis(gated, id),
      quietMs: LIVE_QUIET_MS,
      endsLive: failureEndsLive,
    },
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      auto.sync();
    });
  });
  const defects = createDefects();
  openVariantsFile(store, {
    fileId: FILE,
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  });
  store.variantsRead(FILE, {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  const setPca = (options: Partial<PcaOptions>): void => {
    gated.apply("the options of the PCA changed", (p: Project) =>
      setAnalysisOptions(p, pcaOnPopgen2, {
        ...pcaOptions(p, "popgen2"),
        ...options,
      }),
    );
  };
  setPca({ ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 } });
  const testPage: TestPage = {
    store,
    auto,
    defects,
    requests,
    writes,
    tab: "variants",
    now: 0,
    stoppingSince: null,
    band: () => bandOf(pageOf(testPage), defects.getState()),
    endPass: async () => {
      await flush();
      const pass = requests.find(
        (r) => "analysis" in r.job && r.job.analysis === "variantsSummary",
      );
      if (pass === undefined) throw new Error("the one pass did not start");
      pass.end({
        kind: "done",
        key: pass.key,
        result: summaryResult(["1"], [1200], ["s000", "s001"]),
      });
      await flush();
    },
    lastPca: () => {
      const found = requests.filter(
        (r) => "analysis" in r.job && r.job.analysis === "pca",
      );
      const last = found.at(-1);
      if (last === undefined) throw new Error("no PCA was sent");
      return last;
    },
    setPca,
  };
  return testPage;
}

/** What the band reads of `testPage`. */
function pageOf(testPage: TestPage): BandPage {
  return {
    state: testPage.store.getState(),
    startedUnder: (key) => testPage.auto.startedUnder(key),
    pcaLive: testPage.auto.liveState("pca"),
    tab: testPage.tab,
    now: testPage.now,
    stoppingSince: testPage.stoppingSince,
  };
}

/** The page with the PCA, or the PCoA, run by Run and ended with a
    result of `numVarsUsed` variants, fewer than its two individuals for
    a warning, with the LD pruning off for another when `pruningOff`. */
async function pcaDone(
  method: "pca" | "pcoa",
  numVarsUsed: number,
  pruningOff = false,
): Promise<TestPage> {
  const testPage = page();
  await testPage.endPass();
  if (method === "pcoa") testPage.setPca({ method: "pcoa" });
  // Off on this page is the LD pruning as in the Variants tab, which has
  // none.
  if (pruningOff) {
    testPage.setPca({ ld: { follow: true, maxAllowedR2: 0.1, maxDist: null } });
  }
  expect(testPage.auto.run("pca")).toBe(true);
  await flush();
  const last = testPage.lastPca();
  last.end({
    kind: "done",
    key: last.key,
    result: pcaResult(method, numVarsUsed),
  });
  await flush();
  return testPage;
}

/** The full words of the line of `band`, with the clock at `seconds`. */
function words(band: Band, seconds = 0): string | null {
  return lineWords(band.line, seconds)?.full ?? null;
}

describe("NU5 D1 what the band of popgen2.html says", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("with no store, an error met as the page started is the error line's first sentence, and nothing else is said", () => {
    const defects = createDefects();
    defects.report(new Error("test"), "event", null);

    const band = bandOf(null, defects.getState());

    expect(band.line).toEqual({ kind: "nothing" });
    expect(band.error).toEqual({
      text: "The application met an error of its own as it started: test. Reload the page.",
      more: 0,
    });
  });

  test("an error of the application on the page, and one of the worker stopped during the one pass, in the words of the error bar, with the count of the errors after the first", () => {
    const testPage = page();
    testPage.defects.report(new Error("test."), "event", null);
    testPage.defects.report(new Error("second"), "event", null);
    expect(testPage.band().error).toEqual({
      text: "The application met an error of its own: test. Reload the page, and open your files again.",
      more: 1,
    });

    testPage.defects.dismiss();
    expect(testPage.band().error).toBeNull();
    testPage.defects.report(new Error("gone"), "countStopped", null);
    expect(testPage.band().error?.text).toBe(
      "The application stopped as it counted the variants and calculated the statistics: gone. Start again, and if it stops again, reload the page and open your files again.",
    );
  });

  test("the one pass about to start, then running: the name of the file, then the share of its bytes read, rounded down, with the Stop of the pass", async () => {
    const testPage = page();
    // The file read, the pass not yet sent: about to start.
    expect(testPage.band().line).toEqual({
      kind: "reading",
      name: "panel.nei",
      share: null,
    });
    expect(words(testPage.band())).toBe("Reading panel.nei");
    expect(stopOf(testPage.band().line)).toEqual({
      label: "Stop",
      name: "Stop reading panel.nei",
      stops: "pass",
    });

    await flush();
    const pass = testPage.requests[0];
    pass?.progress({
      bytesRead: 1234,
      numBytes: 10_000,
      pass: 1,
      numPasses: 1,
    });
    expect(words(testPage.band())).toBe("Reading panel.nei · 12%");
    expect(lineWords(testPage.band().line, 0)?.short).toBe("Reading · 12%");

    pass?.progress({
      bytesRead: 9999,
      numBytes: 10_000,
      pass: 1,
      numPasses: 1,
    });
    expect(words(testPage.band())).toBe("Reading panel.nei · 99%");
  });

  test("the one pass stopped: Stopping the reading of the file until the new worker is ready, then nothing", async () => {
    const testPage = page();
    await flush();
    testPage.auto.stop(POPGEN2_CHAIN);
    testPage.stoppingSince = 0;

    expect(words(testPage.band())).toBe("Stopping the reading of panel.nei…");
    expect(lineWords(testPage.band().line, 0)?.short).toBe("Stopping…");
    expect(stopOf(testPage.band().line)).toBeNull();

    testPage.store.popneiReady("0.2.2");
    expect(testPage.band().line).toEqual({ kind: "nothing" });
  });

  test("the PCA running, by Run, with its clock at 59 and 61 seconds and the Stop of the PCA; the PCoA so named", async () => {
    const testPage = page();
    await testPage.endPass();
    expect(testPage.auto.run("pca")).toBe(true);
    await flush();

    const band = testPage.band();
    expect(band.line.kind).toBe("pcaRunning");
    expect(words(band, 59)).toBe("PCA running · 0:59");
    expect(words(band, 61)).toBe("PCA running · 1:01");
    expect(lineWords(band.line, 61)?.short).toBe("PCA · 1:01");
    expect(stopOf(band.line)).toEqual({
      label: "Stop",
      name: "Stop the PCA",
      stops: "pca",
    });

    // The same line whatever tab is shown.
    testPage.tab = "pca";
    expect(testPage.band().line.kind).toBe("pcaRunning");

    testPage.auto.pause("pca");
    testPage.setPca({ method: "pcoa" });
    expect(testPage.auto.run("pca")).toBe(true);
    await flush();
    expect(words(testPage.band(), 61)).toBe("PCoA running · 1:01");
    expect(stopOf(testPage.band().line)?.name).toBe("Stop the PCoA");
  });

  test("the PCA stopped: Stopping the PCA while the store waits for the worker, gone when it is ready, and gone 10 s after it was first seen", async () => {
    const testPage = page();
    await testPage.endPass();
    testPage.auto.run("pca");
    await flush();
    testPage.auto.pause("pca");
    expect(testPage.store.getState().stoppedAwaitingWorker).toBe("pca");
    testPage.stoppingSince = 1000;
    testPage.now = 1000;

    expect(words(testPage.band())).toBe("Stopping the PCA…");
    testPage.now = 1000 + STOPPING_MAX_MS - 1;
    expect(words(testPage.band())).toBe("Stopping the PCA…");
    testPage.now = 1000 + STOPPING_MAX_MS;
    expect(testPage.band().line).toEqual({ kind: "nothing" });

    testPage.now = 1000;
    testPage.store.popneiReady("0.2.2");
    expect(testPage.band().line).toEqual({ kind: "nothing" });
  });

  test("the write of the filtered variants: its file's name and its share, with no Stop", async () => {
    const testPage = page();
    await testPage.endPass();
    testPage.store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.1,
      }),
    );
    void startWriting(testPage.store, "nei");
    await flush();
    testPage.writes[0]?.progress({
      bytesRead: 45,
      numBytes: 100,
      pass: 1,
      numPasses: 1,
    });

    expect(words(testPage.band())).toBe("Writing panel.filtered.nei · 45%");
    expect(lineWords(testPage.band().line, 0)?.short).toBe("Writing · 45%");
    expect(stopOf(testPage.band().line)).toBeNull();
  });

  test("the PCA live and about to start after a change: its words with Stop recalculating; the PCoA so named", async () => {
    const testPage = await pcaDone("pca", 548);
    testPage.store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.05,
      }),
    );
    await flush();

    expect(words(testPage.band())).toBe("The PCA starts again in a moment");
    expect(lineWords(testPage.band().line, 0)?.short).toBe("PCA in a moment");
    expect(stopOf(testPage.band().line)).toEqual({
      label: "Stop recalculating",
      name: "Stop recalculating the PCA",
      stops: "live",
    });

    const pcoa = await pcaDone("pcoa", 548);
    pcoa.setPca({ ld: { follow: false, maxAllowedR2: 0.2, maxDist: 50_000 } });
    await flush();
    expect(words(pcoa.band())).toBe("The PCoA starts again in a moment");
    expect(lineWords(pcoa.band().line, 0)?.short).toBe("PCoA in a moment");
  });

  test("the PCA live with its result and nothing running: Stop recalculating, as in the PCA tab, whatever tab is shown", async () => {
    const testPage = await pcaDone("pca", 548);

    expect(testPage.band().line).toEqual({ kind: "live", method: "pca" });
    expect(words(testPage.band())).toBe(
      "The PCA is calculated again after each change",
    );
    expect(stopOf(testPage.band().line)?.name).toBe(
      "Stop recalculating the PCA",
    );
    testPage.tab = "pca";
    expect(testPage.band().line).toEqual({ kind: "live", method: "pca" });

    // Its Stop ends the live state; nothing is said after it.
    testPage.auto.pause("pca");
    expect(testPage.band().line).toEqual({ kind: "nothing" });
  });

  test("the link to the warnings of the PCA while the Variants tab is shown, with 1 or 2 warnings, and none while the PCA tab is", async () => {
    const one = await pcaDone("pca", 1);
    expect(words(one.band())).toBe("PCA: 1 warning, in the PCA tab");
    expect(lineWords(one.band().line, 0)?.short).toBe("PCA: 1 warning");

    const two = await pcaDone("pca", 1, true);
    expect(words(two.band())).toBe("PCA: 2 warnings, in the PCA tab");
    // The link, and after it the PCA's Stop recalculating, since it is live.
    expect(stopOf(two.band().line)?.name).toBe("Stop recalculating the PCA");

    two.tab = "pca";
    expect(two.band().line.kind).toBe("live");
    two.tab = "individuals";
    expect(words(two.band())).toBe("PCA: 2 warnings, in the PCA tab");
  });

  test("the link to an error of the PCA while another tab is shown", async () => {
    const testPage = page();
    await testPage.endPass();
    testPage.auto.run("pca");
    await flush();
    const last = testPage.lastPca();
    last.end({
      kind: "failed",
      error: { kind: "popnei", message: "popnei refused it." },
    });
    await flush();

    expect(words(testPage.band())).toBe(
      "PCA: could not be calculated, in the PCA tab",
    );
    expect(lineWords(testPage.band().line, 0)?.short).toBe("PCA: failed");
    testPage.tab = "pca";
    expect(testPage.band().line.kind).not.toBe("result");
  });

  test("the order when two hold: the PCA running over a Stop under way, a Stop under way over about to start, about to start over the link", async () => {
    const running = page();
    await running.endPass();
    running.auto.run("pca");
    await flush();
    const runningPage = pageOf(running);
    expect(
      bandOf(
        {
          ...runningPage,
          state: { ...runningPage.state, stoppedAwaitingWorker: "pca" },
          stoppingSince: 0,
        },
        running.defects.getState(),
      ).line.kind,
    ).toBe("pcaRunning");

    const about = await pcaDone("pca", 1);
    about.store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.05,
      }),
    );
    await flush();
    // About to start, over the link to the warnings of the result before.
    expect(about.band().line.kind).toBe("aboutToStart");
    const aboutPage = pageOf(about);
    expect(
      bandOf(
        {
          ...aboutPage,
          state: { ...aboutPage.state, stoppedAwaitingWorker: "pca" },
          stoppingSince: 0,
        },
        about.defects.getState(),
      ).line,
    ).toEqual({ kind: "stopping", what: { kind: "pca", method: "pca" } });
  });

  test("the line of an error of the application stands beside each of the others", async () => {
    const testPage = page();
    testPage.defects.report(new Error("test"), "event", null);
    expect(testPage.band().line.kind).toBe("reading");
    expect(testPage.band().error).not.toBeNull();

    await testPage.endPass();
    testPage.auto.run("pca");
    await flush();
    expect(testPage.band().line.kind).toBe("pcaRunning");
    expect(testPage.band().error?.text).toBe(
      "The application met an error of its own: test. Reload the page, and open your files again.",
    );
  });

  test("with the file read and the pass done, and no PCA run, the band says nothing after Popnei", async () => {
    const testPage = page();
    await testPage.endPass();
    expect(testPage.band()).toEqual({ line: { kind: "nothing" }, error: null });
    expect(lineWords(testPage.band().line, 0)).toBeNull();
    expect(stopOf(testPage.band().line)).toBeNull();
  });
});
