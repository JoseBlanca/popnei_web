/**
 * The words of the PCA tab of popgen2.html around its options
 * (docs/specs/steps/popgen2-pca.md, "Run and Stop", "Its words" and
 * "Accessibility"): the line of the individuals, the lock of Run by the
 * one pass after the PCA's limit of the file, and what the status region
 * says at the end of a run, over the store of the page with a fake
 * worker.
 */
import { describe, expect, test } from "vitest";

import { pcaOnPopgen2 } from "../../../core/analyses/pca.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import { setAnalysisOptions, setThreshold } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import { summaryResult } from "../../../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  PcaMethod,
  Run,
  RunError,
} from "../../../worker/protocol.ts";
import { createPopgen2Store, openVariantsFile } from "../../popgen2Store.ts";
import type { Popgen2PageStore } from "../../popgen2Store.ts";
import { WAITS_FOR_STATISTICS_TEXT } from "../words.ts";
import {
  aboutToStartLine,
  liveStoppedText,
  pcaEndAnnouncement,
  startedByItselfText,
  failureEndedLine,
  stoppedLine,
  LOADING_RESULT,
  pcaTabResultFailed,
  pcaTabLock,
  pcaTabName,
  pcaTabReadyLines,
  pcaTabTitle,
} from "./tabWords.ts";
import {
  PLOT_WAITS_3D,
  pcaDownloadWhat,
  pcaResultTitle,
  pcaTabLoadFailed3d,
} from "./words.ts";

/** The store of popgen2.html with `panel.nei` of `numIndividuals`
    open and read, the PCA of `method` with the distance of its LD
    pruning, and a fake worker whose jobs the test ends, `end(index,
    outcome)`. */
