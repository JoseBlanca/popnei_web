/**
 * What takes the place of the button of the download on popgen2.html in
 * each state, from the store of the page made with a fake worker; the
 * end of a write with a file, which hands it to the browser and then
 * tells the store; and Save it again (docs/specs/steps/popgen2-download.md,
 * "The states", "When the write ends", "How it is checked", In Vitest).
 */
import { describe, expect, test, vi } from "vitest";

import * as noVariantKept from "../../core/noVariantKept.ts";
import {
  setThreshold,
  setVariantFilter,
  turnOffVariantFilter,
} from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type {
  FilterColumn,
  Job,
  JobResult,
  Run,
  VariantsSummaryResult,
  WriteJob,
  Written,
} from "../../worker/protocol.ts";
import { createPopgen2Store, openVariantsFile } from "../popgen2Store.ts";
import {
  downloadPlace,
  endOfWrite,
  noVariantAnnouncement,
  saveAgain,
} from "./downloadState.ts";
import type { DownloadPlace } from "./downloadState.ts";
import { summaryStatus } from "./words.ts";

vi.mock("../../core/noVariantKept.ts", { spy: true });

/** A request the fake worker was given. */
interface Sent<J> {
  readonly run: Run<never>;
  readonly key: string;
  readonly job: J;
  readonly soFar: ((r: JobResult) => void) | null;
}

/** The store of popgen2.html with fakes of `send` and `sendWrite` that
    record what they were given and never end it; `panel.vcf.gz` of the
    individuals s000 and s001 opened and read, which records the FILTER
    of its variants, with the filters of the page's first project: the
    FILTER box ticked and the missing rate of the variants at 0.1. */
