/**
 * What the band of popgen2.html says, `bandOf`, from states of the real
 * store of the page made with a fake worker, and its words
 * (docs/specs/steps/popgen2-band.md, "How it is checked", In Vitest).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { POPGEN2_ANALYSES } from "../../core/apps.ts";
import { setVariantFilter } from "../../core/project.ts";
import { summaryResult } from "../../core/testSupport.ts";
import { liveAnalysisOf } from "../analyses/status.ts";
import { LIVE_QUIET_MS } from "../autoRuns.ts";
import type { AboutToStart } from "../autoRuns.ts";
import { createDefects } from "../defects.ts";
import { POPGEN2_CHAIN } from "../popgen2Store.ts";
import { startWriting } from "../runs.ts";
import { STOPPING_MAX_MS, bandOf } from "./bandLine.ts";
import type { Band } from "./bandLine.ts";
import { lineWords, stopAllOf, stopOf } from "./bandWords.ts";
import {
  endLast,
  flush,
  page,
  pageOf,
  pcaDone,
  pcaResult,
} from "./testSupport.ts";
import type { TestPage, WriteRequest } from "./testSupport.ts";

/** The result of the one pass over panel.nei: 1,200 variants on the
    chromosome 1, of s000 and s001. */
const SUMMARY = summaryResult(["1"], [1200], ["s000", "s001"]);

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
    const testPage = page(SUMMARY);
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
      "The application stopped as it counted the variants and calculated the statistics: gone. Press Start again in the box Variants, and if it stops again, reload the page and open your files again.",
    );
  });

  test("the one pass about to start, then running: the statistics of the file, then the share of its bytes read, rounded down, with the Stop of the pass", async () => {
    const testPage = page(SUMMARY);
    // The file read, the pass not yet sent: about to start.
    expect(testPage.band().line).toEqual({
      kind: "reading",
      name: "panel.nei",
      share: null,
    });
    expect(words(testPage.band())).toBe("Statistics of panel.nei");
    expect(stopOf(testPage.band().line)).toEqual({
      label: "Stop",
      name: "Stop the statistics of panel.nei",
      stops: "pass",
      wideOnly: false,
    });

    await flush();
    const pass = testPage.requests[0];
    pass?.progress({
      bytesRead: 1234,
      numBytes: 10_000,
      pass: 1,
      numPasses: 1,
    });
    expect(words(testPage.band())).toBe("Statistics of panel.nei · 12%");
    expect(lineWords(testPage.band().line, 0)?.short).toBe("Statistics · 12%");
    // The name apart, which the band cuts when the line is too narrow.
    expect(lineWords(testPage.band().line, 0)?.aroundName).toEqual({
      before: "Statistics of ",
      name: "panel.nei",
      after: " · 12%",
    });

    pass?.progress({
      bytesRead: 9999,
      numBytes: 10_000,
      pass: 1,
      numPasses: 1,
    });
    expect(words(testPage.band())).toBe("Statistics of panel.nei · 99%");
  });

  test("the one pass stopped: Stopping the statistics of the file until the new worker is ready, then nothing", async () => {
    const testPage = page(SUMMARY);
    await flush();
    testPage.auto.stop(POPGEN2_CHAIN);
    testPage.stoppingSince = 0;

    expect(words(testPage.band())).toBe(
      "Stopping the statistics of panel.nei…",
    );
    expect(lineWords(testPage.band().line, 0)?.short).toBe("Stopping…");
    expect(lineWords(testPage.band().line, 0)?.aroundName).toEqual({
      before: "Stopping the statistics of ",
      name: "panel.nei",
      after: "…",
    });
    expect(stopOf(testPage.band().line)).toBeNull();

    testPage.store.popneiReady("0.2.2");
    expect(testPage.band().line).toEqual({ kind: "nothing" });
  });

  test("the PCA running, by Run, with its clock at 59 and 61 seconds and the Stop of the PCA; the PCoA so named", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    expect(testPage.auto.run("pca")).toBe("started");
    await flush();

    const band = testPage.band();
    expect(band.line.kind).toBe("running");
    expect(words(band, 59)).toBe("PCA running · 0:59");
    expect(words(band, 61)).toBe("PCA running · 1:01");
    expect(lineWords(band.line, 61)?.short).toBe("PCA · 1:01");
    expect(stopOf(band.line)).toEqual({
      label: "Stop",
      name: "Stop the PCA",
      stops: "pca",
      wideOnly: false,
    });

    // The same words while the PCA tab is shown, without the Stop, which
    // the tab shows.
    testPage.tab = "pca";
    expect(words(testPage.band(), 61)).toBe("PCA running · 1:01");
    expect(stopOf(testPage.band().line)).toBeNull();
    testPage.tab = "variants";

    testPage.auto.pause("pca");
    testPage.setPca({ method: "pcoa" });
    expect(testPage.auto.run("pca")).toBe("started");
    await flush();
    expect(words(testPage.band(), 61)).toBe("PCoA running · 1:01");
    expect(stopOf(testPage.band().line)?.name).toBe("Stop the PCoA");
  });

  test("the PCA stopped: Stopping the PCA while the store waits for the worker, gone when it is ready, and gone 10 s after it was first seen", async () => {
    const testPage = page(SUMMARY);
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

  test("Stopping names the method of the run stopped, which the band kept when it first saw the Stop: the PCoA chosen after a Stop of the PCA leaves Stopping the PCA; and Stopping the PCoA after a Stop of the PCoA", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("pca");
    await flush();
    testPage.auto.pause("pca");
    testPage.stoppedMethod = "pca";
    testPage.setPca({ method: "pcoa" });
    expect(testPage.store.getState().stoppedAwaitingWorker).toBe("pca");
    expect(words(testPage.band())).toBe("Stopping the PCA…");

    const pcoa = page(SUMMARY);
    await pcoa.endPass();
    pcoa.setPca({ method: "pcoa" });
    pcoa.auto.run("pca");
    await flush();
    pcoa.auto.pause("pca");
    pcoa.stoppedMethod = "pcoa";
    expect(words(pcoa.band())).toBe("Stopping the PCoA…");
  });

  test("a Stop waiting for each analysis of the page says Stopping and what it stops, the diversity by its words", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    const shown = pageOf(testPage);
    const stoppingWords = (id: string): string | null =>
      lineWords(
        bandOf(
          {
            ...shown,
            state: { ...shown.state, stoppedAwaitingWorker: id },
            stoppingSince: 0,
          },
          testPage.defects.getState(),
        ).line,
        0,
      )?.full ?? null;

    expect(
      POPGEN2_ANALYSES.map((analysis) => stoppingWords(analysis.id)),
    ).toEqual([
      "Stopping the statistics of panel.nei…",
      "Stopping the PCA…",
      "Stopping the diversity…",
    ]);
  });

  test("the write of the filtered variants: its file's name and its share, with no Stop", async () => {
    const testPage = page(SUMMARY);
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
    expect(lineWords(testPage.band().line, 0)?.aroundName).toEqual({
      before: "Writing ",
      name: "panel.filtered.nei",
      after: " · 45%",
    });
    expect(stopOf(testPage.band().line)).toBeNull();
  });

  test("the PCA live and about to start after a change: its words with Stop recalculating; the PCoA so named", async () => {
    const testPage = await pcaDone(SUMMARY, "pca", 548);
    testPage.store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.05,
      }),
    );
    await flush();

    expect(words(testPage.band())).toBe("The PCA starts in a moment");
    expect(lineWords(testPage.band().line, 0)?.short).toBe("PCA soon");
    expect(stopOf(testPage.band().line)).toEqual({
      label: "Stop recalculating",
      name: "Stop recalculating the PCA",
      stops: "pca",
      wideOnly: false,
    });

    // The same words while the PCA tab is shown, without Stop
    // recalculating, which the tab shows.
    testPage.tab = "pca";
    expect(words(testPage.band())).toBe("The PCA starts in a moment");
    expect(stopOf(testPage.band().line)).toBeNull();

    const pcoa = await pcaDone(SUMMARY, "pcoa", 548);
    pcoa.setPca({ ld: { follow: false, maxAllowedR2: 0.2, maxDist: 50_000 } });
    await flush();
    expect(words(pcoa.band())).toBe("The PCoA starts in a moment");
    expect(lineWords(pcoa.band().line, 0)?.short).toBe("PCoA soon");
  });

  test("the PCA about to start while the dialog of the download holds it: The PCA starts after the download, with Stop recalculating; the PCoA so named", async () => {
    for (const method of ["pca", "pcoa"] as const) {
      const testPage = await pcaDone(SUMMARY, method, 548);
      testPage.store.apply("the missing data filter changed", (p) =>
        setVariantFilter(p, {
          kind: "missing_data",
          maxAllowedMissingRate: 0.05,
        }),
      );
      const release = testPage.gate.holdChange("download");
      await flush();

      const name = method === "pca" ? "PCA" : "PCoA";
      expect(words(testPage.band())).toBe(
        `The ${name} starts after the download`,
      );
      expect(lineWords(testPage.band().line, 0)?.short).toBe(`${name} later`);
      expect(stopOf(testPage.band().line)?.name).toBe(
        `Stop recalculating the ${name}`,
      );
      release();
    }
  });

  test("the PCA live with its result, nothing running nor about to start: Popnei alone, whatever tab is shown", async () => {
    const testPage = await pcaDone(SUMMARY, "pca", 548);
    expect(testPage.auto.liveState("pca")).toEqual({
      kind: "live",
      aboutToStart: null,
      running: false,
      after: null,
    });

    expect(testPage.band().line).toEqual({ kind: "nothing" });
    expect(stopOf(testPage.band().line)).toBeNull();
    testPage.tab = "pca";
    expect(testPage.band().line).toEqual({ kind: "nothing" });
  });

  test("the link to the warnings of the PCA while the Variants tab is shown, with 1 or 2 warnings, and none while the PCA tab is", async () => {
    const one = await pcaDone(SUMMARY, "pca", 1);
    expect(words(one.band())).toBe("PCA: 1 warning, in the PCA tab");
    expect(lineWords(one.band().line, 0)?.short).toBe("PCA: 1 warning");

    const two = await pcaDone(SUMMARY, "pca", 1, true);
    expect(words(two.band())).toBe("PCA: 2 warnings, in the PCA tab");
    // The link alone, though the PCA is live.
    expect(stopOf(two.band().line)).toBeNull();

    two.tab = "pca";
    expect(two.band().line.kind).toBe("nothing");
    two.tab = "individuals";
    expect(words(two.band())).toBe("PCA: 2 warnings, in the PCA tab");
  });

  test("the link to an error of the PCA while another tab is shown", async () => {
    const testPage = page(SUMMARY);
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
    const running = page(SUMMARY);
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
    ).toBe("running");

    const about = await pcaDone(SUMMARY, "pca", 1);
    about.store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.05,
      }),
    );
    await flush();
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

    // About to start over the link: the PCA's result with its warning,
    // which the Variants tab links to, and the PCA said about to start,
    // a state built by hand, since a change that makes it about to start
    // leaves no result for the link.
    const linked = await pcaDone(SUMMARY, "pca", 1);
    expect(linked.band().line.kind).toBe("result");
    expect(
      bandOf(
        {
          ...pageOf(linked),
          live: {
            ...pageOf(linked).live,
            pca: {
              kind: "live",
              aboutToStart: "changes",
              running: false,
              after: null,
            },
          },
        },
        linked.defects.getState(),
      ).line.kind,
    ).toBe("aboutToStart");
  });

  test("the write of the filtered variants while the PCA live is about to start: the writing line, with no Stop recalculating", async () => {
    const testPage = await pcaDone(SUMMARY, "pca", 548);
    testPage.store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.05,
      }),
    );
    await flush();
    expect(testPage.band().line.kind).toBe("aboutToStart");
    void startWriting(testPage.store, "nei");
    await flush();

    expect(words(testPage.band())).toBe("Writing panel.filtered.nei");
    expect(stopOf(testPage.band().line)).toBeNull();
  });

  test("the line of an error of the application stands beside each of the others", async () => {
    const testPage = page(SUMMARY);
    testPage.defects.report(new Error("test"), "event", null);
    expect(testPage.band().line.kind).toBe("reading");
    expect(testPage.band().error).not.toBeNull();

    await testPage.endPass();
    testPage.auto.run("pca");
    await flush();
    expect(testPage.band().line.kind).toBe("running");
    expect(testPage.band().error?.text).toBe(
      "The application met an error of its own: test. Reload the page, and open your files again.",
    );
  });

  test("with the file read and the pass done, and no PCA run, the band says nothing after Popnei", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    expect(testPage.band()).toEqual({ line: { kind: "nothing" }, error: null });
    expect(lineWords(testPage.band().line, 0)).toBeNull();
    expect(stopOf(testPage.band().line)).toBeNull();
  });

  test("a write of the fake worker ends with a file, and the result of an analysis does not compile there", () => {
    const endWrite: WriteRequest["end"] = () => undefined;
    endWrite({
      kind: "done",
      key: "k",
      result: {
        format: "nei",
        file: new Blob([]),
        numBytes: 0,
        passStats: { numVars: 0, filtering: {} },
      },
    });
    // @ts-expect-error -- a write never ends with the result of a PCA
    endWrite({ kind: "done", key: "k", result: pcaResult("pca", 1) });
  });
});