function pageStore(
  numIndividuals = 2,
  method: PcaMethod = "pca",
): {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly end: (index: number, outcome: Outcome<JobResult>) => void;
  readonly keys: readonly string[];
} {
  const keys: string[] = [];
  const jobs: Job[] = [];
  const store = createPopgen2Store({
    send: (key, job): Run<JobResult> => {
      keys.push(key);
      jobs.push(job);
      return {
        id: jobs.length,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => undefined,
      };
    },
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.2.2");
  const fileId = "a".repeat(32);
  openVariantsFile(store, {
    fileId,
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  });
  const individuals = Array.from(
    { length: numIndividuals },
    (_, i) => `s${String(i).padStart(3, "0")}`,
  );
  store.variantsRead(fileId, {
    kind: "read",
    individuals,
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  store.apply("the LD pruning of the PCA changed", (p) =>
    setAnalysisOptions(p, pcaOnPopgen2, {
      ...pcaOnPopgen2.defaults,
      method,
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
    }),
  );
  return {
    store,
    keys,
    end: (index, outcome) => {
      store.runEnded(index + 1, outcome);
    },
  };
}

/** The pass started and done in `store`, the first job. */
function passDone(
  store: Popgen2PageStore<JobResult, Blob>,
  keys: readonly string[],
  end: (index: number, outcome: Outcome<JobResult>) => void,
): void {
  store.startRun("variantsSummary");
  end(0, {
    kind: "done",
    key: keys[0] ?? "",
    result: summaryResult(["1"], [1200]),
  });
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

/** The project of `store`. */
function projectOf(store: Popgen2PageStore<JobResult, Blob>): Project {
  return store.getState().project;
}

describe("AP6 D1 the words of the PCA tab around its options", () => {
  test("the heading and the name of the bar, by the method", () => {
    expect(pcaTabTitle("pca")).toBe("PCA");
    expect(pcaTabTitle("pcoa")).toBe("PCoA");
    expect(pcaTabName("pca")).toBe("the PCA");
    expect(pcaTabName("pcoa")).toBe("the PCoA");
  });

  test("the line of the individuals, without the old panel's line that Run calculates the statistics first", () => {
    const { store } = pageStore(200);
    const kept = store.getState().individualsKept;
    expect(pcaTabReadyLines(projectOf(store), kept)).toEqual([
      "200 individuals of panel.nei",
    ]);
    // A threshold of the individuals waiting for their statistics, which
    // the old panel says Run calculates first.
    const waiting: IndividualsKept = {
      list: { kind: "needsStatistics" },
      byLists: Array.from({ length: 111 }, (_, i) => String(i)),
      counts: [],
    };
    const lines = pcaTabReadyLines(projectOf(store), waiting);
    expect(lines).toEqual([
      "111 of the 200 individuals of panel.nei, those the filters of individuals keep",
    ]);
    expect(lines).not.toContain(WAITS_FOR_STATISTICS_TEXT);
  });

  test("the lock of the one pass: its words, none once read to the end", () => {
    const { store } = pageStore();
    const p = projectOf(store);
    expect(pcaTabLock(p, null)).toBeNull();
    expect(pcaTabLock(p, "reading")).toBe(
      "Run once panel.nei is read to the end: the reading under way in the box Variants and the PCA cannot run at once.",
    );
    expect(pcaTabLock(p, "stopped")).toBe(
      "Run once panel.nei is read to the end: Start again its reading in the box Variants.",
    );
    expect(pcaTabLock(p, "unreadable")).toBe(
      "Run once panel.nei is read to the end: it could not be read, as the box Variants says. Open it again there, or open another.",
    );
  });

  test("the PCA of a file of more than 9,381 individuals: the store's limit first, not the one pass", () => {
    const { store } = pageStore(9382);
    expect(pcaTabLock(projectOf(store), "reading")).toBeNull();
    const pca = store.getState().analyses.find((a) => a.id === "pca");
    expect(pca?.status).toMatchObject({
      kind: "locked",
      reason:
        "panel.nei has 9,382 individuals, and the principal components of more than 9,381 need more memory than a browser tab can hold. Calculate them with popnei in Python, outside the browser.",
    });
  });

  test("the PCoA of a file of 9,382 individuals: the one pass locks it, since its limit counts the individuals kept", () => {
    const { store } = pageStore(9382, "pcoa");
    expect(pcaTabLock(projectOf(store), "reading")).toBe(
      "Run once panel.nei is read to the end: the reading under way in the box Variants and the PCoA cannot run at once.",
    );
  });
});

describe("AP6 D3 the words of the result of the PCA tab", () => {
  test("the title over the plot, by the method", () => {
    expect(pcaResultTitle("pca", "panel.nei")).toBe(
      "Principal components of panel.nei",
    );
    expect(pcaResultTitle("pcoa", "panel.vcf.gz")).toBe(
      "Principal coordinates of panel.vcf.gz",
    );
  });

  test("what each menu downloads, and the wait of the 3D view", () => {
    expect(pcaDownloadWhat("plot", "pca")).toBe("the plot of the PCA");
    expect(pcaDownloadWhat("variance", "pca")).toBe(
      "the explained variance of the PCA",
    );
    expect(pcaDownloadWhat("table", "pcoa")).toBe(
      "the table of the individuals of the PCoA",
    );
    expect(PLOT_WAITS_3D).toBe("Download once the 3D view is drawn.");
  });

  test("the result while its code downloads, and when it could not be downloaded", () => {
    expect(LOADING_RESULT).toBe("Loading the result…");
    expect(pcaTabResultFailed("pca", "panel.nei")).toBe(
      "The result of the PCA could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page, open panel.nei again and run the PCA again; what the page has calculated is lost.",
    );
    expect(pcaTabResultFailed("pcoa", "panel.nei")).toMatch(
      /^The result of the PCoA could not be loaded\..*run the PCoA again; what the page has calculated is lost\.$/u,
    );
  });

  test("the 3D view that could not be downloaded: reload the page, open the file again and run it again, no project to save", () => {
    expect(pcaTabLoadFailed3d("pca", "panel.nei")).toBe(
      "The 3D view could not be loaded, so the 2D plot is shown in its place. If the connection works, the site may have been updated since this page was opened: reload the page, open panel.nei again and run the PCA again.",
    );
    expect(pcaTabLoadFailed3d("pcoa", "panel.nei")).toMatch(
      /open panel\.nei again and run the PCoA again\.$/u,
    );
  });
});

describe("AP6 D2 the status region at the end of a run of the PCA, over the store of the page", () => {
  test('done: "PCA of panel.nei calculated.", once, and nothing when a threshold moved and set back leaves the PCA ready', () => {
    const { store, keys, end } = pageStore();
    passDone(store, keys, end);
    const ready = store.getState();
    store.startRun("pca");
    const running = store.getState();
    expect(pcaEndAnnouncement(ready, running)).toBeNull();
    end(1, { kind: "done", key: keys[1] ?? "", result: pcaResult() });
    const done = store.getState();
    expect(pcaEndAnnouncement(running, done)).toBe(
      "PCA of panel.nei calculated.",
    );
    expect(pcaEndAnnouncement(done, done)).toBeNull();

    store.apply("the filter of the variants by missing data changed", (p) =>
      setThreshold(p, { of: "variants", kind: "missing_data" }, 0.2),
    );
    const removed = store.getState();
    store.apply("the filter of the variants by missing data changed", (p) =>
      setThreshold(p, { of: "variants", kind: "missing_data" }, 0.1),
    );
    expect(pcaEndAnnouncement(removed, store.getState())).toBeNull();
  });

  test('the PCoA done: "PCoA of panel.nei calculated."', () => {
    const { store, keys, end } = pageStore(2, "pcoa");
    passDone(store, keys, end);
    store.startRun("pca");
    const running = store.getState();
    end(1, {
      kind: "done",
      key: keys[1] ?? "",
      result: { ...pcaResult(), method: "pcoa" } as JobResult,
    });
    expect(pcaEndAnnouncement(running, store.getState())).toBe(
      "PCoA of panel.nei calculated.",
    );
  });

  test('refused by popnei: its words after "The PCA of panel.nei could not be calculated: "', () => {
    const { store, keys, end } = pageStore();
    passDone(store, keys, end);
    store.startRun("pca");
    const running = store.getState();
    end(1, {
      kind: "failed",
      error: {
        kind: "popnei",
        message: "there are no variants to do a PCA with",
      },
    });
    expect(pcaEndAnnouncement(running, store.getState())).toBe(
      "The PCA of panel.nei could not be calculated: No variant of panel.nei is left after the filters of the PCA, so there is no variant to do the PCA with. Loosen the filters of the PCA in its options above, or the thresholds of the Variants tab.",
    );
  });

  test("a failure that is not popnei's, in this page's words", () => {
    const failures: readonly [RunError, string][] = [
      [
        { kind: "reopenFailed", name: "panel.nei", message: "NotReadable" },
        "panel.nei could not be read again; it may have changed on the disk since it was opened. Open it again in the box Variants.",
      ],
      [
        { kind: "couldNotStart", reason: "no ready" },
        "The application could not start its calculations. Reload the page and open panel.nei again.",
      ],
      [
        { kind: "workerFailed", message: "a crash" },
        "The calculation stopped unexpectedly. Run it again. If it stops again, open panel.nei again in the box Variants.",
      ],
    ];
    for (const [error, words] of failures) {
      const { store, keys, end } = pageStore();
      passDone(store, keys, end);
      store.startRun("pca");
      const running = store.getState();
      end(1, { kind: "failed", error });
      expect(pcaEndAnnouncement(running, store.getState())).toBe(
        `The PCA of panel.nei could not be calculated: ${words}`,
      );
    }
  });

  test("stopped: nothing", () => {
    const { store, keys, end } = pageStore();
    passDone(store, keys, end);
    store.startRun("pca");
    const running = store.getState();
    store.cancelRun("pca");
    expect(pcaEndAnnouncement(running, store.getState())).toBeNull();
  });
});

describe("NU4 D2 the words of the PCA started again by itself, by the method", () => {
  test("the line of the quiet second names the filters and the options", () => {
    expect(aboutToStartLine("pca", "changes")).toBe(
      "The PCA starts again in a moment, once the filters and its options stop changing.",
    );
    expect(aboutToStartLine("pcoa", "changes")).toBe(
      "The PCoA starts again in a moment, once the filters and its options stop changing.",
    );
  });

  test("while a crash that ended another live state holds it, the line names the next change", () => {
    expect(aboutToStartLine("pca", "afterCrash")).toBe(
      "The PCA starts again after the next change of the filters or of its options.",
    );
    expect(aboutToStartLine("pcoa", "afterCrash")).toBe(
      "The PCoA starts again after the next change of the filters or of its options.",
    );
  });

  test("while the dialog of the download holds it, the line says the download goes first", () => {
    expect(aboutToStartLine("pca", "download")).toBe(
      "The PCA starts again when the download is written or closed.",
    );
    expect(aboutToStartLine("pcoa", "download")).toBe(
      "The PCoA starts again when the download is written or closed.",
    );
  });

  test("the status region at a start by itself", () => {
    expect(startedByItselfText("pca")).toBe(
      "Calculating the PCA again. To change the filters, stop it in the PCA tab.",
    );
    expect(startedByItselfText("pcoa")).toBe(
      "Calculating the PCoA again. To change the filters, stop it in the PCA tab.",
    );
  });

  test("the status region at a Stop, in the tab or in the band", () => {
    expect(liveStoppedText("pca", true)).toBe(
      "PCA stopped. Press Run in the PCA tab to calculate it again.",
    );
    expect(liveStoppedText("pcoa", true)).toBe(
      "PCoA stopped. Press Run in the PCA tab to calculate it again.",
    );
    // With no Run to press, Run disabled or the result shown.
    expect(liveStoppedText("pca", false)).toBe("PCA stopped.");
    expect(liveStoppedText("pcoa", false)).toBe("PCoA stopped.");
  });

  test("the line beside Run after a Stop", () => {
    expect(stoppedLine("pca")).toBe(
      "Stopped: the PCA no longer starts by itself after a change. Run calculates it and starts it again after each change.",
    );
    expect(stoppedLine("pcoa")).toBe(
      "Stopped: the PCoA no longer starts by itself after a change. Run calculates it and starts it again after each change.",
    );
  });

  test("the line beside Run after a failure that ended the live state, which no Stop did", () => {
    expect(failureEndedLine("pca")).toBe(
      "The PCA no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.",
    );
    expect(failureEndedLine("pcoa")).toBe(
      "The PCoA no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.",
    );
  });
});