function storeOfPanel(): {
  readonly store: Store<JobResult, Blob>;
  readonly jobs: Sent<Job>[];
  readonly writes: Sent<WriteJob>[];
} {
  const jobs: Sent<Job>[] = [];
  const writes: Sent<WriteJob>[] = [];
  let lastId = 0;
  const runOf = (): Run<never> => {
    lastId += 1;
    return {
      id: lastId,
      outcome: new Promise(() => undefined),
      cancel: () => undefined,
    };
  };
  const store = createPopgen2Store({
    send: (key, job, _onProgress, onSoFar) => {
      const run = runOf();
      jobs.push({ run, key, job, soFar: onSoFar });
      return run;
    },
    sendWrite: (key, job) => {
      const run = runOf();
      writes.push({ run, key, job, soFar: null });
      return run;
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const fileId = "c".repeat(32);
  openVariantsFile(store, {
    fileId,
    name: "panel.vcf.gz",
    size: 87_000,
    format: "vcf",
    readOptions: { ploidy: null, onlyPassed: false },
  });
  store.variantsRead(fileId, {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: true,
  });
  return { store, jobs, writes };
}

/** The request `index` of `sent`, or a defect. */
function sentAt<J>(sent: readonly Sent<J>[], index: number): Sent<J> {
  const one = sent[index];
  if (one === undefined) {
    throw new Error(`popnei_web defect: no request ${String(index)} sent`);
  }
  return one;
}

/** A pass of 100 variants of s000 and s001, every value in the first bin;
    `failedAll`, none of them passed its FILTER. */
function pass(failedAll: boolean): VariantsSummaryResult {
  const column: FilterColumn = failedAll
    ? { passed: 0, failed: 100 }
    : { passed: 100, failed: 0 };
  return summaryResult(["chr1"], [100], ["s000", "s001"], column);
}

/** What takes the place of the button in the store's state now. */
function placeOf(store: Store<JobResult, Blob>): DownloadPlace {
  const state = store.getState();
  return downloadPlace(
    summaryStatus(state),
    state.write,
    state.project,
    state.individualsKept,
  );
}

/** Starts the one pass and ends it with `result`. */
function finishPass(
  store: Store<JobResult, Blob>,
  jobs: readonly Sent<Job>[],
  result: VariantsSummaryResult,
): void {
  store.startRun("variantsSummary");
  const one = sentAt(jobs, jobs.length - 1);
  store.runEnded(one.run.id, { kind: "done", key: one.key, result });
}

/** A VCF written of 1,152 variants, as popnei gives it. */
function vcfWritten(numVars = 1152): Written<Blob> {
  return {
    format: "vcf",
    file: new Blob(["##fileformat=VCFv4.3"]),
    numBytes: 95_879,
    passStats: {
      numVars,
      filtering: {
        passed: { varsProcessed: 1200, varsKept: 1200 },
        missing_data: { varsProcessed: 1200, varsKept: numVars },
      },
    },
  };
}

/** Writes a VCF with the one pass finished, and ends the write with
    `written`. */
function writeEnded(
  store: Store<JobResult, Blob>,
  writes: readonly Sent<WriteJob>[],
  written: Written<Blob>,
): void {
  store.startWrite("vcf");
  const write = sentAt(writes, writes.length - 1);
  store.runEnded(write.run.id, {
    kind: "done",
    key: write.key,
    result: written,
  });
}

const WAITS = {
  kind: "disabled",
  reason:
    "The download waits for the statistics of the file to be read to the end.",
};

describe("DL6 D3 what takes the place of the button", () => {
  test("while the file is opened and while the one pass runs, the button waits, though the write is ready with no threshold of the individuals", () => {
    const { store, jobs } = storeOfPanel();
    expect(summaryStatus(store.getState()).kind).toBe("ready");
    expect(placeOf(store)).toStrictEqual(WAITS);

    store.startRun("variantsSummary");

    expect(store.getState().write?.kind).toBe("ready");
    expect(summaryStatus(store.getState()).kind).toBe("running");
    expect(placeOf(store)).toStrictEqual(WAITS);
    expect(jobs).toHaveLength(1);
  });

  test("a result so far and the result kept after a Stop give no sentence of no variant, and noVariantForCertain is not asked of them", () => {
    vi.mocked(noVariantKept.noVariantForCertain).mockClear();
    const { store, jobs } = storeOfPanel();
    store.startRun("variantsSummary");
    const one = sentAt(jobs, 0);
    // Every variant read so far failed its FILTER, which over the
    // finished pass would be certain.
    one.soFar?.(pass(true));
    expect(summaryStatus(store.getState())).toMatchObject({
      kind: "running",
      soFar: { analysis: "variantsSummary" },
    });
    expect(placeOf(store)).toStrictEqual(WAITS);

    store.cancelRun("variantsSummary");
    store.runEnded(one.run.id, { kind: "cancelled" });

    expect(summaryStatus(store.getState())).toMatchObject({
      kind: "ready",
      stopped: { soFar: { analysis: "variantsSummary" } },
    });
    expect(placeOf(store)).toStrictEqual(WAITS);
    expect(noVariantKept.noVariantForCertain).not.toHaveBeenCalled();
  });

  test("after a failure of the one pass the button needs its statistics", () => {
    const { store, jobs } = storeOfPanel();
    store.startRun("variantsSummary");
    const one = sentAt(jobs, 0);
    store.runEnded(one.run.id, {
      kind: "failed",
      error: { kind: "workerFailed", message: "a crash" },
    });

    expect(summaryStatus(store.getState()).kind).toBe("error");
    expect(placeOf(store)).toStrictEqual({
      kind: "disabled",
      reason:
        "The download needs the statistics of the file, which could not be calculated.",
    });
  });

  test("once the one pass is finished, the button is enabled when ready, while the write runs and after its failure", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    expect(store.getState().write?.kind).toBe("ready");
    expect(placeOf(store)).toStrictEqual({ kind: "enabled" });

    store.startWrite("vcf");
    expect(store.getState().write?.kind).toBe("running");
    expect(placeOf(store)).toStrictEqual({ kind: "enabled" });

    const write = sentAt(writes, 0);
    store.runEnded(write.run.id, {
      kind: "failed",
      error: { kind: "workerFailed", message: "a crash" },
    });
    expect(store.getState().write?.kind).toBe("error");
    expect(placeOf(store)).toStrictEqual({ kind: "enabled" });
  });
});

describe("DL6 D3 the end of a write, and Save it again", () => {
  test("the end of a write with a file hands it to the browser once, under its name, and then tells the store", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    const written = vcfWritten();
    writeEnded(store, writes, written);
    const kinds: (string | undefined)[] = [];
    const download = vi.fn((...args: [string, Blob]) => {
      expect(args).toHaveLength(2);
      kinds.push(store.getState().write?.kind);
    });

    expect(endOfWrite(store, download)).toBe("downloaded");

    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(
      "panel.filtered.vcf.gz",
      written.file,
    );
    // Handed to the browser while the store still held it as done.
    expect(kinds).toStrictEqual(["done"]);
    expect(store.getState().write?.kind).toBe("saved");
  });

  test("a download that throws leaves the write done, its file not handed, and the throw goes on", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    writeEnded(store, writes, vcfWritten());

    expect(() =>
      endOfWrite(store, () => {
        throw new Error("popnei_web defect: the link could not be made");
      }),
    ).toThrow("the link could not be made");

    expect(store.getState().write?.kind).toBe("done");
  });

  test("a failed write and a stopped one download nothing", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    store.startWrite("vcf");
    const write = sentAt(writes, 0);
    store.cancelWrite();
    store.runEnded(write.run.id, { kind: "cancelled" });
    const download = vi.fn();
    expect(endOfWrite(store, download)).toBe("other");

    store.startWrite("vcf");
    const again = sentAt(writes, 1);
    store.runEnded(again.run.id, {
      kind: "failed",
      error: { kind: "workerFailed", message: "a crash" },
    });
    expect(endOfWrite(store, download)).toBe("failed");
    expect(download).not.toHaveBeenCalled();
  });

  test("Save it again hands the file of saved to the browser again, under the same name", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    const written = vcfWritten();
    writeEnded(store, writes, written);
    endOfWrite(store, () => undefined);
    const download = vi.fn();

    saveAgain(store, download);

    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(
      "panel.filtered.vcf.gz",
      written.file,
    );
    expect(store.getState().write?.kind).toBe("saved");
  });

  test("Save it, of a file written and not handed, hands it and then tells the store", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    const written = vcfWritten();
    writeEnded(store, writes, written);
    const download = vi.fn();

    saveAgain(store, download);

    expect(download).toHaveBeenCalledWith(
      "panel.filtered.vcf.gz",
      written.file,
    );
    expect(store.getState().write?.kind).toBe("saved");
  });
});