describe("PT1 the band while a crash holds the PCA", () => {
  test("it says the PCA starts after the next change, with no again, as its tab does", () => {
    expect(
      lineWords(
        {
          kind: "aboutToStart",
          ids: ["pca"],
          named: [liveAnalysisOf(page(SUMMARY).store.getState(), "pca")],
          waitsFor: "afterCrash",
          withStop: true,
          stopAll: null,
        },
        0,
      ),
    ).toEqual({
      full: "The PCA starts after the next change",
      short: "PCA later",
      aroundName: null,
    });
  });
});

/** The short words of the line of `band`, with the clock at `seconds`. */
function short(band: Band, seconds = 0): string | null {
  return lineWords(band.line, seconds)?.short ?? null;
}

/** The names of the band's two buttons for a screen reader, its Stop or
    Stop recalculating and its Stop all, `null` for one it has not. */
function buttons(band: Band): readonly (string | null)[] {
  return [stopOf(band.line)?.name ?? null, stopAllOf(band.line)?.name ?? null];
}

/** Moves the missing data of the variants to `rate` in the Variants
    tab, through the gate, which both analyses read. */
function moveThreshold(testPage: TestPage, rate: number): void {
  testPage.store.apply("the missing data filter changed", (p) =>
    setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate: rate }),
  );
}

