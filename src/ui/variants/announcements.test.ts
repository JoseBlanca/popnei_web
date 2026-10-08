import { describe, expect, test } from "vitest";

import { loadVariants } from "../../core/project.ts";
import type { VariantLoad } from "../../core/project.ts";
import type { AppState, Store } from "../../core/store.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { summaryResult } from "../../core/testSupport.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { STATS_PROGRESS_KIND, statsAnnouncementsOf } from "./statsWords.ts";
import { announcementsOf, summaryStatus } from "./words.ts";

const FILE_ID = "0123456789abcdef0123456789abcdef";

/** The store of the new page with a fake `send` ended by hand. */
function setUp(): {
  readonly store: Store<JobResult, Blob>;
  readonly sent: ((outcome: Outcome<JobResult>) => void)[];
  /** The function of each request that gives the store a result so far. */
  readonly soFar: ((result: JobResult) => void)[];
} {
  const sent: ((outcome: Outcome<JobResult>) => void)[] = [];
  const soFar: ((result: JobResult) => void)[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (_key, _job, _onProgress, onSoFar): Run<JobResult> => {
      lastId += 1;
      soFar.push(onSoFar);
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        sent.push(resolve);
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  return { store, sent, soFar };
}

const VCF: VariantLoad = {
  fileId: FILE_ID,
  name: "panel.vcf.gz",
  size: 87_000,
  format: "vcf",
  readOptions: { ploidy: null, onlyPassed: false },
};

/** The same file as a .nei file. */
const NEI: VariantLoad = {
  fileId: FILE_ID,
  name: "panel.nei",
  size: 261_490,
  format: "nei",
  readOptions: null,
};

/** What the region says of `change` applied to the store. */
function said(
  store: Store<JobResult, Blob>,
  change: () => void,
): readonly string[] {
  const before: AppState<JobResult, Blob> = store.getState();
  change();
  return announcementsOf(before, store.getState());
}

/** Lets the outcomes given settle through `startAnalysis`. */
async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Opens the VCF and records its read of 200 individuals. */
function openRead(store: Store<JobResult, Blob>): void {
  store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
  store.variantsRead(FILE_ID, {
    kind: "read",
    individuals: Array.from({ length: 200 }, (_, i) => `s${String(i)}`),
    ploidy: 4,
    numVars: null,
    keepsPassed: false,
  });
}

describe("what the status region of the new page says", () => {
  test("a read that starts is said once, with the name of the file", () => {
    const { store } = setUp();
    expect(
      said(store, () => {
        store.apply("a new variants file was loaded", (p) =>
          loadVariants(p, VCF),
        );
      }),
    ).toEqual(["Reading panel.vcf.gz."]);
    // Nothing more while it is read and nothing changes.
    expect(said(store, () => undefined)).toEqual([]);
  });

  test("a file read is said with its individuals", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "read",
          individuals: ["s1", "s2"],
          ploidy: 4,
          numVars: null,
          keepsPassed: false,
        });
      }),
    ).toEqual(["panel.vcf.gz is open: 2 individuals."]);
  });

  test("a file popnei could not read is said with its reason", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "failed",
          error: { kind: "popnei", message: "the source is not a VCF" },
        });
      }),
    ).toEqual([
      "popnei could not read panel.vcf.gz: the source is not a VCF. Open another file.",
    ]);
  });

  test("a VCF opened with no ploidy whose ploidy popnei could not read is said in the words of the box, without its lines of Python", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "failed",
          error: {
            kind: "popnei",
            message:
              "the first 5 data lines of the VCF hold no genotype with alleles, so its ploidy cannot be read from the file; give the ploidy",
          },
        });
      }),
    ).toEqual([
      "No genotype with alleles was found in the first 5 variants of panel.vcf.gz: their genotypes are missing, or the file has no genotypes (GT). popnei cannot read the ploidy of the file.",
    ]);
  });

  test("a VCF opened with no ploidy whose worker stopped during the opening is said as a file that could not be read", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "failed",
          error: {
            kind: "worker",
            error: { kind: "workerFailed", message: "out of memory" },
          },
        });
      }),
    ).toEqual(["panel.vcf.gz could not be read."]);
  });

  test("a count done is said with its numbers, and a Stop by nothing of the state", async () => {
    const { store, sent } = setUp();
    openRead(store);
    expect(
      said(store, () => void startAnalysis(store, "variantsSummary")),
    ).toEqual([]);
    const running = summaryStatus(store.getState());
    if (running.kind !== "running") throw new Error("not running");

    const before = store.getState();
    sent[0]?.({
      kind: "done",
      key: running.key,
      result: summaryResult(["chr1", "chr2"], [250, 250]),
    });
    await settled();
    expect(announcementsOf(before, store.getState())).toEqual([
      "panel.vcf.gz: 500 variants on 2 chromosomes.",
    ]);
  });

  test("a Stop is not said from the state, since the button says it", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    store.cancelRun("variantsSummary");
    sent[0]?.({ kind: "cancelled" });
    await settled();
    expect(announcementsOf(before, store.getState())).toEqual([]);
  });

  test("a count refused is said with its words", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    sent[0]?.({
      kind: "failed",
      error: {
        kind: "popnei",
        message: "line 84 of the VCF, the column POS: `x80` is not a position",
      },
    });
    await settled();
    expect(announcementsOf(before, store.getState())).toEqual([
      "popnei could not read panel.vcf.gz: line 84 of the VCF, the column POS: \u201cx80\u201d is not a position. Correct the file, or fetch it again, and open it again.",
    ]);
  });

  test("a count of a .nei file that ends with the focus on Stop is not said, since the chain ends and the focus moves onto its lines", async () => {
    const { store, sent } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, NEI));
    store.variantsRead(FILE_ID, {
      kind: "read",
      individuals: ["s1", "s2"],
      ploidy: 2,
      numVars: null,
      keepsPassed: false,
    });
    void startAnalysis(store, "variantsSummary");
    const running = summaryStatus(store.getState());
    if (running.kind !== "running") throw new Error("not running");
    const before = store.getState();
    sent[0]?.({
      kind: "done",
      key: running.key,
      result: summaryResult(["chr1"], [500]),
    });
    await settled();
    expect(
      announcementsOf(before, store.getState(), { focusOnCountButton: true }),
    ).toEqual([]);
  });

  test("a count of a VCF that ends with the focus on Stop is not said either, since the summary is the whole chain", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const running = summaryStatus(store.getState());
    if (running.kind !== "running") throw new Error("not running");
    const before = store.getState();
    sent[0]?.({
      kind: "done",
      key: running.key,
      result: summaryResult(["chr1"], [1200]),
    });
    await settled();
    expect(
      announcementsOf(before, store.getState(), { focusOnCountButton: true }),
    ).toEqual([]);
  });

  test("a count refused with the focus on Stop is not said, since the focus moves onto its words", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    sent[0]?.({
      kind: "failed",
      error: {
        kind: "popnei",
        message: "line 84 of the VCF, the column POS: `x80` is not a position",
      },
    });
    await settled();
    expect(
      announcementsOf(before, store.getState(), { focusOnCountButton: true }),
    ).toEqual([]);
  });

  test("a worker that stopped with the focus on Stop is said, since Start again keeps the focus in place of Stop", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    sent[0]?.({
      kind: "failed",
      error: { kind: "workerFailed", message: "the worker stopped" },
    });
    await settled();
    expect(
      announcementsOf(before, store.getState(), { focusOnCountButton: true }),
    ).toEqual([
      "The variants of panel.vcf.gz could not be counted, nor their statistics calculated.",
    ]);
  });
});