describe("DL7 D1 when there is nothing to download, and a file written and not handed", () => {
  test("the same pass finished gives the sentence of no variant, asked over the finished result", () => {
    vi.mocked(noVariantKept.noVariantForCertain).mockClear();
    const { store, jobs } = storeOfPanel();
    const result = pass(true);
    finishPass(store, jobs, result);

    expect(placeOf(store)).toStrictEqual({
      kind: "sentence",
      text: "None of the 100 variants of panel.vcf.gz pass the filters, so there is nothing to download.",
    });
    expect(noVariantKept.noVariantForCertain).toHaveBeenCalledWith(
      store.getState().project,
      result,
      store.getState().individualsKept,
    );
  });

  test("a file saved gives the text after the download, and one done the same text with written", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    writeEnded(store, writes, vcfWritten());
    expect(placeOf(store)).toStrictEqual({
      kind: "file",
      handed: "written",
      text: "panel.filtered.vcf.gz written, 96 KB: 1,152 variants of 2 individuals. Variants removed: 48 by the missing rate.",
    });

    store.writeSaved();

    expect(placeOf(store)).toStrictEqual({
      kind: "file",
      handed: "downloaded",
      text: "panel.filtered.vcf.gz downloaded, 96 KB: 1,152 variants of 2 individuals. Variants removed: 48 by the missing rate.",
    });
  });

  test("the filters of individuals that keep none give keptNoneReason without a step", () => {
    const { store, jobs } = storeOfPanel();
    store.apply("the missing data filter of the individuals changed", (p) =>
      setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.05),
    );
    const result = pass(false);
    finishPass(store, jobs, {
      ...result,
      perIndividual: {
        ...result.perIndividual,
        missingGtRate: Float64Array.of(0.1, 0.9),
      },
    });

    expect(placeOf(store)).toStrictEqual({
      kind: "sentence",
      text: "The filters of individuals keep none of the 2 individuals of panel.vcf.gz. Loosen them.",
    });
  });

  test("the words of a lock are the store's reason, not worked out again", () => {
    const { store, jobs } = storeOfPanel();
    store.apply("the missing data filter of the individuals changed", (p) =>
      setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.05),
    );
    const result = pass(false);
    finishPass(store, jobs, {
      ...result,
      perIndividual: {
        ...result.perIndividual,
        missingGtRate: Float64Array.of(0.1, 0.9),
      },
    });
    const state = store.getState();

    expect(
      downloadPlace(
        summaryStatus(state),
        { kind: "locked", reason: "The store's words." },
        state.project,
        state.individualsKept,
      ),
    ).toStrictEqual({ kind: "sentence", text: "The store's words." });
  });

  test("a lock while the filters of individuals keep some is a defect", () => {
    const { store, jobs } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    const state = store.getState();

    expect(() =>
      downloadPlace(
        summaryStatus(state),
        { kind: "locked", reason: "Open a project first." },
        state.project,
        state.individualsKept,
      ),
    ).toThrow(
      "popnei_web defect: the write of popgen2.html is locked once the one pass is finished, for another reason than no individual kept: Open a project first.",
    );
  });

  test("a write of no variant calls neither the download nor writeSaved", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    writeEnded(store, writes, vcfWritten(0));
    expect(store.getState().write?.kind).toBe("noVariant");
    const download = vi.fn();

    expect(endOfWrite(store, download)).toBe("noVariant");

    expect(download).not.toHaveBeenCalled();
    expect(store.getState().write?.kind).toBe("noVariant");
    expect(placeOf(store)).toStrictEqual({
      kind: "sentence",
      text: "None of the 100 variants of panel.vcf.gz pass the filters, so there is nothing to download.",
    });
  });

  test("the sentence goes, and the button is back, when a change makes it uncertain, and comes again when the change is undone", () => {
    const { store, jobs } = storeOfPanel();
    finishPass(store, jobs, pass(true));
    expect(placeOf(store).kind).toBe("sentence");

    store.apply("the FILTER box changed", (p) =>
      turnOffVariantFilter(p, "passed"),
    );
    expect(placeOf(store)).toStrictEqual({ kind: "enabled" });

    store.undo();
    expect(placeOf(store)).toStrictEqual({
      kind: "sentence",
      text: "None of the 100 variants of panel.vcf.gz pass the filters, so there is nothing to download.",
    });
  });
});