/** The page with the one pass done, and the PCA and the diversity run
    by their Run, one after the other, and done: both live and idle. */
async function bothDone(method: "pca" | "pcoa" = "pca"): Promise<TestPage> {
  const testPage = page(SUMMARY);
  await testPage.endPass();
  if (method === "pcoa") testPage.setPca({ method: "pcoa" });
  expect(testPage.auto.run("pca")).toBe("started");
  await flush();
  await endLast(testPage, "pca");
  expect(testPage.auto.run("diversity")).toBe("started");
  await flush();
  await endLast(testPage, "diversity");
  return testPage;
}

/** Lets the quiet second run out, and the start it gives settle. */
async function quietSecond(): Promise<void> {
  vi.advanceTimersByTime(LIVE_QUIET_MS);
  await flush();
}

describe("PT4 D1 the band with the PCA and the diversity", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("the PCA running and the diversity waiting after it: the words name both, with Stop and Stop all; the short form drops the one waiting", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    expect(testPage.auto.run("pca")).toBe("started");
    await flush();
    expect(testPage.auto.run("diversity")).toBe("waiting");
    await flush();

    const band = testPage.band();
    expect(words(band, 80)).toBe("PCA running · 1:20 · then the diversity");
    expect(short(band, 80)).toBe("PCA · 1:20");
    expect(stopOf(band.line)).toEqual({
      label: "Stop",
      name: "Stop the PCA",
      stops: "pca",
      wideOnly: false,
    });
    expect(stopAllOf(band.line)).toEqual({
      label: "Stop all",
      name: "Stop all: the PCA and the diversity",
    });
  });

  test("the same after a threshold moved with both live, the PCA started by itself; the PCoA so named", async () => {
    for (const method of ["pca", "pcoa"] as const) {
      const testPage = await bothDone(method);
      moveThreshold(testPage, 0.05);
      await flush();
      await quietSecond();
      const name = method === "pca" ? "PCA" : "PCoA";
      expect(words(testPage.band(), 12)).toBe(
        `${name} running · 0:12 · then the diversity`,
      );
      expect(buttons(testPage.band())).toEqual([
        `Stop the ${name}`,
        `Stop all: the ${name} and the diversity`,
      ]);
    }
  });

  test("the PCA tab shown with the PCA running and the diversity waiting: the words with Stop all and no Stop", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("pca");
    await flush();
    testPage.auto.run("diversity");
    testPage.tab = "pca";

    expect(words(testPage.band(), 80)).toBe(
      "PCA running · 1:20 · then the diversity",
    );
    expect(buttons(testPage.band())).toEqual([
      null,
      "Stop all: the PCA and the diversity",
    ]);
  });

  test("the diversity running and the PCA waiting after it, its Run pressed second", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    expect(testPage.auto.run("diversity")).toBe("started");
    await flush();
    expect(testPage.auto.run("pca")).toBe("waiting");

    expect(words(testPage.band(), 12)).toBe(
      "Diversity running · 0:12 · then the PCA",
    );
    expect(short(testPage.band(), 12)).toBe("Diversity · 0:12");
    expect(buttons(testPage.band())).toEqual([
      "Stop the diversity",
      "Stop all: the PCA and the diversity",
    ]);
  });

  test("the diversity running alone, the PCA not live: its words and its Stop, no Stop all; no button while the Populations tab is shown", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    expect(testPage.auto.run("diversity")).toBe("started");
    await flush();

    expect(words(testPage.band(), 12)).toBe("Diversity running · 0:12");
    expect(stopOf(testPage.band().line)).toEqual({
      label: "Stop",
      name: "Stop the diversity",
      stops: "diversity",
      wideOnly: false,
    });
    expect(stopAllOf(testPage.band().line)).toBeNull();

    testPage.tab = "populations";
    expect(words(testPage.band(), 12)).toBe("Diversity running · 0:12");
    expect(buttons(testPage.band())).toEqual([null, null]);
  });

  test("the diversity running alone with the PCA live and idle, as after a change of its options: its words with Stop and Stop all", async () => {
    const testPage = await bothDone();
    testPage.setDiversity({ minNumIndividuals: 1 });
    await flush();
    await quietSecond();

    expect(words(testPage.band(), 12)).toBe("Diversity running · 0:12");
    expect(buttons(testPage.band())).toEqual([
      "Stop the diversity",
      "Stop all: the PCA and the diversity",
    ]);
    // The Stop of an analysis that runs fits beside Stop all at 320 px.
    expect(stopOf(testPage.band().line)?.wideOnly).toBe(false);
  });

  test("both about to start in the quiet second: the words of both and Stop all alone; while the dialog of the download holds them, its words", async () => {
    const testPage = await bothDone();
    moveThreshold(testPage, 0.05);
    await flush();

    expect(words(testPage.band())).toBe(
      "The PCA and the diversity start in a moment",
    );
    expect(short(testPage.band())).toBe("Analyses soon");
    expect(buttons(testPage.band())).toEqual([
      null,
      "Stop all: the PCA and the diversity",
    ]);

    const release = testPage.gate.holdChange("download");
    await flush();
    expect(words(testPage.band())).toBe(
      "The PCA and the diversity start after the download",
    );
    expect(short(testPage.band())).toBe("Analyses later");
    expect(buttons(testPage.band())).toEqual([
      null,
      "Stop all: the PCA and the diversity",
    ]);
    release();
  });

  test("the diversity about to start alone with the PCA live: its words with Stop recalculating, shown at 45 em and wider only, and Stop all; the Populations tab shown, Stop all alone", async () => {
    const testPage = await bothDone();
    testPage.setDiversity({ minNumIndividuals: 1 });
    await flush();

    expect(words(testPage.band())).toBe("The diversity starts in a moment");
    expect(short(testPage.band())).toBe("Diversity soon");
    expect(stopOf(testPage.band().line)).toEqual({
      label: "Stop recalculating",
      name: "Stop recalculating the diversity",
      stops: "diversity",
      wideOnly: true,
    });
    expect(stopAllOf(testPage.band().line)?.name).toBe(
      "Stop all: the PCA and the diversity",
    );

    testPage.tab = "populations";
    expect(buttons(testPage.band())).toEqual([
      null,
      "Stop all: the PCA and the diversity",
    ]);
  });

  test("the diversity about to start alone, the PCA not live, the Populations tab shown: its words and no button", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("diversity");
    await flush();
    await endLast(testPage, "diversity");
    testPage.setDiversity({ minNumIndividuals: 1 });
    await flush();
    testPage.tab = "populations";

    expect(words(testPage.band())).toBe("The diversity starts in a moment");
    expect(buttons(testPage.band())).toEqual([null, null]);
  });

  test("both live and nothing running, waiting nor about to start: Popnei alone, no button, the Populations tab shown, whose result's warnings the band then does not link to", async () => {
    const testPage = await bothDone();
    testPage.tab = "populations";
    expect(testPage.band().line).toEqual({ kind: "nothing" });
    expect(buttons(testPage.band())).toEqual([null, null]);
  });

  test("a crash of the worker during the diversity holds the PCA: the PCA's words of the hold, Stop recalculating, and no Stop all, the diversity no longer live", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("diversity");
    await flush();
    testPage.auto.run("pca");
    testPage.lastDiversity().end({
      kind: "failed",
      error: { kind: "workerFailed", message: "a crash of the test" },
    });
    await flush();

    expect(words(testPage.band())).toBe("The PCA starts after the next change");
    expect(buttons(testPage.band())).toEqual([
      "Stop recalculating the PCA",
      null,
    ]);
  });

  test("after a crash holds the PCA, a Run of the diversity: the diversity running, with no then the PCA, which does not start when it ends (the review of package 4, 12 October 2026)", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("diversity");
    await flush();
    testPage.auto.run("pca");
    testPage.lastDiversity().end({
      kind: "failed",
      error: { kind: "workerFailed", message: "a crash of the test" },
    });
    await flush();
    expect(testPage.auto.run("diversity")).toBe("started");
    await flush();

    expect(words(testPage.band(), 12)).toBe("Diversity running · 0:12");
    expect(buttons(testPage.band())).toEqual([
      "Stop the diversity",
      "Stop all: the PCA and the diversity",
    ]);
  });

  test("the band's Stop of the PCA running with the diversity waiting: the diversity about to start, with its Stop recalculating, never Stopping the PCA with no button while its quiet second runs (the review of package 4, 12 October 2026)", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    expect(testPage.auto.run("pca")).toBe("started");
    await flush();
    expect(testPage.auto.run("diversity")).toBe("waiting");
    testPage.auto.pause("pca");
    testPage.stoppingSince = 0;
    await flush();

    expect(testPage.store.getState().stoppedAwaitingWorker).toBe("pca");
    expect(testPage.auto.aboutToStart("diversity")).toBe("changes");
    expect(words(testPage.band())).toBe("The diversity starts in a moment");
    expect(buttons(testPage.band())).toEqual([
      "Stop recalculating the diversity",
      null,
    ]);
  });

  test("two about to start for different reasons, the PCA held after a crash and the diversity in its quiet second, a state built by hand: the line names the first and what it waits for alone", async () => {
    const testPage = await bothDone();
    const built = (pca: AboutToStart, diversity: AboutToStart): Band["line"] =>
      bandOf(
        {
          ...pageOf(testPage),
          live: {
            pca: {
              kind: "live",
              aboutToStart: pca,
              running: false,
              after: null,
            },
            diversity: {
              kind: "live",
              aboutToStart: diversity,
              running: false,
              after: null,
            },
          },
        },
        testPage.defects.getState(),
      ).line;

    const line = built("afterCrash", "changes");
    expect(line).toMatchObject({
      kind: "aboutToStart",
      ids: ["pca"],
      waitsFor: "afterCrash",
      withStop: true,
    });
    expect(lineWords(line, 0)?.full).toBe(
      "The PCA starts after the next change",
    );
    expect(built("changes", "changes")).toMatchObject({
      ids: ["pca", "diversity"],
      withStop: false,
    });
  });

  test("after Stop all it names the one that ran: Stopping the PCA while the PCA ran, Stopping the diversity while the diversity ran (the review of package 4, 12 October 2026)", async () => {
    const pcaRan = page(SUMMARY);
    await pcaRan.endPass();
    expect(pcaRan.auto.run("pca")).toBe("started");
    await flush();
    expect(pcaRan.auto.run("diversity")).toBe("waiting");
    pcaRan.auto.pauseAll();
    pcaRan.stoppingSince = 0;
    await flush();
    expect(words(pcaRan.band())).toBe("Stopping the PCA…");
    expect(buttons(pcaRan.band())).toEqual([null, null]);

    const diversityRan = await bothDone();
    diversityRan.setDiversity({ minNumIndividuals: 1 });
    await flush();
    await quietSecond();
    expect(words(diversityRan.band(), 12)).toBe("Diversity running · 0:12");
    diversityRan.auto.pauseAll();
    diversityRan.stoppingSince = 0;
    await flush();
    expect(words(diversityRan.band())).toBe("Stopping the diversity…");
    expect(buttons(diversityRan.band())).toEqual([null, null]);
  });

  test("the diversity held after a crash of the PCA that ended the PCA's live state: The diversity starts after the next change, with its Stop recalculating and no Stop all (the review of package 4, 12 October 2026)", async () => {
    // A PCA of 2,264 individuals or more that crashes ends its live
    // state, and holds the diversity until the next change.
    const individuals = Array.from(
      { length: 2264 },
      (_, i) => `s${String(i).padStart(4, "0")}`,
    );
    const testPage = page(
      summaryResult(["1"], [1200], individuals),
      individuals,
    );
    await testPage.endPass();
    expect(testPage.auto.run("pca")).toBe("started");
    await flush();
    expect(testPage.auto.run("diversity")).toBe("waiting");
    testPage.lastPca().end({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    await flush();

    expect(testPage.auto.aboutToStart("diversity")).toBe("afterCrash");
    expect(words(testPage.band())).toBe(
      "The diversity starts after the next change",
    );
    expect(short(testPage.band())).toBe("Diversity later");
    expect(buttons(testPage.band())).toEqual([
      "Stop recalculating the diversity",
      null,
    ]);
  });

  test("Stopping the diversity while the store waits for the worker after its Stop", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("diversity");
    await flush();
    testPage.auto.pause("diversity");
    testPage.stoppingSince = 0;

    expect(words(testPage.band())).toBe("Stopping the diversity…");
    expect(short(testPage.band())).toBe("Stopping…");
    expect(buttons(testPage.band())).toEqual([null, null]);
  });

  test("the link to the diversity's warnings while the PCA has none, and to the PCA's when both have them; each dropped while its tab is shown", async () => {
    const testPage = await bothDone();
    const warned = (
      ids: readonly string[],
    ): ReturnType<typeof pageOf>["state"] => {
      const state = testPage.store.getState();
      return {
        ...state,
        analyses: state.analyses.map((view) =>
          ids.includes(view.id) && view.status.kind === "done"
            ? {
                ...view,
                status: {
                  ...view.status,
                  warnings: [
                    { code: "a", text: "A." },
                    { code: "b", text: "B." },
                  ],
                },
              }
            : view,
        ),
      };
    };
    const bandWith = (ids: readonly string[]): Band =>
      bandOf(
        { ...pageOf(testPage), state: warned(ids) },
        testPage.defects.getState(),
      );

    expect(words(bandWith(["diversity"]))).toBe(
      "Diversity: 2 warnings, in the Populations tab",
    );
    expect(short(bandWith(["diversity"]))).toBe("Diversity: 2 warnings");
    expect(buttons(bandWith(["diversity"]))).toEqual([null, null]);
    expect(words(bandWith(["pca", "diversity"]))).toBe(
      "PCA: 2 warnings, in the PCA tab",
    );

    testPage.tab = "pca";
    expect(words(bandWith(["pca", "diversity"]))).toBe(
      "Diversity: 2 warnings, in the Populations tab",
    );
    testPage.tab = "populations";
    expect(bandWith(["diversity"]).line).toEqual({ kind: "nothing" });
    expect(words(bandWith(["pca", "diversity"]))).toBe(
      "PCA: 2 warnings, in the PCA tab",
    );
  });

  test("the diversity that could not be calculated: the link to the Populations tab", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("diversity");
    await flush();
    testPage.lastDiversity().end({
      kind: "failed",
      error: { kind: "popnei", message: "popnei refused it." },
    });
    await flush();

    expect(words(testPage.band())).toBe(
      "Diversity: could not be calculated, in the Populations tab",
    );
    expect(short(testPage.band())).toBe("Diversity: failed");
  });
});