describe("what the status region of the new page says of the statistics of the open file", () => {
  /** What the region says of the statistics as `change` is made and the
      outcomes it gave settle. */
  async function statsSaid(
    store: Store<JobResult, Blob>,
    change: () => void,
  ): Promise<readonly string[]> {
    const before = store.getState();
    change();
    await settled();
    return statsAnnouncementsOf(before, store.getState()).map(
      (said) => said.text,
    );
  }

  /** The page with the VCF open and the pass of its summary running. */
  function running(): ReturnType<typeof setUp> & { readonly key: string } {
    const page = setUp();
    openRead(page.store);
    void startAnalysis(page.store, "variantsSummary");
    const status = summaryStatus(page.store.getState());
    if (status.kind !== "running") throw new Error("not running");
    return { ...page, key: status.key };
  }

  test("the start of the pass is said with the file, and its end once, in words of the kind the region replaces within a pause", async () => {
    const page = setUp();
    openRead(page.store);
    const before = page.store.getState();
    void startAnalysis(page.store, "variantsSummary");
    expect(statsAnnouncementsOf(before, page.store.getState())).toEqual([
      {
        text: "Calculating the statistics of panel.vcf.gz\u2026",
        replaces: STATS_PROGRESS_KIND,
      },
    ]);
    const status = summaryStatus(page.store.getState());
    if (status.kind !== "running") throw new Error("not running");
    const doneBefore = page.store.getState();
    page.sent[0]?.({
      kind: "done",
      key: status.key,
      result: summaryResult(["chr1"], [500]),
    });
    await settled();
    expect(statsAnnouncementsOf(doneBefore, page.store.getState())).toEqual([
      {
        text: "The statistics of panel.vcf.gz are calculated.",
        replaces: STATS_PROGRESS_KIND,
      },
    ]);
    // A change after that says nothing of the statistics.
    expect(await statsSaid(page.store, () => undefined)).toEqual([]);
  });

  test("a Stop and a failure say nothing of the statistics, since the box says them", async () => {
    const stopped = running();
    expect(
      await statsSaid(stopped.store, () => {
        stopped.store.cancelRun("variantsSummary");
        stopped.sent[0]?.({ kind: "cancelled" });
      }),
    ).toEqual([]);
    const failed = running();
    expect(
      await statsSaid(failed.store, () => {
        failed.sent[0]?.({
          kind: "failed",
          error: { kind: "workerFailed", message: "out of memory" },
        });
      }),
    ).toEqual([]);
  });

  test("live-stats 2 the first result so far of a pass is said once, and the ones after it nothing", async () => {
    const page = running();
    expect(
      await statsSaid(page.store, () => {
        page.soFar[0]?.(summaryResult(["chr1"], [100]));
      }),
    ).toEqual([
      "Plots of panel.vcf.gz are drawn from the variants read so far, and change as the file is read.",
    ]);
    expect(
      await statsSaid(page.store, () => {
        page.soFar[0]?.(summaryResult(["chr1"], [300]));
      }),
    ).toEqual([]);
    expect(
      await statsSaid(page.store, () => {
        page.sent[0]?.({
          kind: "done",
          key: page.key,
          result: summaryResult(["chr1"], [500]),
        });
      }),
    ).toEqual(["The statistics of panel.vcf.gz are calculated."]);
  });
});