describe("DL7 D1 the status region says the sentence of no variant once", () => {
  test("a change of the filters that makes it certain says it, once", () => {
    const { store, jobs } = storeOfPanel();
    store.apply("the FILTER box changed", (p) =>
      turnOffVariantFilter(p, "passed"),
    );
    finishPass(store, jobs, pass(true));
    const enabled = store.getState();
    expect(placeOf(store)).toStrictEqual({ kind: "enabled" });

    store.apply("the FILTER box changed", (p) =>
      setVariantFilter(p, { kind: "passed" }),
    );
    const certain = store.getState();
    expect(noVariantAnnouncement(enabled, certain)).toBe(
      "None of the 100 variants of panel.vcf.gz pass the filters, so there is nothing to download.",
    );

    // A second change that keeps it certain says nothing again.
    store.apply("the missing data filter changed", (p) =>
      setThreshold(p, { of: "variants", kind: "missing_data" }, 0.2),
    );
    expect(placeOf(store).kind).toBe("sentence");
    expect(noVariantAnnouncement(certain, store.getState())).toBeNull();
  });

  test("nothing is said when the button comes back", () => {
    const { store, jobs } = storeOfPanel();
    finishPass(store, jobs, pass(true));
    const certain = store.getState();
    store.apply("the FILTER box changed", (p) =>
      turnOffVariantFilter(p, "passed"),
    );
    expect(noVariantAnnouncement(certain, store.getState())).toBeNull();
  });

  test("nothing is said when the one pass ends with it, nor when the file changes", () => {
    const { store, jobs } = storeOfPanel();
    store.startRun("variantsSummary");
    const running = store.getState();
    const one = sentAt(jobs, 0);
    store.runEnded(one.run.id, {
      kind: "done",
      key: one.key,
      result: pass(true),
    });
    expect(placeOf(store).kind).toBe("sentence");
    expect(noVariantAnnouncement(running, store.getState())).toBeNull();

    // Another file, read and its pass finished, as certain as the first.
    const first = store.getState();
    const fileId = "d".repeat(32);
    openVariantsFile(store, {
      fileId,
      name: "other.vcf.gz",
      size: 87_000,
      format: "vcf",
      readOptions: { ploidy: null, onlyPassed: false },
    });
    store.variantsRead(fileId, {
      kind: "read",
      individuals: ["s000", "s001"],
      ploidy: 2,
      numVars: null,
      keepsPassed: true,
    });
    finishPass(store, jobs, pass(true));
    expect(placeOf(store).kind).toBe("sentence");
    expect(noVariantAnnouncement(first, store.getState())).toBeNull();
  });

  test("after a write of no variant, a change that keeps the same sentence on the screen says nothing", () => {
    const { store, jobs, writes } = storeOfPanel();
    store.apply("the FILTER box changed", (p) =>
      turnOffVariantFilter(p, "passed"),
    );
    // None passed its FILTER, which the box, off, keeps.
    finishPass(store, jobs, pass(true));
    expect(placeOf(store)).toStrictEqual({ kind: "enabled" });
    writeEnded(store, writes, vcfWritten(0));
    const written = store.getState();
    expect(written.write?.kind).toBe("noVariant");

    store.apply("the FILTER box changed", (p) =>
      setVariantFilter(p, { kind: "passed" }),
    );
    expect(store.getState().write?.kind).toBe("ready");
    expect(placeOf(store)).toStrictEqual({
      kind: "sentence",
      text: "None of the 100 variants of panel.vcf.gz pass the filters, so there is nothing to download.",
    });
    expect(noVariantAnnouncement(written, store.getState())).toBeNull();
  });

  test("a write of no variant is not said here: its sentence takes the focus", () => {
    const { store, jobs, writes } = storeOfPanel();
    finishPass(store, jobs, pass(false));
    const ready = store.getState();
    writeEnded(store, writes, vcfWritten(0));
    expect(placeOf(store).kind).toBe("sentence");
    expect(noVariantAnnouncement(ready, store.getState())).toBeNull();
  });
});