describe("PT7 R1.3 the band counts the warning of the spectrum with the diversity's", () => {
  /** The band of the page with the PCA and the diversity done, the
      Variants tab shown, the diversity's result with `warnings` warnings
      of its own and a MAF filter that removed 8 of its 548 variants, and
      the project's filters `maf`, a MAF threshold or none. */
  async function bandWithMaf(
    warnings: number,
    maf: number | null,
  ): Promise<Band> {
    const testPage = await bothDone();
    const state = testPage.store.getState();
    const withMaf = {
      ...state,
      project: {
        ...state.project,
        filters:
          maf === null
            ? state.project.filters
            : [
                ...state.project.filters,
                { kind: "maf" as const, maxAllowedMaf: maf },
              ],
      },
      analyses: state.analyses.map((view) =>
        view.id === "diversity" && view.status.kind === "done"
          ? {
              ...view,
              status: {
                ...view.status,
                result: {
                  ...view.status.result,
                  passStats: {
                    numVars: 540,
                    filtering: { maf: { varsProcessed: 548, varsKept: 540 } },
                  },
                },
                warnings: Array.from({ length: warnings }, (_, i) => ({
                  code: `w${String(i)}`,
                  text: "A warning.",
                })),
              },
            }
          : view.id === "pca" && view.status.kind === "done"
            ? { ...view, status: { ...view.status, warnings: [] } }
            : view,
      ),
    };
    return bandOf(
      { ...pageOf(testPage), state: withMaf },
      testPage.defects.getState(),
    );
  }

  test("the spectrum's warning alone: 1 warning, and the link's target the warning itself", async () => {
    const band = await bandWithMaf(0, 0.95);
    expect(words(band)).toBe("Diversity: 1 warning, in the Populations tab");
    expect(band.line).toMatchObject({ kind: "result", at: "spectrumWarning" });
  });

  test("with two warnings of the result: 3 warnings, and the link's target the heading of the warnings", async () => {
    const band = await bandWithMaf(2, 0.95);
    expect(words(band)).toBe("Diversity: 3 warnings, in the Populations tab");
    expect(band.line).toMatchObject({ kind: "result", at: "warnings" });
  });

  test("no MAF threshold: no warning of the spectrum, Popnei alone", async () => {
    const band = await bandWithMaf(0, null);
    expect(band.line).toEqual({ kind: "nothing" });
  });
});
